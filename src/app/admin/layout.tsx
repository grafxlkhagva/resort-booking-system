"use client";

import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Home, Calendar, Settings, Users, LogOut, Menu, X } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, isAdmin, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    useEffect(() => {
        if (!loading && (!user || !isAdmin)) {
            // If checking auth/admin status specifically on layout might cause loops or issues on login page, 
            // but usually safe. The Login page itself is under /admin/login? 
            // If so, we need to exclude it or be careful.
            // Actually, /admin/login should probably NOT share this layout if this layout enforces auth.
            // But typical Next.js structure applies layout to all sub-routes.
            // If /admin/login is inside src/app/admin/login, it gets this layout.
            // We should conditionally render or check pathname.
        }
    }, [user, isAdmin, loading, router]);

    const handleLogout = async () => {
        await signOut(auth);
        router.push("/admin/login");
    };

    // If we are on the login page, don't show the admin sidebar/header
    if (pathname === "/admin/login") {
        return <>{children}</>;
    }

    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    if (!isAdmin) return null; // Or redirect handled in useEffect

    const navItems = [
        { href: "/admin", label: "Самбар", icon: Home },
        { href: "/admin/bookings", label: "Захиалгууд", icon: Calendar },
        { href: "/admin/operations", label: "Housekeeping", icon: Settings }, // Using Settings temporarily as icon or import broom/clipboard
        { href: "/admin/users", label: "Хэрэглэгчид", icon: Users },
        { href: "/admin/settings", label: "Тохиргоо", icon: Settings },
    ];

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            {/* Top Navigation Bar */}
            <header className="bg-white shadow-sm z-50 sticky top-0">
                <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-8">
                        <Link href="/admin" className="text-xl font-bold text-indigo-700 flex items-center">
                            <Home className="mr-2" /> Admin Panel
                        </Link>

                        {/* Desktop Nav */}
                        <nav className="hidden md:flex space-x-4">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors
                                            ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-50'}
                                        `}
                                    >
                                        <Icon size={18} className="mr-1.5" /> {item.label}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>

                    <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-500 hidden sm:inline">User: {user?.displayName || user?.email}</span>
                        <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-600 transition-colors" title="Гарах">
                            <LogOut size={20} />
                        </button>

                        {/* Mobile Menu Button */}
                        <button
                            className="md:hidden p-2 text-gray-600"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                        >
                            {isMenuOpen ? <X /> : <Menu />}
                        </button>
                    </div>
                </div>

                {/* Mobile Nav */}
                {isMenuOpen && (
                    <div className="md:hidden bg-white border-t border-gray-200">
                        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                            {navItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    {item.label}
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </header>

            {/* Main Content */}
            <main className="flex-1">
                {children}
            </main>
        </div>
    );
}
