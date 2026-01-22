"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where } from "firebase/firestore";
import { MenuCategory, MenuItem } from "@/types";
import { Plus, Edit, Trash2, Image as ImageIcon, CheckCircle, XCircle } from "lucide-react";
import Image from "next/image";

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

    // Form States
    const [categoryForm, setCategoryForm] = useState({ name: "", order: 0, isActive: true });
    const [itemForm, setItemForm] = useState<Partial<MenuItem>>({
        name: "",
        description: "",
        price: 0,
        imageUrl: "",
        isAvailable: true,
        categoryId: "",
        tags: []
    });

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

    const handleSaveCategory = async () => {
        try {
            if (editingCategory) {
                await updateDoc(doc(db, "menu_categories", editingCategory.id), categoryForm);
            } else {
                await addDoc(collection(db, "menu_categories"), { ...categoryForm, order: categories.length + 1 });
            }
            setIsCategoryModalOpen(false);
            setEditingCategory(null);
            setCategoryForm({ name: "", order: 0, isActive: true });
            fetchData();
        } catch (error) {
            console.error("Error saving category:", error);
        }
    };

    const handleDeleteCategory = async (id: string) => {
        if (!confirm("Are you sure? This will not delete items in this category.")) return;
        try {
            await deleteDoc(doc(db, "menu_categories", id));
            fetchData();
        } catch (error) {
            console.error("Error deleting category:", error);
        }
    };

    const handleSaveItem = async () => {
        try {
            const itemData = {
                ...itemForm,
                price: Number(itemForm.price),
                createdAt: editingItem ? editingItem.createdAt : Date.now()
            };

            if (editingItem) {
                await updateDoc(doc(db, "menu_items", editingItem.id), itemData);
            } else {
                await addDoc(collection(db, "menu_items"), itemData);
            }
            setIsItemModalOpen(false);
            setEditingItem(null);
            setItemForm({ name: "", description: "", price: 0, imageUrl: "", isAvailable: true, categoryId: categories[0]?.id || "", tags: [] });
            fetchData();
        } catch (error) {
            console.error("Error saving item:", error);
        }
    };

    const handleDeleteItem = async (id: string) => {
        if (!confirm("Are you sure you want to delete this item?")) return;
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
            setCategoryForm({ name: cat.name, order: cat.order, isActive: cat.isActive });
        } else {
            setEditingCategory(null);
            setCategoryForm({ name: "", order: categories.length + 1, isActive: true });
        }
        setIsCategoryModalOpen(true);
    };

    const openItemModal = (item?: MenuItem) => {
        if (item) {
            setEditingItem(item);
            setItemForm(item);
        } else {
            setEditingItem(null);
            setItemForm({
                name: "",
                description: "",
                price: 0,
                imageUrl: "",
                isAvailable: true,
                categoryId: selectedCategory !== "all" ? selectedCategory : categories[0]?.id || "",
                tags: []
            });
        }
        setIsItemModalOpen(true);
    };

    const filteredItems = selectedCategory === "all"
        ? items
        : items.filter(item => item.categoryId === selectedCategory);

    if (loading) return <div className="p-8 text-center">Loading Menu...</div>;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Restaurant Menu</h1>
                <div className="flex space-x-4">
                    <button
                        onClick={() => openCategoryModal()}
                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 flex items-center"
                    >
                        <Plus size={18} className="mr-2" /> Category
                    </button>
                    <button
                        onClick={() => openItemModal()}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center shadow-sm"
                    >
                        <Plus size={18} className="mr-2" /> Add Item
                    </button>
                </div>
            </div>

            {/* Categories */}
            <div className="flex overflow-x-auto pb-4 mb-6 space-x-2 scrollbar-hide">
                <button
                    onClick={() => setSelectedCategory("all")}
                    className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${selectedCategory === "all"
                            ? "bg-gray-900 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                >
                    All Items
                </button>
                {categories.map(cat => (
                    <div key={cat.id} className="relative group">
                        <button
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors pr-8 ${selectedCategory === cat.id
                                    ? "bg-indigo-600 text-white"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                        >
                            {cat.name}
                        </button>
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); openCategoryModal(cat); }} className="p-1 text-gray-500 hover:text-white"><Edit size={12} /></button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredItems.map(item => (
                    <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                        <div className="relative h-48 bg-gray-200">
                            {item.imageUrl ? (
                                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    <ImageIcon size={40} />
                                </div>
                            )}
                            <div className="absolute top-2 right-2 flex space-x-2">
                                <button
                                    onClick={() => openItemModal(item)}
                                    className="p-2 bg-white/90 rounded-full text-gray-700 hover:text-indigo-600 shadow-sm backdrop-blur-sm"
                                >
                                    <Edit size={16} />
                                </button>
                                <button
                                    onClick={() => handleDeleteItem(item.id)}
                                    className="p-2 bg-white/90 rounded-full text-gray-700 hover:text-red-600 shadow-sm backdrop-blur-sm"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            <div className="absolute bottom-2 left-2">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-md backdrop-blur-md ${item.isAvailable ? 'bg-green-500/80 text-white' : 'bg-red-500/80 text-white'}`}>
                                    {item.isAvailable ? 'Available' : 'Sold Out'}
                                </span>
                            </div>
                        </div>
                        <div className="p-4">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-lg font-bold text-gray-900">{item.name}</h3>
                                <span className="font-semibold text-indigo-600">${item.price}</span>
                            </div>
                            <p className="text-sm text-gray-500 line-clamp-2 mb-3">{item.description}</p>
                            <div className="flex items-center text-xs text-gray-400">
                                <span className="mr-2">{categories.find(c => c.id === item.categoryId)?.name || 'Uncategorized'}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Category Modal */}
            {isCategoryModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg max-w-md w-full p-6">
                        <h2 className="text-xl font-bold mb-4">{editingCategory ? 'Edit Category' : 'New Category'}</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Name</label>
                                <input
                                    type="text"
                                    value={categoryForm.name}
                                    onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                                />
                            </div>
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={categoryForm.isActive}
                                    onChange={e => setCategoryForm({ ...categoryForm, isActive: e.target.checked })}
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                />
                                <label className="ml-2 block text-sm text-gray-900">Active</label>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end space-x-3">
                            <button onClick={() => setIsCategoryModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
                            <button onClick={handleSaveCategory} className="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-md">Save</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Item Modal */}
            {isItemModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg max-w-lg w-full p-6">
                        <h2 className="text-xl font-bold mb-4">{editingItem ? 'Edit Item' : 'New Item'}</h2>
                        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Name</label>
                                <input
                                    type="text"
                                    value={itemForm.name}
                                    onChange={e => setItemForm({ ...itemForm, name: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Description</label>
                                <textarea
                                    value={itemForm.description}
                                    onChange={e => setItemForm({ ...itemForm, description: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                                    rows={3}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Price ($)</label>
                                    <input
                                        type="number"
                                        value={itemForm.price}
                                        onChange={e => setItemForm({ ...itemForm, price: Number(e.target.value) })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Category</label>
                                    <select
                                        value={itemForm.categoryId}
                                        onChange={e => setItemForm({ ...itemForm, categoryId: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                                    >
                                        <option value="">Select Category</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Image URL</label>
                                <input
                                    type="text"
                                    value={itemForm.imageUrl}
                                    onChange={e => setItemForm({ ...itemForm, imageUrl: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                                    placeholder="https://..."
                                />
                            </div>
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={itemForm.isAvailable}
                                    onChange={e => setItemForm({ ...itemForm, isAvailable: e.target.checked })}
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                />
                                <label className="ml-2 block text-sm text-gray-900">Available for Order</label>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end space-x-3">
                            <button onClick={() => setIsItemModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
                            <button onClick={handleSaveItem} className="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-md">Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
