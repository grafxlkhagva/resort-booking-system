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
import { ResortSettings } from "@/types"; // Import ResortSettings

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

    const [bookingBlocked, setBookingBlocked] = useState(false);
    const [blockMessage, setBlockMessage] = useState("");

    // Check for blocking
    useEffect(() => {
        const checkBlocking = async () => {
            try {
                const docRef = doc(db, "settings", "general");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const settings = docSnap.data() as ResortSettings;
                    const bookingControl = settings.bookingControl;

                    if (bookingControl?.isBlocked) {
                        const now = Date.now();
                        const start = bookingControl.blockStartDate || 0;
                        const end = bookingControl.blockEndDate || Number.MAX_SAFE_INTEGER;

                        if (now >= start && now <= end) {
                            setBookingBlocked(true);
                            // Optional: Format message
                            const startStr = bookingControl.blockStartDate ? new Date(bookingControl.blockStartDate).toLocaleDateString() : '..';
                            const endStr = bookingControl.blockEndDate ? new Date(bookingControl.blockEndDate).toLocaleDateString() : '..';
                            setBlockMessage(`Системийн засвар үйлчилгээ эсвэл захиалга хаагдсан тул (${startStr} - ${endStr}) хооронд захиалга авах боломжгүй байна.`);
                        }
                    }
                }
            } catch (e) {
                console.error("Error checking settings", e);
            }
        };
        checkBlocking();
    }, []);

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
        <div className="min-h-[50vh] flex items-center justify-center">
            <div className="spinner" />
        </div>
    );

    if (!house) return (
        <div className="content-padding text-center py-16">
            <p className="text-[var(--muted)]">Байшин олдсонгүй.</p>
            <a href="/" className="mt-4 inline-block text-[var(--primary)] font-medium hover:underline">Нүүр рүү буцах</a>
        </div>
    );

    // Prepare images for grid (Featured + Gallery)
    const allImages = [house.imageUrl, ...(house.images || [])].filter(Boolean);
    const displayImages = allImages.slice(0, 5); // Max 5 images for grid

    const discountActive = isDiscountActive(house.discount);
    const discountStatus = getDiscountStatus(house.discount);

    return (
        <div className="max-w-7xl mx-auto content-padding pb-8">
            {/* Header */}
            <div className="mb-4 sm:mb-6">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[var(--foreground)] mb-2">
                    <span className="text-[var(--primary)]">#{house.houseNumber}</span> {house.name}
                </h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--muted)]">
                    <span className="flex items-center">
                        <Star className="w-4 h-4 text-amber-400 mr-1" fill="currentColor" />
                        <span className="font-medium text-[var(--foreground)]">{averageRating > 0 ? averageRating.toFixed(1) : "Шинэ"}</span>
                        <span className="mx-1">·</span>
                        <span>{reviews.length > 0 ? `${reviews.length} сэтгэгдэл` : "Сэтгэгдэлгүй"}</span>
                    </span>
                    <span className="flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        Тэрэлж, Улаанбаатар
                    </span>
                    <span className="flex items-center gap-2 sm:ml-auto">
                        <button className="flex items-center hover:text-[var(--primary)] transition-colors touch-target">
                            <Share2 className="w-4 h-4 mr-1" /> Хуваалцах
                        </button>
                        <button className="flex items-center hover:text-[var(--primary)] transition-colors touch-target">
                            <Heart className="w-4 h-4 mr-1" /> Хадгалах
                        </button>
                    </span>
                </div>
            </div>

            {/* Image Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 h-[260px] sm:h-[340px] md:h-[420px] rounded-2xl overflow-hidden mb-8 sm:mb-10">
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
                            <img src={img} alt={`${house.name} ${idx + 2}`} className="w-full h-full object-cover" />
                        </div>
                    ))}
                    {displayImages.length < 5 && Array.from({ length: 5 - displayImages.length }).map((_, idx) => (
                        <div key={`pl-${idx}`} className="bg-[var(--background)] flex items-center justify-center text-[var(--muted-foreground)] text-xs">
                            Зураг оруулаагүй
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
                {/* Left: Details */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Host & Capacity */}
                    <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] pb-6">
                        <div className="min-w-0">
                            <h2 className="font-semibold text-[var(--foreground)] mb-0.5">Зохион байгуулагч: Resort Team</h2>
                            <p className="text-sm text-[var(--muted)]">
                                {house.capacity} зочин · {house.capacity > 4 ? "2 унтлагын өрөө" : "1 унтлагын өрөө"} · 1 ариун цэврийн өрөө
                            </p>
                        </div>
                        <div className="h-11 w-11 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] flex-shrink-0">
                            <User size={22} />
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <h3 className="font-semibold text-[var(--foreground)] mb-3">Байшингийн тухай</h3>
                        <p className="text-[var(--muted)] leading-relaxed">{house.longDescription || house.description}</p>
                    </div>

                    {/* Amenities */}
                    <div className="border-t border-[var(--border)] pt-6">
                        <h3 className="font-semibold text-[var(--foreground)] mb-4">Тав тух, нэмэлтүүд</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {house.amenities.map((item: any) => {
                                const amenityId = typeof item === 'string' ? item : item.amenityId;
                                const quantity = typeof item === 'string' ? 1 : item.quantity;
                                const amenity = amenities.find(a => a.id === amenityId);
                                if (!amenity && !amenitiesLoading) return null;
                                return (
                                    <div key={amenityId} className="flex items-center gap-3 text-[var(--muted)] text-sm">
                                        {amenity?.imageUrl ? (
                                            <img src={amenity.imageUrl} alt="" className="w-5 h-5 object-contain opacity-80" />
                                        ) : (
                                            <Check className="w-5 h-5 text-[var(--muted-foreground)]" />
                                        )}
                                        <span>{amenity ? amenity.name : "..."}{quantity > 1 && ` (${quantity}×)`}</span>
                                    </div>
                                );
                            })}
                            <div className="flex items-center gap-3 text-[var(--muted)] text-sm">
                                <Users className="w-5 h-5 text-[var(--muted-foreground)]" />
                                <span>{house.capacity} хүн хүртэл</span>
                            </div>
                        </div>
                    </div>

                    {/* Reviews */}
                    <div className="border-t border-[var(--border)] pt-6">
                        <h3 className="font-semibold text-[var(--foreground)] mb-4">Сэтгэгдэл</h3>
                        <ReviewList houseId={house.id} refreshTrigger={refreshReviews} />
                        <div className="mt-6">
                            <ReviewForm houseId={house.id} onReviewSubmitted={() => setRefreshReviews(prev => prev + 1)} />
                        </div>
                    </div>
                </div>

                {/* Right: Booking Card */}
                <div className="lg:col-span-1">
                    <div className="card-elevated sticky top-20 lg:top-24 p-4 sm:p-6">
                        <div className="mb-5">
                            {discountActive ? (
                                <div>
                                    <div className="flex items-baseline gap-2 flex-wrap">
                                        <span className="text-2xl font-bold text-red-600">${house.discount!.price}</span>
                                        <span className="text-[var(--muted)] line-through">${house.price}</span>
                                        <span className="text-[var(--muted)] text-sm">/хоног</span>
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-medium bg-red-100 text-red-800">
                                            {house.discount?.label || "ХЯМДРАЛ"}
                                        </span>
                                        {house.discount?.validDays && house.discount.validDays.length > 0 && (
                                            <span className="px-2.5 py-0.5 rounded-lg text-xs font-medium bg-[var(--background)] text-[var(--muted)]">
                                                {formatValidDays(house.discount.validDays)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-baseline">
                                    <span className="text-2xl font-bold text-[var(--foreground)]">${house.price}</span>
                                    <span className="text-[var(--muted)] ml-1 text-sm">/хоног</span>
                                </div>
                            )}
                        </div>

                        <div className="border border-[var(--border)] rounded-xl overflow-hidden mb-4">
                            <div className="flex border-b border-[var(--border)]">
                                <div className="w-1/2 p-3 border-r border-[var(--border)]">
                                    <span className="text-xs font-medium text-[var(--muted)] uppercase">Ирэх</span>
                                    <p className="text-sm text-[var(--muted-foreground)] mt-0.5">Огноо сонгох</p>
                                </div>
                                <div className="w-1/2 p-3">
                                    <span className="text-xs font-medium text-[var(--muted)] uppercase">Буцах</span>
                                    <p className="text-sm text-[var(--muted-foreground)] mt-0.5">Огноо сонгох</p>
                                </div>
                            </div>
                            <div className="p-3">
                                <span className="text-xs font-medium text-[var(--muted)] uppercase">Зочид</span>
                                <p className="text-sm font-medium text-[var(--foreground)] mt-0.5">{house.capacity} зочин</p>
                            </div>
                        </div>

                        {bookingBlocked ? (
                            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4 text-center">
                                <p className="font-medium text-red-800 dark:text-red-200 mb-1">Захиалга түр хаагдсан</p>
                                <p className="text-sm text-red-600 dark:text-red-300">{blockMessage || "Одоогоор захиалга авах боломжгүй."}</p>
                                <button disabled className="w-full mt-3 min-h-[var(--touch)] rounded-xl bg-[var(--border)] text-[var(--muted)] font-medium cursor-not-allowed">
                                    Захиалах боломжгүй
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowModal(true)}
                                className="btn-primary w-full flex items-center justify-center text-base"
                            >
                                Захиалах
                            </button>
                        )}

                        <p className="text-xs text-center text-[var(--muted)] mt-4">Төлбөрийг баталгаажуулсны дараа төлнө</p>
                        <p className="mt-4 text-sm text-[var(--muted)]">Захиалгын цонхонд огноо, хоногийн тоо, нийт дүн тооцогдоно.</p>
                    </div>
                </div>
            </div>

            {showModal && (
                <BookingModal house={house} onClose={() => setShowModal(false)} />
            )}
        </div>
    );
}
