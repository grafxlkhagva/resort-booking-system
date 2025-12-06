"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { House } from "@/types";
import BookingModal from "@/components/user/BookingModal";
import ReviewList from "@/components/reviews/ReviewList";
import ReviewForm from "@/components/reviews/ReviewForm";
import { useAmenities } from "@/hooks/useAmenities";
import { Users, Wifi, Wind, MapPin, Star, Share2, Heart, Check, User } from "lucide-react";
import { isDiscountActive, formatValidDays, getDiscountStatus } from "@/lib/utils";

export default function HouseDetail() {
    const { id } = useParams();
    const [house, setHouse] = useState<House | null>(null);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [refreshReviews, setRefreshReviews] = useState(0);
    const { amenities, loading: amenitiesLoading } = useAmenities();

    // Review stats
    const [reviews, setReviews] = useState<any[]>([]);
    const [averageRating, setAverageRating] = useState(0);

    useEffect(() => {
        const fetchHouse = async () => {
            if (!id) return;
            try {
                const docRef = doc(db, "accommodations", id as string);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setHouse({
                        id: docSnap.id,
                        name: data.name,
                        houseNumber: data.houseNumber || 0,
                        description: data.description,
                        longDescription: data.longDescription,
                        price: data.pricePerNight || 0,
                        capacity: data.capacity || 4,
                        imageUrl: data.featuredImage || "",
                        images: data.images || [],
                        amenities: data.amenities || [],
                        createdAt: data.createdAt?.seconds ? data.createdAt.seconds * 1000 : Date.now(),
                        discount: data.discount || undefined,
                    } as House);
                } else {
                    console.log("No such document!");
                }
            } catch (error) {
                console.error("Error fetching house:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchHouse();
    }, [id]);

    // Fetch reviews to show stats in header
    useEffect(() => {
        if (!id) return;
        const fetchReviews = async () => {
            try {
                const q = query(
                    collection(db, "reviews"),
                    where("houseId", "==", id),
                    orderBy("createdAt", "desc")
                );
                const querySnapshot = await getDocs(q);
                const reviewsData = querySnapshot.docs.map((doc: any) => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setReviews(reviewsData);

                if (reviewsData.length > 0) {
                    const total = reviewsData.reduce((acc: number, r: any) => acc + r.rating, 0);
                    setAverageRating(total / reviewsData.length);
                } else {
                    setAverageRating(0);
                }
            } catch (error) {
                console.error("Error fetching reviews:", error);
            }
        };
        fetchReviews();
    }, [id, refreshReviews]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
        </div>
    );

    if (!house) return <div className="min-h-screen flex items-center justify-center">House not found</div>;

    // Prepare images for grid (Featured + Gallery)
    const allImages = [house.imageUrl, ...(house.images || [])].filter(Boolean);
    const displayImages = allImages.slice(0, 5); // Max 5 images for grid

    const discountActive = isDiscountActive(house.discount);
    const discountStatus = getDiscountStatus(house.discount);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header Section */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    <span className="mr-3 text-indigo-600">#{house.houseNumber}</span>
                    {house.name}
                </h1>
                <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center space-x-4">
                        <span className="flex items-center">
                            <Star className="w-4 h-4 text-yellow-400 mr-1" fill="currentColor" />
                            <span className="font-medium text-gray-900">
                                {averageRating > 0 ? averageRating.toFixed(1) : "Шинэ"}
                            </span>
                            <span className="mx-1">·</span>
                            <span className="underline">
                                {reviews.length > 0 ? `${reviews.length} сэтгэгдэл` : "Сэтгэгдэлгүй"}
                            </span>
                        </span>
                        <span className="flex items-center">
                            <MapPin className="w-4 h-4 mr-1" />
                            Тэрэлж, Улаанбаатар
                        </span>
                    </div>
                    <div className="flex items-center space-x-4">
                        <button className="flex items-center hover:underline">
                            <Share2 className="w-4 h-4 mr-2" />
                            Хуваалцах
                        </button>
                        <button className="flex items-center hover:underline">
                            <Heart className="w-4 h-4 mr-2" />
                            Хадгалах
                        </button>
                    </div>
                </div>
            </div>

            {/* Image Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 h-[400px] md:h-[500px] rounded-2xl overflow-hidden mb-10">
                <div className="md:col-span-2 h-full">
                    <img
                        src={displayImages[0]}
                        alt={house.name}
                        className="w-full h-full object-cover hover:opacity-95 transition-opacity cursor-pointer"
                    />
                </div>
                <div className="hidden md:grid md:col-span-2 grid-cols-2 gap-2 h-full">
                    {displayImages.slice(1).map((img, idx) => (
                        <div key={idx} className="relative h-full">
                            <img
                                src={img}
                                alt={`${house.name} ${idx + 2}`}
                                className="w-full h-full object-cover hover:opacity-95 transition-opacity cursor-pointer"
                            />
                        </div>
                    ))}
                    {/* Fallback if not enough images */}
                    {displayImages.length < 5 && Array.from({ length: 5 - displayImages.length }).map((_, idx) => (
                        <div key={`placeholder-${idx}`} className="bg-gray-100 flex items-center justify-center text-gray-400">
                            <span className="text-xs">Зураг оруулаагүй</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Left Column: Details */}
                <div className="lg:col-span-2 space-y-10">
                    {/* Host Info & Capacity */}
                    <div className="flex items-center justify-between border-b border-gray-200 pb-6">
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900 mb-1">
                                Зохион байгуулагч: Resort Team
                            </h2>
                            <p className="text-gray-500">
                                {house.capacity} зочин · {house.capacity > 4 ? "2 унтлагын өрөө" : "1 унтлагын өрөө"} · 1 ариун цэврийн өрөө
                            </p>
                        </div>
                        <div className="h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                            <User size={24} />
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Байшингийн тухай</h3>
                        <div className="prose prose-indigo text-gray-600">
                            <p>{house.longDescription || house.description}</p>
                        </div>
                    </div>

                    {/* Amenities */}
                    <div className="border-t border-gray-200 pt-8">
                        <h3 className="text-lg font-semibold text-gray-900 mb-6">Тав тух, нэмэлтүүд</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {house.amenities.map((item: any) => {
                                const amenityId = typeof item === 'string' ? item : item.amenityId;
                                const quantity = typeof item === 'string' ? 1 : item.quantity;
                                const amenity = amenities.find(a => a.id === amenityId);

                                // Skip if amenity not found (likely deleted or invalid ID)
                                if (!amenity && !amenitiesLoading) return null;

                                return (
                                    <div key={amenityId} className="flex items-center text-gray-600">
                                        {amenity && amenity.imageUrl ? (
                                            <img src={amenity.imageUrl} alt={amenity.name} className="w-6 h-6 mr-3 object-contain opacity-70" />
                                        ) : (
                                            <Check className="w-5 h-5 mr-3 text-gray-400" />
                                        )}
                                        <span className="text-base">
                                            {amenity ? amenity.name : "..."}
                                            {quantity > 1 && <span className="ml-1 text-gray-400">({quantity}x)</span>}
                                        </span>
                                    </div>
                                );
                            })}
                            <div className="flex items-center text-gray-600">
                                <Users className="w-5 h-5 mr-3 text-gray-400" />
                                <span className="text-base">{house.capacity} хүн хүртэл</span>
                            </div>
                        </div>
                    </div>

                    {/* Reviews Section */}
                    <div className="border-t border-gray-200 pt-8">
                        <h3 className="text-lg font-semibold text-gray-900 mb-6">Сэтгэгдэл</h3>
                        <ReviewList houseId={house.id} refreshTrigger={refreshReviews} />

                        <div className="mt-8">
                            <ReviewForm houseId={house.id} onReviewSubmitted={() => setRefreshReviews(prev => prev + 1)} />
                        </div>
                    </div>
                </div>

                {/* Right Column: Sticky Booking Card */}
                <div className="lg:col-span-1">
                    <div className="sticky top-24 bg-white rounded-xl shadow-xl border border-gray-200 p-6">
                        <div className="mb-6">
                            {discountActive ? (
                                <div className="flex flex-col">
                                    <div className="flex items-baseline space-x-2">
                                        <span className="text-2xl font-bold text-red-600">
                                            ${house.discount!.price}
                                        </span>
                                        <span className="text-lg text-gray-500 line-through">
                                            ${house.price}
                                        </span>
                                        <span className="text-gray-500">/хоног</span>
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                            {house.discount?.label || "ХЯМДРАЛ"}
                                        </span>
                                        {house.discount?.validDays && house.discount.validDays.length > 0 && (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                {formatValidDays(house.discount.validDays)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-baseline">
                                    <span className="text-2xl font-bold text-gray-900">${house.price}</span>
                                    <span className="text-gray-500 ml-1">/хоног</span>
                                </div>
                            )}
                        </div>

                        <div className="border border-gray-300 rounded-lg mb-4 overflow-hidden">
                            <div className="flex border-b border-gray-300">
                                <div className="w-1/2 p-3 border-r border-gray-300">
                                    <label className="block text-xs font-bold text-gray-700 uppercase">Ирэх</label>
                                    <div className="text-sm text-gray-500 mt-1">Огноо сонгох</div>
                                </div>
                                <div className="w-1/2 p-3">
                                    <label className="block text-xs font-bold text-gray-700 uppercase">Буцах</label>
                                    <div className="text-sm text-gray-500 mt-1">Огноо сонгох</div>
                                </div>
                            </div>
                            <div className="p-3">
                                <label className="block text-xs font-bold text-gray-700 uppercase">Зочид</label>
                                <div className="text-sm text-gray-900 mt-1">{house.capacity} зочин</div>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowModal(true)}
                            className="w-full bg-indigo-600 border border-transparent rounded-lg py-3 px-4 flex items-center justify-center text-lg font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                        >
                            Захиалах
                        </button>

                        <p className="text-xs text-center text-gray-500 mt-4">
                            Төлбөрийг баталгаажуулсны дараа төлнө
                        </p>

                        <div className="mt-6 space-y-3">
                            <div className="flex justify-between text-gray-600">
                                <span className="underline">Үндсэн үнэ</span>
                                <span>${discountActive ? house.discount!.price : house.price}</span>
                            </div>
                            <div className="flex justify-between text-gray-600">
                                <span className="underline">Үйлчилгээний хураамж</span>
                                <span>$0</span>
                            </div>
                            <div className="border-t border-gray-200 pt-3 flex justify-between font-bold text-gray-900">
                                <span>Нийт (татварын өмнө)</span>
                                <span>${discountActive ? house.discount!.price : house.price}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showModal && (
                <BookingModal house={house} onClose={() => setShowModal(false)} />
            )}
        </div>
    );
}
