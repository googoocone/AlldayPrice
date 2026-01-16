'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import PriceChart from '@/components/PriceChart';
import CouponBadge from '@/components/CouponBadge';
import BottomNav from '@/components/BottomNav';
import { formatPrice } from '@/lib/utils';
import { getProductById } from '@/lib/api';
import type { Product, PriceHistory, Coupon } from '@/lib/types';

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);

    const [product, setProduct] = useState<Product | null>(null);
    const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadProduct() {
            setLoading(true);
            try {
                const data = await getProductById(id);
                if (data) {
                    setProduct(data.product);
                    setPriceHistory(data.priceHistory);
                    setCoupons(data.coupons);
                }
            } catch (error) {
                console.error('상품 상세 로드 오류:', error);
            } finally {
                setLoading(false);
            }
        }
        loadProduct();
    }, [id]);

    // 로딩 상태
    if (loading) {
        return (
            <>
                <header className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 z-40">
                    <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
                        <Link href="/" className="p-2 -ml-2 text-gray-700">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </Link>
                        <h1 className="text-base font-medium">상품 상세</h1>
                        <div className="w-10" />
                    </div>
                </header>
                <main className="max-w-lg mx-auto pb-20">
                    <div className="animate-pulse">
                        <div className="w-full aspect-square bg-gray-200" />
                        <div className="p-4 space-y-3">
                            <div className="h-4 bg-gray-200 rounded w-1/4" />
                            <div className="h-6 bg-gray-200 rounded w-3/4" />
                            <div className="h-8 bg-gray-200 rounded w-1/2 mt-4" />
                        </div>
                    </div>
                </main>
                <BottomNav />
            </>
        );
    }

    // 상품이 없는 경우
    if (!product) {
        return (
            <>
                <header className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 z-40">
                    <div className="max-w-lg mx-auto px-4 h-14 flex items-center">
                        <Link href="/" className="p-2 -ml-2 text-gray-700">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </Link>
                    </div>
                </header>
                <main className="max-w-lg mx-auto py-12 text-center">
                    <p className="text-4xl mb-2">😕</p>
                    <p className="text-gray-500">상품을 찾을 수 없습니다</p>
                </main>
                <BottomNav />
            </>
        );
    }

    // 가격 정보 계산
    const latestPrice = priceHistory[priceHistory.length - 1];
    const currentPrice = latestPrice?.price || 0;
    const originalPrice = latestPrice?.original_price || currentPrice;
    const discountRate = latestPrice?.discount_rate || 0;
    const lowestPrice = priceHistory.length > 0
        ? Math.min(...priceHistory.map(p => p.price))
        : currentPrice;
    const isLowest = currentPrice <= lowestPrice;

    // 평균 가격 계산
    const avgPrice = priceHistory.length > 0
        ? Math.round(priceHistory.reduce((sum, p) => sum + p.price, 0) / priceHistory.length)
        : currentPrice;

    return (
        <>
            {/* 헤더 */}
            <header className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 z-40">
                <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
                    <Link href="/" className="p-2 -ml-2 text-gray-700">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </Link>
                    <h1 className="text-base font-medium">상품 상세</h1>
                    <button className="p-2 -mr-2 text-gray-700">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                    </button>
                </div>
            </header>

            <main className="max-w-lg mx-auto pb-20">
                {/* 상품 이미지 */}
                <div className="relative w-full aspect-square bg-gray-100">
                    {product.image_url ? (
                        <Image
                            src={product.image_url}
                            alt={product.name}
                            fill
                            className="object-cover"
                            priority
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                    )}

                    {/* 역대 최저가 뱃지 */}
                    {isLowest && (
                        <div className="absolute top-4 left-4 px-3 py-1.5 bg-accent-coral text-white text-sm font-bold rounded-lg shadow-lg">
                            🔥 역대 최저가
                        </div>
                    )}
                </div>

                {/* 상품 정보 */}
                <div className="px-4 py-5">
                    <p className="text-sm text-gray-500 mb-1">{product.brand}</p>
                    <h2 className="text-lg font-bold text-gray-900 leading-snug">{product.name}</h2>

                    {/* 가격 정보 */}
                    <div className="mt-4 space-y-1">
                        {/* 정가 */}
                        <p className="text-sm text-gray-400 line-through">
                            정가: {formatPrice(originalPrice)}원
                        </p>

                        {/* 현재가 */}
                        <div className="flex items-baseline gap-2">
                            <span className="text-sm text-gray-500">현재가:</span>
                            <span className="text-2xl font-bold text-gray-900">
                                {formatPrice(currentPrice)}원
                            </span>
                            {discountRate > 0 && (
                                <span className="text-accent-coral font-bold">
                                    ({discountRate}%)
                                </span>
                            )}
                        </div>
                    </div>

                    {/* 올리브영 구매 버튼 */}
                    <a
                        href={product.product_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-5 flex items-center justify-center gap-2 w-full py-4 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors"
                    >
                        <span>올리브영에서 구매</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                    </a>
                </div>

                {/* 구분선 */}
                <div className="h-2 bg-gray-100" />

                {/* 쿠폰 정보 섹션 - 실제 DB에서 가져온 쿠폰만 표시 */}
                {coupons.length > 0 && (
                    <>
                        <div className="px-4 py-5">
                            <h3 className="text-base font-bold text-gray-900 mb-3">🎫 사용 가능한 쿠폰</h3>
                            <div className="space-y-2">
                                {coupons.map((coupon) => (
                                    <CouponBadge key={coupon.id} coupon={coupon} showDetails />
                                ))}
                            </div>
                            <a
                                href={product.product_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-3 flex items-center justify-center gap-2 w-full py-3 border border-orange-500 text-orange-500 font-medium rounded-xl hover:bg-orange-50 transition-colors"
                            >
                                쿠폰 받으러 가기
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                            </a>
                        </div>

                        {/* 구분선 */}
                        <div className="h-2 bg-gray-100" />
                    </>
                )}

                {/* 가격 변동 그래프 */}
                {priceHistory.length > 0 && (
                    <div className="px-4 py-5">
                        <h3 className="text-base font-bold text-gray-900 mb-4">📈 가격 변동 추이</h3>
                        <PriceChart data={priceHistory} lowestPrice={lowestPrice} />

                        {/* 가격 통계 */}
                        <div className="mt-5 grid grid-cols-2 gap-3">
                            <div className="bg-gray-50 rounded-xl p-3 text-center">
                                <p className="text-xs text-gray-500 mb-1">역대 최저가</p>
                                <p className="text-sm font-bold text-accent-coral">
                                    {formatPrice(lowestPrice)}원
                                </p>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-3 text-center">
                                <p className="text-xs text-gray-500 mb-1">평균 가격</p>
                                <p className="text-sm font-bold text-gray-900">
                                    {formatPrice(avgPrice)}원
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* 구분선 */}
                <div className="h-2 bg-gray-100" />

                {/* 가격 알림 설정 */}
                <div className="px-4 py-5">
                    <h3 className="text-base font-bold text-gray-900 mb-3">🔔 가격 알림</h3>
                    <p className="text-sm text-gray-500 mb-4">
                        원하는 가격이 되면 알려드릴게요!
                    </p>
                    <button className="w-full py-3 border-2 border-primary text-primary font-medium rounded-xl hover:bg-primary-light transition-colors">
                        가격 알림 설정하기
                    </button>
                </div>
            </main>

            <BottomNav />
        </>
    );
}
