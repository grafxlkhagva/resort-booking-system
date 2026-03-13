"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useRouter, usePathname } from "next/navigation";
import { doc, onSnapshot } from "firebase/firestore";
import { Menu, X, UtensilsCrossed, User, LogOut, LayoutDashboard, Home } from "lucide-react";
import LanguageSelector from "./LanguageSelector";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Navbar() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLanguage();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [branding, setBranding] = useState({
    siteName: "ResortBook",
    siteNameColor: "#4F46E5",
    logoUrl: "",
    showLogo: false,
    showName: true,
  });

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);

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

    return () => {
      unsubscribe();
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleLogout = async () => {
    const wasAdmin = isAdmin;
    await signOut(auth);
    setMenuOpen(false);
    router.push(wasAdmin ? "/admin/login" : "/login");
  };

  const navLinks = [
    { href: "/", label: t('nav_home', 'Нүүр'), icon: Home },
    { href: "/restaurant", label: t('nav_restaurant', 'Ресторан'), icon: UtensilsCrossed },
  ];

  const isHomePage = pathname === '/';
  // Combined condition for transparent hero navbar
  // 'mounted' check prevents hydration mismatch
  const isTransparent = isHomePage && !isScrolled && mounted;

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 safe-top ${isTransparent
        ? 'bg-transparent border-b-transparent shadow-none'
        : 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-[var(--border)] shadow-lg'
      }`}>
      <div className="content-padding max-w-7xl mx-auto">
        <div className="flex items-center justify-between h-14 sm:h-20">
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
              <span
                className={`text-xl sm:text-2xl font-black tracking-tighter transition-colors ${isTransparent ? 'text-white' : ''}`}
                style={{ color: isTransparent ? undefined : branding.siteNameColor }}
              >
                {branding.siteName}
              </span>
            )}
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-2">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`px-4 py-2 rounded-2xl text-sm font-bold transition-all ${isTransparent
                    ? 'text-white hover:bg-white/10'
                    : 'text-[var(--foreground)]/80 hover:text-[var(--primary)] hover:bg-[var(--primary)]/5'
                  }`}
              >
                {l.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                href="/admin"
                className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm font-bold transition-all ${isTransparent
                    ? 'text-white hover:bg-white/10'
                    : 'text-[var(--foreground)]/80 hover:text-[var(--primary)] hover:bg-[var(--primary)]/5'
                  }`}
              >
                <LayoutDashboard size={16} /> {t('nav_admin', 'Самбар')}
              </Link>
            )}
            {user ? (
              <>
                <Link
                  href="/profile"
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm font-bold transition-all ${isTransparent
                      ? 'text-white hover:bg-white/10'
                      : 'text-[var(--foreground)]/80 hover:text-[var(--primary)] hover:bg-[var(--primary)]/5'
                    }`}
                >
                  <User size={16} /> {t('nav_my_bookings', 'Захиалгууд')}
                </Link>
                <button
                  onClick={handleLogout}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm font-bold transition-all ${isTransparent
                      ? 'text-white/80 hover:text-red-400 hover:bg-white/10'
                      : 'text-[var(--foreground)]/80 hover:text-red-600 hover:bg-red-500/5'
                    }`}
                >
                  <LogOut size={16} /> {t('nav_logout', 'Гарах')}
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className={`px-6 py-2.5 rounded-2xl text-sm font-bold transition-all shadow-lg ${isTransparent
                    ? 'bg-white text-[var(--primary)] hover:bg-gray-100'
                    : 'bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]'
                  }`}
              >
                {t('nav_login', 'Нэвтрэх')}
              </Link>
            )}
            <div className={`ml-2 border-l pl-2 transition-colors ${isTransparent ? 'border-white/20' : 'border-[var(--border)]'}`}>
              <LanguageSelector />
            </div>
          </nav>

          {/* Mobile: right side: cart(restaurant) + menu button */}
          <div className="flex md:hidden items-center gap-1">
            <Link
              href="/restaurant"
              className={`touch-target flex items-center justify-center p-2.5 rounded-xl transition-colors ${isTransparent ? 'text-white' : 'text-[var(--foreground)]/80'
                }`}
              aria-label="Ресторан"
            >
              <UtensilsCrossed size={22} />
            </Link>
            <LanguageSelector />
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className={`touch-target flex items-center justify-center p-2.5 rounded-xl transition-colors ${isTransparent ? 'text-white' : 'text-[var(--foreground)]/80'
                }`}
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
                {t('nav_admin', 'Админ Самбар')}
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
                  {t('nav_my_bookings', 'Миний Захиалгууд')}
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 min-h-[var(--touch)] px-4 rounded-xl text-red-600 font-medium hover:bg-red-500/10 transition-colors text-left"
                >
                  <LogOut size={20} />
                  {t('nav_logout', 'Гарах')}
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="btn-primary flex items-center justify-center mt-2"
                onClick={() => setMenuOpen(false)}
              >
                {t('nav_login', 'Нэвтрэх')}
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
