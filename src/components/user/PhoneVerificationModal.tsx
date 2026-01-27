"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { X, Phone } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface PhoneVerificationModalProps {
    userId: string;
    onVerified: (phoneNumber: string) => void;
    onClose: () => void;
}

export default function PhoneVerificationModal({ userId, onVerified, onClose }: PhoneVerificationModalProps) {
    const [step, setStep] = useState<"phone" | "otp">("phone");
    const [phoneNumber, setPhoneNumber] = useState("+976");
    const [otp, setOtp] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
    const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);
    const { t } = useLanguage();

    useEffect(() => {
        // Initialize reCAPTCHA after component mounts and DOM is ready
        const initRecaptcha = () => {
            const container = document.getElementById('recaptcha-container');
            if (!container) {
                console.error('reCAPTCHA container not found');
                return;
            }

            if (!recaptchaVerifier) {
                try {
                    const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                        'size': 'normal',
                        'callback': () => {
                            console.log('reCAPTCHA solved');
                        },
                        'expired-callback': () => {
                            console.log('reCAPTCHA expired');
                            setError(t('recaptcha_expired', 'reCAPTCHA хугацаа дууссан. Дахин оролдоно уу.'));
                        }
                    });
                    setRecaptchaVerifier(verifier);
                } catch (error) {
                    console.error("reCAPTCHA initialization error:", error);
                    setError(t('booking_error', 'reCAPTCHA эхлүүлэхэд алдаа гарлаа.'));
                }
            }
        };

        // Delay initialization to ensure DOM is ready
        const timer = setTimeout(initRecaptcha, 100);

        return () => {
            clearTimeout(timer);
            if (recaptchaVerifier) {
                try {
                    recaptchaVerifier.clear();
                } catch (e) {
                    console.error("Error clearing reCAPTCHA:", e);
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
        } catch (err: unknown) {
            console.error("Error sending OTP:", err);
            const errorObj = err as { code?: string };
            if (errorObj.code === 'auth/invalid-phone-number') {
                setError(t('otp_invalid_error', 'Утасны дугаар буруу байна.'));
            } else if (errorObj.code === 'auth/too-many-requests') {
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
            await confirmationResult.confirm(otp);

            // Save phone number to user profile
            await updateDoc(doc(db, "users", userId), {
                phoneNumber,
                phoneVerified: true
            });

            onVerified(phoneNumber);
        } catch (err: unknown) {
            console.error("Error verifying OTP:", err);
            const errorObj = err as { code?: string };
            if (errorObj.code === 'auth/invalid-verification-code') {
                setError(t('otp_invalid_error', 'Код буруу байна. Дахин оролдоно уу.'));
            } else if (errorObj.code === 'auth/code-expired') {
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-500"
                >
                    <X size={24} />
                </button>

                <div className="text-center mb-6">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 mb-4">
                        <Phone className="h-6 w-6 text-indigo-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">
                        {step === "phone" ? t('verify_phone_title', 'Утасны дугаар баталгаажуулах') : t('otp_label', 'Баталгаажуулах код')}
                    </h2>
                    <p className="text-sm text-gray-500 mt-2">
                        {step === "phone"
                            ? t('verify_phone_subtitle', 'Захиалга баталгаажуулахын тулд утасны дугаараа оруулна уу.')
                            : t('verify_otp_subtitle', `${phoneNumber} дугаар руу илгээсэн 6 оронтой кодыг оруулна уу.`, { phone: phoneNumber })}
                    </p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
                        {error}
                    </div>
                )}

                {step === "phone" ? (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('phone_label', 'Утасны дугаар')}
                            </label>
                            <input
                                type="tel"
                                placeholder="+97699123456"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                disabled={loading}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                {t('phone_label_hint', 'Монгол')}: +976 99123456
                            </p>
                        </div>

                        <button
                            onClick={sendOTP}
                            disabled={loading}
                            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? t('sending', 'Илгээж байна...') : t('get_code', 'Код авах')}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('otp_label', 'Баталгаажуулах код')}
                            </label>
                            <input
                                type="text"
                                placeholder="123456"
                                maxLength={6}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                disabled={loading}
                                autoFocus
                            />
                        </div>

                        <button
                            onClick={verifyOTP}
                            disabled={loading || otp.length !== 6}
                            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? t('verifying', 'Баталгаажуулж байна...') : t('verify_title', 'Баталгаажуулах')}
                        </button>

                        <button
                            onClick={resendOTP}
                            disabled={loading}
                            className="w-full text-indigo-600 py-2 px-4 rounded-md hover:bg-indigo-50 disabled:opacity-50 transition-colors text-sm"
                        >
                            {t('resend_code', 'Код дахин авах')}
                        </button>
                    </div>
                )}

                {/* reCAPTCHA container - must be visible */}
                <div id="recaptcha-container" className="mt-4 flex justify-center"></div>
            </div>
        </div>
    );
}
