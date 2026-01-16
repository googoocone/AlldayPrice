"""
올프 크롤러 설정 파일
"""
import os
from dotenv import load_dotenv

# .env 파일 경로 명시적 지정
env_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(env_path)

# Supabase 설정
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

# 디버그: 키 확인
print(f"🔑 SUPABASE_URL: {SUPABASE_URL[:50] if SUPABASE_URL else 'NOT SET'}...")
print(f"🔑 SUPABASE_KEY: {SUPABASE_KEY[:50] if SUPABASE_KEY else 'NOT SET'}...")

# 브라우저 상태 저장 경로
BROWSER_STATE_PATH = os.path.join(os.path.dirname(__file__), "browser_state")

# 로그 저장 경로
LOGS_PATH = os.path.join(os.path.dirname(__file__), "logs")

# 크롤링 설정
CRAWL_DELAY_MIN = 2  # 최소 딜레이 (초)
CRAWL_DELAY_MAX = 4  # 최대 딜레이 (초)
MAX_RETRIES = 3      # 최대 재시도 횟수
PRODUCTS_PER_PAGE = 100  # 카테고리당 수집할 상품 수 (100개)

# 올리브영 URL
OLIVEYOUNG_BASE_URL = "https://www.oliveyoung.co.kr"
OLIVEYOUNG_LOGIN_URL = "https://www.oliveyoung.co.kr/store/main/main.do"
OLIVEYOUNG_MYPAGE_URL = "https://www.oliveyoung.co.kr/store/mypage/getMyPage.do"

# 카테고리 목록 (카테고리명: 카테고리코드)
CATEGORIES = {
    "스킨케어": "10000010001",
    "마스크팩": "10000010009",
    "클렌징": "10000010010",
    "선케어": "10000010011",
    "메이크업": "10000010002",
    "네일": "10000010012",
    "메이크업툴": "10000010006",
    "더모 코스메틱": "10000010008",
    "맨즈케어": "10000010007",
    "향수/디퓨저": "10000010005",
    "헤어케어": "10000010004",
    "바디케어": "10000010003",
    "건강식품": "10000020001",
    "푸드": "10000020002",
    "구강용품": "10000020003",
    "헬스/건강용품": "10000020005",
    "위생용품": "10000020004",
    "패션": "10000030007",
    "홈리빙/가전": "10000030005",
    "취미/팬시": "10000030006",
}

def get_ranking_url(category_code: str, page: int = 1, rows_per_page: int = 24) -> str:
    """카테고리 랭킹 페이지 URL 생성"""
    return (
        f"{OLIVEYOUNG_BASE_URL}/store/main/getBestList.do"
        f"?dispCatNo=900000100100001"
        f"&fltDispCatNo={category_code}"
        f"&pageIdx={page}"
        f"&rowsPerPage={rows_per_page}"
    )

def get_product_url(product_id: str) -> str:
    """상품 상세 페이지 URL 생성"""
    return f"{OLIVEYOUNG_BASE_URL}/store/goods/getGoodsDetail.do?goodsNo={product_id}"
