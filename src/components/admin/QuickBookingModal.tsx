"use client";

import { useState, useEffect } from "react";
import { X, Calendar, User, Phone, Mail, DollarSign, FileText, PenTool } from "lucide-react";
import { addDoc, collection, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { House, Booking, ResortSettings } from "@/types";
import { sendBookingNotificationAction } from "@/actions/telegram"; // Updated import
import { getDoc } from "firebase/firestore";

interface QuickBookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    houses: House[];
    preSelectedHouseId?: string;
    onSuccess?: () => void;
}

export default function QuickBookingModal({ isOpen, onClose, houses, preSelectedHouseId, onSuccess }: QuickBookingModalProps) {
    const [selectedHouseId, setSelectedHouseId] = useState(preSelectedHouseId || "");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [guestFirstName, setGuestFirstName] = useState("");
    const [guestLastName, setGuestLastName] = useState("");
    const [guestPhone, setGuestPhone] = useState("");
    const [guestEmail, setGuestEmail] = useState("");
    const [bookingType, setBookingType] = useState<'system' | 'manual' | 'barter'>('system');
    const [customPrice, setCustomPrice] = useState<number | ''>('');
    const [barterDescription, setBarterDescription] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState("");

    useEffect(() => {
        if (preSelectedHouseId) setSelectedHouseId(preSelectedHouseId);
    }, [preSelectedHouseId]);

    const calculateTotalPrice = () => {
        if (!selectedHouseId || !startDate || !endDate) return 0;

        // Manual Override
        if (bookingType === 'manual' && customPrice !== '') return Number(customPrice);
        if (bookingType === 'barter') return 0; // Or allow custom value? Let's say 0 for now unless overridden

        // System Calculation
        const house = houses.find(h => h.id === selectedHouseId);
        if (!house) return 0;

        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        // Logic: if same day, maybe 1 day charge? Usually hotel rules. Assuming nightly rate.
        // If diffDays is 0 (same day in/out), charge 1 night?
        const nights = diffDays === 0 ? 1 : diffDays;

        return (house.price || 0) * nights;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setSuccess("");

        try {
            const house = houses.find(h => h.id === selectedHouseId);
            if (!house) throw new Error("House not found");

            const totalPrice = calculateTotalPrice();

            const newBooking: Omit<Booking, 'id'> = {
                houseId: selectedHouseId,
                houseName: house.name,
                userId: 'manual_admin', // Placeholder for manual bookings
                guestDetails: {
                    firstName: guestFirstName,
                    lastName: guestLastName,
                    phoneNumber: guestPhone,
                    email: guestEmail || null // Use null instead of undefined for Firestore
                },
                startDate: new Date(startDate).getTime(),
                endDate: new Date(endDate).getTime(),
                totalPrice: totalPrice,
                status: 'confirmed', // Admin bookings are confirmed immediately
                createdAt: Date.now(),
                guestCount: 1, // Default, maybe add field if needed
                paymentType: bookingType === 'system' ? 'full' : (bookingType === 'manual' ? 'custom' : 'barter'),
                barterDescription: bookingType === 'barter' ? barterDescription : null, // Use null instead of undefined
            };

            const bookingRef = await addDoc(collection(db, "bookings"), newBooking);

            // Check-in Logic: If starts today/past and ends future/today, mark occupied
            const start = new Date(startDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            start.setHours(0, 0, 0, 0);

            if (start.getTime() <= today.getTime() && new Date(endDate).getTime() >= today.getTime()) {
                await updateDoc(doc(db, "accommodations", selectedHouseId), {
                    status: 'occupied',
                    currentGuest: {
                        name: guestFirstName + (guestLastName ? " " + guestLastName : ""),
                        phone: guestPhone,
                        bookingId: bookingRef.id,
                        checkOutDate: new Date(endDate).getTime()
                    }
                });
            }
            try {
                await sendBookingNotificationAction(
                    house.name,
                    `${guestFirstName} ${guestLastName}`,
                    guestPhone,
                    new Date(startDate).toLocaleDateString(),
                    new Date(endDate).toLocaleDateString(),
                    totalPrice,
                    true
                );
            } catch (err) {
                console.error("Failed to send Telegram notification:", err);
            }

            setSuccess("Захиалга амжилттай үүсгэгдлээ!");
            setTimeout(() => {
                setSuccess("");
                setSubmitting(false);
                setStartDate("");
                setEndDate("");
                setGuestFirstName("");
                setGuestLastName("");
                setGuestPhone("");
                setGuestEmail("");
                setBookingType('system');
                setCustomPrice('');
                setBarterDescription("");
                if (onSuccess) onSuccess();
                onClose();
            }, 1500);

        } catch (error) {
            console.error("Error creating booking:", error);
            setSuccess(""); // Clear success just in case
            alert("Захиалга үүсгэхэд алдаа гарлаа.");
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">Шуурхай захиалга үүсгэх</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Booking Type Selection */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-3">Захиалгын Төрөл</label>
                        <div className="flex space-x-4">
                            <label className={`flex-1 flex items-center justify-center px-4 py-2 border rounded-md cursor-pointer transition-colors ${bookingType === 'system' ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-medium' : 'bg-white border-gray-300 hover:bg-gray-50'}`}>
                                <input type="radio" name="bookingType" value="system" checked={bookingType === 'system'} onChange={() => setBookingType('system')} className="hidden" />
                                <DollarSign size={16} className="mr-2" />
                                Үндсэн Үнээр
                            </label>
                            <label className={`flex-1 flex items-center justify-center px-4 py-2 border rounded-md cursor-pointer transition-colors ${bookingType === 'manual' ? 'bg-blue-50 border-blue-500 text-blue-700 font-medium' : 'bg-white border-gray-300 hover:bg-gray-50'}`}>
                                <input type="radio" name="bookingType" value="manual" checked={bookingType === 'manual'} onChange={() => setBookingType('manual')} className="hidden" />
                                <PenTool size={16} className="mr-2" />
                                Гараар Үнэ Оруулах
                            </label>
                            <label className={`flex-1 flex items-center justify-center px-4 py-2 border rounded-md cursor-pointer transition-colors ${bookingType === 'barter' ? 'bg-orange-50 border-orange-500 text-orange-700 font-medium' : 'bg-white border-gray-300 hover:bg-gray-50'}`}>
                                <input type="radio" name="bookingType" value="barter" checked={bookingType === 'barter'} onChange={() => setBookingType('barter')} className="hidden" />
                                <FileText size={16} className="mr-2" />
                                Бартер
                            </label>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Байшин сонгох</label>
                            <select
                                required
                                value={selectedHouseId}
                                onChange={(e) => setSelectedHouseId(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="">Сонгоно уу...</option>
                                {houses.map(h => (
                                    <option key={h.id} value={h.id}>
                                        #{h.houseNumber} {h.name} - {(h.price || 0).toLocaleString()}₮
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Price Display / Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {bookingType === 'barter' ? 'Бартерын Үнэлгээ (Заавал биш)' : 'Нийт Үнэ'}
                            </label>
                            {bookingType === 'manual' ? (
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">₮</div>
                                    <input
                                        type="number"
                                        value={customPrice}
                                        onChange={(e) => setCustomPrice(Number(e.target.value))}
                                        className="w-full pl-8 px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                                        placeholder="0"
                                    />
                                </div>
                            ) : (
                                <div className={`w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-700 font-bold flex items-center ${bookingType === 'barter' ? 'border-orange-200' : 'border-gray-300'}`}>
                                    {bookingType === 'barter' ? 'Barter' : `${calculateTotalPrice().toLocaleString()}₮`}
                                </div>
                            )}
                        </div>
                    </div>

                    {bookingType === 'barter' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Бартерын Тайлбар / Гэрээ</label>
                            <textarea
                                required
                                value={barterDescription}
                                onChange={(e) => setBarterDescription(e.target.value)}
                                className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 min-h-[80px]"
                                placeholder="Жишээ: 50 ширхэг сандал нийлүүлсэн..."
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Эхлэх огноо</label>
                            <input
                                type="date"
                                required
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Дуусах огноо</label>
                            <input
                                type="date"
                                required
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                min={startDate}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="border-t border-gray-200 pt-4">
                        <h3 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
                            <User size={16} className="mr-2" /> Зочны мэдээлэл
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Овог (Заавал биш)</label>
                                <input
                                    type="text"
                                    value={guestLastName}
                                    onChange={(e) => setGuestLastName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    placeholder="Овог"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Нэр</label>
                                <input
                                    type="text"
                                    required
                                    value={guestFirstName}
                                    onChange={(e) => setGuestFirstName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    placeholder="Нэр"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Утас</label>
                                <div className="relative">
                                    <Phone size={14} className="absolute left-3 top-3 text-gray-400" />
                                    <input
                                        type="tel"
                                        required
                                        value={guestPhone}
                                        onChange={(e) => setGuestPhone(e.target.value)}
                                        className="w-full pl-9 px-3 py-2 border border-gray-300 rounded-lg"
                                        placeholder="99112233"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Имэйл (Заавал биш)</label>
                                <div className="relative">
                                    <Mail size={14} className="absolute left-3 top-3 text-gray-400" />
                                    <input
                                        type="email"
                                        value={guestEmail}
                                        onChange={(e) => setGuestEmail(e.target.value)}
                                        className="w-full pl-9 px-3 py-2 border border-gray-300 rounded-lg"
                                        placeholder="guest@example.com"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {success && (
                        <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm flex items-center">
                            <Calendar size={16} className="mr-2" />
                            {success}
                        </div>
                    )}

                    <div className="flex justify-end space-x-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                        >
                            Болих
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50"
                        >
                            {submitting ? "Бүртгэж байна..." : "Захиалга Бүртгэх"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
