"use server";

import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, where, serverTimestamp } from "firebase/firestore";
import { translateText } from "./translate";

const MENU_DATA = [
    {
        category: "Монгол хоол",
        items: [
            { name: "Цуйван", price: 30000, description: "Гол хоол" },
            { name: "Мини хуушуур", price: 30000, description: "Гол хоол" },
            { name: "Бяслагтай хуушуур", price: 35000, description: "Гол хоол" },
            { name: "Хорхог", price: 195000, description: "Гол хоол" },
        ]
    },
    {
        category: "Суп, каша",
        items: [
            { name: "Бантан", price: 18000, description: "Суп" },
            { name: "Борцтой банштай цай", price: 25000, description: "Суп" },
            { name: "Тойгны шөл", price: 30000, description: "Суп" },
            { name: "Банштай шөл", price: 20000, description: "Суп" },
        ]
    },
    {
        category: "Хуурга",
        items: [
            { name: "Будаатай хуурга", price: 30000, description: "" },
        ]
    },
    {
        category: "Рамен",
        items: [
            { name: "Beef ramen", price: 22000, description: "" },
            { name: "Chicken ramen", price: 22000, description: "" },
            { name: "Spicy ramen (beef or chicken)", price: 22000, description: "" },
        ]
    },
    {
        category: "Спиртлэг ундаа",
        items: [
            { name: "Сэнгүүр 500 ml", price: 14000, description: "Beer" },
            { name: "Cass 500 ml", price: 12000, description: "Beer" },
            { name: "Алтан говь", price: 11000, description: "Beer" },
            { name: "Terra", price: 15000, description: "Beer" },
            { name: "Soju 360 ml", price: 18000, description: "Soju" },
            { name: "Hennessy V.S 700 ml", price: 420000, description: "Whiskey & Cognac" },
            { name: "Glenmorangie 700 ml", price: 350000, description: "Whiskey & Cognac" },
            { name: "Jack Daniel’s 700 ml", price: 240000, description: "Whiskey & Cognac" },
            { name: "Tinjaku 700 ml", price: 200000, description: "Whiskey & Cognac" },
            { name: "Jameson 700 ml", price: 240000, description: "Whiskey & Cognac" },
            { name: "Ballantines 700 ml", price: 180000, description: "Whiskey & Cognac" },
            { name: "Wild turkey 700 ml", price: 220000, description: "Whiskey & Cognac" },
            { name: "Beluga 1000 ml", price: 300000, description: "Vodka" },
        ]
    },
    {
        category: "Зөөлөн ундаа",
        items: [
            { name: "Essentuki", price: 10000, description: "" },
            { name: "Carnberry juice 150 ml", price: 8000, description: "" },
            { name: "Schweppers", price: 8000, description: "" },
            { name: "Tonic", price: 8000, description: "" },
            { name: "Моя семья", price: 20000, description: "" },
            { name: "Khujirt (жижиг)", price: 4000, description: "" },
            { name: "Khujirt (том)", price: 5000, description: "" },
            { name: "Bonaqua (жижиг)", price: 3000, description: "" },
            { name: "Bonaqua (том)", price: 4000, description: "" },
        ]
    },
    {
        category: "Халуун ундаа",
        items: [
            { name: "Caramel latte", price: 9000, description: "Coffee" },
            { name: "Cappuccino", price: 8000, description: "Coffee" },
            { name: "Hot milk", price: 7000, description: "Coffee" },
        ]
    }
];

export async function seedRestaurantMenu() {
    console.log("[Seed] Starting menu seeding...");
    const results = [];
    const targetLangs = ['en', 'ru', 'zh', 'ko'];

    for (let i = 0; i < MENU_DATA.length; i++) {
        const catData = MENU_DATA[i];

        // 1. Find or create category
        let categoryId = "";
        const catQuery = query(collection(db, "menuCategories"), where("name", "==", catData.category));
        const catSnap = await getDocs(catQuery);

        if (!catSnap.empty) {
            categoryId = catSnap.docs[0].id;
            console.log(`[Seed] Category found: ${catData.category} (${categoryId})`);
        } else {
            // Translate category name
            const localizedNames: any = {};
            for (const lang of targetLangs) {
                try {
                    localizedNames[lang] = await translateText(catData.category, lang);
                } catch (e) {
                    localizedNames[lang] = catData.category;
                }
            }

            const catDoc = await addDoc(collection(db, "menuCategories"), {
                name: catData.category,
                localizedNames,
                order: i,
                isActive: true,
                createdAt: serverTimestamp()
            });
            categoryId = catDoc.id;
            console.log(`[Seed] Created category: ${catData.category} (${categoryId})`);
        }

        // 2. Add items
        for (const itemData of catData.items) {
            // Check if item already exists in this category
            const itemQuery = query(
                collection(db, "menuItems"),
                where("categoryId", "==", categoryId),
                where("name", "==", itemData.name)
            );
            const itemSnap = await getDocs(itemQuery);

            if (!itemSnap.empty) {
                console.log(`[Seed] Item already exists: ${itemData.name}`);
                continue;
            }

            // Translate item name and description
            const localizedNames: any = {};
            const localizedDescriptions: any = {};

            for (const lang of targetLangs) {
                try {
                    localizedNames[lang] = await translateText(itemData.name, lang);
                    if (itemData.description) {
                        localizedDescriptions[lang] = await translateText(itemData.description, lang);
                    }
                } catch (e) {
                    localizedNames[lang] = itemData.name;
                    localizedDescriptions[lang] = itemData.description;
                }
            }

            await addDoc(collection(db, "menuItems"), {
                categoryId,
                name: itemData.name,
                description: itemData.description,
                price: itemData.price,
                imageUrl: "",
                isAvailable: true,
                localizedNames,
                localizedDescriptions,
                createdAt: Date.now()
            });
            console.log(`[Seed] Added item: ${itemData.name}`);
        }
    }

    return { success: true, message: "Menu seeding completed!" };
}
