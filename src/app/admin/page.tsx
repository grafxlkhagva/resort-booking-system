"use client";

import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Home,
  Calendar,
  UtensilsCrossed,
  ClipboardList,
  Users,
  Settings,
  ChevronRight,
  ListOrdered,
  ChefHat,
  Link2,
} from "lucide-react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

type HouseStatus = "clean" | "dirty" | "cleaning" | "occupied" | "maintenance";

interface DashboardStats {
  houses: { total: number; occupied: number; clean: number; dirty: number; cleaning: number; maintenance: number };
  bookings: { total: number; pending: number; confirmed: number };
  orders: { total: number; active: number };
  menuItems: number;
  users: number;
}

export default function AdminDashboard() {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push("/");
    }
  }, [user, isAdmin, loading, router]);

  useEffect(() => {
    if (!isAdmin) return;

    const fetch = async () => {
      setLoadingStats(true);
      try {
        const [accSnap, bookSnap, ordersSnap, menuSnap, usersSnap] = await Promise.all([
          getDocs(collection(db, "accommodations")),
          getDocs(collection(db, "bookings")),
          getDocs(collection(db, "orders")),
          getDocs(collection(db, "menu_items")),
          getDocs(collection(db, "users")),
        ]);

        const houses = accSnap.docs.map((d) => ({ ...d.data(), status: (d.data().status as HouseStatus) || "clean" }));
        const houseCounts = { total: houses.length, occupied: 0, clean: 0, dirty: 0, cleaning: 0, maintenance: 0 };
        houses.forEach((h) => {
          const s = h.status as HouseStatus;
          if (s in houseCounts) (houseCounts as Record<string, number>)[s] = ((houseCounts as Record<string, number>)[s] || 0) + 1;
        });

        const bookings = bookSnap.docs.map((d) => d.data() as { status?: string });
        const bookCounts = {
          total: bookings.length,
          pending: bookings.filter((b) => b.status === "pending").length,
          confirmed: bookings.filter((b) => b.status === "confirmed").length,
        };

        const orders = ordersSnap.docs.map((d) => d.data() as { status?: string });
        const activeOrders = orders.filter((o) => o.status !== "delivered" && o.status !== "cancelled");

        setStats({
          houses: houseCounts,
          bookings: bookCounts,
          orders: { total: orders.length, active: activeOrders.length },
          menuItems: menuSnap.size,
          users: usersSnap.size,
        });
      } catch (e) {
        console.error("Dashboard fetch error:", e);
      } finally {
        setLoadingStats(false);
      }
    };

    fetch();
  }, [isAdmin]);

  if (loading || !isAdmin) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto content-padding">
      <h1 className="text-xl sm:text-2xl font-bold text-[var(--foreground)] mb-2">Хянах самбар</h1>
      <p className="text-[var(--muted)] text-sm mb-6 sm:mb-8">Гол мэдээлэл, удирдлагын холбоос</p>

      {loadingStats ? (
        <div className="flex justify-center py-16">
          <div className="spinner" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {/* Байшин удирдлага */}
          <Link href="/admin/houses" className="card p-5 hover:shadow-[var(--shadow-lg)] transition-shadow group block">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-indigo-100 text-indigo-600">
                <Home size={22} />
              </div>
              <ChevronRight className="w-5 h-5 text-[var(--muted)] group-hover:text-[var(--primary)] flex-shrink-0" />
            </div>
            <h2 className="font-semibold text-[var(--foreground)] mt-3 mb-2">Байшин удирдлага</h2>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--muted)]">
              <span>Нийт: <strong className="text-[var(--foreground)]">{stats?.houses.total ?? 0}</strong></span>
              <span>Хүнтэй: <strong className="text-indigo-600">{stats?.houses.occupied ?? 0}</strong></span>
              <span>Бэлэн: <strong className="text-green-600">{stats?.houses.clean ?? 0}</strong></span>
              <span>Бохир: <strong className="text-red-600">{stats?.houses.dirty ?? 0}</strong></span>
            </div>
            <p className="text-xs text-[var(--muted-foreground)] mt-3">Жороо засах, байшин нэмэх</p>
          </Link>

          {/* Захиалга удирдлага */}
          <div className="card p-5 flex flex-col">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-amber-100 text-amber-600">
                <Calendar size={22} />
              </div>
            </div>
            <h2 className="font-semibold text-[var(--foreground)] mt-3 mb-2">Захиалга удирдлага</h2>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--muted)]">
              <span>Нийт: <strong className="text-[var(--foreground)]">{stats?.bookings.total ?? 0}</strong></span>
              <span>Хүлээгдэж буй: <strong className="text-amber-600">{stats?.bookings.pending ?? 0}</strong></span>
              <span>Баталгаажсан: <strong className="text-green-600">{stats?.bookings.confirmed ?? 0}</strong></span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/admin/bookings" className="btn-primary text-sm py-2 px-4 inline-flex">
                <ListOrdered size={16} className="mr-1.5" /> Захиалгууд
              </Link>
              <Link href="/admin/bookings/new" className="text-sm py-2 px-4 rounded-xl border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--background)] inline-flex">
                Шинэ захиалга
              </Link>
            </div>
          </div>

          {/* Ресторан удирдлага */}
          <div className="card p-5 flex flex-col">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-emerald-100 text-emerald-600">
                <UtensilsCrossed size={22} />
              </div>
            </div>
            <h2 className="font-semibold text-[var(--foreground)] mt-3 mb-2">Ресторан удирдлага</h2>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--muted)]">
              <span>Меню: <strong className="text-[var(--foreground)]">{stats?.menuItems ?? 0}</strong> ширхэг</span>
              <span>Идэвхтэй захиалга: <strong className="text-amber-600">{stats?.orders.active ?? 0}</strong></span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/admin/restaurant/menu" className="text-sm py-2 px-4 rounded-xl border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--background)] inline-flex">
                <ChefHat size={16} className="mr-1.5" /> Меню
              </Link>
              <Link href="/admin/restaurant/orders" className="text-sm py-2 px-4 rounded-xl border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--background)] inline-flex">
                <UtensilsCrossed size={16} className="mr-1.5" /> Захиалгууд (Kitchen)
              </Link>
            </div>
          </div>

          {/* Өдрийн үйл ажиллагаа / Housekeeping */}
          <Link href="/admin/operations" className="card p-5 hover:shadow-[var(--shadow-lg)] transition-shadow group block">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-slate-100 text-slate-600">
                <ClipboardList size={22} />
              </div>
              <ChevronRight className="w-5 h-5 text-[var(--muted)] group-hover:text-[var(--primary)] flex-shrink-0" />
            </div>
            <h2 className="font-semibold text-[var(--foreground)] mt-3 mb-2">Өдрийн үйл ажиллагаа</h2>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--muted)]">
              <span>Хүнтэй: <strong className="text-indigo-600">{stats?.houses.occupied ?? 0}</strong></span>
              <span>Бохир: <strong className="text-red-600">{stats?.houses.dirty ?? 0}</strong></span>
              <span>Цэвэрлэж байна: <strong className="text-amber-600">{stats?.houses.cleaning ?? 0}</strong></span>
              <span>Бэлэн: <strong className="text-green-600">{stats?.houses.clean ?? 0}</strong></span>
            </div>
            <p className="text-xs text-[var(--muted-foreground)] mt-3">Ирэх/гэх, байшны төлөв, өдрийн тайлан</p>
          </Link>

          {/* Channel Manager */}
          <Link href="/admin/channel-manager" className="card p-5 hover:shadow-[var(--shadow-lg)] transition-shadow group block">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-violet-100 text-violet-600">
                <Link2 size={22} />
              </div>
              <ChevronRight className="w-5 h-5 text-[var(--muted)] group-hover:text-[var(--primary)] flex-shrink-0" />
            </div>
            <h2 className="font-semibold text-[var(--foreground)] mt-3 mb-2">Channel Manager</h2>
            <p className="text-sm text-[var(--muted)]">Буудлын цахим суваг, синк тохиргоо</p>
          </Link>

          {/* Хэрэглэгчид */}
          <Link href="/admin/users" className="card p-5 hover:shadow-[var(--shadow-lg)] transition-shadow group block">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-cyan-100 text-cyan-600">
                <Users size={22} />
              </div>
              <ChevronRight className="w-5 h-5 text-[var(--muted)] group-hover:text-[var(--primary)] flex-shrink-0" />
            </div>
            <h2 className="font-semibold text-[var(--foreground)] mt-3 mb-2">Хэрэглэгчид</h2>
            <p className="text-sm text-[var(--muted)]">Нийт: <strong className="text-[var(--foreground)]">{stats?.users ?? 0}</strong></p>
          </Link>

          {/* Тохиргоо */}
          <Link href="/admin/settings" className="card p-5 hover:shadow-[var(--shadow-lg)] transition-shadow group block">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-[var(--border)] text-[var(--muted)]">
                <Settings size={22} />
              </div>
              <ChevronRight className="w-5 h-5 text-[var(--muted)] group-hover:text-[var(--primary)] flex-shrink-0" />
            </div>
            <h2 className="font-semibold text-[var(--foreground)] mt-3 mb-2">Тохиргоо</h2>
            <p className="text-sm text-[var(--muted)]">Сайт, холбоо барих, ресторан, захиалга</p>
          </Link>
        </div>
      )}
    </div>
  );
}
