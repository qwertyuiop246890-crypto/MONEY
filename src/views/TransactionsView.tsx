import React, { useState } from 'react';
import { DateController } from '../components/DateController';
import { TransactionItem } from '../components/TransactionItem';
import { Icon } from '../components/Icon';
import { getCycleRange, parseDate, formatDate, formatMoney } from '../utils';

export const TransactionsView = ({ subViewDate, setSubViewDate, settings, setSettings, transactions, accounts, paymentMethods, categories, setEditingTx, setTxModalOpen, onDelete }: any) => {
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [filterMin, setFilterMin] = useState('');
    const [filterMax, setFilterMax] = useState('');
    const [filterType, setFilterType] = useState('all');

    const { start: cycleStart, end: cycleEnd } = getCycleRange(subViewDate, settings.cycleStartDay);
    
    const filteredTx = transactions.filter((t: any) => {
        const d = parseDate(t.date);
        const inMonth = d >= cycleStart && d <= cycleEnd;
        if (!inMonth) return false;

        if (filterType !== 'all' && t.type !== filterType) return false;
        if (filterMin && Number(t.amount) < Number(filterMin)) return false;
        if (filterMax && Number(t.amount) > Number(filterMax)) return false;

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const matchPayee = t.payee?.toLowerCase().includes(q);
            const matchNote = t.note?.toLowerCase().includes(q);
            const matchCat = t.category?.toLowerCase().includes(q);
            const matchSub = t.subcategory?.toLowerCase().includes(q);
            if (!matchPayee && !matchNote && !matchCat && !matchSub) return false;
        }

        return true;
    });
    
    const groupedTx = filteredTx.reduce((acc: any, tx: any) => { (acc[tx.date] = acc[tx.date] || []).push(tx); return acc; }, {});

    const changeMonth = (delta: number) => {
        const newDate = new Date(subViewDate);
        newDate.setMonth(newDate.getMonth() + delta);
        setSubViewDate(newDate);
    };

    const handleCopy = (t: any) => {
        const { id, ...rest } = t;
        setEditingTx({ ...rest, date: formatDate(new Date()) });
        setTxModalOpen(true);
    };

    const sortedDates = Object.keys(groupedTx).sort((a,b)=>b.localeCompare(a));

    // Calendar Logic
    const renderCalendar = () => {
        const d = new Date(subViewDate);
        const year = d.getFullYear();
        const month = d.getMonth();
        
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfWeek = new Date(year, month, 1).getDay();
        
        const calendarDays = [];
        for (let i = 0; i < firstDayOfWeek; i++) calendarDays.push(null);
        for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

        const txByDay: Record<number, { exp: number, inc: number }> = {};
        filteredTx.forEach((t: any) => {
            const txDate = new Date(t.date);
            if (txDate.getMonth() === month && txDate.getFullYear() === year) {
                const day = txDate.getDate();
                if (!txByDay[day]) txByDay[day] = { exp: 0, inc: 0 };
                if (t.type === 'expense') txByDay[day].exp += Number(t.amount);
                if (t.type === 'income') txByDay[day].inc += Number(t.amount);
            }
        });

        return (
            <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                    {['日', '一', '二', '三', '四', '五', '六'].map(day => (
                        <div key={day} className="text-[10px] text-gray-400 font-bold">{day}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((day, idx) => (
                        <div key={idx} className={`min-h-[60px] p-1 border rounded-lg flex flex-col ${day ? 'bg-gray-50/50 border-gray-100' : 'bg-transparent border-transparent'}`}>
                            {day && (
                                <>
                                    <span className="text-[10px] font-bold text-gray-600">{day}</span>
                                    <div className="mt-auto space-y-0.5">
                                        {txByDay[day]?.inc > 0 && <div className="text-[9px] text-success font-bold text-right truncate">+{txByDay[day].inc}</div>}
                                        {txByDay[day]?.exp > 0 && <div className="text-[9px] text-danger font-bold text-right truncate">-{txByDay[day].exp}</div>}
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-4 h-full flex flex-col">
            <div className="flex flex-col gap-2 sm:gap-3 shrink-0">
                 <div className="flex justify-between items-center px-1">
                    <h2 className="text-xl sm:text-2xl font-black text-dark tracking-tight">交易明細</h2>
                 </div>
                 <DateController 
                    currentDate={subViewDate} onChangeDate={changeMonth} 
                    cycleStart={cycleStart} cycleEnd={cycleEnd} 
                    cycleDay={settings.cycleStartDay}
                    onCycleDayChange={(val: string) => setSettings({...settings, cycleStartDay: parseInt(val)})}
                />
                
                {/* Search and Filters Toolbar */}
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size="text-lg" />
                        <input 
                            type="text" 
                            placeholder="搜尋分類、備註、對象..." 
                            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-primary outline-none shadow-sm"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button onClick={() => setShowFilters(!showFilters)} className={`p-2 rounded-xl border transition-colors shadow-sm ${showFilters || filterMin || filterMax || filterType !== 'all' ? 'bg-primary/10 border-primary text-primary' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                        <Icon name="tune" />
                    </button>
                    <div className="flex bg-gray-200 rounded-xl p-1 shrink-0 shadow-inner">
                        <button onClick={() => setViewMode('list')} className={`px-3 py-1 text-sm font-bold rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><Icon name="list" size="text-sm"/></button>
                        <button onClick={() => setViewMode('calendar')} className={`px-3 py-1 text-sm font-bold rounded-lg transition-all ${viewMode === 'calendar' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><Icon name="calendar_month" size="text-sm"/></button>
                    </div>
                </div>

                {/* Filter Panel */}
                {showFilters && (
                    <div className="bg-white p-3 rounded-xl border border-gray-200 space-y-3 shadow-sm animate-fade-in">
                        <div className="flex gap-2">
                            <select value={filterType} onChange={e => setFilterType(e.target.value)} className="flex-1 p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary">
                                <option value="all">全部類型</option>
                                <option value="expense">支出</option>
                                <option value="income">收入</option>
                            </select>
                            <input type="number" placeholder="最小金額" value={filterMin} onChange={e => setFilterMin(e.target.value)} className="flex-1 p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary" />
                            <span className="self-center text-gray-400">-</span>
                            <input type="number" placeholder="最大金額" value={filterMax} onChange={e => setFilterMax(e.target.value)} className="flex-1 p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary" />
                        </div>
                        <div className="flex justify-end">
                            <button onClick={() => { setFilterType('all'); setFilterMin(''); setFilterMax(''); setSearchQuery(''); }} className="text-xs font-bold text-gray-500 hover:text-dark px-2 py-1 bg-gray-100 rounded-md">清除篩選</button>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pb-20">
                {viewMode === 'calendar' ? (
                    renderCalendar()
                ) : (
                    <>
                        {sortedDates.map(date => {
                            const dailyIncome = groupedTx[date].filter((t: any) => t.type === 'income').reduce((acc: number, t: any) => acc + Number(t.amount), 0);
                            const dailyExpense = groupedTx[date].filter((t: any) => t.type === 'expense').reduce((acc: number, t: any) => acc + Number(t.amount), 0);
                            
                            return (
                                <div key={date}>
                                    <div className="flex justify-between items-end mb-2 ml-1 mr-1">
                                        <p className="text-xs font-bold text-gray-400">{date}</p>
                                        <div className="flex gap-3 text-[10px] font-bold">
                                            {dailyIncome > 0 && <span className="text-success bg-success/10 px-1.5 py-0.5 rounded">收入 {formatMoney(dailyIncome)}</span>}
                                            {dailyExpense > 0 && <span className="text-danger bg-danger/10 px-1.5 py-0.5 rounded">支出 {formatMoney(dailyExpense)}</span>}
                                        </div>
                                    </div>
                                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                        {groupedTx[date].map((t: any) => {
                                            const extendedTx = { ...t, displayNegative: t.type === 'expense', isNeutral: t.type === 'transfer' };
                                            return <TransactionItem key={t.id} t={extendedTx} onClick={() => { setEditingTx(t); setTxModalOpen(true); }} onCopy={handleCopy} onDelete={onDelete} accounts={accounts} paymentMethods={paymentMethods} categories={categories} />;
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                        {sortedDates.length === 0 && <div className="text-center py-10 text-gray-400">本區間無符合的交易紀錄</div>}
                    </>
                )}
            </div>
        </div>
    );
};
