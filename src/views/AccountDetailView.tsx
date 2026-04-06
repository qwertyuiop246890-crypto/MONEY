import React from 'react';
import { Icon } from '../components/Icon';
import { DateController } from '../components/DateController';
import { TransactionItem } from '../components/TransactionItem';
import { getAccountDetailRange, parseDate, formatDate } from '../utils';

export const AccountDetailView = ({ accounts, transactions, paymentMethods, categories, subViewData, subViewDate, setSubViewDate, settings, setAccounts, setView, setEditingTx, setTxModalOpen, onDelete }: any) => {
    const acc = accounts.find((a: any) => String(a.id) === String(subViewData));
    const { start: accStart, end: accEnd } = getAccountDetailRange(subViewDate, acc, settings.cycleStartDay);
    
    const accTx = transactions.filter((t: any) => {
        const d = parseDate(t.date);
        return (t.accountId === subViewData || t.toAccountId === subViewData) && d >= accStart && d <= accEnd;
    }).sort((a: any, b: any) => b.date.localeCompare(a.date));

    let periodTotal = 0;
    accTx.forEach((t: any) => {
        if (t.accountId === acc.id) {
            if (t.type === 'income') periodTotal += Number(t.amount);
            else if (t.type === 'expense' || t.type === 'transfer') periodTotal -= Number(t.amount);
        }
        if (t.toAccountId === acc.id && t.type === 'transfer') periodTotal += Number(t.amount);
    });

    const changeDetailMonth = (delta: number) => {
        const newDate = new Date(subViewDate);
        newDate.setMonth(newDate.getMonth() + delta);
        setSubViewDate(newDate);
    };

    const handleCopy = (t: any) => {
        const { id, ...rest } = t;
        setEditingTx({ ...rest, date: formatDate(new Date()) });
        setTxModalOpen(true);
    };

    return (
       <div className="h-full flex flex-col">
           <div className="flex items-center justify-between mb-4">
               <button onClick={() => setView('accounts')} className="text-primary font-bold flex items-center gap-1"><Icon name="arrow_back"/> 返回</button>
               <h2 className="text-xl font-bold truncate max-w-[150px]">{acc?.name}</h2>
               <div className="w-16"></div>
           </div>
           
           <div className="mb-4">
               <DateController 
                   currentDate={subViewDate} onChangeDate={changeDetailMonth} 
                   cycleStart={accStart} cycleEnd={accEnd} 
                   isCreditCard={acc?.type === 'credit'}
                   creditCardInfo={acc?.statementDate ? `結帳日: 每月 ${acc.statementDate} 號` : null}
                   cycleDay={acc?.cycleStartDay || settings.cycleStartDay}
                   onCycleDayChange={(val: string) => {
                       const newVal = parseInt(val);
                       const updatedAccounts = accounts.map((a: any) => a.id === acc.id ? {...a, cycleStartDay: newVal} : a);
                       setAccounts(updatedAccounts);
                   }}
                   showTotal={true} periodTotal={periodTotal}
               />
           </div>

           <div className="flex-1 overflow-y-auto bg-white rounded-xl shadow-sm border border-gray-100 pb-20">
               {accTx.length > 0 ? accTx.map((t: any) => {
                   const isSpending = t.type === 'expense' || (t.type === 'transfer' && t.accountId === acc.id);
                   const extendedTx = { ...t, displayNegative: isSpending, isNeutral: false };
                   return <TransactionItem key={t.id} t={extendedTx} accounts={accounts} paymentMethods={paymentMethods} categories={categories} onClick={() => { setEditingTx(t); setTxModalOpen(true); }} onCopy={handleCopy} onDelete={onDelete} />;
               }) : <div className="p-8 text-center text-gray-400">本週期無交易紀錄</div>}
           </div>
       </div>
   );
};
