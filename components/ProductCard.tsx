import Link from 'next/link';
import Image from 'next/image';
import type { ProductWithPrice } from '@/lib/types';
import { formatPrice } from '@/lib/utils';

interface ProductCardProps {
    product: ProductWithPrice;
}

export default function ProductCard({ product }: ProductCardProps) {
    return (
        <Link
            href={`/products/${product.id}`}
            className="flex gap-3 p-4 bg-white rounded-xl card-hover border border-gray-50"
        >
            {/* 상품 이미지 */}
            <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                {product.image_url ? (
                    <Image
                        src={product.image_url}
                        alt={product.name}
                        fill
                        className="object-cover"
                        sizes="96px"
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
                    {/* 브랜드 */}
                    <p className="text-xs text-gray-500 mb-0.5">{product.brand}</p>

                    {/* 상품명 */}
                    <h3 className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug">
                        {product.name}
                    </h3>
                </div>

                {/* 가격 정보 */}
                <div className="mt-2">
                    {/* 정가 (취소선) */}
                    {product.original_price > product.current_price && (
                        <p className="text-xs text-gray-400 line-through">
                            {formatPrice(product.original_price)}원
                        </p>
                    )}

                    {/* 할인율 + 현재가 */}
                    <div className="flex items-baseline gap-1.5">
                        {product.discount_rate > 0 && (
                            <span className="text-accent-coral font-bold text-base">
                                {product.discount_rate}%
                            </span>
                        )}
                        <span className={`text-lg font-bold ${product.has_coupon ? 'text-gray-500 line-through text-sm' : 'text-gray-900'}`}>
                            {formatPrice(product.current_price)}원
                        </span>
                    </div>

                    {/* 쿠폰 적용가 */}
                    {product.has_coupon && product.coupon_price && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-orange-100 text-orange-600 text-[10px] font-medium rounded">
                                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V8a1 1 0 011-1h10a1 1 0 011 1v4a2 2 0 002-2V6a2 2 0 00-2-2H4z" clipRule="evenodd" />
                                </svg>
                                쿠폰
                            </span>
                            <span className="text-lg font-bold text-accent-coral">
                                {formatPrice(product.coupon_price)}원
                            </span>
                        </div>
                    )}

                    {/* 가격 변동 태그 */}
                    {product.price_change && product.price_change > 0 && (
                        <div className="inline-flex items-center mt-1.5 px-2 py-0.5 bg-primary-light text-primary text-xs font-medium rounded">
                            <svg className="w-3 h-3 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                            </svg>
                            {formatPrice(product.price_change)}원 하락
                        </div>
                    )}
                </div>
            </div>
        </Link>
    );
}
