"""
올프 크롤러 - 상품 및 쿠폰 스크래핑
"""
import re
import asyncio
import random
from typing import List, Dict, Optional, Set
from playwright.async_api import Page
from config import (
    CATEGORIES, 
    get_ranking_url, 
    get_product_url,
    CRAWL_DELAY_MIN, 
    CRAWL_DELAY_MAX, 
    MAX_RETRIES,
    PRODUCTS_PER_PAGE
)
from database import Database


class ProductScraper:
    """올리브영 상품 스크래퍼"""
    
    def __init__(self, page: Page, db: Database, full_refresh: bool = False):
        self.page = page
        self.db = db
        self.collected_brands: Set[str] = set()
        self.full_refresh = full_refresh  # True면 모든 상품 정보 갱신
        
        # 기존 상품 캐싱 (oliveyoung_id -> product_id 맵핑)
        print("📦 기존 상품 목록 로딩 중...")
        self.existing_products: Dict[str, str] = db.get_all_oliveyoung_ids()
        print(f"  ✅ 기존 상품 {len(self.existing_products)}개 로드 완료")
    
    async def random_delay(self):
        """랜덤 딜레이 (봇 감지 방지)"""
        delay = random.uniform(CRAWL_DELAY_MIN, CRAWL_DELAY_MAX)
        await asyncio.sleep(delay)
    
    async def scrape_ranking_page(self, category_name: str, category_code: str) -> List[Dict]:
        """카테고리 랭킹 페이지에서 상품 목록 수집"""
        products = []
        page_num = 1
        rows_per_page = 24  # 한 페이지당 상품 수
        
        print(f"\n📂 [{category_name}] 카테고리 크롤링 시작...")
        
        while len(products) < PRODUCTS_PER_PAGE:
            url = get_ranking_url(category_code, page_num, rows_per_page)
            
            for retry in range(MAX_RETRIES):
                try:
                    await self.page.goto(url, wait_until="networkidle", timeout=30000)
                    await self.random_delay()
                    
                    # 상품 목록 파싱
                    product_items = await self.page.query_selector_all(".prd_info")
                    
                    if not product_items:
                        print(f"  ⚠️ 상품을 찾을 수 없습니다. (페이지 {page_num})")
                        break
                    
                    for item in product_items:
                        if len(products) >= PRODUCTS_PER_PAGE:
                            break
                        
                        try:
                            product = await self._parse_product_item(item, category_name)
                            if product:
                                products.append(product)
                                self.collected_brands.add(product["brand"])
                        except Exception as e:
                            print(f"  ⚠️ 상품 파싱 중 오류: {e}")
                            continue
                    
                    print(f"  📦 페이지 {page_num}: {len(product_items)}개 상품 수집 (총 {len(products)}개)")
                    break  # 성공 시 재시도 루프 탈출
                    
                except Exception as e:
                    print(f"  ❌ 페이지 {page_num} 로드 실패 (시도 {retry + 1}/{MAX_RETRIES}): {e}")
                    if retry < MAX_RETRIES - 1:
                        await asyncio.sleep(5)
                    continue
            
            # 다음 페이지로
            page_num += 1
            
            # 마지막 페이지 체크
            if len(product_items) < rows_per_page:
                break
        
        print(f"  ✅ [{category_name}] 총 {len(products)}개 상품 수집 완료")
        return products
    
    async def _parse_product_item(self, item, category_name: str) -> Optional[Dict]:
        """상품 아이템 HTML에서 정보 추출"""
        try:
            # 상품 링크에서 ID 추출
            link_element = await item.query_selector("a")
            if not link_element:
                return None
            
            href = await link_element.get_attribute("href")
            if not href:
                return None
            
            # 상품 ID 추출 (goodsNo 파라미터)
            match = re.search(r"goodsNo=(\w+)", href)
            if not match:
                return None
            oliveyoung_id = match.group(1)
            
            # 브랜드명
            brand_element = await item.query_selector(".tx_brand")
            brand = await brand_element.inner_text() if brand_element else "Unknown"
            brand = brand.strip()
            
            # 상품명
            name_element = await item.query_selector(".tx_name")
            name = await name_element.inner_text() if name_element else ""
            name = name.strip()
            
            # 이미지 URL
            img_element = await item.query_selector("img")
            image_url = await img_element.get_attribute("src") if img_element else None
            
            # 가격 정보
            price_info = await self._parse_price_info(item)
            
            return {
                "oliveyoung_id": oliveyoung_id,
                "name": name,
                "brand": brand,
                "category": category_name,
                "image_url": image_url,
                "product_url": get_product_url(oliveyoung_id),
                **price_info
            }
            
        except Exception as e:
            print(f"    ⚠️ 상품 파싱 오류: {e}")
            return None
    
    async def _parse_price_info(self, item) -> Dict:
        """가격 정보 파싱"""
        result = {
            "price": 0,
            "original_price": 0,
            "discount_rate": 0,
            "is_on_sale": False
        }
        
        try:
            # 현재 판매가
            price_element = await item.query_selector(".tx_cur .tx_num")
            if price_element:
                price_text = await price_element.inner_text()
                result["price"] = self._parse_price_text(price_text)
            
            # 정가 (할인 전 가격)
            org_price_element = await item.query_selector(".tx_org .tx_num")
            if org_price_element:
                org_price_text = await org_price_element.inner_text()
                result["original_price"] = self._parse_price_text(org_price_text)
                result["is_on_sale"] = True
            else:
                # 할인 없으면 정가 = 현재가
                result["original_price"] = result["price"]
            
            # 할인율
            if result["original_price"] > 0 and result["price"] > 0:
                result["discount_rate"] = int(
                    (1 - result["price"] / result["original_price"]) * 100
                )
            
        except Exception as e:
            print(f"    ⚠️ 가격 파싱 오류: {e}")
        
        return result
    
    def _parse_price_text(self, text: str) -> int:
        """가격 텍스트에서 숫자만 추출"""
        if not text:
            return 0
        # 숫자만 추출
        numbers = re.sub(r"[^\d]", "", text)
        return int(numbers) if numbers else 0
    
    async def save_products_to_db(self, products: List[Dict]) -> Dict[str, int]:
        """수집한 상품들을 DB에 저장
        
        Returns:
            Dict with 'new_count' and 'updated_count' stats
        """
        stats = {"new_count": 0, "updated_count": 0}
        
        for product in products:
            try:
                oliveyoung_id = product["oliveyoung_id"]
                
                if oliveyoung_id in self.existing_products:
                    # 🔄 기존 상품: 가격만 업데이트 (상품 정보는 건드리지 않음)
                    product_id = self.existing_products[oliveyoung_id]
                    
                    if self.full_refresh:
                        # 전체 갱신 모드: 상품 정보도 업데이트
                        self.db.upsert_product(product)
                    
                    # 가격 이력만 저장
                    self.db.add_price_history(
                        product_id=product_id,
                        price=product["price"],
                        original_price=product["original_price"],
                        discount_rate=product["discount_rate"],
                        is_on_sale=product["is_on_sale"]
                    )
                    stats["updated_count"] += 1
                else:
                    # ✨ 신규 상품: 전체 정보 저장
                    saved_product = self.db.upsert_product(product)
                    
                    if saved_product:
                        # 가격 이력 저장
                        self.db.add_price_history(
                            product_id=saved_product["id"],
                            price=product["price"],
                            original_price=product["original_price"],
                            discount_rate=product["discount_rate"],
                            is_on_sale=product["is_on_sale"]
                        )
                        
                        # 캐시에 추가 (같은 세션 내 중복 방지)
                        self.existing_products[oliveyoung_id] = saved_product["id"]
                        stats["new_count"] += 1
                    
            except Exception as e:
                print(f"  ❌ DB 저장 실패: {product.get('name', 'Unknown')[:30]} - {e}")
        
        return stats


class CouponScraper:
    """올리브영 쿠폰 스크래퍼 - 상세페이지에서 쿠폰받기 버튼 클릭 후 파싱"""
    
    def __init__(self, page: Page, db: Database):
        self.page = page
        self.db = db
    
    async def random_delay(self):
        """랜덤 딜레이"""
        delay = random.uniform(CRAWL_DELAY_MIN, CRAWL_DELAY_MAX)
        await asyncio.sleep(delay)
    
    async def scrape_brand_coupons(self, brands: Set[str], sample_products: Dict[str, str]) -> int:
        """브랜드별 쿠폰 수집 (브랜드별 대표 상품 1개씩 방문)"""
        total_coupons = 0
        
        print(f"\n🎫 {len(brands)}개 브랜드 쿠폰 수집 시작...")
        
        for brand in brands:
            if brand not in sample_products:
                continue
            
            product_id = sample_products[brand]
            try:
                coupons = await self._scrape_product_coupons(product_id, brand)
                total_coupons += len(coupons)
                
                # 쿠폰 DB 저장
                for coupon in coupons:
                    self.db.upsert_coupon(coupon)
                
                await self.random_delay()
                
            except Exception as e:
                print(f"  ❌ [{brand}] 쿠폰 수집 실패: {e}")
        
        # 만료된 쿠폰 비활성화
        self.db.deactivate_expired_coupons()
        
        print(f"  ✅ 총 {total_coupons}개 쿠폰 수집 완료")
        return total_coupons
    
    async def _scrape_product_coupons(self, product_id: str, brand: str) -> List[Dict]:
        """상품 상세 페이지에서 쿠폰 정보 추출 (버튼 클릭 방식)"""
        coupons = []
        url = get_product_url(product_id)
        
        try:
            await self.page.goto(url, wait_until="networkidle", timeout=30000)
            await asyncio.sleep(1)  # 페이지 안정화 대기
            
            # 쿠폰받기 버튼 찾기
            coupon_button = await self.page.query_selector(
                'button[data-qa-name="button-product-coupon-download"]'
            )
            
            if not coupon_button:
                # 쿠폰 버튼이 없으면 쿠폰 없음
                return coupons
            
            # 쿠폰받기 버튼 클릭
            await coupon_button.click()
            await asyncio.sleep(1)  # 팝업 로딩 대기
            
            # 쿠폰 목록 파싱 (팝업 내부)
            coupon_items = await self.page.query_selector_all('.left')
            
            for item in coupon_items:
                try:
                    coupon = await self._parse_coupon_item(item, brand)
                    if coupon:
                        coupons.append(coupon)
                except Exception as e:
                    continue
            
            if coupons:
                print(f"  🎫 [{brand}] {len(coupons)}개 쿠폰 발견")
            
            # 팝업 닫기 (ESC 키 또는 닫기 버튼)
            try:
                await self.page.keyboard.press("Escape")
            except:
                pass
            
        except Exception as e:
            print(f"  ⚠️ [{brand}] 상품 페이지 로드 실패: {e}")
        
        return coupons
    
    async def _parse_coupon_item(self, item, brand: str) -> Optional[Dict]:
        """쿠폰 아이템에서 정보 추출
        
        HTML 구조:
        <div class="left">
            <div class="name"><p class="css-14v0v12">메디힐 브랜드 할인 쿠폰</p></div>
            <div class="discount-price"><span class="css-1b773zs">1,000</span></div>
            <div class="description">
                <span class="css-1vmkgwe">온라인</span>
                <p class="css-1lh420">35,000원 이상 구매 시</p>
            </div>
        </div>
        """
        try:
            # 쿠폰명
            name_element = await item.query_selector('.name p')
            coupon_name = await name_element.inner_text() if name_element else ""
            coupon_name = coupon_name.strip()
            
            if not coupon_name:
                return None
            
            # 할인금액 (숫자만)
            discount_element = await item.query_selector('.discount-price span')
            discount_text = await discount_element.inner_text() if discount_element else "0"
            discount_value = self._parse_number(discount_text)
            
            # 조건 (최소 구매금액)
            condition_element = await item.query_selector('.description p')
            condition_text = await condition_element.inner_text() if condition_element else ""
            min_purchase = self._parse_min_purchase(condition_text)
            
            # 할인 타입 결정 (금액이 100 이하면 % 할인, 그 이상이면 원 할인)
            if discount_value <= 100:
                discount_type = "percent"
            else:
                discount_type = "fixed"
            
            return {
                "brand": brand,
                "coupon_name": coupon_name,
                "discount_type": discount_type,
                "discount_value": discount_value,
                "min_purchase": min_purchase,
                "max_discount": None,
                "expires_at": None
            }
            
        except Exception as e:
            return None
    
    def _parse_number(self, text: str) -> int:
        """텍스트에서 숫자만 추출"""
        if not text:
            return 0
        numbers = re.sub(r"[^\d]", "", text)
        return int(numbers) if numbers else 0
    
    def _parse_min_purchase(self, text: str) -> Optional[int]:
        """최소 구매금액 파싱 (예: '35,000원 이상 구매 시')"""
        if not text:
            return None
        
        # "35,000원 이상" 패턴
        match = re.search(r"([\d,]+)\s*원\s*이상", text)
        if match:
            return int(match.group(1).replace(",", ""))
        
        # "3만원 이상" 패턴
        match = re.search(r"(\d+)\s*만\s*원\s*이상", text)
        if match:
            return int(match.group(1)) * 10000
        
        return None
