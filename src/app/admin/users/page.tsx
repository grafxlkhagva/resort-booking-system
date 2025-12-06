"use client";

import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { UserProfile } from "@/types";
import { Search, Shield, ShieldOff, User, Phone, Mail, Calendar } from "lucide-react";

interface UserWithStats extends UserProfile {
    bookingsCount?: number;
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<UserWithStats[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<UserWithStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedUser, setSelectedUser] = useState<UserWithStats | null>(null);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [newAdminEmail, setNewAdminEmail] = useState("");
    const [newAdminPassword, setNewAdminPassword] = useState("");
    const [modalLoading, setModalLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        // Filter users based on search query
        if (!searchQuery.trim()) {
            setFilteredUsers(users);
            return;
        }

        const query = searchQuery.toLowerCase();
        const filtered = users.filter(user =>
            (user.displayName?.toLowerCase().includes(query)) ||
            (user.email?.toLowerCase().includes(query)) ||
            (user.phoneNumber?.toLowerCase().includes(query))
        );
        setFilteredUsers(filtered);
    }, [searchQuery, users]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const usersSnapshot = await getDocs(
                query(collection(db, "users"), orderBy("createdAt", "desc"))
            );

            const usersData: UserWithStats[] = [];

            for (const userDoc of usersSnapshot.docs) {
                const userData = userDoc.data() as UserProfile;

                // Count bookings for this user
                const bookingsSnapshot = await getDocs(
                    query(collection(db, "bookings"))
                );
                const bookingsCount = bookingsSnapshot.docs.filter(
                    doc => doc.data().userId === userData.uid
                ).length;

                usersData.push({
                    ...userData,
                    bookingsCount
                });
            }

            setUsers(usersData);
            setFilteredUsers(usersData);
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleGrantAdmin = async (user: UserWithStats) => {
        setSelectedUser(user);
        if (user.email) {
            // User already has email, just update role
            await updateUserRole(user.uid, 'admin');
        } else {
            // Need to set email and password
            setShowPasswordModal(true);
        }
    };

    const handleRevokeAdmin = async (userId: string) => {
        if (confirm("Энэ хэрэглэгчийн админ эрхийг хасах уу?")) {
            await updateUserRole(userId, 'user');
        }
    };

    const updateUserRole = async (userId: string, role: 'admin' | 'user') => {
        try {
            await updateDoc(doc(db, "users", userId), { role });
            await fetchUsers();
            alert(role === 'admin' ? "Админ эрх амжилттай олгогдлоо!" : "Админ эрх амжилттай хасагдлаа!");
        } catch (error) {
            console.error("Error updating role:", error);
            alert("Алдаа гарлаа. Дахин оролдоно уу.");
        }
    };

    const handleCreateAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;

        setModalLoading(true);
        setError("");

        try {
            // Create Firebase Auth user with email/password
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                newAdminEmail,
                newAdminPassword
            );

            // Update Firestore document with email and admin role
            await updateDoc(doc(db, "users", selectedUser.uid), {
                email: newAdminEmail,
                role: 'admin'
            });

            setShowPasswordModal(false);
            setNewAdminEmail("");
            setNewAdminPassword("");
            setSelectedUser(null);
            await fetchUsers();
            alert("Админ эрх амжилттай олгогдлоо!");
        } catch (err: any) {
            console.error("Error creating admin:", err);
            if (err.code === 'auth/email-already-in-use') {
                setError("Энэ имэйл хаяг аль хэдийн ашиглагдаж байна.");
            } else {
                setError("Алдаа гарлаа. Дахин оролдоно уу.");
            }
        } finally {
            setModalLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-gray-600">Ачааллаж байна...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Хэрэглэгч удирдах</h1>
                    <p className="mt-2 text-sm text-gray-600">
                        Бүх хэрэглэгчдийг харах, админ эрх олгох/хасах
                    </p>
                </div>

                {/* Search */}
                <div className="mb-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Нэр, имэйл, утасны дугаараар хайх..."
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <User className="w-8 h-8 text-indigo-600" />
                            <div className="ml-4">
                                <p className="text-sm text-gray-600">Нийт хэрэглэгч</p>
                                <p className="text-2xl font-bold text-gray-900">{users.length}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <Shield className="w-8 h-8 text-green-600" />
                            <div className="ml-4">
                                <p className="text-sm text-gray-600">Админууд</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {users.filter(u => u.role === 'admin').length}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <User className="w-8 h-8 text-blue-600" />
                            <div className="ml-4">
                                <p className="text-sm text-gray-600">Энгийн хэрэглэгч</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {users.filter(u => u.role !== 'admin').length}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Users Table */}
                <div className="bg-white shadow rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Хэрэглэгч
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Холбоо барих
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Эрх
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Захиалга
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Үйлдэл
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredUsers.map((user) => (
                                <tr key={user.uid} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                                <User className="w-5 h-5 text-indigo-600" />
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {user.displayName || "Нэр байхгүй"}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {new Date(user.createdAt).toLocaleDateString('mn-MN')}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">
                                            {user.phoneNumber && (
                                                <div className="flex items-center mb-1">
                                                    <Phone className="w-4 h-4 mr-2 text-gray-400" />
                                                    {user.phoneNumber}
                                                </div>
                                            )}
                                            {user.email && (
                                                <div className="flex items-center">
                                                    <Mail className="w-4 h-4 mr-2 text-gray-400" />
                                                    {user.email}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {user.role === 'admin' ? (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                <Shield className="w-3 h-3 mr-1" />
                                                Админ
                                            </span>
                                        ) : (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                                Хэрэглэгч
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {user.bookingsCount || 0} захиалга
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        {user.role === 'admin' ? (
                                            <button
                                                onClick={() => handleRevokeAdmin(user.uid)}
                                                className="text-red-600 hover:text-red-900 flex items-center"
                                            >
                                                <ShieldOff className="w-4 h-4 mr-1" />
                                                Эрх хасах
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleGrantAdmin(user)}
                                                className="text-indigo-600 hover:text-indigo-900 flex items-center"
                                            >
                                                <Shield className="w-4 h-4 mr-1" />
                                                Админ болгох
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {filteredUsers.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            Хэрэглэгч олдсонгүй
                        </div>
                    )}
                </div>
            </div>

            {/* Set Admin Password Modal */}
            {showPasswordModal && selectedUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-md w-full p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">
                            Админ эрх олгох
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                            {selectedUser.displayName || "Энэ хэрэглэгч"}-д админ эрх олгохын тулд имэйл болон нууц үг тохируулна уу.
                        </p>

                        {error && (
                            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleCreateAdmin} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Имэйл хаяг
                                </label>
                                <input
                                    type="email"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={newAdminEmail}
                                    onChange={(e) => setNewAdminEmail(e.target.value)}
                                    disabled={modalLoading}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Нууц үг
                                </label>
                                <input
                                    type="password"
                                    required
                                    minLength={6}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={newAdminPassword}
                                    onChange={(e) => setNewAdminPassword(e.target.value)}
                                    disabled={modalLoading}
                                />
                                <p className="text-xs text-gray-500 mt-1">Хамгийн багадаа 6 тэмдэгт</p>
                            </div>

                            <div className="flex space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowPasswordModal(false);
                                        setNewAdminEmail("");
                                        setNewAdminPassword("");
                                        setSelectedUser(null);
                                        setError("");
                                    }}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                                    disabled={modalLoading}
                                >
                                    Цуцлах
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                                    disabled={modalLoading}
                                >
                                    {modalLoading ? "Боловсруулж байна..." : "Админ эрх олгох"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
