import React from 'react';
import { Icon } from '../components/Icon';
import { formatMoney, parseDate } from '../utils';

export const InstallmentsView = ({ setView, transactions }: any) => {
    // Find all installment transactions
    const installmentTxs = transactions.filter((t: any) => t.isInstallmentItem);

    // Group by base note and payee
    const groups: Record<string, any[]> = {};
    const regex = /(.*?)\s*\(分期 (\d+)\/(\d+)\)$/;

    installmentTxs.forEach((t: any) => {
        const match = t.note?.match(regex);
        if (match) {
            const baseNote = match[1].trim();
            const current = parseInt(match[2]);
            const total = parseInt(match[3]);
            const key = `${t.payee || '未知對象'}_${baseNote}_${total}`;
            
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push({ ...t, current, total, baseNote });
        } else {
            // Fallback if note doesn't match exactly
            const key = `${t.payee || '未知對象'}_${t.note || '未分類分期'}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push({ ...t, current: 1, total: 1, baseNote: t.note });
        }
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
        <div className="space-y-4 h-full flex flex-col">
            <div className="flex items-center gap-3 px-1 shrink-0">
                <button onClick={() => setView('menu')} className="p-2 -ml-2 text-gray-400 hover:text-dark transition-colors">
                    <Icon name="arrow_back" size="text-2xl" />
                </button>
                <h2 className="text-xl sm:text-2xl font-black text-dark tracking-tight">分期付款追蹤</h2>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pb-20">
                {Object.keys(groups).length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                        <Icon name="credit_card" size="text-4xl" className="mb-2 opacity-50" />
                        <p>目前沒有分期付款紀錄</p>
                    </div>
                ) : (
                    Object.keys(groups).map(key => {
                        const txs = groups[key].sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime());
                        const totalAmount = txs.reduce((sum, t) => sum + Number(t.amount), 0);
                        const paidTxs = txs.filter(t => parseDate(t.date) < today);
                        const paidAmount = paidTxs.reduce((sum, t) => sum + Number(t.amount), 0);
                        const remainingAmount = totalAmount - paidAmount;
                        const totalCount = txs[0].total;
                        const paidCount = paidTxs.length;

                        return (
                            <div key={key} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="font-bold text-dark text-lg">{txs[0].payee || '未知對象'}</h3>
                                        <p className="text-sm text-gray-500">{txs[0].baseNote || '無備註'}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-bold text-primary">總額 {formatMoney(totalAmount)}</div>
                                        <div className="text-xs text-gray-400">共 {totalCount} 期</div>
                                    </div>
                                </div>

                                <div className="space-y-2 mb-4">
                                    <div className="flex justify-between text-xs font-medium">
                                        <span className="text-gray-500">已付 {paidCount} 期 ({formatMoney(paidAmount)})</span>
                                        <span className="text-danger">剩餘 {totalCount - paidCount} 期 ({formatMoney(remainingAmount)})</span>
                                    </div>
                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-primary transition-all duration-500" 
                                            style={{ width: `${Math.min((paidCount / totalCount) * 100, 100)}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-xs font-bold text-gray-400 mb-1">近期期數</p>
                                    {txs.filter(t => parseDate(t.date) >= today).slice(0, 3).map(t => (
                                        <div key={t.id} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-gray-500 w-12">{t.date.substring(5)}</span>
                                                <span className="text-dark">第 {t.current} 期</span>
                                            </div>
                                            <span className="font-bold text-danger">{formatMoney(t.amount)}</span>
                                        </div>
                                    ))}
                                    {txs.filter(t => parseDate(t.date) >= today).length > 3 && (
                                        <div className="text-center text-xs text-gray-400 pt-1">
                                            還有 {txs.filter(t => parseDate(t.date) >= today).length - 3} 期未顯示...
                                        </div>
                                    )}
                                    {txs.filter(t => parseDate(t.date) >= today).length === 0 && (
                                        <div className="text-center text-xs text-success font-bold pt-1">
                                            🎉 已全數繳清！
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
