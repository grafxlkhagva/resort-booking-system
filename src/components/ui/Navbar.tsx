"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { doc, onSnapshot } from "firebase/firestore";
import { Menu, X, UtensilsCrossed, User, LogOut, LayoutDashboard } from "lucide-react";

export default function Navbar() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [branding, setBranding] = useState({
    siteName: "ResortBook",
    siteNameColor: "#4F46E5",
    logoUrl: "",
    showLogo: false,
    showName: true,
  });

  useEffect(() => {
    const docRef = doc(db, "settings", "general");
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.branding) {
            setBranding((prev) => ({ ...prev, ...data.branding }));
          }
        }
      },
      (error) => console.error("Error fetching branding:", error)
    );
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    const wasAdmin = isAdmin;
    await signOut(auth);
    setMenuOpen(false);
    router.push(wasAdmin ? "/admin/login" : "/login");
  };

  const navLinks = [
    { href: "/", label: "Нүүр" },
    { href: "/restaurant", label: "Ресторан", icon: UtensilsCrossed },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[var(--card)] border-b border-[var(--border)] safe-top shadow-[var(--shadow)]">
      <div className="content-padding max-w-7xl mx-auto">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 touch-target flex-shrink-0"
            onClick={() => setMenuOpen(false)}
          >
            {branding.showLogo && branding.logoUrl && (
              <img src={branding.logoUrl} alt="" className="h-9 w-auto object-contain" />
            )}
            {branding.showName && (
              <span className="text-lg sm:text-xl font-bold" style={{ color: branding.siteNameColor }}>
                {branding.siteName}
              </span>
            )}
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="px-3 py-2 rounded-xl text-[var(--foreground)]/80 hover:text-[var(--primary)] hover:bg-[var(--primary)]/5 text-sm font-medium transition-colors"
              >
                {l.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                href="/admin"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[var(--foreground)]/80 hover:text-[var(--primary)] hover:bg-[var(--primary)]/5 text-sm font-medium transition-colors"
              >
                <LayoutDashboard size={16} /> Самбар
              </Link>
            )}
            {user ? (
              <>
                <Link
                  href="/profile"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[var(--foreground)]/80 hover:text-[var(--primary)] hover:bg-[var(--primary)]/5 text-sm font-medium transition-colors"
                >
                  <User size={16} /> Захиалгууд
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[var(--foreground)]/80 hover:text-red-600 hover:bg-red-500/5 text-sm font-medium transition-colors"
                >
                  <LogOut size={16} /> Гарах
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="btn-primary inline-flex items-center justify-center px-4 text-sm"
              >
                Нэвтрэх
              </Link>
            )}
          </nav>

          {/* Mobile: right side: cart(restaurant) + menu button */}
          <div className="flex md:hidden items-center gap-1">
            <Link
              href="/restaurant"
              className="touch-target flex items-center justify-center p-2.5 rounded-xl text-[var(--foreground)]/80 hover:bg-[var(--primary)]/10 hover:text-[var(--primary)]"
              aria-label="Ресторан"
            >
              <UtensilsCrossed size={22} />
            </Link>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="touch-target flex items-center justify-center p-2.5 rounded-xl text-[var(--foreground)]/80 hover:bg-[var(--primary)]/10"
              aria-label={menuOpen ? "Цэс хаах" : "Цэс нээх"}
            >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu panel */}
      {menuOpen && (
        <div className="md:hidden border-t border-[var(--border)] bg-[var(--card)] safe-x safe-bottom">
          <nav className="content-padding py-4 space-y-1">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="flex items-center gap-3 min-h-[var(--touch)] px-4 rounded-xl text-[var(--foreground)] font-medium hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                {l.icon && <l.icon size={20} className="text-[var(--muted)]" />}
                {l.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                href="/admin"
                className="flex items-center gap-3 min-h-[var(--touch)] px-4 rounded-xl text-[var(--foreground)] font-medium hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                <LayoutDashboard size={20} className="text-[var(--muted)]" />
                Админ Самбар
              </Link>
            )}
            {user ? (
              <>
                <Link
                  href="/profile"
                  className="flex items-center gap-3 min-h-[var(--touch)] px-4 rounded-xl text-[var(--foreground)] font-medium hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  <User size={20} className="text-[var(--muted)]" />
                  Миний Захиалгууд
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 min-h-[var(--touch)] px-4 rounded-xl text-red-600 font-medium hover:bg-red-500/10 transition-colors text-left"
                >
                  <LogOut size={20} />
                  Гарах
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="btn-primary flex items-center justify-center mt-2"
                onClick={() => setMenuOpen(false)}
              >
                Нэвтрэх
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
