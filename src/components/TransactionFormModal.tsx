import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';

export const TransactionFormModal = ({ initialData, isOpen, onClose, onSave, onDelete, accounts, paymentMethods, categories, budgets, showAlert, settings, transactions }: any) => {
    const [form, setForm] = useState({ setRecurring: false, budgetId: '', payee: '', paymentMethodId: '', ...initialData });
    const [isCalcActive, setIsCalcActive] = useState(false);
    const [showPayeeSuggestions, setShowPayeeSuggestions] = useState(false);
    const [showNoteSuggestions, setShowNoteSuggestions] = useState(false);
    const amountInputRef = useRef<HTMLInputElement>(null);

    const uniquePayees = React.useMemo(() => {
        const payees = transactions.map((t: any) => t.payee).filter(Boolean);
        return Array.from(new Set(payees));
    }, [transactions]);

    const uniqueNotes = React.useMemo(() => {
        const notes = transactions.map((t: any) => t.note).filter(Boolean);
        return Array.from(new Set(notes));
    }, [transactions]);

    const filteredPayees = uniquePayees.filter((p: any) => p.toLowerCase().includes((form.payee || '').toLowerCase()) && p !== form.payee);
    const filteredNotes = uniqueNotes.filter((n: any) => n.toLowerCase().includes((form.note || '').toLowerCase()) && n !== form.note);

    const selectPayee = (p: string) => {
        setForm((prev: any) => {
            const newData = { ...prev, payee: p };
            // Find most common category for this payee
            const matchingTxs = transactions.filter((t: any) => t.payee === p && t.type === prev.type);
            if (matchingTxs.length > 0) {
                const catCounts: any = {};
                matchingTxs.forEach((t: any) => {
                    catCounts[t.category] = (catCounts[t.category] || 0) + 1;
                });
                const topCat = Object.keys(catCounts).reduce((a, b) => catCounts[a] > catCounts[b] ? a : b);
                newData.category = topCat;

                // Also find most common subcategory for this top category
                const subCatCounts: any = {};
                matchingTxs.filter((t: any) => t.category === topCat).forEach((t: any) => {
                    subCatCounts[t.subcategory] = (subCatCounts[t.subcategory] || 0) + 1;
                });
                const topSubCat = Object.keys(subCatCounts).reduce((a, b) => subCatCounts[a] > subCatCounts[b] ? a : b);
                newData.subcategory = topSubCat;
            }
            return newData;
        });
        setShowPayeeSuggestions(false);
    };

    const currentCategoryObj = categories.find((c: any) => c.name === form.category && c.type === form.type);
    const subcategoriesOptions = currentCategoryObj?.subcategories || [];

    useEffect(() => {
        if (isOpen && amountInputRef.current) {
            amountInputRef.current.focus();
        }
    }, [isOpen]);

    useEffect(() => {
        if (initialData) {
            let validCategory = initialData.category;
            let validSubcategory = initialData.subcategory;
            
            if (initialData.type !== 'transfer') {
                const catObj = categories.find((c: any) => c.name === initialData.category && c.type === initialData.type);
                if (!catObj) {
                    const defaultCat = categories.find((c: any) => c.type === initialData.type);
                    validCategory = defaultCat ? defaultCat.name : '';
                    validSubcategory = defaultCat && defaultCat.subcategories?.length > 0 ? defaultCat.subcategories[0] : '';
                } else if (initialData.subcategory && !catObj.subcategories?.includes(initialData.subcategory)) {
                    validSubcategory = catObj.subcategories?.length > 0 ? catObj.subcategories[0] : '';
                }
            }

            setForm({ 
                setRecurring: false, 
                budgetId: '', 
                payee: '', 
                paymentMethodId: '', 
                ...initialData,
                category: validCategory,
                subcategory: validSubcategory
            });
            if (!initialData.id) setIsCalcActive(false); 
        }
    }, [initialData, categories]);

    const calculateResult = (expression: string) => {
        try {
            const cleanExpr = String(expression).replace(/[^0-9+\-*/.]/g, '');
            if (!cleanExpr) return '0';
            // eslint-disable-next-line no-new-func
            const result = Function('"use strict";return (' + cleanExpr + ')')();
            return String(result);
        } catch (e) { return 'Error'; }
    };

    const handleCalcPress = (key: string) => {
        const currentVal = String(form.amount || '0');
        if (key === 'C') { 
            handleChange('amount', '0'); 
        }
        else if (key === '=') { 
            handleChange('amount', calculateResult(currentVal)); 
        } 
        else if (key === 'OK') {
            let finalVal = currentVal;
            if (/[+\-*/]/.test(currentVal)) finalVal = calculateResult(currentVal);
            if (finalVal === 'Error' || finalVal === 'Infinity' || finalVal === 'NaN') {
                showAlert('錯誤', '計算錯誤或數字無效'); handleChange('amount', '0');
            } else {
                handleChange('amount', finalVal); setIsCalcActive(false);
            }
        } else if (key === 'backspace') {
            handleChange('amount', currentVal.length > 1 ? currentVal.slice(0, -1) : '0');
        } else {
            const newVal = currentVal === '0' && !['/','*','-','+','.'].includes(key) ? String(key) : currentVal + key;
            handleChange('amount', newVal);
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            
            const isTypingInInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName);
            const isAmountField = e.target === amountInputRef.current;
            
            if (isTypingInInput && !isAmountField) return;

            const key = e.key;
            if (/[0-9]/.test(key)) {
                e.preventDefault();
                handleCalcPress(key);
            } else if (['+', '-', '*', '/'].includes(key)) {
                e.preventDefault();
                handleCalcPress(key);
            } else if (key === '.' || key === ',') {
                e.preventDefault();
                handleCalcPress('.');
            } else if (key === 'Enter') {
                e.preventDefault();
                handleCalcPress('OK');
            } else if (key === 'Backspace') {
                e.preventDefault();
                handleCalcPress('backspace');
            } else if (key.toLowerCase() === 'c') {
                e.preventDefault();
                handleCalcPress('C');
            } else if (key === '=') {
                e.preventDefault();
                handleCalcPress('=');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, form.amount]);

    const handleChange = (f: string, v: any) => {
        setForm((p: any) => {
            const newData = { ...p, [f]: v };
            if (f === 'type' && v === 'transfer') {
                if (!newData.toAccountId || newData.toAccountId === newData.accountId) {
                    // Try last used transfer pair
                    if (settings?.lastTransferPair?.from && settings?.lastTransferPair?.to && 
                        accounts.some((a: any) => a.id === settings.lastTransferPair.from) && 
                        accounts.some((a: any) => a.id === settings.lastTransferPair.to)) {
                        newData.accountId = settings.lastTransferPair.from;
                        newData.toAccountId = settings.lastTransferPair.to;
                    } else {
                        const otherAcc = accounts.find((a: any) => String(a.id) !== String(newData.accountId));
                        if (otherAcc) newData.toAccountId = otherAcc.id;
                    }
                }
                newData.paymentMethodId = ''; // 轉帳通常不需要特定支付方式標籤
            }
            if (f === 'toAccountId' && newData.type === 'transfer') {
                const lastSourceId = settings?.lastPaymentSources?.[v];
                if (lastSourceId && accounts.some((a: any) => a.id === lastSourceId)) {
                    newData.accountId = lastSourceId;
                }
            }
            if (f === 'type') {
                const newCat = categories.find((c: any) => c.type === v);
                newData.category = newCat ? newCat.name : '';
                newData.subcategory = newCat && newCat.subcategories?.length > 0 ? newCat.subcategories[0] : '';
                const matchingBudg = budgets.find((b: any) => b.targetCategories?.includes(newData.category));
                newData.budgetId = matchingBudg ? matchingBudg.id : '';
            }
            if (f === 'category') {
                const catObj = categories.find((c: any) => c.name === v && c.type === newData.type);
                newData.subcategory = catObj && catObj.subcategories?.length > 0 ? catObj.subcategories[0] : '';
                const matchingBudg = budgets.find((b: any) => b.targetCategories?.includes(v));
                newData.budgetId = matchingBudg ? matchingBudg.id : '';
            }
            return newData;
        });
    };

    const calcButtons = ['C', '/', '*', 'backspace', '7', '8', '9', '-', '4', '5', '6', '+', '1', '2', '3', '=', '0', '.', 'OK'];

    const CalculatorUI = ({ isSidebar = false }: { isSidebar?: boolean }) => (
        <div className={`${isSidebar ? 'w-full h-full' : 'bg-white rounded-2xl shadow-2xl w-full max-w-sm relative modal-enter'} flex flex-col overflow-hidden`}>
            <div className={`flex justify-between items-center p-4 border-b ${isSidebar ? 'bg-gray-100' : ''}`}>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">計算機</span>
                <span className="text-2xl font-mono font-bold text-primary px-2 truncate max-w-[200px]">{form.amount || '0'}</span>
                {!isSidebar && <button onClick={() => setIsCalcActive(false)} className="p-1 rounded-full hover:bg-gray-100"><Icon name="close" /></button>}
            </div>
            <div className={`grid grid-cols-4 gap-2 p-2 ${isSidebar ? 'bg-gray-50' : 'bg-gray-50'}`}>
                {calcButtons.map(btn => (
                    <button key={btn} onClick={() => handleCalcPress(btn)} 
                        className={`aspect-[1.3] flex items-center justify-center rounded-lg shadow-sm text-xl font-bold active:scale-95 transition-transform 
                            ${btn === 'OK' ? 'col-span-2 bg-primary text-white shadow-md' : ''}
                            ${['/','*','-','+','='].includes(btn) ? 'bg-primary/10 text-primary' : (btn !== 'OK' && btn !== 'backspace') ? 'bg-white text-gray-700' : ''}
                            ${btn === 'backspace' ? 'bg-gray-200 text-gray-700' : ''}
                        `}
                    >
                        {btn === 'backspace' ? <Icon name="backspace" /> : btn}
                    </button>
                ))}
            </div>
            {isSidebar && (
                <div className="p-4 bg-gray-50 border-t border-gray-200 mt-auto">
                    <p className="text-[10px] text-gray-400 text-center">支援鍵盤輸入 (0-9, +, -, *, /, Enter, Backspace)</p>
                </div>
            )}
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-4xl" title={form.id ? '編輯交易' : '新增交易'}>
            <div className="flex flex-col md:flex-row h-full pb-safe">
                <div className="flex-1 p-4 space-y-4 overflow-y-auto max-h-[80vh] md:max-h-none">
                    <div className="flex p-1 bg-gray-200 rounded-lg">
                        {['expense', 'income', 'transfer'].map(t => {
                            if (t === 'transfer' && accounts.length < 2) return null;
                            return (
                                <label key={t} className="flex-1 cursor-pointer">
                                    <input type="radio" name="tx_type" className="hidden peer" checked={form.type === t} onChange={() => handleChange('type', t)} />
                                    <div className="text-center py-2 text-sm font-medium rounded-md peer-checked:bg-white peer-checked:text-primary peer-checked:shadow-sm text-gray-500 transition-all">
                                        {t === 'expense' ? '支出' : t === 'income' ? '收入' : '轉帳'}
                                    </div>
                                </label>
                            );
                        })}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">金額</label>
                        <div className="relative" onClick={() => setIsCalcActive(true)}>
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-gray-400">$</span>
                            <input 
                                ref={amountInputRef}
                                type="text" 
                                readOnly 
                                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-lg text-3xl font-bold text-primary focus:ring-2 focus:ring-primary outline-none transition-all cursor-pointer" 
                                placeholder="0" 
                                value={form.amount ?? ''} 
                            />
                        </div>
                    </div>
                    
                    {/* Date and Account Row */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">日期</label>
                            <input type="date" className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none" value={form.date || ''} onChange={e => handleChange('date', e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{form.type === 'transfer' ? '轉出帳戶' : '資金帳戶'}</label>
                            <select className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none" value={form.accountId || ''} onChange={e => { const acc = accounts.find((a: any) => String(a.id) === e.target.value); handleChange('accountId', acc ? acc.id : e.target.value); }}>
                                {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        </div>
                    </div>
                    
                    {/* Payment Method Row */}
                    {form.type !== 'transfer' && (
                        <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100/50">
                            <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-1"><Icon name="wallet" size="text-[16px]" className="text-primary" /> 支付方式 (例如：LINE Pay)</label>
                            <select className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none" value={form.paymentMethodId || ''} onChange={e => handleChange('paymentMethodId', e.target.value)}>
                                <option value="">-- 無特定支付方式 --</option>
                                {paymentMethods.map((pm: any) => <option key={pm.id} value={pm.id}>{pm.name}</option>)}
                            </select>
                        </div>
                    )}

                    {form.type !== 'transfer' && (
                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 mb-1">交易對象 / 店名 (選填)</label>
                            <input 
                                type="text" 
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none" 
                                placeholder="例如：麥當勞、中華電信..." 
                                value={form.payee || ''} 
                                onChange={e => { handleChange('payee', e.target.value); setShowPayeeSuggestions(true); }}
                                onFocus={() => setShowPayeeSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowPayeeSuggestions(false), 200)}
                            />
                            {showPayeeSuggestions && filteredPayees.length > 0 && (
                                <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-40 overflow-y-auto">
                                    {filteredPayees.slice(0, 5).map((p: any) => (
                                        <div key={p} onClick={() => selectPayee(p)} className="p-3 text-sm hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0 flex items-center gap-2">
                                            <Icon name="history" size="text-xs" className="text-gray-400" />
                                            {p}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {form.type === 'transfer' ? (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">轉入帳戶</label>
                            <select className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none" value={form.toAccountId || ''} onChange={e => { const acc = accounts.find((a: any) => String(a.id) === e.target.value); handleChange('toAccountId', acc ? acc.id : e.target.value); }}>
                                {accounts.filter((a: any) => String(a.id) !== String(form.accountId)).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">主分類</label>
                                <select className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none" value={form.category || ''} onChange={e => handleChange('category', e.target.value)}>
                                    {categories.filter((c: any) => c.type === form.type).map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">子分類</label>
                                <select className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none" value={form.subcategory || ''} onChange={e => handleChange('subcategory', e.target.value)}>
                                    {subcategoriesOptions.map((sub: string, i: number) => <option key={i} value={sub}>{sub}</option>)}
                                    <option value="">(無)</option>
                                </select>
                            </div>
                        </div>
                    )}
                    
                    {form.type === 'expense' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">計入預算 (可手動排除)</label>
                            <select className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none" value={form.budgetId || ''} onChange={e => handleChange('budgetId', e.target.value)}>
                                <option value="">不列入預算</option>
                                {budgets.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                    )}

                    {form.type === 'expense' && !form.id && (
                        <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                            <label className="block text-xs font-bold text-gray-500 mb-1">分期付款 (選填)</label>
                            <select className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none" value={form.installmentCount || ''} onChange={e => handleChange('installmentCount', e.target.value)}>
                                <option value="">無分期 (一次付清)</option>
                                <option value="3">3 期</option>
                                <option value="6">6 期</option>
                                <option value="12">12 期</option>
                                <option value="24">24 期</option>
                            </select>
                            {form.installmentCount && parseInt(form.installmentCount) > 1 && form.amount > 0 && (
                                <p className="text-[10px] text-gray-400 mt-1">
                                    將自動建立 {form.installmentCount} 筆交易，首期 {Math.floor(form.amount / parseInt(form.installmentCount)) + (form.amount % parseInt(form.installmentCount))} 元，其餘每期 {Math.floor(form.amount / parseInt(form.installmentCount))} 元。
                                </p>
                            )}
                        </div>
                    )}
                    {form.isInstallmentItem && <div className="bg-blue-50 text-primary p-2 rounded text-xs font-medium">✨ 此為分期付款項目</div>}
                    
                    <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 mb-1">備註細節</label>
                        <textarea 
                            className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none resize-none" 
                            rows={2} 
                            placeholder="輸入其他說明..." 
                            value={form.note || ''} 
                            onChange={e => { handleChange('note', e.target.value); setShowNoteSuggestions(true); }}
                            onFocus={() => setShowNoteSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowNoteSuggestions(false), 200)}
                        ></textarea>
                        {showNoteSuggestions && filteredNotes.length > 0 && (
                            <div className="absolute z-50 left-0 right-0 bottom-full mb-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-40 overflow-y-auto">
                                {filteredNotes.slice(0, 5).map((n: any) => (
                                    <div key={n} onClick={() => { handleChange('note', n); setShowNoteSuggestions(false); }} className="p-3 text-sm hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0 flex items-center gap-2">
                                        <Icon name="history" size="text-xs" className="text-gray-400" />
                                        {n}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    {!form.id && (
                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="recurring" checked={form.setRecurring} onChange={e => handleChange('setRecurring', e.target.checked)} className="rounded text-primary focus:ring-primary size-5"/>
                            <label htmlFor="recurring" className="text-sm font-medium text-gray-600">設為定期自動記帳</label>
                        </div>
                    )}
                    <div className="pt-2 mt-2">
                        <button onClick={() => { onSave(form); onClose(); }} className="w-full py-3 bg-primary text-white font-bold rounded-xl shadow-lg active:scale-95 transition-transform">
                            {form.id ? '儲存變更' : '儲存交易'}
                        </button>
                        {form.id && <button onClick={() => { onDelete(form.id); onClose(); }} className="w-full py-3 bg-red-50 text-danger font-bold rounded-xl mt-3">刪除此交易</button>}
                    </div>
                </div>

                {/* Desktop Calculator Sidebar */}
                <div className="hidden md:block w-80 border-l border-gray-100 bg-gray-50">
                    <CalculatorUI isSidebar={true} />
                </div>

                {/* Mobile Calculator Overlay */}
                {isCalcActive && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 modal-backdrop md:hidden">
                        <CalculatorUI />
                    </div>
                )}
            </div>
        </Modal>
    );
};
