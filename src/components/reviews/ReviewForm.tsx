"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Star } from "lucide-react";

interface ReviewFormProps {
    houseId: string;
    onReviewSubmitted?: () => void;
}

export default function ReviewForm({ houseId, onReviewSubmitted }: ReviewFormProps) {
    const { user } = useAuth();
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState("");
    const [hoveredRating, setHoveredRating] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            setError("Сэтгэгдэл бичихийн тулд нэвтэрнэ үү.");
            return;
        }
        if (rating === 0) {
            setError("Үнэлгээ өгнө үү.");
            return;
        }
        if (comment.trim().length < 5) {
            setError("Сэтгэгдэл дор хаяж 5 үсэгтэй байх ёстой.");
            return;
        }

        setSubmitting(true);
        setError("");

        try {
            await addDoc(collection(db, "reviews"), {
                houseId,
                userId: user.uid,
                userName: user.displayName || "Зочин",
                userAvatar: user.photoURL || "",
                rating,
                comment,
                createdAt: serverTimestamp()
            });

            setRating(0);
            setComment("");
            if (onReviewSubmitted) {
                onReviewSubmitted();
            }
        } catch (err) {
            console.error("Error submitting review:", err);
            setError("Сэтгэгдэл илгээхэд алдаа гарлаа.");
        } finally {
            setSubmitting(false);
        }
    };

    if (!user) {
        return (
            <div className="bg-gray-50 p-4 rounded-xl text-center">
                <p className="text-gray-600 mb-2">Сэтгэгдэл бичихийн тулд нэвтэрнэ үү.</p>
                <a href="/login" className="text-indigo-600 font-medium hover:underline">Нэвтрэх</a>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Сэтгэгдэл бичих</h3>

            {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
                    {error}
                </div>
            )}

            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Үнэлгээ</label>
                <div className="flex space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            type="button"
                            className="focus:outline-none transition-colors"
                            onMouseEnter={() => setHoveredRating(star)}
                            onMouseLeave={() => setHoveredRating(0)}
                            onClick={() => setRating(star)}
                        >
                            <Star
                                className={`w-8 h-8 ${star <= (hoveredRating || rating)
                                        ? "text-yellow-400 fill-current"
                                        : "text-gray-300"
                                    }`}
                            />
                        </button>
                    ))}
                </div>
            </div>

            <div className="mb-4">
                <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-1">
                    Сэтгэгдэл
                </label>
                <textarea
                    id="comment"
                    rows={4}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                    placeholder="Таны сэтгэгдэл..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                />
            </div>

            <button
                type="submit"
                disabled={submitting}
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                {submitting ? "Илгээж байна..." : "Илгээх"}
            </button>
        </form>
    );
}
