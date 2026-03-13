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
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900">
            <div className="card w-full max-w-md p-6 sm:p-8 space-y-6">
                <div className="text-center">
                    <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-slate-900 text-white mb-4">
                        <Shield className="h-7 w-7" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-[var(--foreground)]">Админ нэвтрэх</h2>
                    <p className="mt-2 text-sm text-[var(--muted)]">Зөвхөн админ эрхтэй хэрэглэгчид</p>
                </div>

                {error && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm border border-red-100">{error}</div>}

                <form className="space-y-5" onSubmit={handleSubmit}>
                    <div>
                        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Имэйл</label>
                        <input
                            type="email"
                            required
                            className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--card)] focus:outline-none focus:ring-2 focus:ring-slate-900"
                            placeholder="admin@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={loading}
                        />
                    </div>
                    <div className="relative">
                        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Нууц үг</label>
                        <input
                            type={showPassword ? "text" : "password"}
                            required
                            className="w-full px-4 py-3 pr-12 rounded-xl border border-[var(--border)] bg-[var(--card)] focus:outline-none focus:ring-2 focus:ring-slate-900"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                        />
                        <button
                            type="button"
                            className="absolute right-3 top-10 text-[var(--muted)] hover:text-[var(--foreground)] touch-target flex items-center justify-center"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? "Нууц үг нуух" : "Нууц үг харуулах"}
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>

                    <button type="submit" disabled={loading} className="btn-primary w-full bg-slate-900 hover:bg-slate-800">
                        {loading ? "Нэвтэрч байна…" : "Нэвтрэх"}
                    </button>

                    <p className="text-center text-sm text-[var(--muted)]">
                        Энгийн хэрэглэгч{" "}
                        <a href="/login" className="text-[var(--primary)] font-medium hover:underline">
                            энд дарна уу
                        </a>
                    </p>
                </form>
            </div>
        </div>
    );
}
