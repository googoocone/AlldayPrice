// Database Types
export interface Database {
    public: {
        Tables: {
            products: {
                Row: Product;
                Insert: Omit<Product, 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Omit<Product, 'id'>>;
            };
            price_history: {
                Row: PriceHistory;
                Insert: Omit<PriceHistory, 'id'>;
                Update: Partial<Omit<PriceHistory, 'id'>>;
            };
            coupons: {
                Row: Coupon;
                Insert: Omit<Coupon, 'id'>;
                Update: Partial<Omit<Coupon, 'id'>>;
            };
            price_alerts: {
                Row: PriceAlert;
                Insert: Omit<PriceAlert, 'id' | 'created_at'>;
                Update: Partial<Omit<PriceAlert, 'id'>>;
            };
        };
    };
}

// 상품 정보
export interface Product {
    id: string;
    oliveyoung_id: string;
    name: string;
    brand: string;
    category: string;
    image_url: string;
    product_url: string;
    created_at: string;
    updated_at: string;
}

// 가격 이력
export interface PriceHistory {
    id: string;
    product_id: string;
    price: number;
    original_price: number;
    discount_rate: number;
    is_on_sale: boolean;
    recorded_at: string;
}

// 브랜드 쿠폰 정보
export interface Coupon {
    id: string;
    brand: string;
    coupon_name: string;
    discount_type: 'percent' | 'fixed';
    discount_value: number;
    min_purchase: number | null;
    max_discount: number | null;
    expires_at: string | null;
    recorded_at: string;
    is_active: boolean;
}

// 가격 알림
export interface PriceAlert {
    id: string;
    product_id: string;
    user_email: string;
    target_price: number;
    is_active: boolean;
    created_at: string;
}

// 상품 + 최신 가격 + 쿠폰 정보
export interface ProductWithPrice extends Product {
    current_price: number;
    original_price: number;
    discount_rate: number;
    is_on_sale: boolean;
    lowest_price: number;
    is_lowest: boolean;
    price_change?: number;
    // 쿠폰 관련 정보
    coupon_price?: number; // 쿠폰 적용가
    coupon_discount?: number; // 쿠폰 할인금액
    has_coupon?: boolean; // 쿠폰 존재 여부
}

// 카테고리 목록 (올리브영 21개 카테고리)
export const CATEGORIES = [
    '전체',
    '스킨케어',
    '마스크팩',
    '클렌징',
    '선케어',
    '메이크업',
    '네일',
    '메이크업툴',
    '더모 코스메틱',
    '맨즈케어',
    '향수/디퓨저',
    '헤어케어',
    '바디케어',
    '건강식품',
    '푸드',
    '구강용품',
    '헬스/건강용품',
    '위생용품',
    '패션',
    '홈리빙/가전',
    '취미/팬시',
] as const;

export type Category = (typeof CATEGORIES)[number];
