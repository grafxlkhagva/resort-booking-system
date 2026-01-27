"use client";

import { useState, useEffect } from "react";
import { House } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { addDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { X, Check, Calendar, Users as UsersIcon } from "lucide-react";
import { calculateBookingPrice, type BookingPriceBreakdown } from "@/lib/utils";
import { sendBookingNotificationAction } from "@/actions/telegram";
import LoginModal from "@/components/auth/LoginModal";
import { useLanguage } from "@/contexts/LanguageContext";

interface BookingModalProps {
    house: House;
    onClose: () => void;
    initialStartDate?: string;
    initialEndDate?: string;
    initialGuestCount?: number;
}

export default function BookingModal({
    house,
    onClose,
    initialStartDate = "",
    initialEndDate = "",
    initialGuestCount = 1
}: BookingModalProps) {
    const { user } = useAuth();
    const router = useRouter();
    const { currentLanguage, t } = useLanguage();
    const [startDate, setStartDate] = useState(initialStartDate);
    const [endDate, setEndDate] = useState(initialEndDate);
    const [guestCount, setGuestCount] = useState(initialGuestCount);
    const [priceBreakdown, setPriceBreakdown] = useState<BookingPriceBreakdown | null>(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");
    const [showLogin, setShowLogin] = useState(false);
    const [pendingBookingSubmit, setPendingBookingSubmit] = useState(false);

    // Auto-submit after login if pending
    useEffect(() => {
        if (user && pendingBookingSubmit) {
            submitBooking();
            setPendingBookingSubmit(false);
        }
    }, [user, pendingBookingSubmit]);

    useEffect(() => {
        if (startDate && endDate) {
            try {
                const start = new Date(startDate);
                const end = new Date(endDate);

                // Validation
                if (end <= start) {
                    setError(t('booking_invalid_dates', 'Буцах өдөр нь ирэх өдрөөс хойш байх ёстой.'));
                    setPriceBreakdown(null);
                    return;
                }

                setError("");
                const breakdown = calculateBookingPrice(start, end, house);
                setPriceBreakdown(breakdown);
            } catch (err) {
                console.error("Price calculation error:", err);
                setPriceBreakdown(null);
            }
        } else {
            setPriceBreakdown(null);
        }
    }, [startDate, endDate, house]);

    const handleBooking = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (!user) {
            setPendingBookingSubmit(true);
            setShowLogin(true);
            return;
        }
        submitBooking();
    };

    const submitBooking = async () => {
        if (!user) return; // Should be handled, but typescript check

        if (!priceBreakdown || priceBreakdown.totalPrice <= 0) {
            setError(t('booking_invalid_selection', 'Огноо зөв сонгоно уу.'));
            return;
        }

        if (guestCount > house.capacity) {
            setError(t('booking_exceed_capacity', `Зочдын тоо ${house.capacity}-аас хэтрэхгүй байх ёстой.`, { capacity: house.capacity }));
            return;
        }

        setLoading(true);
        setError("");

        try {
            const requestedStart = new Date(startDate).getTime();
            const requestedEnd = new Date(endDate).getTime();

            const q = query(
                collection(db, "bookings"),
                where("houseId", "==", house.id),
                where("status", "in", ["pending", "confirmed"])
            );
            const snap = await getDocs(q);
            const hasOverlap = snap.docs.some((d) => {
                const b = d.data();
                const s = b.startDate;
                const e = b.endDate;
                return s < requestedEnd && e > requestedStart;
            });
            if (hasOverlap) {
                setError(t('booking_overlap_error', 'Энэ хугацаанд байр боломжгүй байна. Өөр огноо сонгоно уу.'));
                setLoading(false);
                return;
            }

            const bookingRef = await addDoc(collection(db, "bookings"), {
                userId: user.uid,
                houseId: house.id,
                houseName: house.name,
                startDate: new Date(startDate).getTime(),
                endDate: new Date(endDate).getTime(),
                status: "pending",
                totalPrice: priceBreakdown.totalPrice,
                guestCount,
                createdAt: Date.now(),
            });

            setSuccess(true);

            try {
                const notifResult = await sendBookingNotificationAction(
                    house.name,
                    user.displayName || user.email || "Зочин",
                    user.phoneNumber || "Утасгүй",
                    new Date(startDate).toLocaleDateString(),
                    new Date(endDate).toLocaleDateString(),
                    priceBreakdown.totalPrice,
                    false,
                    bookingRef.id // Pass booking ID for callback buttons
                );

                if (!notifResult.success) {
                    console.error("Failed to send Telegram notification:", notifResult.error);
                }
            } catch (err) {
                console.error("Error executing sendBookingNotification:", err);
            }

            // Auto redirect after 2 seconds
            setTimeout(() => {
                router.push("/profile");
            }, 2000);
        } catch (error) {
            console.error("Error creating booking:", error);
            setError(t('booking_error', 'Захиалга үүсгэхэд алдаа гарлаа. Дахин оролдоно уу.'));
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="fixed inset-0 modal-overlay flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 safe-bottom">
                <div className="card w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 sm:p-8 text-center">
                    <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-green-100 text-green-600 mb-4">
                        <Check className="h-7 w-7" />
                    </div>
                    <h2 className="text-xl font-bold text-[var(--foreground)] mb-2">{t('booking_success', 'Амжилттай!')}</h2>
                    <p className="text-[var(--muted)] mb-6">
                        {t('booking_success_info', 'Таны захиалга амжилттай илгээгдлээ. Админ баталгаажуулсны дараа мэдэгдэл ирнэ.')}
                    </p>
                    <div className="bg-[var(--background)] rounded-xl p-4 mb-6 text-left">
                        <div className="text-sm text-[var(--muted)] flex items-center gap-2 mb-1">
                            <Calendar size={16} /> {new Date(startDate).toLocaleDateString(currentLanguage === 'mn' ? "mn-MN" : "en-US")} – {new Date(endDate).toLocaleDateString(currentLanguage === 'mn' ? "mn-MN" : "en-US")}
                        </div>
                        <div className="text-sm text-[var(--muted)] flex items-center gap-2 mb-2">
                            <UsersIcon size={16} /> {guestCount} {t('people', 'зочин')}
                        </div>
                        <div className="text-lg font-bold text-[var(--primary)]">${priceBreakdown?.totalPrice}</div>
                    </div>
                    <button onClick={() => router.push("/profile")} className="btn-primary w-full">
                        {t('nav_my_bookings', 'Миний захиалгууд руу')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 modal-overlay flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 safe-bottom">
            <div className="card w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 relative max-h-[90vh] overflow-y-auto">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 touch-target flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)]"
                    aria-label="Хаах"
                >
                    <X size={22} />
                </button>

                <h2 className="text-xl font-bold text-[var(--foreground)] mb-4 pr-10">{house.localizedNames?.[currentLanguage] || house.name} – {t('book_now', 'захиалах')}</h2>

                <form onSubmit={handleBooking} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-[var(--foreground)] mb-1">{t('house_check_in', 'Ирэх өдөр')}</label>
                        <input
                            type="date"
                            required
                            className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            min={new Date().toISOString().split("T")[0]}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--foreground)] mb-1">{t('house_check_out', 'Буцах өдөр')}</label>
                        <input
                            type="date"
                            required
                            className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            min={startDate || new Date().toISOString().split("T")[0]}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--foreground)] mb-1">{t('house_guests', 'Зочид')} ({t('max', 'макс')}. {house.capacity})</label>
                        <input
                            type="number"
                            required
                            min={1}
                            max={house.capacity}
                            className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                            value={guestCount}
                            onChange={(e) => setGuestCount(Number(e.target.value))}
                        />
                    </div>

                    {error && (
                        <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm border border-red-100">
                            {error}
                        </div>
                    )}

                    {priceBreakdown && priceBreakdown.totalDays > 0 && (
                        <div className="pt-4 border-t border-[var(--border)] space-y-2">
                            <div className="flex justify-between text-sm text-[var(--muted)]">
                                <span>{t('booking_night_rate', '${price} × {days} хоног', { price: house.price, days: priceBreakdown.totalDays })}</span>
                                <span>${priceBreakdown.basePrice}</span>
                            </div>
                            {priceBreakdown.discountedDays > 0 && (
                                <div className="flex justify-between text-sm text-green-600">
                                    <span>{t('discount', 'Хямдрал')} ({priceBreakdown.discountedDays} {t('day', 'хоног')})</span>
                                    <span>-${priceBreakdown.discountAmount}</span>
                                </div>
                            )}
                            <div className="flex justify-between font-bold text-[var(--foreground)] pt-2 border-t border-[var(--border)]">
                                <span>{t('total', 'Нийт')}</span>
                                <span className={priceBreakdown.discountAmount > 0 ? "text-green-600" : ""}>${priceBreakdown.totalPrice}</span>
                            </div>
                            {priceBreakdown.discountAmount > 0 && (
                                <p className="text-xs text-green-600 text-center">{t('booking_discount_save', 'Та ${amount} хэмнэлээ.', { amount: priceBreakdown.discountAmount })}</p>
                            )}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !priceBreakdown || priceBreakdown.totalPrice <= 0}
                        className="btn-primary w-full"
                    >
                        {loading ? t('booking_processing', 'Боловсруулж байна…') : t('booking_confirm', 'Захиалга баталгаажуулах')}
                    </button>
                </form>
            </div>

            <LoginModal
                isOpen={showLogin}
                onClose={() => { setShowLogin(false); setPendingBookingSubmit(false); }}
                onSuccess={() => setShowLogin(false)}
            />
        </div>
    );
}
