import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
    try {
        const { userId, subscription } = await request.json();

        if (!userId || !subscription) {
            return NextResponse.json(
                { error: 'userId와 subscription이 필요합니다.' },
                { status: 400 }
            );
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

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
            return NextResponse.json(
                { error: '푸시 구독 저장 실패' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('API 오류:', error);
        return NextResponse.json(
            { error: '서버 오류' },
            { status: 500 }
        );
    }
}
