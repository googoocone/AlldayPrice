'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import ProductCard from '@/components/ProductCard';
import type { ProductWithPrice } from '@/lib/types';

const WISHLIST_KEY = 'olp_wishlist';

// 더미 데이터 (찜 목록으로 사용)
const ALL_PRODUCTS: Record<string, ProductWithPrice> = {
    '1': {
        id: '1',
        oliveyoung_id: 'A000000123456',
        name: '라운드랩 1025 독도 토너 200ml',
        brand: '라운드랩',
        category: '스킨케어',
        image_url: '',
        product_url: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        current_price: 14900,
        original_price: 18000,
        discount_rate: 17,
        is_on_sale: true,
        lowest_price: 14900,
        is_lowest: true,
        price_change: 3100,
    },
    '2': {
        id: '2',
        oliveyoung_id: 'A000000123457',
        name: '토리든 다이브인 저분자 히알루론산 세럼 50ml',
        brand: '토리든',
        category: '스킨케어',
        image_url: '',
        product_url: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        current_price: 17100,
        original_price: 19000,
        discount_rate: 10,
        is_on_sale: true,
        lowest_price: 15900,
        is_lowest: false,
    },
    '5': {
        id: '5',
        oliveyoung_id: 'A000000123460',
        name: '롬앤 쥬시 래스팅 틴트 5.5g',
        brand: '롬앤',
        category: '메이크업',
        image_url: '',
        product_url: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        current_price: 8900,
        original_price: 12000,
        discount_rate: 26,
        is_on_sale: true,
        lowest_price: 8900,
        is_lowest: true,
    },
};

export default function WishlistPage() {
    const [wishlistIds, setWishlistIds] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // 로컬스토리지에서 찜 목록 로드
    useEffect(() => {
        const saved = localStorage.getItem(WISHLIST_KEY);
        if (saved) {
            setWishlistIds(JSON.parse(saved));
        }
        setIsLoading(false);
    }, []);

    // 찜 목록 상품
    const wishlistProducts = wishlistIds
        .map((id) => ALL_PRODUCTS[id])
        .filter(Boolean);

    // 역대 최저가 상품 수
    const lowestCount = wishlistProducts.filter((p) => p.is_lowest).length;

    return (
        <>
            {/* 헤더 */}
            <header className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 z-40">
                <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                            <span className="text-white font-bold text-sm">OP</span>
                        </div>
                        <span className="font-bold text-lg text-primary">올프</span>
                    </Link>
                    <h1 className="absolute left-1/2 -translate-x-1/2 font-medium">찜 목록</h1>
                    <div className="w-8" />
                </div>
            </header>

            <main className="max-w-lg mx-auto px-4 py-4 pb-20">
                {/* 최저가 알림 배너 */}
                {lowestCount > 0 && (
                    <div className="mb-4 p-4 bg-accent-coral/10 rounded-xl">
                        <p className="text-sm text-accent-coral font-medium flex items-center gap-2">
                            <span className="text-lg">🔥</span>
                            <span>
                                찜한 상품 중 <strong>{lowestCount}개</strong>가 역대 최저가예요!
                            </span>
                        </p>
                    </div>
                )}

                {/* 찜 목록 */}
                {isLoading ? (
                    <div className="py-12 text-center text-gray-400">
                        <p>로딩 중...</p>
                    </div>
                ) : wishlistProducts.length > 0 ? (
                    <div className="space-y-3">
                        {wishlistProducts.map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                ) : (
                    <div className="py-16 text-center">
                        <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                            <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                        </div>
                        <p className="text-gray-500 mb-2">찜한 상품이 없습니다</p>
                        <p className="text-sm text-gray-400 mb-6">관심 있는 상품을 찜해보세요!</p>
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-medium rounded-xl"
                        >
                            상품 둘러보기
                        </Link>
                    </div>
                )}
            </main>

            <BottomNav />
        </>
    );
}
