import React from 'react';
import { Icon } from './Icon';
import { formatMoney } from '../utils';

export const TransactionItem = ({ t, onClick, onCopy, onDelete, accounts, paymentMethods = [], showAccountBadge = false }: any) => {
    const getAvatarInfo = (type: string) => {
        if (type === 'transfer') return { bg: 'bg-blue-50', color: 'text-primary' };
        if (type === 'income') return { bg: 'bg-green-50', color: 'text-success' };
        return { bg: 'bg-red-50', color: 'text-danger' };
    };
    const info = getAvatarInfo(t.type);
    const tAccName = accounts?.find((a: any) => String(a.id) === String(t.accountId))?.name;
    const tPaymentMethod = paymentMethods?.find((pm: any) => String(pm.id) === String(t.paymentMethodId));

    const displayTitle = t.payee || t.note || (t.type === 'transfer' ? '轉帳' : (t.subcategory || t.category || '未分類'));
    const showNoteInSubtitle = t.note && t.note !== displayTitle;
    const amountPrefix = t.isNeutral ? '' : (t.displayNegative ? '-' : '+');
    const amountColor = t.reconciled ? 'text-gray-300' : (t.isNeutral ? 'text-gray-500' : (t.displayNegative ? 'text-danger' : 'text-success'));

    return (
        <label onClick={onClick} className="flex justify-between p-4 border-b border-gray-50 last:border-0 items-center cursor-pointer hover:bg-gray-50 transition-colors checkbox-wrapper select-none group">
            <div className="flex items-center gap-3 flex-1 overflow-hidden mr-2">
                {t.onToggleReconcile && (
                    <div className="relative shrink-0 mr-1" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={!!t.reconciled} onChange={() => t.onToggleReconcile(t.id)} className="peer appearance-none w-5 h-5 border-2 border-gray-300 rounded-md checked:bg-primary checked:border-primary transition-colors absolute opacity-0" />
                        <div className="w-6 h-6 border-2 border-gray-300 rounded-lg flex items-center justify-center transition-colors">
                                <Icon name="check" size="text-sm" className="text-white hidden pointer-events-none" />
                        </div>
                    </div>
                )}
                <div className={`size-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${info.bg} ${info.color}`}>
                    {t.category ? t.category.substring(0, 2) : (t.type === 'transfer' ? '轉帳' : '其他')}
                </div>
                <div className="flex flex-col overflow-hidden">
                    <div className={`font-bold text-sm truncate ${t.reconciled ? 'text-gray-400 line-through' : 'text-dark group-hover:text-primary transition-colors'}`}>
                        {displayTitle}
                    </div>
                    <div className="text-xs text-gray-400 flex items-center gap-1.5 flex-wrap mt-0.5">
                        <span className="shrink-0">{t.date}</span>
                        {t.category && <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] text-gray-500 shrink-0">{t.category}{t.subcategory ? `·${t.subcategory}` : ''}</span>}
                        {showAccountBadge && tAccName && <span className="px-1.5 py-0.5 bg-primary/5 text-primary rounded text-[10px] shrink-0">{tAccName}</span>}
                        {tPaymentMethod && t.type !== 'transfer' && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] shrink-0">
                                <Icon name={tPaymentMethod.icon} size="text-[10px]" /> {tPaymentMethod.name}
                            </span>
                        )}
                        {showNoteInSubtitle && (
                            <>
                                <span className="w-1 h-1 rounded-full bg-gray-300 shrink-0"></span>
                                <span className="truncate max-w-[120px]">{t.note}</span>
                            </>
                        )}
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
                <span className={`font-bold ${amountColor}`}>
                    {amountPrefix}{formatMoney(t.amount)}
                </span>
                {onCopy && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onCopy(t); }}
                        className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="複製交易"
                    >
                        <Icon name="content_copy" size="text-sm" />
                    </button>
                )}
                {onClick && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onClick(); }}
                        className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="編輯交易"
                    >
                        <Icon name="edit" size="text-sm" />
                    </button>
                )}
                {onDelete && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(t.id); }}
                        className="p-1.5 text-gray-400 hover:text-danger hover:bg-danger/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="刪除交易"
                    >
                        <Icon name="delete" size="text-sm" />
                    </button>
                )}
            </div>
        </label>
    );
};
