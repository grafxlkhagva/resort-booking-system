"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, getDocs, updateDoc, doc, orderBy, query, getDoc } from "firebase/firestore";
import { Booking, House } from "@/types";
import { Check, X, Clock, Search, Filter } from "lucide-react";
import BookingStats from "@/components/admin/BookingStats";

import BookingDetailsModal from "@/components/admin/BookingDetailsModal";
import HouseSelector from "@/components/admin/HouseSelector";
import BookingCalendar from "@/components/admin/BookingCalendar";
import QuickBookingModal from "@/components/admin/QuickBookingModal";
import { useLanguage } from "@/contexts/LanguageContext";

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
    const [selectedHouseId, setSelectedHouseId] = useState<string | null>(null);
    const [quickBookingOpen, setQuickBookingOpen] = useState(false);
    const [quickBookingDate, setQuickBookingDate] = useState<Date | null>(null);
    const { t } = useLanguage();

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
                                bookingData.userName = userData.displayName || userData.firstName || t('no_name', 'Нэр байхгүй');
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
                        bookingData.userName = t('no_bookings_info', 'Зочны мэдээлэл байхгүй');
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
            alert(t('booking_error', "Захиалга шинэчлэхэд алдаа гарлаа"));
        }
    };

    // Filter and search
    const filteredBookings = useMemo(() => {
        return bookings.filter((booking) => {
            // House filter
            if (selectedHouseId && booking.houseId !== selectedHouseId) {
                return false;
            }

            // Status filter (optional to keep, but maybe visual is enough)
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
    }, [bookings, selectedHouseId, statusFilter, searchTerm]);



    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primary)]"></div>
            </div>
        );
    }

    if (!isAdmin) return <div className="p-8 text-center">{t('admin_access_denied', 'Access Denied')}</div>;

    const housesArray = Array.from(houses.values()).sort((a, b) => a.name.localeCompare(b.name));

    const handleAddBooking = (date: Date) => {
        setQuickBookingDate(date);
        setQuickBookingOpen(true);
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('admin_manage_bookings', 'Захиалга Удирдах')}</h1>

            {/* Statistics */}
            <BookingStats bookings={bookings} />

            {/* House Selector */}
            <HouseSelector
                houses={housesArray}
                selectedHouseId={selectedHouseId}
                onSelect={setSelectedHouseId}
            />

            {/* Search and Filters Toolbar (Optional but good to have) */}
            <div className="mb-6 flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                <div className="relative flex-1 max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder={t('admin_search_bookings', 'Захиалга хайх (Нэр, Утас, ID)...')}
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                {/* Optional Status Legend/Filter could go here */}
            </div>

            {/* Calendar View */}
            <BookingCalendar
                bookings={filteredBookings}
                selectedHouseId={selectedHouseId}
                onBookingClick={setSelectedBooking}
                onAddBooking={selectedHouseId ? handleAddBooking : undefined}
            />

            <div className="mt-4 text-sm text-gray-500 text-right">
                {t('admin_total_bookings', 'Нийт {count} захиалга', { count: filteredBookings.length })}
            </div>

            {/* Details Modal */}
            {selectedBooking && (
                <BookingDetailsModal
                    booking={selectedBooking}
                    house={houses.get(selectedBooking.houseId) || null}
                    userName={selectedBooking.userName || t('no_name', "Нэр байхгүй")}
                    userEmail={selectedBooking.userEmail || ""}
                    userPhoneNumber={selectedBooking.userPhoneNumber}
                    onClose={() => setSelectedBooking(null)}
                    onUpdateStatus={(status) => updateStatus(selectedBooking.id, status)}
                />
            )}

            {/* Quick Booking Modal */}
            <QuickBookingModal
                isOpen={quickBookingOpen}
                onClose={() => setQuickBookingOpen(false)}
                houses={housesArray}
                preSelectedHouseId={selectedHouseId || undefined}
                initialStartDate={quickBookingDate}
                onSuccess={() => {
                    fetchData();
                    setQuickBookingOpen(false);
                }}
            />
        </div>
    );
}

