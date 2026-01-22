"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { House } from "@/types";
import Link from "next/link";
import { useAmenities } from "@/hooks/useAmenities";
import { Users, Wifi, Wind, MapPin, Phone, Mail } from "lucide-react";
import { isDiscountActive, formatValidDays } from "@/lib/utils";

export default function Home() {
  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);
  const { amenities } = useAmenities();

  const [settings, setSettings] = useState<any>(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const fetchHouses = async () => {
      try {
        const housesCollection = collection(db, "accommodations");
        const houseSnapshot = await getDocs(housesCollection);
        const houseList = houseSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name,
            houseNumber: data.houseNumber || 0,
            description: data.description,
            longDescription: data.longDescription,
            price: data.pricePerNight || 0,
            capacity: data.capacity || 4,
            imageUrl: data.featuredImage || "",
            images: data.images || [],
            amenities: data.amenities || [],
            createdAt: data.createdAt?.seconds ? data.createdAt.seconds * 1000 : Date.now(),
            discount: data.discount || undefined,
          } as House;
        });
        setHouses(houseList);
      } catch (error) {
        console.error("Error fetching houses:", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchSettings = async () => {
      try {
        const docRef = doc(db, "settings", "general");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log("Fetched settings:", data);
          setSettings(data);
          // Reset error state when new settings are loaded
          setImageError(false);
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      }
    };

    fetchHouses();
    fetchSettings();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto content-padding">
      <div className="relative rounded-2xl overflow-hidden mb-8 sm:mb-12 text-center text-white min-h-[280px] sm:min-h-[360px] lg:min-h-[420px] flex flex-col justify-center items-center bg-slate-900">
        {settings?.cover?.imageUrl && !imageError ? (
          <>
            <div className="absolute inset-0">
              <img
                src={settings.cover.imageUrl}
                alt="Cover"
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.error("Error loading cover image, switching to fallback");
                  setImageError(true);
                }}
                onLoad={() => console.log("Cover image loaded successfully")}
              />
              {/* Overlay with explicit RGBA to ensure transparency */}
              <div
                className="absolute inset-0"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
              ></div>
            </div>
            <div className="relative z-10 px-4 sm:px-6">
              <h1 className="text-2xl font-extrabold sm:text-4xl sm:tracking-tight lg:text-5xl mb-3 sm:mb-4">
                {settings.cover.title || "Танд тохирох төгс амралтыг олоорой"}
              </h1>
              <p className="max-w-xl mx-auto text-base sm:text-lg lg:text-xl text-slate-200">
                {settings.cover.subtitle || "Манай гэр бүлд зориулсан 20 тусгай байшингаас сонголтоо хийж, дараагийн амралтаа төлөвлөөрэй."}
              </p>
            </div>
          </>
        ) : (
          <div className="w-full h-full absolute inset-0 bg-gradient-to-br from-indigo-600 to-indigo-800 flex flex-col justify-center items-center px-4">
            <h1 className="text-2xl font-extrabold sm:text-4xl sm:tracking-tight lg:text-5xl text-white">
              Танд тохирох төгс амралтыг олоорой
            </h1>
            <p className="mt-4 sm:mt-5 max-w-xl mx-auto text-base sm:text-lg lg:text-xl text-indigo-100">
              Манай гэр бүлд зориулсан 20 тусгай байшингаас сонголтоо хийж, дараагийн амралтаа төлөвлөөрэй.
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
        {houses.map((house) => (
          <div key={house.id} className="card flex flex-col overflow-hidden hover:shadow-[var(--shadow-lg)] transition-shadow duration-300">
            <div className="flex-shrink-0 relative aspect-[4/3] overflow-hidden">
              <img className="w-full h-full object-cover" src={house.imageUrl} alt={house.name} />
              {isDiscountActive(house.discount) && (
                <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow z-10">
                  {house.discount?.label || "ХЯМДРАЛ"}
                  {house.discount?.validDays && house.discount.validDays.length > 0 && (
                    <span className="block text-[10px] font-normal opacity-90">
                      {formatValidDays(house.discount.validDays)}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="flex-1 p-4 sm:p-5 flex flex-col gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <p className="text-xs font-medium text-[var(--primary)] uppercase tracking-wide">
                    Амралтын Байр
                  </p>
                  <div className="text-right flex-shrink-0">
                    {isDiscountActive(house.discount) ? (
                      <>
                        <p className="text-xs text-[var(--muted)] line-through">${house.price}</p>
                        <p className="text-lg font-bold text-red-600">
                          ${house.discount!.price}
                          <span className="text-sm font-normal text-[var(--muted)]">/хоног</span>
                        </p>
                      </>
                    ) : (
                      <p className="text-lg font-bold text-[var(--foreground)]">
                        ${house.price}
                        <span className="text-sm font-normal text-[var(--muted)]">/хоног</span>
                      </p>
                    )}
                  </div>
                </div>
                <Link href={`/houses/${house.id}`} className="block mt-1">
                  <p className="text-lg font-semibold text-[var(--foreground)] hover:text-[var(--primary)] transition-colors">
                    <span className="text-[var(--primary)]">#{house.houseNumber}</span> {house.name}
                  </p>
                  <p className="mt-2 text-sm text-[var(--muted)] line-clamp-2">{house.description}</p>
                </Link>
              </div>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center text-[var(--muted)] text-sm">
                  <Users size={16} className="mr-1.5" />
                  {house.capacity} хүн
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {house.amenities.slice(0, 3).map((item: any) => {
                    const amenityId = typeof item === 'string' ? item : item.amenityId;
                    const quantity = typeof item === 'string' ? 1 : item.quantity;
                    const amenity = amenities.find(a => a.id === amenityId);
                    return amenity ? (
                      <span key={amenityId} title={amenity.name} className="inline-flex items-center bg-[var(--background)] px-2 py-0.5 rounded-full text-xs text-[var(--muted)]">
                        {amenity.imageUrl && amenity.imageUrl.startsWith('http') ? (
                          <img src={amenity.imageUrl} alt="" className="w-3.5 h-3.5 mr-1 object-cover rounded-full" />
                        ) : null}
                        {quantity > 1 && <span className="font-semibold mr-0.5">{quantity}×</span>}
                        {amenity.name}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
              <Link
                href={`/houses/${house.id}`}
                className="btn-primary w-full flex items-center justify-center text-sm"
              >
                Дэлгэрэнгүй
              </Link>
            </div>
          </div>
        ))}
      </div>

      {houses.length === 0 && (
        <div className="card text-center py-12 px-4">
          <p className="text-[var(--muted)]">Одоогоор боломжтой байшин алга байна.</p>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Дараа дахин шалгана уу.</p>
        </div>
      )}

      <MapSection settings={settings} />
    </div>
  );
}

function MapSection({ settings }: { settings: any }) {
  if (!settings) return null;

  return (
    <section className="mt-12 sm:mt-16 lg:mt-20">
      {settings?.map && (
        <>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--foreground)] mb-6 sm:mb-8 text-center">Бидний Байршил</h2>
          <div className="card relative overflow-hidden h-[320px] sm:h-[400px] lg:h-[480px]">
            <div className="absolute inset-0">
              <iframe
                width="100%"
                height="100%"
                frameBorder="0"
                style={{ border: 0 }}
                src={`https://maps.google.com/maps?q=${settings.map.lat},${settings.map.lng}&z=${settings.map.zoom}&t=k&output=embed`}
                allowFullScreen
                title="Байршил"
              />
            </div>
            <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-72 lg:w-80 card p-4 sm:p-5">
              <h3 className="font-semibold text-[var(--foreground)] mb-3">Холбоо барих</h3>
              <div className="space-y-2.5 text-sm text-[var(--muted)]">
                {settings.contact?.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="text-[var(--primary)] mt-0.5 flex-shrink-0" size={18} />
                    <span>{settings.contact.address}</span>
                  </div>
                )}
                {settings.contact?.phone && (
                  <a href={`tel:${settings.contact.phone}`} className="flex items-center gap-2 hover:text-[var(--primary)] font-medium">
                    <Phone size={18} className="text-[var(--primary)] flex-shrink-0" />
                    {settings.contact.phone}
                  </a>
                )}
                {settings.contact?.email && (
                  <a href={`mailto:${settings.contact.email}`} className="flex items-center gap-2 hover:text-[var(--primary)]">
                    <Mail size={18} className="text-[var(--primary)] flex-shrink-0" />
                    {settings.contact.email}
                  </a>
                )}
              </div>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${settings.map.lat},${settings.map.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary mt-4 w-full flex items-center justify-center text-sm"
              >
                Зам заалгах
              </a>
            </div>
          </div>
        </>
      )}

      <footer className="mt-12 sm:mt-16 border-t border-[var(--border)] pt-10 pb-10 safe-bottom">
        <div className="max-w-2xl mx-auto text-center">
          {(settings?.social?.facebook || settings?.social?.instagram) && (
            <div className="flex justify-center gap-6 mb-6">
              {settings.social.facebook && (
                <a href={settings.social.facebook} target="_blank" rel="noopener noreferrer" className="text-[var(--muted)] hover:text-[var(--primary)] transition-colors touch-target flex items-center justify-center" aria-label="Facebook">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" /></svg>
                </a>
              )}
              {settings.social.instagram && (
                <a href={settings.social.instagram} target="_blank" rel="noopener noreferrer" className="text-[var(--muted)] hover:text-[var(--primary)] transition-colors touch-target flex items-center justify-center" aria-label="Instagram">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2c2.717 0 3.056.01 4.122.06 1.065.05 1.79.217 2.428.465.66.254 1.216.598 1.772 1.153a4.908 4.908 0 0 1 1.153 1.772c.247.637.415 1.363.465 2.428.047 1.066.06 1.405.06 4.122 0 2.717-.01 3.056-.06 4.122-.05 1.065-.218 1.79-.465 2.428a4.883 4.883 0 0 1-1.153 1.772 4.915 4.915 0 0 1-1.772 1.153c-.637.247-1.363.415-2.428.465-1.066.047-1.405.06-4.122.06-2.717 0-3.056-.01-4.122-.06-1.065-.05-1.79-.218-2.428-.465a4.89 4.89 0 0 1-1.772-1.153 4.904 4.904 0 0 1-1.153-1.772c-.248-.637-.415-1.363-.465-2.428C2.013 15.056 2 14.717 2 12c0-2.717.01-3.056.06-4.122.05-1.066.217-1.79.465-2.428a4.88 4.88 0 0 1 1.153-1.772A4.897 4.897 0 0 1 5.45 2.525c.638-.248 1.362-.415 2.428-.465C8.944 2.013 9.283 2 12 2zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm6.5-.25a1.25 1.25 0 1 0-2.5 0 1.25 1.25 0 0 0 2.5 0zM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z" /></svg>
                </a>
              )}
            </div>
          )}
          <p className="text-sm text-[var(--muted)]">
            © {new Date().getFullYear()} {settings?.branding?.siteName || "ResortBook"}. Бүх эрх хуулиар хамгаалагдсан.
          </p>
          <a href="/admin/login" className="inline-block mt-2 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
            Админ нэвтрэх
          </a>
        </div>
      </footer>
    </section>
  );
}
