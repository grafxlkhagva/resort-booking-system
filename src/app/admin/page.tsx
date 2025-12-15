"use client";

import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Home, Calendar, Settings, Users, LogOut, PlusCircle, CheckCircle, XCircle, RefreshCw, PenTool } from "lucide-react";
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { House, HouseStatus } from "@/types";
import QuickBookingModal from "@/components/admin/QuickBookingModal";
import { signOut } from "firebase/auth";

const STATUS_COLORS: Record<HouseStatus, string> = {
    clean: "border-green-500 bg-green-50",
    dirty: "border-red-500 bg-red-50",
    cleaning: "border-yellow-500 bg-yellow-50",
    occupied: "border-indigo-500 bg-indigo-50",
    maintenance: "border-gray-500 bg-gray-50",
};

const STATUS_LABELS: Record<HouseStatus, string> = {
    clean: "Цэвэр / Бэлэн",
    dirty: "Бохир / Цэвэрлэх",
    cleaning: "Цэвэрлэж байна",
    occupied: "Хүнтэй",
    maintenance: "Засвартай",
};

export default function AdminDashboard() {
    const { user, isAdmin, loading } = useAuth();
    const router = useRouter();

    const [houses, setHouses] = useState<House[]>([]);
    const [filterStatus, setFilterStatus] = useState<HouseStatus | 'all'>('all');

    // Modal State
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [selectedHouseId, setSelectedHouseId] = useState<string>("");

    // Quick Update State
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    useEffect(() => {
        if (!loading && (!user || !isAdmin)) {
            router.push("/");
        }
    }, [user, isAdmin, loading, router]);

    // Real-time Houses Listener
    useEffect(() => {
        if (!isAdmin) return;

        const unsubscribe = onSnapshot(collection(db, "accommodations"), (snapshot) => {
            const housesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                status: doc.data().status || 'clean'
            })) as House[];
            setHouses(housesData.sort((a, b) => a.houseNumber - b.houseNumber));
        });

        return () => unsubscribe();
    }, [isAdmin]);

    const handleStatusUpdate = async (houseId: string, newStatus: HouseStatus) => {
        setUpdatingId(houseId);
        try {
            const updateData: any = { status: newStatus };

            // If checking out (moving to dirty), clear the guest data
            if (newStatus === 'dirty') {
                updateData.currentGuest = null; // or deleteField()
                // In a perfect world, we also call 'updateDoc' on the Booking to mark it as Checked Out,
                // but for now we focus on the House visual state.
            }

            await updateDoc(doc(db, "accommodations", houseId), updateData);
        } catch (error) {
            console.error("Failed to update status", error);
            alert("Төлөв өөрчилж чадсангүй");
        } finally {
            setUpdatingId(null);
        }
    };

    // ... (rest of code)

    const openBookingModal = (houseId: string) => {
        setSelectedHouseId(houseId);
        setIsBookingModalOpen(true);
    };

    const handleLogout = async () => {
        await signOut(auth);
        router.push("/login"); // or wherever
    };

    const filteredHouses = houses.filter(h => filterStatus === 'all' || h.status === filterStatus);

    // Stats
    const stats = {
        total: houses.length,
        occupied: houses.filter(h => h.status === 'occupied').length,
        dirty: houses.filter(h => h.status === 'dirty').length,
        clean: houses.filter(h => h.status === 'clean').length
    };

    if (loading || !isAdmin) return <div className="h-full flex items-center justify-center p-8">Loading...</div>;

    return (
        <div className="flex flex-col h-[calc(100vh-64px)]">
            {/* Sub-Header & Filters */}
            <div className="bg-white border-b border-gray-200 py-4 shadow-sm z-30">
                <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
                    <div className="flex space-x-2 overflow-x-auto pb-2 sm:pb-0 w-full sm:w-auto scrollbar-hide">
                        <button
                            onClick={() => setFilterStatus('all')}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${filterStatus === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                        >
                            Бүгд ({stats.total})
                        </button>
                        <button
                            onClick={() => setFilterStatus('occupied')}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${filterStatus === 'occupied' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}
                        >
                            Хүнтэй ({stats.occupied})
                        </button>
                        <button
                            onClick={() => setFilterStatus('clean')}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${filterStatus === 'clean' ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}
                        >
                            Бэлэн ({stats.clean})
                        </button>
                        <button
                            onClick={() => setFilterStatus('dirty')}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${filterStatus === 'dirty' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}
                        >
                            Бохир ({stats.dirty})
                        </button>
                    </div>

                    <div className="flex space-x-2 w-full sm:w-auto">
                        <Link href="/admin/houses" className="flex-1 sm:flex-none px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center justify-center text-sm font-medium">
                            <Settings size={16} className="mr-2" />
                            Байшин засах
                        </Link>
                        <button
                            onClick={() => openBookingModal("")}
                            className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center text-sm font-medium shadow-sm transition-colors"
                        >
                            <PlusCircle size={16} className="mr-2" />
                            Шинэ Захиалга
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content - House Grid */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-gray-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 max-w-[1920px] mx-auto">
                    {filteredHouses.map((house) => (
                        <div
                            key={house.id}
                            className={`bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow flex flex-col ${STATUS_COLORS[house.status || 'clean'].split(' ')[0]}`}
                        >
                            <div className="relative h-48 sm:h-40 bg-gray-200">
                                <img
                                    src={(house.images && house.images.length > 0) ? house.images[0] : (house.imageUrl || "/placeholder-house.jpg")}
                                    alt={house.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=No+Image';
                                    }}
                                />
                                <div className="absolute top-2 right-2 bg-white/95 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold shadow-sm text-gray-800">
                                    {(house.price || 0).toLocaleString()}₮
                                </div>
                                <div className="absolute bottom-2 left-2 bg-black/60 text-white px-2 py-1 rounded text-sm font-bold backdrop-blur-sm">
                                    #{house.houseNumber} {house.name}
                                </div>
                            </div>

                            <div className={`p-4 flex-1 flex flex-col ${STATUS_COLORS[house.status || 'clean'].split(' ')[1]}`}>
                                <div className="flex justify-between items-center mb-2">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize border bg-white/50 backdrop-blur-sm
                                        ${house.status === 'clean' ? 'text-green-800 border-green-200' :
                                            house.status === 'dirty' ? 'text-red-800 border-red-200' :
                                                house.status === 'occupied' ? 'text-indigo-800 border-indigo-200' :
                                                    'text-yellow-800 border-yellow-200'}`}>
                                        {STATUS_LABELS[house.status || 'clean']}
                                    </span>
                                </div>

                                {/* Guest Details for Occupied Houses - The "Real Data" Insight */}
                                {house.status === 'occupied' && house.currentGuest && (
                                    <div className="mb-4 bg-white/60 p-2 rounded border border-indigo-100 text-sm">
                                        <div className="font-semibold text-indigo-900">{house.currentGuest.name}</div>
                                        <div className="text-indigo-700 text-xs">{house.currentGuest.phone}</div>
                                        {house.currentGuest.checkOutDate && (
                                            <div className="text-gray-500 text-xs mt-1 border-t border-indigo-100 pt-1">
                                                Гарах: {new Date(house.currentGuest.checkOutDate).toLocaleDateString()}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="mt-auto grid grid-cols-2 gap-2">
                                    {/* Primary Action Button */}
                                    {house.status === 'clean' ? (
                                        <button
                                            onClick={() => openBookingModal(house.id)}
                                            className="col-span-2 flex items-center justify-center w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition-colors shadow-sm"
                                        >
                                            <Calendar size={16} className="mr-2" />
                                            Захиалах
                                        </button>
                                    ) : house.status === 'occupied' ? (
                                        <button
                                            onClick={() => handleStatusUpdate(house.id, 'dirty')}
                                            disabled={updatingId === house.id}
                                            className="col-span-2 flex items-center justify-center w-full py-2 bg-white border border-red-300 text-red-700 rounded-lg hover:bg-red-50 text-sm font-medium transition-colors shadow-sm"
                                        >
                                            <LogOut size={16} className="mr-2" />
                                            Check-out
                                        </button>
                                    ) : house.status === 'dirty' ? (
                                        <button
                                            onClick={() => handleStatusUpdate(house.id, 'cleaning')}
                                            disabled={updatingId === house.id}
                                            className="col-span-2 flex items-center justify-center w-full py-2 bg-white border border-yellow-300 text-yellow-700 rounded-lg hover:bg-yellow-50 text-sm font-medium transition-colors shadow-sm"
                                        >
                                            <RefreshCw size={16} className="mr-2" />
                                            Цэвэрлэх
                                        </button>
                                    ) : house.status === 'cleaning' ? (
                                        <button
                                            onClick={() => handleStatusUpdate(house.id, 'clean')}
                                            disabled={updatingId === house.id}
                                            className="col-span-2 flex items-center justify-center w-full py-2 bg-white border border-green-300 text-green-700 rounded-lg hover:bg-green-50 text-sm font-medium transition-colors shadow-sm"
                                        >
                                            <CheckCircle size={16} className="mr-2" />
                                            Бэлэн болгох
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleStatusUpdate(house.id, 'clean')}
                                            className="col-span-2 flex items-center justify-center w-full py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm font-medium shadow-sm"
                                        >
                                            Засвар дууссан
                                        </button>
                                    )}

                                    {/* Secondary Utility Actions */}
                                    <button
                                        onClick={() => handleStatusUpdate(house.id, house.status === 'maintenance' ? 'clean' : 'maintenance')}
                                        className="flex items-center justify-center py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 text-xs font-medium shadow-sm transition-colors"
                                        title={house.status === 'maintenance' ? 'Хэвийн болгох' : 'Засварт оруулах'}
                                    >
                                        <PenTool size={14} className="mr-1" />
                                        {house.status === 'maintenance' ? 'Хэвийн' : 'Засвар'}
                                    </button>

                                    {house.status !== 'dirty' && house.status !== 'occupied' && (
                                        <button
                                            onClick={() => handleStatusUpdate(house.id, 'dirty')}
                                            className="flex items-center justify-center py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 text-xs font-medium shadow-sm transition-colors"
                                            title="Бохирдуулах"
                                        >
                                            <XCircle size={14} className="mr-1" />
                                            Бохир
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Quick Booking Modal */}
            <QuickBookingModal
                isOpen={isBookingModalOpen}
                onClose={() => setIsBookingModalOpen(false)}
                houses={houses}
                preSelectedHouseId={selectedHouseId}
                onSuccess={() => {/* Maybe refresh or show toast */ }}
            />
        </div>
    );
}
