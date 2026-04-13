import React from 'react';
import { Icon } from './Icon';
import { formatMoney } from '../utils';

export const TransactionItem = ({ t, onClick, onCopy, onDelete, accounts, paymentMethods = [], categories = [], showAccountBadge = false }: any) => {
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
        <div onClick={onClick} className="flex justify-between p-3 sm:p-4 border-b border-gray-50 last:border-0 items-center cursor-pointer hover:bg-gray-50 transition-colors checkbox-wrapper select-none group">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 overflow-hidden mr-2">
                {t.onToggleReconcile && (
                    <div className="relative shrink-0 mr-1" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={!!t.reconciled} onChange={() => t.onToggleReconcile(t.id)} className="peer appearance-none w-5 h-5 border-2 border-gray-300 rounded-md checked:bg-primary checked:border-primary transition-colors absolute opacity-0" />
                        <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-gray-300 rounded-lg flex items-center justify-center transition-colors">
                                <Icon name="check" size="text-[10px] sm:text-sm" className="text-white hidden pointer-events-none" />
                        </div>
                    </div>
                )}
                <div className={`size-8 sm:size-10 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold shrink-0 overflow-hidden ${info.bg} ${info.color}`}>
                    {t.category ? (
                        (() => {
                            // Find the category object to check for custom icon
                            // We need to pass categories to TransactionItem to do this properly.
                            // But wait, the categories are not passed to TransactionItem currently.
                            // Let's modify TransactionItem to accept categories.
                            const catObj = categories?.find((c: any) => c.name === t.category && c.type === t.type);
                            if (catObj?.customIcon) {
                                return <img src={catObj.customIcon} alt={t.category} className="w-full h-full object-cover" />;
                            } else if (catObj?.icon) {
                                return <Icon name={catObj.icon} size="text-lg sm:text-xl" />;
                            }
                            return t.category.substring(0, 2);
                        })()
                    ) : (t.type === 'transfer' ? '轉帳' : '其他')}
                </div>
                <div className="flex flex-col overflow-hidden">
                    <div className={`font-bold text-xs sm:text-sm truncate ${t.reconciled ? 'text-gray-400 line-through' : 'text-dark group-hover:text-primary transition-colors'}`}>
                        {displayTitle}
                    </div>
                    <div className="text-[10px] sm:text-xs text-gray-400 flex items-center gap-1 sm:gap-1.5 flex-wrap mt-0.5">
                        <span className="shrink-0">{t.date}</span>
                        {t.category && <span className="px-1 py-0.5 bg-gray-100 rounded text-[9px] sm:text-[10px] text-gray-500 shrink-0">{t.category}{t.subcategory ? `·${t.subcategory}` : ''}</span>}
                        {showAccountBadge && tAccName && <span className="px-1 py-0.5 bg-primary/5 text-primary rounded text-[9px] sm:text-[10px] shrink-0">{tAccName}</span>}
                        {tPaymentMethod && t.type !== 'transfer' && (
                            <span className="flex items-center gap-0.5 px-1 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] sm:text-[10px] shrink-0">
                                {tPaymentMethod.customIcon ? (
                                    <img src={tPaymentMethod.customIcon} alt={tPaymentMethod.name} className="w-3 h-3 rounded-full object-cover" />
                                ) : (
                                    <Icon name={tPaymentMethod.icon} size="text-[9px] sm:text-[10px]" />
                                )}
                                {tPaymentMethod.name}
                            </span>
                        )}
                        {showNoteInSubtitle && (
                            <>
                                <span className="w-1 h-1 rounded-full bg-gray-300 shrink-0"></span>
                                <span className="truncate max-w-[80px] sm:max-w-[120px]">{t.note}</span>
                            </>
                        )}
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-3 shrink-0">
                <div className="flex flex-col items-end mr-1 sm:mr-2">
                    <span className={`font-bold text-xs sm:text-base ${amountColor}`}>
                        {amountPrefix}{formatMoney(t.amount)}
                    </span>
                    {t.reconciled && <span className="text-[8px] sm:text-[9px] text-gray-300 font-medium">已對帳</span>}
                </div>
                <div className="flex items-center gap-0.5 sm:gap-1">
                    {onCopy && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onCopy(t); }}
                            className="p-1 sm:p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors active:bg-primary/20"
                            title="複製交易"
                        >
                            <Icon name="content_copy" size="text-[14px] sm:text-sm" />
                        </button>
                    )}
                    {onClick && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onClick(); }}
                            className="p-1 sm:p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors active:bg-primary/20"
                            title="編輯交易"
                        >
                            <Icon name="edit" size="text-[14px] sm:text-sm" />
                        </button>
                    )}
                    {onDelete && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDelete(t.id); }}
                            className="p-1 sm:p-1.5 text-gray-400 hover:text-danger hover:bg-danger/10 rounded-lg transition-colors active:bg-danger/20"
                            title="刪除交易"
                        >
                            <Icon name="delete" size="text-[14px] sm:text-sm" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
