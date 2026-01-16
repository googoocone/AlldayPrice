import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "올프 - 매일매일 가격을 추적해요",
  description: "올리브영 상품의 가격 변동을 추적하고 역대 최저가 알림을 받아보세요.",
  keywords: ["올리브영", "가격비교", "최저가", "세일", "할인", "뷰티"],
  openGraph: {
    title: "올프 - All Day Price",
    description: "올리브영 상품의 가격 변동을 추적하고 역대 최저가 알림을 받아보세요.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1B7E6B",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="antialiased">
        <div className="min-h-screen bg-background pb-16">
          {children}
        </div>
      </body>
    </html>
  );
}
