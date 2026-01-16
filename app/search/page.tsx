'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import ProductCard from '@/components/ProductCard';
import type { ProductWithPrice } from '@/lib/types';
import { searchProducts } from '@/lib/api';

const RECENT_SEARCHES_KEY = 'olp_recent_searches';

export default function SearchPage() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<ProductWithPrice[]>([]);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // 로컬스토리지에서 최근 검색어 로드
    useEffect(() => {
        const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
        if (saved) {
            setRecentSearches(JSON.parse(saved));
        }
    }, []);

    // 검색 함수 (Supabase API 호출)
    const search = useCallback(async (searchQuery: string) => {
        if (!searchQuery.trim()) {
            setResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const data = await searchProducts(searchQuery, 20);
            setResults(data);
        } catch (error) {
            console.error('검색 오류:', error);
            setResults([]);
        } finally {
            setIsSearching(false);
        }
    }, []);

    // 디바운스 검색
    useEffect(() => {
        const timer = setTimeout(() => {
            search(query);
        }, 300);

        return () => clearTimeout(timer);
    }, [query, search]);

    // 검색어 저장
    const saveSearch = (searchQuery: string) => {
        if (!searchQuery.trim()) return;

        const updated = [searchQuery, ...recentSearches.filter((s) => s !== searchQuery)].slice(0, 10);
        setRecentSearches(updated);
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    };

    // 최근 검색어 클릭
    const handleRecentClick = (searchQuery: string) => {
        setQuery(searchQuery);
        saveSearch(searchQuery);
    };

    // 최근 검색어 삭제
    const removeRecentSearch = (searchQuery: string) => {
        const updated = recentSearches.filter((s) => s !== searchQuery);
        setRecentSearches(updated);
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    };

    // 검색 제출
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        saveSearch(query);
    };

    return (
        <>
            {/* 헤더 */}
            <header className="sticky top-0 bg-white border-b border-gray-100 z-40">
                <div className="max-w-lg mx-auto px-4 py-3">
                    <form onSubmit={handleSubmit} className="flex items-center gap-3">
                        <Link href="/" className="p-1 text-gray-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </Link>
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="상품명, 브랜드 검색"
                                autoFocus
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                            <svg
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            {query && (
                                <button
                                    type="button"
                                    onClick={() => setQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </header>

            <main className="max-w-lg mx-auto px-4 py-4 pb-20">
                {/* 검색 결과 */}
                {query ? (
                    <div>
                        {isSearching ? (
                            <div className="py-12 text-center text-gray-400">
                                <div className="animate-spin inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full mb-2"></div>
                                <p>검색 중...</p>
                            </div>
                        ) : results.length > 0 ? (
                            <div className="space-y-3">
                                {results.map((product) => (
                                    <ProductCard key={product.id} product={product} />
                                ))}
                            </div>
                        ) : (
                            <div className="py-12 text-center">
                                <p className="text-gray-400 mb-2">검색 결과가 없습니다</p>
                                <p className="text-sm text-gray-300">다른 검색어로 시도해보세요</p>
                            </div>
                        )}
                    </div>
                ) : (
                    /* 최근 검색어 */
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="font-bold text-gray-900">최근 검색어</h2>
                            {recentSearches.length > 0 && (
                                <button
                                    onClick={() => {
                                        setRecentSearches([]);
                                        localStorage.removeItem(RECENT_SEARCHES_KEY);
                                    }}
                                    className="text-sm text-gray-400"
                                >
                                    전체 삭제
                                </button>
                            )}
                        </div>

                        {recentSearches.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {recentSearches.map((term) => (
                                    <div
                                        key={term}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded-full"
                                    >
                                        <button
                                            onClick={() => handleRecentClick(term)}
                                            className="text-sm text-gray-700"
                                        >
                                            {term}
                                        </button>
                                        <button
                                            onClick={() => removeRecentSearch(term)}
                                            className="text-gray-400 hover:text-gray-600"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400">최근 검색어가 없습니다</p>
                        )}
                    </div>
                )}
            </main>

            <BottomNav />
        </>
    );
}
