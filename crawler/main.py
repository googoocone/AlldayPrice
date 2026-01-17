"""
올프 크롤러 - 메인 실행 파일
하루 1회 실행하여 올리브영 상품 및 쿠폰 정보를 수집합니다.
"""
import os
import sys
import asyncio
import argparse
from datetime import datetime
from typing import Dict

from config import CATEGORIES, LOGS_PATH
from auth import AuthManager
from database import Database
from scraper import ProductScraper, CouponScraper


def setup_logging():
    """로그 폴더 설정"""
    os.makedirs(LOGS_PATH, exist_ok=True)
    

def log_message(message: str, log_file: str = None):
    """콘솔과 파일에 로그 기록"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_line = f"[{timestamp}] {message}"
    print(log_line)
    
    if log_file:
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(log_line + "\n")


async def run_crawler(full_refresh: bool = False):
    """크롤러 메인 실행 함수
    
    Args:
        full_refresh: True면 모든 상품 정보 갱신 (기본: 가격만 업데이트)
    """
    setup_logging()
    
    # 로그 파일 경로
    today = datetime.now().strftime("%Y-%m-%d")
    log_file = os.path.join(LOGS_PATH, f"crawl_{today}.log")
    
    log_message("=" * 60, log_file)
    if full_refresh:
        log_message("🚀 올프(All Day Price) 크롤러 시작 [전체 갱신 모드]", log_file)
    else:
        log_message("🚀 올프(All Day Price) 크롤러 시작 [가격만 업데이트 모드]", log_file)
    log_message("=" * 60, log_file)
    
    start_time = datetime.now()
    
    # 결과 통계
    stats = {
        "new_products": 0,
        "updated_products": 0,
        "total_coupons": 0,
        "categories_done": 0,
        "errors": []
    }
    
    auth = AuthManager()
    db = Database()
    
    try:
        # 1. 로그인 상태 확인
        log_message("🔐 로그인 상태 확인 중...", log_file)
        
        # 첫 실행은 headless=False로 (수동 로그인 필요할 수 있음)
        if not await auth.ensure_logged_in(headless=False):
            log_message("❌ 로그인 실패. 크롤링을 중단합니다.", log_file)
            return
        
        page = await auth.get_page()
        
        # 2. 상품 크롤링
        log_message("\n📦 상품 크롤링 시작...", log_file)
        
        product_scraper = ProductScraper(page, db, full_refresh=full_refresh)
        sample_products_by_brand: Dict[str, str] = {}  # 브랜드별 샘플 상품 ID
        
        for category_name, category_code in CATEGORIES.items():
            try:
                log_message(f"\n📂 [{category_name}] 카테고리 크롤링...", log_file)
                
                products = await product_scraper.scrape_ranking_page(category_name, category_code)
                save_stats = await product_scraper.save_products_to_db(products)
                
                stats["new_products"] += save_stats["new_count"]
                stats["updated_products"] += save_stats["updated_count"]
                stats["categories_done"] += 1
                
                # 브랜드별 샘플 상품 저장 (쿠폰 크롤링용)
                for product in products:
                    brand = product["brand"]
                    if brand not in sample_products_by_brand:
                        sample_products_by_brand[brand] = product["oliveyoung_id"]
                
                total_saved = save_stats["new_count"] + save_stats["updated_count"]
                log_message(f"  ✅ [{category_name}] {total_saved}개 저장 (신규: {save_stats['new_count']}, 업데이트: {save_stats['updated_count']})", log_file)
                
            except Exception as e:
                error_msg = f"[{category_name}] 크롤링 오류: {e}"
                stats["errors"].append(error_msg)
                log_message(f"  ❌ {error_msg}", log_file)
        
        # 3. 쿠폰 크롤링
        log_message("\n🎫 쿠폰 크롤링 시작...", log_file)
        
        coupon_scraper = CouponScraper(page, db)
        coupon_count = await coupon_scraper.scrape_brand_coupons(
            product_scraper.collected_brands,
            sample_products_by_brand
        )
        stats["total_coupons"] = coupon_count
        
        # 4. 완료 리포트
        end_time = datetime.now()
        duration = end_time - start_time
        
        log_message("\n" + "=" * 60, log_file)
        log_message("📊 크롤링 완료 리포트", log_file)
        log_message("=" * 60, log_file)
        log_message(f"  ⏱️ 소요 시간: {duration}", log_file)
        log_message(f"  📂 완료 카테고리: {stats['categories_done']}/{len(CATEGORIES)}", log_file)
        log_message(f"  📦 신규 상품: {stats['new_products']}개", log_file)
        log_message(f"  🔄 가격 업데이트: {stats['updated_products']}개", log_file)
        log_message(f"  🎫 수집 쿠폰: {stats['total_coupons']}개", log_file)
        
        if stats["errors"]:
            log_message(f"\n⚠️ 오류 {len(stats['errors'])}건:", log_file)
            for error in stats["errors"]:
                log_message(f"  - {error}", log_file)
        
        log_message("\n✅ 크롤링이 완료되었습니다!", log_file)
        
        # DB 통계
        db_stats = db.get_stats()
        log_message(f"\n📈 DB 현황:", log_file)
        log_message(f"  - 전체 상품: {db_stats['total_products']}개", log_file)
        log_message(f"  - 활성 쿠폰: {db_stats['active_coupons']}개", log_file)
        
    except Exception as e:
        log_message(f"\n❌ 크롤러 오류 발생: {e}", log_file)
        raise
        
    finally:
        await auth.close()


def main():
    """프로그램 진입점"""
    parser = argparse.ArgumentParser(description="올프(All Day Price) 크롤러")
    parser.add_argument(
        "--full-refresh",
        action="store_true",
        help="전체 갱신 모드: 모든 상품 정보를 업데이트합니다 (기본: 가격만 업데이트)"
    )
    args = parser.parse_args()
    
    asyncio.run(run_crawler(full_refresh=args.full_refresh))


if __name__ == "__main__":
    main()
