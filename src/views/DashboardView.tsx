import React from 'react';
import { Icon } from '../components/Icon';
import { DateController } from '../components/DateController';
import { getCycleRange, parseDate, formatMoney } from '../utils';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ffc658', '#ff7300', '#38bdf8', '#fb7185', '#a3e635'];

export const DashboardView = ({ viewDate, setViewDate, settings, setSettings, transactions, budgets, setSubViewData, setSubViewDate, setView }: any) => {
    const { start: cycleStart, end: cycleEnd } = getCycleRange(viewDate, settings.cycleStartDay);
    const currentTx = transactions.filter((t: any) => {
        const d = parseDate(t.date);
        return d >= cycleStart && d <= cycleEnd;
    });
    const income = currentTx.filter((t: any) => t.type === 'income').reduce((acc: number, c: any) => acc + parseFloat(c.amount), 0);
    const expense = currentTx.filter((t: any) => t.type === 'expense').reduce((acc: number, c: any) => acc + parseFloat(c.amount), 0);
    
    // Calculate category expenses for pie chart
    const categoryExpenses: Record<string, number> = {};
    currentTx.filter((t: any) => t.type === 'expense').forEach((t: any) => {
        const cat = t.category || '未分類';
        categoryExpenses[cat] = (categoryExpenses[cat] || 0) + parseFloat(t.amount);
    });
    const pieData = Object.keys(categoryExpenses).map(key => ({
        name: key,
        value: categoryExpenses[key]
    })).sort((a, b) => b.value - a.value);

    // Calculate 6-month trend
    const trendData = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(viewDate);
        d.setMonth(d.getMonth() - i);
        const { start, end } = getCycleRange(d, settings.cycleStartDay);
        
        const monthTx = transactions.filter((t: any) => {
            const txDate = parseDate(t.date);
            return txDate >= start && txDate <= end;
        });

        const mIncome = monthTx.filter((t: any) => t.type === 'income').reduce((acc: number, c: any) => acc + parseFloat(c.amount), 0);
        const mExpense = monthTx.filter((t: any) => t.type === 'expense').reduce((acc: number, c: any) => acc + parseFloat(c.amount), 0);
        
        trendData.push({
            name: `${d.getMonth() + 1}月`,
            收入: mIncome,
            支出: mExpense
        });
    }

    const changeMonth = (delta: number) => {
        const newDate = new Date(viewDate);
        newDate.setMonth(newDate.getMonth() + delta);
        setViewDate(newDate);
    };

    const getInitialDateForCycle = (closingDayParam: any) => {
        const now = new Date();
        const closingDay = parseInt(closingDayParam) || 31;
        if (now.getDate() > closingDay) {
            return new Date(now.getFullYear(), now.getMonth() + 1, 1);
        }
        return now;
    };

    return (
        <div className="space-y-6 mt-4">
            <DateController 
                currentDate={viewDate} onChangeDate={changeMonth} 
                cycleStart={cycleStart} cycleEnd={cycleEnd} 
                cycleDay={settings.cycleStartDay}
                onCycleDayChange={(val: string) => setSettings({...settings, cycleStartDay: parseInt(val)})}
            />
            <section className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-medium text-gray-500 mb-1">週期收入</p>
                    <h3 className="text-2xl font-extrabold text-success">{formatMoney(income)}</h3>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-medium text-gray-500 mb-1">週期支出</p>
                    <h3 className="text-2xl font-extrabold text-danger">{formatMoney(expense)}</h3>
                </div>
            </section>
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-dark">預算概覽</h3>
                    <button onClick={() => { setSubViewDate(getInitialDateForCycle(settings.cycleStartDay)); setView('budgets'); }} className="text-primary text-sm font-bold bg-primary/5 px-3 py-1 rounded-full">管理預算</button>
                </div>
                <div className="space-y-4">
                    {budgets.slice(0, 3).map((b: any) => {
                        const { start: bStart, end: bEnd } = getCycleRange(viewDate, b.resetDay || 1);
                        
                        const used = transactions.filter((t: any) => {
                            return t.budgetId === b.id && t.type === 'expense' && parseDate(t.date) >= bStart && parseDate(t.date) <= bEnd;
                        }).reduce((acc: number, c: any) => acc + parseFloat(c.amount), 0);
                        
                        const percent = Math.min((used / b.limit) * 100, 100);
                        return (
                            <div key={b.id} onClick={() => { setSubViewData(b.id); setSubViewDate(getInitialDateForCycle(b.resetDay)); setView('budgetDetail'); }} className="cursor-pointer group">
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="font-bold group-hover:text-primary transition-colors">{b.name}</span>
                                    <span className="text-xs text-gray-500 font-normal mt-0.5">{formatMoney(used)} / {formatMoney(b.limit)}</span>
                                </div>
                                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mt-1.5 border border-gray-200/50">
                                    <div className={`h-full transition-all duration-500 ${used > b.limit ? 'bg-danger' : 'bg-primary'}`} style={{width: `${percent}%`}}></div>
                                </div>
                            </div>
                        )
                    })}
                    {budgets.length === 0 && <p className="text-gray-400 text-sm text-center py-4 bg-gray-50 rounded-xl">尚未設定預算，前往管理以追蹤支出！</p>}
                </div>
            </section>

            {/* Data Analysis Sections */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-bold text-dark mb-4">支出結構分析</h3>
                {pieData.length > 0 ? (
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => formatMoney(value)} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="text-center py-10 text-gray-400 text-sm bg-gray-50 rounded-xl">本期尚無支出紀錄</div>
                )}
            </section>

            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-bold text-dark mb-4">近六個月收支趨勢</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(value) => value > 0 ? `${value/1000}k` : '0'} />
                            <Tooltip formatter={(value: number) => formatMoney(value)} cursor={{ fill: '#f3f4f6' }} />
                            <Legend wrapperStyle={{ fontSize: '12px' }} />
                            <Bar dataKey="支出" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                            <Bar dataKey="收入" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </section>
        </div>
    );
};
