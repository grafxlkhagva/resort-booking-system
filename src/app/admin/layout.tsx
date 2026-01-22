"use client";

import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Home, LogOut, Menu, X } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (pathname === "/admin/login") return;
    if (!loading && (!user || !isAdmin)) {
      router.replace("/");
    }
  }, [pathname, user, isAdmin, loading, router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/admin/login");
  };

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  if (loading)
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  if (!isAdmin) return null;

  const isDashboard = pathname === "/admin";

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      <header className="sticky top-0 z-50 bg-[var(--card)] border-b border-[var(--border)] shadow-[var(--shadow)] safe-top">
        <div className="content-padding max-w-[1920px] mx-auto h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <Link
              href="/admin"
              className="flex items-center gap-2 text-[var(--primary)] font-bold text-lg flex-shrink-0"
            >
              <Home size={20} /> Админ
            </Link>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs sm:text-sm text-[var(--muted)] hidden sm:inline truncate max-w-[160px]">
              {user?.displayName || user?.email}
            </span>
            <button
              onClick={handleLogout}
              className="touch-target flex items-center justify-center p-2 text-[var(--muted)] hover:text-red-600 rounded-xl"
              title="Гарах"
            >
              <LogOut size={20} />
            </button>
            <button
              className="md:hidden touch-target flex items-center justify-center p-2 text-[var(--foreground)] rounded-xl"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? "Хаах" : "Цэс"}
            >
              {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile menu: Самбар, Гарах */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-[var(--border)] bg-[var(--card)]">
            <nav className="content-padding py-4 space-y-1">
              <Link
                href="/admin"
                className="flex items-center gap-3 min-h-[var(--touch)] px-4 rounded-xl font-medium text-[var(--foreground)] hover:bg-[var(--background)]"
                onClick={() => setIsMenuOpen(false)}
              >
                <Home size={18} className="text-[var(--muted)]" /> Самбар руу
              </Link>
              <button
                onClick={() => {
                  handleLogout();
                  setIsMenuOpen(false);
                }}
                className="flex w-full items-center gap-3 min-h-[var(--touch)] px-4 rounded-xl font-medium text-red-600 hover:bg-red-500/10 text-left"
              >
                <LogOut size={18} /> Гарах
              </button>
            </nav>
          </div>
        )}
      </header>

      {/* Буцах bar: зөвхөн /admin биш дэд хуудсууд дээр */}
      {!isDashboard && (
        <div className="bg-[var(--card)] border-b border-[var(--border)]">
          <div className="content-padding max-w-[1920px] mx-auto py-2">
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--primary)]"
            >
              ← Самбар руу
            </Link>
          </div>
        </div>
      )}

      <main className="flex-1">{children}</main>
    </div>
  );
}
