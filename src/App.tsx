import React, { useState, useEffect, useRef } from 'react';
import { Icon } from './components/Icon';
import { ConfirmDialog } from './components/ConfirmDialog';
import { TransactionFormModal } from './components/TransactionFormModal';
import { DashboardView } from './views/DashboardView';
import { AccountsView } from './views/AccountsView';
import { TransactionsView } from './views/TransactionsView';
import { BudgetsView } from './views/BudgetsView';
import { MenuView } from './views/MenuView';
import { RecurringView } from './views/RecurringView';
import { PaymentMethodsView } from './views/PaymentMethodsView';
import { ReconcileView } from './views/ReconcileView';
import { CategoryView } from './views/CategoryView';
import { AccountDetailView } from './views/AccountDetailView';
import { BudgetDetailView } from './views/BudgetDetailView';
import { generateId, formatDate } from './utils';
import { db, auth } from './firebase';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const INITIAL_DATA = {
    accounts: [],
    transactions: [],
    categories: [
        {"id":"exp_food","name":"飲食","type":"expense","subcategories":["早餐","午餐","晚餐","飲料零食"]},
        {"id":"exp_daily","name":"生活用品","type":"expense","subcategories":["日常必需品","個人護理"]},
        {"id":"exp_transport","name":"交通","type":"expense","subcategories":["通勤","偶爾搭車","油錢","停車費"]},
        {"id":"exp_housing","name":"居住","type":"expense","subcategories":["房租","水電瓦斯","家具","管理費"]},
        {"id":"exp_clothing","name":"服飾","type":"expense","subcategories":["服裝","鞋子","配件"]},
        {"id":"exp_edu_ent","name":"育樂","type":"expense","subcategories":["書籍","課程","娛樂","旅遊","運動"]},
        {"id":"exp_other","name":"其他","type":"expense","subcategories":["醫療","保險","稅捐","雜項"]},
        {"id":"inc_fixed","name":"固定收入","type":"income","subcategories":["薪資","獎金"]},
        {"id":"inc_var","name":"變動收入","type":"income","subcategories":["投資獲利","接案","其他"]}
    ],
    budgets: [],
    recurring: [],
    paymentMethods: [
        { id: 'pm_cash', name: '現金', icon: 'payments' },
        { id: 'pm_credit', name: '信用卡', icon: 'credit_card' },
        { id: 'pm_linepay', name: 'LINE Pay', icon: 'qr_code_scanner' },
        { id: 'pm_jko', name: '街口支付', icon: 'qr_code_scanner' },
        { id: 'pm_applepay', name: 'Apple Pay', icon: 'contactless' },
        { id: 'pm_transfer', name: '銀行轉帳', icon: 'account_balance' }
    ]
};

export default function App() {
    const [view, setView] = useState('dashboard');
    const [subViewData, setSubViewData] = useState<any>(null);
    
    const [dialog, setDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {}, isAlert: false });

    // State Initialization with local storage fallback
    const [accounts, setAccounts] = useState<any[]>(() => JSON.parse(localStorage.getItem('accounts') || 'null') || INITIAL_DATA.accounts);
    const [transactions, setTransactions] = useState<any[]>(() => JSON.parse(localStorage.getItem('transactions') || 'null') || INITIAL_DATA.transactions);
    const [recurring, setRecurring] = useState<any[]>(() => JSON.parse(localStorage.getItem('recurring') || 'null') || INITIAL_DATA.recurring);
    const [paymentMethods, setPaymentMethods] = useState<any[]>(() => JSON.parse(localStorage.getItem('paymentMethods') || 'null') || INITIAL_DATA.paymentMethods);
    const [categories, setCategories] = useState<any[]>(() => {
        const saved = JSON.parse(localStorage.getItem('categories') || 'null');
        if (!saved || saved.length === 0) return INITIAL_DATA.categories;
        const uniqueMap = new Map();
        saved.forEach((cat: any) => {
            const key = `${cat.type}_${cat.name}`;
            if (!uniqueMap.has(key)) {
                uniqueMap.set(key, { ...cat, id: cat.id || generateId() });
            } else {
                const existing = uniqueMap.get(key);
                if ((cat.subcategories?.length || 0) > (existing.subcategories?.length || 0)) {
                    uniqueMap.set(key, { ...cat, id: existing.id });
                }
            }
        });
        return Array.from(uniqueMap.values());
    });
    const [budgets, setBudgets] = useState<any[]>(() => {
        const saved = JSON.parse(localStorage.getItem('budgets') || 'null');
        if (saved && saved.length > 0) {
            return saved.map((b: any) => ({ ...b, targetCategories: b.targetCategories || [] }));
        }
        return INITIAL_DATA.budgets;
    });
    const [settings, setSettings] = useState<any>(() => {
        const saved = JSON.parse(localStorage.getItem('settings') || 'null') || { cycleStartDay: 31, syncUrl: '', accountGroupOrder: ['general', 'credit'], lastPaymentSources: {}, lastTransferPair: { from: '', to: '' }, lastSyncedAt: null };
        if (!saved.lastPaymentSources) saved.lastPaymentSources = {};
        if (!saved.lastTransferPair) saved.lastTransferPair = { from: '', to: '' };
        return saved;
    });

    const getInitialDateForCycle = (closingDayParam: any) => {
        const now = new Date();
        const closingDay = parseInt(closingDayParam) || 31;
        if (now.getDate() > closingDay) {
            return new Date(now.getFullYear(), now.getMonth() + 1, 1);
        }
        return now;
    };

    const [viewDate, setViewDate] = useState(() => getInitialDateForCycle(settings.cycleStartDay)); 
    const [subViewDate, setSubViewDate] = useState(new Date());
    const [user, setUser] = useState<any>(null);
    const isCloudInitializedRef = useRef(false);
    const [isCloudInitialized, setIsCloudInitialized] = useState(false);
    
    // Use refs to access latest state in onSnapshot without stale closures or re-subscribing
    const stateRef = useRef<any>({});
    useEffect(() => {
        stateRef.current = { accounts, transactions, budgets, recurring, categories, paymentMethods, settings };
    }, [accounts, transactions, budgets, recurring, categories, paymentMethods, settings]);

    // Initialize as empty string to prevent any push until cloud check is done
    const lastSyncRef = useRef<string>('');

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (u) => {
            setUser(u);
            if (!u) {
                isCloudInitializedRef.current = false;
                setIsCloudInitialized(false);
                lastSyncRef.current = '';
            }
        });
        return () => unsubscribe();
    }, []);

    // Real-time Cloud Sync (Pull)
    useEffect(() => {
        if (!user) {
            setIsCloudInitialized(true); // Allow local use if not logged in
            return;
        }

        setIsCloudInitialized(false);
        isCloudInitializedRef.current = false;

        console.log('Subscribing to cloud sync for user:', user.uid);
        const metaRef = doc(db, 'users', user.uid, 'backup', 'meta');
        
        const unsubscribeMeta = onSnapshot(metaRef, async (snap) => {
            try {
                if (snap.exists()) {
                    const cloudData = snap.data();
                    const cloudUpdatedAt = new Date(cloudData.updatedAt).getTime();
                    const localUpdatedAt = stateRef.current.settings.updatedAt ? new Date(stateRef.current.settings.updatedAt).getTime() : 0;

                    // Ignore local writes to prevent echo/flicker
                    if (snap.metadata.hasPendingWrites) {
                        console.log('Ignoring local write snapshot');
                        return;
                    }

                    if (cloudUpdatedAt > localUpdatedAt) {
                        console.log('Cloud is newer, pulling data...');
                        const txRef = doc(db, 'users', user.uid, 'transactions', 'all');
                        const txSnap = await getDoc(txRef);
                        let txs = [];
                        if (txSnap.exists()) {
                            txs = JSON.parse(txSnap.data().data);
                        }

                        const accs = JSON.parse(cloudData.accounts);
                        const cats = JSON.parse(cloudData.categories);
                        const budgs = JSON.parse(cloudData.budgets);
                        const recs = JSON.parse(cloudData.recurring);
                        const pms = JSON.parse(cloudData.paymentMethods);
                        const sets = JSON.parse(cloudData.settings);

                        lastSyncRef.current = JSON.stringify({ accounts: accs, transactions: txs, budgets: budgs, recurring: recs, categories: cats, paymentMethods: pms, settings: { ...sets, updatedAt: undefined, lastSyncedAt: undefined } });

                        setAccounts(accs);
                        setCategories(cats);
                        setBudgets(budgs);
                        setRecurring(recs);
                        setPaymentMethods(pms);
                        setTransactions(txs);
                        setSettings(sets);
                        console.log('Cloud data pull complete');
                    } else if (localUpdatedAt > cloudUpdatedAt) {
                        console.log('Local data is newer, scheduling push...');
                        lastSyncRef.current = ''; // Force push
                    } else {
                        console.log('Data is in sync');
                        lastSyncRef.current = JSON.stringify({ 
                            accounts: stateRef.current.accounts, 
                            transactions: stateRef.current.transactions, 
                            budgets: stateRef.current.budgets, 
                            recurring: stateRef.current.recurring, 
                            categories: stateRef.current.categories, 
                            paymentMethods: stateRef.current.paymentMethods, 
                            settings: { ...stateRef.current.settings, updatedAt: undefined, lastSyncedAt: undefined } 
                        });
                    }
                } else {
                    console.log('No cloud data found, starting fresh');
                    // Leave lastSyncRef empty so syncToCloud will push the initial data
                    lastSyncRef.current = '';
                }
            } catch (error) {
                console.error('Cloud sync pull error:', error);
            } finally {
                isCloudInitializedRef.current = true;
                setIsCloudInitialized(true);
            }
        }, (error) => {
            console.error('Snapshot listener error:', error);
            setIsCloudInitialized(true);
        });

        return () => unsubscribeMeta();
    }, [user]);

    // Auto-sync to Cloud
    useEffect(() => {
        if (!user || !isCloudInitialized) return;

        const syncToCloud = async () => {
            try {
                const currentData = JSON.stringify({ accounts, transactions, budgets, recurring, categories, paymentMethods, settings: { ...settings, updatedAt: undefined, lastSyncedAt: undefined } });
                
                // If lastSyncRef is empty, it means we haven't established a baseline yet.
                // We should only push if we have a baseline and the data has changed.
                if (lastSyncRef.current !== '' && currentData === lastSyncRef.current) return;

                const now = new Date().toISOString();
                const metaRef = doc(db, 'users', user.uid, 'backup', 'meta');
                const txRef = doc(db, 'users', user.uid, 'transactions', 'all');
                
                // Prepare metadata with current timestamp
                const updatedSettingsForCloud = { ...settings, updatedAt: now };
                const finalSettings = { ...updatedSettingsForCloud, lastSyncedAt: now };

                // Update stateRef synchronously to prevent race conditions with onSnapshot
                stateRef.current.settings = finalSettings;

                // 1. Write transactions first
                await setDoc(txRef, { data: JSON.stringify(transactions) });

                // 2. Write metadata last (this triggers onSnapshot on other devices)
                const metaData = {
                    accounts: JSON.stringify(accounts),
                    categories: JSON.stringify(categories),
                    budgets: JSON.stringify(budgets),
                    recurring: JSON.stringify(recurring),
                    paymentMethods: JSON.stringify(paymentMethods),
                    settings: JSON.stringify(updatedSettingsForCloud),
                    updatedAt: now
                };
                await setDoc(metaRef, metaData);
                
                // Update local settings
                setSettings(finalSettings);

                lastSyncRef.current = JSON.stringify({ accounts, transactions, budgets, recurring, categories, paymentMethods, settings: { ...finalSettings, updatedAt: undefined, lastSyncedAt: undefined } });
                console.log('Cloud backup successful');
            } catch (error) {
                console.error('Cloud backup failed:', error);
            }
        };

        const timer = setTimeout(syncToCloud, 100); // Very short debounce for "immediate" feel
        return () => clearTimeout(timer);
    }, [user, accounts, transactions, budgets, recurring, categories, paymentMethods, settings, isCloudInitialized]);

    useEffect(() => localStorage.setItem('accounts', JSON.stringify(accounts)), [accounts]);
    useEffect(() => localStorage.setItem('transactions', JSON.stringify(transactions)), [transactions]);
    useEffect(() => localStorage.setItem('budgets', JSON.stringify(budgets)), [budgets]);
    useEffect(() => localStorage.setItem('recurring', JSON.stringify(recurring)), [recurring]);
    useEffect(() => localStorage.setItem('categories', JSON.stringify(categories)), [categories]);
    useEffect(() => localStorage.setItem('settings', JSON.stringify(settings)), [settings]);
    useEffect(() => localStorage.setItem('paymentMethods', JSON.stringify(paymentMethods)), [paymentMethods]);

    // Data cleanup for invalid categories and ghost accounts
    useEffect(() => {
        // Cleanup Accounts (Unique IDs, non-null)
        setAccounts(prev => {
            const unique = new Map();
            let changed = false;
            prev.forEach(a => {
                if (!a || !a.id) { changed = true; return; }
                if (!unique.has(a.id)) unique.set(a.id, a);
                else changed = true;
            });
            return changed ? Array.from(unique.values()) : prev;
        });

        setTransactions(prev => {
            let changed = false;
            const valid = prev.map(t => {
                if (t.type === 'transfer') return t;
                const isValidCat = categories.some(c => c.name === t.category && c.type === t.type);
                if (!isValidCat) {
                    changed = true;
                    const defaultCat = categories.find(c => c.type === t.type);
                    return {
                        ...t,
                        category: defaultCat ? defaultCat.name : '',
                        subcategory: defaultCat && defaultCat.subcategories?.length > 0 ? defaultCat.subcategories[0] : ''
                    };
                }
                const catObj = categories.find(c => c.name === t.category && c.type === t.type);
                if (catObj && t.subcategory && !catObj.subcategories?.includes(t.subcategory)) {
                    changed = true;
                    return {
                        ...t,
                        subcategory: catObj.subcategories?.length > 0 ? catObj.subcategories[0] : ''
                    };
                }
                return t;
            });
            return changed ? valid : prev;
        });

        setRecurring(prev => {
            let changed = false;
            const valid = prev.map(r => {
                if (r.type === 'transfer') return r;
                const isValidCat = categories.some(c => c.name === r.category && c.type === r.type);
                if (!isValidCat) {
                    changed = true;
                    const defaultCat = categories.find(c => c.type === r.type);
                    return {
                        ...r,
                        category: defaultCat ? defaultCat.name : '',
                        subcategory: defaultCat && defaultCat.subcategories?.length > 0 ? defaultCat.subcategories[0] : ''
                    };
                }
                const catObj = categories.find(c => c.name === r.category && c.type === r.type);
                if (catObj && r.subcategory && !catObj.subcategories?.includes(r.subcategory)) {
                    changed = true;
                    return {
                        ...r,
                        subcategory: catObj.subcategories?.length > 0 ? catObj.subcategories[0] : ''
                    };
                }
                return r;
            });
            return changed ? valid : prev;
        });
    }, [categories]);

    const closeDialog = () => setDialog(prev => ({ ...prev, isOpen: false }));
    
    const showConfirm = (title: string, message: string, onConfirmCallback: () => void) => {
        setDialog({ isOpen: true, title, message, onConfirm: () => { onConfirmCallback(); closeDialog(); }, isAlert: false });
    };

    const showAlert = (title: string, message: string) => {
        setDialog({ isOpen: true, title, message, onConfirm: closeDialog, isAlert: true });
    };

    // Recurring transaction logic
    useEffect(() => {
        const checkRecurring = () => {
            const now = new Date();
            const limitDate = new Date(now.getFullYear() + 3, now.getMonth(), 1); 
            
            let newTx: any[] = [];
            let hasUpdates = false;

            const updatedRecurring = recurring.map(rule => {
                const isActive = rule.isActive !== undefined ? rule.isActive : rule.active;
                if (!isActive) return rule; 

                let currentRule = { ...rule };
                let lastRun = currentRule.lastRunDate ? new Date(currentRule.lastRunDate) : null;
                
                let iterations = 0;
                while(iterations < 48) { 
                    iterations++;
                    let nextDate;
                    if (lastRun) {
                        let y = lastRun.getFullYear();
                        let m = lastRun.getMonth() + 1;
                        const daysInMonth = new Date(y, m + 1, 0).getDate();
                        const targetDay = Math.min(rule.day, daysInMonth);
                        nextDate = new Date(y, m, targetDay);
                    } else {
                        const start = new Date(currentRule.startDate);
                        let y = start.getFullYear();
                        let m = start.getMonth();
                        if (start.getDate() > rule.day) m++;
                        const daysInMonth = new Date(y, m + 1, 0).getDate();
                        const targetDay = Math.min(rule.day, daysInMonth);
                        nextDate = new Date(y, m, targetDay);
                    }

                    if (nextDate > limitDate) break;
                    if (nextDate < new Date(currentRule.startDate)) {
                        lastRun = nextDate; 
                        continue; 
                    }
                    
                    const dateStr = formatDate(nextDate);
                    const exists = transactions.some(t => t.recurringRuleId === currentRule.id && t.date === dateStr);
                    
                    if (!exists) {
                        newTx.push({
                            id: generateId(),
                            date: dateStr,
                            amount: Number(currentRule.amount),
                            type: currentRule.type,
                            accountId: currentRule.accountId,
                            category: currentRule.category,
                            subcategory: currentRule.subcategory,
                            payee: currentRule.payee || '',
                            recurringRuleId: currentRule.id, 
                            budgetId: currentRule.budgetId,
                            paymentMethodId: currentRule.paymentMethodId || '',
                            note: (currentRule.note || currentRule.name) + ' (定期)',
                            isRecurring: true,
                            reconciled: false
                        });
                    }
                    lastRun = nextDate;
                    currentRule.lastRunDate = dateStr;
                    hasUpdates = true;
                }
                return currentRule;
            });

            if (newTx.length > 0 || hasUpdates) {
                setTransactions(prev => [...newTx, ...prev]);
                setRecurring(updatedRecurring);
            }
        };
        checkRecurring();
    }, [recurring.length, recurring.map(r => r.active).join(','), recurring.map(r => r.lastRunDate).join(',')]); 

    const handleSaveTransaction = (tx: any) => {
        const installmentCount = parseInt(tx.installmentCount);
        if (!tx.id && tx.type === 'expense' && installmentCount > 1) {
            const totalAmount = Number(tx.amount);
            const baseAmount = Math.floor(totalAmount / installmentCount);
            const remainder = totalAmount % installmentCount;
            const newTxList = [];
            const [y, m, d] = tx.date.split('-').map(Number);

            for (let i = 0; i < installmentCount; i++) {
                const amount = (i === 0) ? baseAmount + remainder : baseAmount;
                const targetDate = new Date(y, m - 1 + i, d);
                if (targetDate.getMonth() !== (m - 1 + i) % 12) targetDate.setDate(0); 
                const dateStr = formatDate(targetDate);

                newTxList.push({
                    id: generateId(),
                    date: dateStr,
                    type: tx.type,
                    amount: amount,
                    accountId: tx.accountId,
                    toAccountId: tx.toAccountId,
                    category: tx.category,
                    subcategory: tx.subcategory,
                    payee: tx.payee || '',
                    budgetId: tx.budgetId,
                    paymentMethodId: tx.paymentMethodId || '',
                    note: `${tx.note || ''} (分期 ${i + 1}/${installmentCount})`,
                    isInstallmentItem: true,
                    reconciled: false
                });
            }
            setTransactions(prev => [...newTxList, ...prev]);
        } else {
            const txData = { ...tx, amount: Number(tx.amount), isInstallmentItem: tx.isInstallmentItem || tx.isInstallment, reconciled: tx.reconciled || false };
            const shouldCreateRule = txData.setRecurring;
            delete txData.installmentCount; 
            delete txData.setRecurring;

            if (shouldCreateRule && !tx.id) {
                 const newRuleId = generateId();
                 setRecurring(prev => [...prev, {
                    id: newRuleId,
                    name: (txData.payee || txData.subcategory || txData.category) + ' (定期)',
                    day: new Date(txData.date).getDate(),
                    amount: txData.amount,
                    type: txData.type,
                    accountId: txData.accountId,
                    category: txData.category,
                    subcategory: txData.subcategory,
                    payee: txData.payee || '',
                    budgetId: txData.budgetId,
                    paymentMethodId: txData.paymentMethodId || '',
                    note: txData.note,
                    isActive: true,
                    startDate: txData.date,
                    frequency: '每月'
                }]);
                txData.recurringRuleId = newRuleId;
                showAlert('成功', '已新增至定期扣款管理');
            }

            if (txData.type === 'transfer' && txData.toAccountId) {
                const toAcc = accounts.find(a => a.id === txData.toAccountId);
                setSettings((prev: any) => ({
                    ...prev,
                    lastTransferPair: { from: txData.accountId, to: txData.toAccountId },
                    lastPaymentSources: toAcc && toAcc.type === 'credit' ? {
                        ...prev.lastPaymentSources,
                        [txData.toAccountId]: txData.accountId
                    } : prev.lastPaymentSources
                }));
            }

            if (txData.id) setTransactions(prev => prev.map(t => t.id === txData.id ? txData : t));
            else { txData.id = generateId(); setTransactions(prev => [txData, ...prev]); }
        }
    };

    const handleDeleteTransaction = (id: string) => {
        showConfirm('刪除交易', '確定刪除此交易？', () => {
            setTransactions(prev => prev.filter(t => t.id !== id));
        });
    };

    const [editingTx, setEditingTx] = useState<any>(null);
    const [txModalOpen, setTxModalOpen] = useState(false);

    const renderContent = () => {
        switch(view) {
            case 'dashboard': return <DashboardView viewDate={viewDate} setViewDate={setViewDate} settings={settings} setSettings={setSettings} transactions={transactions} budgets={budgets} setSubViewData={setSubViewData} setSubViewDate={setSubViewDate} setView={setView} />;
            case 'accounts': return <AccountsView accounts={accounts} setAccounts={setAccounts} transactions={transactions} setTransactions={setTransactions} settings={settings} setSettings={setSettings} setSubViewData={setSubViewData} setSubViewDate={setSubViewDate} setView={setView} showConfirm={showConfirm} setEditingTx={setEditingTx} setTxModalOpen={setTxModalOpen} />;
            case 'transactions': return <TransactionsView subViewDate={subViewDate} setSubViewDate={setSubViewDate} settings={settings} setSettings={setSettings} transactions={transactions} accounts={accounts} paymentMethods={paymentMethods} categories={categories} setEditingTx={setEditingTx} setTxModalOpen={setTxModalOpen} onDelete={handleDeleteTransaction} />;
            case 'budgets': return <BudgetsView budgets={budgets} setBudgets={setBudgets} categories={categories} setView={setView} showConfirm={showConfirm} />;
            case 'menu': return <MenuView setView={setView} setSubViewDate={setSubViewDate} accounts={accounts} transactions={transactions} budgets={budgets} recurring={recurring} categories={categories} paymentMethods={paymentMethods} settings={settings} setAccounts={setAccounts} setTransactions={setTransactions} setBudgets={setBudgets} setRecurring={setRecurring} setCategories={setCategories} setPaymentMethods={setPaymentMethods} setSettings={setSettings} showAlert={showAlert} showConfirm={showConfirm} />;
            case 'recurring': return <RecurringView recurring={recurring} setRecurring={setRecurring} setTransactions={setTransactions} budgets={budgets} accounts={accounts} paymentMethods={paymentMethods} categories={categories} setView={setView} showConfirm={showConfirm} />;
            case 'paymentMethods': return <PaymentMethodsView paymentMethods={paymentMethods} setPaymentMethods={setPaymentMethods} setView={setView} showAlert={showAlert} showConfirm={showConfirm} />;
            case 'reconcile': 
                return <ReconcileView 
                    accounts={accounts} transactions={transactions} paymentMethods={paymentMethods} categories={categories}
                    subViewData={subViewData} setSubViewData={setSubViewData}
                    subViewDate={subViewDate} setSubViewDate={setSubViewDate}
                    defaultClosingDay={settings.cycleStartDay}
                    setView={setView} onToggleReconcile={(id: string) => setTransactions(prev => prev.map(t => t.id === id ? { ...t, reconciled: !t.reconciled } : t))}
                    setEditingTx={setEditingTx} setTxModalOpen={setTxModalOpen} onDelete={handleDeleteTransaction}
                />;
            case 'categories': return <CategoryView categories={categories} setCategories={setCategories} setView={setView} showAlert={showAlert} showConfirm={showConfirm} />;
            case 'accountDetail': 
                 return <AccountDetailView accounts={accounts} transactions={transactions} paymentMethods={paymentMethods} categories={categories} subViewData={subViewData} subViewDate={subViewDate} setSubViewDate={setSubViewDate} settings={settings} setAccounts={setAccounts} setView={setView} setEditingTx={setEditingTx} setTxModalOpen={setTxModalOpen} onDelete={handleDeleteTransaction} />;
             case 'budgetDetail':
                 return <BudgetDetailView budgets={budgets} transactions={transactions} accounts={accounts} paymentMethods={paymentMethods} categories={categories} subViewData={subViewData} subViewDate={subViewDate} setSubViewDate={setSubViewDate} setView={setView} setEditingTx={setEditingTx} setTxModalOpen={setTxModalOpen} onDelete={handleDeleteTransaction} />;
            default: return <DashboardView viewDate={viewDate} setViewDate={setViewDate} settings={settings} setSettings={setSettings} transactions={transactions} budgets={budgets} setSubViewData={setSubViewData} setSubViewDate={setSubViewDate} setView={setView} />;
        }
    };

    if (user && !isCloudInitialized) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">正在同步雲端資料...</h2>
                <p className="text-slate-500">請稍候，正在確保您的資料為最新狀態</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-background-light relative">
            <header className="px-5 py-4 pt-safe-top bg-white border-b border-gray-100 flex justify-between items-center sticky top-0 z-10 shrink-0">
                <div className="flex items-center gap-2">
                    <img 
                        src="/icon.png" 
                        alt="Logo" 
                        className="w-8 h-8 rounded-lg object-cover"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                    <h1 className="text-xl font-black text-primary tracking-tight">MyMoney</h1>
                </div>
            </header>
            <main className="flex-1 overflow-y-auto p-4 pb-32">
                {renderContent()}
            </main>
            
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 grid grid-cols-5 items-center pb-safe pt-2 z-40">
                <button onClick={() => setView('dashboard')} className={`flex flex-col items-center w-full py-1 active:scale-95 transition-transform ${view === 'dashboard' ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}>
                    <Icon name="dashboard" className={view === 'dashboard' ? 'filled' : ''} />
                    <span className="text-[10px] font-bold mt-0.5">首頁</span>
                </button>
                <button onClick={() => setView('accounts')} className={`flex flex-col items-center w-full py-1 active:scale-95 transition-transform ${view === 'accounts' ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}>
                    <Icon name="account_balance_wallet" className={view === 'accounts' ? 'filled' : ''} />
                    <span className="text-[10px] font-bold mt-0.5">帳戶</span>
                </button>
                
                <div className="relative -top-6 flex justify-center w-full">
                    <button 
                        onClick={() => { 
                            if (accounts.length === 0) {
                                showAlert('提示', '請先至「帳戶」分頁新增至少一個帳戶，才能開始記帳。');
                                return;
                            }
                            const defaultCat = categories.find(c=>c.type==='expense')?.name || '';
                            const matchingBudget = budgets.find(b => b.targetCategories?.includes(defaultCat));
                            
                            setEditingTx({ date: formatDate(new Date()), type: 'expense', amount: '', payee: '', paymentMethodId: '', accountId: accounts.find(a => a.type !== 'credit')?.id || accounts[0]?.id, category: defaultCat, subcategory: categories.find(c=>c.type==='expense')?.subcategories?.[0] || '', budgetId: matchingBudget ? matchingBudget.id : '', note: '' }); 
                            setTxModalOpen(true); 
                        }} 
                        className="w-14 h-14 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-transform hover:bg-primary-hover border-4 border-white"
                    >
                        <Icon name="add" size="text-3xl" />
                    </button>
                </div>

                <button onClick={() => { if(view !== 'transactions') setSubViewDate(getInitialDateForCycle(settings.cycleStartDay)); setView('transactions'); }} className={`flex flex-col items-center w-full py-1 active:scale-95 transition-transform ${view === 'transactions' ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}>
                    <Icon name="receipt_long" className={view === 'transactions' ? 'filled' : ''} />
                    <span className="text-[10px] font-bold mt-0.5">明細</span>
                </button>
                <button onClick={() => setView('menu')} className={`flex flex-col items-center w-full py-1 active:scale-95 transition-transform ${view === 'menu' ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}>
                    <Icon name="menu" className={view === 'menu' ? 'filled' : ''} />
                    <span className="text-[10px] font-bold mt-0.5">更多</span>
                </button>
            </nav>

            <TransactionFormModal isOpen={txModalOpen} onClose={() => setTxModalOpen(false)} initialData={editingTx} onSave={handleSaveTransaction} onDelete={handleDeleteTransaction} accounts={accounts} paymentMethods={paymentMethods} categories={categories} budgets={budgets} showAlert={showAlert} settings={settings} transactions={transactions} />
            <ConfirmDialog isOpen={dialog.isOpen} title={dialog.title} message={dialog.message} onConfirm={dialog.onConfirm} onCancel={closeDialog} isAlert={dialog.isAlert} />
        </div>
    );
}

