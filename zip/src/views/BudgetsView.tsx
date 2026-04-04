import React, { useState } from 'react';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import { formatMoney, generateId } from '../utils';

export const BudgetsView = ({ budgets, setBudgets, categories, setView, showConfirm }: any) => {
     const [editBudget, setEditBudget] = useState<any>(null);
     const [modalOpen, setModalOpen] = useState(false);
     return (
         <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
                 <div className="flex items-center gap-2">
                    <button onClick={() => setView('dashboard')} className="p-1 -ml-1"><Icon name="arrow_back" /></button>
                    <h2 className="text-2xl font-bold">智慧預算管理</h2>
                </div>
                <button onClick={() => { setEditBudget({ resetDay: 31, targetCategories: [] }); setModalOpen(true); }} className="text-primary"><Icon name="add_circle" size="text-3xl" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-4 px-1">設定預算並綁定特定主分類，記帳時系統將為您自動計算追蹤。</p>
            <div className="space-y-3">
                {budgets.map((b: any) => (
                    <div key={b.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                            <div className="flex flex-col">
                                <h4 className="font-bold text-lg flex items-center gap-2">{b.name}</h4>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                    <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-primary/10 text-primary flex shrink-0">
                                        {(b.targetCategories && b.targetCategories.length > 0) ? `綁定 ${b.targetCategories.length} 個分類` : '無綁定分類'}
                                    </span>
                                    <span className="text-xs text-gray-400">每月 {b.resetDay || 31} 號結算</span>
                                </div>
                            </div>
                            <div className="flex gap-1 shrink-0">
                                <button onClick={() => { setEditBudget(b); setModalOpen(true); }} className="p-1 text-gray-400 hover:text-primary"><Icon name="edit"/></button>
                                <button onClick={() => showConfirm('刪除預算', '確定刪除此預算？', () => setBudgets((p: any) => p.filter((x: any) => x.id !== b.id)))} className="p-1 text-gray-400 hover:text-danger"><Icon name="delete"/></button>
                            </div>
                        </div>
                        <div className="mt-2 text-xl font-black text-dark">{formatMoney(b.limit)}</div>
                    </div>
                ))}
            </div>
            {budgets.length === 0 && <div className="text-center py-10 text-gray-400">尚無預算設定，點擊右上角新增</div>}
            
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editBudget?.id ? "編輯預算" : "新增預算"}>
                <div className="p-6 space-y-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">預算名稱</label><input className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary outline-none" placeholder="例如：生活費總管" value={editBudget?.name || ''} onChange={e => setEditBudget({...editBudget, name: e.target.value})} /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">每月預算金額</label><input className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary outline-none" type="number" placeholder="0" value={editBudget?.limit ?? ''} onChange={e => setEditBudget({...editBudget, limit: Number(e.target.value)})} /></div>
                    
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg space-y-2">
                        <label className="block text-sm font-bold text-primary">自動套用分類 (多選)</label>
                        <div className="grid grid-cols-3 gap-2">
                            {categories.filter((c: any) => c.type === 'expense').map((c: any) => (
                                <label key={c.id} className="flex items-center gap-1.5 text-sm text-dark cursor-pointer">
                                    <input type="checkbox" 
                                           className="rounded text-primary focus:ring-primary w-4 h-4 border-gray-300"
                                           checked={(editBudget?.targetCategories || []).includes(c.name)}
                                           onChange={(e) => {
                                               const current = new Set(editBudget?.targetCategories || []);
                                               if(e.target.checked) current.add(c.name);
                                               else current.delete(c.name);
                                               setEditBudget({...editBudget, targetCategories: Array.from(current)});
                                           }}
                                    />
                                    <span className="truncate">{c.name}</span>
                                </label>
                            ))}
                        </div>
                        <p className="text-[10px] text-blue-600/80 leading-tight mt-1">記帳時若選中這些分類，系統將預設套用此預算。您仍可在記帳表單手動修改為「不列入預算」。</p>
                    </div>

                    <div><label className="block text-sm font-medium text-gray-700 mb-1">結算日 (每月)</label><div className="flex items-center gap-2"><span className="text-gray-500 font-bold">每月</span><select className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary outline-none" value={editBudget?.resetDay || 31} onChange={e => setEditBudget({...editBudget, resetDay: parseInt(e.target.value)})}>{[...Array(31)].map((_, i) => <option key={i+1} value={i+1}>{i+1} 號</option>)}</select></div></div>
                    <button onClick={() => { 
                        const budgetData = { ...editBudget, limit: Number(editBudget.limit), resetDay: editBudget.resetDay || 31, targetCategories: editBudget.targetCategories || [] };
                        if(budgetData.id) setBudgets((p: any)=>p.map((x: any)=>x.id===budgetData.id?budgetData:x)); else setBudgets((p: any)=>[...p, {...budgetData, id:generateId()}]);
                        setModalOpen(false);
                    }} className="w-full py-3 bg-primary text-white font-bold rounded-lg mt-4 shadow-lg active:scale-95 transition-transform">儲存預算設定</button>
                </div>
            </Modal>
         </div>
     );
};
