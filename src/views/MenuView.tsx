import React, { useState, useRef } from 'react';
import { Icon } from '../components/Icon';
import { db, auth } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { formatDate } from '../utils';

export const MenuView = ({ setView, setSubViewDate, accounts, transactions, budgets, recurring, categories, paymentMethods, settings, setAccounts, setTransactions, setBudgets, setRecurring, setCategories, setPaymentMethods, setSettings, showAlert, showConfirm }: any) => {
    const [isSyncing, setIsSyncing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAuth = async () => {
        if (!auth.currentUser) {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
        }
        return auth.currentUser;
    };

    const sync = async (action: 'upload' | 'download') => {
        setIsSyncing(true);
        try {
            const user = await handleAuth();
            if (!user) throw new Error('請先登入');

            const metaRef = doc(db, 'users', user.uid, 'backup', 'meta');

            if (action === 'upload') {
                const metaData = {
                    accounts: JSON.stringify(accounts),
                    categories: JSON.stringify(categories),
                    budgets: JSON.stringify(budgets),
                    recurring: JSON.stringify(recurring),
                    paymentMethods: JSON.stringify(paymentMethods),
                    settings: JSON.stringify(settings),
                    updatedAt: new Date().toISOString()
                };
                await setDoc(metaRef, metaData);

                const txRef = doc(db, 'users', user.uid, 'transactions', 'all');
                await setDoc(txRef, { data: JSON.stringify(transactions) });

                showAlert('成功', '資料已備份至 Firebase');
            } else {
                showConfirm('還原資料', '這將覆蓋本地所有資料，確定嗎？', async () => {
                    try {
                        setIsSyncing(true);
                        const metaSnap = await getDoc(metaRef);
                        const txRef = doc(db, 'users', user.uid, 'transactions', 'all');
                        const txSnap = await getDoc(txRef);

                        if (metaSnap.exists()) {
                            const data = metaSnap.data();
                            if (data.accounts) setAccounts(JSON.parse(data.accounts));
                            if (data.categories) setCategories(JSON.parse(data.categories));
                            if (data.budgets) setBudgets(JSON.parse(data.budgets));
                            if (data.recurring) setRecurring(JSON.parse(data.recurring));
                            if (data.paymentMethods) setPaymentMethods(JSON.parse(data.paymentMethods));
                            if (data.settings) setSettings(JSON.parse(data.settings));
                        }

                        if (txSnap.exists()) {
                            const txData = txSnap.data();
                            if (txData.data) setTransactions(JSON.parse(txData.data));
                        }

                        showAlert('成功', '資料已從 Firebase 還原');
                    } catch (e: any) {
                        showAlert('還原失敗', e.message);
                    } finally {
                        setIsSyncing(false);
                    }
                });
                return; // Wait for confirm
            }
        } catch (e: any) {
            showAlert('同步失敗', e.message);
        } finally {
            if (action === 'upload') setIsSyncing(false);
        }
    };

    const handleExportLocal = () => {
        const data = {
            accounts, transactions, budgets, recurring, categories, paymentMethods, settings
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mymoney_backup_${formatDate(new Date())}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImportLocal = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                const data = JSON.parse(content);
                
                showConfirm('匯入本地資料', '這將覆蓋目前的本地資料，確定嗎？', () => {
                    const now = new Date().toISOString();
                    const newSettings = { ...(data.settings || settings), updatedAt: now };
                    
                    if (data.accounts) setAccounts(data.accounts);
                    if (data.transactions) setTransactions(data.transactions);
                    if (data.budgets) setBudgets(data.budgets);
                    if (data.recurring) setRecurring(data.recurring);
                    if (data.categories) setCategories(data.categories);
                    if (data.paymentMethods) setPaymentMethods(data.paymentMethods);
                    setSettings(newSettings);
                    
                    showAlert('成功', '本地資料已成功匯入並準備同步！');
                });
            } catch (error) {
                showAlert('錯誤', '檔案格式不正確或無法解析');
            }
        };
        reader.readAsText(file);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold px-1">更多功能</h2>
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                <button onClick={() => setView('paymentMethods')} className="w-full flex items-center justify-between p-4 bg-white border-b border-gray-100 active:bg-gray-50 hover:bg-gray-50 transition-colors"><div className="flex items-center gap-3"><Icon name="wallet" className="text-indigo-500 bg-indigo-50 p-1.5 rounded-lg"/><span className="font-bold text-dark">多元支付管理 <span className="ml-1 text-[10px] bg-red-100 text-red-500 px-1 py-0.5 rounded">NEW</span></span></div><Icon name="chevron_right" className="text-gray-300" size="text-xl"/></button>
                <button onClick={() => { setSubViewDate(new Date()); setView('budgets'); }} className="w-full flex items-center justify-between p-4 bg-white border-b border-gray-100 last:border-0 active:bg-gray-50 hover:bg-gray-50 transition-colors"><div className="flex items-center gap-3"><Icon name="pie_chart" className="text-primary bg-primary/10 p-1.5 rounded-lg"/><span className="font-bold text-dark">智慧預算管理</span></div><Icon name="chevron_right" className="text-gray-300" size="text-xl"/></button>
                <button onClick={() => { setSubViewDate(new Date()); setView('recurring'); }} className="w-full flex items-center justify-between p-4 bg-white border-b border-gray-100 last:border-0 active:bg-gray-50 hover:bg-gray-50 transition-colors"><div className="flex items-center gap-3"><Icon name="event_repeat" className="text-green-500 bg-green-50 p-1.5 rounded-lg"/><span className="font-bold text-dark">定期定額中心</span></div><Icon name="chevron_right" className="text-gray-300" size="text-xl"/></button>
                <button onClick={() => { 
                    const firstCredit = accounts.find((a: any) => a.type === 'credit');
                    const date = firstCredit ? new Date() : new Date(); // Simplified for now
                    setSubViewDate(date); 
                    setView('reconcile'); 
                }} className="w-full flex items-center justify-between p-4 bg-white border-b border-gray-100 last:border-0 active:bg-gray-50 hover:bg-gray-50 transition-colors"><div className="flex items-center gap-3"><Icon name="fact_check" className="text-orange-500 bg-orange-50 p-1.5 rounded-lg"/><span className="font-bold text-dark">信用卡對帳</span></div><Icon name="chevron_right" className="text-gray-300" size="text-xl"/></button>
                <button onClick={() => setView('categories')} className="w-full flex items-center justify-between p-4 bg-white border-b border-gray-100 last:border-0 active:bg-gray-50 hover:bg-gray-50 transition-colors"><div className="flex items-center gap-3"><Icon name="category" className="text-blue-500 bg-blue-50 p-1.5 rounded-lg"/><span className="font-bold text-dark">主/子分類管理</span></div><Icon name="chevron_right" className="text-gray-300" size="text-xl"/></button>
                <div className="w-full p-4 bg-white border-b border-gray-100 last:border-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Icon name="cloud_sync" className={`${auth.currentUser ? 'text-green-500 bg-green-50' : 'text-gray-400 bg-gray-50'} p-1.5 rounded-lg`}/>
                            <div className="text-left">
                                <span className="font-bold text-dark block">雲端自動同步</span>
                                <span className="text-[10px] text-gray-500">
                                    {auth.currentUser 
                                        ? `已登入: ${auth.currentUser.email}` 
                                        : '點擊登入以啟用自動備份'}
                                </span>
                                {auth.currentUser && settings.lastSyncedAt && (
                                    <span className="text-[10px] text-gray-400 block mt-0.5">
                                        上次同步: {new Date(settings.lastSyncedAt).toLocaleString()}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {auth.currentUser ? (
                                <>
                                    <button 
                                        onClick={() => {
                                            const now = new Date().toISOString();
                                            setSettings({ ...settings, updatedAt: now });
                                            showAlert('同步中', '正在手動觸發雲端同步...');
                                        }}
                                        className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded-full font-bold active:scale-95 transition-transform"
                                    >
                                        立即同步
                                    </button>
                                    <span className="text-[10px] bg-green-100 text-green-600 px-2 py-1 rounded-full font-bold">同步中</span>
                                </>
                            ) : (
                                <button onClick={handleAuth} className="text-gray-300 active:scale-95 transition-transform">
                                    <Icon name="login" size="text-xl"/>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm p-5">
                <h3 className="font-bold mb-4 flex items-center gap-2"><Icon name="folder_open" className="text-primary"/> 本地檔案匯入/匯出</h3>
                <p className="text-sm text-gray-500 mb-4">將資料匯出為 JSON 檔案，或從舊版備份檔案還原。</p>
                <div className="flex gap-3">
                    <button onClick={handleExportLocal} className="flex-1 py-3 rounded-xl font-bold text-sm text-white bg-primary shadow-lg shadow-primary/30 active:scale-95 hover:bg-primary-hover transition-all">匯出檔案</button>
                    <button onClick={() => fileInputRef.current?.click()} className="flex-1 py-3 rounded-xl font-bold text-sm text-dark bg-gray-100 active:bg-gray-200 hover:bg-gray-200 transition-all">匯入檔案</button>
                    <input 
                        type="file" 
                        accept=".json" 
                        ref={fileInputRef} 
                        onChange={handleImportLocal} 
                        className="hidden" 
                    />
                </div>
            </div>
        </div>
    );
};
