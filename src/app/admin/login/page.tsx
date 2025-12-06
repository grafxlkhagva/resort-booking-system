"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Shield, Eye, EyeOff } from "lucide-react";

export default function AdminLoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            // Sign in with email/password
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Check if user has admin role
            const userDoc = await getDoc(doc(db, "users", user.uid));

            if (!userDoc.exists()) {
                await auth.signOut();
                setError("Хэрэглэгч олдсонгүй.");
                return;
            }

            const userData = userDoc.data();

            if (userData.role !== 'admin') {
                await auth.signOut();
                setError("Та админ эрхгүй байна. Энгийн хэрэглэгчийн нэвтрэлт ашиглана уу.");
                return;
            }

            // Redirect to admin dashboard
            router.push("/admin");
        } catch (err: any) {
            console.error("Login error:", err);
            if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                setError("Имэйл эсвэл нууц үг буруу байна.");
            } else if (err.code === 'auth/too-many-requests') {
                setError("Хэт олон оролдлого хийсэн байна. Түр хүлээгээд дахин оролдоно уу.");
            } else {
                setError("Нэвтрэхэд алдаа гарлаа. Дахин оролдоно уу.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
            <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-2xl shadow-2xl border border-gray-200">
                <div className="text-center">
                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gray-900 mb-4">
                        <Shield className="h-8 w-8 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900">
                        Админ нэвтрэх
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Зөвхөн админ эрхтэй хэрэглэгчид нэвтрэх боломжтой
                    </p>
                </div>

                {error && (
                    <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm border border-red-200">
                        {error}
                    </div>
                )}

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Имэйл хаяг
                            </label>
                            <input
                                type="email"
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                                placeholder="admin@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={loading}
                            />
                        </div>
                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Нууц үг
                            </label>
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent pr-12"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                            />
                            <button
                                type="button"
                                className="absolute right-3 top-11 text-gray-400 hover:text-gray-600"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? (
                                    <EyeOff className="h-5 w-5" />
                                ) : (
                                    <Eye className="h-5 w-5" />
                                )}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gray-900 text-white py-3 px-4 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                        {loading ? "Нэвтэрч байна..." : "Нэвтрэх"}
                    </button>

                    <p className="text-center text-xs text-gray-500 mt-4">
                        Энгийн хэрэглэгч бол{" "}
                        <a href="/login" className="text-indigo-600 hover:text-indigo-500 font-medium">
                            энд дарж нэвтрэнэ үү
                        </a>
                    </p>
                </form>
            </div>
        </div>
    );
}
