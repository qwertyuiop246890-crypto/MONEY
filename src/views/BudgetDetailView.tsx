import React from 'react';
import { Icon } from '../components/Icon';
import { DateController } from '../components/DateController';
import { TransactionItem } from '../components/TransactionItem';
import { getCycleRange, parseDate, formatMoney, formatDate } from '../utils';

export const BudgetDetailView = ({ budgets, transactions, accounts, paymentMethods, categories, subViewData, subViewDate, setSubViewDate, setView, setEditingTx, setTxModalOpen, onDelete }: any) => {
    const bud = budgets.find((b: any) => String(b.id) === String(subViewData));
    const { start: bCycleStart, end: bCycleEnd } = getCycleRange(subViewDate, bud?.resetDay || 31);
    
    const bTx = transactions.filter((t: any) => {
        return t.budgetId === subViewData && t.type === 'expense' && parseDate(t.date) >= bCycleStart && parseDate(t.date) <= bCycleEnd;
    }).sort((a: any, b: any) => b.date.localeCompare(a.date));
    
    const combinedBreakdown = bTx.reduce((acc_map: any, t: any) => {
        const catName = t.category || '未分類';
        const account = accounts.find((a: any) => a.id === t.accountId);
        const isCredit = account?.type === 'credit';
        
        if (!acc_map[catName]) {
            acc_map[catName] = { total: 0, credit: 0, cash: 0 };
        }
        
        const amt = Number(t.amount);
        acc_map[catName].total += amt;
        if (isCredit) {
            acc_map[catName].credit += amt;
        } else {
            acc_map[catName].cash += amt;
        }
        
        return acc_map;
    }, {});
    const breakdownArr = Object.entries(combinedBreakdown).map(([cat, data]: any) => ({cat, ...data})).sort((a: any, b: any) => b.total - a.total);

    let totalBudgetCredit = 0;
    let totalBudgetCash = 0;
    breakdownArr.forEach((b: any) => {
        totalBudgetCredit += b.credit;
        totalBudgetCash += b.cash;
    });

    const changeBudgetMonth = (delta: number) => {
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
           <div className="flex items-center justify-between mb-4 shrink-0">
               <button onClick={() => setView('dashboard')} className="text-primary font-bold flex items-center gap-1"><Icon name="arrow_back"/> 返回</button>
               <h2 className="text-xl font-bold truncate">{bud?.name}</h2>
               <div className="w-16"></div>
           </div>
           
           <div className="mb-4 shrink-0">
                <DateController 
                   currentDate={subViewDate} onChangeDate={changeBudgetMonth} 
                   cycleStart={bCycleStart} cycleEnd={bCycleEnd} 
                   isCreditCard={true} 
                   creditCardInfo={`結算日: 每月 ${bud?.resetDay || 31} 號`}
               />
           </div>
           
           <div className="flex-1 overflow-y-auto space-y-4 pb-20">
               <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                   <div className="flex justify-between items-center mb-4">
                       <h3 className="text-sm font-bold text-gray-500 flex items-center gap-2"><Icon name="analytics" size="text-lg"/> 分類與支付方式分析</h3>
                       <div className="flex gap-2 text-[10px] font-bold">
                           <span className="flex items-center gap-1 text-orange-600 bg-orange-50 border border-orange-100 px-2 py-1 rounded"><Icon name="credit_card" size="text-[12px]"/> {formatMoney(totalBudgetCredit)}</span>
                           <span className="flex items-center gap-1 text-blue-600 bg-blue-50 border border-blue-100 px-2 py-1 rounded"><Icon name="payments" size="text-[12px]"/> {formatMoney(totalBudgetCash)}</span>
                       </div>
                   </div>
                   <div className="space-y-4">
                       {breakdownArr.map((b: any, idx: number) => {
                           const maxAmt = breakdownArr[0]?.total || 1;
                           const totalPercent = (b.total / maxAmt) * 100;
                           const creditPercent = b.total > 0 ? (b.credit / b.total) * 100 : 0;
                           const cashPercent = b.total > 0 ? (b.cash / b.total) * 100 : 0;

                           return (
                               <div key={b.cat} className="flex flex-col gap-1.5 p-3 bg-gray-50 rounded-lg">
                                   <div className="flex justify-between items-center text-sm">
                                       <span className="font-bold text-dark">{b.cat}</span>
                                       <span className="font-bold text-danger">{formatMoney(b.total)}</span>
                                   </div>
                                   
                                   <div className="flex h-1.5 rounded-full overflow-hidden w-full bg-gray-200">
                                       {b.credit > 0 && <div className="bg-orange-400" style={{ width: `${creditPercent}%` }}></div>}
                                       {b.cash > 0 && <div className="bg-blue-400" style={{ width: `${cashPercent}%` }}></div>}
                                   </div>
                                   
                                   <div className="flex justify-between text-[10px] text-gray-500 font-bold mt-0.5">
                                       <span className="flex items-center gap-1">
                                           <span className={`w-2 h-2 rounded-sm ${b.credit > 0 ? 'bg-orange-400' : 'bg-gray-300'}`}></span> 
                                           刷卡 {formatMoney(b.credit)}
                                       </span>
                                       <span className="flex items-center gap-1">
                                           <span className={`w-2 h-2 rounded-sm ${b.cash > 0 ? 'bg-blue-400' : 'bg-gray-300'}`}></span> 
                                           現金 {formatMoney(b.cash)}
                                       </span>
                                   </div>
                               </div>
                           );
                       })}
                       {breakdownArr.length === 0 && <div className="text-xs text-gray-400 text-center py-2">無花費統計</div>}
                   </div>
               </div>

               <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                   <h3 className="text-sm font-bold p-4 pb-2 text-gray-500 border-b border-gray-50">套用此預算之交易明細</h3>
                   {bTx.length > 0 ? bTx.map((t: any) => {
                       return <TransactionItem key={t.id} t={{...t, displayNegative: true}} accounts={accounts} paymentMethods={paymentMethods} categories={categories} onClick={() => { setEditingTx(t); setTxModalOpen(true); }} onCopy={handleCopy} onDelete={onDelete} />;
                   }) : <div className="p-8 text-center text-gray-400">本預算週期段無支出紀錄</div>}
               </div>
           </div>
        </div>
    );
};
