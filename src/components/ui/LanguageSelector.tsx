"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { Globe, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export default function LanguageSelector() {
    const { currentLanguage, setLanguage, languages, loading } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const activeLanguage = languages.find(l => l.id === currentLanguage) || languages[0];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (loading || languages.length <= 1) return null;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[var(--foreground)]/80 hover:bg-[var(--primary)]/5 hover:text-[var(--primary)] transition-all outline-none"
            >
                <span className="text-lg leading-none">{activeLanguage?.flag || <Globe size={18} />}</span>
                <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">{currentLanguage}</span>
                <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-[var(--shadow-lg)] overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="py-1">
                        {languages.map((lang) => (
                            <button
                                key={lang.id}
                                onClick={() => {
                                    setLanguage(lang.id);
                                    setIsOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${currentLanguage === lang.id
                                        ? 'bg-[var(--primary)]/10 text-[var(--primary)] font-semibold'
                                        : 'text-[var(--foreground)]/80 hover:bg-[var(--primary)]/5 hover:text-[var(--primary)]'
                                    }`}
                            >
                                <span className="text-xl leading-none">{lang.flag}</span>
                                <span className="flex-1 text-left">{lang.name}</span>
                                {currentLanguage === lang.id && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
