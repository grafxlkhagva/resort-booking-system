"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs, addDoc, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase"; // Inspecting imports, assuming db is exported
import { House, Booking } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Calendar, User, Home, Calculator } from "lucide-react";
import Link from "next/link";

export default function NewBookingPage() {
    const { user, isAdmin, loading } = useAuth();
    const router = useRouter();
    const [houses, setHouses] = useState<House[]>([]);
    const [selectedHouseId, setSelectedHouseId] = useState<string>("");
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");

    // Guest Details
    const [guestFirstName, setGuestFirstName] = useState("");
    const [guestLastName, setGuestLastName] = useState("");
    const [guestPhone, setGuestPhone] = useState("");
    const [guestEmail, setGuestEmail] = useState("");

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
        if (!loading && (!user || !isAdmin)) {
            router.push("/");
        }
    }, [user, isAdmin, loading, router]);

    useEffect(() => {
        const fetchHouses = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, "houses"));
                const housesData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as House[];
                setHouses(housesData);
            } catch (err) {
                console.error("Error fetching houses:", err);
                setError("Failed to load houses");
            }
        };

        if (isAdmin) {
            fetchHouses();
        }
    }, [isAdmin]);

    const calculateTotalPrice = () => {
        if (!selectedHouseId || !startDate || !endDate) return 0;

        const house = houses.find(h => h.id === selectedHouseId);
        if (!house) return 0;

        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Simple calculation, not accounting for discounts yet to keep MVP simple
        return (diffDays > 0 ? diffDays : 1) * (house.price || 0);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        setSubmitting(true);

        try {
            if (!selectedHouseId || !startDate || !endDate || !guestFirstName || !guestPhone) {
                throw new Error("Please fill in all required fields.");
            }

            const house = houses.find(h => h.id === selectedHouseId);
            if (!house) throw new Error("House not found");

            const totalPrice = calculateTotalPrice();

            const newBooking: Omit<Booking, "id"> = {
                houseId: selectedHouseId,
                houseName: house.name,
                startDate: new Date(startDate).getTime(),
                endDate: new Date(endDate).getTime(),
                totalPrice,
                status: 'confirmed', // Admin bookings are confirmed by default
                createdAt: Date.now(),
                guestCount: 1, // Defaulting to 1 for now, or add field
                guestDetails: {
                    firstName: guestFirstName,
                    lastName: guestLastName,
                    phoneNumber: guestPhone,
                    email: guestEmail || undefined
                },
                // userId is optional/undefined for manual bookings
            };

            await addDoc(collection(db, "bookings"), newBooking);
            setSuccess("Booking created successfully!");
            setTimeout(() => {
                router.push("/admin/bookings");
            }, 2000);
        } catch (err: any) {
            console.error("Error creating booking:", err);
            setError(err.message || "Failed to create booking");
        } finally {
            setSubmitting(false);
        }
    };

    // Calculate nights and price for display
    const nights = (() => {
        if (!startDate || !endDate) return 0;
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = end.getTime() - start.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
    })();

    if (loading || !isAdmin) return null;

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="mb-6 flex items-center">
                <Link href="/admin/bookings" className="mr-4 p-2 rounded-full hover:bg-gray-100">
                    <ArrowLeft size={24} className="text-gray-600" />
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">Гараар захиалга үүсгэх</h1>
            </div>

            <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
                <form onSubmit={handleSubmit} className="p-6 space-y-8">

                    {/* House Selection */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold flex items-center text-gray-800 border-b pb-2">
                            <Home className="mr-2 text-indigo-600" size={20} />
                            Байр сонгох
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Байшин</label>
                                <select
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    value={selectedHouseId}
                                    onChange={(e) => setSelectedHouseId(e.target.value)}
                                    required
                                >
                                    <option value="">Сонгоно уу...</option>
                                    {houses.map(house => (
                                        <option key={house.id} value={house.id}>
                                            {house.name} (#{house.houseNumber}) - {(house.price || 0).toLocaleString()}₮/шөнө
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Date Selection */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold flex items-center text-gray-800 border-b pb-2">
                            <Calendar className="mr-2 text-indigo-600" size={20} />
                            Хугацаа сонгох
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Эхлэх огноо</label>
                                <input
                                    type="date"
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Дуусах огноо</label>
                                <input
                                    type="date"
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Guest Details */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold flex items-center text-gray-800 border-b pb-2">
                            <User className="mr-2 text-indigo-600" size={20} />
                            Зочны мэдээлэл
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Нэр *</label>
                                <input
                                    type="text"
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    value={guestFirstName}
                                    onChange={(e) => setGuestFirstName(e.target.value)}
                                    placeholder="Болд"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Овог</label>
                                <input
                                    type="text"
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    value={guestLastName}
                                    onChange={(e) => setGuestLastName(e.target.value)}
                                    placeholder="Дорж"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Утас *</label>
                                <input
                                    type="tel"
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    value={guestPhone}
                                    onChange={(e) => setGuestPhone(e.target.value)}
                                    placeholder="99112233"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Имэйл (заавал биш)</label>
                                <input
                                    type="email"
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    value={guestEmail}
                                    onChange={(e) => setGuestEmail(e.target.value)}
                                    placeholder="guest@example.com"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="bg-gray-50 p-4 rounded-lg flex flex-col md:flex-row justify-between items-center border border-gray-200">
                        <div className="flex items-center space-x-2 text-gray-700 mb-4 md:mb-0">
                            <Calculator size={24} />
                            <span className="font-medium">Нийт төлбөр ({nights} шөнө):</span>
                        </div>
                        <div className="text-2xl font-bold text-indigo-600">
                            {calculateTotalPrice().toLocaleString()}₮
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-100 text-red-700 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="p-4 bg-green-100 text-green-700 rounded-lg text-sm">
                            {success}
                        </div>
                    )}

                    <div className="flex justify-end">
                        <Link href="/admin/bookings" className="mr-4 px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center">
                            Буцах
                        </Link>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md transition-colors disabled:opacity-50 flex items-center"
                        >
                            {submitting ? "Үүсгэж байна..." : "Захиалга үүсгэх"}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
