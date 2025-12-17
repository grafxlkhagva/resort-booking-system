"use client";

import { useState, useEffect } from "react";
import { House } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { X, Check, Calendar, Users as UsersIcon } from "lucide-react";
import { calculateBookingPrice, type BookingPriceBreakdown } from "@/lib/utils";
import { getDoc, doc } from "firebase/firestore"; // Import doc & getDoc
import { ResortSettings } from "@/types";
import { sendBookingNotificationSMS, formatBookingMessage } from "@/lib/sms";
import LoginModal from "@/components/auth/LoginModal";

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
                    setError("Буцах өдөр нь ирэх өдрөөс хойш байх ёстой.");
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
            setError("Огноо зөв сонгоно уу.");
            return;
        }

        if (guestCount > house.capacity) {
            setError(`Зочдын тоо ${house.capacity}-аас хэтрэхгүй байх ёстой.`);
            return;
        }

        setLoading(true);
        setError("");

        try {
            await addDoc(collection(db, "bookings"), {
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

            setSuccess(true);

            // Send Notification SMS to Admin
            try {
                const settingsDoc = await getDoc(doc(db, "settings", "general"));
                if (settingsDoc.exists()) {
                    const settings = settingsDoc.data() as ResortSettings;
                    const phone = settings.bookingControl?.notificationPhone;

                    if (phone) {
                        const message = formatBookingMessage(
                            house.name,
                            user.displayName || user.email || "Зочин",
                            new Date(startDate).toLocaleDateString(),
                            new Date(endDate).toLocaleDateString(),
                            priceBreakdown.totalPrice
                        );
                        await sendBookingNotificationSMS(phone, message);
                    }
                }
            } catch (err) {
                console.error("Failed to send notification SMS", err);
            }

            // Auto redirect after 2 seconds
            setTimeout(() => {
                router.push("/profile");
            }, 2000);
        } catch (error) {
            console.error("Error creating booking:", error);
            setError("Захиалга үүсгэхэд алдаа гарлаа. Дахин оролдоно уу.");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg max-w-md w-full p-8 relative text-center">
                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                        <Check className="h-8 w-8 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Амжилттай!</h2>
                    <p className="text-gray-600 mb-6">
                        Таны захиалга амжилттай илгээгдлээ. Админ баталгаажуулсны дараа мэдэгдэл ирнэ.
                    </p>
                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                        <div className="text-sm text-gray-600 mb-2">
                            <Calendar className="inline w-4 h-4 mr-1" />
                            {new Date(startDate).toLocaleDateString('mn-MN')} - {new Date(endDate).toLocaleDateString('mn-MN')}
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                            <UsersIcon className="inline w-4 h-4 mr-1" />
                            {guestCount} зочин
                        </div>
                        <div className="text-lg font-bold text-indigo-600">
                            ${priceBreakdown?.totalPrice}
                        </div>
                    </div>
                    <button
                        onClick={() => router.push("/profile")}
                        className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors"
                    >
                        Миний захиалгууд руу очих
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6 relative max-h-[90vh] overflow-y-auto">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-500"
                >
                    <X size={24} />
                </button>

                <h2 className="text-2xl font-bold text-gray-900 mb-4">{house.name}-г захиалах</h2>

                <form onSubmit={handleBooking} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ирэх өдөр</label>
                        <input
                            type="date"
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            min={new Date().toISOString().split("T")[0]}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Буцах өдөр</label>
                        <input
                            type="date"
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            min={startDate || new Date().toISOString().split("T")[0]}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Зочид (Хамгийн ихдээ {house.capacity})
                        </label>
                        <input
                            type="number"
                            required
                            min="1"
                            max={house.capacity}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            value={guestCount}
                            onChange={(e) => setGuestCount(Number(e.target.value))}
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">
                            {error}
                        </div>
                    )}

                    {priceBreakdown && priceBreakdown.totalDays > 0 && (
                        <div className="pt-4 border-t border-gray-200 space-y-2">
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>${house.price} x {priceBreakdown.totalDays} хоног</span>
                                <span>${priceBreakdown.basePrice}</span>
                            </div>

                            {priceBreakdown.discountedDays > 0 && (
                                <>
                                    <div className="flex justify-between text-sm text-gray-600">
                                        <span className="text-green-600">
                                            Хямдралтай өдрүүд ({priceBreakdown.discountedDays} хоног)
                                        </span>
                                        <span className="text-green-600">-${priceBreakdown.discountAmount}</span>
                                    </div>
                                </>
                            )}

                            <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t">
                                <span>Нийт</span>
                                <span className={priceBreakdown.discountAmount > 0 ? "text-green-600" : ""}>
                                    ${priceBreakdown.totalPrice}
                                </span>
                            </div>

                            {priceBreakdown.discountAmount > 0 && (
                                <p className="text-xs text-green-600 text-center">
                                    Та ${priceBreakdown.discountAmount} хэмнэлээ!
                                </p>
                            )}
                        </div>
                    )}


                    <button
                        type="submit"
                        disabled={loading || !priceBreakdown || priceBreakdown.totalPrice <= 0}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {loading ? "Боловсруулж байна..." : "Захиалга Баталгаажуулах"}
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
