"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { doc, onSnapshot } from "firebase/firestore";

export default function Navbar() {
    const { user, isAdmin } = useAuth();
    const router = useRouter();
    const [branding, setBranding] = useState({
        siteName: "ResortBook",
        siteNameColor: "#4F46E5",
        logoUrl: "",
        showLogo: false,
        showName: true
    });

    useEffect(() => {
        const docRef = doc(db, "settings", "general");
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.branding) {
                    setBranding(prev => ({ ...prev, ...data.branding }));
                }
            }
        }, (error) => {
            console.error("Error fetching branding settings:", error);
        });

        return () => unsubscribe();
    }, []);

    const handleLogout = async () => {
        const wasAdmin = isAdmin;
        await signOut(auth);
        // Redirect to appropriate login page
        router.push(wasAdmin ? "/admin/login" : "/login");
    };

    return (
        <nav className="bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <Link href="/" className="flex-shrink-0 flex items-center gap-2">
                            {branding.showLogo && branding.logoUrl && (
                                <img src={branding.logoUrl} alt="Logo" className="h-10 w-auto object-contain" />
                            )}
                            {branding.showName && (
                                <span
                                    className="text-xl font-bold"
                                    style={{ color: branding.siteNameColor }}
                                >
                                    {branding.siteName}
                                </span>
                            )}
                        </Link>
                    </div>
                    <div className="flex items-center space-x-4">
                        <Link href="/" className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium">
                            Нүүр
                        </Link>

                        {isAdmin && (
                            <Link href="/admin" className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium">
                                Админ Самбар
                            </Link>
                        )}

                        {user ? (
                            <>
                                <Link href="/profile" className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium">
                                    Миний Захиалгууд
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium"
                                >
                                    Гарах
                                </button>
                            </>
                        ) : (
                            <Link href="/login" className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700">
                                Нэвтрэх
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
