import React, { useState } from 'react';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import { formatMoney, formatDate } from '../utils';

export const RecurringView = ({ recurring, setRecurring, setTransactions, budgets, accounts, paymentMethods, categories, setView, showConfirm }: any) => {
    const [editRule, setEditRule] = useState<any>(null);

    const currentCategoryObj = editRule ? categories.find((c: any) => c.name === editRule.category && c.type === editRule.type) : null;
    const subcategoriesOptions = currentCategoryObj?.subcategories || [];

    const handleTypeChange = (t: string) => {
        const newCat = categories.find((c: any) => c.type === t);
        setEditRule({
            ...editRule, 
            type: t,
            category: newCat ? newCat.name : '',
            subcategory: newCat && newCat.subcategories?.length > 0 ? newCat.subcategories[0] : '',
            paymentMethodId: t === 'transfer' ? '' : editRule.paymentMethodId
        });
    };

    const handleCategoryChange = (cName: string) => {
        const catObj = categories.find((c: any) => c.name === cName && c.type === editRule.type);
        setEditRule({
            ...editRule,
            category: cName,
            subcategory: catObj && catObj.subcategories?.length > 0 ? catObj.subcategories[0] : ''
        });
    };

    const handleSaveRule = () => {
        if (!editRule) return;
        const todayStr = formatDate(new Date());
        if (!editRule.active) {
            setTransactions((prev: any) => prev.filter((t: any) => {
                const isLinked = t.recurringRuleId === editRule.id;
                const isStrictlyFuture = t.date > todayStr; 
                if (isLinked && isStrictlyFuture && !t.reconciled) return false;
                return true;
            }));
            setRecurring((prev: any) => prev.map((r: any) => r.id === editRule.id ? { ...editRule, amount: Number(editRule.amount), isActive: false, lastRunDate: todayStr } : r));
        } else {
            setTransactions((prev: any) => prev.map((t: any) => {
                 const isLinked = t.recurringRuleId === editRule.id;
                 const isFutureOrToday = t.date >= todayStr; 
                 if (isLinked && isFutureOrToday && !t.reconciled) {
                     return { ...t, type: editRule.type, amount: Number(editRule.amount), accountId: editRule.accountId, toAccountId: editRule.toAccountId, payee: editRule.payee, category: editRule.category, subcategory: editRule.subcategory, budgetId: editRule.budgetId, paymentMethodId: editRule.paymentMethodId, note: (editRule.note || editRule.name) + ' (定期)' };
                 }
                 return t;
            }));
            setRecurring((prev: any) => prev.map((r: any) => r.id === editRule.id ? { ...editRule, amount: Number(editRule.amount), isActive: true } : r));
        }
        setEditRule(null);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
                <button onClick={() => setView('menu')} className="p-1 -ml-1"><Icon name="arrow_back" /></button>
                <h2 className="text-xl font-bold">定期扣款管理</h2>
            </div>
            {recurring.map((r: any) => {
                const isActive = r.isActive !== undefined ? r.isActive : r.active;
                const displayTitle = r.payee || r.note || r.name;
                return (
                    <div key={r.id} onClick={() => setEditRule({ ...r, active: isActive })} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center active:bg-gray-50 cursor-pointer">
                        <div>
                            <h4 className="font-bold flex items-center gap-2">{displayTitle} {r.category && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{r.category} {r.subcategory ? `> ${r.subcategory}` : ''}</span>}</h4>
                            <p className="text-sm text-gray-500 mt-1">每月 {r.day} 號 • <span className="font-bold text-dark">{formatMoney(r.amount)}</span></p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 ${isActive ? 'bg-green-100 text-success' : 'bg-gray-200 text-gray-500'}`}>{isActive ? '執行中' : '已終止'}</div>
                    </div>
                )
            })}
            {recurring.length === 0 && <div className="text-center py-10 text-gray-400">尚無定期扣款設定<br/>請在新增交易時勾選「設為定期」</div>}
            <Modal isOpen={!!editRule} onClose={() => setEditRule(null)} title="編輯定期扣款">
                <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                    <div className="flex p-1 bg-gray-200 rounded-lg">
                        {['expense', 'income', 'transfer'].map(t => {
                            if (t === 'transfer' && accounts.length < 2) return null;
                            return (
                                <label key={t} className="flex-1 cursor-pointer">
                                    <input type="radio" name="rule_type" className="hidden peer" checked={editRule?.type === t} onChange={() => handleTypeChange(t)} />
                                    <div className="text-center py-2 text-sm font-medium rounded-md peer-checked:bg-white peer-checked:text-primary peer-checked:shadow-sm text-gray-500 transition-all">
                                        {t === 'expense' ? '支出' : t === 'income' ? '收入' : '轉帳'}
                                    </div>
                                </label>
                            );
                        })}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">金額</label><input type="number" className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-primary" value={editRule?.amount ?? ''} onChange={e => setEditRule({...editRule, amount: e.target.value})} /></div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{editRule?.type === 'transfer' ? '轉出帳戶' : '資金帳戶'}</label>
                            <select className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-primary" value={editRule?.accountId || ''} onChange={e => setEditRule({...editRule, accountId: e.target.value})}>
                                {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        </div>
                    </div>

                    {editRule?.type !== 'transfer' && (
                        <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100/50">
                            <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-1"><Icon name="wallet" size="text-[16px]" className="text-primary" /> 支付方式 (例如：LINE Pay)</label>
                            <select className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none" value={editRule?.paymentMethodId || ''} onChange={e => setEditRule({...editRule, paymentMethodId: e.target.value})}>
                                <option value="">-- 無特定支付方式 --</option>
                                {paymentMethods.map((pm: any) => <option key={pm.id} value={pm.id}>{pm.name}</option>)}
                            </select>
                        </div>
                    )}

                    {editRule?.type === 'transfer' ? (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">轉入帳戶</label>
                            <select className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-primary" value={editRule?.toAccountId || ''} onChange={e => setEditRule({...editRule, toAccountId: e.target.value})}>
                                {accounts.filter((a: any) => String(a.id) !== String(editRule?.accountId)).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">主分類</label>
                                <select className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none" value={editRule?.category || ''} onChange={e => handleCategoryChange(e.target.value)}>
                                    {categories.filter((c: any) => c.type === editRule?.type).map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">子分類</label>
                                <select className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none" value={editRule?.subcategory || ''} onChange={e => setEditRule({...editRule, subcategory: e.target.value})}>
                                    {subcategoriesOptions.map((sub: string, i: number) => <option key={i} value={sub}>{sub}</option>)}
                                    <option value="">(無)</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {editRule?.type !== 'transfer' && (
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">對象/店名</label><input className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-primary" value={editRule?.payee || ''} onChange={e => setEditRule({...editRule, payee: e.target.value})} /></div>
                    )}
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">名稱/備註</label><input className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-primary" value={editRule?.note || editRule?.name || ''} onChange={e => setEditRule({...editRule, note: e.target.value})} /></div>
                    
                    {editRule?.type === 'expense' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">計入預算</label>
                            <select className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-primary" value={editRule?.budgetId || ''} onChange={e => setEditRule({...editRule, budgetId: e.target.value})}>
                                <option value="">不列入預算</option>
                                {budgets.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">扣款日 (每月)</label><select className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-primary" value={editRule?.day || 1} onChange={e => setEditRule({...editRule, day: parseInt(e.target.value)})}>{[...Array(31)].map((_, i) => <option key={i+1} value={i+1}>{i+1} 號</option>)}</select></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">週期狀態</label><button onClick={() => setEditRule({...editRule, active: !editRule.active})} className={`w-full p-2 rounded-lg font-bold text-sm transition-colors ${editRule?.active ? 'bg-red-50 text-danger border border-red-100 hover:bg-red-100' : 'bg-green-50 text-success border border-green-100 hover:bg-green-100'}`}>{editRule?.active ? '終止扣款' : '恢復扣款'}</button></div>
                    </div>
                    <button onClick={handleSaveRule} className="w-full py-3 bg-primary text-white font-bold rounded-lg mt-4 shadow-lg active:scale-95 transition-transform">儲存變更</button>
                    <button onClick={() => { showConfirm('刪除定期扣款', '確定要刪除此設定嗎？', () => { setRecurring((prev: any) => prev.filter((r: any) => r.id !== editRule.id)); setEditRule(null); }); }} className="w-full py-3 text-danger font-bold rounded-lg mt-2 hover:bg-red-50 transition-colors">刪除設定</button>
                </div>
            </Modal>
        </div>
    );
};
