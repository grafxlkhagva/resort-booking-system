"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy, doc, getDoc, updateDoc } from "firebase/firestore";
import { Booking, UserProfile } from "@/types";
import { useRouter } from "next/navigation";
import { Calendar, Clock, User, Phone, Edit2, Check, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ProfilePage() {
    const { user, loading: authLoading, refreshUserProfile } = useAuth();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [isEditingName, setIsEditingName] = useState(false);
    const [displayName, setDisplayName] = useState("");
    const [savingName, setSavingName] = useState(false);
    const router = useRouter();
    const { currentLanguage, t } = useLanguage();

    const fetchUserProfile = useCallback(async () => {
        if (!user) return;
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                const data = userDoc.data() as UserProfile;
                setUserProfile(data);
                setDisplayName(data.displayName || "");
            }
        } catch (error) {
            console.error("Error fetching user profile:", error);
        }
    }, [user]);

    const fetchBookings = useCallback(async () => {
        if (!user) return;
        try {
            const q = query(
                collection(db, "bookings"),
                where("userId", "==", user.uid),
                orderBy("createdAt", "desc")
            );
            const querySnapshot = await getDocs(q);
            const bookingsData = querySnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Booking[];
            setBookings(bookingsData);
        } catch (error) {
            console.error("Error fetching bookings:", error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login");
        } else if (user) {
            fetchUserProfile();
            fetchBookings();
        }
    }, [user, authLoading, router, fetchUserProfile, fetchBookings]);

    const handleSaveName = async () => {
        if (!user || !displayName.trim()) return;

        setSavingName(true);
        try {
            await updateDoc(doc(db, "users", user.uid), {
                displayName: displayName.trim()
            });
            if (userProfile) {
                setUserProfile({ ...userProfile, displayName: displayName.trim() });
            }
            await refreshUserProfile();
            setIsEditingName(false);
        } catch (error) {
            console.error("Error saving name:", error);
            alert(t('error_saving_name', 'Нэр хадгалахад алдаа гарлаа.'));
        } finally {
            setSavingName(false);
        }
    };

    if (authLoading || loading) return (
        <div className="min-h-[50vh] flex items-center justify-center">
            <div className="spinner" />
        </div>
    );

    return (
        <div className="max-w-3xl mx-auto content-padding">
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--foreground)] mb-6 sm:mb-8">{t('profile_title', 'Миний профайл')}</h1>

            {/* Profile Info */}
            <div className="card p-5 sm:p-6 mb-8">
                <h2 className="font-semibold text-[var(--foreground)] mb-4">{t('personal_info', 'Хувийн мэдээлэл')}</h2>
                <div className="space-y-4">
                    {/* Name */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center flex-1">
                            <User className="w-5 h-5 text-gray-400 mr-3" />
                            {isEditingName ? (
                                <div className="flex items-center gap-2 flex-1">
                                    <input
                                        type="text"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        className="flex-1 px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--card)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                        placeholder={t('name_placeholder', 'Нэрээ оруулна уу')}
                                        disabled={savingName}
                                    />
                                    <button type="button" onClick={handleSaveName} disabled={savingName || !displayName.trim()} className="touch-target flex items-center justify-center text-green-600 hover:bg-green-500/10 rounded-xl disabled:opacity-50">
                                        <Check className="w-5 h-5" />
                                    </button>
                                    <button type="button" onClick={() => { setIsEditingName(false); setDisplayName(userProfile?.displayName || ""); }} disabled={savingName} className="touch-target flex items-center justify-center text-red-600 hover:bg-red-500/10 rounded-xl">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-[var(--muted)]">{t('name_label', 'Нэр')}</p>
                                        <p className="font-medium text-[var(--foreground)]">{userProfile?.displayName || t('no_name', 'Нэр оруулаагүй')}</p>
                                    </div>
                                    <button type="button" onClick={() => setIsEditingName(true)} className="touch-target flex items-center justify-center text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded-xl">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {userProfile?.phoneNumber && (
                        <div className="flex items-center gap-3">
                            <Phone className="w-5 h-5 text-[var(--muted-foreground)] flex-shrink-0" />
                            <div>
                                <p className="text-sm text-[var(--muted)]">{t('phone_label', 'Утасны дугаар')}</p>
                                <p className="font-medium text-[var(--foreground)]">
                                    {userProfile.phoneNumber}
                                    {userProfile.phoneVerified && <span className="ml-1.5 text-xs text-green-600">({t('phone_verified', 'баталгаажсан')})</span>}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-[var(--foreground)] mb-4 sm:mb-6">{t('nav_my_bookings', 'Миний захиалгууд')}</h2>

            <div className="space-y-4">
                {bookings.map((booking) => (
                    <div key={booking.id} className="card p-4 sm:p-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                                <h3 className="font-semibold text-[var(--foreground)]">{booking.houseName}</h3>
                                <div className="mt-1.5 text-sm text-[var(--muted)] space-y-0.5">
                                    <div className="flex items-center gap-2">
                                        <Calendar size={14} /> {new Date(booking.startDate).toLocaleDateString(currentLanguage === 'mn' ? "mn-MN" : "en-US")} – {new Date(booking.endDate).toLocaleDateString(currentLanguage === 'mn' ? "mn-MN" : "en-US")}
                                    </div>
                                    <div>{t('house_guests', 'Зочид')}: {booking.guestCount}</div>
                                    <div className="flex items-center gap-2">
                                        <Clock size={14} /> {t('booked_on', 'Захиалсан')}: {new Date(booking.createdAt).toLocaleDateString(currentLanguage === 'mn' ? "mn-MN" : "en-US")}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 flex-shrink-0">
                                <span className={`px-2.5 py-1 text-xs font-medium rounded-lg ${booking.status === "confirmed" ? "bg-green-100 text-green-800" : booking.status === "cancelled" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>
                                    {booking.status === "confirmed" ? t('status_confirmed', 'Баталгаажсан') : booking.status === "cancelled" ? t('status_cancelled', 'Цуцлагдсан') : t('status_pending', 'Хүлээгдэж буй')}
                                </span>
                                <p className="text-lg font-bold text-[var(--foreground)]">${booking.totalPrice}</p>
                            </div>
                        </div>
                    </div>
                ))}

                {bookings.length === 0 && (
                    <div className="card text-center py-12 px-4">
                        <Calendar className="mx-auto h-12 w-12 text-[var(--muted-foreground)]" />
                        <h3 className="mt-2 font-medium text-[var(--foreground)]">{t('no_bookings', 'Захиалга алга')}</h3>
                        <p className="mt-1 text-sm text-[var(--muted)]">{t('no_bookings_info', 'Анхны захиалгаа эндээс хийж болно.')}</p>
                        <button onClick={() => router.push("/")} className="btn-primary mt-6 inline-flex">
                            {t('view_details', 'Байшингууд харах')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
