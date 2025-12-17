"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy, doc, getDoc, updateDoc } from "firebase/firestore";
import { Booking, UserProfile } from "@/types";
import { useRouter } from "next/navigation";
import { Calendar, Clock, User, Phone, Edit2, Check, X } from "lucide-react";

export default function ProfilePage() {
    const { user, loading: authLoading } = useAuth();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [isEditingName, setIsEditingName] = useState(false);
    const [displayName, setDisplayName] = useState("");
    const [savingName, setSavingName] = useState(false);
    const router = useRouter();

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
            setIsEditingName(false);
        } catch (error) {
            console.error("Error saving name:", error);
            alert("Нэр хадгалахад алдаа гарлаа.");
        } finally {
            setSavingName(false);
        }
    };

    if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center">Ачааллаж байна...</div>;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Миний Профайл</h1>

            {/* Profile Info */}
            <div className="bg-white shadow rounded-lg p-6 mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Хувийн мэдээлэл</h2>
                <div className="space-y-4">
                    {/* Name */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center flex-1">
                            <User className="w-5 h-5 text-gray-400 mr-3" />
                            {isEditingName ? (
                                <div className="flex items-center space-x-2 flex-1">
                                    <input
                                        type="text"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Нэрээ оруулна уу"
                                        disabled={savingName}
                                    />
                                    <button
                                        onClick={handleSaveName}
                                        disabled={savingName || !displayName.trim()}
                                        className="p-2 text-green-600 hover:bg-green-50 rounded-md disabled:opacity-50"
                                    >
                                        <Check className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsEditingName(false);
                                            setDisplayName(userProfile?.displayName || "");
                                        }}
                                        disabled={savingName}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-600">Нэр</p>
                                        <p className="text-base font-medium text-gray-900">
                                            {userProfile?.displayName || "Нэр оруулаагүй"}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setIsEditingName(true)}
                                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-md"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Phone */}
                    {userProfile?.phoneNumber && (
                        <div className="flex items-center">
                            <Phone className="w-5 h-5 text-gray-400 mr-3" />
                            <div>
                                <p className="text-sm text-gray-600">Утасны дугаар</p>
                                <p className="text-base font-medium text-gray-900">
                                    {userProfile.phoneNumber}
                                    {userProfile.phoneVerified && (
                                        <span className="ml-2 text-xs text-green-600">(Баталгаажсан)</span>
                                    )}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Bookings */}
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Миний Захиалгууд</h2>

            <div className="space-y-6">
                {bookings.map((booking) => (
                    <div key={booking.id} className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200 p-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                            <div>
                                <h3 className="text-lg leading-6 font-medium text-gray-900">
                                    {booking.houseName}
                                </h3>
                                <div className="mt-2 max-w-xl text-sm text-gray-500">
                                    <div className="flex items-center mt-1">
                                        <Calendar size={16} className="mr-2" />
                                        {new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()}
                                    </div>
                                    <div className="mt-1">
                                        <span className="font-medium">Зочид:</span> {booking.guestCount}
                                    </div>
                                    <div className="flex items-center mt-1">
                                        <Clock size={16} className="mr-2" />
                                        Захиалсан: {new Date(booking.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 md:mt-0 flex flex-col md:items-end">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                    ${booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                        booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                            'bg-yellow-100 text-yellow-800'}`}>
                                    {booking.status === 'confirmed' ? 'Баталгаажсан' :
                                        booking.status === 'cancelled' ? 'Цуцлагдсан' : 'Хүлээгдэж буй'}
                                </span>
                                <p className="mt-2 text-lg font-bold text-gray-900">${booking.totalPrice}</p>
                            </div>
                        </div>
                    </div>
                ))}

                {bookings.length === 0 && (
                    <div className="text-center py-12 bg-white rounded-lg shadow">
                        <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">Захиалга алга байна</h3>
                        <p className="mt-1 text-sm text-gray-500">Та анхны захиалгаа хийж эхлээрэй.</p>
                        <div className="mt-6">
                            <button
                                onClick={() => router.push("/")}
                                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                            >
                                Байшингуудыг харах
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
