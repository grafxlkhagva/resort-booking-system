"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { db, storage } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { ResortSettings } from "@/types";
import { Save, MapPin, Phone, Mail, Map as MapIcon, Image as ImageIcon, Palette, Calendar, CheckCircle, Send, MessageSquare, Info, ChevronDown, ChevronUp } from "lucide-react";

import AdminPhoneVerificationModal from "@/components/admin/AdminPhoneVerificationModal";

export default function SettingsPage() {
    const { isAdmin, loading: authLoading } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showPhoneVerify, setShowPhoneVerify] = useState(false);
    const [showTelegramGuide, setShowTelegramGuide] = useState(false);

    const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
    const [logoFile, setLogoFile] = useState<File | null>(null);

    const [settings, setSettings] = useState<ResortSettings>({
        map: {
            lat: 47.9188,
            lng: 106.9176,
            zoom: 12
        },
        contact: {
            phone: "",
            email: "",
            address: ""
        },
        cover: {
            imageUrl: "",
            title: "",
            subtitle: ""
        },
        branding: {
            siteName: "ResortBook",
            siteNameColor: "#4F46E5", // Indigo-600
            logoUrl: "",
            showLogo: false,
            showName: true
        },
        telegram: {
            botToken: "",
            chatId: "",
            isActive: false
        }
    });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const docRef = doc(db, "settings", "general");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data() as Partial<ResortSettings>;
                    setSettings(prev => ({
                        ...prev,
                        ...data,
                        map: { ...prev.map, ...data.map },
                        contact: { ...prev.contact, ...data.contact },
                        cover: {
                            imageUrl: data.cover?.imageUrl || prev.cover.imageUrl,
                            title: data.cover?.title || prev.cover.title,
                            subtitle: data.cover?.subtitle || prev.cover.subtitle
                        },
                        branding: {
                            siteName: data.branding?.siteName || prev.branding?.siteName || "ResortBook",
                            siteNameColor: data.branding?.siteNameColor || prev.branding?.siteNameColor || "#4F46E5",
                            logoUrl: data.branding?.logoUrl || prev.branding?.logoUrl || "",
                            showLogo: data.branding?.showLogo ?? prev.branding?.showLogo ?? false,
                            showName: data.branding?.showName ?? prev.branding?.showName ?? true,
                        },
                        social: {
                            facebook: data.social?.facebook || prev.social?.facebook || "",
                            instagram: data.social?.instagram || prev.social?.instagram || ""
                        },
                        telegram: {
                            botToken: data.telegram?.botToken || prev.telegram?.botToken || "",
                            chatId: data.telegram?.chatId || prev.telegram?.chatId || "",
                            isActive: data.telegram?.isActive ?? prev.telegram?.isActive ?? false
                        }
                    }));
                }
            } catch (error) {
                console.error("Error fetching settings:", error);
            } finally {
                setLoading(false);
            }
        };

        if (isAdmin) {
            fetchSettings();
        }
    }, [isAdmin]);

    const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setCoverImageFile(e.target.files[0]);
        }
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setLogoFile(e.target.files[0]);
        }
    };

    const defaultBranding: NonNullable<ResortSettings['branding']> = {
        siteName: "ResortBook",
        siteNameColor: "#4F46E5",
        logoUrl: "",
        showLogo: false,
        showName: true
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            let coverImageUrl = settings.cover.imageUrl;
            let logoUrl = settings.branding?.logoUrl || "";

            if (coverImageFile) {
                const storageRef = ref(storage, `settings/cover_${Date.now()}_${coverImageFile.name}`);
                await uploadBytes(storageRef, coverImageFile);
                coverImageUrl = await getDownloadURL(storageRef);
            }

            if (logoFile) {
                const storageRef = ref(storage, `settings/logo_${Date.now()}_${logoFile.name}`);
                await uploadBytes(storageRef, logoFile);
                logoUrl = await getDownloadURL(storageRef);
            }

            const currentBranding = settings.branding || defaultBranding;

            const updatedSettings: ResortSettings = {
                ...settings,
                cover: {
                    ...settings.cover,
                    imageUrl: coverImageUrl
                },
                branding: {
                    ...currentBranding,
                    logoUrl: logoUrl
                }
            };

            await setDoc(doc(db, "settings", "general"), updatedSettings);
            setSettings(updatedSettings);
            setCoverImageFile(null);
            setLogoFile(null);
            alert("Тохиргоо амжилттай хадгалагдлаа!");
            router.push("/admin");
        } catch (error) {
            console.error("Error saving settings:", error);
            alert("Тохиргоо хадгалахад алдаа гарлаа.");
        } finally {
            setSaving(false);
        }
    };

    if (authLoading || loading) return <div className="p-8 text-center">Loading...</div>;
    if (!isAdmin) return <div className="p-8 text-center">Access Denied</div>;

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Ерөнхий Тохиргоо</h1>

            <form onSubmit={handleSave} className="space-y-8">
                {/* Unified Booking Management Settings */}
                <div className="bg-white shadow rounded-lg p-6 border-l-4 border-indigo-500">
                    <div className="flex items-center mb-4">
                        <Calendar className="text-indigo-600 mr-2" />
                        <h2 className="text-xl font-semibold text-gray-900">Захиалгын Нэгдсэн Удирдлага</h2>
                    </div>
                    <div className="space-y-6">
                        {/* Booking Blocking Control */}
                        <div className="border-b border-gray-200 pb-6">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900">Захиалга Хаах</h3>
                                    <p className="text-sm text-gray-500">Тодорхой хугацаанд бүх захиалгыг зогсоох</p>
                                </div>
                                <div className="flex items-center">
                                    <input
                                        id="blockBookings"
                                        type="checkbox"
                                        className="h-6 w-6 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                        checked={settings.bookingControl?.isBlocked || false}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            bookingControl: { ...settings.bookingControl, isBlocked: e.target.checked }
                                        })}
                                    />
                                </div>
                            </div>

                            {settings.bookingControl?.isBlocked && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-md">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Эхлэх Огноо</label>
                                        <input
                                            type="date"
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                            value={settings.bookingControl?.blockStartDate ? new Date(settings.bookingControl.blockStartDate).toLocaleDateString('en-CA') : ""}
                                            onChange={(e) => {
                                                const date = e.target.value ? new Date(e.target.value) : undefined;
                                                if (date) date.setHours(0, 0, 0, 0);
                                                setSettings({
                                                    ...settings,
                                                    bookingControl: {
                                                        ...settings.bookingControl,
                                                        isBlocked: settings.bookingControl?.isBlocked || false,
                                                        blockStartDate: date?.getTime()
                                                    }
                                                });
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Дуусах Огноо</label>
                                        <input
                                            type="date"
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                            value={settings.bookingControl?.blockEndDate ? new Date(settings.bookingControl.blockEndDate).toLocaleDateString('en-CA') : ""}
                                            onChange={(e) => {
                                                const date = e.target.value ? new Date(e.target.value) : undefined;
                                                if (date) date.setHours(23, 59, 59, 999);
                                                setSettings({
                                                    ...settings,
                                                    bookingControl: {
                                                        ...settings.bookingControl,
                                                        isBlocked: settings.bookingControl?.isBlocked || false,
                                                        blockEndDate: date?.getTime()
                                                    }
                                                });
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Notification Phone Settings */}
                        <div>
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                <div className="flex-1">
                                    <h3 className="text-lg font-medium text-gray-900 mb-1">Мэдэгдэл Хүлээн Авах Утас</h3>
                                    <p className="text-sm text-gray-500 mb-2">
                                        Шинэ захиалга хийгдэх үед энэ дугаар луу SMS мэдэгдэл илгээнэ.
                                    </p>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="tel"
                                            placeholder="+976 99112233"
                                            className="block w-full max-w-xs rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                            value={settings.bookingControl?.notificationPhone || ""}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                bookingControl: {
                                                    ...settings.bookingControl,
                                                    isBlocked: settings.bookingControl?.isBlocked || false,
                                                    notificationPhone: e.target.value,
                                                    notificationPhoneVerified: false
                                                }
                                            })}
                                        />
                                        {/* Since verification logic requires more complex backend/OTP flow for a generic number (not logged in user), 
                                            we will treat saving as enough or assume manual verification for this demo version, 
                                            OR we could trigger a mock verification. 
                                            User requested "SMS-eer batalgaajuuldag bolgoyo". 
                                            We can add a button "Verify" that shows a modal (mock or real logic).
                                        */}
                                        <button
                                            type="button"
                                            onClick={() => setShowPhoneVerify(true)}
                                            className="px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                                        >
                                            Баталгаажуулах
                                        </button>
                                    </div>
                                    {settings.bookingControl?.notificationPhoneVerified && (
                                        <p className="mt-1 text-sm text-green-600 flex items-center">
                                            <CheckCircle className="w-4 h-4 mr-1" /> Баталгаажсан дугаар
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Phone Verification Modal */}
                {showPhoneVerify && (
                    <AdminPhoneVerificationModal
                        initialPhone={settings.bookingControl?.notificationPhone}
                        onClose={() => setShowPhoneVerify(false)}
                        onVerified={(phone) => {
                            setSettings({
                                ...settings,
                                bookingControl: {
                                    ...settings.bookingControl,
                                    isBlocked: settings.bookingControl?.isBlocked || false,
                                    notificationPhone: phone,
                                    notificationPhoneVerified: true
                                }
                            });
                            setShowPhoneVerify(false);
                        }}
                    />
                )}

                {/* Branding Settings */}
                <div className="bg-white shadow rounded-lg p-6">
                    <div className="flex items-center mb-4">
                        <Palette className="text-indigo-600 mr-2" />
                        <h2 className="text-xl font-semibold text-gray-900">Системийн Өнгө төрх (Branding)</h2>
                    </div>
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Системийн Нэр</label>
                                <input
                                    type="text"
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                    value={settings.branding?.siteName || ""}
                                    onChange={(e) => setSettings({ ...settings, branding: { ...(settings.branding || defaultBranding), siteName: e.target.value } })}
                                    placeholder="ResortBook"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Нэрний Өнгө</label>
                                <div className="mt-1 flex items-center space-x-3">
                                    <input
                                        type="color"
                                        className="h-10 w-20 p-1 rounded border border-gray-300"
                                        value={settings.branding?.siteNameColor || "#4F46E5"}
                                        onChange={(e) => setSettings({ ...settings, branding: { ...(settings.branding || defaultBranding), siteNameColor: e.target.value } })}
                                    />
                                    <span className="text-sm text-gray-500">{settings.branding?.siteNameColor}</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Лого</label>
                            <div className="mt-1 flex items-center space-x-4">
                                {(logoFile || settings.branding?.logoUrl) ? (
                                    <div className="relative w-16 h-16 border rounded overflow-hidden bg-gray-50 flex items-center justify-center">
                                        <img
                                            src={logoFile ? URL.createObjectURL(logoFile) : settings.branding?.logoUrl}
                                            alt="Logo Preview"
                                            className="max-w-full max-h-full object-contain"
                                        />
                                    </div>
                                ) : (
                                    <div className="h-16 w-16 border rounded bg-gray-100 flex items-center justify-center text-gray-400">
                                        No Logo
                                    </div>
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleLogoChange}
                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                />
                            </div>
                        </div>

                        <div className="flex space-x-8">
                            <div className="flex items-center">
                                <input
                                    id="showLogo"
                                    type="checkbox"
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                    checked={settings.branding?.showLogo || false}
                                    onChange={(e) => setSettings({ ...settings, branding: { ...(settings.branding || defaultBranding), showLogo: e.target.checked } })}
                                />
                                <label htmlFor="showLogo" className="ml-2 block text-sm text-gray-900">
                                    Лого харуулах
                                </label>
                            </div>
                            <div className="flex items-center">
                                <input
                                    id="showName"
                                    type="checkbox"
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                    checked={settings.branding?.showName !== false} // Default true
                                    onChange={(e) => setSettings({ ...settings, branding: { ...(settings.branding || defaultBranding), showName: e.target.checked } })}
                                />
                                <label htmlFor="showName" className="ml-2 block text-sm text-gray-900">
                                    Нэр харуулах
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Cover Image Settings */}
                <div className="bg-white shadow rounded-lg p-6">
                    <div className="flex items-center mb-4">
                        <ImageIcon className="text-indigo-600 mr-2" />
                        <h2 className="text-xl font-semibold text-gray-900">Нүүр Хуудасны Ковер</h2>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Ковер Зураг</label>
                            <div className="mt-1 flex items-center space-x-4">
                                <div className="relative w-full h-48 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50">
                                    {(coverImageFile || settings.cover?.imageUrl) ? (
                                        <img
                                            src={coverImageFile ? URL.createObjectURL(coverImageFile) : settings.cover.imageUrl}
                                            alt="Cover Preview"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="text-center">
                                            <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                                            <p className="mt-1 text-sm text-gray-500">Зураг сонгоогүй байна</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleCoverImageChange}
                                className="mt-2 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Гарчиг (Title)</label>
                                <input
                                    type="text"
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                    value={settings.cover?.title || ""}
                                    onChange={(e) => setSettings({ ...settings, cover: { ...settings.cover, title: e.target.value } })}
                                    placeholder="Танд тохирох төгс амралтыг олоорой"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Дэд Гарчиг (Subtitle)</label>
                                <input
                                    type="text"
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                    value={settings.cover?.subtitle || ""}
                                    onChange={(e) => setSettings({ ...settings, cover: { ...settings.cover, subtitle: e.target.value } })}
                                    placeholder="Манай гэр бүлд зориулсан 20 тусгай байшингаас сонголтоо хийж..."
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Map Settings */}
                <div className="bg-white shadow rounded-lg p-6">
                    <div className="flex items-center mb-4">
                        <MapIcon className="text-indigo-600 mr-2" />
                        <h2 className="text-xl font-semibold text-gray-900">Газрын Зураг (Google Maps)</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Latitude</label>
                            <input
                                type="number"
                                step="any"
                                required
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                value={settings.map.lat}
                                onChange={(e) => setSettings({ ...settings, map: { ...settings.map, lat: parseFloat(e.target.value) } })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Longitude</label>
                            <input
                                type="number"
                                step="any"
                                required
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                value={settings.map.lng}
                                onChange={(e) => setSettings({ ...settings, map: { ...settings.map, lng: parseFloat(e.target.value) } })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Zoom Level</label>
                            <input
                                type="number"
                                required
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                value={settings.map.zoom}
                                onChange={(e) => setSettings({ ...settings, map: { ...settings.map, zoom: parseInt(e.target.value) } })}
                            />
                        </div>
                    </div>
                    <div className="aspect-w-16 aspect-h-9 w-full h-64 rounded-lg overflow-hidden border border-gray-300 bg-gray-100">
                        <iframe
                            width="100%"
                            height="100%"
                            frameBorder="0"
                            style={{ border: 0 }}
                            src={`https://maps.google.com/maps?q=${settings.map.lat},${settings.map.lng}&z=${settings.map.zoom}&output=embed`}
                            allowFullScreen
                        ></iframe>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">
                        Дээрх координат болон zoom хэмжээгээр газрын зураг хэрэглэгчдэд харагдах болно.
                    </p>
                </div>

                {/* Contact Info Settings */}
                <div className="bg-white shadow rounded-lg p-6">
                    <div className="flex items-center mb-4">
                        <Phone className="text-indigo-600 mr-2" />
                        <h2 className="text-xl font-semibold text-gray-900">Холбоо Барих Мэдээлэл</h2>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Утасны Дугаар</label>
                            <input
                                type="text"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                value={settings.contact.phone}
                                onChange={(e) => setSettings({ ...settings, contact: { ...settings.contact, phone: e.target.value } })}
                                placeholder="+976 99112233"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Имэйл Хаяг</label>
                            <input
                                type="email"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                value={settings.contact.email}
                                onChange={(e) => setSettings({ ...settings, contact: { ...settings.contact, email: e.target.value } })}
                                placeholder="info@resort.mn"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Хаяг / Байршил</label>
                            <textarea
                                rows={3}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                value={settings.contact.address}
                                onChange={(e) => setSettings({ ...settings, contact: { ...settings.contact, address: e.target.value } })}
                                placeholder="Тэрэлж, Горхи, Улаанбаатар"
                            />
                        </div>
                    </div>
                </div>

                {/* Telegram Settings */}
                <div className="bg-white shadow rounded-lg p-6 border-l-4 border-blue-400">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                            <Send className="text-blue-500 mr-2" />
                            <h2 className="text-xl font-semibold text-gray-900">Telegram Мэдэгдэл</h2>
                        </div>
                        <div className="flex items-center">
                            <label className="mr-3 text-sm font-medium text-gray-700">Идэвхжүүлэх</label>
                            <input
                                type="checkbox"
                                className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                checked={settings.telegram?.isActive || false}
                                onChange={(e) => setSettings({
                                    ...settings,
                                    telegram: { ...(settings.telegram || { botToken: "", chatId: "", isActive: false }), isActive: e.target.checked }
                                })}
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Bot Token</label>
                                <input
                                    type="password"
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                                    value={settings.telegram?.botToken || ""}
                                    onChange={(e) => setSettings({
                                        ...settings,
                                        telegram: { ...(settings.telegram || { botToken: "", chatId: "", isActive: false }), botToken: e.target.value }
                                    })}
                                    placeholder="8553346222:AAHQ..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Admin Chat ID</label>
                                <input
                                    type="text"
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                                    value={settings.telegram?.chatId || ""}
                                    onChange={(e) => setSettings({
                                        ...settings,
                                        telegram: { ...(settings.telegram || { botToken: "", chatId: "", isActive: false }), chatId: e.target.value }
                                    })}
                                    placeholder="771829630"
                                />
                            </div>
                        </div>

                        {/* Telegram Guide Accordion */}
                        <div className="mt-4 border border-blue-100 rounded-md overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setShowTelegramGuide(!showTelegramGuide)}
                                className="w-full flex items-center justify-between p-3 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                            >
                                <div className="flex items-center text-sm font-semibold">
                                    <Info size={16} className="mr-2" />
                                    Telegram Бот хэрхэн тохируулах вэ?
                                </div>
                                {showTelegramGuide ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>

                            {showTelegramGuide && (
                                <div className="p-4 bg-white text-sm text-gray-600 space-y-3 border-t border-blue-100">
                                    <div className="flex items-start">
                                        <span className="bg-blue-100 text-blue-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2 mt-0.5 shrink-0">1</span>
                                        <p>Telegram-аас <b>@BotFather</b>-г хайж олоод <code>/newbot</code> гэж бичин шинэ бот үүсгэнэ.</p>
                                    </div>
                                    <div className="flex items-start">
                                        <span className="bg-blue-100 text-blue-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2 mt-0.5 shrink-0">2</span>
                                        <p>Бот үүссэний дараа өгөгдсөн <b>HTTP API Token</b>-г хуулж аваад дээрх "Bot Token" хэсэгт оруулна.</p>
                                    </div>
                                    <div className="flex items-start">
                                        <span className="bg-blue-100 text-blue-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2 mt-0.5 shrink-0">3</span>
                                        <p>Үүсгэсэн бот руугаа ороод <b>Start</b> товчийг дарна.</p>
                                    </div>
                                    <div className="flex items-start">
                                        <span className="bg-blue-100 text-blue-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2 mt-0.5 shrink-0">4</span>
                                        <p>Өөрийн <b>Chat ID</b>-г авахын тулд <b>@userinfobot</b>-той чатлаж өөрийн ID-г аваад "Admin Chat ID" хэсэгт оруулна.</p>
                                    </div>
                                    <p className="bg-yellow-50 p-2 rounded text-xs text-yellow-800 border border-yellow-100 mt-2">
                                        Мэдэгдэл хүлээн авахын тулд таны бот заавал <b>Active</b> байх ёстойг анхаарна уу.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Social Media Settings */}
                <div className="bg-white shadow rounded-lg p-6">
                    <div className="flex items-center mb-4">
                        <svg className="w-6 h-6 text-indigo-600 mr-2" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" />
                        </svg>
                        <h2 className="text-xl font-semibold text-gray-900">Сошиал Медиа Холбоосууд</h2>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Facebook</label>
                            <input
                                type="url"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                value={settings.social?.facebook || ""}
                                onChange={(e) => setSettings({ ...settings, social: { ...settings.social, facebook: e.target.value, instagram: settings.social?.instagram || "" } })}
                                placeholder="https://facebook.com/yourpage"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Instagram</label>
                            <input
                                type="url"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                value={settings.social?.instagram || ""}
                                onChange={(e) => setSettings({ ...settings, social: { ...settings.social, instagram: e.target.value, facebook: settings.social?.facebook || "" } })}
                                placeholder="https://instagram.com/yourpage"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                        <Save className="mr-2 -ml-1 h-5 w-5" />
                        {saving ? "Хадгалж байна..." : "Хадгалах"}
                    </button>
                </div>
            </form>
        </div>
    );
}
