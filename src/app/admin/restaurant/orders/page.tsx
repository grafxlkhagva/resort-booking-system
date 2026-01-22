"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { Order, OrderStatus } from "@/types";
import { Check, Clock, Utensils, Truck, X, ShoppingBag } from "lucide-react";

const STATUS_ORDER: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready', 'delivered'];

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Real-time listener for orders
        const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedOrders = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Order));
            setOrders(fetchedOrders);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
        try {
            await updateDoc(doc(db, "orders", orderId), {
                status: newStatus,
                updatedAt: Date.now()
            });
        } catch (error) {
            console.error("Error updating status:", error);
        }
    };

    const getStatusColor = (status: OrderStatus) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'confirmed': return 'bg-blue-100 text-blue-800';
            case 'preparing': return 'bg-orange-100 text-orange-800';
            case 'ready': return 'bg-purple-100 text-purple-800';
            case 'delivered': return 'bg-green-100 text-green-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const activeOrders = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled');
    const pastOrders = orders.filter(o => o.status === 'delivered' || o.status === 'cancelled');

    if (loading) return <div className="p-8 text-center">Loading Orders...</div>;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <h1 className="text-3xl font-bold text-gray-900 mb-8 flex items-center">
                <Utensils className="mr-3" /> Kitchen Order Dashboard
            </h1>

            {/* Active Orders Logic: Group by status columns or just list? List is simpler for now */}
            <div className="mb-10">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                    <Clock className="mr-2 text-indigo-600" /> Active Orders ({activeOrders.length})
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {activeOrders.map(order => (
                        <div key={order.id} className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden flex flex-col">
                            {/* Header */}
                            <div className={`px-4 py-3 border-b border-gray-100 flex justify-between items-center ${order.status === 'pending' ? 'bg-yellow-50' : ''}`}>
                                <span className={`px-2 py-1 text-xs font-bold uppercase rounded-full ${getStatusColor(order.status)}`}>
                                    {order.status}
                                </span>
                                <span className="text-xs text-gray-500">
                                    {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>

                            {/* Content */}
                            <div className="p-4 flex-1">
                                <div className="mb-3">
                                    <h3 className="font-bold text-gray-900">{order.guestName || "Guest"}</h3>
                                    <div className="text-sm text-gray-600 flex items-center">
                                        {order.deliveryType === 'house' ? (
                                            <>
                                                <HomeIcon className="w-4 h-4 mr-1" />
                                                {order.houseName || "House"}
                                            </>
                                        ) : (
                                            <>
                                                <ShoppingBag className="w-4 h-4 mr-1" />
                                                Restaurant Pickup
                                            </>
                                        )}
                                    </div>
                                    {order.note && (
                                        <div className="mt-2 text-sm bg-red-50 text-red-800 p-2 rounded">
                                            Note: {order.note}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2 mb-4">
                                    {order.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between text-sm">
                                            <span>
                                                <span className="font-bold mr-2">{item.quantity}x</span>
                                                {item.name}
                                            </span>
                                            <span className="text-gray-500">${item.price * item.quantity}</span>
                                        </div>
                                    ))}
                                    <div className="border-t pt-2 flex justify-between font-bold text-gray-900">
                                        <span>Total</span>
                                        <span>${order.totalAmount}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex justify-between gap-2">
                                {order.status === 'pending' && (
                                    <button
                                        onClick={() => handleUpdateStatus(order.id, 'confirmed')}
                                        className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                                    >
                                        Accept
                                    </button>
                                )}
                                {order.status === 'confirmed' && (
                                    <button
                                        onClick={() => handleUpdateStatus(order.id, 'preparing')}
                                        className="flex-1 bg-orange-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition"
                                    >
                                        Start Cooking
                                    </button>
                                )}
                                {order.status === 'preparing' && (
                                    <button
                                        onClick={() => handleUpdateStatus(order.id, 'ready')}
                                        className="flex-1 bg-purple-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition"
                                    >
                                        Ready
                                    </button>
                                )}
                                {order.status === 'ready' && (
                                    <button
                                        onClick={() => handleUpdateStatus(order.id, 'delivered')}
                                        className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition"
                                    >
                                        Completed
                                    </button>
                                )}

                                <button
                                    onClick={() => handleUpdateStatus(order.id, 'cancelled')}
                                    className="p-2 text-gray-400 hover:text-red-600 transition"
                                    title="Cancel Order"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                    ))}
                    {activeOrders.length === 0 && (
                        <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
                            No active orders
                        </div>
                    )}
                </div>
            </div>

            {/* Past Orders */}
            <div>
                <h2 className="text-xl font-bold text-gray-800 mb-4 text-gray-500">History</h2>
                <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
                    <ul className="divide-y divide-gray-200">
                        {pastOrders.map(order => (
                            <li key={order.id} className="p-4 hover:bg-gray-50">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 text-xs font-bold uppercase rounded-full ${getStatusColor(order.status)}`}>
                                                {order.status}
                                            </span>
                                            <span className="text-sm font-medium text-gray-900">
                                                Order #{order.id.slice(-4)}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500 mt-1">
                                            {new Date(order.createdAt).toLocaleString()} • {order.items.length} items • ${order.totalAmount}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-gray-900">{order.guestName}</p>
                                        <p className="text-xs text-gray-500">{order.deliveryType}</p>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}

function HomeIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
    )
}
