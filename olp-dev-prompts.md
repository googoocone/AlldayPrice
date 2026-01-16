# 올프 (All Day Price) MVP 개발 프롬프트 가이드

올리브영 가격 추적 서비스 "올프" MVP를 단계별로 개발하기 위한 코딩 에이전트용 프롬프트입니다.
순서대로 진행하세요.

---

## 📋 프로젝트 개요 (모든 프롬프트 앞에 붙여넣기)

```
프로젝트명: 올프 (All Day Price)
슬로건: "매일매일 가격을 추적해요"
목적: 올리브영 상품의 가격 변동을 추적하여 사용자에게 "역대 최저가" 알림을 제공하는 서비스
타겟: 2030 여성 (올리브영 주 고객층)

기술 스택:
- 프론트엔드: Next.js 14 (App Router), TypeScript, Tailwind CSS
- 백엔드/DB: Supabase (PostgreSQL)
- 크롤러: Python (requests, BeautifulSoup 또는 Playwright)
- 배포: Vercel (프론트), 로컬 Windows PC (크롤러)

핵심 기능:
1. 올리브영 인기 상품 가격 추적 (초기 500~1000개)
2. 가격 변동 그래프 표시
3. 역대 최저가 알림
4. 상품 찜하기 기능

브랜드 컬러:
- Primary: #1B7E6B (민트 그린)
- Primary Light: #E8F5F2
- Accent: #FF6B6B (코랄, 할인율 강조)
```

---

## 🚀 1단계: Supabase 데이터베이스 설계

### 프롬프트 1-1: 테이블 생성

```
Supabase에서 올리브영 가격 추적 서비스 "올프"를 위한 데이터베이스를 설계해줘.

필요한 테이블:

1. products (상품 정보)
- id: uuid (PK)
- oliveyoung_id: text (올리브영 상품 고유 ID)
- name: text (상품명)
- brand: text (브랜드명)
- category: text (카테고리)
- image_url: text (상품 이미지 URL)
- product_url: text (올리브영 상품 페이지 URL)
- created_at: timestamp
- updated_at: timestamp

2. price_history (가격 이력)
- id: uuid (PK)
- product_id: uuid (FK -> products)
- price: integer (현재 가격, 원 단위)
- original_price: integer (정가, 할인 전 가격)
- discount_rate: integer (할인율, %)
- is_on_sale: boolean (세일 중 여부)
- recorded_at: timestamp (기록 시점)

3. price_alerts (가격 알림 설정) - 추후 사용
- id: uuid (PK)
- product_id: uuid (FK -> products)
- user_email: text
- target_price: integer (목표 가격)
- is_active: boolean
- created_at: timestamp

Supabase SQL Editor에서 실행할 수 있는 SQL문을 작성해줘.
인덱스도 적절히 추가해줘 (product_id, recorded_at 등).
```

### 프롬프트 1-2: Supabase 함수 생성

```
Supabase에서 "올프" 서비스에 자주 사용할 함수들을 SQL로 만들어줘.

1. get_lowest_price(product_id): 특정 상품의 역대 최저가 조회
2. get_price_history(product_id, days): 특정 상품의 최근 N일 가격 이력 조회
3. get_today_lowest_products(limit): 오늘 역대 최저가인 상품 목록 조회
4. get_price_dropped_products(limit): 최근 가격이 하락한 상품 목록 조회

PostgreSQL 함수로 작성해줘.
```

---

## 🐍 2단계: Python 크롤러 개발

### 프롬프트 2-1: 기본 크롤러 구조

```
올리브영 웹사이트에서 상품 정보를 크롤링하는 Python 스크립트를 만들어줘.
서비스명은 "올프 (All Day Price)"야.

요구사항:
1. 올리브영 베스트 랭킹 페이지에서 상품 목록 가져오기
2. 각 상품의 정보 추출:
   - 상품 ID (URL에서 추출)
   - 상품명
   - 브랜드명
   - 현재 가격
   - 정가 (할인 전)
   - 할인율
   - 이미지 URL
   - 상품 URL

3. Supabase에 데이터 저장
4. 중복 체크: 이미 있는 상품이면 price_history에만 추가
5. 에러 핸들링 및 로깅

라이브러리:
- requests + BeautifulSoup (정적 페이지인 경우)
- playwright (동적 렌더링인 경우)
- supabase-py
- python-dotenv (환경변수)

먼저 올리브영 페이지가 정적인지 동적인지 확인하는 테스트 코드부터 작성해줘.
```

### 프롬프트 2-2: 크롤러 구현

```
올프 크롤러 본격 구현해줘.

구조:
/crawler
  ├── config.py          # 설정 (Supabase URL, 카테고리 URL 등)
  ├── scraper.py         # 크롤링 로직
  ├── database.py        # Supabase 연동
  ├── main.py            # 실행 진입점
  └── requirements.txt

크롤링 대상 카테고리 (올리브영 베스트):
- 스킨케어
- 메이크업
- 바디케어
- 헤어케어
- 선케어

기능:
1. 카테고리별 베스트 상품 100개씩 크롤링 (총 500개)
2. 하루 2회 실행 가정 (오전 9시, 오후 9시)
3. 요청 간 1~2초 딜레이 (서버 부하 방지)
4. 실패 시 재시도 로직 (최대 3회)
5. 크롤링 결과 로그 파일 저장

.env 파일 구조:
SUPABASE_URL=
SUPABASE_KEY=
```

### 프롬프트 2-3: Windows 스케줄러 설정

```
Windows에서 올프 크롤러를 자동 실행하도록 설정하는 방법 알려줘.

요구사항:
1. 하루 2회 실행 (오전 9시, 오후 9시)
2. Windows 작업 스케줄러 사용
3. 실행 로그 저장
4. 에러 발생 시에도 다음 스케줄 영향 없도록

배치 파일(.bat)과 작업 스케줄러 설정 방법을 단계별로 설명해줘.
```

---

## 💻 3단계: Next.js 프론트엔드 개발

### 프롬프트 3-1: 프로젝트 초기 설정

```
"올프 (All Day Price)" Next.js 14 프로젝트를 생성하고 초기 설정해줘.

요구사항:
1. App Router 사용
2. TypeScript
3. Tailwind CSS
4. Supabase 클라이언트 설정

폴더 구조:
/app
  ├── layout.tsx
  ├── page.tsx              # 메인 (오늘의 최저가)
  ├── products/
  │   └── [id]/page.tsx     # 상품 상세 (가격 그래프)
  ├── search/page.tsx       # 검색 결과
  └── wishlist/page.tsx     # 찜 목록 (추후)
/components
  ├── Header.tsx
  ├── BottomNav.tsx
  ├── ProductCard.tsx
  ├── PriceChart.tsx
  └── CategoryPills.tsx
/lib
  ├── supabase.ts
  └── types.ts
/styles
  └── globals.css

브랜드:
- 서비스명: 올프 (All Day Price)
- 로고 텍스트: "올프" (OP 이니셜 아이콘)
- 슬로건: "매일매일 가격을 추적해요"

Tailwind 설정에서 커스텀 컬러 추가:
- primary: #1B7E6B (민트 그린)
- primary-light: #E8F5F2
- accent-coral: #FF6B6B (할인율 강조)
```

### 프롬프트 3-2: 메인 페이지 구현

```
올프 메인 페이지를 구현해줘.

디자인 요구사항:
- 오늘의집 스타일 참고한 깔끔한 UI
- 모바일 퍼스트 (max-width: 480px 기준)
- 부드러운 애니메이션
- 2030 여성 타겟, 귀엽고 심플하게

메인 페이지 구성:
1. 헤더: "올프" 로고 (OP 아이콘 + 텍스트), 알림 아이콘, 설정 아이콘
2. 검색바
3. 알림 배너: "찜한 상품 N개가 최저가예요!"
4. 카테고리 필터 (가로 스크롤 pill 버튼)
5. 오늘의 최저가 상품 리스트

ProductCard 컴포넌트:
- 상품 이미지 (왼쪽)
- 브랜드명, 상품명
- 할인율, 현재가, 정가
- 가격 변동 태그 ("역대 최저가" 또는 "↓2,000원 하락")

하단 네비게이션:
- 홈, 검색, 찜목록, 마이

Supabase에서 데이터 fetch하는 로직도 포함해줘.
Server Component 활용.
```

### 프롬프트 3-3: 상품 상세 페이지 (가격 그래프)

```
올프 상품 상세 페이지를 구현해줘.

URL: /products/[id]

페이지 구성:
1. 상품 기본 정보
   - 이미지
   - 브랜드, 상품명
   - 현재가, 정가, 할인율
   - "올리브영에서 구매" 버튼 (어필리에이트 링크)

2. 가격 변동 그래프
   - 최근 30일 가격 추이
   - 역대 최저가 라인 표시
   - 현재가가 최저가면 강조

3. 가격 통계
   - 역대 최저가
   - 평균 가격
   - 최근 가격 변동

차트 라이브러리: recharts 또는 chart.js

모바일에서 보기 좋게 반응형으로 만들어줘.
```

### 프롬프트 3-4: 검색 기능

```
올프 상품 검색 기능을 구현해줘.

/search 페이지:
1. 상단 검색바 (자동 포커스)
2. 최근 검색어 (로컬스토리지)
3. 인기 검색어 (추후)
4. 검색 결과 리스트

검색 로직:
- Supabase에서 상품명, 브랜드명으로 검색
- 검색어 하이라이팅
- 검색 결과 없을 때 빈 상태 UI

실시간 검색 (debounce 300ms) 적용해줘.
```

---

## 🎨 4단계: UI/UX 개선

### 프롬프트 4-1: 로딩 및 에러 상태

```
올프 로딩 상태와 에러 처리 UI를 추가해줘.

1. 스켈레톤 UI
   - ProductCard 로딩 스켈레톤
   - 상세 페이지 로딩 스켈레톤

2. 에러 상태
   - 네트워크 에러 페이지
   - 상품 없음 상태

3. Pull to Refresh (모바일)

4. 무한 스크롤 (상품 리스트)

Tailwind CSS animate 클래스 활용해서 자연스럽게 만들어줘.
```

### 프롬프트 4-2: PWA 설정 (선택)

```
올프 PWA(Progressive Web App) 설정을 추가해줘.

요구사항:
1. manifest.json 생성
2. 앱 아이콘 설정
3. 오프라인 기본 페이지
4. "홈 화면에 추가" 지원

앱 이름: 올프
정식명: All Day Price
테마 컬러: #1B7E6B
```

---

## 🚀 5단계: 배포

### 프롬프트 5-1: Vercel 배포

```
올프 Next.js 프로젝트를 Vercel에 배포하는 방법 알려줘.

환경변수 설정:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY

도메인 연결 방법도 알려줘.
추천 도메인: alldayprice.kr, olp.kr
```

---

## 📝 추가 기능 (MVP 이후)

### 프롬프트 A: 찜하기 기능

```
올프 로컬스토리지 기반 찜하기 기능을 구현해줘.
(회원가입 없이 사용 가능하도록)

1. 상품 카드에 하트 버튼
2. /wishlist 페이지에서 찜 목록 확인
3. 찜한 상품 중 최저가 알림 배너
```

### 프롬프트 B: 카카오톡 알림 (추후)

```
올프에서 찜한 상품이 최저가가 되면 카카오톡 알림 보내는 기능 구현해줘.
카카오 알림톡 API 연동 방법 알려줘.
```

### 프롬프트 C: 어필리에이트 링크 적용

```
올프에 올리브영 쇼핑 큐레이터 어필리에이트 링크를 적용해줘.

"올리브영에서 구매" 버튼 클릭 시:
1. 어필리에이트 링크로 리다이렉트
2. 클릭 수 트래킹 (Supabase에 기록)
```

### 프롬프트 D: 플랫폼 확장 (추후)

```
올프를 올리브영 외 다른 플랫폼으로 확장해줘.

추가 플랫폼:
- 쿠팡 뷰티
- 무신사 뷰티

데이터베이스에 platform 필드 추가하고,
크롤러도 플랫폼별로 분리해서 구현해줘.
```

---

## ✅ 체크리스트

개발 완료 후 확인:

- [ ] Supabase 테이블 생성 완료
- [ ] 크롤러 테스트 실행 성공
- [ ] 크롤러 스케줄러 설정 완료
- [ ] 메인 페이지 정상 동작
- [ ] 상품 상세 페이지 정상 동작
- [ ] 검색 기능 정상 동작
- [ ] 모바일 반응형 확인
- [ ] Vercel 배포 완료

---

## 🎨 브랜드 가이드

**서비스명**
- 한글: 올프
- 영문: All Day Price
- 약자: OLP / OP

**슬로건**
- "매일매일 가격을 추적해요"
- "지금이 최저가인지, 올프가 알려줄게"

**톤앤매너**
- 친근하고 귀여운 말투
- 2030 여성 타겟
- 이모지 적극 활용 🛍️💰✨

---

화이팅! 기차에서 완성하자 🚂
