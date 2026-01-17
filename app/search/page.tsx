'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import ProductCard from '@/components/ProductCard';
import type { ProductWithPrice } from '@/lib/types';
import { searchProducts, getSearchSuggestions, logSearch, getPopularSearches } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

const RECENT_SEARCHES_KEY = 'olp_recent_searches';

export default function SearchPage() {
    const { user } = useAuth();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<ProductWithPrice[]>([]);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [popularSearches, setPopularSearches] = useState<{ query: string; count: number }[]>([]);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);

    const skipDebounce = useRef(false);

    // 로컬스토리지 및 인기 검색어 로드
    useEffect(() => {
        const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
        if (saved) {
            setRecentSearches(JSON.parse(saved));
        }

        // 인기 검색어 로드
        getPopularSearches().then(setPopularSearches);
    }, []);

    // 검색 실행 (상품 검색)
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

    // 자동완성 제안 가져오기
    const fetchSuggestions = useCallback(async (searchQuery: string) => {
        if (!searchQuery.trim() || searchQuery.length < 1) {
            setSuggestions([]);
            return;
        }
        const data = await getSearchSuggestions(searchQuery);
        setSuggestions(data);
    }, []);

    // 디바운스 처리 (검색 + 자동완성)
    useEffect(() => {
        // skipDebounce가 true면 이번 이펙트는 스킵 (즉, 검색 실행 안함)하고 플래그 초기화
        if (skipDebounce.current) {
            skipDebounce.current = false;
            return;
        }

        const timer = setTimeout(() => {
            if (query.trim()) {
                search(query);
                fetchSuggestions(query);
            } else {
                setResults([]);
                setSuggestions([]);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query, search, fetchSuggestions]);

    // 검색어 저장 및 로깅
    const saveAndLogSearch = (searchQuery: string) => {
        if (!searchQuery.trim()) return;

        // 로컬스토리지 저장
        const updated = [searchQuery, ...recentSearches.filter((s) => s !== searchQuery)].slice(0, 7);
        setRecentSearches(updated);
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));

        // 서버 로깅
        logSearch(searchQuery, user?.id);
    };

    // 검색어 클릭 (최근/인기/자동완성)
    const handleSearchClick = (searchQuery: string) => {
        setQuery(searchQuery);
        setShowSuggestions(false);
        saveAndLogSearch(searchQuery);

        // 플래그 설정: 검색어 변경으로 인한 useEffect 실행 방지
        skipDebounce.current = true;

        // 즉시 검색 실행 (디바운스 기다리지 않음)
        search(searchQuery);
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
        setShowSuggestions(false);
        saveAndLogSearch(query);

        // 제출 시에도 즉시 검색하고 디바운스 스킵
        skipDebounce.current = true;
        search(query);
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
                                onChange={(e) => {
                                    setQuery(e.target.value);
                                    setShowSuggestions(true);
                                }}
                                onFocus={() => setShowSuggestions(true)}
                                placeholder="상품명, 브랜드 검색"
                                autoFocus
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-gray-900"
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

                            {/* 자동완성 목록 */}
                            {showSuggestions && suggestions.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50">
                                    {suggestions.map((item, index) => (
                                        <button
                                            key={index}
                                            type="button"
                                            onClick={() => handleSearchClick(item)}
                                            className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 flex items-center gap-2"
                                        >
                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                            <span className="text-gray-900">{item.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')).map((part, i) =>
                                                part.toLowerCase() === query.toLowerCase() ? <span key={i} className="text-primary font-medium">{part}</span> : part
                                            )}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </form>
                </div>
            </header>

            <main className="max-w-lg mx-auto px-4 py-4 pb-20" onClick={() => setShowSuggestions(false)}>
                {/* 검색 결과 */}
                {query ? (
                    <div>
                        {/* 로딩 중이고 기존 결과가 없을 때만 스피너 표시 (최초 검색) */}
                        {isSearching && results.length === 0 ? (
                            <div className="py-12 text-center text-gray-400">
                                <div className="animate-spin inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full mb-2"></div>
                                <p>검색 중...</p>
                            </div>
                        ) : (
                            <div className={`space-y-3 transition-opacity duration-200 ${isSearching ? 'opacity-50' : 'opacity-100'}`}>
                                {results.length > 0 ? (
                                    results.map((product) => (
                                        <ProductCard key={product.id} product={product} />
                                    ))
                                ) : (
                                    !isSearching && (
                                        <div className="py-12 text-center">
                                            <p className="text-gray-400 mb-2">검색 결과가 없습니다</p>
                                            <p className="text-sm text-gray-300">다른 검색어로 시도해보세요</p>
                                        </div>
                                    )
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* 최근 검색어 */}
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
                                                onClick={() => handleSearchClick(term)}
                                                className="text-sm text-gray-700"
                                            >
                                                {term}
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeRecentSearch(term);
                                                }}
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

                        {/* 인기 검색어 */}
                        <div>
                            <h2 className="font-bold text-gray-900 mb-3">인기 검색어</h2>
                            {popularSearches.length > 0 ? (
                                <div className="grid grid-cols-2 gap-3">
                                    {popularSearches.map((item, index) => (
                                        <button
                                            key={item.query}
                                            onClick={() => handleSearchClick(item.query)}
                                            className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors text-left"
                                        >
                                            <span className={`text-sm font-bold w-4 text-center ${index < 3 ? 'text-primary' : 'text-gray-400'}`}>
                                                {index + 1}
                                            </span>
                                            <span className="text-sm text-gray-700 truncate flex-1">
                                                {item.query}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-400">집계된 인기 검색어가 없습니다.</p>
                            )}
                        </div>
                    </div>
                )}
            </main>

            <BottomNav />
        </>
    );
}
