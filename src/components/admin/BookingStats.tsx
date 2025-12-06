import { Booking } from "@/types";
import { Calendar, Clock, CheckCircle, DollarSign } from "lucide-react";

interface BookingStatsProps {
    bookings: Booking[];
}

export default function BookingStats({ bookings }: BookingStatsProps) {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Filter bookings for current month
    const thisMonthBookings = bookings.filter(b => {
        const bookingDate = new Date(b.createdAt);
        return bookingDate.getMonth() === currentMonth && bookingDate.getFullYear() === currentYear;
    });

    const pendingCount = bookings.filter(b => b.status === 'pending').length;
    const confirmedCount = bookings.filter(b => b.status === 'confirmed').length;
    const thisMonthRevenue = thisMonthBookings
        .filter(b => b.status === 'confirmed')
        .reduce((sum, b) => sum + b.totalPrice, 0);

    const stats = [
        {
            name: 'Энэ сарын захиалга',
            value: thisMonthBookings.length,
            icon: Calendar,
            color: 'bg-blue-100 text-blue-600',
        },
        {
            name: 'Хүлээгдэж буй',
            value: pendingCount,
            icon: Clock,
            color: 'bg-yellow-100 text-yellow-600',
        },
        {
            name: 'Баталгаажсан',
            value: confirmedCount,
            icon: CheckCircle,
            color: 'bg-green-100 text-green-600',
        },
        {
            name: 'Энэ сарын орлого',
            value: `$${thisMonthRevenue}`,
            icon: DollarSign,
            color: 'bg-indigo-100 text-indigo-600',
        },
    ];

    return (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {stats.map((stat) => (
                <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className={`flex-shrink-0 rounded-md p-3 ${stat.color}`}>
                                <stat.icon className="h-6 w-6" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">{stat.name}</dt>
                                    <dd className="text-2xl font-bold text-gray-900">{stat.value}</dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
