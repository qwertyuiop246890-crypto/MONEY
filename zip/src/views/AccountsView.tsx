import React, { useState } from 'react';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import { formatDate, formatMoney, generateId } from '../utils';

export const AccountsView = ({ accounts, setAccounts, transactions, setTransactions, settings, setSettings, setSubViewData, setSubViewDate, setView, showConfirm, setEditingTx, setTxModalOpen }: any) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editAcc, setEditAcc] = useState<any>(null);
    
    const getAccountStyle = (type: string) => {
        switch (type) {
            case 'credit': return { border: 'border-orange-500', badge: 'bg-orange-100 text-orange-600', icon: 'credit_card', label: '信用卡' };
            case 'bank': return { border: 'border-blue-500', badge: 'bg-blue-100 text-blue-600', icon: 'account_balance', label: '銀行' };
            default: return { border: 'border-primary', badge: 'bg-primary/10 text-primary', icon: 'account_balance_wallet', label: '現金錢包' };
        }
    };

    const accountGroups: any = {
        general: { label: '銀行/現金帳戶', items: accounts.filter((a: any) => a.type === 'bank' || a.type === 'cash'), icon: 'account_balance' },
        credit: { label: '信用卡', items: accounts.filter((a: any) => a.type === 'credit'), icon: 'credit_card' }
    };

    const toggleGroupOrder = () => {
        const currentOrder = settings.accountGroupOrder || ['general', 'credit'];
        const newOrder = [currentOrder[1], currentOrder[0]];
        setSettings({...settings, accountGroupOrder: newOrder});
    };

    const groupOrder = settings.accountGroupOrder || ['general', 'credit'];

    const calculateAccountBalance = (account: any) => {
        const now = new Date();
        const todayStr = formatDate(now);
        let balance = Number(account.balance) || 0;
        
        transactions.forEach((t: any) => {
            if (t.date > todayStr) return;
            const amt = Number(t.amount);
            if (t.accountId === account.id) {
                if (t.type === 'expense') balance -= amt;
                else if (t.type === 'income') balance += amt; 
                else if (t.type === 'transfer') balance -= amt;
            }
            if (t.toAccountId === account.id && t.type === 'transfer') {
                balance += amt;
            }
        });
        return balance;
    };

    const moveAccount = (id: string, direction: 'up' | 'down') => {
        const account = accounts.find((a: any) => a.id === id);
        if (!account) return;

        // Only swap within the same group to ensure immediate visual feedback
        const isCredit = account.type === 'credit';
        const groupItems = accounts.filter((a: any) => isCredit ? a.type === 'credit' : (a.type === 'bank' || a.type === 'cash'));
        const indexInGroup = groupItems.findIndex((a: any) => a.id === id);

        if (direction === 'up' && indexInGroup > 0) {
            const targetAccount = groupItems[indexInGroup - 1];
            const newAccounts = [...accounts];
            const idx1 = newAccounts.findIndex(a => a.id === id);
            const idx2 = newAccounts.findIndex(a => a.id === targetAccount.id);
            [newAccounts[idx1], newAccounts[idx2]] = [newAccounts[idx2], newAccounts[idx1]];
            setAccounts(newAccounts);
        } else if (direction === 'down' && indexInGroup < groupItems.length - 1) {
            const targetAccount = groupItems[indexInGroup + 1];
            const newAccounts = [...accounts];
            const idx1 = newAccounts.findIndex(a => a.id === id);
            const idx2 = newAccounts.findIndex(a => a.id === targetAccount.id);
            [newAccounts[idx1], newAccounts[idx2]] = [newAccounts[idx2], newAccounts[idx1]];
            setAccounts(newAccounts);
        }
    };

    const handleDeleteAccount = (id: string) => {
        showConfirm('刪除帳戶', `將刪除相關交易，確定嗎？`, () => {
            setAccounts((prev: any) => prev.filter((a: any) => a.id !== id));
            setTransactions((prev: any) => prev.filter((t: any) => t.accountId !== id && t.toAccountId !== id));
        });
    };

    const handleSaveAccount = (acc: any) => {
        const accData = {
            ...acc,
            balance: Number(acc.balance),
            creditLimit: acc.creditLimit ? Number(acc.creditLimit) : "",
            statementDate: acc.statementDate ? Number(acc.statementDate) : "",
            dueDate: acc.dueDate ? Number(acc.dueDate) : "",
            cycleStartDay: acc.cycleStartDay ? Number(acc.cycleStartDay) : 31,
            startDate: acc.startDate || formatDate(new Date()) 
        };
        if (accData.id) setAccounts((prev: any) => prev.map((a: any) => a.id === accData.id ? accData : a));
        else { accData.id = generateId(); setAccounts((prev: any) => [...prev, accData]); }
    };

    const getInitialDateForCycle = (closingDayParam: any) => {
        const now = new Date();
        const closingDay = parseInt(closingDayParam) || 31;
        if (now.getDate() > closingDay) {
            return new Date(now.getFullYear(), now.getMonth() + 1, 1);
        }
        return now;
    };

    const handlePayCreditCard = (e: any, acc: any) => {
        e.stopPropagation();
        const lastSourceId = settings.lastPaymentSources?.[acc.id];
        const lastSource = lastSourceId ? accounts.find((a: any) => a.id === lastSourceId) : null;
        const defaultSource = lastSource || accounts.find((a: any) => a.type !== 'credit' && a.id !== acc.id) || accounts[0];
        setEditingTx({
            date: formatDate(new Date()),
            type: 'transfer',
            amount: Math.abs(calculateAccountBalance(acc)),
            accountId: defaultSource.id,
            toAccountId: acc.id,
            payee: `繳款: ${acc.name}`,
            note: '信用卡繳款',
            paymentMethodId: ''
        });
        setTxModalOpen(true);
    };

    return (
        <div className="flex flex-col gap-6 px-2 md:px-4 pb-10">
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-dark text-2xl font-black tracking-tight">帳戶總覽 <span className="text-xs text-gray-400 ml-1 font-normal">(資金來源)</span></h2>
                
                <div className="flex items-center gap-2">
                    <button onClick={toggleGroupOrder} className="text-gray-400 hover:text-primary p-2 bg-white rounded-full shadow-sm border border-gray-100"><Icon name="swap_vert" size="text-xl" /></button>
                    <button onClick={() => { setEditAcc({ startDate: formatDate(new Date()) }); setIsModalOpen(true); }} className="text-primary hover:scale-110 transition-transform"><Icon name="add_circle" size="text-3xl" /></button>
                </div>
            </div>
            <div className="space-y-6">
                {groupOrder.map((groupKey: string) => {
                    const group = accountGroups[groupKey];
                    if (!group || group.items.length === 0) return null;
                    
                    return (
                        <div key={groupKey}>
                            <div className="flex items-center gap-2 mb-3">
                                <Icon name={group.icon} className="text-primary"/>
                                <h3 className="text-lg font-bold text-dark">{group.label}</h3>
                            </div>
                            <div className="grid grid-cols-3 gap-2 sm:gap-3">
                                {group.items.map((acc: any) => {
                                    const style = getAccountStyle(acc.type);
                                    const currentBalance = calculateAccountBalance(acc);

                                    return (
                                        <div key={acc.id} onClick={() => { 
                                            setSubViewData(acc.id); 
                                            const detailClosingDay = acc.type === 'credit' ? acc.statementDate : (acc.cycleStartDay || settings.cycleStartDay);
                                            setSubViewDate(getInitialDateForCycle(detailClosingDay)); 
                                            setView('accountDetail'); 
                                        }} className={`bg-white rounded-xl border-t-4 ${style.border} shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col p-2.5 gap-1.5 relative`}>
                                            
                                            <div className="flex justify-between items-start">
                                                <span className={`text-[9px] sm:text-[10px] ${style.badge} px-1.5 py-0.5 rounded font-bold truncate max-w-[70%]`}>{style.label}</span>
                                                <button onClick={(e) => { e.stopPropagation(); setEditAcc(acc); setIsModalOpen(true); }} className="text-gray-300 hover:text-primary -mt-1 -mr-1 p-1"><Icon name="edit" size="text-[16px]"/></button>
                                            </div>

                                            <div className="flex flex-col min-h-[44px] justify-center mt-1">
                                                <span className="font-bold text-xs sm:text-sm text-dark truncate leading-tight">{acc.name}</span>
                                                <div className={`text-sm sm:text-lg font-black truncate mt-0.5 ${currentBalance < 0 ? 'text-danger' : 'text-dark'}`}>{formatMoney(currentBalance)}</div>
                                            </div>

                                            <div className="mt-auto pt-2 border-t border-gray-50 flex items-center justify-between gap-1">
                                                <div className="flex gap-0.5 -ml-1">
                                                    <button onClick={(e)=>{e.stopPropagation(); moveAccount(acc.id, 'up')}} className="text-gray-300 hover:text-primary p-0.5"><Icon name="chevron_left" size="text-[18px]"/></button>
                                                    <button onClick={(e)=>{e.stopPropagation(); moveAccount(acc.id, 'down')}} className="text-gray-300 hover:text-primary p-0.5"><Icon name="chevron_right" size="text-[18px]"/></button>
                                                </div>
                                                {acc.type === 'credit' ? (
                                                    <button onClick={(e) => handlePayCreditCard(e, acc)} className="py-1 px-2 text-[10px] font-bold bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-white transition-colors whitespace-nowrap">繳款</button>
                                                ) : (
                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteAccount(acc.id); }} className="text-gray-300 hover:text-danger p-0.5 -mr-1"><Icon name="delete" size="text-[16px]"/></button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
                {accounts.length === 0 && (
                     <div onClick={() => { setEditAcc({ startDate: formatDate(new Date()) }); setIsModalOpen(true); }} className="group border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center p-8 hover:border-primary hover:bg-primary/5 transition-all cursor-pointer min-h-[240px]">
                        <div className="size-14 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-primary/20 group-hover:text-primary transition-colors mb-4">
                            <Icon name="add_circle" size="text-3xl"/>
                        </div>
                        <p className="text-muted font-bold group-hover:text-primary transition-colors">新增首個資金帳戶</p>
                    </div>
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editAcc?.id ? "編輯資金帳戶" : "新增資金帳戶"}>
                <div className="p-6 space-y-4">
                    <input className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-primary" placeholder="帳戶名稱 (例如：台新銀行)" value={editAcc?.name || ''} onChange={e => setEditAcc({...editAcc, name: e.target.value})} />
                    <select className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-primary" value={editAcc?.type || 'cash'} onChange={e => setEditAcc({...editAcc, type: e.target.value})}>
                        <option value="cash">現金錢包</option>
                        <option value="bank">銀行帳戶</option>
                        <option value="credit">信用卡</option>
                    </select>
                    <input type="number" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-primary" placeholder="初始餘額 (例如：25000)" value={editAcc?.balance ?? ''} onChange={e => setEditAcc({...editAcc, balance: e.target.value})} />
                    <p className="text-xs text-gray-400 -mt-2">此金額將作為計算起點，後續交易將在此基礎上增減。</p>
                    {editAcc?.type !== 'credit' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">帳務週期 (每月結帳日)</label>
                            <div className="flex items-center gap-2">
                                <span className="text-gray-500 font-bold">每月</span>
                                <select className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none" value={editAcc?.cycleStartDay || 31} onChange={e => setEditAcc({...editAcc, cycleStartDay: parseInt(e.target.value)})}>
                                    {[...Array(31)].map((_, i) => <option key={i+1} value={i+1}>{i+1} 號</option>)}
                                </select>
                                <span className="text-gray-500 font-bold">結算</span>
                            </div>
                        </div>
                    )}
                    {editAcc?.type === 'credit' && (
                        <>
                            <input type="number" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-primary" placeholder="信用額度 (例如：200000)" value={editAcc?.creditLimit || ''} onChange={e => setEditAcc({...editAcc, creditLimit: e.target.value})} />
                            <div className="grid grid-cols-2 gap-3">
                                <input type="number" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-primary" placeholder="結帳日 (例如：17)" value={editAcc?.statementDate || ''} onChange={e => setEditAcc({...editAcc, statementDate: e.target.value})} />
                                <input type="number" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-primary" placeholder="繳款日 (例如：2)" value={editAcc?.dueDate || ''} onChange={e => setEditAcc({...editAcc, dueDate: e.target.value})} />
                            </div>
                        </>
                    )}
                    {editAcc?.id && <div className="text-center"><button onClick={() => { handleDeleteAccount(editAcc.id); setIsModalOpen(false); }} className="text-danger text-sm font-bold py-2 mt-2">刪除此帳戶</button></div>}
                    <button onClick={() => { handleSaveAccount(editAcc); setIsModalOpen(false); }} className="w-full py-3 bg-primary text-white font-bold rounded-lg mt-4 shadow-lg active:scale-95 transition-transform">儲存</button>
                </div>
            </Modal>
        </div>
    );
};
