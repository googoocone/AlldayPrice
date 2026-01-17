/**
 * Supabase 데이터 페칭 API
 * 상품, 가격, 쿠폰 데이터를 가져오는 함수들
 */
import { supabase } from './supabase';
import type { ProductWithPrice } from './types';
import { CATEGORIES } from './types';

// 카테고리 순서 맵 (전체 제외, 인덱스 0부터 시작)
const CATEGORY_ORDER: Record<string, number> = {
    '스킨케어': 0,
    '마스크팩': 1,
    '클렌징': 2,
    '선케어': 3,
    '메이크업': 4,
    '네일': 5,
    '메이크업툴': 6,
    '더모 코스메틱': 7,
    '맨즈케어': 8,
    '향수/디퓨저': 9,
    '헤어케어': 10,
    '바디케어': 11,
    '건강식품': 12,
    '푸드': 13,
    '구강용품': 14,
    '헬스/건강용품': 15,
    '위생용품': 16,
    '패션': 17,
    '홈리빙/가전': 18,
    '취미/팬시': 19,
};

// Helper: DB 상품 데이터를 ProductWithPrice로 변환
function transformProductData(products: any[], coupons: any[], lowestPrices: any[]): ProductWithPrice[] {
    // 상품별 최저가 Map
    const lowestPriceMap: Record<string, number> = {};
    if (lowestPrices) {
        for (const record of lowestPrices) {
            if (!lowestPriceMap[record.product_id] || record.price < lowestPriceMap[record.product_id]) {
                lowestPriceMap[record.product_id] = record.price;
            }
        }
    }

    // 브랜드별 쿠폰 Map
    const couponMap: Record<string, any> = {};
    if (coupons) {
        for (const coupon of coupons) {
            if (!couponMap[coupon.brand] || coupon.discount_value > couponMap[coupon.brand].discount_value) {
                couponMap[coupon.brand] = coupon;
            }
        }
    }

    return products.map((product) => {
        const priceHistory = product.price_history as any[];
        const latestPrice = priceHistory?.[0];
        const currentPrice = latestPrice?.price || 0;
        const originalPrice = latestPrice?.original_price || currentPrice;
        const lowestPrice = lowestPriceMap[product.id] || currentPrice;
        const coupon = couponMap[product.brand];

        let couponPrice: number | undefined;
        let couponDiscount: number | undefined;

        if (coupon) {
            if (coupon.discount_type === 'percent') {
                couponDiscount = Math.floor(currentPrice * coupon.discount_value / 100);
                if (coupon.max_discount && couponDiscount > coupon.max_discount) {
                    couponDiscount = coupon.max_discount;
                }
            } else {
                couponDiscount = coupon.discount_value;
            }

            if (!coupon.min_purchase || currentPrice >= coupon.min_purchase) {
                couponPrice = currentPrice - (couponDiscount || 0);
            }
        }

        return {
            id: product.id,
            oliveyoung_id: product.oliveyoung_id,
            name: product.name,
            brand: product.brand,
            category: product.category,
            image_url: product.image_url,
            product_url: product.product_url,
            created_at: product.created_at,
            updated_at: product.updated_at,
            current_price: currentPrice,
            original_price: originalPrice,
            discount_rate: latestPrice?.discount_rate || 0,
            is_on_sale: latestPrice?.is_on_sale || false,
            lowest_price: lowestPrice,
            is_lowest: currentPrice <= lowestPrice,
            price_change: originalPrice - currentPrice,
            has_coupon: !!coupon && !!couponPrice,
            coupon_price: couponPrice,
            coupon_discount: couponDiscount,
            price_history: priceHistory,
        } as ProductWithPrice;
    });
}

/**
 * 카테고리별 상품 수 조회
 */
export async function getCategoryCount(category: string): Promise<number> {
    let query = supabase
        .from('products')
        .select('id', { count: 'exact', head: true });

    if (category && category !== '전체') {
        query = query.eq('category', category);
    }

    const { count, error } = await query;
    if (error) {
        console.error('카테고리 카운트 조회 오류:', error);
        return 0;
    }
    return count || 0;
}

/**
 * 카테고리별 상품 페이지네이션 조회 (직접 DB에서 필터링)
 * - 전체: 카테고리 순서대로 각 카테고리에서 가져옴
 * - 특정 카테고리: 해당 카테고리에서 offset 기반 페이지네이션
 */
export async function getProductsPaginated(
    category: string,
    offset: number = 0,
    limit: number = 20
): Promise<{ products: ProductWithPrice[]; total: number; hasMore: boolean }> {

    // "전체" 카테고리: 카테고리 순서대로 가져오기
    if (!category || category === '전체') {
        return getAllCategoriesProducts(offset, limit);
    }

    // 특정 카테고리: 직접 쿼리
    const { data: products, error, count } = await supabase
        .from('products')
        .select(`
            *,
            price_history (
                price,
                original_price,
                discount_rate,
                is_on_sale,
                recorded_at
            )
        `, { count: 'exact' })
        .eq('category', category)
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (error || !products) {
        console.error('상품 조회 오류:', error);
        return { products: [], total: 0, hasMore: false };
    }

    const total = count || 0;

    // 쿠폰 & 최저가 정보 가져오기
    const brands = [...new Set(products.map((p: any) => p.brand))];
    const productIds = products.map((p: any) => p.id);

    const [couponsResult, lowestPricesResult] = await Promise.all([
        supabase.from('coupons').select('*').in('brand', brands).eq('is_active', true),
        supabase.from('price_history').select('product_id, price').in('product_id', productIds)
    ]);

    const result = transformProductData(products, couponsResult.data || [], lowestPricesResult.data || []);

    return {
        products: result,
        total,
        hasMore: offset + products.length < total
    };
}

/**
 * "전체" 카테고리용: 카테고리 순서대로 상품 가져오기
 * offset과 limit을 카테고리 순서에 맞게 분배
 */
async function getAllCategoriesProducts(offset: number, limit: number): Promise<{ products: ProductWithPrice[]; total: number; hasMore: boolean }> {
    const categoryList = Object.keys(CATEGORY_ORDER);

    // 전체 상품 수 조회
    const { count: totalCount } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true });

    const total = totalCount || 0;

    // 각 카테고리별 상품 수 조회
    const { data: categoryCounts } = await supabase
        .from('products')
        .select('category')
        .then(async (res) => {
            // 카테고리별 카운트 계산
            const countMap: Record<string, number> = {};
            res.data?.forEach((p: any) => {
                countMap[p.category] = (countMap[p.category] || 0) + 1;
            });
            return { data: countMap };
        });

    // offset 위치 찾기 - 어떤 카테고리의 몇 번째부터 시작해야 하는지
    let skipCount = offset;
    let startCategoryIndex = 0;
    let startOffsetInCategory = 0;

    for (let i = 0; i < categoryList.length; i++) {
        const catName = categoryList[i];
        const catCount = categoryCounts?.[catName] || 0;

        if (skipCount < catCount) {
            startCategoryIndex = i;
            startOffsetInCategory = skipCount;
            break;
        }
        skipCount -= catCount;

        // 마지막 카테고리까지 왔으면 끝
        if (i === categoryList.length - 1) {
            return { products: [], total, hasMore: false };
        }
    }

    // 필요한 만큼 카테고리별로 상품 가져오기
    let collected: any[] = [];
    let remaining = limit;

    for (let i = startCategoryIndex; i < categoryList.length && remaining > 0; i++) {
        const catName = categoryList[i];
        const catOffset = i === startCategoryIndex ? startOffsetInCategory : 0;

        const { data: products } = await supabase
            .from('products')
            .select(`
                *,
                price_history (
                    price,
                    original_price,
                    discount_rate,
                    is_on_sale,
                    recorded_at
                )
            `)
            .eq('category', catName)
            .order('updated_at', { ascending: false })
            .range(catOffset, catOffset + remaining - 1);

        if (products && products.length > 0) {
            collected = [...collected, ...products];
            remaining -= products.length;
        }
    }

    if (collected.length === 0) {
        return { products: [], total, hasMore: false };
    }

    const brands = [...new Set(collected.map((p: any) => p.brand))];
    const productIds = collected.map((p: any) => p.id);

    const [couponsResult, lowestPricesResult] = await Promise.all([
        supabase.from('coupons').select('*').in('brand', brands).eq('is_active', true),
        supabase.from('price_history').select('product_id, price').in('product_id', productIds)
    ]);

    const result = transformProductData(collected, couponsResult.data || [], lowestPricesResult.data || []);

    return {
        products: result,
        total,
        hasMore: offset + collected.length < total
    };
}

// 하위 호환성을 위해 기존 함수 유지 (deprecated)
export async function getOrderedProductIds(category: string): Promise<string[]> {
    const result = await getProductsPaginated(category, 0, 1000);
    return result.products.map(p => p.id);
}

/**
 * ID 리스트로 상품 상세 정보 조회 (페이지네이션용)
 */
export async function getProductsByIds(ids: string[]): Promise<ProductWithPrice[]> {
    if (ids.length === 0) return [];

    // 1. 상품 정보 + 최신 가격
    const { data: products, error } = await supabase
        .from('products')
        .select(`
            *,
            price_history (
                price,
                original_price,
                discount_rate,
                is_on_sale,
                recorded_at
            )
        `)
        .in('id', ids);

    if (error || !products) {
        console.error('상품 상세 조회 오류:', error);
        return [];
    }

    // 2. 쿠폰 정보
    const brands = [...new Set(products.map((p: any) => p.brand))];
    const { data: coupons } = await supabase
        .from('coupons')
        .select('*')
        .in('brand', brands)
        .eq('is_active', true);

    // 3. 최저가 정보
    const { data: lowestPrices } = await supabase
        .from('price_history')
        .select('product_id, price')
        .in('product_id', ids);

    // 4. 변환
    const result = transformProductData(products, coupons || [], lowestPrices || []);

    // 5. ID 순서대로 정렬 (SQL IN 쿼리는 순서 보장 안 함)
    const resultMap = new Map(result.map(p => [p.id, p]));
    return ids.map(id => resultMap.get(id)).filter(p => p !== undefined) as ProductWithPrice[];
}

/**
 * 기존 getProducts (유지하되 내부적으로 활용 가능, 여기서는 독립적으로 둠)
 */
export async function getProducts(category?: string, limit: number = 20): Promise<ProductWithPrice[]> {
    // ... (기존 로직 유지 또는 deprecated)
    // 여기서는 간단히 위의 함수들을 조합해서 구현할 수도 있지만,
    // 기존 호환성을 위해 코드를 남겨둡니다 (하지만 무한스크롤에서는 getProductList + getProductsByIds 패턴 사용 권장)

    let query = supabase
        .from('products')
        .select(`
      *,
      price_history (
        price,
        original_price,
        discount_rate,
        is_on_sale,
        recorded_at
      )
    `)
        .order('updated_at', { ascending: false })
        .limit(limit);

    if (category && category !== '전체') {
        query = query.eq('category', category);
    }

    const { data: products, error } = await query;
    if (error || !products) return [];

    // Helper 사용을 위해 데이터 fetch 로직 중복... 
    // 리팩토링 편의상 아래 로직은 기존 함수 body를 Helper로 교체하는 것이 깔끔함.

    const brands = [...new Set(products.map((p: any) => p.brand))];
    const { data: coupons } = await supabase.from('coupons').select('*').in('brand', brands).eq('is_active', true);

    const productIds = products.map((p: any) => p.id);
    const { data: lowestPrices } = await supabase.from('price_history').select('product_id, price').in('product_id', productIds);

    const result = transformProductData(products, coupons || [], lowestPrices || []);

    // 카테고리 정렬 (전체일 때)
    if (!category || category === '전체') {
        result.sort((a, b) => {
            const orderA = CATEGORY_ORDER[a.category] ?? 999;
            const orderB = CATEGORY_ORDER[b.category] ?? 999;
            return orderA - orderB;
        });
    }

    return result;
}

/**
 * 상품 상세 조회 (가격 히스토리 포함)
 */
export async function getProductById(id: string) {
    const { data: product, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();


    if (error || !product) {
        console.error('상품 상세 조회 오류:', error);
        return null;
    }

    // 가격 히스토리 (최근 30일)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: priceHistory } = await supabase
        .from('price_history')
        .select('*')
        .eq('product_id', id)
        .gte('recorded_at', thirtyDaysAgo.toISOString())
        .order('recorded_at', { ascending: true });

    // 브랜드 쿠폰
    const { data: coupons } = await supabase
        .from('coupons')
        .select('*')
        .eq('brand', (product as any).brand)
        .eq('is_active', true);

    return {
        product,
        priceHistory: priceHistory || [],
        coupons: coupons || [],
    };
}

/**
 * 상품 검색
 */
/**
 * 상품 검색
 */
export async function searchProducts(query: string, limit: number = 20): Promise<ProductWithPrice[]> {
    if (!query.trim()) return [];

    let dbQuery = supabase
        .from('products')
        .select(`
      *,
      price_history (
        price,
        original_price,
        discount_rate,
        is_on_sale,
        recorded_at
      )
    `)
        .order('updated_at', { ascending: false })
        .limit(limit);

    // 검색어를 공백으로 분리하여 각 단어가 이름이나 브랜드에 포함되는지 확인 (AND 조건)
    // 특수문자 이스케이프: PostgREST 필터 문법과 충돌하는 문자(괄호, 콤마 등)를 공백으로 치환
    // 이렇게 하면 "7종(단품/기획)" -> "7종 단품 기획" 으로 변환되어 각각의 단어로 검색됨
    const sanitizedQuery = query.replace(/[(),\[\]\/]/g, ' ');

    // 공백으로 분리하여 각 단어가 이름이나 브랜드에 포함되는지 확인 (AND 조건)
    const terms = sanitizedQuery.trim().split(/\s+/);

    for (const term of terms) {
        if (!term) continue;

        // 각 검색어가 이름 OR 브랜드에 포함되어야 함
        dbQuery = dbQuery.or(`name.ilike.%${term}%,brand.ilike.%${term}%`);
    }

    const { data: products, error } = await dbQuery;

    if (error || !products) {
        console.error('검색 오류:', error);
        return [];
    }

    // getProducts와 동일한 변환 로직 적용
    return products.map((product: any) => {
        const priceHistory = product.price_history as any[];
        const latestPrice = priceHistory?.[0];

        return {
            id: product.id,
            oliveyoung_id: product.oliveyoung_id,
            name: product.name,
            brand: product.brand,
            category: product.category,
            image_url: product.image_url,
            product_url: product.product_url,
            created_at: product.created_at,
            updated_at: product.updated_at,
            current_price: latestPrice?.price || 0,
            original_price: latestPrice?.original_price || 0,
            discount_rate: latestPrice?.discount_rate || 0,
            is_on_sale: latestPrice?.is_on_sale || false,
            lowest_price: latestPrice?.price || 0,
            is_lowest: false,
        } as ProductWithPrice;
    });
}

/**
 * 역대 최저가 상품 조회
 */
export async function getLowestPriceProducts(limit: number = 10): Promise<ProductWithPrice[]> {
    // RPC 함수 호출 (get_today_lowest_products)
    const { data, error } = await supabase.rpc('get_today_lowest_products', { p_limit: limit } as any);

    if (error || !data) {
        console.error('최저가 조회 오류:', error);
        return getProducts(undefined, limit); // 폴백: 일반 상품 목록
    }

    return (data as any[]).map((item: any) => ({
        id: item.id,
        name: item.name,
        brand: item.brand,
        category: item.category,
        image_url: item.image_url,
        product_url: item.product_url,
        current_price: item.current_price,
        original_price: item.original_price,
        discount_rate: item.discount_rate,
        is_on_sale: item.is_on_sale,
        lowest_price: item.lowest_price,
        is_lowest: true,
    } as ProductWithPrice));
}

/**
 * 검색어 자동완성 제안
 */
export async function getSearchSuggestions(query: string): Promise<string[]> {
    if (!query || query.length < 2) return [];

    const { data, error } = await supabase
        .from('products')
        .select('name')
        .ilike('name', `%${query}%`)
        .limit(10);

    if (error) {
        console.error('자동완성 검색 오류:', error);
        return [];
    }

    // 중복 제거 및 단순화
    const suggestions = Array.from(new Set(data.map(p => p.name)));
    return suggestions.slice(0, 5);
}

/**
 * 검색어 로깅
 */
export async function logSearch(query: string, userId?: string) {
    if (!query.trim()) return;

    const { error } = await supabase
        .from('search_logs')
        .insert({
            query: query.trim(),
            user_id: userId || null
        });

    if (error) {
        console.error('검색어 로깅 오류:', error);
    }
}

/**
 * 인기 검색어 조회
 */
export async function getPopularSearches(): Promise<{ query: string; count: number }[]> {
    const { data, error } = await supabase
        .from('popular_searches_view')
        .select('*');

    if (error) {
        console.error('인기 검색어 조회 오류:', error);
        return [];
    }

    return data || [];
}
