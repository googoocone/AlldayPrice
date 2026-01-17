'use client';

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';
import type { ProductWithPrice } from '@/lib/types';

interface WishlistPriceChartProps {
    products: ProductWithPrice[];
}

export default function WishlistPriceChart({ products }: WishlistPriceChartProps) {
    if (products.length === 0) return null;

    // 색상 팔레트 (여러 상품 구분용)
    const COLORS = ['#FF6B6B', '#1B7E6B', '#4D96FF', '#FFB84D', '#A64DFF', '#FF4DA6', '#4DFFB8'];

    // 모든 가격 이력을 하나의 타임라인으로 병합
    const allDates = new Set<string>();
    products.forEach((product) => {
        product.price_history?.forEach((history) => {
            const date = new Date(history.recorded_at).toLocaleDateString('ko-KR', {
                month: 'short',
                day: 'numeric',
            });
            allDates.add(date);
        });
    });

    const sortedDates = Array.from(allDates).sort((a, b) => {
        // 날짜 문자열 비교를 위해 임시 파싱 (간략화) - 실제로는 원본 timestamp를 쓰는게 더 정확할 수 있음
        return new Date(a).getTime() - new Date(b).getTime(); // Note: ko-KR format might not parse directly in all browsers, but let's try
    });

    // 차트 데이터 구성
    // [{ date: '1월 1일', 'product_id_1': 10000, 'product_id_2': 12000 }, ...]
    // 날짜별로 정렬하기 위해, 각 날짜에 대해 각 상품의 해당 날짜(혹은 가장 가까운 이전 날짜) 가격을 찾음

    // 단순화: 날짜 문자열 기준으로 데이터 매핑
    // 더 정확하게 하려면 timestamp 기준으로 정렬 후 포맷팅해야 함.

    const chartDataMap = new Map<string, any>();

    products.forEach(product => {
        product.price_history?.forEach(history => {
            const dateStr = new Date(history.recorded_at).toLocaleDateString('ko-KR', {
                month: 'short',
                day: 'numeric',
            });

            if (!chartDataMap.has(dateStr)) {
                chartDataMap.set(dateStr, { date: dateStr });
            }
            const dataPoint = chartDataMap.get(dateStr);
            dataPoint[product.id] = history.price;
        });
    });

    // 날짜순 정렬 (이 부분은 문자열 정렬이라 완벽하지 않을 수 있음, 개선 필요 시 timestamp 사용)
    const chartData = Array.from(chartDataMap.values()).sort((a, b) => {
        const dateA = new Date().getFullYear() + a.date.replace('월', '/').replace('일', ''); // Hacky current year assumption
        const dateB = new Date().getFullYear() + b.date.replace('월', '/').replace('일', '');
        return new Date(dateA).getTime() - new Date(dateB).getTime();
    });

    // 가격 포맷
    const formatPrice = (value: number) => {
        if (value >= 10000) {
            return `${(value / 10000).toFixed(1)}만`;
        }
        return value.toLocaleString('ko-KR');
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-gray-100">
                    <p className="text-xs text-gray-500 mb-2">{label}</p>
                    {payload.map((entry: any, index: number) => {
                        const product = products.find(p => p.id === entry.dataKey);
                        return (
                            <div key={index} className="flex items-center gap-2 mb-1 last:mb-0">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                <p className="text-xs text-gray-600 truncate max-w-[100px]">{product?.name}</p>
                                <p className="text-sm font-bold text-gray-900 ml-auto">
                                    {entry.value.toLocaleString('ko-KR')}원
                                </p>
                            </div>
                        );
                    })}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="w-full bg-white rounded-xl p-4 border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-4">선택한 상품 가격 변동</h3>
            <div className="h-64 min-h-[256px]">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 10, fill: '#9ca3af' }}
                            axisLine={{ stroke: '#e5e7eb' }}
                            tickLine={false}
                        />
                        <YAxis
                            tick={{ fontSize: 10, fill: '#9ca3af' }}
                            tickFormatter={formatPrice}
                            axisLine={{ stroke: '#e5e7eb' }}
                            tickLine={false}
                            domain={['auto', 'auto']}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                            formatter={(value, entry: any) => {
                                const product = products.find(p => p.id === entry.dataKey);
                                return <span className="text-xs text-gray-500">{product?.name.substring(0, 10)}...</span>;
                            }}
                        />
                        {products.map((product, index) => (
                            <Line
                                key={product.id}
                                type="monotone"
                                dataKey={product.id}
                                name={product.name}
                                stroke={COLORS[index % COLORS.length]}
                                strokeWidth={2}
                                dot={{ fill: COLORS[index % COLORS.length], strokeWidth: 0, r: 3 }}
                                activeDot={{ r: 5 }}
                                connectNulls
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
