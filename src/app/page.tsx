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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="relative rounded-2xl overflow-hidden mb-12 text-center text-white min-h-[400px] flex flex-col justify-center items-center bg-gray-900">
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
            <div className="relative z-10 px-4">
              <h1 className="text-4xl font-extrabold sm:text-5xl sm:tracking-tight lg:text-6xl mb-4">
                {settings.cover.title || "Танд тохирох төгс амралтыг олоорой"}
              </h1>
              <p className="max-w-xl mx-auto text-xl text-gray-200">
                {settings.cover.subtitle || "Манай гэр бүлд зориулсан 20 тусгай байшингаас сонголтоо хийж, дараагийн амралтаа төлөвлөөрэй."}
              </p>
            </div>
          </>
        ) : (
          <div className="w-full h-full absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 flex flex-col justify-center items-center px-4">
            <h1 className="text-4xl font-extrabold sm:text-5xl sm:tracking-tight lg:text-6xl text-white">
              Танд тохирох төгс амралтыг олоорой
            </h1>
            <p className="mt-5 max-w-xl mx-auto text-xl text-indigo-100">
              Манай гэр бүлд зориулсан 20 тусгай байшингаас сонголтоо хийж, дараагийн амралтаа төлөвлөөрэй.
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {houses.map((house) => (
          <div key={house.id} className="flex flex-col rounded-lg shadow-lg overflow-hidden bg-white hover:shadow-xl transition-shadow duration-300">
            <div className="flex-shrink-0 relative">
              <img className="h-48 w-full object-cover" src={house.imageUrl} alt={house.name} />
              {isDiscountActive(house.discount) && (
                <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded shadow-md z-10">
                  {house.discount?.label || "ХЯМДРАЛ"}
                  {house.discount?.validDays && house.discount.validDays.length > 0 && (
                    <span className="block text-[10px] font-normal opacity-90">
                      {formatValidDays(house.discount.validDays)}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="flex-1 bg-white p-6 flex flex-col justify-between">
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium text-indigo-600">
                    Амралтын Байр
                  </p>
                  <div className="text-right">
                    {isDiscountActive(house.discount) ? (
                      <>
                        <p className="text-sm text-gray-400 line-through decoration-red-500 decoration-2">
                          ${house.price}
                        </p>
                        <p className="text-lg font-bold text-red-600">
                          ${house.discount!.price}
                          <span className="text-sm font-normal text-gray-500">/хоног</span>
                        </p>
                      </>
                    ) : (
                      <p className="text-lg font-bold text-gray-900">
                        ${house.price}
                        <span className="text-sm font-normal text-gray-500">/хоног</span>
                      </p>
                    )}
                  </div>
                </div>
                <Link href={`/houses/${house.id}`} className="block mt-2">
                  <p className="text-xl font-semibold text-gray-900 hover:text-indigo-600 transition-colors">
                    <span className="mr-2 text-indigo-600">#{house.houseNumber}</span>
                    {house.name}
                  </p>
                  <p className="mt-3 text-base text-gray-500 line-clamp-3">{house.description}</p>
                </Link>
              </div>
              <div className="mt-6 flex items-center justify-between">
                <div className="flex items-center text-gray-500 text-sm">
                  <Users size={18} className="mr-1" />
                  {house.capacity} Хүн
                </div>
                <div className="flex space-x-2 text-gray-400">
                  {house.amenities.slice(0, 3).map((item: any) => {
                    // Handle both string ID (legacy) and object (new)
                    const amenityId = typeof item === 'string' ? item : item.amenityId;
                    const quantity = typeof item === 'string' ? 1 : item.quantity;
                    const amenity = amenities.find(a => a.id === amenityId);

                    return amenity ? (
                      <span key={amenityId} title={amenity.name} className="flex items-center bg-gray-100 px-2 py-1 rounded-full text-xs text-gray-600">
                        {amenity.imageUrl && amenity.imageUrl.startsWith('http') ? (
                          <img src={amenity.imageUrl} alt={amenity.name} className="w-4 h-4 mr-1 object-cover rounded-full" />
                        ) : null}
                        {quantity > 1 && <span className="font-bold mr-1">{quantity}x</span>}
                        {amenity.name}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
              <div className="mt-6">
                <Link
                  href={`/houses/${house.id}`}
                  className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Дэлгэрэнгүй
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {houses.length === 0 && (
        <div className="text-center text-gray-500 mt-10">
          Одоогоор боломжтой байшин алга байна. Та дараа дахин шалгана уу.
        </div>
      )}

      <MapSection />
    </div>
  );
}

function MapSection() {
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, "settings", "general");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings(docSnap.data());
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      }
    };
    fetchSettings();
  }, []);

  if (!settings) return null;

  return (
    <div className="mt-20">
      <h2 className="text-3xl font-extrabold text-gray-900 mb-8 text-center">Бидний Байршил</h2>
      <div className="relative bg-white rounded-xl shadow-lg overflow-hidden h-[500px]">
        <div className="absolute inset-0">
          <iframe
            width="100%"
            height="100%"
            frameBorder="0"
            style={{ border: 0 }}
            src={`https://maps.google.com/maps?q=${settings.map.lat},${settings.map.lng}&z=${settings.map.zoom}&t=k&output=embed`}
            allowFullScreen
          ></iframe>
        </div>

        <div className="absolute top-4 right-4 md:top-8 md:right-8 w-80 bg-white/90 backdrop-blur-md p-6 rounded-lg shadow-xl border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Холбоо Барих</h3>
          <div className="space-y-4">
            {settings.contact.address && (
              <div className="flex items-start">
                <MapPin className="text-indigo-600 mt-1 mr-3 flex-shrink-0" size={20} />
                <p className="text-gray-600 text-sm">{settings.contact.address}</p>
              </div>
            )}
            {settings.contact.phone && (
              <div className="flex items-center">
                <Phone className="text-indigo-600 mr-3 flex-shrink-0" size={20} />
                <a href={`tel:${settings.contact.phone}`} className="text-gray-600 text-sm hover:text-indigo-600 font-medium">
                  {settings.contact.phone}
                </a>
              </div>
            )}
            {settings.contact.email && (
              <div className="flex items-center">
                <Mail className="text-indigo-600 mr-3 flex-shrink-0" size={20} />
                <a href={`mailto:${settings.contact.email}`} className="text-gray-600 text-sm hover:text-indigo-600">
                  {settings.contact.email}
                </a>
              </div>
            )}
          </div>
          <div className="mt-6 pt-6 border-t border-gray-200">
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${settings.map.lat},${settings.map.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Зам заалгах
            </a>
          </div>
        </div>
      </div>

      {/* Footer with Admin Login Link */}
      <footer className="mt-20 border-t border-gray-200 pt-8 pb-12">
        <div className="text-center">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} ResortBook. Бүх эрх хуулиар хамгаалагдсан.
          </p>
          <div className="mt-4">
            <a
              href="/admin/login"
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Админ нэвтрэх
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
