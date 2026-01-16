import type { Coupon } from '@/lib/types';
import { getCouponDiscountText, getDaysUntilExpiry } from '@/lib/utils';

interface CouponBadgeProps {
    coupon: Coupon;
    showDetails?: boolean;
}

export default function CouponBadge({ coupon, showDetails = false }: CouponBadgeProps) {
    const daysLeft = getDaysUntilExpiry(coupon.expires_at);
    const discountText = getCouponDiscountText(coupon);

    if (!showDetails) {
        // 간단한 쿠폰 뱃지 (상품 카드용)
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-600 text-xs font-medium rounded">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V8a1 1 0 011-1h10a1 1 0 011 1v4a2 2 0 002-2V6a2 2 0 00-2-2H4zm0 6a2 2 0 00-2 2v4a2 2 0 002 2h12a2 2 0 002-2v-4a2 2 0 00-2-2h-1.5a1 1 0 010-2H16a4 4 0 014 4v4a4 4 0 01-4 4H4a4 4 0 01-4-4v-4a4 4 0 014-4h.5a1 1 0 010 2H4z" clipRule="evenodd" />
                </svg>
                쿠폰
            </span>
        );
    }

    // 상세 쿠폰 카드 (상세 페이지용)
    return (
        <div className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-xl">
            <div className="flex items-center gap-3">
                {/* 쿠폰 아이콘 */}
                <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V8a1 1 0 011-1h10a1 1 0 011 1v4a2 2 0 002-2V6a2 2 0 00-2-2H4zm0 6a2 2 0 00-2 2v4a2 2 0 002 2h12a2 2 0 002-2v-4a2 2 0 00-2-2h-1.5a1 1 0 010-2H16a4 4 0 014 4v4a4 4 0 01-4 4H4a4 4 0 01-4-4v-4a4 4 0 014-4h.5a1 1 0 010 2H4z" clipRule="evenodd" />
                    </svg>
                </div>

                {/* 쿠폰 정보 */}
                <div>
                    <p className="text-sm font-bold text-orange-700">{discountText}</p>
                    <p className="text-xs text-orange-600">{coupon.coupon_name}</p>
                    {coupon.min_purchase && (
                        <p className="text-xs text-orange-500">
                            {coupon.min_purchase.toLocaleString('ko-KR')}원 이상 구매 시
                        </p>
                    )}
                </div>
            </div>

            {/* 만료일 */}
            <div className="text-right">
                {daysLeft !== null && daysLeft <= 7 && (
                    <p className="text-xs text-red-500 font-medium">
                        D-{daysLeft}
                    </p>
                )}
                <button className="mt-1 px-3 py-1.5 bg-orange-500 text-white text-xs font-medium rounded-lg hover:bg-orange-600 transition-colors">
                    쿠폰 받기
                </button>
            </div>
        </div>
    );
}
