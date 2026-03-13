"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Language } from '@/types';
import { translations } from '@/lib/translations';

interface LanguageContextType {
    currentLanguage: string;
    setLanguage: (lang: string) => void;
    languages: Language[];
    t: (key: string, defaultValue?: string, variables?: Record<string, any>) => string;
    loading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [currentLanguage, setCurrentLanguage] = useState('mn');
    const [languages, setLanguages] = useState<Language[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Load saved language from localStorage
        const savedLang = localStorage.getItem('language');
        if (savedLang) {
            setCurrentLanguage(savedLang);
        }

        // Fetch active languages from Firestore
        const fetchLanguages = async () => {
            try {
                const q = query(collection(db, "languages"), where("isActive", "==", true));
                const querySnapshot = await getDocs(q);
                const langs = querySnapshot.docs.map(doc => doc.data() as Language);

                if (langs.length > 0) {
                    setLanguages(langs);
                } else {
                    // Fallback languages if no languages in DB
                    setLanguages([
                        { id: 'mn', name: 'Монгол', flag: '🇲🇳', isActive: true },
                        { id: 'en', name: 'English', flag: '🇺🇸', isActive: true }
                    ]);
                }
            } catch (error) {
                console.error("Error fetching languages:", error);
                setLanguages([{ id: 'mn', name: 'Монгол', flag: '🇲🇳', isActive: true }]);
            } finally {
                setLoading(false);
            }
        };

        fetchLanguages();
    }, []);

    const setLanguage = (lang: string) => {
        setCurrentLanguage(lang);
        localStorage.setItem('language', lang);
    };


    /**
     * Translation function for static UI text with interpolation support
     */
    const t = (key: string, defaultValue?: string, variables?: Record<string, any>): string => {
        let text = translations[currentLanguage]?.[key] || translations['mn']?.[key] || defaultValue || key;

        if (variables) {
            Object.entries(variables).forEach(([name, value]) => {
                text = text.replace(`{${name}}`, String(value));
            });
        }

        return text;
    };

    return (
        <LanguageContext.Provider value={{ currentLanguage, setLanguage, languages, t, loading }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
