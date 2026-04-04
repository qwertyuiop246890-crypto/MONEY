import React from 'react';
import { Icon } from '../components/Icon';
import { DateController } from '../components/DateController';
import { getCycleRange, parseDate, formatMoney } from '../utils';

export const DashboardView = ({ viewDate, setViewDate, settings, setSettings, transactions, budgets, setSubViewData, setSubViewDate, setView }: any) => {
    const { start: cycleStart, end: cycleEnd } = getCycleRange(viewDate, settings.cycleStartDay);
    const currentTx = transactions.filter((t: any) => {
        const d = parseDate(t.date);
        return d >= cycleStart && d <= cycleEnd;
    });
    const income = currentTx.filter((t: any) => t.type === 'income').reduce((acc: number, c: any) => acc + parseFloat(c.amount), 0);
    const expense = currentTx.filter((t: any) => t.type === 'expense').reduce((acc: number, c: any) => acc + parseFloat(c.amount), 0);
    
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
        </div>
    );
};
