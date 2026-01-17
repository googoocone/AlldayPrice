'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { ProductWithPrice } from '@/lib/types';
import { formatPrice } from '@/lib/utils';
import WishlistButton from './WishlistButton';

interface ProductGridCardProps {
    product: ProductWithPrice;
}

export default function ProductGridCard({ product }: ProductGridCardProps) {
    return (
        <div className="relative">
            {/* 찜하기 버튼 */}
            <div className="absolute top-2 right-2 z-10">
                <WishlistButton productId={product.id} size="sm" />
            </div>

            <Link
                href={`/products/${product.id}`}
                className="flex flex-col bg-white rounded-xl card-hover border border-gray-50 overflow-hidden"
            >
                {/* 상품 이미지 */}
                <div className="relative w-full aspect-square bg-gray-100">
                    {product.image_url ? (
                        <Image
                            src={product.image_url}
                            alt={product.name}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 50vw, 200px"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                    )}

                    {/* 역대 최저가 뱃지 */}
                    {product.is_lowest && (
                        <div className="absolute top-2 left-2 px-2 py-1 bg-accent-coral text-white text-xs font-bold rounded">
                            최저가
                        </div>
                    )}
                </div>

                {/* 상품 정보 */}
                <div className="p-3">
                    {/* 브랜드 */}
                    <p className="text-xs text-gray-500 mb-1 truncate">{product.brand}</p>

                    {/* 상품명 */}
                    <h3 className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug min-h-[2.5rem]">
                        {product.name}
                    </h3>

                    {/* 가격 정보 */}
                    <div className="mt-2">
                        {/* 정가 (취소선) */}
                        {product.original_price > product.current_price && (
                            <p className="text-xs text-gray-400 line-through">
                                {formatPrice(product.original_price)}원
                            </p>
                        )}

                        {/* 할인율 + 현재가 */}
                        <div className="flex items-baseline gap-1">
                            {product.discount_rate > 0 && (
                                <span className="text-accent-coral font-bold text-sm">
                                    {product.discount_rate}%
                                </span>
                            )}
                            <span className={`font-bold ${product.has_coupon ? 'text-gray-500 line-through text-sm' : 'text-gray-900 text-base'}`}>
                                {formatPrice(product.current_price)}원
                            </span>
                        </div>

                        {/* 쿠폰 적용가 */}
                        {product.has_coupon && product.coupon_price && (
                            <div className="flex items-center gap-1 mt-1">
                                <span className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-orange-100 text-orange-600 text-[10px] font-medium rounded">
                                    쿠폰
                                </span>
                                <span className="text-base font-bold text-accent-coral">
                                    {formatPrice(product.coupon_price)}원
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </Link>
        </div>
    );
}
