import { useState } from "react";
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    addMonths,
    subMonths,
    isSameMonth,
    isSameDay,
    isWithinInterval,
    parseISO
} from "date-fns";
import { mn } from "date-fns/locale";
import { Booking } from "@/types";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface BookingCalendarProps {
    bookings: Booking[];
    selectedHouseId: string | null;
    onBookingClick?: (booking: Booking) => void;
    onAddBooking?: (date: Date) => void;
}

export default function BookingCalendar({ bookings, selectedHouseId, onBookingClick, onAddBooking }: BookingCalendarProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const dateFormat = "d";
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    const weekDays = ["Дав", "Мяг", "Лха", "Пүр", "Баа", "Бям", "Ням"];

    const getDayBookings = (date: Date) => {
        return bookings.filter(booking => {
            const start = new Date(booking.startDate);
            const end = new Date(booking.endDate);
            // Reset hours to compare dates only
            const dateCheck = new Date(date).setHours(0, 0, 0, 0);
            const startCheck = new Date(start).setHours(0, 0, 0, 0);
            const endCheck = new Date(end).setHours(0, 0, 0, 0);

            return dateCheck >= startCheck && dateCheck < endCheck; // Usually checkout day is free for next guest
        });
    };

    // Helper to check if a booking starts on this day (for visual start rounded corners)
    const isStartDay = (booking: Booking, date: Date) => {
        return isSameDay(new Date(booking.startDate), date);
    };

    // Helper to check if a booking ends on the NEXT day (so this is the last full night)
    const isEndDay = (booking: Booking, date: Date) => {
        const nextDay = new Date(date);
        nextDay.setDate(date.getDate() + 1);
        return isSameDay(new Date(booking.endDate), nextDay);
    };

    return (
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900 capitalize">
                    {format(currentMonth, "MMMM yyyy", { locale: mn })}
                </h2>
                <div className="flex space-x-2">
                    <button onClick={prevMonth} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <ChevronLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <button onClick={nextMonth} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <ChevronRight className="w-5 h-5 text-gray-600" />
                    </button>
                </div>
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
                {weekDays.map((day) => (
                    <div key={day} className="py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 auto-rows-fr bg-gray-200 gap-px">
                {days.map((day, dayIdx) => {
                    const dayBookings = getDayBookings(day);

                    return (
                        <div
                            key={day.toString()}
                            className={`min-h-[120px] bg-white p-2 relative group ${!isSameMonth(day, monthStart) ? "bg-gray-50 text-gray-400" : "text-gray-900"
                                }`}
                        >
                            <div className="flex justify-between items-start">
                                <span className={`text-sm font-medium ${isSameDay(day, new Date()) ? "bg-indigo-600 text-white w-7 h-7 rounded-full flex items-center justify-center -ml-1.5 -mt-1.5" : ""}`}>
                                    {format(day, dateFormat)}
                                </span>
                                {selectedHouseId && onAddBooking && isSameMonth(day, monthStart) && dayBookings.length === 0 && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onAddBooking(day);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 p-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded transition-all"
                                        title="Шуурхай захиалга нэмэх"
                                    >
                                        <div className="w-4 h-4 flex items-center justify-center font-bold">+</div>
                                    </button>
                                )}
                            </div>

                            <div className="mt-1 flex flex-col gap-1 overflow-y-auto max-h-[90px]">
                                {dayBookings.map((booking) => {
                                    const isStart = isStartDay(booking, day);

                                    let statusColor = "bg-blue-100 text-blue-800 border-blue-200";
                                    if (booking.status === "confirmed") statusColor = "bg-green-100 text-green-800 border-green-200";
                                    if (booking.status === "cancelled") statusColor = "bg-red-100 text-red-800 border-red-200";
                                    if (booking.status === "pending") statusColor = "bg-yellow-100 text-yellow-800 border-yellow-200";

                                    return (
                                        <div
                                            key={booking.id}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onBookingClick?.(booking);
                                            }}
                                            className={`text-xs p-1 rounded border truncate cursor-pointer transition-all hover:opacity-80 ${statusColor} ${isStart ? 'ml-0' : '-ml-3 pl-4 rounded-l-none'} `}
                                            title={`${booking.houseName} - ${new Date(booking.startDate).toLocaleDateString()} to ${new Date(booking.endDate).toLocaleDateString()}`}
                                        >
                                            {isStart && (
                                                <span className="font-semibold">{selectedHouseId ? booking.guestDetails?.firstName || booking.houseName : booking.houseName}</span>
                                            )}
                                            {!isStart && <span className="opacity-0">.</span>} {/* Spacer to keep height */}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="p-4 bg-gray-50 flex items-center gap-4 text-xs text-gray-500 border-t border-gray-200">
                <div className="flex items-center"><div className="w-3 h-3 bg-green-100 border border-green-200 rounded mr-2"></div> Баталгаажсан</div>
                <div className="flex items-center"><div className="w-3 h-3 bg-yellow-100 border border-yellow-200 rounded mr-2"></div> Хүлээгдэж буй</div>
                <div className="flex items-center"><div className="w-3 h-3 bg-red-100 border border-red-200 rounded mr-2"></div> Цуцлагдсан</div>
            </div>
        </div>
    );
}
