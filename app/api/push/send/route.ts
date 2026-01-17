import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

// VAPID 설정
webpush.setVapidDetails(
    'mailto:admin@example.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
);

export async function POST(request: Request) {
    try {
        const { userId, title, body, url } = await request.json();

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // 사용자의 푸시 구독 정보 조회
        let query = supabase.from('push_subscriptions').select('*');

        if (userId) {
            query = query.eq('user_id', userId);
        }

        const { data: subscriptions, error } = await query;

        if (error) {
            console.error('구독 조회 오류:', error);
            return NextResponse.json({ error: '구독 조회 실패' }, { status: 500 });
        }

        if (!subscriptions || subscriptions.length === 0) {
            return NextResponse.json({ error: '구독 정보 없음' }, { status: 404 });
        }

        // 푸시 알림 발송
        const payload = JSON.stringify({
            title: title || '올프',
            body: body || '새로운 알림이 있습니다.',
            url: url || '/',
        });

        const results = await Promise.allSettled(
            subscriptions.map((sub) =>
                webpush.sendNotification(
                    {
                        endpoint: sub.endpoint,
                        keys: {
                            p256dh: sub.p256dh,
                            auth: sub.auth,
                        },
                    },
                    payload
                )
            )
        );

        const successCount = results.filter((r) => r.status === 'fulfilled').length;
        const failCount = results.filter((r) => r.status === 'rejected').length;

        return NextResponse.json({
            success: true,
            sent: successCount,
            failed: failCount,
        });
    } catch (error) {
        console.error('푸시 발송 오류:', error);
        return NextResponse.json({ error: '서버 오류' }, { status: 500 });
    }
}
