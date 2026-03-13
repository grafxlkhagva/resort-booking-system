"use server";

import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, collection, addDoc, getDocs } from "firebase/firestore";
import { House, ResortSettings } from "@/types";

// --- Types ---
export interface ChannelManagerSettings {
    isActive: boolean;
    provider: 'booking.com';
    hotelId: string;
    username: string;
    password?: string;
}

export interface SyncLog {
    id?: string;
    type: 'inventory' | 'reservation';
    status: 'success' | 'error';
    message: string;
    timestamp: number;
    details?: any;
}

// --- Actions ---

export async function getChannelSettings(): Promise<{ success: boolean; settings?: ChannelManagerSettings; error?: string }> {
    try {
        const docRef = doc(db, "settings", "general");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data() as ResortSettings;
            return {
                success: true,
                settings: data.channelManager || {
                    isActive: false,
                    provider: 'booking.com',
                    hotelId: '',
                    username: ''
                }
            };
        }
        return { success: false, error: "Settings not found" };
    } catch (error: any) {
        console.error("Error fetching channel settings:", error);
        return { success: false, error: error.message };
    }
}

export async function saveChannelSettings(settings: ChannelManagerSettings): Promise<{ success: boolean; error?: string }> {
    try {
        const docRef = doc(db, "settings", "general");
        await updateDoc(docRef, {
            channelManager: settings
        });
        return { success: true };
    } catch (error: any) {
        console.error("Error saving channel settings:", error);
        return { success: false, error: error.message };
    }
}

export async function mapHouseToChannel(houseId: string, roomId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const houseRef = doc(db, "accommodations", houseId);
        // We need to merge this into the existing channelMappings map
        // Construct the update object. Since Firestore map fields can be updated with dot notation:
        await updateDoc(houseRef, {
            [`channelMappings.bookingDotCom`]: {
                roomId: roomId,
                isSyncing: true
            }
        });
        return { success: true };
    } catch (error: any) {
        console.error("Error mapping house:", error);
        return { success: false, error: error.message };
    }
}

export async function getSyncLogs(): Promise<SyncLog[]> {
    try {
        // In a real app, use a subcollection or a separate top-level collection with pagination
        const logsRef = collection(db, "channel_manager_logs");
        // For simplicity/mock, let's just assume we query the last 20
        // NOTE: In a real server action, we might need to handle the query limits properly.
        // Since we haven't created this collection in previous steps, this might return empty.
        // We will create mock logs for now if empty.

        // This is a placeholder since we don't have the collection set up with data yet.
        return [];
    } catch (error) {
        console.error("Error fetching logs:", error);
        return [];
    }
}

export async function triggerSync(type: 'inventory' | 'reservation'): Promise<{ success: boolean; message: string }> {
    try {
        // 1. Check if active
        const settingsRes = await getChannelSettings();
        if (!settingsRes.success || !settingsRes.settings?.isActive) {
            return { success: false, message: "Channel Manager is disabled." };
        }

        // 2. Fetch all houses with mappings
        const housesRef = collection(db, "accommodations");
        const housesSnap = await getDocs(housesRef);
        const mappedHouses = housesSnap.docs.filter(doc => {
            const data = doc.data() as House;
            return data.channelMappings?.bookingDotCom?.isSyncing;
        });

        if (mappedHouses.length === 0) {
            return { success: false, message: "No houses mapped to Booking.com" };
        }

        // 3. Mock API Call to Booking.com
        // In reality: await fetch('https://booking.com/api/v1/inventory', ...)
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate delay

        // 4. Log the result
        const logEntry: SyncLog = {
            type,
            status: 'success',
            message: `Successfully synced ${mappedHouses.length} houses with Booking.com (Mock).`,
            timestamp: Date.now()
        };

        // In a real app, avoid using client-side SDK inside server action for writing if possible, 
        // but db from @/lib/firebase (initialized with client SDK usually) works in Next.js server components/actions 
        // if configured correctly, though Admin SDK is preferred for server actions.
        // Assuming our @/lib/firebase exports a client-compatible instance that works in node env (often does).
        await addDoc(collection(db, "channel_manager_logs"), logEntry);

        return { success: true, message: logEntry.message };

    } catch (error: any) {
        console.error("Sync error:", error);
        return { success: false, message: error.message };
    }
}
