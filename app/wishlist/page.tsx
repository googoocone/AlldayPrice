'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import BottomNav from '@/components/BottomNav';
import { removeFromWishlist } from '@/components/WishlistButton';
import type { ProductWithPrice } from '@/lib/types';
import { formatPrice } from '@/lib/utils';
import { getProductsByIds } from '@/lib/api';

const WISHLIST_KEY = 'olp_wishlist';

// 체크박스 포함 상품 카드 컴포넌트
function SelectableProductCard({
    product,
    isSelected,
    onToggle,
    onRemove,
}: {
    product: ProductWithPrice;
    isSelected: boolean;
    onToggle: () => void;
    onRemove: () => void;
}) {
    return (
        <div className="flex gap-3 p-4 bg-white rounded-xl card-hover border border-gray-50">
            {/* 체크박스 */}
            <div className="flex items-center">
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        onToggle();
                    }}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected
                            ? 'bg-primary border-primary'
                            : 'border-gray-300 hover:border-primary'
                        }`}
                >
                    {isSelected && (
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    )}
                </button>
            </div>

            <Link href={`/products/${product.id}`} className="flex gap-3 flex-1">
                {/* 상품 이미지 */}
                <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                    {product.image_url ? (
                        <Image
                            src={product.image_url}
                            alt={product.name}
                            fill
                            className="object-cover"
                            sizes="80px"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                    )}

                    {/* 역대 최저가 뱃지 */}
                    {product.is_lowest && (
                        <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-accent-coral text-white text-[10px] font-bold rounded">
                            최저가
                        </div>
                    )}
                </div>

                {/* 상품 정보 */}
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                    <div>
                        <p className="text-xs text-gray-500 mb-0.5">{product.brand}</p>
                        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug">
                            {product.name}
                        </h3>
                    </div>

                    {/* 가격 정보 */}
                    <div className="flex items-baseline gap-1.5">
                        {product.discount_rate > 0 && (
                            <span className="text-accent-coral font-bold text-sm">
                                {product.discount_rate}%
                            </span>
                        )}
                        <span className="text-base font-bold text-gray-900">
                            {formatPrice(product.coupon_price || product.current_price)}원
                        </span>
                        {product.original_price > product.current_price && (
                            <span className="text-xs text-gray-400 line-through">
                                {formatPrice(product.original_price)}원
                            </span>
                        )}
                    </div>
                </div>
            </Link>

            {/* 삭제 버튼 */}
            <button
                onClick={(e) => {
                    e.preventDefault();
                    onRemove();
                }}
                className="self-start p-1 text-gray-400 hover:text-gray-600"
                aria-label="찜 삭제"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
}

export default function WishlistPage() {
    const [wishlistIds, setWishlistIds] = useState<string[]>([]);
    const [products, setProducts] = useState<ProductWithPrice[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [showOnlyLowest, setShowOnlyLowest] = useState(false);

    // 로컬스토리지에서 찜 목록 로드 + DB에서 상품 정보 가져오기
    const loadWishlist = useCallback(async () => {
        setIsLoading(true);
        const saved = localStorage.getItem(WISHLIST_KEY);
        if (saved) {
            const ids: string[] = JSON.parse(saved);
            setWishlistIds(ids);

            if (ids.length > 0) {
                try {
                    const productData = await getProductsByIds(ids);
                    setProducts(productData);
                } catch (error) {
                    console.error('찜 목록 상품 로드 오류:', error);
                }
            }
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        loadWishlist();

        // 다른 페이지에서 찜 목록 변경 감지
        const handleWishlistChange = () => {
            loadWishlist();
        };
        window.addEventListener('wishlist-changed', handleWishlistChange);
        return () => window.removeEventListener('wishlist-changed', handleWishlistChange);
    }, [loadWishlist]);

    // 상품 삭제
    const handleRemove = (productId: string) => {
        removeFromWishlist(productId);
        setWishlistIds(prev => prev.filter(id => id !== productId));
        setProducts(prev => prev.filter(p => p.id !== productId));
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.delete(productId);
            return next;
        });
    };

    // 필터링된 상품 목록
    const filteredProducts = useMemo(() => {
        if (showOnlyLowest) {
            return products.filter((p) => p.is_lowest);
        }
        return products;
    }, [products, showOnlyLowest]);

    // 역대 최저가 상품 수
    const lowestCount = products.filter((p) => p.is_lowest).length;

    // 선택된 상품들의 총 가격
    const totalPrice = useMemo(() => {
        return filteredProducts
            .filter((p) => selectedIds.has(p.id))
            .reduce((sum, p) => sum + (p.coupon_price || p.current_price), 0);
    }, [filteredProducts, selectedIds]);

    // 선택 토글
    const toggleSelect = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    // 전체 선택 / 해제
    const toggleAll = () => {
        if (selectedIds.size === filteredProducts.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredProducts.map((p) => p.id)));
        }
    };

    // 최저가 상품만 선택
    const selectLowestOnly = () => {
        const lowestIds = filteredProducts.filter((p) => p.is_lowest).map((p) => p.id);
        setSelectedIds(new Set(lowestIds));
    };

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

            <main className="max-w-lg mx-auto px-4 py-4 pb-40">
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

                {/* 선택 컨트롤 */}
                {filteredProducts.length > 0 && (
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={toggleAll}
                                className="text-sm text-gray-600 hover:text-primary flex items-center gap-1"
                            >
                                <span className={`w-4 h-4 rounded border flex items-center justify-center ${selectedIds.size === filteredProducts.length && filteredProducts.length > 0
                                        ? 'bg-primary border-primary'
                                        : 'border-gray-300'
                                    }`}>
                                    {selectedIds.size === filteredProducts.length && filteredProducts.length > 0 && (
                                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </span>
                                전체 선택
                            </button>
                            {lowestCount > 0 && (
                                <button
                                    onClick={selectLowestOnly}
                                    className="text-sm text-accent-coral hover:underline"
                                >
                                    최저가만 선택
                                </button>
                            )}
                        </div>
                        <button
                            onClick={() => setShowOnlyLowest(!showOnlyLowest)}
                            className={`text-sm px-3 py-1 rounded-full transition-colors ${showOnlyLowest
                                    ? 'bg-accent-coral text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {showOnlyLowest ? '전체 보기' : '최저가만 보기'}
                        </button>
                    </div>
                )}

                {/* 찜 목록 */}
                {isLoading ? (
                    <div className="py-12 text-center text-gray-400">
                        <p>로딩 중...</p>
                    </div>
                ) : filteredProducts.length > 0 ? (
                    <div className="space-y-3">
                        {filteredProducts.map((product) => (
                            <SelectableProductCard
                                key={product.id}
                                product={product}
                                isSelected={selectedIds.has(product.id)}
                                onToggle={() => toggleSelect(product.id)}
                                onRemove={() => handleRemove(product.id)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="py-16 text-center">
                        <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                            <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                        </div>
                        <p className="text-gray-500 mb-2">
                            {showOnlyLowest ? '최저가인 상품이 없습니다' : '찜한 상품이 없습니다'}
                        </p>
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

            {/* 하단 합계 바 */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-30">
                    <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">
                                {selectedIds.size}개 선택
                            </p>
                            <p className="text-xl font-bold text-gray-900">
                                총 {formatPrice(totalPrice)}원
                            </p>
                        </div>
                        <button className="px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors">
                            구매하기
                        </button>
                    </div>
                </div>
            )}

            <BottomNav />
        </>
    );
}
