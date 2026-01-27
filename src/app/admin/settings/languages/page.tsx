"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, getDocs, getDoc, doc, setDoc, deleteDoc, query, orderBy } from "firebase/firestore";
import { Language } from "@/types";
import { Plus, Trash2, Globe, Bot, Check, AlertCircle, Loader2, Languages, Save, Home, ChefHat, Eye, EyeOff } from "lucide-react";
import { translateText } from "@/actions/translate";
import { useLanguage } from "@/contexts/LanguageContext";

const AVAILABLE_LANGUAGES = [
    { id: 'en', name: 'English', flag: '🇺🇸' },
    { id: 'ru', name: 'Русский', flag: '🇷🇺' },
    { id: 'zh', name: '中文', flag: '🇨🇳' },
    { id: 'ko', name: '한국어', flag: '🇰🇷' },
];

export default function LanguageSettingsPage() {
    const { isAdmin, loading: authLoading } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeLanguages, setActiveLanguages] = useState<Language[]>([]);
    const [selectedLangToAdd, setSelectedLangToAdd] = useState("");
    const [translating, setTranslating] = useState<string | null>(null);
    const [geminiKey, setGeminiKey] = useState("");
    const [showKey, setShowKey] = useState(false);
    const { t } = useLanguage();

    useEffect(() => {
        const fetchLanguages = async () => {
            try {
                const q = query(collection(db, "languages"));
                const querySnapshot = await getDocs(q);
                const langs = querySnapshot.docs.map(doc => doc.data() as Language);

                // If no languages exist, add Mongolian as default
                if (langs.length === 0) {
                    const defaultLang: Language = { id: 'mn', name: 'Монгол', flag: '🇲🇳', isActive: true };
                    await setDoc(doc(db, "languages", "mn"), defaultLang);
                    langs.push(defaultLang);
                }

                setActiveLanguages(langs);
            } catch (error) {
                console.error("Error fetching languages:", error);
            } finally {
                setLoading(false);
            }
        };

        const fetchSettings = async () => {
            try {
                const docSnap = await getDoc(doc(db, "settings", "general"));
                if (docSnap.exists()) {
                    setGeminiKey(docSnap.data().geminiApiKey || "");
                }
            } catch (error) {
                console.error("Error fetching settings:", error);
            }
        };

        if (isAdmin) {
            fetchLanguages();
            fetchSettings();
        }
    }, [isAdmin]);

    const handleAddLanguage = async () => {
        if (!selectedLangToAdd) return;

        const langInfo = AVAILABLE_LANGUAGES.find(l => l.id === selectedLangToAdd);
        if (!langInfo) return;

        if (activeLanguages.some(l => l.id === selectedLangToAdd)) {
            alert(t('lang_already_added', 'Энэ хэл аль хэдийн нэмэгдсэн байна.'));
            return;
        }

        setSaving(true);
        try {
            const newLang: Language = {
                id: langInfo.id,
                name: langInfo.name,
                flag: langInfo.flag,
                isActive: true
            };
            await setDoc(doc(db, "languages", langInfo.id), newLang);
            setActiveLanguages([...activeLanguages, newLang]);
            setSelectedLangToAdd("");

            // Also update general settings for quick access
            // await updateGeneralActiveLangs([...activeLanguages, newLang]);
        } catch (error) {
            console.error("Error adding language:", error);
        } finally {
            setSaving(false);
        }
    };

    const handleToggleStatus = async (id: string, currentStatus: boolean) => {
        if (id === 'mn') {
            alert(t('cannot_disable_default', 'Үндсэн хэлийг идэвхгүй болгох боломжгүй.'));
            return;
        }

        setSaving(true);
        try {
            const langRef = doc(db, "languages", id);
            await setDoc(langRef, { isActive: !currentStatus }, { merge: true });
            setActiveLanguages(activeLanguages.map(l =>
                l.id === id ? { ...l, isActive: !currentStatus } : l
            ));
        } catch (error) {
            console.error("Error toggling language status:", error);
        } finally {
            setSaving(false);
        }
    };

    const handleSaveGeminiKey = async () => {
        setSaving(true);
        try {
            await setDoc(doc(db, "settings", "general"), {
                geminiApiKey: geminiKey
            }, { merge: true });
            alert(t('settings_saved', 'Тохиргоо амжилттай хадгалагдлаа!'));
        } catch (error) {
            console.error("Error saving Gemini key:", error);
            alert(t('save_error', 'Хадгалахад алдаа гарлаа.'));
        } finally {
            setSaving(false);
        }
    };

    const handleTestGeminiKey = async () => {
        if (!geminiKey) {
            alert("Эхлээд түлхүүрээ оруулна уу.");
            return;
        }
        setSaving(true);
        try {
            const result = await translateText("Сайн байна уу? Энэ бол тестийн мэдэгдэл.", "en");
            alert("Холболт амжилттай! AI Хариулт: " + result);
        } catch (error: any) {
            console.error("Test error:", error);
            alert("Холболт амжилтгүй: " + (error.message || "Үл мэдэгдэх алдаа"));
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteLanguage = async (id: string) => {
        if (id === 'mn') return;
        if (!confirm(t('delete_confirm_lang', "Энэ хэлийг устгахдаа итгэлтэй байна уу? Бүх орчуулгууд устахгүй ч сайт дээр харагдахгүй болно."))) return;

        setSaving(true);
        try {
            await deleteDoc(doc(db, "languages", id));
            setActiveLanguages(activeLanguages.filter(l => l.id !== id));
        } catch (error) {
            console.error("Error deleting language:", error);
        } finally {
            setSaving(false);
        }
    };

    const handleTranslateHouses = async () => {
        const otherLangs = activeLanguages.filter(l => l.id !== 'mn' && l.isActive);
        if (otherLangs.length === 0) {
            alert(t('no_active_langs', 'Орчуулах идэвхтэй хэл алга байна.'));
            return;
        }

        setTranslating("houses");
        try {
            const querySnapshot = await getDocs(collection(db, "accommodations"));
            for (const docSnap of querySnapshot.docs) {
                const house = docSnap.data();
                const localizedNames: Record<string, string> = house.localizedNames || {};
                const localizedDescriptions: Record<string, string> = house.localizedDescriptions || {};

                for (const lang of otherLangs) {
                    if (!localizedNames[lang.id]) {
                        localizedNames[lang.id] = await translateText(house.name, lang.id);
                    }
                    if (!localizedDescriptions[lang.id] && house.description) {
                        localizedDescriptions[lang.id] = await translateText(house.description, lang.id);
                    }
                }

                await setDoc(docSnap.ref, { localizedNames, localizedDescriptions }, { merge: true });
            }
            alert(t('translation_complete', 'Байшингуудын орчуулга дууслаа.'));
        } catch (e) {
            console.error(e);
            alert(t('translation_error', 'Орчуулах үед алдаа гарлаа.'));
        } finally {
            setTranslating(null);
        }
    };

    const handleTranslateMenu = async () => {
        const otherLangs = activeLanguages.filter(l => l.id !== 'mn' && l.isActive);
        if (otherLangs.length === 0) {
            alert(t('no_active_langs', 'Орчуулах идэвхтэй хэл алга байна.'));
            return;
        }

        setTranslating("menu");
        try {
            const querySnapshot = await getDocs(collection(db, "menu_items"));
            for (const docSnap of querySnapshot.docs) {
                const item = docSnap.data();
                const localizedNames: Record<string, string> = item.localizedNames || {};
                const localizedDescriptions: Record<string, string> = item.localizedDescriptions || {};

                for (const lang of otherLangs) {
                    if (!localizedNames[lang.id]) {
                        localizedNames[lang.id] = await translateText(item.name, lang.id);
                    }
                    if (!localizedDescriptions[lang.id] && item.description) {
                        localizedDescriptions[lang.id] = await translateText(item.description, lang.id);
                    }
                }

                await setDoc(docSnap.ref, { localizedNames, localizedDescriptions }, { merge: true });
            }
            alert(t('translation_complete', 'Менюны орчуулга дууслаа.'));
        } catch (e) {
            console.error(e);
            alert(t('translation_error', 'Орчуулах үед алдаа гарлаа.'));
        } finally {
            setTranslating(null);
        }
    };

    if (authLoading || loading) return (
        <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
    );

    if (!isAdmin) return <div className="p-8 text-center">{t('admin_access_denied', 'Access Denied')}</div>;

    return (
        <div className="max-w-4xl mx-auto content-padding">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-[var(--foreground)] flex items-center">
                    <Languages className="mr-2 text-[var(--primary)]" />
                    {t('admin_settings_title', 'Хэлний Тохиргоо')}
                </h1>
                <p className="text-[var(--muted)] mt-1">{t('admin_settings_subtitle', 'Вэбсайтын олон хэлний орчуулга болон AI тохиргоог эндээс удирдана.')}</p>
            </div>

            <div className="grid gap-6">
                {/* Add Language Section */}
                <div className="card p-6 bg-white shadow-sm border border-gray-100 rounded-2xl">
                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <Plus className="mr-2 text-green-500" size={20} />
                        {t('add_new_language', 'Шинэ хэл нэмэх')}
                    </h2>
                    <div className="flex gap-4">
                        <select
                            value={selectedLangToAdd}
                            onChange={(e) => setSelectedLangToAdd(e.target.value)}
                            className="flex-1 rounded-xl border-gray-200 border p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        >
                            <option value="">{t('choose_language', 'Хэл сонгох...')}...</option>
                            {AVAILABLE_LANGUAGES.filter(l => !activeLanguages.some(al => al.id === l.id)).map(lang => (
                                <option key={lang.id} value={lang.id}>
                                    {lang.flag} {lang.name}
                                </option>
                            ))}
                        </select>
                        <button
                            onClick={handleAddLanguage}
                            disabled={!selectedLangToAdd || saving}
                            className="btn-primary flex items-center px-6 py-2.5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : t('add', 'Нэмэх')}
                        </button>
                    </div>
                </div>

                {/* Active Languages List */}
                <div className="card p-6 bg-white shadow-sm border border-gray-100 rounded-2xl">
                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <Globe className="mr-2 text-blue-500" size={20} />
                        {t('active_languages', 'Идэвхтэй хэлнүүд')}
                    </h2>
                    <div className="divide-y divide-gray-100">
                        {activeLanguages.map((lang) => (
                            <div key={lang.id} className="py-4 flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{lang.flag}</span>
                                    <div>
                                        <p className="font-medium text-gray-900">{lang.name}</p>
                                        <p className="text-xs text-gray-400 uppercase font-semibold">{lang.id}</p>
                                    </div>
                                    {lang.id === 'mn' && (
                                        <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] rounded-full font-bold uppercase">Default</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleToggleStatus(lang.id, lang.isActive)}
                                        disabled={saving || lang.id === 'mn'}
                                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${lang.isActive
                                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                            }`}
                                    >
                                        {lang.isActive ? t('active', 'Идэвхтэй') : t('inactive', 'Идэвхгүй')}
                                    </button>
                                    {lang.id !== 'mn' && (
                                        <button
                                            onClick={() => handleDeleteLanguage(lang.id)}
                                            disabled={saving}
                                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* AI Translation Settings */}
                <div className="card p-6 bg-white shadow-sm border border-gray-100 rounded-2xl border-l-4 border-l-purple-500">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h2 className="text-lg font-semibold flex items-center">
                                <Bot className="mr-2 text-purple-500" size={20} />
                                Google Gemini Орчуулга
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">Google Gemini (AI Studio) ашиглан контентуудыг автоматаар орчуулна.</p>
                        </div>
                    </div>

                    <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 mb-6">
                        <div className="flex gap-3">
                            <AlertCircle className="text-purple-600 shrink-0" size={20} />
                            <div className="text-sm text-purple-800">
                                <p className="font-semibold">Анхаар:</p>
                                <p>AI орчуулга хийхийн тулд <a href="https://aistudio.google.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline font-bold">Google Studio API Key</a> тохируулсан байх шаардлагатай.</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-sm font-medium text-gray-700">Google Gemini API Key</label>
                                {geminiKey && (
                                    <span className="flex items-center text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full uppercase">
                                        <Check size={10} className="mr-1" /> Түлхүүр холбогдсон
                                    </span>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type={showKey ? "text" : "password"}
                                        value={geminiKey}
                                        onChange={(e) => setGeminiKey(e.target.value)}
                                        placeholder="AIza..."
                                        className="w-full rounded-xl border-gray-200 border p-2.5 pr-10 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowKey(!showKey)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                <button
                                    onClick={handleSaveGeminiKey}
                                    disabled={saving}
                                    className="btn-primary bg-purple-600 hover:bg-purple-700 px-4 rounded-xl flex items-center disabled:opacity-50"
                                    title="Хадгалах"
                                >
                                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save size={18} />}
                                </button>
                                <button
                                    onClick={handleTestGeminiKey}
                                    disabled={saving}
                                    className="btn-secondary border-purple-200 text-purple-600 border hover:bg-purple-50 px-4 rounded-xl flex items-center disabled:opacity-50"
                                    title="Турших"
                                >
                                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Bot size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-100">
                            <h3 className="text-sm font-bold mb-3 uppercase tracking-wider text-gray-400">{t('bulk_translate', 'Бөөнөөр орчуулах')}</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <button
                                    onClick={handleTranslateHouses}
                                    disabled={!!translating}
                                    className="flex items-center justify-center gap-2 p-3 bg-white border border-gray-200 rounded-xl hover:border-purple-300 hover:bg-purple-50 transition-all text-sm font-medium disabled:opacity-50"
                                >
                                    {translating === "houses" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Home size={16} />}
                                    {t('translate_all_houses', 'Бүх байшингуудыг орчуулах')}
                                </button>
                                <button
                                    onClick={handleTranslateMenu}
                                    disabled={!!translating}
                                    className="flex items-center justify-center gap-2 p-3 bg-white border border-gray-200 rounded-xl hover:border-purple-300 hover:bg-purple-50 transition-all text-sm font-medium disabled:opacity-50"
                                >
                                    {translating === "menu" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChefHat size={16} />}
                                    {t('translate_all_menu', 'Бүх менюг орчуулах')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
