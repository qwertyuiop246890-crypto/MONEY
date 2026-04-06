import React, { useState, useRef } from 'react';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import { generateId } from '../utils';

export const CategoryView = ({ categories, setCategories, setView, showAlert, showConfirm }: any) => {
    const [tab, setTab] = useState('expense');
    const [modal, setModal] = useState(false);
    const [tempCat, setTempCat] = useState({ id: '', name: '', subcategoriesStr: '', icon: 'label', customIcon: '' });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const availableIcons = [
        'label', 'restaurant', 'shopping_cart', 'directions_car', 'home', 
        'checkroom', 'sports_esports', 'health_and_safety', 'school', 'pets',
        'flight', 'local_hospital', 'account_balance', 'attach_money', 'card_giftcard'
    ];

    const currentCats = categories.filter((c: any) => c.type === tab);

    const save = () => {
        const catName = tempCat.name.trim();
        if(!catName) return;
        
        const isDuplicate = categories.some((c: any) => c.type === tab && c.name === catName && c.id !== tempCat.id);
        if (isDuplicate) {
            showAlert('名稱重複', '已經有相同名稱的主分類，請使用其他名稱！');
            return;
        }

        const subs = tempCat.subcategoriesStr.split(',').map(s => s.trim()).filter(Boolean);
        
        if(tempCat.id) {
            setCategories((prev: any) => prev.map((c: any) => c.id === tempCat.id ? { ...c, name: catName, subcategories: subs, icon: tempCat.icon, customIcon: tempCat.customIcon } : c));
        } else {
            setCategories((prev: any) => [...prev, { id: generateId(), name: catName, type: tab, subcategories: subs, icon: tempCat.icon, customIcon: tempCat.customIcon }]);
        }
        setModal(false);
    };

    const del = (id: string) => {
        showConfirm('刪除主分類', '這可能影響現有紀錄，確定刪除嗎？', () => {
            setCategories((prev: any) => prev.filter((c: any) => c.id !== id));
        });
    };

    const moveCategory = (id: string, direction: 'up' | 'down') => {
        const visibleCats = categories.filter((c: any) => c.type === tab);
        const currentIndex = visibleCats.findIndex((c: any) => c.id === id);
        if (currentIndex === -1) return;

        let targetIndex = -1;
        if (direction === 'up' && currentIndex > 0) targetIndex = currentIndex - 1;
        if (direction === 'down' && currentIndex < visibleCats.length - 1) targetIndex = currentIndex + 1;

        if (targetIndex === -1) return;

        const itemA = visibleCats[currentIndex];
        const itemB = visibleCats[targetIndex];

        const indexA = categories.findIndex((c: any) => c.id === itemA.id);
        const indexB = categories.findIndex((c: any) => c.id === itemB.id);

        const newCats = [...categories];
        [newCats[indexA], newCats[indexB]] = [newCats[indexB], newCats[indexA]];
        setCategories(newCats);
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
                    setTempCat({ ...tempCat, customIcon: dataUrl, icon: '' });
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
                    <h2 className="text-xl font-bold">分類管理中心</h2>
                </div>
                <button onClick={() => { setTempCat({ id: '', name: '', subcategoriesStr: '', icon: 'label', customIcon: '' }); setModal(true); }} className="text-primary"><Icon name="add_circle" size="text-3xl" /></button>
            </div>
            <div className="flex bg-gray-200 rounded-xl p-1 shrink-0">
                {['expense', 'income'].map(t => (
                    <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${tab === t ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                        {t === 'expense' ? '支出' : '收入'}
                    </button>
                ))}
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pb-20">
                {currentCats.map((c: any) => (
                    <div key={c.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3 group">
                        <div className="flex justify-between items-center">
                            <span className="font-extrabold text-dark text-lg flex items-center gap-2">
                                {c.customIcon ? (
                                    <img src={c.customIcon} alt={c.name} className="w-6 h-6 rounded-full object-cover" />
                                ) : (
                                    <Icon name={c.icon || 'label'} size="text-xl" className="text-primary"/>
                                )}
                                {c.name}
                            </span>
                            <div className="flex items-center gap-2">
                                <div className="flex flex-col gap-0.5 mr-2">
                                    <button onClick={() => moveCategory(c.id, 'up')} className="text-gray-300 hover:text-primary leading-none"><Icon name="arrow_drop_up" size="text-xl"/></button>
                                    <button onClick={() => moveCategory(c.id, 'down')} className="text-gray-300 hover:text-primary leading-none"><Icon name="arrow_drop_down" size="text-xl"/></button>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => { setTempCat({...c, subcategoriesStr: (c.subcategories || []).join(', '), icon: c.icon || 'label', customIcon: c.customIcon || '' }); setModal(true); }} className="p-1 text-gray-400 hover:text-primary"><Icon name="edit" size="text-xl"/></button>
                                    <button onClick={() => del(c.id)} className="p-1 text-gray-400 hover:text-danger"><Icon name="delete" size="text-xl"/></button>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {(c.subcategories && c.subcategories.length > 0) ? c.subcategories.map((sub: string, i: number) => (
                                <span key={i} className="px-2 py-1 bg-gray-50 border border-gray-100 text-gray-600 rounded-md text-xs font-medium">{sub}</span>
                            )) : <span className="text-xs text-gray-400 italic">無子分類</span>}
                        </div>
                    </div>
                ))}
            </div>
             <Modal isOpen={modal} onClose={() => setModal(false)} title={tempCat.id ? "編輯主/子分類" : "新增主/子分類"}>
                <div className="p-6 space-y-5">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">主分類名稱 <span className="text-danger">*</span></label>
                        <input className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary outline-none" placeholder="例如：生活費" value={tempCat.name || ''} onChange={e => setTempCat({...tempCat, name: e.target.value})} />
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-bold text-gray-700">選擇主分類圖示</label>
                            <button onClick={() => fileInputRef.current?.click()} className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-md flex items-center gap-1">
                                <Icon name="upload" size="text-sm" /> 上傳自訂圖示
                            </button>
                            <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleImageUpload} />
                        </div>
                        
                        {tempCat.customIcon && (
                            <div className="mb-4 flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-gray-200">
                                    <img src={tempCat.customIcon} alt="Custom Icon" className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-dark">已選擇自訂圖示</p>
                                </div>
                                <button onClick={() => setTempCat({...tempCat, customIcon: '', icon: 'label'})} className="text-danger text-sm font-bold p-2">移除</button>
                            </div>
                        )}

                        <div className={`grid grid-cols-5 gap-2 ${tempCat.customIcon ? 'opacity-50 pointer-events-none' : ''}`}>
                            {availableIcons.map(icon => (
                                <div key={icon} onClick={() => setTempCat({...tempCat, icon, customIcon: ''})} className={`cursor-pointer flex justify-center items-center py-2 rounded-lg border-2 transition-all ${tempCat.icon === icon && !tempCat.customIcon ? 'border-primary bg-primary/10 text-primary' : 'border-gray-100 bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>
                                    <Icon name={icon} size="text-xl" />
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">子分類 (選填)</label>
                        <textarea className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary outline-none resize-none text-sm" rows={3} placeholder="請用逗號分隔，例如：伙食, 日用品, 水電瓦斯" value={tempCat.subcategoriesStr || ''} onChange={e => setTempCat({...tempCat, subcategoriesStr: e.target.value})}></textarea>
                    </div>
                    <button onClick={save} className="w-full py-3 bg-primary text-white font-bold rounded-lg shadow-lg active:scale-95 transition-transform mt-2">儲存分類</button>
                </div>
            </Modal>
        </div>
    );
};

