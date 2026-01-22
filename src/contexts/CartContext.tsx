"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { MenuItem, OrderItem } from "@/types";

export interface CartItem extends OrderItem {
    imageUrl?: string;
    description?: string;
}

interface CartContextType {
    items: CartItem[];
    addToCart: (item: MenuItem, quantity: number, notes?: string) => void;
    removeFromCart: (menuItemId: string) => void;
    updateQuantity: (menuItemId: string, quantity: number) => void;
    clearCart: () => void;
    totalAmount: number;
    totalItems: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);

    // Load from local storage
    useEffect(() => {
        const savedCart = localStorage.getItem("restaurant_cart");
        if (savedCart) {
            try {
                setItems(JSON.parse(savedCart));
            } catch (e) {
                console.error("Failed to parse cart", e);
            }
        }
    }, []);

    // Save to local storage
    useEffect(() => {
        localStorage.setItem("restaurant_cart", JSON.stringify(items));
    }, [items]);

    const addToCart = (menuItem: MenuItem, quantity: number, notes?: string) => {
        if (!menuItem.isAvailable) return;
        setItems(prev => {
            const existing = prev.find(i => i.menuItemId === menuItem.id);
            if (existing) {
                return prev.map(i =>
                    i.menuItemId === menuItem.id
                        ? { ...i, quantity: i.quantity + quantity, notes: notes || i.notes }
                        : i
                );
            }
            return [...prev, {
                menuItemId: menuItem.id,
                name: menuItem.name,
                price: menuItem.price,
                quantity,
                notes,
                imageUrl: menuItem.imageUrl,
                description: menuItem.description
            }];
        });
    };

    const removeFromCart = (menuItemId: string) => {
        setItems(prev => prev.filter(i => i.menuItemId !== menuItemId));
    };

    const updateQuantity = (menuItemId: string, quantity: number) => {
        if (quantity <= 0) {
            removeFromCart(menuItemId);
            return;
        }
        setItems(prev => prev.map(i => i.menuItemId === menuItemId ? { ...i, quantity } : i));
    };

    const clearCart = () => {
        setItems([]);
    };

    const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQuantity, clearCart, totalAmount, totalItems }}>
            {children}
        </CartContext.Provider>
    );
}

export const useCart = () => {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error("useCart must be used within a CartProvider");
    }
    return context;
};
