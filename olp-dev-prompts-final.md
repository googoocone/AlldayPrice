# 올프 (All Day Price) MVP 개발 프롬프트 가이드 - 최종본

올리브영 가격 추적 서비스 "올프" MVP를 단계별로 개발하기 위한 코딩 에이전트용 프롬프트입니다.
순서대로 진행하세요.

---

## 📋 프로젝트 개요 (모든 프롬프트 앞에 붙여넣기)

```
프로젝트명: 올프 (All Day Price)
슬로건: "매일매일 가격을 추적해요"
목적: 올리브영 상품의 가격 변동 + 쿠폰 할인가를 추적하여 사용자에게 "역대 최저가" 알림을 제공하는 서비스
타겟: 2030 여성 (올리브영 주 고객층)

기술 스택:
- 프론트엔드: Next.js 14 (App Router), TypeScript, Tailwind CSS
- 백엔드/DB: Supabase (PostgreSQL)
- 크롤러: Python + Playwright (로그인 필요하므로 브라우저 자동화)
- 배포: Vercel (프론트), 로컬 Windows PC (크롤러)

핵심 기능:
1. 올리브영 랭킹 상품 가격 추적 (20개 카테고리 x 100개 = 2000개)
2. 브랜드별 쿠폰 정보 수집 및 적용가 계산
3. 가격 변동 그래프 표시
4. 역대 최저가 알림
5. 상품 찜하기 기능

브랜드 컬러:
- Primary: #1B7E6B (민트 그린)
- Primary Light: #E8F5F2
- Accent: #FF6B6B (코랄, 할인율 강조)

크롤링 설정:
- 하루 1회 크롤링
- 요청 간 3초 딜레이
- 총 2000개 상품 (약 100분 소요)
- Playwright로 로그인 상태 유지하여 쿠폰 정보 수집
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
- price: integer (현재 판매가, 원 단위)
- original_price: integer (정가, 할인 전 가격)
- discount_rate: integer (할인율, %)
- is_on_sale: boolean (세일 중 여부)
- recorded_at: timestamp (기록 시점)

3. coupons (브랜드별 쿠폰 정보)
- id: uuid (PK)
- brand: text (브랜드명)
- coupon_name: text (쿠폰명, 예: "10% 할인 쿠폰")
- discount_type: text ('percent' 또는 'fixed')
- discount_value: integer (할인율 또는 할인금액)
- min_purchase: integer (최소 구매금액, nullable)
- max_discount: integer (최대 할인금액, nullable)
- expires_at: timestamp (만료일)
- recorded_at: timestamp (수집 시점)
- is_active: boolean (유효 여부)

4. price_alerts (가격 알림 설정) - 추후 사용
- id: uuid (PK)
- product_id: uuid (FK -> products)
- user_email: text
- target_price: integer (목표 가격)
- is_active: boolean
- created_at: timestamp

Supabase SQL Editor에서 실행할 수 있는 SQL문을 작성해줘.
인덱스도 적절히 추가해줘 (product_id, brand, recorded_at 등).
```

### 프롬프트 1-2: Supabase 함수 생성

```
Supabase에서 "올프" 서비스에 자주 사용할 함수들을 SQL로 만들어줘.

1. get_lowest_price(product_id): 특정 상품의 역대 최저가 조회
2. get_price_history(product_id, days): 특정 상품의 최근 N일 가격 이력 조회
3. get_today_lowest_products(limit): 오늘 역대 최저가인 상품 목록 조회
4. get_price_dropped_products(limit): 최근 가격이 하락한 상품 목록 조회
5. get_brand_coupons(brand_name): 특정 브랜드의 유효한 쿠폰 목록 조회
6. get_price_with_coupon(product_id): 상품 가격 + 쿠폰 적용가 함께 조회

PostgreSQL 함수로 작성해줘.

쿠폰 적용가 계산 로직:
- discount_type이 'percent'면: price * (1 - discount_value/100)
- discount_type이 'fixed'면: price - discount_value
- max_discount가 있으면 최대 할인금액 제한
- min_purchase가 있으면 최소 구매금액 이상일 때만 적용
```

---

## 🐍 2단계: Python 크롤러 개발 (Playwright + 로그인)

### 프롬프트 2-1: Playwright 환경 설정 및 로그인

```
올리브영 웹사이트에 로그인하여 쿠폰 정보까지 크롤링하는 Python 스크립트를 만들어줘.
서비스명은 "올프 (All Day Price)"야.

Playwright를 사용하고, 로그인 세션을 유지하는 방식으로 구현해줘.

요구사항:
1. 첫 실행 시 수동 로그인 후 브라우저 상태(쿠키, 세션) 저장
2. 이후 실행 시 저장된 상태로 자동 로그인 유지
3. 세션 만료 감지 시 알림 (수동 재로그인 필요)

구조:
/crawler
  ├── config.py          # 설정
  ├── auth.py            # 로그인 및 세션 관리
  ├── scraper.py         # 크롤링 로직
  ├── database.py        # Supabase 연동
  ├── main.py            # 실행 진입점
  ├── browser_state/     # 브라우저 상태 저장 폴더
  └── requirements.txt

auth.py 기능:
1. 저장된 브라우저 상태가 있으면 로드
2. 없으면 브라우저 열고 로그인 페이지로 이동 후 대기 (수동 로그인)
3. 로그인 완료 감지 후 상태 저장
4. 로그인 상태 확인 함수 (마이페이지 접근 가능 여부로 체크)

.env 파일:
SUPABASE_URL=
SUPABASE_KEY=
BROWSER_STATE_PATH=./browser_state
```

### 프롬프트 2-2: 상품 크롤러 구현

```
올프 상품 크롤러를 구현해줘.

크롤링 대상:
- 올리브영 랭킹 페이지 (https://www.oliveyoung.co.kr/store/main/getBestList.do)
- 20개 카테고리, 각 100개 상품 = 총 2000개

각 상품에서 추출할 정보:
1. 상품 ID (URL에서 추출)
2. 상품명
3. 브랜드명
4. 현재 판매가
5. 정가 (할인 전)
6. 할인율
7. 이미지 URL
8. 상품 URL
9. 카테고리

크롤링 설정:
- 하루 1회 실행
- 요청 간 3초 딜레이 (random 2~4초)
- 실패 시 재시도 (최대 3회)
- 진행 상황 로깅

Supabase 저장 로직:
- 새 상품이면 products에 INSERT
- 기존 상품이면 products UPDATE + price_history에 INSERT
```

### 프롬프트 2-3: 쿠폰 크롤러 구현

```
올프 쿠폰 크롤러를 구현해줘.

로그인 상태에서 상품 상세 페이지에 표시되는 브랜드 쿠폰 정보를 수집해.

추출할 쿠폰 정보:
1. 브랜드명
2. 쿠폰명 (예: "10% 할인 쿠폰", "2,000원 할인")
3. 할인 타입 (percent / fixed)
4. 할인 값 (10 또는 2000)
5. 최소 구매금액 (있으면)
6. 최대 할인금액 (있으면)
7. 만료일 (있으면)

크롤링 전략:
1. 상품 크롤링하면서 브랜드 목록 수집
2. 각 브랜드별로 대표 상품 1개 상세페이지 방문
3. 쿠폰 정보 추출하여 coupons 테이블에 저장
4. 이미 있는 쿠폰은 UPDATE, 새 쿠폰은 INSERT
5. 만료된 쿠폰은 is_active = false로 변경

쿠폰 파싱 로직:
- "10% 할인" → discount_type: 'percent', discount_value: 10
- "2,000원 할인" → discount_type: 'fixed', discount_value: 2000
- "3만원 이상 구매 시" → min_purchase: 30000
```

### 프롬프트 2-4: 메인 크롤러 통합 및 스케줄러

```
올프 크롤러 메인 실행 파일과 Windows 스케줄러 설정해줘.

main.py 실행 순서:
1. 로그인 상태 확인 (만료 시 알림 후 종료)
2. 상품 크롤링 (2000개)
3. 쿠폰 크롤링 (브랜드별)
4. 완료 로그 저장
5. 에러 발생 시 에러 로그 저장

로깅:
- logs/ 폴더에 날짜별 로그 파일 생성
- 크롤링 시작/종료 시간
- 수집된 상품 수, 쿠폰 수
- 에러 내역

Windows 작업 스케줄러:
- 매일 오전 6시 실행 (사용자들이 일어나기 전에 데이터 갱신)
- run_crawler.bat 배치 파일 생성
- 로그 저장 경로 설정
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
  ├── CouponBadge.tsx       # 쿠폰 적용가 배지
  └── CategoryPills.tsx
/lib
  ├── supabase.ts
  ├── types.ts
  └── utils.ts              # 쿠폰 적용가 계산 등
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
4. 카테고리 필터 (가로 스크롤 pill 버튼) - 20개 카테고리
5. 오늘의 최저가 상품 리스트

ProductCard 컴포넌트:
- 상품 이미지 (왼쪽)
- 브랜드명, 상품명
- 가격 표시:
  - 정가: ~~28,000원~~ (취소선)
  - 현재가: 18,900원
  - 쿠폰 적용 시: 17,900원 (강조, 쿠폰 아이콘과 함께)
- 가격 변동 태그 ("🏆 역대 최저가" 또는 "↓2,000원 하락")

하단 네비게이션:
- 홈, 검색, 찜목록, 마이

Supabase에서 데이터 fetch할 때 쿠폰 적용가도 함께 계산해서 가져와.
Server Component 활용.
```

### 프롬프트 3-3: 상품 상세 페이지 (가격 그래프 + 쿠폰)

```
올프 상품 상세 페이지를 구현해줘.

URL: /products/[id]

페이지 구성:
1. 상품 기본 정보
   - 이미지
   - 브랜드, 상품명
   - 가격 정보:
     - 정가: ~~28,000원~~
     - 현재가: 18,900원 (32% 할인)
     - 쿠폰 적용가: 17,900원 (추가 1,000원 할인!)
   - "올리브영에서 구매" 버튼 (어필리에이트 링크)

2. 쿠폰 정보 섹션
   - 현재 사용 가능한 브랜드 쿠폰 목록
   - 쿠폰명, 할인 내용, 만료일 표시
   - "쿠폰 받으러 가기" 버튼 (올리브영 링크)

3. 가격 변동 그래프
   - 최근 30일 가격 추이
   - 역대 최저가 라인 표시 (점선)
   - 현재가가 최저가면 강조
   - 쿠폰 적용가도 별도 라인으로 표시 (옵션)

4. 가격 통계
   - 역대 최저가: 17,500원 (2024.01.15)
   - 평균 가격: 22,000원
   - 최근 변동: ↓1,000원 (어제 대비)

차트 라이브러리: recharts

모바일에서 보기 좋게 반응형으로 만들어줘.
```

### 프롬프트 3-4: 검색 기능

```
올프 상품 검색 기능을 구현해줘.

/search 페이지:
1. 상단 검색바 (자동 포커스)
2. 최근 검색어 (로컬스토리지)
3. 인기 검색어 (추후)
4. 검색 결과 리스트 (ProductCard 재사용)

검색 로직:
- Supabase에서 상품명, 브랜드명으로 검색
- 검색어 하이라이팅
- 검색 결과 없을 때 빈 상태 UI
- 정렬 옵션: 낮은가격순, 높은할인율순, 최저가순(쿠폰적용)

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
   - 가격 그래프 로딩 스켈레톤

2. 에러 상태
   - 네트워크 에러 페이지
   - 상품 없음 상태
   - 쿠폰 정보 없음 상태

3. Pull to Refresh (모바일)

4. 무한 스크롤 (상품 리스트)

Tailwind CSS animate 클래스 활용해서 자연스럽게 만들어줘.
```

### 프롬프트 4-2: PWA 설정

```
올프 PWA(Progressive Web App) 설정을 추가해줘.

요구사항:
1. manifest.json 생성
2. 앱 아이콘 설정 (OP 로고)
3. 오프라인 기본 페이지
4. "홈 화면에 추가" 지원

앱 이름: 올프
정식명: All Day Price
테마 컬러: #1B7E6B
배경 컬러: #FFFFFF
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
4. 찜한 상품 쿠폰 적용가 변동 알림
```

### 프롬프트 B: 카카오톡 알림 (추후)

```
올프에서 찜한 상품이 최저가가 되면 카카오톡 알림 보내는 기능 구현해줘.
카카오 알림톡 API 연동 방법 알려줘.

알림 케이스:
1. 역대 최저가 도달
2. 가격 N% 이상 하락
3. 새 쿠폰 등장으로 쿠폰 적용가 최저
```

### 프롬프트 C: 어필리에이트 링크 적용

```
올프에 올리브영 쇼핑 큐레이터 어필리에이트 링크를 적용해줘.

"올리브영에서 구매" 버튼 클릭 시:
1. 어필리에이트 링크로 리다이렉트
2. 클릭 수 트래킹 (Supabase에 기록)
3. 쿠폰 페이지 링크도 어필리에이트 적용
```

### 프롬프트 D: 플랫폼 확장 (추후)

```
올프를 올리브영 외 다른 플랫폼으로 확장해줘.

추가 플랫폼:
- 쿠팡 뷰티
- 무신사 뷰티

데이터베이스에 platform 필드 추가하고,
크롤러도 플랫폼별로 분리해서 구현해줘.
각 플랫폼별 쿠폰 구조도 파악해서 coupons 테이블 확장.
```

---

## ✅ 체크리스트

개발 완료 후 확인:

- [ ] Supabase 테이블 생성 완료 (products, price_history, coupons)
- [ ] Playwright 로그인 및 세션 저장 테스트
- [ ] 상품 크롤러 테스트 (일부 카테고리)
- [ ] 쿠폰 크롤러 테스트
- [ ] 크롤러 스케줄러 설정 완료
- [ ] 메인 페이지 정상 동작 (쿠폰 적용가 표시)
- [ ] 상품 상세 페이지 정상 동작 (쿠폰 섹션, 그래프)
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
- "쿠폰까지 계산한 진짜 최저가"

**톤앤매너**
- 친근하고 귀여운 말투
- 2030 여성 타겟
- 이모지 적극 활용 🛍️💰✨💄

**가격 표시 규칙**
```
정가: 28,000원 (취소선)
현재가: 18,900원 (32%)
쿠폰가: 17,900원 🎫 (쿠폰 적용 시)
```

---

## 📊 데이터 흐름

```
[올리브영 웹사이트]
       ↓ (Playwright, 로그인 상태)
[Python 크롤러] ← 하루 1회, 3초 딜레이
       ↓
[Supabase DB]
  - products (2000개 상품)
  - price_history (가격 이력)
  - coupons (브랜드별 쿠폰)
       ↓
[Next.js 프론트엔드]
       ↓
[사용자] → 최저가 확인 → 올리브영 구매 (어필리에이트)
```

---

화이팅! 기차에서 완성하자 🚂💨
