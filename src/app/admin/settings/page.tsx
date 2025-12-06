"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { db, storage } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { ResortSettings } from "@/types";
import { Save, MapPin, Phone, Mail, Map as MapIcon, Image as ImageIcon, Palette } from "lucide-react";

export default function SettingsPage() {
    const { isAdmin, loading: authLoading } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

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
        }
    });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const docRef = doc(db, "settings", "general");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data() as ResortSettings;
                    setSettings(prev => ({
                        ...prev,
                        ...data,
                        cover: { ...prev.cover, ...data.cover },
                        branding: { ...prev.branding, ...data.branding }
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

            const updatedSettings = {
                ...settings,
                cover: {
                    ...settings.cover,
                    imageUrl: coverImageUrl
                },
                branding: {
                    ...settings.branding,
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
                                    onChange={(e) => setSettings({ ...settings, branding: { ...settings.branding, siteName: e.target.value } })}
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
                                        onChange={(e) => setSettings({ ...settings, branding: { ...settings.branding, siteNameColor: e.target.value } })}
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
                                            src={logoFile ? URL.createObjectURL(logoFile) : settings.branding.logoUrl}
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
                                    onChange={(e) => setSettings({ ...settings, branding: { ...settings.branding, showLogo: e.target.checked } })}
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
                                    onChange={(e) => setSettings({ ...settings, branding: { ...settings.branding, showName: e.target.checked } })}
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
