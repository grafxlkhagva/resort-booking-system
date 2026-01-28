"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { House } from "@/types";
import Link from "next/link";
import { useAmenities } from "@/hooks/useAmenities";
import { useLanguage } from "@/contexts/LanguageContext";
import { Users, Wifi, Wind, MapPin, Phone, Mail, ChevronRight, Star, ShieldCheck, Coffee, Utensils } from "lucide-react";
import { isDiscountActive } from "@/lib/utils";

export default function Home() {
  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentLanguage, t } = useLanguage();
  const { getAmenityName } = useAmenities();
  const [settings, setSettings] = useState<any>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);

    const fetchData = async () => {
      try {
        const housesCollection = collection(db, "accommodations");
        const houseSnapshot = await getDocs(housesCollection);
        const houseList = houseSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          price: doc.data().pricePerNight || 0,
          houseNumber: doc.data().houseNumber || 0,
          imageUrl: doc.data().featuredImage || "",
        })) as House[];

        setHouses(houseList.sort((a, b) => (a.houseNumber || 0) - (b.houseNumber || 0)));

        const settingsRef = doc(db, "settings", "general");
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists()) setSettings(settingsSnap.data());
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner w-12 h-12" />
          <p className="text-[var(--muted)] font-medium animate-pulse">{t('loading', 'Уншиж байна...')}</p>
        </div>
      </div>
    );
  }

  const houseTitle = settings?.cover?.title || t('hero_title', "Танд тохирох төгс амралтыг олоорой");
  const houseSubtitle = settings?.cover?.subtitle || t('hero_subtitle', "Манай гэр бүлд зориулсан тусгай байшингуудаас сонголтоо хийж, дараагийн амралтаа төлөвлөөрэй.");

  return (
    <div className="bg-[var(--background)] min-h-screen selection:bg-[var(--primary)] selection:text-white">
      {/* Hero Section */}
      <section className="relative h-[85vh] min-h-[600px] w-full overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 z-0">
          <img
            src={settings?.cover?.imageUrl || "https://images.unsplash.com/photo-1542718610-a1d656d1884c?q=80&w=2070&auto=format&fit=crop"}
            alt="Hero Background"
            className="w-full h-full object-cover scale-105 animate-slow-zoom"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-[var(--background)]"></div>
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center text-white">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-8 animate-fade-in opacity-0" style={{ animationDelay: '400ms' }}>
            {houseTitle}
          </h1>
          <p className="text-lg md:text-xl text-gray-200 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in opacity-0" style={{ animationDelay: '600ms' }}>
            {houseSubtitle}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in opacity-0" style={{ animationDelay: '800ms' }}>
            <button
              onClick={() => document.getElementById('houses')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-4 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-2xl font-bold transition-all shadow-xl shadow-indigo-500/25 hover:-translate-y-1 flex items-center gap-2 group"
            >
              {t('explore_now', 'Байшингууд үзэх')}
              <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <Link href="/restaurant" className="px-8 py-4 glass text-white hover:bg-white/20 rounded-2xl font-bold transition-all hover:-translate-y-1">
              {t('view_menu', 'Ресторан цэс')}
            </Link>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce cursor-pointer flex flex-col items-center gap-2" onClick={() => document.getElementById('houses')?.scrollIntoView({ behavior: 'smooth' })}>
          <span className="text-[10px] uppercase tracking-widest text-white/60 font-medium">Scroll</span>
          <div className="w-1 h-6 rounded-full bg-white/40 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1/2 bg-white animate-scroll-pill"></div>
          </div>
        </div>
      </section>

      {/* Stats/Features Section */}
      <section className="relative z-20 -mt-16 px-6 max-w-7xl mx-auto mb-24">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: <ShieldCheck size={24} />, title: t('safe_stay', 'Аюулгүй'), desc: t('safe_stay_desc', '24/7 харуул хамгаалалт') },
            { icon: <Wifi size={24} />, title: t('free_wifi', 'Интернэт'), desc: t('free_wifi_desc', 'Өндөр хурдны утасгүй сүлжээ') },
            { icon: <Coffee size={24} />, title: t('breakfast', 'Өглөөний цай'), desc: t('breakfast_desc', 'Чанартай шинэхэн хоол') },
            { icon: <Utensils size={24} />, title: t('restaurant', 'Ресторан'), desc: t('restaurant_desc', 'Амттай боловсон үйлчилгээ') },
          ].map((feature, i) => (
            <div key={i} className="card p-6 flex flex-col items-center text-center hover-scale shadow-xl">
              <div className="w-12 h-12 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center mb-4">
                {feature.icon}
              </div>
              <h3 className="font-bold text-[var(--foreground)] mb-1">{feature.title}</h3>
              <p className="text-xs text-[var(--muted)]">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Accommodations Title */}
      <section id="houses" className="max-w-7xl mx-auto px-6 mb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="max-w-2xl">
            <h2 className="text-sm font-bold text-[var(--primary)] uppercase tracking-widest mb-3">{t('accommodations_header', 'Амралтын байр')}</h2>
            <h3 className="text-3xl md:text-4xl font-bold text-[var(--foreground)] leading-tight">
              {t('accommodations_title', 'Танд тохирох төгс хувилбарыг сонгоно уу')}
            </h3>
          </div>
          <div className="flex gap-2">
            <div className="px-4 py-2 rounded-xl bg-[var(--primary)]/5 border border-[var(--primary)]/10 text-[var(--primary)] text-sm font-semibold">
              {houses.length} {t('variants', 'сонголт')}
            </div>
          </div>
        </div>

        {/* Houses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {houses.map((house) => (
            <div key={house.id} className="group card flex flex-col overflow-hidden border-none shadow-xl hover:shadow-2xl transition-all duration-500 rounded-3xl">
              <div className="relative aspect-[4/3] overflow-hidden">
                <img
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  src={house.imageUrl || "https://images.unsplash.com/photo-1542718610-a1d656d1884c?q=80&w=600&auto=format&fit=crop"}
                  alt={house.name}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                {/* Price Tag Overlay */}
                <div className="absolute bottom-4 left-4 z-10 glass-dark px-4 py-2 rounded-2xl flex flex-col">
                  {isDiscountActive(house.discount) ? (
                    <>
                      <span className="text-[10px] text-white/60 line-through">${house.price}</span>
                      <span className="text-lg font-bold text-white">${house.discount!.price}<span className="text-xs font-normal opacity-70">/{t('night', 'хоног')}</span></span>
                    </>
                  ) : (
                    <span className="text-lg font-bold text-white">${house.price}<span className="text-xs font-normal opacity-70">/{t('night', 'хоног')}</span></span>
                  )}
                </div>

                {/* Number Badge */}
                <div className="absolute top-4 left-4 z-10 w-10 h-10 rounded-xl glass-dark flex items-center justify-center font-bold text-white">
                  #{house.houseNumber}
                </div>

                {isDiscountActive(house.discount) && (
                  <div className="absolute top-4 right-4 bg-red-600 text-white text-[10px] font-black tracking-tighter px-3 py-1.5 rounded-full shadow-lg z-10 animate-pulse">
                    {house.discount?.label || "OFFER"}
                  </div>
                )}
              </div>

              <div className="p-6 flex flex-col flex-1">
                <div className="mb-4">
                  <Link href={`/houses/${house.id}`}>
                    <h3 className="text-xl font-bold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors line-clamp-1 mb-2">
                      {house.localizedNames?.[currentLanguage] || house.name}
                    </h3>
                  </Link>
                  <p className="text-sm text-[var(--muted)] line-clamp-2 leading-relaxed">
                    {house.localizedDescriptions?.[currentLanguage] || house.description}
                  </p>
                </div>

                <div className="flex items-center gap-4 py-4 border-y border-[var(--border)] mb-6">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--muted)]">
                    <Users size={16} className="text-[var(--primary)]" />
                    {house.capacity} {t('guests', 'зочин')}
                  </div>
                  {house.amenities?.slice(0, 2).map((ami: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-1.5 text-xs font-medium text-[var(--muted)] capitalize">
                      <ChevronRight size={12} className="text-[var(--primary)]" />
                      {getAmenityName(ami.amenityId || ami)}
                    </div>
                  ))}
                </div>

                <Link
                  href={`/houses/${house.id}`}
                  className="mt-auto w-full group/btn relative flex items-center justify-center py-3.5 bg-gray-50 hover:bg-[var(--primary)] text-[var(--foreground)] hover:text-white rounded-2xl font-bold transition-all overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {t('view_details', 'Дэлгэрэнгүй үзэх')}
                    <ChevronRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                  </span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Map & Contact Section */}
      <section className="bg-gray-50 py-24 border-t border-[var(--border)] overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-sm font-bold text-[var(--primary)] uppercase tracking-widest mb-4">{t('location_header', 'Бид хаана байна вэ?')}</h2>
              <h3 className="text-3xl md:text-5xl font-bold text-[var(--foreground)] leading-tight mb-8">
                {t('location_title', 'Байгалийн сайханд, хотын шуугианаас хол')}
              </h3>

              <div className="space-y-6 mb-10">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white shadow-md flex items-center justify-center text-[var(--primary)] flex-shrink-0">
                    <MapPin size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-[var(--foreground)]">{t('address_label', 'Хаяг')}</h4>
                    <p className="text-[var(--muted)]">{settings?.contact?.address || "Төв аймаг, Эрдэнэ сум"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white shadow-md flex items-center justify-center text-[var(--primary)] flex-shrink-0">
                    <Phone size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-[var(--foreground)]">{t('phone_label', 'Утас')}</h4>
                    <p className="text-[var(--muted)] font-medium">{settings?.contact?.phone || "+976 9911-XXXX"}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${settings?.map?.lat || 47.9189},${settings?.map?.lng || 106.9176}`}
                  target="_blank"
                  className="px-8 py-4 bg-white hover:bg-gray-100 text-[var(--foreground)] rounded-2xl font-bold transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <MapPin size={20} className="text-[var(--primary)]" />
                  {t('get_directions', 'Зам заалгах')}
                </a>
              </div>
            </div>

            <div className="relative">
              <div className="aspect-square md:aspect-video lg:aspect-square rounded-[2rem] overflow-hidden shadow-2xl border-8 border-white">
                <iframe
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  style={{ border: 0, filter: 'grayscale(0.1) contrast(1.1)' }}
                  src={`https://maps.google.com/maps?q=${settings?.map?.lat || 47.8},${settings?.map?.lng || 107.5}&z=${settings?.map?.zoom || 12}&t=k&output=embed`}
                  allowFullScreen
                />
              </div>
              <div className="hidden md:block absolute -bottom-6 -right-6 w-32 h-32 bg-[var(--primary)] rounded-full animate-float opacity-20"></div>
              <div className="hidden md:block absolute -top-6 -left-6 w-16 h-16 bg-yellow-400 rounded-full animate-float opacity-30" style={{ animationDelay: '1s' }}></div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[var(--foreground)] text-white pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="md:col-span-2">
              <h2 className="text-3xl font-black tracking-tighter mb-6">{settings?.branding?.siteName || "Malchin Resort"}</h2>
              <p className="text-gray-400 max-w-sm mb-8 leading-relaxed">
                {t('footer_about', 'Монгол орны байгалийн үзэсгэлэнт газарт гэр бүлээрээ амарч, дурсамж бүтээх хамгийн тухтай орчныг бид бүрдүүлнэ.')}
              </p>
              <div className="flex gap-4">
                {settings?.social?.facebook && (
                  <a href={settings.social.facebook} className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-[var(--primary)] transition-colors">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" /></svg>
                  </a>
                )}
                {settings?.social?.instagram && (
                  <a href={settings.social.instagram} className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-[var(--primary)] transition-colors">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2c2.717 0 3.056.01 4.122.06 1.065.05 1.79.217 2.428.465.66.254 1.216.598 1.772 1.153a4.908 4.908 0 0 1 1.153 1.772c.247.637.415 1.363.465 2.428.047 1.066.06 1.405.06 4.122 0 2.717-.01 3.056-.06 4.122-.05 1.065-.218 1.79-.465 2.428a4.883 4.883 0 0 1-1.153 1.772 4.915 4.915 0 0 1-1.772 1.153c-.637.247-1.363.415-2.428.465-1.066.047-1.405.06-4.122.06-2.717 0-3.056-.01-4.122-.06-1.065-.05-1.79-.218-2.428-.465a4.89 4.89 0 0 1-1.772-1.153 4.904 4.904 0 0 1-1.153-1.772c-.248-.637-.415-1.363-.465-2.428C2.013 15.056 2 14.717 2 12c0-2.717.01-3.056.06-4.122.05-1.066.217-1.79.465-2.428a4.88 4.88 0 0 1 1.153-1.772A4.897 4.897 0 0 1 5.45 2.525c.638-.248 1.362-.415 2.428-.465C8.944 2.013 9.283 2 12 2zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm6.5-.25a1.25 1.25 0 1 0-2.5 0 1.25 1.25 0 0 0 2.5 0zM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z" /></svg>
                  </a>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-bold mb-6 uppercase text-xs tracking-widest text-[var(--primary)]">{t('quick_links', 'Холбоосууд')}</h4>
              <ul className="space-y-4 text-gray-400">
                <li><Link href="/restaurant" className="hover:text-white transition-colors">{t('restaurant', 'Ресторан')}</Link></li>
                <li><Link href="/login" className="hover:text-white transition-colors">{t('my_bookings', 'Миний захиалга')}</Link></li>
                <li><button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-white transition-colors">{t('back_to_top', 'Дээш очих')}</button></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-6 uppercase text-xs tracking-widest text-[var(--primary)]">{t('contact_info', 'Холбоо барих')}</h4>
              <ul className="space-y-4 text-gray-400">
                <li className="flex items-center gap-2">
                  <Mail size={16} className="text-[var(--primary)]" />
                  <span className="text-sm truncate">{settings?.contact?.email || "info@malchinresort.mn"}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Phone size={16} className="text-[var(--primary)]" />
                  <span className="text-sm">{settings?.contact?.phone || "+976 9911-XXXX"}</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-12 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} {settings?.branding?.siteName || "Malchin Resort"}. All rights reserved.
            </p>
            <div className="flex gap-8">
              <Link href="/admin/login" className="text-xs text-gray-600 hover:text-gray-400 transition-colors uppercase tracking-widest">{t('admin_login', 'Админ')}</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Modern styles injected for this page */}
      <style jsx global>{`
        @keyframes slow-zoom {
          from { transform: scale(1); }
          to { transform: scale(1.15); }
        }
        .animate-slow-zoom {
          animation: slow-zoom 30s linear infinite alternate;
        }
        @keyframes scroll-pill {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(200%); }
        }
        .animate-scroll-pill {
          animation: scroll-pill 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
