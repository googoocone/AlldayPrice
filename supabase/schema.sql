-- ========================================
-- 올프 (All Day Price) 데이터베이스 스키마
-- Supabase SQL Editor에서 실행하세요
-- ========================================

-- 1. products 테이블 (상품 정보)
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  oliveyoung_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  category TEXT NOT NULL,
  image_url TEXT,
  product_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. price_history 테이블 (가격 이력)
CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  price INTEGER NOT NULL,
  original_price INTEGER NOT NULL,
  discount_rate INTEGER DEFAULT 0,
  is_on_sale BOOLEAN DEFAULT FALSE,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. coupons 테이블 (브랜드별 쿠폰 정보) - 신규 추가
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand TEXT NOT NULL,
  coupon_name TEXT NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value INTEGER NOT NULL,
  min_purchase INTEGER,
  max_discount INTEGER,
  expires_at TIMESTAMPTZ,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- 4. price_alerts 테이블 (가격 알림 설정)
CREATE TABLE IF NOT EXISTS price_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  target_price INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. wishlist 테이블 (찜 목록 - 로그인 사용자용)
CREATE TABLE IF NOT EXISTS wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- 6. push_subscriptions 테이블 (푸시 알림 구독)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. search_logs 테이블 (검색 기록)
CREATE TABLE IF NOT EXISTS search_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인기 검색어 View (최근 7일간 검색어 순위)
CREATE OR REPLACE VIEW popular_searches_view AS
SELECT
  query,
  COUNT(*) as search_count
FROM search_logs
WHERE created_at > (NOW() - INTERVAL '7 days')
GROUP BY query
ORDER BY search_count DESC
LIMIT 10;

-- ========================================
-- 인덱스 생성
-- ========================================

CREATE INDEX IF NOT EXISTS idx_products_oliveyoung_id ON products(oliveyoung_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);

CREATE INDEX IF NOT EXISTS idx_price_history_product_id ON price_history(product_id);
CREATE INDEX IF NOT EXISTS idx_price_history_recorded_at ON price_history(recorded_at);
CREATE INDEX IF NOT EXISTS idx_price_history_product_recorded ON price_history(product_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_coupons_brand ON coupons(brand);
CREATE INDEX IF NOT EXISTS idx_coupons_is_active ON coupons(is_active);
CREATE INDEX IF NOT EXISTS idx_coupons_expires_at ON coupons(expires_at);

CREATE INDEX IF NOT EXISTS idx_price_alerts_product_id ON price_alerts(product_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_email ON price_alerts(user_email);

CREATE INDEX IF NOT EXISTS idx_wishlist_user_id ON wishlist(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_product_id ON wishlist(product_id);

-- ========================================
-- 함수: updated_at 자동 업데이트
-- ========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 함수: 특정 상품의 역대 최저가 조회
-- ========================================

CREATE OR REPLACE FUNCTION get_lowest_price(p_product_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT MIN(price)
    FROM price_history
    WHERE product_id = p_product_id
  );
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 함수: 특정 상품의 최근 N일 가격 이력 조회
-- ========================================

CREATE OR REPLACE FUNCTION get_price_history(p_product_id UUID, p_days INTEGER DEFAULT 30)
RETURNS TABLE (
  price INTEGER,
  original_price INTEGER,
  discount_rate INTEGER,
  is_on_sale BOOLEAN,
  recorded_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT ph.price, ph.original_price, ph.discount_rate, ph.is_on_sale, ph.recorded_at
  FROM price_history ph
  WHERE ph.product_id = p_product_id
    AND ph.recorded_at >= NOW() - (p_days || ' days')::INTERVAL
  ORDER BY ph.recorded_at ASC;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 함수: 오늘 역대 최저가인 상품 목록 조회
-- ========================================

CREATE OR REPLACE FUNCTION get_today_lowest_products(p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
  id UUID,
  name TEXT,
  brand TEXT,
  category TEXT,
  image_url TEXT,
  product_url TEXT,
  current_price INTEGER,
  original_price INTEGER,
  discount_rate INTEGER,
  lowest_price INTEGER,
  is_on_sale BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH latest_prices AS (
    SELECT DISTINCT ON (ph.product_id)
      ph.product_id,
      ph.price AS current_price,
      ph.original_price,
      ph.discount_rate,
      ph.is_on_sale
    FROM price_history ph
    ORDER BY ph.product_id, ph.recorded_at DESC
  ),
  lowest_prices AS (
    SELECT ph.product_id, MIN(ph.price) AS lowest_price
    FROM price_history ph
    GROUP BY ph.product_id
  )
  SELECT 
    p.id,
    p.name,
    p.brand,
    p.category,
    p.image_url,
    p.product_url,
    lp.current_price,
    lp.original_price,
    lp.discount_rate,
    low.lowest_price,
    lp.is_on_sale
  FROM products p
  JOIN latest_prices lp ON p.id = lp.product_id
  JOIN lowest_prices low ON p.id = low.product_id
  WHERE lp.current_price <= low.lowest_price
  ORDER BY lp.discount_rate DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 함수: 최근 가격이 하락한 상품 목록 조회
-- ========================================

CREATE OR REPLACE FUNCTION get_price_dropped_products(p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
  id UUID,
  name TEXT,
  brand TEXT,
  category TEXT,
  image_url TEXT,
  product_url TEXT,
  current_price INTEGER,
  previous_price INTEGER,
  price_drop INTEGER,
  discount_rate INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH ranked_prices AS (
    SELECT 
      ph.product_id,
      ph.price,
      ph.discount_rate,
      ph.recorded_at,
      ROW_NUMBER() OVER (PARTITION BY ph.product_id ORDER BY ph.recorded_at DESC) AS rn
    FROM price_history ph
    WHERE ph.recorded_at >= NOW() - INTERVAL '7 days'
  )
  SELECT 
    p.id,
    p.name,
    p.brand,
    p.category,
    p.image_url,
    p.product_url,
    curr.price AS current_price,
    prev.price AS previous_price,
    (prev.price - curr.price) AS price_drop,
    curr.discount_rate
  FROM products p
  JOIN ranked_prices curr ON p.id = curr.product_id AND curr.rn = 1
  JOIN ranked_prices prev ON p.id = prev.product_id AND prev.rn = 2
  WHERE prev.price > curr.price
  ORDER BY (prev.price - curr.price) DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 함수: 특정 브랜드의 유효한 쿠폰 목록 조회
-- ========================================

CREATE OR REPLACE FUNCTION get_brand_coupons(p_brand TEXT)
RETURNS TABLE (
  id UUID,
  brand TEXT,
  coupon_name TEXT,
  discount_type TEXT,
  discount_value INTEGER,
  min_purchase INTEGER,
  max_discount INTEGER,
  expires_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.brand, c.coupon_name, c.discount_type, c.discount_value, 
         c.min_purchase, c.max_discount, c.expires_at
  FROM coupons c
  WHERE c.brand = p_brand
    AND c.is_active = TRUE
    AND (c.expires_at IS NULL OR c.expires_at > NOW())
  ORDER BY c.discount_value DESC;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 함수: 상품 가격 + 쿠폰 적용가 함께 조회
-- ========================================

CREATE OR REPLACE FUNCTION get_price_with_coupon(p_product_id UUID)
RETURNS TABLE (
  product_id UUID,
  current_price INTEGER,
  original_price INTEGER,
  discount_rate INTEGER,
  coupon_id UUID,
  coupon_name TEXT,
  coupon_discount INTEGER,
  coupon_price INTEGER
) AS $$
DECLARE
  v_brand TEXT;
  v_price INTEGER;
  v_original INTEGER;
  v_discount_rate INTEGER;
  v_coupon RECORD;
  v_coupon_discount INTEGER;
BEGIN
  -- 상품의 브랜드와 현재 가격 조회
  SELECT p.brand INTO v_brand FROM products p WHERE p.id = p_product_id;
  
  SELECT ph.price, ph.original_price, ph.discount_rate 
  INTO v_price, v_original, v_discount_rate
  FROM price_history ph 
  WHERE ph.product_id = p_product_id 
  ORDER BY ph.recorded_at DESC 
  LIMIT 1;
  
  -- 가장 좋은 쿠폰 찾기
  SELECT c.* INTO v_coupon
  FROM coupons c
  WHERE c.brand = v_brand
    AND c.is_active = TRUE
    AND (c.expires_at IS NULL OR c.expires_at > NOW())
    AND (c.min_purchase IS NULL OR c.min_purchase <= v_price)
  ORDER BY 
    CASE 
      WHEN c.discount_type = 'percent' THEN v_price * c.discount_value / 100
      ELSE c.discount_value 
    END DESC
  LIMIT 1;
  
  -- 쿠폰 할인금액 계산
  IF v_coupon IS NOT NULL THEN
    IF v_coupon.discount_type = 'percent' THEN
      v_coupon_discount := v_price * v_coupon.discount_value / 100;
    ELSE
      v_coupon_discount := v_coupon.discount_value;
    END IF;
    
    -- 최대 할인금액 제한
    IF v_coupon.max_discount IS NOT NULL AND v_coupon_discount > v_coupon.max_discount THEN
      v_coupon_discount := v_coupon.max_discount;
    END IF;
    
    RETURN QUERY SELECT 
      p_product_id,
      v_price,
      v_original,
      v_discount_rate,
      v_coupon.id,
      v_coupon.coupon_name,
      v_coupon_discount,
      v_price - v_coupon_discount;
  ELSE
    RETURN QUERY SELECT 
      p_product_id,
      v_price,
      v_original,
      v_discount_rate,
      NULL::UUID,
      NULL::TEXT,
      0,
      v_price;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- RLS 정책 (Row Level Security)
-- ========================================

-- products: 모든 사용자가 읽기 가능
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read products" ON products;
CREATE POLICY "Anyone can read products" ON products FOR SELECT USING (true);

-- price_history: 모든 사용자가 읽기 가능
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read price_history" ON price_history;
CREATE POLICY "Anyone can read price_history" ON price_history FOR SELECT USING (true);

-- coupons: 모든 사용자가 읽기 가능
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read coupons" ON coupons;
CREATE POLICY "Anyone can read coupons" ON coupons FOR SELECT USING (true);

-- price_alerts: anon key로도 생성 가능 (이메일 기반)
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read their own alerts" ON price_alerts;
DROP POLICY IF EXISTS "Anyone can create alerts" ON price_alerts;
DROP POLICY IF EXISTS "Anyone can update their own alerts" ON price_alerts;
CREATE POLICY "Anyone can read their own alerts" ON price_alerts FOR SELECT USING (true);
CREATE POLICY "Anyone can create alerts" ON price_alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update their own alerts" ON price_alerts FOR UPDATE USING (true);

-- wishlist: 모든 사용자가 읽기/쓰기 가능 (user_id가 없으면 익명)
ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can manage wishlist" ON wishlist;
CREATE POLICY "Anyone can manage wishlist" ON wishlist FOR ALL USING (true);
