"use client";

import { useState } from "react";
import { seedRestaurantMenu } from "@/actions/seedMenu";

export default function SeedPage() {
    const [status, setStatus] = useState<string>("");
    const [loading, setLoading] = useState(false);

    const handleSeed = async () => {
        if (!confirm("Энэ нь рестораны цэсэнд шинэ дата нэмэх болно. Үргэлжлүүлэх үү?")) return;

        setLoading(true);
        setStatus("Датаг оруулж байна... AI-аар орчуулж байгаа тул бага зэрэг хугацаа орно.");

        try {
            const result = await seedRestaurantMenu();
            setStatus(result.message);
        } catch (error: any) {
            setStatus("Алдаа гарлаа: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-10 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Рестораны цэс дата оруулах</h1>
            <div className="card p-6 border border-dashed border-gray-300 rounded-xl">
                <p className="mb-4 text-gray-600">
                    Таны өгсөн жагсаалтын дагуу Монгол хоол, Суп, Рамен, Ундаа зэрэг 30 гаруй нэр төрлийн бүтээгдэхүүнийг
                    системд автоматаар нэмэх болно. Мөн AI-аар бүх хэл рүү орчуулна.
                </p>
                <button
                    onClick={handleSeed}
                    disabled={loading}
                    className="btn-primary px-8 py-3 w-full disabled:opacity-50"
                >
                    {loading ? "Уншиж байна..." : "Дата оруулахыг эхлүүлэх"}
                </button>
                {status && (
                    <div className={`mt-6 p-4 rounded-lg bg-gray-50 border ${status.includes("Алдаа") ? 'text-red-600' : 'text-green-600'}`}>
                        {status}
                    </div>
                )}
            </div>
        </div>
    );
}
