'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import { useAuth } from '@/lib/auth-context';
import { getProductsByIds } from '@/lib/api';
import { getWishlistFromDB } from '@/lib/wishlist';

const WISHLIST_KEY = 'olp_wishlist';

export default function MyPage() {
    const { user, loading, signInWithKakao, signOut } = useAuth();
    const [activeTab, setActiveTab] = useState<'report' | 'notifications' | 'settings'>('report');
    const [notificationEnabled, setNotificationEnabled] = useState(false);
    const [wishlistCount, setWishlistCount] = useState(0);
    const [lowestPriceCount, setLowestPriceCount] = useState(0);

    // 찜 목록 통계 로드
    useEffect(() => {
        const loadWishlistStats = async () => {
            let ids: string[] = [];

            if (user) {
                // 로그인 시: DB에서 로드
                ids = await getWishlistFromDB(user.id);
            } else {
                // 비로그인: localStorage에서 로드
                const saved = localStorage.getItem(WISHLIST_KEY);
                if (saved) {
                    ids = JSON.parse(saved);
                }
            }

            setWishlistCount(ids.length);

            if (ids.length > 0) {
                try {
                    const products = await getProductsByIds(ids);
                    const lowestCount = products.filter(p => p.is_lowest).length;
                    setLowestPriceCount(lowestCount);
                } catch (error) {
                    console.error('찜 목록 통계 로드 오류:', error);
                }
            } else {
                setLowestPriceCount(0);
            }
        };
        loadWishlistStats();

        // 찜 목록 변경 감지
        const handleWishlistChange = () => loadWishlistStats();
        window.addEventListener('wishlist-changed', handleWishlistChange);
        return () => window.removeEventListener('wishlist-changed', handleWishlistChange);
    }, [user]);

    // 푸시 알림 권한 상태 확인
    useEffect(() => {
        if ('Notification' in window) {
            setNotificationEnabled(Notification.permission === 'granted');
        }
    }, []);

    // 푸시 알림 권한 요청 및 구독 등록
    const requestNotificationPermission = async () => {
        if (!('Notification' in window)) {
            alert('이 브라우저는 푸시 알림을 지원하지 않습니다.');
            return;
        }

        const permission = await Notification.requestPermission();
        setNotificationEnabled(permission === 'granted');

        if (permission === 'granted' && user) {
            try {
                // 서비스 워커를 통해 푸시 구독 등록
                const registration = await navigator.serviceWorker.ready;
                const subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(
                        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
                    ) as BufferSource,
                });

                const subscriptionJson = subscription.toJSON();

                // 서버에 구독 정보 저장
                const response = await fetch('/api/push/subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: user.id,
                        subscription: {
                            endpoint: subscriptionJson.endpoint,
                            keys: subscriptionJson.keys,
                        },
                    }),
                });

                if (response.ok) {
                    console.log('푸시 알림 구독 완료!');
                } else {
                    console.error('푸시 구독 저장 실패');
                }
            } catch (error) {
                console.error('푸시 구독 오류:', error);
            }
        } else if (permission === 'granted' && !user) {
            alert('푸시 알림을 받으려면 로그인이 필요합니다.');
        }
    };

    // Base64 URL을 Uint8Array로 변환
    const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
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
    };

    // 로딩 중
    if (loading) {
        return (
            <>
                <header className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 z-40">
                    <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-center">
                        <h1 className="font-medium">마이페이지</h1>
                    </div>
                </header>
                <main className="max-w-lg mx-auto px-4 py-8">
                    <div className="animate-pulse space-y-4">
                        <div className="h-20 bg-gray-200 rounded-xl" />
                        <div className="h-40 bg-gray-200 rounded-xl" />
                    </div>
                </main>
                <BottomNav />
            </>
        );
    }

    // 비로그인 상태
    if (!user) {
        return (
            <>
                <header className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 z-40">
                    <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-center">
                        <h1 className="font-medium">마이페이지</h1>
                    </div>
                </header>
                <main className="max-w-lg mx-auto px-4 py-8">
                    <div className="text-center py-16">
                        <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">로그인이 필요해요</h2>
                        <p className="text-gray-500 mb-8">
                            최저가 알림과 절약 리포트를 확인하려면<br />
                            카카오 계정으로 로그인해주세요.
                        </p>
                        <button
                            onClick={signInWithKakao}
                            className="w-full max-w-xs mx-auto flex items-center justify-center gap-2 py-3 px-6 bg-[#FEE500] text-[#000000] font-medium rounded-xl hover:bg-[#FDD835] transition-colors"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 3C6.477 3 2 6.463 2 10.714c0 2.64 1.733 4.96 4.348 6.273-.157.56-.57 2.04-.654 2.357-.103.392.144.386.302.281.125-.082 1.994-1.351 2.803-1.902.724.103 1.47.157 2.201.157 5.523 0 10-3.463 10-7.714S17.523 3 12 3z" />
                            </svg>
                            카카오로 시작하기
                        </button>
                    </div>
                </main>
                <BottomNav />
            </>
        );
    }

    // 로그인 상태
    return (
        <>
            <header className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 z-40">
                <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-center">
                    <h1 className="font-medium">마이페이지</h1>
                </div>
            </header>

            <main className="max-w-lg mx-auto px-4 py-4 pb-20">
                {/* 프로필 영역 */}
                <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 mb-4">
                    <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-white text-xl font-bold">
                        {user.user_metadata?.name?.[0] || user.email?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1">
                        <p className="font-bold text-gray-900">
                            {user.user_metadata?.name || user.email?.split('@')[0] || '사용자'}
                        </p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                </div>

                {/* 탭 메뉴 */}
                <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-4">
                    <button
                        onClick={() => setActiveTab('report')}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'report'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        📊 리포트
                    </button>
                    <button
                        onClick={() => setActiveTab('notifications')}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'notifications'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        🔔 알림
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'settings'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        ⚙️ 설정
                    </button>
                </div>

                {/* 탭 내용 */}
                {activeTab === 'report' && (
                    <div className="space-y-4">
                        {/* 절약 리포트 */}
                        <div className="p-5 bg-gradient-to-br from-primary to-primary/80 rounded-xl text-white">
                            <h3 className="text-sm font-medium opacity-80 mb-1">이번 달 절약 금액</h3>
                            <p className="text-3xl font-bold mb-4">0원</p>
                            <p className="text-sm opacity-80">
                                최저가로 구매하면 절약 금액이 집계됩니다.
                            </p>
                        </div>

                        {/* 찜 목록 통계 */}
                        <div className="p-4 bg-white rounded-xl border border-gray-100">
                            <h3 className="font-medium text-gray-900 mb-3">📈 찜 목록 현황</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <Link href="/wishlist" className="text-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                    <p className="text-2xl font-bold text-gray-900">{wishlistCount}</p>
                                    <p className="text-xs text-gray-500">찜한 상품</p>
                                </Link>
                                <Link href="/wishlist" className="text-center p-3 bg-accent-coral/10 rounded-lg hover:bg-accent-coral/20 transition-colors">
                                    <p className="text-2xl font-bold text-accent-coral">{lowestPriceCount}</p>
                                    <p className="text-xs text-gray-500">최저가 상품</p>
                                </Link>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'notifications' && (
                    <div className="space-y-4">
                        {/* 알림 설정 */}
                        <div className="p-4 bg-white rounded-xl border border-gray-100">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="font-medium text-gray-900">푸시 알림</h3>
                                    <p className="text-sm text-gray-500">최저가 도달 시 알림을 받아요</p>
                                </div>
                                {notificationEnabled ? (
                                    <button
                                        onClick={requestNotificationPermission}
                                        className="px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full hover:bg-primary/20 transition-colors"
                                    >
                                        재등록
                                    </button>
                                ) : (
                                    <button
                                        onClick={requestNotificationPermission}
                                        className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg"
                                    >
                                        알림 켜기
                                    </button>
                                )}
                            </div>
                            {typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'denied' && (
                                <div className="p-3 bg-red-50 rounded-lg text-sm text-red-600">
                                    ⚠️ 알림이 차단되어 있습니다. 브라우저 설정에서 localhost의 알림을 허용으로 변경해주세요.
                                </div>
                            )}
                        </div>

                        {/* 알림 내역 */}
                        <div className="p-4 bg-white rounded-xl border border-gray-100">
                            <h3 className="font-medium text-gray-900 mb-3">알림 내역</h3>
                            <div className="text-center py-8 text-gray-400">
                                <p className="text-4xl mb-2">🔔</p>
                                <p>아직 알림이 없어요</p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="space-y-4">
                        {/* 계정 관리 */}
                        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                            <h3 className="px-4 py-3 font-medium text-gray-900 border-b border-gray-100">
                                계정 관리
                            </h3>
                            <div className="divide-y divide-gray-100">
                                <button
                                    onClick={signOut}
                                    className="w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    로그아웃
                                </button>
                                <button className="w-full px-4 py-3 text-left text-red-500 hover:bg-gray-50 transition-colors">
                                    회원 탈퇴
                                </button>
                            </div>
                        </div>

                        {/* 앱 정보 */}
                        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                            <h3 className="px-4 py-3 font-medium text-gray-900 border-b border-gray-100">
                                앱 정보
                            </h3>
                            <div className="divide-y divide-gray-100">
                                <div className="px-4 py-3 flex justify-between">
                                    <span className="text-gray-700">버전</span>
                                    <span className="text-gray-500">1.0.0</span>
                                </div>
                                <Link
                                    href="/terms"
                                    className="block px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    이용약관
                                </Link>
                                <Link
                                    href="/privacy"
                                    className="block px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    개인정보처리방침
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            <BottomNav />
        </>
    );
}
