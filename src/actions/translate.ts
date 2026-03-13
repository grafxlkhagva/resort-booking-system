"use server";

import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

/**
 * Server action to translate text using Google Gemini
 * Ultra-compatible version: Auto-detects available Gemini models
 */
export async function translateText(text: string, targetLang: string) {
    if (!text || !targetLang || targetLang === 'mn') {
        return text;
    }

    try {
        const settingsRef = doc(db, "settings", "general");
        const settingsSnap = await getDoc(settingsRef);

        let apiKey = process.env.GEMINI_API_KEY;
        if (settingsSnap.exists()) {
            const data = settingsSnap.data();
            if (data.geminiApiKey) apiKey = data.geminiApiKey;
        }

        if (!apiKey) {
            throw new Error("AI Орчуулгын түлхүүр тохируулаагүй байна.");
        }

        apiKey = apiKey.trim();
        const languageNames: Record<string, string> = {
            'en': 'English', 'ru': 'Russian', 'zh': 'Chinese', 'ko': 'Korean',
        };
        const targetLangName = languageNames[targetLang] || targetLang;

        // 1. Get list of all available models for this API Key
        console.log("[Translate] Fetching available models...");
        const listModelsUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const listResponse = await fetch(listModelsUrl);
        const listData = await listResponse.json();

        if (!listResponse.ok) {
            throw new Error(`API Key алдаа (${listResponse.status}): ${listData.error?.message || 'Түлхүүр буруу байна'}`);
        }

        // 2. Filter for Gemini models that support content generation
        const allModels = listData.models || [];
        const geminiModels = allModels.filter((m: any) =>
            m.name.includes("gemini") &&
            m.supportedGenerationMethods.includes("generateContent")
        );

        if (geminiModels.length === 0) {
            throw new Error("Таны API Key-д тохирох Gemini модель олдсонгүй. Боломжит: " + allModels.map((m: any) => m.name).join(", "));
        }

        // 3. Select the best model in order of priority (1.5/2.0 Flash is preferred for speed)
        const priorityPatterns = [
            "gemini-2.0-flash",
            "gemini-1.5-flash",
            "gemini-2.0-flash-exp",
            "gemini-1.5-pro",
            "gemini-pro"
        ];

        let modelToUse = null;
        for (const pattern of priorityPatterns) {
            modelToUse = geminiModels.find((m: any) => m.name.includes(pattern));
            if (modelToUse) break;
        }

        // Fallback to the first available gemini model
        if (!modelToUse) {
            modelToUse = geminiModels[0];
        }

        const modelName = modelToUse.name; // e.g., "models/gemini-2.0-flash-exp"
        console.log(`[Translate] Auto-selected model: ${modelName}`);

        // 4. Perform translation
        const generateUrl = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${apiKey}`;

        const response = await fetch(generateUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `Translate this text to ${targetLangName}. Return ONLY the translated text. No explanations.\n\nText: ${text}`
                    }]
                }],
                generationConfig: {
                    temperature: 0.1,
                }
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(`Орчуулга амжилтгүй (${response.status}): ${data.error?.message || 'AI алдаа заалаа'}`);
        }

        const translated = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (!translated) {
            throw new Error("AI хоосон хариу буцаалаа.");
        }

        return translated;

    } catch (error: any) {
        console.error("[Translate] Final error:", error);
        throw new Error(error.message || "Орчуулахад алдаа гарлаа.");
    }
}
