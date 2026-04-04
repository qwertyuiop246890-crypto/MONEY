import React from 'react';
import { DateController } from '../components/DateController';
import { TransactionItem } from '../components/TransactionItem';
import { getCycleRange, parseDate, formatDate } from '../utils';

export const TransactionsView = ({ subViewDate, setSubViewDate, settings, setSettings, transactions, accounts, paymentMethods, setEditingTx, setTxModalOpen, onDelete }: any) => {
    const { start: cycleStart, end: cycleEnd } = getCycleRange(subViewDate, settings.cycleStartDay);
    const filteredTx = transactions.filter((t: any) => {
        const d = parseDate(t.date);
        return d >= cycleStart && d <= cycleEnd;
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
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 pb-20">
                {sortedDates.map(date => (
                    <div key={date}>
                        <p className="text-xs font-bold text-gray-400 mb-2 ml-1">{date}</p>
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            {groupedTx[date].map((t: any) => {
                                const extendedTx = { ...t, displayNegative: t.type === 'expense', isNeutral: t.type === 'transfer' };
                                return <TransactionItem key={t.id} t={extendedTx} onClick={() => { setEditingTx(t); setTxModalOpen(true); }} onCopy={handleCopy} onDelete={onDelete} accounts={accounts} paymentMethods={paymentMethods} />;
                            })}
                        </div>
                    </div>
                ))}
                {sortedDates.length === 0 && <div className="text-center py-10 text-gray-400">本區間無交易紀錄</div>}
            </div>
        </div>
    );
};
