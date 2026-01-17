import { supabase } from './supabase';

export interface WishlistItem {
    id: string;
    user_id: string;
    product_id: string;
    created_at: string;
}

/**
 * DB에서 사용자의 찜 목록 조회
 */
export async function getWishlistFromDB(userId: string): Promise<string[]> {
    const { data, error } = await supabase
        .from('wishlist')
        .select('product_id')
        .eq('user_id', userId);

    if (error) {
        console.error('찜 목록 조회 오류:', error);
        return [];
    }

    return data?.map(item => item.product_id) || [];
}

/**
 * DB에 찜 추가
 */
export async function addToWishlistDB(userId: string, productId: string): Promise<boolean> {
    const { error } = await supabase
        .from('wishlist')
        .upsert(
            { user_id: userId, product_id: productId },
            { onConflict: 'user_id,product_id' }
        );

    if (error) {
        console.error('찜 추가 오류:', error);
        return false;
    }

    return true;
}

/**
 * DB에서 찜 삭제
 */
export async function removeFromWishlistDB(userId: string, productId: string): Promise<boolean> {
    const { error } = await supabase
        .from('wishlist')
        .delete()
        .eq('user_id', userId)
        .eq('product_id', productId);

    if (error) {
        console.error('찜 삭제 오류:', error);
        return false;
    }

    return true;
}

/**
 * 특정 상품이 찜 목록에 있는지 확인
 */
export async function isInWishlistDB(userId: string, productId: string): Promise<boolean> {
    const { data, error } = await supabase
        .from('wishlist')
        .select('id')
        .eq('user_id', userId)
        .eq('product_id', productId)
        .maybeSingle();

    if (error) {
        console.error('찜 확인 오류:', error);
        return false;
    }

    return !!data;
}

/**
 * 사용자의 찜 목록 개수 조회
 */
export async function getWishlistCountFromDB(userId: string): Promise<number> {
    const { count, error } = await supabase
        .from('wishlist')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

    if (error) {
        console.error('찜 개수 조회 오류:', error);
        return 0;
    }

    return count || 0;
}
