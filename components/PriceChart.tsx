'use client';

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
} from 'recharts';
import type { PriceHistory } from '@/lib/types';

interface PriceChartProps {
    data: PriceHistory[];
    lowestPrice: number;
}

export default function PriceChart({ data, lowestPrice }: PriceChartProps) {
    // 데이터 포맷
    const chartData = data.map((item) => ({
        date: new Date(item.recorded_at).toLocaleDateString('ko-KR', {
            month: 'short',
            day: 'numeric',
        }),
        price: item.price,
        originalPrice: item.original_price,
    }));

    const formatPrice = (value: number) => {
        if (value >= 10000) {
            return `${(value / 10000).toFixed(1)}만`;
        }
        return value.toLocaleString('ko-KR');
    };

    const minPrice = Math.min(...data.map(d => d.price)) * 0.95;
    const maxPrice = Math.max(...data.map(d => d.price)) * 1.05;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">{label}</p>
                    <p className="text-sm font-bold text-primary">
                        {payload[0].value.toLocaleString('ko-KR')}원
                    </p>
                </div>
            );
        }
        return null;
    };

    if (data.length === 0) {
        return (
            <div className="h-48 flex items-center justify-center text-gray-400">
                <p>가격 이력이 없습니다</p>
            </div>
        );
    }

    return (
        <div className="w-full h-48 min-h-[192px]">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: '#9ca3af' }}
                        axisLine={{ stroke: '#e5e7eb' }}
                        tickLine={false}
                    />
                    <YAxis
                        domain={[minPrice, maxPrice]}
                        tick={{ fontSize: 10, fill: '#9ca3af' }}
                        tickFormatter={formatPrice}
                        axisLine={{ stroke: '#e5e7eb' }}
                        tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />

                    {/* 역대 최저가 라인 */}
                    <ReferenceLine
                        y={lowestPrice}
                        stroke="#FF6B6B"
                        strokeDasharray="5 5"
                        label={{
                            value: '최저가',
                            position: 'right',
                            fontSize: 10,
                            fill: '#FF6B6B',
                        }}
                    />

                    {/* 가격 라인 */}
                    <Line
                        type="monotone"
                        dataKey="price"
                        stroke="#1B7E6B"
                        strokeWidth={2}
                        dot={{ fill: '#1B7E6B', strokeWidth: 0, r: 3 }}
                        activeDot={{ fill: '#1B7E6B', strokeWidth: 0, r: 5 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
