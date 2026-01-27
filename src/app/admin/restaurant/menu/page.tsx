"use client";

import { useState, useEffect } from "react";
import { db, storage } from "@/lib/firebase";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { MenuCategory, MenuItem } from "@/types";
import { Plus, Edit3, Trash2, Image as ImageIcon, Loader2, X, UploadCloud, Check, Globe, ChevronDown, ChevronUp } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Language } from "@/types";
import { where } from "firebase/firestore";
import { translateText } from "@/actions/translate";
import { Bot } from "lucide-react";

export default function AdminMenuPage() {
    const [categories, setCategories] = useState<MenuCategory[]>([]);
    const [items, setItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string | "all">("all");

    // Modal States
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [translatingLang, setTranslatingLang] = useState<string | null>(null);

    // Form States
    const [categoryForm, setCategoryForm] = useState({ name: "", order: 0, isActive: true, localizedNames: {} as Record<string, string> });

    // Multi-Language
    const { t } = useLanguage();
    const [activeLangs, setActiveLangs] = useState<Language[]>([]);
    const [expandedCatLang, setExpandedCatLang] = useState<string | null>(null);
    const [expandedItemLang, setExpandedItemLang] = useState<string | null>(null);

    useEffect(() => {
        const fetchLangs = async () => {
            const q = query(collection(db, "languages"), where("isActive", "==", true));
            const snap = await getDocs(q);
            const langs = snap.docs.map(doc => doc.data() as Language);
            setActiveLangs(langs.filter(l => l.id !== 'mn'));
        };
        fetchLangs();
    }, []);

    // Item Form State
    const [itemForm, setItemForm] = useState<Partial<MenuItem>>({
        name: "",
        description: "",
        price: 0,
        imageUrl: "",
        isAvailable: true,
        categoryId: "",
        tags: [],
        localizedNames: {} as Record<string, string>,
        localizedDescriptions: {} as Record<string, string>
    });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            // Fetch Categories
            const catQuery = query(collection(db, "menu_categories"), orderBy("order"));
            const catSnapshot = await getDocs(catQuery);
            const cats = catSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuCategory));
            setCategories(cats);

            // Fetch Items
            const itemQuery = query(collection(db, "menu_items"), orderBy("createdAt", "desc"));
            const itemSnapshot = await getDocs(itemQuery);
            const menuItems = itemSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem));
            setItems(menuItems);
        } catch (error) {
            console.error("Error fetching menu data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const uploadImage = async (file: File) => {
        const storageRef = ref(storage, `menu_items/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        return await getDownloadURL(storageRef);
    };

    const handleAutoTranslateCategory = async (langId: string) => {
        if (!categoryForm.name) {
            alert("Эхлээд Монгол нэрийг оруулна уу.");
            return;
        }

        setTranslatingLang(langId);
        try {
            const translatedName = await translateText(categoryForm.name, langId);
            setCategoryForm(prev => ({
                ...prev,
                localizedNames: { ...prev.localizedNames, [langId]: translatedName }
            }));
        } catch (error: any) {
            console.error("Translation error:", error);
            alert(error.message || "Орчуулахад алдаа гарлаа.");
        } finally {
            setTranslatingLang(null);
        }
    };

    const handleAutoTranslateItem = async (langId: string) => {
        if (!itemForm.name && !itemForm.description) {
            alert("Эхлээд Монгол хэл дээрх мэдээллээ оруулна уу.");
            return;
        }

        setTranslatingLang(langId);
        try {
            const [nameTrans, descTrans] = await Promise.all([
                itemForm.name ? translateText(itemForm.name, langId) : Promise.resolve(null),
                itemForm.description ? translateText(itemForm.description, langId) : Promise.resolve(null)
            ]);

            setItemForm(prev => ({
                ...prev,
                localizedNames: {
                    ...(prev.localizedNames || {}),
                    ...(nameTrans ? { [langId]: nameTrans } : {})
                },
                localizedDescriptions: {
                    ...(prev.localizedDescriptions || {}),
                    ...(descTrans ? { [langId]: descTrans } : {})
                },
            }));
        } catch (error: any) {
            console.error("Translation error:", error);
            alert(error.message || "Орчуулахад алдаа гарлаа.");
        } finally {
            setTranslatingLang(null);
        }
    };

    const handleSaveCategory = async () => {
        if (!categoryForm.name) return;
        setIsSubmitting(true);
        try {
            if (editingCategory) {
                await updateDoc(doc(db, "menu_categories", editingCategory.id), categoryForm);
            } else {
                await addDoc(collection(db, "menu_categories"), { ...categoryForm, order: categories.length + 1 });
            }
            setIsCategoryModalOpen(false);
            resetCategoryForm();
            fetchData();
        } catch (error) {
            console.error("Error saving category:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteCategory = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm(t('admin_delete_confirm_category', "Та энэ ангиллыг устгахдаа итгэлтэй байна уу?"))) return;
        try {
            await deleteDoc(doc(db, "menu_categories", id));
            fetchData();
        } catch (error) {
            console.error("Error deleting category:", error);
        }
    };

    const handleSaveItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!itemForm.name || !itemForm.price || !itemForm.categoryId) return;

        setIsSubmitting(true);
        try {
            let imageUrl = itemForm.imageUrl;

            if (imageFile) {
                imageUrl = await uploadImage(imageFile);
            }

            const itemData = {
                ...itemForm,
                price: Number(itemForm.price),
                imageUrl,
                createdAt: editingItem ? editingItem.createdAt : Date.now()
            };

            if (editingItem) {
                await updateDoc(doc(db, "menu_items", editingItem.id), itemData);
            } else {
                await addDoc(collection(db, "menu_items"), itemData);
            }
            setIsItemModalOpen(false);
            resetItemForm();
            fetchData();
        } catch (error) {
            console.error("Error saving item:", error);
            alert("Алдаа гарлаа. Дахин оролдоно уу.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteItem = async (id: string) => {
        if (!confirm(t('admin_delete_confirm_item', "Та энэ хоолыг устгахдаа итгэлтэй байна уу?"))) return;
        try {
            await deleteDoc(doc(db, "menu_items", id));
            fetchData();
        } catch (error) {
            console.error("Error deleting item:", error);
        }
    };

    const openCategoryModal = (cat?: MenuCategory) => {
        if (cat) {
            setEditingCategory(cat);
            setCategoryForm({ name: cat.name, order: cat.order, isActive: cat.isActive, localizedNames: cat.localizedNames || {} });
        } else {
            resetCategoryForm();
        }
        setIsCategoryModalOpen(true);
    };

    const resetCategoryForm = () => {
        setEditingCategory(null);
        setCategoryForm({ name: "", order: categories.length + 1, isActive: true, localizedNames: {} });
    };

    const openItemModal = (item?: MenuItem) => {
        if (item) {
            setEditingItem(item);
            setItemForm({
                ...item,
                localizedNames: item.localizedNames || {},
                localizedDescriptions: item.localizedDescriptions || {}
            });
            setImagePreview(item.imageUrl || null);
        } else {
            resetItemForm();
        }
        setIsItemModalOpen(true);
    };

    const resetItemForm = () => {
        setEditingItem(null);
        setItemForm({
            name: "",
            description: "",
            price: 0,
            imageUrl: "",
            isAvailable: true,
            categoryId: selectedCategory !== "all" ? selectedCategory : categories[0]?.id || "",
            tags: [],
            localizedNames: {},
            localizedDescriptions: {}
        });
        setImageFile(null);
        setImagePreview(null);
    };

    const filteredItems = selectedCategory === "all"
        ? items
        : items.filter(item => item.categoryId === selectedCategory);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primary)]"></div>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">{t('admin_restaurant_menu', 'Рестораны Цэс')}</h1>
                    <p className="text-gray-500 mt-1">{t('admin_menu_subtitle', 'Хоолны цэс, ангилал удирдах хэсэг')}</p>
                </div>
                <div className="flex space-x-3">
                    <button
                        onClick={() => openCategoryModal()}
                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center font-medium transition-colors shadow-sm"
                    >
                        <Plus size={18} className="mr-2" /> {t('admin_category_btn', 'Ангилал')}
                    </button>
                    <button
                        onClick={() => openItemModal()}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center shadow-lg shadow-indigo-200 font-medium transition-colors transform active:scale-95"
                    >
                        <Plus size={18} className="mr-2" /> {t('admin_add_food_btn', 'Хоол Нэмэх')}
                    </button>
                </div>
            </div>

            {/* Categories Scroller */}
            <div className="flex overflow-x-auto pb-6 mb-2 space-x-2 scrollbar-none">
                <button
                    onClick={() => setSelectedCategory("all")}
                    className={`px-5 py-2.5 rounded-full whitespace-nowrap text-sm font-semibold transition-all shadow-sm ${selectedCategory === "all"
                        ? "bg-gray-900 text-white ring-2 ring-gray-900 ring-offset-2"
                        : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
                        }`}
                >
                    {t('all', 'Бүгд')}
                </button>
                {categories.map(cat => (
                    <div key={cat.id} className="relative group">
                        <button
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`px-5 py-2.5 rounded-full whitespace-nowrap text-sm font-semibold transition-all shadow-sm pr-9 ${selectedCategory === cat.id
                                ? "bg-indigo-600 text-white ring-2 ring-indigo-600 ring-offset-2"
                                : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
                                }`}
                        >
                            {cat.name}
                        </button>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex opacity-0 group-hover:opacity-100 transition-opacity space-x-1">
                            <button
                                onClick={(e) => { e.stopPropagation(); openCategoryModal(cat); }}
                                className={`p-1 rounded-full ${selectedCategory === cat.id ? 'text-white/80 hover:bg-white/20' : 'text-gray-400 hover:bg-gray-200'}`}
                            >
                                <Edit3 size={12} />
                            </button>
                            <button
                                onClick={(e) => handleDeleteCategory(cat.id, e)}
                                className={`p-1 rounded-full ${selectedCategory === cat.id ? 'text-red-200 hover:bg-white/20' : 'text-red-400 hover:bg-red-50'}`}
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Items Grid */}
            {filteredItems.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ImageIcon className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">{t('admin_item_not_found', 'Хоол олдсонгүй')}</h3>
                    <p className="text-gray-500 mt-1">{t('admin_no_items_in_category', 'Одоогоор энэ ангилалд хоол байхгүй байна.')}</p>
                    <button onClick={() => openItemModal()} className="mt-4 text-indigo-600 font-medium hover:underline">{t('admin_add_food_btn', 'Хоол нэмэх')}</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredItems.map(item => (
                        <div key={item.id} className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden">
                            {/* Image Area */}
                            <div className="relative h-48 sm:h-56 bg-gray-100 overflow-hidden">
                                {item.imageUrl ? (
                                    <img
                                        src={item.imageUrl}
                                        alt={item.name}
                                        className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                        <ImageIcon size={48} />
                                    </div>
                                )}

                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                <div className="absolute top-3 right-3 flex space-x-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                                    <button
                                        onClick={() => openItemModal(item)}
                                        className="p-2 bg-white rounded-full text-gray-700 hover:text-indigo-600 shadow-lg hover:bg-indigo-50 transition-colors"
                                    >
                                        <Edit3 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteItem(item.id)}
                                        className="p-2 bg-white rounded-full text-gray-700 hover:text-red-600 shadow-lg hover:bg-red-50 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <span className={`px-2.5 py-1 text-xs font-bold rounded-full backdrop-blur-md shadow-sm ${item.isAvailable ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
                                        {item.isAvailable ? t('admin_item_available', 'Бэлэн') : t('admin_item_unavailable', 'Дууссан')}
                                    </span>
                                </div>
                            </div>

                            {/* Content Area */}
                            <div className="p-5 flex-1 flex flex-col">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-1">{item.name}</h3>
                                    <span className="font-bold text-lg text-emerald-600">{item.price.toLocaleString()}₮</span>
                                </div>
                                <p className="text-sm text-gray-500 line-clamp-2 mb-4 flex-1">{item.description}</p>
                                <div className="pt-4 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400">
                                    <span className="bg-gray-100 px-2 py-1 rounded text-gray-600 font-medium">
                                        {categories.find(c => c.id === item.categoryId)?.name || 'Ангилалгүй'}
                                    </span>
                                    {/* Additional metadata can go here */}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Category Modal */}
            {isCategoryModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-900">{editingCategory ? t('admin_edit_category', 'Ангилал Засах') : t('admin_new_category', 'Шинэ Ангилал')}</h2>
                            <button onClick={() => setIsCategoryModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">{t('admin_item_name', 'Нэр')}</label>
                                <input
                                    type="text"
                                    value={categoryForm.name}
                                    onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })}
                                    className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2.5 px-3 bg-gray-50 focus:bg-white transition-colors"
                                    placeholder={t('admin_item_name', "Нэр")}
                                    autoFocus
                                />
                            </div>

                            {activeLangs.length > 0 && (
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700">{t('admin_translations', 'Орчуулга')}</label>
                                    {activeLangs.map(lang => (
                                        <div key={lang.id} className="border rounded-lg overflow-hidden bg-gray-50">
                                            <div
                                                onClick={() => setExpandedCatLang(expandedCatLang === lang.id ? null : lang.id)}
                                                className="w-full flex items-center justify-between p-3 hover:bg-gray-100 transition-colors cursor-pointer"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span>{lang.flag}</span>
                                                    <span className="text-sm font-medium">{lang.name}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleAutoTranslateCategory(lang.id);
                                                        }}
                                                        disabled={!!translatingLang}
                                                        className="p-1 px-2 bg-purple-100 text-purple-700 rounded-md text-[10px] font-bold hover:bg-purple-200 transition-colors disabled:opacity-50 flex items-center gap-1"
                                                    >
                                                        {translatingLang === lang.id ? <Loader2 size={10} className="animate-spin" /> : <Bot size={10} />}
                                                        AI
                                                    </button>
                                                    {expandedCatLang === lang.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                </div>
                                            </div>
                                            {expandedCatLang === lang.id && (
                                                <div className="p-3 pt-0">
                                                    <input
                                                        type="text"
                                                        className="w-full rounded-lg border-gray-200 border p-2 text-sm outline-none"
                                                        placeholder={categoryForm.name}
                                                        value={categoryForm.localizedNames[lang.id] || ""}
                                                        onChange={e => setCategoryForm({
                                                            ...categoryForm,
                                                            localizedNames: { ...categoryForm.localizedNames, [lang.id]: e.target.value }
                                                        })}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex items-center p-3 bg-gray-50 rounded-xl cursor-pointer" onClick={() => setCategoryForm({ ...categoryForm, isActive: !categoryForm.isActive })}>
                                <div className={`w-5 h-5 rounded border flex items-center justify-center mr-3 transition-colors ${categoryForm.isActive ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-400'}`}>
                                    {categoryForm.isActive && <Check size={14} className="text-white" />}
                                </div>
                                <span className="text-sm font-medium text-gray-900">{t('admin_active', 'Идэвхтэй')}</span>
                            </div>
                        </div>
                        <div className="mt-8 flex justify-end space-x-3">
                            <button onClick={() => setIsCategoryModalOpen(false)} className="px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">{t('cancel', 'Болих')}</button>
                            <button
                                onClick={handleSaveCategory}
                                disabled={isSubmitting}
                                className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-200 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center"
                            >
                                {isSubmitting && <Loader2 size={16} className="mr-2 animate-spin" />}
                                {t('save', 'Хадгалах')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Item Modal */}
            {isItemModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl max-w-2xl w-full p-8 shadow-2xl animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-bold text-gray-900">{editingItem ? t('admin_edit_food', 'Хоол Засах') : t('admin_new_food', 'Шинэ Хоол Нэмэх')}</h2>
                            <button onClick={() => setIsItemModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveItem} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Left Side: Image Upload */}
                            <div className="space-y-4">
                                <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wider">{t('admin_featured_image', 'Зураг')}</label>
                                <div className="relative aspect-video rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 transition-colors overflow-hidden group cursor-pointer">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />
                                    {imagePreview ? (
                                        <div className="relative w-full h-full">
                                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="text-white flex flex-col items-center">
                                                    <UploadCloud size={24} className="mb-2" />
                                                    <span className="text-sm font-medium">{t('admin_image_change', 'Зураг солих')}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                            <ImageIcon size={40} className="mb-3 text-gray-300" />
                                            <span className="text-sm font-medium text-gray-600">{t('admin_image_upload', 'Зураг хуулах')}</span>
                                            <span className="text-xs text-gray-400 mt-1">PNG, JPG up to 5MB</span>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <label className="block text-sm font-semibold text-gray-700">Тохиргоо</label>
                                    <div className="flex items-center p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => setItemForm({ ...itemForm, isAvailable: !itemForm.isAvailable })}>
                                        <div className={`w-10 h-6 rounded-full relative transition-colors mr-3 ${itemForm.isAvailable ? 'bg-green-500' : 'bg-gray-300'}`}>
                                            <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${itemForm.isAvailable ? 'translate-x-4' : ''}`} />
                                        </div>
                                        <span className="text-sm font-medium text-gray-900">{t('admin_item_available', 'Захиалах боломжтой')}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Right Side: Form Fields */}
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">{t('admin_item_name', 'Нэр')}</label>
                                    <input
                                        type="text"
                                        required
                                        value={itemForm.name}
                                        onChange={e => setItemForm({ ...itemForm, name: e.target.value })}
                                        className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2.5 px-3 bg-gray-50 focus:bg-white transition-colors"
                                        placeholder={t('admin_item_name', "Хоолны нэр")}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">{t('admin_item_price', 'Үнэ')} (₮)</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">₮</div>
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            value={itemForm.price}
                                            onChange={e => setItemForm({ ...itemForm, price: Number(e.target.value) })}
                                            className="block w-full pl-8 rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2.5 px-3 bg-gray-50 focus:bg-white transition-colors"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">{t('admin_item_category', 'Ангилал')}</label>
                                    <select
                                        required
                                        value={itemForm.categoryId}
                                        onChange={e => setItemForm({ ...itemForm, categoryId: e.target.value })}
                                        className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2.5 px-3 bg-gray-50 focus:bg-white transition-colors"
                                    >
                                        <option value="">{t('admin_select_category_placeholder', 'Ангилал сонгох')}</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">{t('admin_item_description', 'Тайлбар')}</label>
                                    <textarea
                                        value={itemForm.description}
                                        onChange={e => setItemForm({ ...itemForm, description: e.target.value })}
                                        className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2.5 px-3 bg-gray-50 focus:bg-white transition-colors min-h-[100px]"
                                        placeholder={t('admin_item_description', "Орц, найрлага...")}
                                    />
                                </div>

                                {activeLangs.length > 0 && (
                                    <div className="space-y-3">
                                        <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                                            <Globe size={16} className="text-indigo-500" />
                                            {t('admin_manual_translation', 'Орчуулга')}
                                        </label>
                                        {activeLangs.map(lang => (
                                            <div key={lang.id} className="border rounded-xl overflow-hidden bg-gray-50 border-gray-100 shadow-sm">
                                                <div
                                                    onClick={() => setExpandedItemLang(expandedItemLang === lang.id ? null : lang.id)}
                                                    className="w-full flex items-center justify-between p-3.5 hover:bg-gray-100 transition-colors cursor-pointer"
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <span className="text-xl">{lang.flag}</span>
                                                        <span className="text-sm font-semibold text-gray-700">{lang.name}</span>
                                                        <span className="text-[10px] text-gray-400 uppercase font-black">{lang.id}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleAutoTranslateItem(lang.id);
                                                            }}
                                                            disabled={!!translatingLang}
                                                            className="p-1 px-2 bg-purple-100 text-purple-700 rounded-md text-[10px] font-bold hover:bg-purple-200 transition-colors disabled:opacity-50 flex items-center gap-1"
                                                        >
                                                            {translatingLang === lang.id ? <Loader2 size={10} className="animate-spin" /> : <Bot size={10} />}
                                                            AI Орчуулга
                                                        </button>
                                                        {expandedItemLang === lang.id ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                                                    </div>
                                                </div>
                                                {expandedItemLang === lang.id && (
                                                    <div className="p-4 pt-0 space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-200">
                                                        <div>
                                                            <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1.5 ml-1">{t('admin_item_name', 'Нэр')}</label>
                                                            <input
                                                                type="text"
                                                                className="w-full rounded-lg border-gray-200 border p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-inner bg-white"
                                                                placeholder={itemForm.name}
                                                                value={itemForm.localizedNames?.[lang.id] || ""}
                                                                onChange={e => setItemForm({
                                                                    ...itemForm,
                                                                    localizedNames: { ...(itemForm.localizedNames || {}), [lang.id]: e.target.value }
                                                                })}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1.5 ml-1">{t('admin_item_description', 'Тайлбар')}</label>
                                                            <textarea
                                                                rows={2}
                                                                className="w-full rounded-lg border-gray-200 border p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-inner bg-white"
                                                                placeholder={itemForm.description}
                                                                value={itemForm.localizedDescriptions?.[lang.id] || ""}
                                                                onChange={e => setItemForm({
                                                                    ...itemForm,
                                                                    localizedDescriptions: { ...(itemForm.localizedDescriptions || {}), [lang.id]: e.target.value }
                                                                })}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="md:col-span-2 pt-6 border-t border-gray-100 flex justify-end space-x-3">
                                <button type="button" onClick={() => setIsItemModalOpen(false)} className="px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">{t('cancel', 'Болих')}</button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-200 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center"
                                >
                                    {isSubmitting && <Loader2 size={16} className="mr-2 animate-spin" />}
                                    {t('save', 'Хадгалах')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
