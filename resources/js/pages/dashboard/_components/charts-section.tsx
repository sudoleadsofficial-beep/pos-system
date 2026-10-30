import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Icon from '@/components/ui/icon';

interface SalesTrendPoint {
    date: string;
    fullDate: string;
    total: number;
    cash: number;
    credit: number;
    nag: number;
}

interface TopItemPoint {
    name_en: string;
    name_ur: string;
    amount: number;
    nag: number;
}

interface RecentSalePoint {
    id: number;
    date: string;
    merchant: string;
    merchant_code: number | string;
    item: string;
    nag: number;
    gross: number;
    payment_type: string;
}

interface DashboardChartsProps {
    chartData?: SalesTrendPoint[];
    topItemsChart?: TopItemPoint[];
    recentSales?: RecentSalePoint[];
}

export function DashboardCharts({
    chartData = [],
    topItemsChart = [],
    recentSales = [],
}: DashboardChartsProps) {
    const { i18n } = useTranslation();
    const isUrdu = i18n.language === 'ur';

    // Format tooltip currency
    const formatCurrency = (value: number) => {
        return `Rs. ${Number(value).toLocaleString()}`;
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Main Area Chart: Last 7 Days Sales Trend (Cash vs Credit) */}
            <Card className="lg:col-span-8 shadow-xs border-green-200">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className={`text-base font-bold text-green-950 flex items-center gap-2 ${isUrdu ? 'font-nastaliq' : ''}`}>
                            <Icon name="TrendUp" className="size-5 text-green-700" />
                            <span>{isUrdu ? 'گزشتہ 7 دنوں کی فروخت کا رجحان (نقد بمقابلہ ادھار)' : 'Last 7 Days Sales Trend (Cash vs Credit)'}</span>
                        </CardTitle>
                        <p className={`text-xs text-muted-foreground ${isUrdu ? 'font-nastaliq' : ''}`}>
                            {isUrdu ? 'روزانہ کی کل آمدنی اور سیلز کا چارٹ' : 'Daily gross revenue and transaction flow'}
                        </p>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                        <div className="flex items-center gap-1.5">
                            <span className="size-2.5 rounded-full bg-green-600"></span>
                            <span className="text-gray-600 font-medium">{isUrdu ? 'نقد' : 'Cash'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="size-2.5 rounded-full bg-blue-600"></span>
                            <span className="text-gray-600 font-medium">{isUrdu ? 'ادھار' : 'Credit'}</span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-2">
                    <div className="h-[280px] w-full" dir="ltr">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#16a34a" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorCredit" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontSize: 10, fill: '#6b7280' }}
                                    tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
                                />
                                <Tooltip
                                    formatter={(value: any, name: any) => [
                                        formatCurrency(Number(value)),
                                        name === 'cash' ? (isUrdu ? 'نقد' : 'Cash') : (isUrdu ? 'ادھار' : 'Credit'),
                                    ]}
                                    contentStyle={{
                                        backgroundColor: '#18181b',
                                        borderRadius: '8px',
                                        color: '#ffffff',
                                        fontSize: '12px',
                                        border: 'none',
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="cash"
                                    stroke="#16a34a"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorCash)"
                                    name="cash"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="credit"
                                    stroke="#2563eb"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorCredit)"
                                    name="credit"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Side Bar Chart: Top 5 Selling Items */}
            <Card className="lg:col-span-4 shadow-xs border-green-200">
                <CardHeader className="pb-2">
                    <CardTitle className={`text-base font-bold text-green-950 flex items-center gap-2 ${isUrdu ? 'font-nastaliq' : ''}`}>
                        <Icon name="ChartBar" className="size-5 text-emerald-700" />
                        <span>{isUrdu ? 'زیادہ بکنے والے آئٹمز' : 'Top Selling Items'}</span>
                    </CardTitle>
                    <p className={`text-xs text-muted-foreground ${isUrdu ? 'font-nastaliq' : ''}`}>
                        {isUrdu ? 'آمدنی کے لحاظ سے سب سے اہم سبزیاں' : 'Top items by total gross sales'}
                    </p>
                </CardHeader>
                <CardContent className="pt-2">
                    <div className="h-[280px] w-full" dir="ltr">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                layout="vertical"
                                data={topItemsChart}
                                margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                                <XAxis
                                    type="number"
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontSize: 10, fill: '#6b7280' }}
                                    tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
                                />
                                <YAxis
                                    type="category"
                                    dataKey={isUrdu ? 'name_ur' : 'name_en'}
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontSize: 11, fill: '#374151', fontWeight: 600 }}
                                    width={70}
                                />
                                <Tooltip
                                    formatter={(value: any) => [formatCurrency(Number(value)), isUrdu ? 'کل رقم' : 'Gross Sales']}
                                    contentStyle={{
                                        backgroundColor: '#18181b',
                                        borderRadius: '8px',
                                        color: '#ffffff',
                                        fontSize: '12px',
                                        border: 'none',
                                    }}
                                />
                                <Bar dataKey="amount" fill="#047857" radius={[0, 4, 4, 0]} barSize={18} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Bottom Row: Recent 5 Amroza Sales Feed */}
            {recentSales.length > 0 && (
                <Card className="lg:col-span-12 shadow-xs border-green-200">
                    <CardHeader className="pb-2">
                        <CardTitle className={`text-base font-bold text-green-950 flex items-center gap-2 ${isUrdu ? 'font-nastaliq' : ''}`}>
                            <Icon name="ClockCounterClockwise" className="size-5 text-green-700" />
                            <span>{isUrdu ? 'حالیہ فروخت کا ریکارڈ' : 'Recent Sales Activity'}</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead className="bg-green-50 text-green-900 border-y border-green-200">
                                    <tr>
                                        <th className={`p-2.5 text-start font-semibold ${isUrdu ? 'font-nastaliq' : ''}`}>{isUrdu ? 'تاریخ' : 'Date'}</th>
                                        <th className={`p-2.5 text-start font-semibold ${isUrdu ? 'font-nastaliq' : ''}`}>{isUrdu ? 'طریقہ' : 'Payment'}</th>
                                        <th className={`p-2.5 text-start font-semibold ${isUrdu ? 'font-nastaliq' : ''}`}>{isUrdu ? 'خریدار' : 'Buyer'}</th>
                                        <th className={`p-2.5 text-start font-semibold ${isUrdu ? 'font-nastaliq' : ''}`}>{isUrdu ? 'آئٹم' : 'Item'}</th>
                                        <th className={`p-2.5 text-end font-semibold ${isUrdu ? 'font-nastaliq' : ''}`}>{isUrdu ? 'تعداد' : 'Units'}</th>
                                        <th className={`p-2.5 text-end font-semibold ${isUrdu ? 'font-nastaliq' : ''}`}>{isUrdu ? 'کل رقم' : 'Gross Amount'}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {recentSales.map((sale) => (
                                        <tr key={sale.id} className="hover:bg-green-50/40">
                                            <td className="p-2.5 text-gray-500 font-mono">{sale.date}</td>
                                            <td className="p-2.5">
                                                {sale.payment_type === 'naqdi' ? (
                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-900">
                                                        {isUrdu ? 'نقد' : 'Cash'}
                                                    </span>
                                                ) : (
                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900">
                                                        {isUrdu ? 'ادھار' : 'Credit'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className={`p-2.5 font-semibold text-gray-900 ${isUrdu ? 'font-nastaliq' : ''}`}>
                                                {sale.merchant} <span className="text-[10px] text-gray-400 font-mono">(#{sale.merchant_code})</span>
                                            </td>
                                            <td className={`p-2.5 ${isUrdu ? 'font-nastaliq' : ''}`}>{sale.item}</td>
                                            <td className="p-2.5 text-end font-mono font-bold">{sale.nag}</td>
                                            <td className="p-2.5 text-end font-mono font-bold text-green-900">Rs. {Number(sale.gross).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
