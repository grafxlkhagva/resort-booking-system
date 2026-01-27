"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Phone } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function LoginPage() {
    const [step, setStep] = useState<"phone" | "otp">("phone");
    const [phoneNumber, setPhoneNumber] = useState("+976");
    const [otp, setOtp] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
    const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);
    const router = useRouter();
    const { t } = useLanguage();

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
            setError(t('invalid_phone_error', 'Утасны дугаараа зөв оруулна уу. Жишээ: +97699123456'));
            return;
        }

        setLoading(true);
        setError("");

        try {
            if (!recaptchaVerifier) {
                throw new Error(t('recaptcha_error', 'reCAPTCHA тохируулагдаагүй байна'));
            }

            const confirmation = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
            setConfirmationResult(confirmation);
            setStep("otp");
        } catch (err: any) {
            if (err.code === 'auth/invalid-phone-number') {
                setError(t('otp_invalid_error', 'Утасны дугаар буруу байна.'));
            } else if (err.code === 'auth/too-many-requests') {
                setError(t('too_many_requests', 'Хэт олон оролдлого хийсэн байна. Түр хүлээгээд дахин оролдоно уу.'));
            } else {
                setError(t('booking_error', 'OTP илгээхэд алдаа гарлаа. Дахин оролдоно уу.'));
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
            setError(t('otp_label', '6 оронтой кодоо оруулна уу.'));
            return;
        }

        if (!confirmationResult) {
            setError(t('invalid_phone_error', 'Эхлээд утасны дугаараа оруулна уу.'));
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
                setError(t('otp_invalid_error', 'Код буруу байна. Дахин оролдоно уу.'));
            } else if (err.code === 'auth/code-expired') {
                setError(t('otp_expired_error', 'Кодын хугацаа дууссан байна. Шинээр код авна уу.'));
                setStep("phone");
            } else {
                setError(t('booking_error', 'Баталгаажуулахад алдаа гарлаа. Дахин оролдоно уу.'));
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
        <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--background)]">
            <div className="card w-full max-w-md p-6 sm:p-8 space-y-6">
                <div className="text-center">
                    <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] mb-4">
                        <Phone className="h-7 w-7" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-[var(--foreground)]">
                        {step === "phone" ? t('login_page_title', 'Нэвтрэх') : t('verify_page_title', 'Баталгаажуулах')}
                    </h2>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                        {step === "phone" ? t('login_phone_subtitle', 'Утасны дугаараа оруулж нэвтрэнэ үү') : t('verify_otp_subtitle', `${phoneNumber} руу илгээсэн 6 оронтой кодыг оруулна уу`, { phone: phoneNumber })}
                    </p>
                </div>

                {error && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm border border-red-100">{error}</div>}

                {step === "phone" ? (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">{t('phone_label', 'Утасны дугаар')}</label>
                            <input
                                type="tel"
                                placeholder="+97699123456"
                                className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--card)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                disabled={loading}
                            />
                            <p className="text-xs text-[var(--muted)] mt-2">{t('phone_label_hint', 'Монгол')}: +976 99123456</p>
                        </div>
                        <button onClick={sendOTP} disabled={loading} className="btn-primary w-full">
                            {loading ? t('sending', 'Илгээж байна…') : t('get_code', 'Код авах')}
                        </button>
                        <p className="text-center text-sm text-[var(--muted)]">{t('first_time_info', 'Анх удаа бол автоматаар бүртгэл үүснэ')}</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">{t('otp_label', 'Баталгаажуулах код')}</label>
                            <input
                                type="text"
                                placeholder="123456"
                                maxLength={6}
                                className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--card)] text-center text-xl tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                                disabled={loading}
                                autoFocus
                            />
                        </div>
                        <button onClick={verifyOTP} disabled={loading || otp.length !== 6} className="btn-primary w-full">
                            {loading ? t('verifying', 'Баталгаажуулж байна…') : t('nav_login', 'Нэвтрэх')}
                        </button>
                        <button onClick={resendOTP} disabled={loading} className="w-full py-2.5 text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded-xl text-sm font-medium transition-colors">
                            {t('resend_code', 'Код дахин авах')}
                        </button>
                    </div>
                )}

                <div id="recaptcha-container" />
            </div>
        </div>
    );
}
