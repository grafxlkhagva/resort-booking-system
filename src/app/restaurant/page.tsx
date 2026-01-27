"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { MenuCategory, MenuItem } from "@/types";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { ShoppingBag, Search, Plus } from "lucide-react";
import Link from "next/link";

export default function RestaurantPage() {
    const [categories, setCategories] = useState<MenuCategory[]>([]);
    const [items, setItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const { addToCart, items: cartItems, totalItems } = useCart();
    const { currentLanguage, t } = useLanguage();

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch Categories
                const catQuery = query(collection(db, "menu_categories"), where("isActive", "==", true), orderBy("order"));
                const catSnapshot = await getDocs(catQuery);
                const cats = catSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuCategory));
                setCategories(cats);

                // Fetch Items
                const itemQuery = query(collection(db, "menu_items"), where("isAvailable", "==", true));
                const itemSnapshot = await getDocs(itemQuery);
                const menuItems = itemSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem));
                setItems(menuItems);
            } catch (error) {
                console.error("Error fetching menu:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const filteredItems = items.filter(item => {
        const matchesCategory = selectedCategory === "all" || item.categoryId === selectedCategory;
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    if (loading) return (
        <div className="min-h-[50vh] flex items-center justify-center">
            <div className="spinner" />
        </div>
    );

    return (
        <div className="min-h-screen pb-24 md:pb-8">
            {/* Header */}
            <div className="sticky top-14 sm:top-16 z-10 bg-[var(--card)] border-b border-[var(--border)] shadow-[var(--shadow)]">
                <div className="content-padding max-w-7xl mx-auto">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <h1 className="text-xl sm:text-2xl font-bold text-[var(--foreground)]">{t('restaurant_title', 'Ресторан')}</h1>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-56">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" size={18} />
                                <input
                                    type="search"
                                    placeholder={t('search', 'Хайх...')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-sm"
                                />
                            </div>
                            <Link href="/restaurant/checkout" className="touch-target flex items-center justify-center relative p-2.5 rounded-xl text-[var(--foreground)] hover:bg-[var(--primary)]/10 hover:text-[var(--primary)]">
                                <ShoppingBag size={22} />
                                {totalItems > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs font-bold rounded-full min-w-[1.25rem] h-5 flex items-center justify-center px-1">
                                        {totalItems}
                                    </span>
                                )}
                            </Link>
                        </div>
                    </div>
                    <div className="mt-4 flex overflow-x-auto scrollbar-hide gap-2 pb-1 -mx-1 px-1">
                        <button
                            onClick={() => setSelectedCategory("all")}
                            className={`px-4 py-2 rounded-xl whitespace-nowrap text-sm font-medium transition-colors ${selectedCategory === "all" ? "bg-[var(--primary)] text-white" : "bg-[var(--background)] text-[var(--muted)] hover:text-[var(--foreground)] border border-[var(--border)]"}`}
                        >
                            {t('all', 'Бүгд')}
                        </button>
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`px-4 py-2 rounded-xl whitespace-nowrap text-sm font-medium transition-colors ${selectedCategory === cat.id ? "bg-[var(--primary)] text-white" : "bg-[var(--background)] text-[var(--muted)] hover:text-[var(--foreground)] border border-[var(--border)]"}`}
                            >
                                {cat.localizedNames?.[currentLanguage] || cat.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Menu Grid */}
            <div className="max-w-7xl mx-auto content-padding">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                    {filteredItems.map((item) => (
                        <div key={item.id} className="card overflow-hidden group">
                            <div className="relative aspect-[4/3] bg-[var(--background)] overflow-hidden">
                                {item.imageUrl ? (
                                    <img src={item.imageUrl} alt={item.localizedNames?.[currentLanguage] || item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[var(--muted-foreground)] text-sm">{t('restaurant_image_not_found', 'Зураггүй')}</div>
                                )}
                                <span className="absolute top-2 right-2 bg-[var(--card)]/95 text-[var(--foreground)] text-sm font-bold px-2.5 py-1 rounded-lg shadow">
                                    ${item.price}
                                </span>
                            </div>
                            <div className="p-4">
                                <h3 className="font-semibold text-[var(--foreground)] mb-1">{item.localizedNames?.[currentLanguage] || item.name}</h3>
                                <p className="text-sm text-[var(--muted)] line-clamp-2 mb-4">{item.localizedDescriptions?.[currentLanguage] || item.description}</p>
                                <button
                                    onClick={() => addToCart(item, 1)}
                                    className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
                                >
                                    <Plus size={18} /> {t('add_to_cart', 'Сагсанд нэмэх')}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                {filteredItems.length === 0 && (
                    <div className="card text-center py-16 px-4">
                        <p className="text-[var(--muted)]">{t('restaurant_no_results', 'Илэрц олдсонгүй.')}</p>
                        <button onClick={() => { setSelectedCategory("all"); setSearchQuery(""); }} className="mt-4 text-[var(--primary)] font-medium hover:underline">
                            {t('restaurant_clear_filters', 'Шүүлт цэвэрлэх')}
                        </button>
                    </div>
                )}
            </div>

            {/* Mobile cart bar */}
            {totalItems > 0 && (
                <div className="fixed bottom-0 left-0 right-0 bg-[var(--card)] border-t border-[var(--border)] p-4 shadow-[var(--shadow-lg)] md:hidden z-50 safe-bottom">
                    <Link href="/restaurant/checkout" className="btn-primary w-full flex items-center justify-between px-4">
                        <span className="flex items-center gap-2">
                            <span className="bg-white/20 px-2 py-0.5 rounded-lg text-sm font-bold">{totalItems}</span>
                            <span>{t('view_cart', 'Сагс харах')}</span>
                        </span>
                        <span>{t('checkout', 'Төлбөр төлөх')}</span>
                    </Link>
                </div>
            )}
        </div>
    );
}
