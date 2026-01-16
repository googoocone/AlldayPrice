"""
쿠폰 크롤링 테스트 스크립트
상세페이지 URL 하나로 쿠폰 수집 테스트
"""
import os
import asyncio
from playwright.async_api import async_playwright

# 테스트할 상품 URL (여기에 원하는 URL 입력)
TEST_URL = "https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000223414&dispCatNo=90000010009&trackingCd=Best_Sellingbest&t_page=%EB%9E%AD%ED%82%B9&t_click=%ED%8C%90%EB%A7%A4%EB%9E%AD%ED%82%B9_%EC%A0%84%EC%B2%B4_%EC%83%81%ED%92%88%EC%83%81%EC%84%B8&t_number=3"

# 브라우저 상태 파일 경로
BROWSER_STATE_PATH = os.path.join(os.path.dirname(__file__), "browser_state", "state.json")


async def test_coupon_scrape():
    print("🧪 쿠폰 크롤링 테스트 시작...\n")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)  # 브라우저 보이게
        
        # 저장된 로그인 상태 불러오기
        if os.path.exists(BROWSER_STATE_PATH):
            print("📂 저장된 로그인 상태를 불러옵니다...")
            context = await browser.new_context(storage_state=BROWSER_STATE_PATH)
        else:
            print("⚠️ 로그인 상태가 없습니다. 먼저 main.py를 실행해서 로그인하세요!")
            context = await browser.new_context()
        
        page = await context.new_page()
        
        try:
            print(f"📄 페이지 로딩: {TEST_URL[:60]}...")
            await page.goto(TEST_URL, wait_until="networkidle", timeout=40000)
            await asyncio.sleep(2)  # 페이지 안정화
            
            # 쿠폰받기 버튼 찾기
            coupon_button = await page.query_selector(
                'button[data-qa-name="button-product-coupon-download"]'
            )
            
            if not coupon_button:
                print("❌ 쿠폰받기 버튼이 없습니다. (이 상품에는 쿠폰 없음)")
                return
            
            print("✅ 쿠폰받기 버튼 발견! 클릭합니다...")
            await coupon_button.click()
            await asyncio.sleep(2)  # 팝업 로딩 대기
            
            # 쿠폰 목록 파싱
            coupon_items = await page.query_selector_all('.left')
            print(f"📋 .left 요소 {len(coupon_items)}개 발견\n")
            
            for i, item in enumerate(coupon_items):
                try:
                    # 쿠폰명
                    name_el = await item.query_selector('.name p')
                    name = await name_el.inner_text() if name_el else "없음"
                    
                    # 할인금액
                    discount_el = await item.query_selector('.discount-price span')
                    discount = await discount_el.inner_text() if discount_el else "없음"
                    
                    # 조건
                    condition_el = await item.query_selector('.description p')
                    condition = await condition_el.inner_text() if condition_el else "없음"
                    
                    print(f"🎫 쿠폰 {i+1}:")
                    print(f"   이름: {name}")
                    print(f"   할인: {discount}원")
                    print(f"   조건: {condition}")
                    print()
                    
                except Exception as e:
                    print(f"   파싱 오류: {e}")
            
            # ESC로 팝업 닫기
            await page.keyboard.press("Escape")
            
        except Exception as e:
            print(f"❌ 오류 발생: {e}")
        
        finally:
            input("\n테스트 완료! Enter를 눌러 브라우저를 닫으세요...")
            await browser.close()


if __name__ == "__main__":
    asyncio.run(test_coupon_scrape())
