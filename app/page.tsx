'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import CategoryPills from '@/components/CategoryPills';
import ProductCard from '@/components/ProductCard';
import ProductGridCard from '@/components/ProductGridCard';
import type { Category, ProductWithPrice } from '@/lib/types';
import { getProductsPaginated } from '@/lib/api';

type ViewMode = 'list' | 'grid';

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState<Category>('전체');
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // State for Infinite Scroll
  const [products, setProducts] = useState<ProductWithPrice[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  // Observer ref
  const observerTarget = useRef<HTMLDivElement>(null);

  // 1. 카테고리 변경 시: 첫 페이지 로드
  useEffect(() => {
    let isCancelled = false;

    async function initializeCategory() {
      setLoading(true);
      setProducts([]);
      setTotalCount(0);
      setHasMore(false);

      try {
        const result = await getProductsPaginated(selectedCategory, 0, 20);

        if (isCancelled) return;

        setProducts(result.products);
        setTotalCount(result.total);
        setHasMore(result.hasMore);
      } catch (error) {
        console.error('초기화 오류:', error);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    initializeCategory();

    return () => {
      isCancelled = true;
    };
  }, [selectedCategory]);

  // 2. 추가 데이터 로드 (Infinite Scroll)
  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const offset = products.length;
      const result = await getProductsPaginated(selectedCategory, offset, 20);

      setProducts(prev => [...prev, ...result.products]);
      setHasMore(result.hasMore);
    } catch (error) {
      console.error('추가 로드 오류:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [selectedCategory, products.length, hasMore, loading, loadingMore]);

  // 3. Intersection Observer 설정
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.5 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [loadMore, hasMore, loading, loadingMore]);


  // 통계 계산 (보여지는 상품 기준이 아니라 전체 ID 기준은 아니지만, 현재 로드된 것 기준으로 함, 
  // 또는 통계를 위해 별도 쿼리를 해야 하나 사용자 경험상 현재 보이는 것 기준이 자연스러울 수 있음. 
  // 하지만 '역대 최저가' 알림은 중요하므로 원래 로직처럼 전체 기준은 아니더라도 로드된 것 중에서 보여줌)
  // *더 정확하게 하려면 getOrderedProductIds에서 통계도 같이 가져와야 하지만, 
  // 일단 현재 로드된 상품 내에서 통계를 보여주도록 유지 (사용자가 스크롤하면서 발견하는 재미)*

  const lowestPriceCount = products.filter(p => p.is_lowest).length;
  const couponCount = products.filter(p => p.has_coupon).length;

  return (
    <>
      <Header />

      <main className="max-w-lg mx-auto">
        {/* 검색바 */}
        <div className="px-4 pt-4">
          <Link
            href="/search"
            className="flex items-center gap-3 w-full px-4 py-3 bg-gray-100 rounded-xl text-gray-400"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-sm">상품명, 브랜드 검색</span>
          </Link>
        </div>

        {/* 알림 배너 (로드된 상품 기준) */}
        {!loading && (
          <div className="px-4 mt-4 space-y-2">
            {lowestPriceCount > 0 && (
              <div className="p-4 bg-primary-light rounded-xl animate-fade-in">
                <p className="text-sm text-primary font-medium flex items-center gap-2">
                  <span className="text-lg">🏆</span>
                  <span>
                    <strong>{lowestPriceCount}개</strong> 상품이 역대 최저가예요!
                  </span>
                </p>
              </div>
            )}

            {couponCount > 0 && (
              <div className="p-4 bg-orange-50 rounded-xl animate-fade-in">
                <p className="text-sm text-orange-600 font-medium flex items-center gap-2">
                  <span className="text-lg">🎫</span>
                  <span>
                    <strong>{couponCount}개</strong> 브랜드에 쿠폰이 있어요!
                  </span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* 카테고리 필터 */}
        <CategoryPills selected={selectedCategory} onSelect={setSelectedCategory} />

        {/* 섹션 타이틀 + 뷰 토글 */}
        <div className="px-4 mt-2 mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-900">
              🔥 오늘의 최저가
            </h2>
            <span className="text-sm text-gray-400">
              {loading ? '로딩 중...' : `총 ${totalCount}개`}
            </span>
          </div>

          {/* 뷰 모드 토글 */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'list'
                  ? 'bg-white shadow-sm text-primary'
                  : 'text-gray-400 hover:text-gray-600'
                }`}
              aria-label="리스트 보기"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'grid'
                  ? 'bg-white shadow-sm text-primary'
                  : 'text-gray-400 hover:text-gray-600'
                }`}
              aria-label="그리드 보기"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* 상품 리스트 */}
        <div className={`px-4 pb-6 ${viewMode === 'grid'
            ? 'grid grid-cols-2 gap-3'
            : 'space-y-3'
          }`}>
          {products.map((product) => (
            viewMode === 'grid'
              ? <ProductGridCard key={product.id} product={product} />
              : <ProductCard key={product.id} product={product} />
          ))}

          {/* 로딩 스켈레톤 & Sentinel */}
          {(loading || loadingMore) && (
            <div className="space-y-3 py-2">
              {/* 스켈레톤 UI */}
              {[1, 2].map((i) => (
                <div key={i} className="animate-pulse flex gap-4 p-4 bg-white rounded-xl border border-gray-100">
                  <div className="w-24 h-24 bg-gray-200 rounded-lg"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Scroll Target */}
          <div ref={observerTarget} className="h-4 w-full" />

          {/* 데이터 없음 처리 */}
          {!loading && products.length === 0 && (
            <div className="py-12 text-center text-gray-400">
              <p className="text-4xl mb-2">📦</p>
              <p>아직 상품 데이터가 없어요</p>
              <p className="text-sm mt-1">크롤러를 실행해서 데이터를 수집하세요!</p>
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </>
  );
}
