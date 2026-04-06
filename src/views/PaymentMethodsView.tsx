import React, { useState, useRef } from 'react';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import { generateId } from '../utils';

export const PaymentMethodsView = ({ paymentMethods, setPaymentMethods, setView, showAlert, showConfirm }: any) => {
    const [modalOpen, setModalOpen] = useState(false);
    const [editingPM, setEditingPM] = useState({ id: '', name: '', icon: 'payments', customIcon: '' });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const availableIcons = [
        'payments', 'credit_card', 'qr_code_scanner', 'contactless', 
        'account_balance_wallet', 'phone_iphone', 'account_balance', 'redeem'
    ];

    const handleSave = () => {
        if (!editingPM.name.trim()) return showAlert('錯誤', '請輸入名稱');
        if (editingPM.id) {
            setPaymentMethods((prev: any) => prev.map((p: any) => p.id === editingPM.id ? editingPM : p));
        } else {
            setPaymentMethods((prev: any) => [...prev, { ...editingPM, id: generateId() }]);
        }
        setModalOpen(false);
    };

    const handleDelete = (id: string) => {
        showConfirm('刪除支付方式', '刪除後，相關交易的標籤將會隱藏，確定刪除嗎？', () => {
            setPaymentMethods((prev: any) => prev.filter((p: any) => p.id !== id));
        });
    };

    const movePM = (id: string, direction: 'up' | 'down') => {
        const index = paymentMethods.findIndex((p: any) => p.id === id);
        if (index < 0) return;
        const newPMs = [...paymentMethods];
        if (direction === 'up' && index > 0) {
            [newPMs[index - 1], newPMs[index]] = [newPMs[index], newPMs[index - 1]];
        } else if (direction === 'down' && index < newPMs.length - 1) {
            [newPMs[index + 1], newPMs[index]] = [newPMs[index], newPMs[index + 1]];
        }
        setPaymentMethods(newPMs);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_SIZE = 120;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_SIZE) {
                        height *= MAX_SIZE / width;
                        width = MAX_SIZE;
                    }
                } else {
                    if (height > MAX_SIZE) {
                        width *= MAX_SIZE / height;
                        height = MAX_SIZE;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL('image/png');
                    setEditingPM({ ...editingPM, customIcon: dataUrl, icon: '' });
                }
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="space-y-4 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4 shrink-0">
                <div className="flex items-center gap-2">
                    <button onClick={() => setView('menu')} className="p-1 -ml-1"><Icon name="arrow_back" /></button>
                    <h2 className="text-xl font-bold">多元支付方式管理</h2>
                </div>
                <button onClick={() => { setEditingPM({ id: '', name: '', icon: 'payments', customIcon: '' }); setModalOpen(true); }} className="text-primary"><Icon name="add_circle" size="text-3xl" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-2 px-1">自訂您常用的支付媒介 (如 LINE Pay、街口)，記帳時可與資金帳戶分開選擇，更精確追蹤消費習慣。</p>

            <div className="flex-1 overflow-y-auto space-y-3 pb-20">
                {paymentMethods.map((pm: any) => (
                    <div key={pm.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center group">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 overflow-hidden">
                                {pm.customIcon ? (
                                    <img src={pm.customIcon} alt={pm.name} className="w-full h-full object-cover" />
                                ) : (
                                    <Icon name={pm.icon || 'payments'} size="text-xl" />
                                )}
                            </div>
                            <span className="font-bold text-lg text-dark">{pm.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex flex-col gap-0.5 mr-2">
                                <button onClick={() => movePM(pm.id, 'up')} className="text-gray-300 hover:text-primary leading-none"><Icon name="arrow_drop_up" size="text-xl"/></button>
                                <button onClick={() => movePM(pm.id, 'down')} className="text-gray-300 hover:text-primary leading-none"><Icon name="arrow_drop_down" size="text-xl"/></button>
                            </div>
                            <button onClick={() => { setEditingPM({ customIcon: '', ...pm }); setModalOpen(true); }} className="p-1 text-gray-400 hover:text-primary"><Icon name="edit" size="text-xl"/></button>
                            <button onClick={() => handleDelete(pm.id)} className="p-1 text-gray-400 hover:text-danger"><Icon name="delete" size="text-xl"/></button>
                        </div>
                    </div>
                ))}
                {paymentMethods.length === 0 && <div className="text-center py-10 text-gray-400">目前沒有設定任何支付方式</div>}
            </div>

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingPM.id ? "編輯支付方式" : "新增支付方式"}>
                <div className="p-6 space-y-5">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">支付方式名稱 <span className="text-danger">*</span></label>
                        <input className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary outline-none" placeholder="例如：LINE Pay" value={editingPM.name || ''} onChange={e => setEditingPM({...editingPM, name: e.target.value})} />
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-bold text-gray-700">選擇圖示</label>
                            <button onClick={() => fileInputRef.current?.click()} className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-md flex items-center gap-1">
                                <Icon name="upload" size="text-sm" /> 上傳自訂圖示
                            </button>
                            <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleImageUpload} />
                        </div>
                        
                        {editingPM.customIcon && (
                            <div className="mb-4 flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-gray-200">
                                    <img src={editingPM.customIcon} alt="Custom Icon" className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-dark">已選擇自訂圖示</p>
                                </div>
                                <button onClick={() => setEditingPM({...editingPM, customIcon: '', icon: 'payments'})} className="text-danger text-sm font-bold p-2">移除</button>
                            </div>
                        )}

                        <div className={`grid grid-cols-4 gap-3 ${editingPM.customIcon ? 'opacity-50 pointer-events-none' : ''}`}>
                            {availableIcons.map(icon => (
                                <div key={icon} onClick={() => setEditingPM({...editingPM, icon, customIcon: ''})} className={`cursor-pointer flex justify-center items-center py-3 rounded-lg border-2 transition-all ${editingPM.icon === icon && !editingPM.customIcon ? 'border-primary bg-primary/10 text-primary' : 'border-gray-100 bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>
                                    <Icon name={icon} size="text-2xl" />
                                </div>
                            ))}
                        </div>
                    </div>
                    <button onClick={handleSave} className="w-full py-3 bg-primary text-white font-bold rounded-lg shadow-lg active:scale-95 transition-transform mt-4">儲存支付方式</button>
                </div>
            </Modal>
        </div>
    );
};

