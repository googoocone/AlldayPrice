'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { addToWishlistDB, removeFromWishlistDB, isInWishlistDB } from '@/lib/wishlist';

const WISHLIST_KEY = 'olp_wishlist';

interface WishlistButtonProps {
    productId: string;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export default function WishlistButton({ productId, size = 'md', className = '' }: WishlistButtonProps) {
    const { user } = useAuth();
    const [isWishlisted, setIsWishlisted] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // 초기 상태 로드
    const checkWishlistStatus = useCallback(async () => {
        setIsLoading(true);

        if (user) {
            // 로그인 시: DB 확인
            const inWishlist = await isInWishlistDB(user.id, productId);
            setIsWishlisted(inWishlist);
        } else {
            // 비로그인: localStorage 확인
            const saved = localStorage.getItem(WISHLIST_KEY);
            if (saved) {
                const wishlist: string[] = JSON.parse(saved);
                setIsWishlisted(wishlist.includes(productId));
            }
        }

        setIsLoading(false);
    }, [user, productId]);

    useEffect(() => {
        checkWishlistStatus();
    }, [checkWishlistStatus]);

    const toggleWishlist = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (user) {
            // 로그인 시: DB 사용
            if (isWishlisted) {
                const success = await removeFromWishlistDB(user.id, productId);
                if (success) setIsWishlisted(false);
            } else {
                const success = await addToWishlistDB(user.id, productId);
                if (success) {
                    setIsWishlisted(true);
                    setIsAnimating(true);
                    setTimeout(() => setIsAnimating(false), 300);
                }
            }
        } else {
            // 비로그인: localStorage 사용
            const saved = localStorage.getItem(WISHLIST_KEY);
            let wishlist: string[] = saved ? JSON.parse(saved) : [];

            if (isWishlisted) {
                wishlist = wishlist.filter((id) => id !== productId);
            } else {
                wishlist = [...wishlist, productId];
                setIsAnimating(true);
                setTimeout(() => setIsAnimating(false), 300);
            }

            localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist));
            setIsWishlisted(!isWishlisted);
        }

        // 다른 컴포넌트에 변경 알림
        window.dispatchEvent(new CustomEvent('wishlist-changed'));
    };

    const sizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-10 h-10',
        lg: 'w-12 h-12',
    };

    const iconSizes = {
        sm: 'w-5 h-5',
        md: 'w-6 h-6',
        lg: 'w-7 h-7',
    };

    if (isLoading) {
        return (
            <div className={`${sizeClasses[size]} flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-md ${className}`}>
                <div className={`${iconSizes[size]} animate-pulse bg-gray-200 rounded-full`} />
            </div>
        );
    }

    return (
        <button
            onClick={toggleWishlist}
            className={`${sizeClasses[size]} flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-md hover:scale-110 active:scale-95 transition-all ${className}`}
            aria-label={isWishlisted ? '찜 해제' : '찜하기'}
        >
            <svg
                className={`${iconSizes[size]} transition-all ${isAnimating ? 'scale-125' : ''} ${isWishlisted ? 'text-accent-coral fill-current' : 'text-gray-400'
                    }`}
                fill={isWishlisted ? 'currentColor' : 'none'}
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={isWishlisted ? 0 : 2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
            </svg>
        </button>
    );
}

// 유틸리티: 현재 찜 목록 가져오기 (localStorage - 비로그인용)
export function getWishlist(): string[] {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem(WISHLIST_KEY);
    return saved ? JSON.parse(saved) : [];
}

// 유틸리티: 찜 목록에서 상품 제거 (localStorage - 비로그인용)
export function removeFromWishlist(productId: string): void {
    const wishlist = getWishlist().filter((id) => id !== productId);
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist));
    window.dispatchEvent(new CustomEvent('wishlist-changed'));
}

