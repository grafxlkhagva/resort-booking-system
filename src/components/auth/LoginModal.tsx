"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { Phone, X } from "lucide-react";

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function LoginModal({ isOpen, onClose, onSuccess }: LoginModalProps) {
    const [step, setStep] = useState<"phone" | "otp">("phone");
    const [phoneNumber, setPhoneNumber] = useState("+976");
    const [otp, setOtp] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
    const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);

    useEffect(() => {
        if (!isOpen) return;

        // Initialize reCAPTCHA after DOM is ready
        const initRecaptcha = () => {
            const container = document.getElementById('recaptcha-modal-container');
            if (!container) return;

            if (recaptchaVerifier) {
                try {
                    recaptchaVerifier.clear();
                } catch (e) {
                    console.error("Error clearing existing reCAPTCHA:", e);
                }
            }

            try {
                const verifier = new RecaptchaVerifier(auth, 'recaptcha-modal-container', {
                    'size': 'invisible',
                    'callback': () => {
                        console.log('reCAPTCHA solved');
                    },
                    'expired-callback': () => {
                        console.log('reCAPTCHA expired');
                        setError("reCAPTCHA expired. Please try again.");
                    }
                });
                setRecaptchaVerifier(verifier);
            } catch (error) {
                console.error("reCAPTCHA initialization error:", error);
            }
        };

        const timer = setTimeout(initRecaptcha, 500);

        return () => {
            clearTimeout(timer);
            if (recaptchaVerifier) {
                try {
                    recaptchaVerifier.clear();
                } catch (e) { }
            }
        };
    }, [isOpen]);

    const sendOTP = async () => {
        if (!phoneNumber || phoneNumber.length < 8) {
            setError("Please enter a valid phone number.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            if (!recaptchaVerifier) {
                // Try strictly re-init if imperative, but the useEffect should have handled it.
                throw new Error("reCAPTCHA not initialized");
            }

            const confirmation = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
            setConfirmationResult(confirmation);
            setStep("otp");
        } catch (err: any) {
            console.error("Error sending OTP:", err);
            setError("Error sending OTP. Please try again.");
            // Reset logic if needed
            if (recaptchaVerifier) {
                try { recaptchaVerifier.clear(); } catch (e) { }
            }
        } finally {
            setLoading(false);
        }
    };

    const verifyOTP = async () => {
        if (!otp || otp.length !== 6) {
            setError("Please enter 6-digit code.");
            return;
        }
        if (!confirmationResult) return;

        setLoading(true);
        setError("");

        try {
            const result = await confirmationResult.confirm(otp);
            const user = result.user;

            // Check/Create User Profile
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (!userDoc.exists()) {
                await setDoc(doc(db, "users", user.uid), {
                    uid: user.uid,
                    phoneNumber: phoneNumber,
                    phoneVerified: true,
                    role: 'user',
                    createdAt: serverTimestamp()
                });
            } else {
                await setDoc(doc(db, "users", user.uid), {
                    phoneNumber: phoneNumber,
                    phoneVerified: true
                }, { merge: true });
            }

            onSuccess();
        } catch (err: any) {
            console.error("Error verifying OTP:", err);
            setError("Invalid code. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[60]">
            <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 relative animate-in fade-in zoom-in duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <X size={24} />
                </button>

                <div className="text-center mb-6">
                    <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-indigo-50 mb-4">
                        <Phone className="h-7 w-7 text-indigo-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">
                        {step === "phone" ? "Нэвтрэх" : "Баталгаажуулах"}
                    </h2>
                    <p className="mt-2 text-sm text-gray-500">
                        {step === "phone"
                            ? "Захиалгаа үргэлжлүүлэхийн тулд нэвтэрнэ үү"
                            : `${phoneNumber} дугаар руу илгээсэн кодыг оруулна уу`}
                    </p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
                        {error}
                    </div>
                )}

                {step === "phone" ? (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Утасны дугаар</label>
                            <input
                                type="tel"
                                placeholder="+976 99112233"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                disabled={loading}
                            />
                        </div>
                        <button
                            onClick={sendOTP}
                            disabled={loading}
                            className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-70 disabled:cursor-not-allowed transition-colors font-semibold"
                        >
                            {loading ? "Илгээж байна..." : "Код авах"}
                        </button>
                        <div id="recaptcha-modal-container"></div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">6 оронтой код</label>
                            <input
                                type="text"
                                maxLength={6}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl tracking-widest focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                disabled={loading}
                                autoFocus
                            />
                        </div>
                        <button
                            onClick={verifyOTP}
                            disabled={loading}
                            className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-70 disabled:cursor-not-allowed transition-colors font-semibold"
                        >
                            {loading ? "Шалгаж байна..." : "Баталгаажуулах"}
                        </button>
                        <button
                            onClick={() => { setStep('phone'); setOtp(''); setError(''); }}
                            className="w-full text-sm text-indigo-600 hover:text-indigo-800 py-2"
                        >
                            Дугаар солих
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
