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
        } as ProductWithPrice;
    });
}

/**
 * 전체 상품 목록 (ID, Category만 Light하게 조회) - 정렬용
 */
export async function getProductList(): Promise<{ id: string; category: string; updated_at: string }[]> {
    const { data, error } = await supabase
        .from('products')
        .select('id, category, updated_at')
        .order('updated_at', { ascending: false });

    if (error) {
        console.error('상품 리스트 조회 오류:', error);
        return [];
    }
    return data || [];
}

/**
 * 전체 상품 ID 목록 (카테고리별 정렬됨)
 */
export async function getOrderedProductIds(category: string): Promise<string[]> {
    const list = await getProductList();

    // 1. 카테고리 필터링
    const filtered = (category && category !== '전체')
        ? list.filter(p => p.category === category)
        : list;

    // 2. 정렬 (전체인 경우 카테고리 순서 적용)
    if (!category || category === '전체') {
        filtered.sort((a, b) => {
            const orderA = CATEGORY_ORDER[a.category] ?? 999;
            const orderB = CATEGORY_ORDER[b.category] ?? 999;
            return orderA - orderB;
        });
    }

    return filtered.map(p => p.id);
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
export async function searchProducts(query: string, limit: number = 20): Promise<ProductWithPrice[]> {
    if (!query.trim()) return [];

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
        .or(`name.ilike.%${query}%,brand.ilike.%${query}%`)
        .order('updated_at', { ascending: false })
        .limit(limit);

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
            has_coupon: false,
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
        has_coupon: false,
    } as ProductWithPrice));
}
