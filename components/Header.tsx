import Link from 'next/link';
import Image from 'next/image';

export default function Header() {
    return (
        <header className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 z-40">
            <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
                {/* 로고 */}
                <Link href="/" className="flex items-center">
                    <Image
                        src="/logo.jpg"
                        alt="All Price"
                        width={100}
                        height={40}
                        className="h-8 w-auto"
                        priority
                    />
                </Link>

                {/* 우측 아이콘 */}
                <div className="flex items-center gap-2">
                    {/* 알림 */}
                    <button className="p-2 text-gray-600 hover:text-primary transition-colors relative">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        {/* 알림 뱃지 */}
                        <span className="absolute top-1 right-1 w-2 h-2 bg-accent-coral rounded-full" />
                    </button>
                </div>
            </div>
        </header>
    );
}

