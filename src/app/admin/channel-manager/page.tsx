"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { House } from "@/types";
import {
    getChannelSettings,
    saveChannelSettings,
    mapHouseToChannel,
    triggerSync,
    type ChannelManagerSettings
} from "@/actions/channelManager";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import {
    Save, RefreshCw, Link as LinkIcon, AlertCircle, CheckCircle,
    Settings, Activity, Home, Server, Info, ExternalLink, ChevronDown, ChevronUp
} from "lucide-react";

export default function ChannelManagerPage() {
    const { isAdmin, loading: authLoading } = useAuth();
    const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'mapping'>('overview');
    const [isLoading, setIsLoading] = useState(false);
    const [showGuide, setShowGuide] = useState(false);

    // Data States
    const [settings, setSettings] = useState<ChannelManagerSettings>({
        isActive: false,
        provider: 'booking.com',
        hotelId: '',
        username: '',
        password: ''
    });

    const [houses, setHouses] = useState<House[]>([]);
    const [syncing, setSyncing] = useState<'inventory' | 'reservation' | null>(null);

    // Initial Fetch
    useEffect(() => {
        if (!isAdmin) return;

        // Fetch Settings
        const loadSettings = async () => {
            const res = await getChannelSettings();
            if (res.success && res.settings) {
                setSettings(res.settings);
            }
        };
        loadSettings();

        // Subscribe to Houses for Real-time Mapping View
        const unsubscribe = onSnapshot(collection(db, "houses"), (snapshot) => {
            const housesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as House[];
            setHouses(housesData.sort((a, b) => a.houseNumber - b.houseNumber));
        });

        return () => unsubscribe();
    }, [isAdmin]);

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const res = await saveChannelSettings(settings);
            if (res.success) {
                alert("Settings saved successfully!");
            } else {
                alert("Error saving settings: " + res.error);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleMapping = async (houseId: string, roomId: string) => {
        if (!roomId) return;
        try {
            const res = await mapHouseToChannel(houseId, roomId);
            if (!res.success) alert("Failed to map house: " + res.error);
        } catch (err) {
            alert("Error mapping house");
        }
    };

    const handleSync = async (type: 'inventory' | 'reservation') => {
        setSyncing(type);
        try {
            const res = await triggerSync(type);
            alert(res.message);
        } catch (err) {
            console.error(err);
            alert("Sync failed");
        } finally {
            setSyncing(null);
        }
    };

    if (authLoading || !isAdmin) return <div className="p-8 text-center">Loading...</div>;

    const mappedCount = houses.filter(h => h.channelMappings?.bookingDotCom?.isSyncing).length;

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                        <Server className="mr-3 text-indigo-600" />
                        Channel Manager
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Booking.com болон бусад сувгуудтай холбогдох удирдлагын хэсэг
                    </p>
                </div>
                <div className="flex space-x-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${settings.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {settings.isActive ? 'Active' : 'Inactive'}
                    </span>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`flex-1 py-4 px-6 text-sm font-medium flex items-center justify-center ${activeTab === 'overview' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Activity size={18} className="mr-2" />
                        Тойм (Overview)
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`flex-1 py-4 px-6 text-sm font-medium flex items-center justify-center ${activeTab === 'settings' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Settings size={18} className="mr-2" />
                        Тохиргоо (Settings)
                    </button>
                    <button
                        onClick={() => setActiveTab('mapping')}
                        className={`flex-1 py-4 px-6 text-sm font-medium flex items-center justify-center ${activeTab === 'mapping' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <LinkIcon size={18} className="mr-2" />
                        Холболт (Mapping)
                    </button>
                </div>

                <div className="p-6">
                    {/* OVERVIEW TAB */}
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                                    <h3 className="text-blue-900 font-medium mb-2">Нийт Байшин</h3>
                                    <p className="text-3xl font-bold text-blue-700">{houses.length}</p>
                                </div>
                                <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100">
                                    <h3 className="text-indigo-900 font-medium mb-2">Холбогдсон</h3>
                                    <p className="text-3xl font-bold text-indigo-700">{mappedCount}</p>
                                </div>
                                <div className="bg-green-50 p-6 rounded-xl border border-green-100">
                                    <h3 className="text-green-900 font-medium mb-2">Сүүлийн Sync</h3>
                                    <p className="text-sm text-green-700 mt-2">Одоогоор бүртгэлгүй</p>
                                </div>
                            </div>

                            <div className="border-t pt-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Manual Synchronization</h3>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => handleSync('inventory')}
                                        disabled={!!syncing || !settings.isActive}
                                        className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        <RefreshCw className={`mr-2 h-4 w-4 ${syncing === 'inventory' ? 'animate-spin' : ''}`} />
                                        Sync Inventory (Push)
                                    </button>
                                    <button
                                        onClick={() => handleSync('reservation')}
                                        disabled={!!syncing || !settings.isActive}
                                        className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        <RefreshCw className={`mr-2 h-4 w-4 ${syncing === 'reservation' ? 'animate-spin' : ''}`} />
                                        Sync Reservations (Pull)
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SETTINGS TAB */}
                    {activeTab === 'settings' && (
                        <form onSubmit={handleSaveSettings} className="max-w-4xl mx-auto">

                            {/* Guide Section */}
                            <div className="mb-8 border border-blue-200 bg-blue-50 rounded-lg overflow-hidden">
                                <button
                                    type="button"
                                    onClick={() => setShowGuide(!showGuide)}
                                    className="w-full flex items-center justify-between p-4 text-blue-800 hover:bg-blue-100 transition-colors"
                                >
                                    <div className="flex items-center font-semibold">
                                        <Info className="mr-2 h-5 w-5" />
                                        Booking.com-той хэрхэн холбогдох вэ?
                                    </div>
                                    {showGuide ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                                </button>

                                {showGuide && (
                                    <div className="p-4 border-t border-blue-200 text-sm text-blue-900 space-y-4">
                                        <div>
                                            <h4 className="font-bold mb-1">1. Connectivity Partner болох (эсвэл Provider ашиглах)</h4>
                                            <p className="mb-2">Booking.com-той шууд технологийн холболт хийхийн тулд та Booking.com-ын <a href="https://connectivity.booking.com/" target="_blank" className="underline font-semibold flex items-center inline-flex">Connectivity Partner <ExternalLink className="h-3 w-3 ml-1" /></a> хөтөлбөрт бүртгүүлэх, эсвэл гуравдагч талын "Channel Manager" үйлчилгээ ашиглах хэрэгтэй болдог.</p>
                                        </div>

                                        <div>
                                            <h4 className="font-bold mb-1">2. API Credentials авах</h4>
                                            <p className="mb-2">Таны систем (энэ программ) Booking.com-ын Extranet дээр "Provider" болж бүртгэгдсэн байх ёстой. Үүний дараа танд дараах мэдээллүүд ирнэ:</p>
                                            <ul className="list-disc ml-5 space-y-1">
                                                <li><b>Hotel ID (Property ID):</b> Booking.com дээрх таны байрны дугаар (Жишээ нь: 1234567)</li>
                                                <li><b>Username / Machine Account:</b> API-д хандах тусгай хэрэглэгчийн нэр (Жишээ нь: xml_1234567)</li>
                                                <li><b>Password:</b> API нууц үг</li>
                                            </ul>
                                        </div>

                                        <div>
                                            <h4 className="font-bold mb-1">3. Өрөөнүүдээ Холбох (Mapping)</h4>
                                            <p>Энд тохиргоогоо хадгалсны дараа "Холболт (Mapping)" цэс рүү орж өөрийн системийн байшингуудыг Booking.com дээрх "Room ID"-тай нь харгалзуулж өгнө.</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center border-b pb-2">
                                    <Settings className="mr-2 h-5 w-5 text-gray-500" />
                                    API Тохиргоо
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="col-span-2">
                                        <div className="flex items-center space-x-2 p-4 bg-gray-50 rounded-md border border-gray-200">
                                            <input
                                                type="checkbox"
                                                id="isActive"
                                                className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                                checked={settings.isActive}
                                                onChange={e => setSettings({ ...settings, isActive: e.target.checked })}
                                            />
                                            <label htmlFor="isActive" className="text-sm font-medium text-gray-900 select-none cursor-pointer">
                                                Enable Channel Manager (Идэвхжүүлэх)
                                            </label>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                                        <select
                                            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border bg-gray-50 text-gray-500 cursor-not-allowed"
                                            value={settings.provider}
                                            disabled
                                        >
                                            <option value="booking.com">Booking.com</option>
                                            <option value="agoda">Agoda (Coming Soon)</option>
                                            <option value="airbnb">Airbnb (Coming Soon)</option>
                                        </select>
                                        <p className="mt-1 text-xs text-gray-500">Одоогоор зөвхөн Booking.com дэмжигдсэн.</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Hotel ID (Property ID)</label>
                                        <input
                                            type="text"
                                            required
                                            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                            value={settings.hotelId}
                                            onChange={e => setSettings({ ...settings, hotelId: e.target.value })}
                                            placeholder="Ex: 1234567"
                                        />
                                        <p className="mt-1 text-xs text-gray-500">Booking.com дээрх таны байрны ID дугаар.</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">API Username</label>
                                        <input
                                            type="text"
                                            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                            value={settings.username}
                                            onChange={e => setSettings({ ...settings, username: e.target.value })}
                                            placeholder="Ex: xml_username"
                                        />
                                        <p className="mt-1 text-xs text-gray-500">Connectivity Provider-аас өгөгдсөн XML хэрэглэгчийн нэр.</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">API Password</label>
                                        <input
                                            type="password"
                                            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                            value={settings.password || ''}
                                            onChange={e => setSettings({ ...settings, password: e.target.value })}
                                            placeholder="••••••••"
                                        />
                                        <p className="mt-1 text-xs text-gray-500">Нууцлалтай хадгалагдана.</p>
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="flex justify-center py-2 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
                                    >
                                        {isLoading ? 'Хадгалж байна...' : 'Тохиргоог Хадгалах'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    )}

                    {/* MAPPING TAB */}
                    {activeTab === 'mapping' && (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Local House
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Booking.com Room ID
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {houses.map((house) => {
                                        const mapping = house.channelMappings?.bookingDotCom;
                                        return (
                                            <tr key={house.id}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            #{house.houseNumber} {house.name}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {mapping?.isSyncing ? (
                                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                            Linked
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                                            Unlinked
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">
                                                        {mapping?.roomId || '-'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="text"
                                                            placeholder="Enter Room ID"
                                                            className="border border-gray-300 rounded px-2 py-1 text-xs w-32"
                                                            id={`input-${house.id}`}
                                                            defaultValue={mapping?.roomId || ''}
                                                        />
                                                        <button
                                                            onClick={() => {
                                                                const input = document.getElementById(`input-${house.id}`) as HTMLInputElement;
                                                                handleMapping(house.id, input.value);
                                                            }}
                                                            className="text-indigo-600 hover:text-indigo-900 font-medium text-xs border border-indigo-200 px-2 py-1 rounded hover:bg-indigo-50"
                                                        >
                                                            Map
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
