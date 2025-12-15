"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { House, HouseStatus } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, CheckCircle, XCircle, Clock, Home, PenTool, RefreshCw } from "lucide-react";
import Link from "next/link";

const STATUS_LABELS: Record<HouseStatus, string> = {
    clean: "Цэвэр",
    dirty: "Бохир",
    cleaning: "Цэвэрлэж байна",
    occupied: "Хүнтэй",
    maintenance: "Засвартай",
};

const STATUS_COLORS: Record<HouseStatus, string> = {
    clean: "bg-green-100 text-green-800 border-green-200",
    dirty: "bg-red-100 text-red-800 border-red-200",
    cleaning: "bg-yellow-100 text-yellow-800 border-yellow-200",
    occupied: "bg-indigo-100 text-indigo-800 border-indigo-200",
    maintenance: "bg-gray-100 text-gray-800 border-gray-200",
};

export default function HouseOperationsPage() {
    const { user, isAdmin, loading } = useAuth();
    const router = useRouter();
    const [houses, setHouses] = useState<House[]>([]);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    useEffect(() => {
        if (!loading && (!user || !isAdmin)) {
            router.push("/");
        }
    }, [user, isAdmin, loading, router]);

    // Real-time listener for house statuses
    useEffect(() => {
        if (!isAdmin) return;

        const unsubscribe = onSnapshot(collection(db, "houses"), (snapshot) => {
            const housesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                status: doc.data().status || 'clean' // Default to clean if undefined
            })) as House[];
            // Sort by house number
            setHouses(housesData.sort((a, b) => a.houseNumber - b.houseNumber));
        });

        return () => unsubscribe();
    }, [isAdmin]);

    const updateStatus = async (houseId: string, newStatus: HouseStatus) => {
        setUpdatingId(houseId);
        try {
            await updateDoc(doc(db, "houses", houseId), {
                status: newStatus
            });
        } catch (err) {
            console.error("Failed to update status", err);
            alert("Failed to update status");
        } finally {
            setUpdatingId(null);
        }
    };

    if (loading || !isAdmin) return null;

    const renderKanbanColumn = (status: HouseStatus, title: string, icon: React.ReactNode) => {
        const filteredHouses = houses.filter(h => (h.status || 'clean') === status);

        return (
            <div className="bg-gray-50 rounded-xl p-4 min-h-[500px] border border-gray-200 flex flex-col">
                <div className="flex items-center justify-between mb-4 border-b border-gray-200 pb-2">
                    <h3 className="font-semibold text-gray-700 flex items-center">
                        {icon}
                        <span className="ml-2">{title}</span>
                    </h3>
                    <span className="bg-white px-2 py-0.5 rounded text-xs font-medium border border-gray-200 text-gray-500">
                        {filteredHouses.length}
                    </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto">
                    {filteredHouses.map(house => (
                        <div key={house.id} className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                                <span className="font-bold text-gray-900">#{house.houseNumber}</span>
                                <span className="text-sm text-gray-500">{house.name}</span>
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-2">
                                {status === 'dirty' && (
                                    <button
                                        onClick={() => updateStatus(house.id, 'cleaning')}
                                        disabled={updatingId === house.id}
                                        className="col-span-2 text-xs bg-yellow-100 text-yellow-700 py-1.5 px-3 rounded hover:bg-yellow-200 transition-colors w-full"
                                    >
                                        Цэвэрлэж эхлэх
                                    </button>
                                )}
                                {status === 'cleaning' && (
                                    <button
                                        onClick={() => updateStatus(house.id, 'clean')}
                                        disabled={updatingId === house.id}
                                        className="col-span-2 text-xs bg-green-100 text-green-700 py-1.5 px-3 rounded hover:bg-green-200 transition-colors w-full"
                                    >
                                        Цэвэрлэж дууссан
                                    </button>
                                )}
                                {status === 'clean' && (
                                    <>
                                        <button
                                            onClick={() => updateStatus(house.id, 'occupied')}
                                            disabled={updatingId === house.id}
                                            className="text-xs bg-indigo-100 text-indigo-700 py-1.5 px-3 rounded hover:bg-indigo-200 transition-colors"
                                        >
                                            Check-in
                                        </button>
                                        <button
                                            onClick={() => updateStatus(house.id, 'dirty')}
                                            disabled={updatingId === house.id}
                                            className="text-xs bg-gray-100 text-gray-600 py-1.5 px-3 rounded hover:bg-gray-200 transition-colors"
                                        >
                                            Бохирдуулах
                                        </button>
                                    </>
                                )}
                                {status === 'occupied' && (
                                    <button
                                        onClick={() => updateStatus(house.id, 'dirty')}
                                        disabled={updatingId === house.id}
                                        className="col-span-2 text-xs bg-red-100 text-red-700 py-1.5 px-3 rounded hover:bg-red-200 transition-colors w-full"
                                    >
                                        Check-out (Бохир)
                                    </button>
                                )}

                                <button
                                    onClick={() => updateStatus(house.id, status === 'maintenance' ? 'clean' : 'maintenance')}
                                    disabled={updatingId === house.id}
                                    className={`col-span-2 text-xs py-1 px-2 rounded border transition-colors mt-1 ${status === 'maintenance'
                                            ? 'bg-white text-green-600 border-green-200 hover:bg-green-50'
                                            : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50 hover:text-gray-600'
                                        }`}
                                >
                                    {status === 'maintenance' ? 'Засвар дууссан' : 'Засварт оруулах'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-[1600px] mx-auto px-4 py-8">
            <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center">
                    <Link href="/admin" className="mr-4 p-2 rounded-full hover:bg-gray-100">
                        <ArrowLeft size={24} className="text-gray-600" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Өрөөний удирдлага (Housekeeping)</h1>
                        <p className="text-gray-500 text-sm mt-1">Нийт {houses.length} байшин</p>
                    </div>
                </div>

                <div className="flex space-x-2">
                    {/* Filter or extra actions can go here */}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6 overflow-x-auto pb-4">
                {renderKanbanColumn('occupied', 'Хүнтэй', <UserIcon className="text-indigo-500" />)}
                {renderKanbanColumn('dirty', 'Бохир', <XCircle className="text-red-500" />)}
                {renderKanbanColumn('cleaning', 'Цэвэрлэгээ', <RefreshCw className="text-yellow-500" />)}
                {renderKanbanColumn('clean', 'Цэвэр / Бэлэн', <CheckCircle className="text-green-500" />)}
                {renderKanbanColumn('maintenance', 'Засвартай', <PenTool className="text-gray-500" />)}
            </div>
        </div>
    );
}

// Simple internal icon components if needed, using generic Home for user generic
function UserIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
    )
}
