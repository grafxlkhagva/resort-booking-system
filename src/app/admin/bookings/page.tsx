"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, getDocs, updateDoc, doc, orderBy, query, getDoc } from "firebase/firestore";
import { Booking, House } from "@/types";
import { Check, X, Clock, Search, Filter } from "lucide-react";
import BookingStats from "@/components/admin/BookingStats";
import BookingDetailsModal from "@/components/admin/BookingDetailsModal";

interface BookingWithUserInfo extends Booking {
    userName?: string;
    userEmail?: string;
    userPhoneNumber?: string;
}

export default function ManageBookings() {
    const { isAdmin, loading: authLoading } = useAuth();
    const [bookings, setBookings] = useState<BookingWithUserInfo[]>([]);
    const [houses, setHouses] = useState<Map<string, House>>(new Map());
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | Booking["status"]>("all");
    const [selectedBooking, setSelectedBooking] = useState<BookingWithUserInfo | null>(null);

    useEffect(() => {
        if (isAdmin) {
            fetchData();
        }
    }, [isAdmin]);

    const fetchData = async () => {
        try {
            // Fetch bookings
            const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            const bookingsData = await Promise.all(
                querySnapshot.docs.map(async (docSnapshot) => {
                    const bookingData = { id: docSnapshot.id, ...docSnapshot.data() } as BookingWithUserInfo;

                    // Fetch user info or use guest details
                    if (bookingData.userId) {
                        try {
                            const userDoc = await getDoc(doc(db, "users", bookingData.userId));
                            if (userDoc.exists()) {
                                const userData = userDoc.data();
                                bookingData.userName = userData.displayName || userData.firstName || "Нэр байхгүй";
                                bookingData.userEmail = userData.email || "";
                                bookingData.userPhoneNumber = userData.phoneNumber || "";
                            }
                        } catch (error) {
                            console.error("Error fetching user:", error);
                        }
                    } else if (bookingData.guestDetails) {
                        bookingData.userName = `${bookingData.guestDetails.firstName} ${bookingData.guestDetails.lastName || ''}`.trim();
                        bookingData.userEmail = bookingData.guestDetails.email || "";
                        bookingData.userPhoneNumber = bookingData.guestDetails.phoneNumber;
                    } else {
                        bookingData.userName = "Зочны мэдээлэл байхгүй";
                    }

                    return bookingData;
                })
            );
            setBookings(bookingsData);

            // Fetch houses
            const housesSnapshot = await getDocs(collection(db, "accommodations"));
            const housesMap = new Map<string, House>();
            housesSnapshot.docs.forEach((doc) => {
                housesMap.set(doc.id, { id: doc.id, ...doc.data() } as House);
            });
            setHouses(housesMap);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id: string, status: Booking["status"]) => {
        try {
            await updateDoc(doc(db, "bookings", id), { status });
            fetchData();
            setSelectedBooking(null);
        } catch (error) {
            console.error("Error updating booking:", error);
            alert("Захиалга шинэчлэхэд алдаа гарлаа");
        }
    };

    // Filter and search
    const filteredBookings = useMemo(() => {
        return bookings.filter((booking) => {
            // Status filter
            if (statusFilter !== "all" && booking.status !== statusFilter) {
                return false;
            }

            // Search filter
            if (searchTerm) {
                const search = searchTerm.toLowerCase();
                const matchesHouseName = booking.houseName.toLowerCase().includes(search);
                const matchesUserName = booking.userName?.toLowerCase().includes(search);
                const matchesUserEmail = booking.userEmail?.toLowerCase().includes(search);
                const matchesId = booking.id.toLowerCase().includes(search);

                return matchesHouseName || matchesUserName || matchesUserEmail || matchesId;
            }

            return true;
        });
    }, [bookings, statusFilter, searchTerm]);

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!isAdmin) return <div className="p-8 text-center">Access Denied</div>;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Захиалга Удирдах</h1>

            {/* Statistics */}
            <BookingStats bookings={bookings} />

            {/* Filters */}
            <div className="bg-white shadow rounded-lg border border-gray-200 p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Search */}
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Байшин, хэрэглэгч, ID-аар хайх..."
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Status Filter */}
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Filter className="h-5 w-5 text-gray-400" />
                        </div>
                        <select
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                        >
                            <option value="all">Бүх статус</option>
                            <option value="pending">Хүлээгдэж буй</option>
                            <option value="confirmed">Баталгаажсан</option>
                            <option value="cancelled">Цуцлагдсан</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Results count */}
            <div className="mb-4 text-sm text-gray-600">
                {filteredBookings.length} захиалга олдлоо
            </div>

            {/* Bookings List */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
                <ul className="divide-y divide-gray-200">
                    {filteredBookings.map((booking) => {
                        const house = houses.get(booking.houseId);
                        return (
                            <li
                                key={booking.id}
                                className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
                                onClick={() => setSelectedBooking(booking)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center space-x-3">
                                                {house?.imageUrl && (
                                                    <img
                                                        src={house.imageUrl}
                                                        alt={booking.houseName}
                                                        className="w-12 h-12 rounded-lg object-cover"
                                                    />
                                                )}
                                                <div>
                                                    <p className="text-sm font-medium text-indigo-600 truncate">
                                                        {house ? `#${house.houseNumber} ` : ""}{booking.houseName}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {booking.userName || "Нэр байхгүй"}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {booking.userPhoneNumber || booking.userEmail}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                ${booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                                    booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                                        'bg-yellow-100 text-yellow-800'}`}>
                                                {booking.status === 'confirmed' ? 'Баталгаажсан' :
                                                    booking.status === 'cancelled' ? 'Цуцлагдсан' : 'Хүлээгдэж буй'}
                                            </span>
                                        </div>
                                        <div className="mt-2 flex items-center justify-between text-sm text-gray-500">
                                            <div className="flex items-center space-x-4">
                                                <span className="flex items-center">
                                                    <Clock size={16} className="mr-1.5 text-gray-400" />
                                                    {new Date(booking.startDate).toLocaleDateString('mn-MN')} - {new Date(booking.endDate).toLocaleDateString('mn-MN')}
                                                </span>
                                                <span>
                                                    {booking.guestCount} зочин
                                                </span>
                                            </div>
                                            <span className="font-medium text-gray-900">
                                                ${booking.totalPrice}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="ml-6 flex items-center space-x-3" onClick={(e) => e.stopPropagation()}>
                                        {booking.status === 'pending' && (
                                            <>
                                                <button
                                                    onClick={() => updateStatus(booking.id, 'confirmed')}
                                                    className="p-2 bg-green-100 text-green-600 rounded-full hover:bg-green-200 transition-colors"
                                                    title="Баталгаажуулах"
                                                >
                                                    <Check size={20} />
                                                </button>
                                                <button
                                                    onClick={() => updateStatus(booking.id, 'cancelled')}
                                                    className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors"
                                                    title="Цуцлах"
                                                >
                                                    <X size={20} />
                                                </button>
                                            </>
                                        )}
                                        {booking.status === 'confirmed' && (
                                            <button
                                                onClick={() => updateStatus(booking.id, 'cancelled')}
                                                className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors"
                                                title="Цуцлах"
                                            >
                                                <X size={20} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                    {filteredBookings.length === 0 && (
                        <li className="p-6 text-center text-gray-500">
                            {searchTerm || statusFilter !== "all"
                                ? "Хайлтын үр дүн олдсонгүй."
                                : "Захиалга байхгүй байна."}
                        </li>
                    )}
                </ul>
            </div>

            {/* Details Modal */}
            {selectedBooking && (
                <BookingDetailsModal
                    booking={selectedBooking}
                    house={houses.get(selectedBooking.houseId) || null}
                    userName={selectedBooking.userName || "Нэр байхгүй"}
                    userEmail={selectedBooking.userEmail || ""}
                    userPhoneNumber={selectedBooking.userPhoneNumber}
                    onClose={() => setSelectedBooking(null)}
                    onUpdateStatus={(status) => updateStatus(selectedBooking.id, status)}
                />
            )}
        </div>
    );
}
