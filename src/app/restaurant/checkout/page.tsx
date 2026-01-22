"use client";

import { useState, useEffect } from "react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, getDoc, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Trash2, ArrowLeft, Home, ShoppingBag, CheckCircle } from "lucide-react";
import Link from "next/link";
import { startOfDay, endOfDay } from "date-fns";
import { House, Booking } from "@/types";

export default function CheckoutPage() {
    const { items, removeFromCart, updateQuantity, totalAmount, clearCart } = useCart();
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [submitting, setSubmitting] = useState(false);
    const [deliveryType, setDeliveryType] = useState<"house" | "pickup">("house");
    const [activeBooking, setActiveBooking] = useState<{ booking: Booking, house: House } | null>(null);
    const [loadingBooking, setLoadingBooking] = useState(true);
    const [note, setNote] = useState("");
    const [minOrderAmount, setMinOrderAmount] = useState<number | null>(null);
    const [unavailableCartIds, setUnavailableCartIds] = useState<string[]>([]);

    // Fetch settings for minOrderAmount
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const snap = await getDoc(doc(db, "settings", "general"));
                if (snap.exists() && snap.data().restaurant?.minOrderAmount != null) {
                    setMinOrderAmount(snap.data().restaurant.minOrderAmount);
                }
            } catch (e) {
                console.error("Error fetching restaurant settings:", e);
            }
        };
        fetchSettings();
    }, []);

    // Check for active booking (covers today: startDate <= todayEnd && endDate >= todayStart)
    useEffect(() => {
        const checkBooking = async () => {
            if (!user) {
                setLoadingBooking(false);
                return;
            }

            try {
                const todayStart = startOfDay(new Date()).getTime();
                const todayEnd = endOfDay(new Date()).getTime();

                const q = query(
                    collection(db, "bookings"),
                    where("userId", "==", user.uid),
                    where("status", "==", "confirmed"),
                    orderBy("endDate", "desc"),
                    limit(5)
                );

                const snapshot = await getDocs(q);
                for (const d of snapshot.docs) {
                    const bookingData = { id: d.id, ...d.data() } as Booking;
                    if (bookingData.startDate <= todayEnd && bookingData.endDate >= todayStart) {
                        const houseSnap = await getDoc(doc(db, "accommodations", bookingData.houseId));
                        if (houseSnap.exists()) {
                            const data = houseSnap.data();
                            const house: House = {
                                id: houseSnap.id,
                                ...data,
                                price: data.pricePerNight ?? data.price ?? 0,
                                imageUrl: data.featuredImage ?? data.imageUrl ?? "",
                            } as House;
                            setActiveBooking({ booking: bookingData, house });
                        }
                        break;
                    }
                }
            } catch (error) {
                console.error("Error checking active booking:", error);
            } finally {
                setLoadingBooking(false);
            }
        };

        checkBooking();
    }, [user]);

    // Detect cart items that are no longer available
    useEffect(() => {
        if (items.length === 0) {
            setUnavailableCartIds([]);
            return;
        }
        const check = async () => {
            const ids: string[] = [];
            await Promise.all(
                items.map(async (i) => {
                    const snap = await getDoc(doc(db, "menu_items", i.menuItemId));
                    if (!snap.exists() || !snap.data()?.isAvailable) ids.push(i.menuItemId);
                })
            );
            setUnavailableCartIds(ids);
        };
        check();
    }, [items]);

    const handlePlaceOrder = async () => {
        if (!user) {
            router.push("/login?redirect=/restaurant/checkout");
            return;
        }

        if (items.length === 0) return;

        if (minOrderAmount != null && totalAmount < minOrderAmount) {
            alert(`Доод захиалгын дүн: ${minOrderAmount.toLocaleString()}₮. Таны сагс: ${totalAmount.toLocaleString()}₮`);
            return;
        }

        if (unavailableCartIds.length > 0) {
            alert("Сагсанд одоо боломжгүй бүтээгдэхүүн байна. Сагснаас хасаад дахин оролдоно уу.");
            return;
        }

        try {
            setSubmitting(true);

            const orderData = {
                userId: user.uid,
                userPhone: user.phoneNumber || "",
                guestName: user.displayName || user.email,
                items: items.map(i => ({
                    menuItemId: i.menuItemId,
                    name: i.name,
                    price: i.price,
                    quantity: i.quantity,
                    notes: i.notes
                })),
                totalAmount,
                status: 'pending',
                deliveryType,
                houseId: deliveryType === 'house' ? activeBooking?.house?.id : null,
                houseName: deliveryType === 'house' ? activeBooking?.house?.name : null,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                note
            };

            await addDoc(collection(db, "orders"), orderData);

            clearCart();
            router.push("/restaurant?order=success");
        } catch (error) {
            console.error("Error placing order:", error);
            alert("Захиалга илгээхэд алдаа гарлаа. Дахин оролдоно уу.");
        } finally {
            setSubmitting(false);
        }
    };

    if (items.length === 0) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4">
                <ShoppingBag size={56} className="text-[var(--muted-foreground)] mb-4" />
                <h2 className="text-xl font-bold text-[var(--foreground)] mb-2">Сагс хоосон</h2>
                <p className="text-[var(--muted)] mb-6">Одоогоор юу ч нэмэгдээгүй байна.</p>
                <Link href="/restaurant" className="btn-primary inline-flex px-6">
                    Цэс рүү
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen content-padding">
            <div className="max-w-4xl mx-auto">
                <Link href="/restaurant" className="inline-flex items-center gap-2 text-[var(--muted)] hover:text-[var(--primary)] mb-6">
                    <ArrowLeft size={18} /> Цэс рүү буцах
                </Link>

                {unavailableCartIds.length > 0 && (
                    <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200">
                        <p className="text-amber-800 font-medium mb-2">Одоо боломжгүй: {items.filter((i) => unavailableCartIds.includes(i.menuItemId)).map((i) => i.name).join(", ")}</p>
                        <button type="button" onClick={() => { unavailableCartIds.forEach((id) => removeFromCart(id)); setUnavailableCartIds([]); }} className="text-sm text-amber-700 underline hover:no-underline">
                            Сагснаас хасах
                        </button>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                    <div className="card overflow-hidden p-5 sm:p-6">
                        <h2 className="text-lg font-bold text-[var(--foreground)] mb-5">Захиалгын дэлгэрэнгүй</h2>
                        <ul className="divide-y divide-[var(--border)]">
                            {items.map((item) => (
                                <li key={item.menuItemId} className="py-4 flex gap-4">
                                    {item.imageUrl && (
                                        <img src={item.imageUrl} alt={item.name} className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover bg-[var(--background)] flex-shrink-0" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between gap-2 mb-1">
                                            <h3 className="font-medium text-[var(--foreground)] truncate">{item.name}</h3>
                                            <span className="font-medium text-[var(--foreground)] flex-shrink-0">${item.price * item.quantity}</span>
                                        </div>
                                        <p className="text-sm text-[var(--muted)] mb-2">${item.price} × {item.quantity}</p>
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center border border-[var(--border)] rounded-xl overflow-hidden">
                                                <button type="button" onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)} className="px-3 py-2 hover:bg-[var(--background)] text-[var(--foreground)] touch-target">
                                                    −
                                                </button>
                                                <span className="px-3 py-2 text-sm font-medium min-w-[2rem] text-center">{item.quantity}</span>
                                                <button type="button" onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)} className="px-3 py-2 hover:bg-[var(--background)] text-[var(--foreground)] touch-target">
                                                    +
                                                </button>
                                            </div>
                                            <button type="button" onClick={() => removeFromCart(item.menuItemId)} className="text-[var(--muted)] hover:text-red-500 touch-target p-2" aria-label="Устгах">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                        <div className="border-t border-[var(--border)] mt-5 pt-4 flex justify-between items-center">
                            <span className="font-bold text-[var(--foreground)]">Нийт</span>
                            <span className="text-xl font-bold text-[var(--primary)]">${totalAmount}</span>
                        </div>
                    </div>

                    <div className="space-y-5">
                        <div className="card p-5 sm:p-6">
                            <h2 className="font-bold text-[var(--foreground)] mb-4">Хүргэлтийн сонголт</h2>
                            <div className="space-y-3">
                                <label className={`flex items-start gap-3 border rounded-xl p-4 cursor-pointer transition ${deliveryType === "house" ? "border-[var(--primary)] bg-[var(--primary)]/5 ring-1 ring-[var(--primary)]" : "border-[var(--border)] hover:border-[var(--muted)]"}`}>
                                    <input type="radio" name="delivery" value="house" checked={deliveryType === "house"} onChange={() => setDeliveryType("house")} className="mt-1 h-4 w-4 text-[var(--primary)]" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-medium text-[var(--foreground)]">Байшинд хүргэх</span>
                                            <Home size={18} className="text-[var(--muted)] flex-shrink-0" />
                                        </div>
                                        {deliveryType === "house" && (
                                            <div className="mt-2 text-sm text-[var(--muted)]">
                                                {loadingBooking ? "Шалгаж байна…" : activeBooking ? (
                                                    <span className="text-green-600 flex items-center gap-1 font-medium">
                                                        <CheckCircle size={14} /> {activeBooking.house.name} (#{activeBooking.house.houseNumber})
                                                    </span>
                                                ) : (
                                                    <span className="text-amber-600">Идэвхтэй захиалга олдсонгүй. Байршил асууна.</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </label>
                                <label className={`flex items-start gap-3 border rounded-xl p-4 cursor-pointer transition ${deliveryType === "pickup" ? "border-[var(--primary)] bg-[var(--primary)]/5 ring-1 ring-[var(--primary)]" : "border-[var(--border)] hover:border-[var(--muted)]"}`}>
                                    <input type="radio" name="delivery" value="pickup" checked={deliveryType === "pickup"} onChange={() => setDeliveryType("pickup")} className="mt-1 h-4 w-4 text-[var(--primary)]" />
                                    <div>
                                        <span className="font-medium text-[var(--foreground)]">Ресторан дээр авах</span>
                                        <span className="block text-sm text-[var(--muted)]">Бэлэн болоход мэдэгдэнэ.</span>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <div className="card p-5 sm:p-6">
                            <h2 className="font-bold text-[var(--foreground)] mb-4">Нэмэлт тайлбар</h2>
                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-sm resize-none"
                                rows={3}
                                placeholder="Харшил, тусгай хүсэлт гэх мэт"
                            />
                        </div>

                        {minOrderAmount != null && totalAmount > 0 && totalAmount < minOrderAmount && (
                            <p className="text-sm text-amber-600">Доод дүн: {minOrderAmount.toLocaleString()}₮</p>
                        )}
                        <button
                            onClick={handlePlaceOrder}
                            disabled={submitting || (minOrderAmount != null && totalAmount < minOrderAmount) || unavailableCartIds.length > 0}
                            className="btn-primary w-full py-4 text-base"
                        >
                            {submitting ? "Илгээж байна…" : `Захиалга илгээх · $${totalAmount}`}
                        </button>
                        {!user && <p className="text-sm text-center text-[var(--muted)]">Захиалга илгээхийн тулд нэвтэрнэ үү.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}
