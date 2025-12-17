"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { Review } from "@/types";
import { Star, User } from "lucide-react";

interface ReviewListProps {
    houseId: string;
    refreshTrigger?: number; // Prop to trigger refresh when new review is added
}

export default function ReviewList({ houseId, refreshTrigger }: ReviewListProps) {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [averageRating, setAverageRating] = useState(0);

    useEffect(() => {
        const fetchReviews = async () => {
            try {
                const q = query(
                    collection(db, "reviews"),
                    where("houseId", "==", houseId),
                    orderBy("createdAt", "desc")
                );

                const querySnapshot = await getDocs(q);
                const reviewsData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Review[];

                setReviews(reviewsData);

                if (reviewsData.length > 0) {
                    const total = reviewsData.reduce((acc, review) => acc + review.rating, 0);
                    setAverageRating(total / reviewsData.length);
                } else {
                    setAverageRating(0);
                }
            } catch (error) {
                console.error("Error fetching reviews:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchReviews();
    }, [houseId, refreshTrigger]);

    if (loading) {
        return <div className="text-gray-500 text-sm">Сэтгэгдэл уншиж байна...</div>;
    }

    return (
        <div>
            <div className="flex items-center mb-6">
                <Star className="w-6 h-6 text-yellow-400 fill-current mr-2" />
                <span className="text-2xl font-bold text-gray-900">
                    {averageRating > 0 ? averageRating.toFixed(1) : "Шинэ"}
                </span>
                <span className="mx-2 text-gray-400">·</span>
                <span className="text-gray-600 underline">
                    {reviews.length} сэтгэгдэл
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {reviews.length > 0 ? (
                    reviews.map((review) => (
                        <div key={review.id} className="bg-gray-50 p-4 rounded-xl">
                            <div className="flex items-center mb-3">
                                {review.userAvatar ? (
                                    <img
                                        src={review.userAvatar}
                                        alt={review.userName}
                                        className="h-10 w-10 rounded-full mr-3 object-cover"
                                    />
                                ) : (
                                    <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 mr-3">
                                        <User size={16} />
                                    </div>
                                )}
                                <div>
                                    <p className="font-medium text-gray-900">{review.userName}</p>
                                    <div className="flex items-center">
                                        <div className="flex mr-2">
                                            {Array.from({ length: 5 }).map((_, i) => (
                                                <Star
                                                    key={i}
                                                    className={`w-3 h-3 ${i < review.rating ? "text-yellow-400 fill-current" : "text-gray-300"}`}
                                                />
                                            ))}
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            {review.createdAt
                                                ? new Date(typeof review.createdAt === 'number'
                                                    ? review.createdAt
                                                    : (review.createdAt as unknown as { seconds: number }).seconds * 1000
                                                ).toLocaleDateString()
                                                : ""}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <p className="text-sm text-gray-600">
                                &quot;{review.comment}&quot;
                            </p>
                        </div>
                    ))
                ) : (
                    <div className="col-span-2 text-center py-8 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                        Одоогоор сэтгэгдэл байхгүй байна. Та анхны сэтгэгдлийг бичээрэй!
                    </div>
                )}
            </div>
        </div>
    );
}
