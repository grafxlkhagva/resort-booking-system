"use client";

import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Home, Calendar, Settings, Users } from "lucide-react";

export default function AdminDashboard() {
    const { user, isAdmin, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && (!user || !isAdmin)) {
            router.push("/");
        }
    }, [user, isAdmin, loading, router]);

    if (loading) return <div className="p-8 text-center">Loading...</div>;
    if (!isAdmin) return null;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Админ Самбар</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Link href="/admin/houses" className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-indigo-100 rounded-full text-indigo-600">
                            <Home size={32} />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">Байшин Удирдах</h2>
                            <p className="text-gray-600 mt-1">Амралтын байр нэмэх, засах, устгах.</p>
                        </div>
                    </div>
                </Link>

                <Link href="/admin/bookings" className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-green-100 rounded-full text-green-600">
                            <Calendar size={32} />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">Захиалга Удирдах</h2>
                            <p className="text-gray-600 mt-1">Хэрэглэгчийн захиалгуудыг харах, удирдах.</p>
                        </div>
                    </div>
                </Link>

                <Link href="/admin/users" className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-purple-100 rounded-full text-purple-600">
                            <Users size={32} />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">Хэрэглэгч Удирдах</h2>
                            <p className="text-gray-600 mt-1">Хэрэглэгчдийг харах, админ эрх олгох.</p>
                        </div>
                    </div>
                </Link>

                <Link href="/admin/amenities" className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-gray-900">Тавилга / Төхөөрөмж</h2>
                        <Settings className="text-indigo-600" size={24} />
                    </div>
                    <p className="text-gray-600">Тавилга, тоног төхөөрөмжийн бүртгэл хөтлөх.</p>
                </Link>

                <Link href="/admin/settings" className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-gray-900">Ерөнхий Тохиргоо</h2>
                        <Settings className="text-indigo-600" size={24} />
                    </div>
                    <p className="text-gray-600">Газрын зураг, холбоо барих мэдээлэл тохируулах.</p>
                </Link>
            </div>
        </div>
    );
}
