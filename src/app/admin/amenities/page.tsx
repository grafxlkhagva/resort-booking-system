"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db, storage } from "@/lib/firebase";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Amenity, House } from "@/types";
import ConfirmationModal from "@/components/ui/ConfirmationModal";
import { Plus, Edit, Trash2, Upload, Image as ImageIcon, Package } from "lucide-react";

export default function ManageAmenities() {
    const { isAdmin, loading: authLoading } = useAuth();
    const [amenities, setAmenities] = useState<Amenity[]>([]);
    const [houses, setHouses] = useState<House[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentAmenity, setCurrentAmenity] = useState<Amenity | null>(null);
    const [formData, setFormData] = useState({ name: "", imageUrl: "", totalQuantity: 0 });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [amenityToDelete, setAmenityToDelete] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            const [amenitiesSnapshot, housesSnapshot] = await Promise.all([
                getDocs(collection(db, "amenities")),
                getDocs(collection(db, "accommodations"))
            ]);

            const amenitiesList = amenitiesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Amenity[];

            const housesList = housesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as House[];

            setAmenities(amenitiesList);
            setHouses(housesList);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAdmin) {
            fetchData();
        }
    }, [isAdmin]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setImageFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setUploading(true);
        try {
            let imageUrl = formData.imageUrl;

            if (imageFile) {
                const storageRef = ref(storage, `amenities/${Date.now()}_${imageFile.name}`);
                await uploadBytes(storageRef, imageFile);
                imageUrl = await getDownloadURL(storageRef);
            }

            const dataToSave = {
                name: formData.name,
                imageUrl: imageUrl,
                totalQuantity: Number(formData.totalQuantity),
                createdAt: (currentAmenity && currentAmenity.createdAt) ? currentAmenity.createdAt : Date.now()
            };

            if (currentAmenity) {
                await updateDoc(doc(db, "amenities", currentAmenity.id), dataToSave);
            } else {
                await addDoc(collection(db, "amenities"), dataToSave);
            }
            alert("Амжилттай хадгалагдлаа!");
            setIsEditing(false);
            setCurrentAmenity(null);
            setFormData({ name: "", imageUrl: "", totalQuantity: 0 });
            setImageFile(null);
            fetchData();
        } catch (error) {
            console.error("Error saving amenity:", error);
            alert("Failed to save amenity");
        } finally {
            setUploading(false);
        }
    };

    const handleEdit = (amenity: Amenity) => {
        setCurrentAmenity(amenity);
        setFormData({
            name: amenity.name,
            imageUrl: amenity.imageUrl,
            totalQuantity: amenity.totalQuantity || 0
        });
        setImageFile(null);
        setIsEditing(true);
    };

    const confirmDelete = (id: string) => {
        setAmenityToDelete(id);
        setDeleteModalOpen(true);
    };

    const handleDelete = async () => {
        if (!amenityToDelete) return;
        try {
            await deleteDoc(doc(db, "amenities", amenityToDelete));
            fetchData();
        } catch (error) {
            console.error("Error deleting amenity:", error);
            alert("Failed to delete amenity");
        }
    };

    const getAssignedCount = (amenityId: string) => {
        let count = 0;
        houses.forEach(house => {
            if (house.amenities) {
                // Handle both old (string[]) and new (HouseAmenity[]) structures
                if (Array.isArray(house.amenities)) {
                    house.amenities.forEach((a: any) => {
                        if (typeof a === 'string') {
                            if (a === amenityId) count += 1;
                        } else if (a.amenityId === amenityId) {
                            count += (a.quantity || 1);
                        }
                    });
                }
            }
        });
        return count;
    };

    if (authLoading || loading) return <div className="p-8 text-center">Loading...</div>;
    if (!isAdmin) return <div className="p-8 text-center">Access Denied</div>;

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Тавилга / Тоног төхөөрөмж</h1>
                {!isEditing && (
                    <button
                        onClick={() => {
                            setFormData({ name: "", imageUrl: "", totalQuantity: 0 });
                            setImageFile(null);
                            setIsEditing(true);
                        }}
                        className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                        <Plus size={20} className="mr-2" />
                        Нэмэх
                    </button>
                )}
            </div>

            {isEditing && (
                <div className="bg-white p-6 rounded-lg shadow mb-8">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                        {currentAmenity ? "Засах" : "Шинэ нэмэх"}
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Нэр</label>
                                <input
                                    type="text"
                                    required
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                    value={formData.name || ""}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Нийт Тоо</label>
                                <input
                                    type="number"
                                    min="0"
                                    required
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                    value={formData.totalQuantity || 0}
                                    onChange={(e) => setFormData({ ...formData, totalQuantity: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Зураг</label>
                            <div className="mt-1 flex items-center space-x-4">
                                {(imageFile || formData.imageUrl) && (
                                    <div className="relative w-16 h-16 border rounded overflow-hidden bg-gray-50">
                                        <img
                                            src={imageFile ? URL.createObjectURL(imageFile) : formData.imageUrl}
                                            alt="Preview"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsEditing(false);
                                    setCurrentAmenity(null);
                                }}
                                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                            >
                                Болих
                            </button>
                            <button
                                type="submit"
                                disabled={uploading}
                                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 flex items-center"
                            >
                                {uploading ? (
                                    <>
                                        <Upload className="animate-spin -ml-1 mr-2 h-4 w-4" />
                                        Хадгалж байна...
                                    </>
                                ) : "Хадгалах"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Зураг / Нэр
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Нийт
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Хуваарилсан
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Үлдэгдэл
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Огноо
                            </th>
                            <th scope="col" className="relative px-6 py-3">
                                <span className="sr-only">Edit</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {amenities.map((amenity) => {
                            const assigned = getAssignedCount(amenity.id);
                            const total = amenity.totalQuantity || 0;
                            const remaining = total - assigned;

                            return (
                                <tr key={amenity.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10">
                                                {amenity.imageUrl ? (
                                                    <img className="h-10 w-10 rounded-full object-cover" src={amenity.imageUrl} alt="" />
                                                ) : (
                                                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                                        <ImageIcon className="h-5 w-5 text-gray-500" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">{amenity.name}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900 font-bold">{total}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-blue-600 font-medium">{assigned}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${remaining > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {remaining}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {amenity.createdAt ? new Date(amenity.createdAt).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button onClick={() => handleEdit(amenity)} className="text-indigo-600 hover:text-indigo-900 mr-4">
                                            <Edit size={18} />
                                        </button>
                                        <button onClick={() => confirmDelete(amenity.id)} className="text-red-600 hover:text-red-900">
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {amenities.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                                    Одоогоор бүртгэлтэй зүйл алга.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <ConfirmationModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={handleDelete}
                title="Устгах"
                message="Та үүнийг устгахдаа итгэлтэй байна уу?"
            />
        </div>
    );
}
