import React from 'react';
import { Icon } from './Icon';

export const Modal = ({ isOpen, onClose, title, children, maxWidth = "max-w-lg", fullMobile = false }: any) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 modal-backdrop animate-fade-in sm:p-4 p-0">
            <div className={`bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full ${maxWidth} ${fullMobile ? 'h-full sm:h-auto rounded-none sm:rounded-2xl' : 'max-h-[90vh]'} flex flex-col overflow-hidden relative`}>
                 <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center shrink-0 bg-white sticky top-0 z-10">
                    <h3 className="text-lg font-bold text-dark">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors">
                        <Icon name="close" size="text-xl" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50/50">
                    {children}
                </div>
            </div>
        </div>
    );
};
