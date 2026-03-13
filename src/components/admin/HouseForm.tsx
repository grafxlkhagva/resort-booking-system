"use client";

import { useState } from "react";
import { House, HouseAmenity } from "@/types";
import { useAmenities } from "@/hooks/useAmenities";
import { getDiscountStatus } from "@/lib/utils";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { X, Upload, Image as ImageIcon, Globe, ChevronDown, ChevronUp } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Language } from "@/types";
import { useEffect } from "react";
import { translateText } from "@/actions/translate";
import { Bot, Loader2 } from "lucide-react";

interface HouseFormProps {
    initialData?: House | null;
    onSubmit: (data: Omit<House, "id" | "createdAt">) => Promise<void>;
    onCancel: () => void;
}

export default function HouseForm({ initialData, onSubmit, onCancel }: HouseFormProps) {
    const { amenities } = useAmenities();
    const { t } = useLanguage();
    const [activeLangs, setActiveLangs] = useState<Language[]>([]);
    const [expandedLang, setExpandedLang] = useState<string | null>(null);

    useEffect(() => {
        const fetchLangs = async () => {
            const q = query(collection(db, "languages"), where("isActive", "==", true));
            const snap = await getDocs(q);
            const langs = snap.docs.map(doc => doc.data() as Language);
            setActiveLangs(langs.filter(l => l.id !== 'mn')); // Only show other languages for manual translation
        };
        fetchLangs();
    }, []);
    const [formData, setFormData] = useState({
        name: initialData?.name || "",
        houseNumber: initialData?.houseNumber || 0,
        description: initialData?.description || "",
        longDescription: initialData?.longDescription || "",
        price: initialData?.price || 0,
        capacity: initialData?.capacity || 1,
        imageUrl: initialData?.imageUrl || "",
        amenities: initialData?.amenities || [],
        images: initialData?.images || [],
        discount: initialData?.discount || {
            price: 0,
            startDate: undefined,
            endDate: undefined,
            validDays: [],
            label: "",
            isActive: false
        },
        localizedNames: initialData?.localizedNames || {} as Record<string, string>,
        localizedDescriptions: initialData?.localizedDescriptions || {} as Record<string, string>,
        localizedLongDescriptions: initialData?.localizedLongDescriptions || {} as Record<string, string>,
    });

    const [featuredFile, setFeaturedFile] = useState<File | null>(null);
    const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
    const [loading, setLoading] = useState(false);
    const [translatingLang, setTranslatingLang] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState("");

    // Preview for featured image
    const featuredPreview = featuredFile ? URL.createObjectURL(featuredFile) : formData.imageUrl;

    const handleFeaturedFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFeaturedFile(e.target.files[0]);
        }
    };

    const handleGalleryFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setGalleryFiles(prev => [...prev, ...Array.from(e.target.files!)]);
        }
    };

    const removeGalleryFile = (index: number) => {
        setGalleryFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleAutoTranslate = async (langId: string) => {
        if (!formData.name && !formData.description && !formData.longDescription) {
            alert("Эхлээд Монгол хэл дээрх мэдээллээ оруулна уу.");
            return;
        }

        setTranslatingLang(langId);
        try {
            const [nameTrans, descTrans, longDescTrans] = await Promise.all([
                formData.name ? translateText(formData.name, langId) : Promise.resolve(null),
                formData.description ? translateText(formData.description, langId) : Promise.resolve(null),
                formData.longDescription ? translateText(formData.longDescription, langId) : Promise.resolve(null)
            ]);

            setFormData(prev => ({
                ...prev,
                localizedNames: {
                    ...prev.localizedNames,
                    ...(nameTrans ? { [langId]: nameTrans } : {})
                },
                localizedDescriptions: {
                    ...prev.localizedDescriptions,
                    ...(descTrans ? { [langId]: descTrans } : {})
                },
                localizedLongDescriptions: {
                    ...prev.localizedLongDescriptions,
                    ...(longDescTrans ? { [langId]: longDescTrans } : {})
                },
            }));
        } catch (error: any) {
            console.error("Translation error:", error);
            alert(error.message || "Орчуулахад алдаа гарлаа.");
        } finally {
            setTranslatingLang(null);
        }
    };

    const removeExistingGalleryImage = (urlToRemove: string) => {
        setFormData(prev => ({
            ...prev,
            images: prev.images.filter(url => url !== urlToRemove)
        }));
    };

    const uploadImage = async (file: File, path: string) => {
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file);
        return getDownloadURL(storageRef);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setUploadProgress(t('admin_uploading_images', "Зургуудыг хуулж байна..."));

        try {
            let featuredImageUrl = formData.imageUrl;
            if (featuredFile) {
                const path = `accommodations/${Date.now()}_featured_${featuredFile.name}`;
                featuredImageUrl = await uploadImage(featuredFile, path);
            }

            const newGalleryUrls = [];
            for (const file of galleryFiles) {
                const path = `accommodations/${Date.now()}_gallery_${file.name}`;
                const url = await uploadImage(file, path);
                newGalleryUrls.push(url);
            }

            const finalData = {
                ...formData,
                imageUrl: featuredImageUrl,
                images: [...formData.images, ...newGalleryUrls],
                amenities: formData.amenities,
            };

            setUploadProgress(t('admin_saving', "Мэдээллийг хадгалж байна..."));
            await onSubmit(finalData);
        } catch (error) {
            console.error("Error submitting form:", error);
            alert("Failed to save house: " + (error as Error).message);
        } finally {
            setLoading(false);
            setUploadProgress("");
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900">
                {initialData ? t('admin_edit_house', "Байшин засах") : t('admin_add_house', "Шинэ байшин нэмэх")}
            </h3>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700">{t('admin_house_name', 'Нэр')}</label>
                    <input
                        type="text"
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                </div>

                <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700">{t('admin_house_number', 'Байшингийн Дугаар')}</label>
                    <input
                        type="number"
                        required
                        min="1"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                        value={formData.houseNumber}
                        onChange={(e) => setFormData({ ...formData, houseNumber: Number(e.target.value) })}
                    />
                </div>

                <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700">{t('admin_description', 'Тайлбар')}</label>
                    <textarea
                        required
                        rows={3}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                </div>

                <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700">{t('admin_long_description', 'Дэлгэрэнгүй Тайлбар')}</label>
                    <textarea
                        rows={5}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                        value={formData.longDescription || ""}
                        onChange={(e) => setFormData({ ...formData, longDescription: e.target.value })}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">{t('admin_price', 'Үнэ (хоногоор)')}</label>
                    <input
                        type="number"
                        required
                        min="0"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">{t('admin_capacity', 'Багтаамж (хүн)')}</label>
                    <input
                        type="number"
                        required
                        min="1"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                        value={formData.capacity}
                        onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                    />
                </div>

                <div className="col-span-2 bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center space-x-2">
                            <h4 className="text-md font-medium text-indigo-900">{t('admin_discount_pricing', 'Хямдрал / Урамшуулал (Discount)')}</h4>
                            {(() => {
                                const status = getDiscountStatus(formData.discount);
                                let colorClass = "bg-gray-100 text-gray-800";
                                if (status.status === "active") colorClass = "bg-green-100 text-green-800";
                                if (status.status === "scheduled") colorClass = "bg-yellow-100 text-yellow-800";
                                if (status.status === "expired") colorClass = "bg-red-100 text-red-800";
                                if (status.status === "disabled") colorClass = "bg-gray-100 text-gray-800";

                                if (status.status !== "none") {
                                    return (
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}>
                                            {status.label}
                                        </span>
                                    );
                                }
                                return null;
                            })()}
                        </div>
                        <div className="flex items-center">
                            <input
                                id="discountActive"
                                type="checkbox"
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                checked={formData.discount?.isActive || false}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    discount: { ...formData.discount, isActive: e.target.checked }
                                })}
                            />
                            <label htmlFor="discountActive" className="ml-2 block text-sm text-gray-900 font-medium">
                                {t('admin_discount_active', 'Идэвхжүүлэх')}
                            </label>
                        </div>
                    </div>

                    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${!formData.discount?.isActive ? 'opacity-50 pointer-events-none' : ''}`}>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">{t('admin_discount_price', 'Хямдарсан Үнэ')}</label>
                            <input
                                type="number"
                                min="0"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                value={formData.discount?.price || ""}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    discount: { ...formData.discount, price: Number(e.target.value) }
                                })}
                                placeholder="Хоосон орхивол хямдралгүй"
                            />
                            <p className="text-xs text-gray-500 mt-1">Үндсэн үнээс бага байх ёстой.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">{t('admin_discount_label', 'Тайлбар (Label)')}</label>
                            <input
                                type="text"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                value={formData.discount?.label || ""}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    discount: { ...formData.discount, label: e.target.value }
                                })}
                                placeholder="Жишээ: Өвлийн хямдрал"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">{t('admin_start_date', 'Эхлэх Огноо')}</label>
                            <input
                                type="date"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                value={formData.discount?.startDate ? new Date(formData.discount.startDate).toLocaleDateString('en-CA') : ""}
                                onChange={(e) => {
                                    if (!e.target.value) {
                                        setFormData({ ...formData, discount: { ...formData.discount, startDate: undefined } });
                                        return;
                                    }
                                    // Set to 00:00:00 local time
                                    const [y, m, d] = e.target.value.split('-').map(Number);
                                    const date = new Date(y, m - 1, d);
                                    date.setHours(0, 0, 0, 0);
                                    setFormData({
                                        ...formData,
                                        discount: { ...formData.discount, startDate: date.getTime() }
                                    });
                                }}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">{t('admin_end_date', 'Дуусах Огноо')}</label>
                            <input
                                type="date"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                value={formData.discount?.endDate ? new Date(formData.discount.endDate).toLocaleDateString('en-CA') : ""}
                                onChange={(e) => {
                                    if (!e.target.value) {
                                        setFormData({ ...formData, discount: { ...formData.discount, endDate: undefined } });
                                        return;
                                    }
                                    // Set to 23:59:59 local time
                                    const [y, m, d] = e.target.value.split('-').map(Number);
                                    const date = new Date(y, m - 1, d);
                                    date.setHours(23, 59, 59, 999);
                                    setFormData({
                                        ...formData,
                                        discount: { ...formData.discount, endDate: date.getTime() }
                                    });
                                }}
                            />
                        </div>
                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin_valid_days', 'Хямдралтай өдрүүд')}</label>
                            <div className="flex flex-wrap gap-2">
                                {['Ням', 'Дав', 'Мяг', 'Лха', 'Пүр', 'Баа', 'Бям'].map((dayName, index) => {
                                    const isSelected = formData.discount?.validDays?.includes(index);
                                    return (
                                        <button
                                            key={index}
                                            type="button"
                                            onClick={() => {
                                                const currentDays = formData.discount?.validDays || [];
                                                let newDays;
                                                if (currentDays.includes(index)) {
                                                    newDays = currentDays.filter(d => d !== index);
                                                } else {
                                                    newDays = [...currentDays, index];
                                                }
                                                // If all days are selected or none, we can treat it as "all days" (undefined or empty)
                                                // But for explicit control, let's just save what is selected.
                                                setFormData({
                                                    ...formData,
                                                    discount: { ...formData.discount, validDays: newDays }
                                                });
                                            }}
                                            className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${isSelected
                                                ? 'bg-indigo-600 text-white border-indigo-600'
                                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                                }`}
                                        >
                                            {dayName}
                                        </button>
                                    );
                                })}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Сонгоогүй тохиолдолд бүх өдөр хямдралтай.</p>
                        </div>
                    </div>
                </div>

                {/* Featured Image Upload */}
                <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin_featured_image', 'Үндсэн Зураг')}</label>
                    <div className="flex items-center space-x-4">
                        <div className="relative w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50">
                            {featuredPreview ? (
                                <img src={featuredPreview} alt="Featured" className="w-full h-full object-cover" />
                            ) : (
                                <ImageIcon className="text-gray-400" size={32} />
                            )}
                        </div>
                        <div className="flex-1">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFeaturedFileChange}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                            />
                            <p className="mt-1 text-xs text-gray-500">PNG, JPG, GIF (max 5MB)</p>
                        </div>
                    </div>
                </div>

                {/* Gallery Images Upload */}
                <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin_gallery_images', 'Зургийн Цомог')}</label>
                    <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleGalleryFilesChange}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 mb-4"
                    />

                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                        {/* Existing Images */}
                        {formData.images.map((url, index) => (
                            <div key={`existing-${index}`} className={`relative group aspect-square rounded-lg overflow-hidden border-2 ${formData.imageUrl === url ? 'border-indigo-600' : 'border-gray-200'}`}>
                                <img src={url} alt={`Gallery ${index}`} className="w-full h-full object-cover" />
                                <button
                                    type="button"
                                    onClick={() => removeExistingGalleryImage(url)}
                                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Устгах"
                                >
                                    <X size={14} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFormData(prev => ({ ...prev, imageUrl: url }));
                                        setFeaturedFile(null);
                                    }}
                                    className={`absolute bottom-1 right-1 p-1 rounded-full transition-opacity ${formData.imageUrl === url ? 'bg-indigo-600 text-white opacity-100' : 'bg-white text-gray-600 opacity-0 group-hover:opacity-100'}`}
                                    title="Үндсэн зураг болгох"
                                >
                                    <ImageIcon size={14} />
                                </button>
                                {formData.imageUrl === url && (
                                    <div className="absolute top-0 left-0 bg-indigo-600 text-white text-xs px-2 py-1">
                                        Үндсэн
                                    </div>
                                )}
                            </div>
                        ))}
                        {/* New Files */}
                        {galleryFiles.map((file, index) => {
                            const isFeatured = featuredFile === file;
                            return (
                                <div key={`new-${index}`} className={`relative group aspect-square rounded-lg overflow-hidden border-2 ${isFeatured ? 'border-indigo-600' : 'border-gray-200'}`}>
                                    <img src={URL.createObjectURL(file)} alt={`New ${index}`} className="w-full h-full object-cover opacity-80" />
                                    <button
                                        type="button"
                                        onClick={() => removeGalleryFile(index)}
                                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Устгах"
                                    >
                                        <X size={14} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFeaturedFile(file)}
                                        className={`absolute bottom-1 right-1 p-1 rounded-full transition-opacity ${isFeatured ? 'bg-indigo-600 text-white opacity-100' : 'bg-white text-gray-600 opacity-0 group-hover:opacity-100'}`}
                                        title="Үндсэн зураг болгох"
                                    >
                                        <ImageIcon size={14} />
                                    </button>
                                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 text-center truncate pointer-events-none">
                                        {isFeatured ? "Үндсэн (Шинэ)" : "Шинэ"}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin_amenities', 'Тавилга / Тоног төхөөрөмж')}</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {amenities.map((amenity) => {
                            // Find existing assignment
                            const currentAssignment = formData.amenities.find((a: HouseAmenity | string) =>
                                (typeof a === 'string' ? a === amenity.id : a.amenityId === amenity.id)
                            );

                            const currentQuantity = currentAssignment
                                ? (typeof currentAssignment === 'string' ? 1 : currentAssignment.quantity)
                                : 0;

                            return (
                                <div key={amenity.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                                    <div className="flex items-center">
                                        {amenity.imageUrl ? (
                                            <img src={amenity.imageUrl} alt={amenity.name} className="w-8 h-8 rounded-full object-cover mr-2" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-gray-200 mr-2"></div>
                                        )}
                                        <span className="text-sm font-medium text-gray-700">{amenity.name}</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newAmenities = [...formData.amenities];
                                                const index = newAmenities.findIndex((a: HouseAmenity | string) =>
                                                    (typeof a === 'string' ? a === amenity.id : a.amenityId === amenity.id)
                                                );

                                                if (index >= 0) {
                                                    // Update existing
                                                    const item = newAmenities[index];
                                                    const currentQty = typeof item === 'string' ? 1 : item.quantity;
                                                    if (currentQty > 0) {
                                                        if (currentQty === 1) {
                                                            newAmenities.splice(index, 1);
                                                        } else {
                                                            newAmenities[index] = { amenityId: amenity.id, quantity: currentQty - 1 };
                                                        }
                                                    }
                                                }
                                                setFormData({ ...formData, amenities: newAmenities });
                                            }}
                                            className="p-1 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600"
                                        >
                                            -
                                        </button>
                                        <span className="w-8 text-center font-medium">{currentQuantity}</span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newAmenities = [...formData.amenities];
                                                const index = newAmenities.findIndex((a: HouseAmenity | string) =>
                                                    (typeof a === 'string' ? a === amenity.id : a.amenityId === amenity.id)
                                                );

                                                if (index >= 0) {
                                                    const item = newAmenities[index];
                                                    const currentQty = typeof item === 'string' ? 1 : item.quantity;
                                                    newAmenities[index] = { amenityId: amenity.id, quantity: currentQty + 1 };
                                                } else {
                                                    newAmenities.push({ amenityId: amenity.id, quantity: 1 });
                                                }
                                                setFormData({ ...formData, amenities: newAmenities });
                                            }}
                                            className="p-1 rounded-full bg-indigo-100 hover:bg-indigo-200 text-indigo-600"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {activeLangs.length > 0 && (
                    <div className="col-span-2 border-t pt-6">
                        <div className="flex items-center mb-4">
                            <Globe className="mr-2 text-indigo-500" size={20} />
                            <h4 className="text-md font-medium text-gray-900">{t('admin_manual_translation', 'Гар аргаар орчуулах')}</h4>
                        </div>

                        <div className="space-y-4">
                            {activeLangs.map((lang) => (
                                <div key={lang.id} className="border rounded-xl overflow-hidden bg-gray-50 transition-all">
                                    <div
                                        onClick={() => setExpandedLang(expandedLang === lang.id ? null : lang.id)}
                                        className="w-full flex items-center justify-between p-4 hover:bg-gray-100 transition-colors cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl">{lang.flag}</span>
                                            <span className="font-medium">{lang.name}</span>
                                            <span className="text-xs text-gray-400 uppercase font-semibold">{lang.id}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAutoTranslate(lang.id);
                                                }}
                                                disabled={!!translatingLang}
                                                className="flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold hover:bg-purple-200 transition-colors disabled:opacity-50"
                                            >
                                                {translatingLang === lang.id ? (
                                                    <Loader2 size={12} className="animate-spin" />
                                                ) : (
                                                    <Bot size={12} />
                                                )}
                                                AI Орчуулга
                                            </button>
                                            {expandedLang === lang.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                        </div>
                                    </div>

                                    {expandedLang === lang.id && (
                                        <div className="p-4 pt-0 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin_house_name', 'Нэр')}</label>
                                                <input
                                                    type="text"
                                                    className="w-full rounded-lg border-gray-200 border p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                    value={formData.localizedNames[lang.id] || ""}
                                                    placeholder={formData.name}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        localizedNames: { ...formData.localizedNames, [lang.id]: e.target.value }
                                                    })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin_description', 'Тайлбар')}</label>
                                                <textarea
                                                    rows={2}
                                                    className="w-full rounded-lg border-gray-200 border p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                    value={formData.localizedDescriptions[lang.id] || ""}
                                                    placeholder={formData.description}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        localizedDescriptions: { ...formData.localizedDescriptions, [lang.id]: e.target.value }
                                                    })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin_long_description', 'Дэлгэрэнгүй тайлбар')}</label>
                                                <textarea
                                                    rows={4}
                                                    className="w-full rounded-lg border-gray-200 border p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                    value={formData.localizedLongDescriptions[lang.id] || ""}
                                                    placeholder={formData.longDescription}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        localizedLongDescriptions: { ...formData.localizedLongDescriptions, [lang.id]: e.target.value }
                                                    })}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="flex justify-end space-x-3">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    {t('cancel', 'Болих')}
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 flex items-center"
                >
                    {loading ? (
                        <>
                            <Upload className="animate-spin -ml-1 mr-2 h-4 w-4" />
                            {uploadProgress || t('admin_saving', "Хадгалж байна...")}
                        </>
                    ) : (
                        t('save', "Хадгалах")
                    )}
                </button>
            </div>
        </form >
    );
}
