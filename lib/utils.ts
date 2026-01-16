import type { Coupon } from './types';

/**
 * 쿠폰 적용가 계산
 */
export function calculateCouponPrice(
    price: number,
    coupon: Coupon | null
): { couponPrice: number; couponDiscount: number } {
    if (!coupon || !coupon.is_active) {
        return { couponPrice: price, couponDiscount: 0 };
    }

    // 최소 구매금액 체크
    if (coupon.min_purchase && price < coupon.min_purchase) {
        return { couponPrice: price, couponDiscount: 0 };
    }

    let discount = 0;

    if (coupon.discount_type === 'percent') {
        discount = Math.floor(price * (coupon.discount_value / 100));
    } else if (coupon.discount_type === 'fixed') {
        discount = coupon.discount_value;
    }

    // 최대 할인금액 제한
    if (coupon.max_discount && discount > coupon.max_discount) {
        discount = coupon.max_discount;
    }

    const couponPrice = Math.max(0, price - discount);

    return { couponPrice, couponDiscount: discount };
}

/**
 * 가격 포맷팅 (원 단위)
 */
export function formatPrice(price: number): string {
    return price.toLocaleString('ko-KR');
}

/**
 * 만료일까지 남은 일수 계산
 */
export function getDaysUntilExpiry(expiresAt: string | null): number | null {
    if (!expiresAt) return null;

    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
}

/**
 * 쿠폰 할인 텍스트 생성
 */
export function getCouponDiscountText(coupon: Coupon): string {
    if (coupon.discount_type === 'percent') {
        return `${coupon.discount_value}% 할인`;
    } else {
        return `${formatPrice(coupon.discount_value)}원 할인`;
    }
}

/**
 * 할인율 계산
 */
export function calculateDiscountRate(originalPrice: number, currentPrice: number): number {
    if (originalPrice <= 0) return 0;
    return Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
}
