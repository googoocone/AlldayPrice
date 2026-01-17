import { supabase } from './supabase';

export interface PushSubscription {
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
}

/**
 * 푸시 구독 정보를 DB에 저장
 */
export async function savePushSubscription(
    userId: string,
    subscription: PushSubscription
): Promise<boolean> {
    const { error } = await supabase
        .from('push_subscriptions')
        .upsert(
            {
                user_id: userId,
                endpoint: subscription.endpoint,
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth,
            },
            { onConflict: 'user_id' }
        );

    if (error) {
        console.error('푸시 구독 저장 오류:', error);
        return false;
    }

    return true;
}

/**
 * 푸시 구독 정보 삭제
 */
export async function deletePushSubscription(userId: string): Promise<boolean> {
    const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId);

    if (error) {
        console.error('푸시 구독 삭제 오류:', error);
        return false;
    }

    return true;
}

/**
 * 사용자의 푸시 구독 정보 조회
 */
export async function getPushSubscription(userId: string) {
    const { data, error } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

    if (error) {
        console.error('푸시 구독 조회 오류:', error);
        return null;
    }

    return data;
}

/**
 * 서비스 워커에서 푸시 구독 생성
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.error('푸시 알림을 지원하지 않는 브라우저입니다.');
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.ready;

        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(
                process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
            ) as BufferSource,
        });

        const subscriptionJson = subscription.toJSON();

        return {
            endpoint: subscriptionJson.endpoint!,
            keys: {
                p256dh: subscriptionJson.keys!.p256dh!,
                auth: subscriptionJson.keys!.auth!,
            },
        };
    } catch (error) {
        console.error('푸시 구독 오류:', error);
        return null;
    }
}

/**
 * Base64 URL을 Uint8Array로 변환
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}
