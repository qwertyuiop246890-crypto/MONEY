import React, { useMemo, useEffect } from 'react';
import { Icon } from '../components/Icon';
import { DateController } from '../components/DateController';
import { TransactionItem } from '../components/TransactionItem';
import { getCycleRange, getAccountDetailRange, parseDate, formatMoney, formatDate } from '../utils';

export const ReconcileView = ({ accounts, transactions, paymentMethods, categories, subViewData, setSubViewData, subViewDate, setSubViewDate, defaultClosingDay, setView, onToggleReconcile, setEditingTx, setTxModalOpen, onDelete }: any) => {
    const creditAccounts = useMemo(() => accounts.filter((a: any) => a.type === 'credit'), [accounts]);
    const targetAccountId = subViewData; 
    const isAllCards = targetAccountId === 'all';
    
    useEffect(() => {
        if (creditAccounts.length > 0 && targetAccountId !== 'all' && (!targetAccountId || !creditAccounts.find((a: any) => String(a.id) === String(targetAccountId)))) {
            setSubViewData(creditAccounts[0].id);
        }
    }, [creditAccounts, targetAccountId, setSubViewData]);

    if (creditAccounts.length === 0) {
        return (
            <div className="h-full flex flex-col">
                    <div className="flex items-center gap-2 mb-4 shrink-0">
                    <button onClick={() => setView('menu')}><Icon name="arrow_back" /></button>
                    <h2 className="text-xl font-bold">對帳中心</h2>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-60">
                    <div className="bg-gray-100 p-6 rounded-full mb-4"><Icon name="credit_card_off" size="text-4xl text-gray-400" /></div>
                    <h3 className="text-lg font-bold text-dark mb-2">無信用卡帳戶</h3>
                    <p className="text-gray-500 text-sm">此功能僅供信用卡對帳使用。<br/>請先至帳戶管理新增信用卡。</p>
                </div>
            </div>
        );
    }

    let accStart, accEnd, accTx;
    const acc = isAllCards ? null : (creditAccounts.find((a: any) => String(a.id) === String(targetAccountId)) || creditAccounts[0]);

    if (isAllCards) {
        const range = getCycleRange(subViewDate, defaultClosingDay || 31);
        accStart = range.start; accEnd = range.end;
        accTx = transactions.filter((t: any) => {
            const d = parseDate(t.date);
            const account = accounts.find((a: any) => a.id === t.accountId);
            const toAccount = accounts.find((a: any) => a.id === t.toAccountId);
            const isCreditRelated = (account?.type === 'credit') || (toAccount?.type === 'credit');
            return isCreditRelated && d >= accStart && d <= accEnd;
        }).sort((a: any, b: any) => b.date.localeCompare(a.date));
    } else {
        const range = getAccountDetailRange(subViewDate, acc, defaultClosingDay);
        accStart = range.start; accEnd = range.end;
        accTx = transactions.filter((t: any) => {
            const d = parseDate(t.date);
            return (t.accountId === acc.id || t.toAccountId === acc.id) && d >= accStart && d <= accEnd;
        }).sort((a: any, b: any) => b.date.localeCompare(a.date));
    }

    const reconciledStats = accTx.reduce((accStat: any, t: any) => {
        const tAccId = t.accountId; const tToAccId = t.toAccountId;
        const accType = accounts.find((a: any) => a.id === tAccId)?.type;
        const toAccType = accounts.find((a: any) => a.id === tToAccId)?.type;
        
        const isRelevantExpense = isAllCards 
            ? (t.type === 'expense' && accType === 'credit') || (t.type === 'transfer' && accType === 'credit')
            : (t.type === 'expense' && tAccId === acc.id) || (t.type === 'transfer' && tAccId === acc.id);
        
        const isRelevantPayment = isAllCards
            ? (t.type === 'income' && accType === 'credit') || (t.type === 'transfer' && toAccType === 'credit')
            : (t.type === 'income' && tAccId === acc.id) || (t.type === 'transfer' && tToAccId === acc.id);

        if (t.reconciled) {
            let amount = Number(t.amount);
            if (isRelevantExpense) accStat.spending += amount;
            if (isRelevantPayment) accStat.payment += amount;
        }
        return accStat;
    }, { spending: 0, payment: 0 });

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

    const unpaidTotal = reconciledStats.spending - reconciledStats.payment;

    return (
        <div className="h-full flex flex-col relative">
            <div className="flex items-center gap-2 mb-4 shrink-0">
                <button onClick={() => setView('menu')}><Icon name="arrow_back" /></button>
                <h2 className="text-xl font-bold">對帳中心</h2>
            </div>

            <div className="space-y-3 mb-4 shrink-0">
                <div className="relative">
                    <Icon name="credit_card" className="absolute left-3 top-1/2 -translate-y-1/2 text-primary" size="text-xl" />
                    <select className="w-full p-3 pl-10 bg-white border border-gray-200 rounded-xl font-bold text-dark focus:ring-1 focus:ring-primary outline-none appearance-none" value={subViewData || ''} onChange={e => setSubViewData(e.target.value === 'all' ? 'all' : e.target.value)}>
                        <option value="all">所有信用卡合計</option>
                        {creditAccounts.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <Icon name="expand_more" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size="text-xl" />
                </div>

                <DateController 
                    currentDate={subViewDate} onChangeDate={changeMonth} 
                    cycleStart={accStart} cycleEnd={accEnd} 
                    isCreditCard={true}
                    creditCardInfo={isAllCards ? "所有信用卡帳務" : (acc?.statementDate ? `結帳日: 每月 ${acc.statementDate} 號` : null)}
                />
            </div>

            <div className="flex-1 overflow-y-auto bg-white rounded-xl shadow-sm border border-gray-100 pb-40">
                    {accTx.length > 0 ? accTx.map((t: any) => {
                        const isSpending = isAllCards 
                            ? t.type === 'expense' || (t.type === 'transfer' && accounts.find((a: any)=>a.id===t.accountId)?.type === 'credit')
                            : t.type === 'expense' || (t.type === 'transfer' && t.accountId === acc.id);
                        const extendedTx = { ...t, displayNegative: isSpending, onToggleReconcile };
                        return <TransactionItem key={t.id} t={extendedTx} accounts={accounts} paymentMethods={paymentMethods} categories={categories} showAccountBadge={isAllCards} onClick={() => { setEditingTx(t); setTxModalOpen(true); }} onCopy={handleCopy} onDelete={onDelete} />;
                    }) : <div className="p-8 text-center text-gray-400">本週期無交易紀錄</div>}
            </div>

            <div className="fixed bottom-[90px] left-4 right-4 bg-white/95 backdrop-blur p-3 rounded-2xl shadow-[0_5px_20px_rgba(0,0,0,0.1)] border border-gray-100 z-30 flex justify-between items-center transition-transform">
                <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-400 w-8">消費</span>
                        <span className="font-bold text-danger">{formatMoney(reconciledStats.spending)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-400 w-8">繳款</span>
                        <span className="font-bold text-success">{formatMoney(reconciledStats.payment)}</span>
                    </div>
                </div>
                <div className="h-8 w-px bg-gray-100 mx-1"></div>
                <div className="text-right">
                    <div className="text-[10px] text-gray-400 mb-0.5">未繳總額</div>
                    <div className={`text-xl font-black ${unpaidTotal > 0 ? 'text-dark' : 'text-success'}`}>{formatMoney(unpaidTotal)}</div>
                </div>
            </div>
        </div>
    );
};
