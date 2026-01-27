"use client";

import { useState } from "react";
import { Booking } from "@/types";
import { House } from "@/types";
import { X, Calendar, Users, DollarSign, Clock, User as UserIcon } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface BookingDetailsModalProps {
    booking: Booking;
    house: House | null;
    userName: string;
    userEmail: string;
    userPhoneNumber?: string;
    onClose: () => void;
    onUpdateStatus: (status: Booking["status"]) => void;
}

export default function BookingDetailsModal({
    booking,
    house,
    userName,
    userEmail,
    userPhoneNumber,
    onClose,
    onUpdateStatus
}: BookingDetailsModalProps) {
    const { t } = useLanguage();
    const [updating, setUpdating] = useState(false);

    const handleStatusUpdate = async (status: Booking["status"]) => {
        setUpdating(true);
        await onUpdateStatus(status);
        setUpdating(false);
    };

    const nights = Math.ceil((booking.endDate - booking.startDate) / (1000 * 60 * 60 * 24));

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">{t('admin_booking_details', 'Захиалгын дэлгэрэнгүй')}</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-500"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Status Badge */}
                    <div className="flex items-center justify-between">
                        <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full 
                            ${booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                    'bg-yellow-100 text-yellow-800'}`}>
                            {booking.status === 'confirmed' ? "Баталгаажсан" :
                                booking.status === 'cancelled' ? "Цуцлагдсан" : "Хүлээгдэж буй"}
                        </span>
                        <span className="text-sm text-gray-500">
                            Үүсгэсэн: {new Date(booking.createdAt).toLocaleString('mn-MN')}
                        </span>
                    </div>

                    {/* House Info */}
                    {house && (
                        <div className="border border-gray-200 rounded-lg p-4">
                            <h3 className="text-sm font-medium text-gray-900 mb-3">Байшин</h3>
                            <div className="flex items-start space-x-4">
                                {house.imageUrl && (
                                    <img
                                        src={house.imageUrl}
                                        alt={house.name}
                                        className="w-24 h-24 rounded-lg object-cover"
                                    />
                                )}
                                <div>
                                    <p className="font-medium text-gray-900">
                                        #{house.houseNumber} {house.name}
                                    </p>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Багтаамж: {house.capacity} зочин
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        Үнэ: ${house.price}/хоног
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* User Info */}
                    <div className="border border-gray-200 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-gray-900 mb-3">Хэрэглэгч</h3>
                        <div className="space-y-2">
                            <div className="flex items-center text-sm">
                                <UserIcon className="w-4 h-4 mr-2 text-gray-400" />
                                <span className="text-gray-900">{userName || "Нэр байхгүй"}</span>
                            </div>
                            <div className="flex items-center text-sm">
                                <span className="text-gray-500">Имэйл:</span>
                                <span className="ml-2 text-gray-900">{userEmail}</span>
                            </div>
                            {userPhoneNumber && (
                                <div className="flex items-center text-sm">
                                    <span className="text-gray-500">Утас:</span>
                                    <span className="ml-2 text-gray-900">{userPhoneNumber}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Booking Details */}
                    <div className="border border-gray-200 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-gray-900 mb-3">Захиалгын мэдээлэл</h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center text-sm text-gray-600">
                                    <Calendar className="w-4 h-4 mr-2" />
                                    <span>Ирэх өдөр:</span>
                                </div>
                                <span className="text-sm font-medium text-gray-900">
                                    {new Date(booking.startDate).toLocaleDateString('mn-MN')}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center text-sm text-gray-600">
                                    <Calendar className="w-4 h-4 mr-2" />
                                    <span>Буцах өдөр:</span>
                                </div>
                                <span className="text-sm font-medium text-gray-900">
                                    {new Date(booking.endDate).toLocaleDateString('mn-MN')}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center text-sm text-gray-600">
                                    <Clock className="w-4 h-4 mr-2" />
                                    <span>Хоног:</span>
                                </div>
                                <span className="text-sm font-medium text-gray-900">{nights} хоног</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center text-sm text-gray-600">
                                    <Users className="w-4 h-4 mr-2" />
                                    <span>Зочид:</span>
                                </div>
                                <span className="text-sm font-medium text-gray-900">{booking.guestCount} хүн</span>
                            </div>
                        </div>
                    </div>

                    {/* Price */}
                    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center text-sm text-gray-600">
                                <DollarSign className="w-4 h-4 mr-2" />
                                <span>Нийт үнэ:</span>
                            </div>
                            <span className="text-2xl font-bold text-indigo-600">${booking.totalPrice}</span>
                        </div>
                    </div>

                    {/* Actions */}
                    {booking.status === 'pending' && (
                        <div className="flex space-x-3 pt-4 border-t border-gray-200">
                            <button
                                onClick={() => handleStatusUpdate('confirmed')}
                                disabled={updating}
                                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
                            >
                                {updating ? "Боловсруулж байна..." : "Баталгаажуулах"}
                            </button>
                            <button
                                onClick={() => handleStatusUpdate('cancelled')}
                                disabled={updating}
                                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
                            >
                                {updating ? "Боловсруулж байна..." : "Цуцлах"}
                            </button>
                        </div>
                    )}
                    {booking.status === 'confirmed' && (
                        <div className="pt-4 border-t border-gray-200">
                            <button
                                onClick={() => handleStatusUpdate('cancelled')}
                                disabled={updating}
                                className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
                            >
                                {updating ? "Боловсруулж байна..." : "Захиалга цуцлах"}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
