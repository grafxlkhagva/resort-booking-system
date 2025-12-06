"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Phone } from "lucide-react";

export default function LoginPage() {
    const [step, setStep] = useState<"phone" | "otp">("phone");
    const [phoneNumber, setPhoneNumber] = useState("+976");
    const [otp, setOtp] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
    const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);
    const router = useRouter();

    useEffect(() => {
        // Initialize reCAPTCHA after DOM is ready
        const initRecaptcha = () => {
            const container = document.getElementById('recaptcha-container');
            if (!container) {
                console.error('reCAPTCHA container not found');
                return;
            }

            // Clear any existing verifier first
            if (recaptchaVerifier) {
                try {
                    recaptchaVerifier.clear();
                } catch (e) {
                    console.error("Error clearing existing reCAPTCHA:", e);
                }
            }

            try {
                const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                    'size': 'invisible',
                    'callback': () => {
                        console.log('reCAPTCHA solved');
                    },
                    'expired-callback': () => {
                        console.log('reCAPTCHA expired');
                    }
                });
                setRecaptchaVerifier(verifier);
            } catch (error) {
                console.error("reCAPTCHA initialization error:", error);
            }
        };

        // Delay to ensure DOM is ready
        const timer = setTimeout(initRecaptcha, 200);

        return () => {
            clearTimeout(timer);
            if (recaptchaVerifier) {
                try {
                    recaptchaVerifier.clear();
                } catch (e) {
                    console.error("Error clearing reCAPTCHA on unmount:", e);
                }
            }
        };
    }, []);

    const sendOTP = async () => {
        if (!phoneNumber || phoneNumber.length < 12) {
            setError("Утасны дугаараа зөв оруулна уу. Жишээ: +97699123456");
            return;
        }

        setLoading(true);
        setError("");

        try {
            if (!recaptchaVerifier) {
                throw new Error("reCAPTCHA тохируулагдаагүй байна");
            }

            const confirmation = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
            setConfirmationResult(confirmation);
            setStep("otp");
        } catch (err: any) {
            console.error("Error sending OTP:", err);
            if (err.code === 'auth/invalid-phone-number') {
                setError("Утасны дугаар буруу байна.");
            } else if (err.code === 'auth/too-many-requests') {
                setError("Хэт олон оролдлого хийсэн байна. Түр хүлээгээд дахин оролдоно уу.");
            } else {
                setError("OTP илгээхэд алдаа гарлаа. Дахин оролдоно уу.");
            }
            // Reset reCAPTCHA
            if (recaptchaVerifier) {
                recaptchaVerifier.clear();
                const newVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                    'size': 'invisible'
                });
                setRecaptchaVerifier(newVerifier);
            }
        } finally {
            setLoading(false);
        }
    };

    const verifyOTP = async () => {
        if (!otp || otp.length !== 6) {
            setError("6 оронтой кодоо оруулна уу.");
            return;
        }

        if (!confirmationResult) {
            setError("Эхлээд утасны дугаараа оруулна уу.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const result = await confirmationResult.confirm(otp);
            const user = result.user;

            // Check if user document exists
            const userDoc = await getDoc(doc(db, "users", user.uid));

            if (!userDoc.exists()) {
                // Create new user document
                await setDoc(doc(db, "users", user.uid), {
                    uid: user.uid,
                    phoneNumber: phoneNumber,
                    phoneVerified: true,
                    role: 'user',
                    createdAt: serverTimestamp()
                });
            } else {
                // Update phone verification status
                await setDoc(doc(db, "users", user.uid), {
                    phoneNumber: phoneNumber,
                    phoneVerified: true
                }, { merge: true });
            }

            // Redirect to home
            router.push("/");
        } catch (err: any) {
            console.error("Error verifying OTP:", err);
            if (err.code === 'auth/invalid-verification-code') {
                setError("Код буруу байна. Дахин оролдоно уу.");
            } else if (err.code === 'auth/code-expired') {
                setError("Кодын хугацаа дууссан байна. Шинээр код авна уу.");
                setStep("phone");
            } else {
                setError("Баталгаажуулахад алдаа гарлаа. Дахин оролдоно уу.");
            }
        } finally {
            setLoading(false);
        }
    };

    const resendOTP = () => {
        setStep("phone");
        setOtp("");
        setError("");
        setConfirmationResult(null);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
            <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-2xl shadow-xl border border-gray-100">
                <div className="text-center">
                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-indigo-100 mb-4">
                        <Phone className="h-8 w-8 text-indigo-600" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900">
                        {step === "phone" ? "Нэвтрэх" : "Баталгаажуулах"}
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        {step === "phone"
                            ? "Утасны дугаараа оруулж нэвтрэнэ үү"
                            : `${phoneNumber} дугаар руу илгээсэн 6 оронтой кодыг оруулна уу`}
                    </p>
                </div>

                {error && (
                    <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">
                        {error}
                    </div>
                )}

                {step === "phone" ? (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Утасны дугаар
                            </label>
                            <input
                                type="tel"
                                placeholder="+97699123456"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                disabled={loading}
                            />
                            <p className="text-xs text-gray-500 mt-2">
                                Монголын дугаар: +976 99123456
                            </p>
                        </div>

                        <button
                            onClick={sendOTP}
                            disabled={loading}
                            className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                        >
                            {loading ? "Илгээж байна..." : "Код авах"}
                        </button>

                        <p className="text-center text-sm text-gray-500 mt-4">
                            Анх удаа бол автоматаар бүртгэл үүснэ
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Баталгаажуулах код
                            </label>
                            <input
                                type="text"
                                placeholder="123456"
                                maxLength={6}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                disabled={loading}
                                autoFocus
                            />
                        </div>

                        <button
                            onClick={verifyOTP}
                            disabled={loading || otp.length !== 6}
                            className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                        >
                            {loading ? "Баталгаажуулж байна..." : "Нэвтрэх"}
                        </button>

                        <button
                            onClick={resendOTP}
                            disabled={loading}
                            className="w-full text-indigo-600 py-2 px-4 rounded-lg hover:bg-indigo-50 disabled:opacity-50 transition-colors text-sm font-medium"
                        >
                            Код дахин авах
                        </button>
                    </div>
                )}

                {/* reCAPTCHA container */}
                <div id="recaptcha-container"></div>
            </div>
        </div>
    );
}
