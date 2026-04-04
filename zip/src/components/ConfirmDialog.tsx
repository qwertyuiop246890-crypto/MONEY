import React from 'react';

export const ConfirmDialog = ({ isOpen, title, message, onConfirm, onCancel, isAlert }: any) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-backdrop">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-5 flex flex-col gap-4 animate-scale-in">
                <div className="text-center">
                    <h3 className="text-lg font-bold text-dark mb-2">{title}</h3>
                    <p className="text-sm text-gray-500 whitespace-pre-line">{message}</p>
                </div>
                <div className="flex gap-3">
                    {!isAlert && (
                        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-bold text-sm active:bg-gray-200 transition-colors">取消</button>
                    )}
                    <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl bg-primary text-white font-bold text-sm shadow-lg shadow-primary/30 active:scale-95 transition-transform">
                        {isAlert ? '知道了' : '確定'}
                    </button>
                </div>
            </div>
        </div>
    );
};
