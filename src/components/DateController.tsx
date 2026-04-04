import React from 'react';
import { Icon } from './Icon';
import { formatDate } from '../utils';

export const DateController = ({ currentDate, onChangeDate, cycleStart, cycleEnd, cycleDay, onCycleDayChange, isCreditCard = false, creditCardInfo = null, showTotal = false, periodTotal = 0 }: any) => {
    return (
        <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-3 shrink-0">
            <div className="flex justify-between items-center">
                <button onClick={() => onChangeDate(-1)} className="p-2 rounded-full hover:bg-gray-100"><Icon name="chevron_left" /></button>
                <div className="text-center">
                    <div className="font-bold text-lg text-dark">
                        {currentDate.getFullYear()}年 {currentDate.getMonth() + 1}月
                    </div>
                    <div className="text-xs text-gray-500">
                        {formatDate(cycleStart)} ~ {formatDate(cycleEnd)}
                    </div>
                </div>
                <button onClick={() => onChangeDate(1)} className="p-2 rounded-full hover:bg-gray-100"><Icon name="chevron_right" /></button>
            </div>
            
            <div className="flex flex-col bg-gray-50 rounded-xl overflow-hidden">
                <div className={`flex items-center justify-between px-3 py-2 ${showTotal ? 'border-b border-gray-200/50' : ''}`}>
                    {isCreditCard ? (
                        <>
                            <span className="text-xs text-gray-500 font-medium">{creditCardInfo ? '帳單資訊' : '每月結帳日'}</span>
                            <div className="text-sm font-bold text-primary">
                                {creditCardInfo || '依結帳日計算'}
                            </div>
                        </>
                    ) : (
                        <>
                            <span className="text-xs text-gray-500 font-medium">每月結帳日</span>
                            <div className="flex items-center gap-1">
                                <span className="text-sm font-bold text-primary">每月</span>
                                <select 
                                    className="bg-transparent bg-none clean-select text-sm font-bold text-primary outline-none border-none p-0 pr-1 text-right cursor-pointer appearance-none text-center" 
                                    value={cycleDay} 
                                    onChange={e => onCycleDayChange(e.target.value)}
                                    style={{ textAlignLast: 'center' }} 
                                >
                                    {[...Array(31)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
                                </select>
                                <span className="text-sm font-bold text-primary">號</span>
                            </div>
                        </>
                    )}
                </div>
                {showTotal && (
                    <div className="flex items-center justify-between px-3 py-2 bg-gray-50/50">
                        <span className="text-xs text-gray-500 font-medium">區間總額</span>
                        <span className={`text-sm font-bold ${periodTotal > 0 ? 'text-success' : periodTotal < 0 ? 'text-danger' : 'text-dark'}`}>
                            {periodTotal > 0 ? '+' : ''}{new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0 }).format(periodTotal)}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};
