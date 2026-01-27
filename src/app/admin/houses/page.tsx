"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { House } from "@/types";
import HouseForm from "@/components/admin/HouseForm";
import ConfirmationModal from "@/components/ui/ConfirmationModal";
import { Plus, Edit, Trash2 } from "lucide-react";

export default function ManageHouses() {
    const { isAdmin, loading: authLoading } = useAuth();
    const [houses, setHouses] = useState<House[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentHouse, setCurrentHouse] = useState<House | null>(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [houseToDelete, setHouseToDelete] = useState<string | null>(null);

    const fetchHouses = async () => {
        try {
            const housesCollection = collection(db, "accommodations");
            const houseSnapshot = await getDocs(housesCollection);
            const houseList = houseSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    name: data.name,
                    houseNumber: data.houseNumber || 0,
                    description: data.description,
                    longDescription: data.longDescription,
                    price: data.pricePerNight || 0,
                    capacity: data.capacity || 4,
                    imageUrl: data.featuredImage || "",
                    images: data.images || [],
                    amenities: data.amenities || [],
                    createdAt: data.createdAt?.seconds ? data.createdAt.seconds * 1000 : Date.now(),
                    discount: data.discount || undefined,
                    localizedNames: data.localizedNames || {},
                    localizedDescriptions: data.localizedDescriptions || {},
                    localizedLongDescriptions: data.localizedLongDescriptions || {},
                } as House;
            });
            setHouses(houseList);
        } catch (error) {
            console.error("Error fetching houses:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAdmin) {
            fetchHouses();
        }
    }, [isAdmin]);

    const handleSave = async (data: Omit<House, "id" | "createdAt">) => {
        try {
            const baseData = {
                name: data.name,
                houseNumber: data.houseNumber,
                description: data.description,
                longDescription: data.longDescription || "",
                pricePerNight: data.price,
                capacity: data.capacity,
                featuredImage: data.imageUrl,
                images: data.images || [],
                amenities: data.amenities,
                discount: data.discount,
                localizedNames: data.localizedNames || {},
                localizedDescriptions: data.localizedDescriptions || {},
                localizedLongDescriptions: data.localizedLongDescriptions || {},
            };

            if (currentHouse) {
                const houseRef = doc(db, "accommodations", currentHouse.id);
                await updateDoc(houseRef, baseData);
            } else {
                const housesCollection = collection(db, "accommodations");
                await addDoc(housesCollection, { ...baseData, createdAt: serverTimestamp() });
            }
            alert("Амжилттай хадгалагдлаа!");
            setIsEditing(false);
            setCurrentHouse(null);
            fetchHouses();
        } catch (error) {
            console.error("Error saving house:", error);
            alert("Error saving house. Check console for details.");
        }
    };

    const confirmDelete = (id: string) => {
        setHouseToDelete(id);
        setDeleteModalOpen(true);
    };

    const handleDelete = async () => {
        if (!houseToDelete) return;
        console.log("Deleting house with ID:", houseToDelete);
        try {
            await deleteDoc(doc(db, "accommodations", houseToDelete));
            console.log("House deleted successfully");
            fetchHouses();
        } catch (error: any) {
            console.error("Error deleting house:", error);
            alert(`Байшинг устгахад алдаа гарлаа: ${error.message || error.code}`);
        }
    };

    if (authLoading || loading) return <div className="p-8 text-center">Loading...</div>;
    if (!isAdmin) return <div className="p-8 text-center">Access Denied</div>;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Байшин Удирдах</h1>
                {!isEditing && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                        <Plus size={20} className="mr-2" />
                        Байшин Нэмэх
                    </button>
                )}
            </div>

            {isEditing ? (
                <HouseForm
                    initialData={currentHouse}
                    onSubmit={handleSave}
                    onCancel={() => {
                        setIsEditing(false);
                        setCurrentHouse(null);
                    }}
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {houses.map((house) => (
                        <div key={house.id} className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
                            <img src={house.imageUrl} alt={house.name} className="w-full h-48 object-cover" />
                            <div className="p-4">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    <span className="mr-2 text-indigo-600">#{house.houseNumber}</span>
                                    {house.name}
                                </h3>
                                <p className="text-gray-600 mt-1 text-sm line-clamp-2">{house.description}</p>
                                <div className="mt-4 flex justify-between items-center">
                                    <span className="text-indigo-600 font-bold">${house.price}/хоног</span>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => {
                                                setCurrentHouse(house);
                                                setIsEditing(true);
                                            }}
                                            className="p-2 text-gray-400 hover:text-indigo-600"
                                        >
                                            <Edit size={20} />
                                        </button>
                                        <button
                                            onClick={() => confirmDelete(house.id)}
                                            className="p-2 text-gray-400 hover:text-red-600"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <ConfirmationModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={handleDelete}
                title="Байшин устгах"
                message="Та энэ байшинг устгахдаа итгэлтэй байна уу? Энэ үйлдлийг буцаах боломжгүй."
            />
        </div>
    );
}
