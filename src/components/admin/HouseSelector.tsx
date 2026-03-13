import { House } from "@/types";
import { Check } from "lucide-react";

interface HouseSelectorProps {
    houses: House[];
    selectedHouseId: string | null;
    onSelect: (houseId: string | null) => void;
}

export default function HouseSelector({ houses, selectedHouseId, onSelect }: HouseSelectorProps) {
    return (
        <div className="mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-3">Байшин сонгох</h2>
            <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide">
                {/* Option to view all */}
                <div
                    onClick={() => onSelect(null)}
                    className={`flex-shrink-0 w-40 p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedHouseId === null
                            ? "border-indigo-600 bg-indigo-50 shadow-md"
                            : "border-gray-200 bg-white hover:border-indigo-300"
                        }`}
                >
                    <div className="h-20 flex items-center justify-center bg-gray-100 rounded-lg mb-2 text-gray-400">
                        <span className="text-xl font-bold">Бүгд</span>
                    </div>
                    <div className="font-medium text-gray-900 truncate">Бүх байшин</div>
                    <div className="text-xs text-gray-500">Нэгдсэн хуваарь</div>
                </div>

                {houses.map((house) => (
                    <div
                        key={house.id}
                        onClick={() => onSelect(house.id)}
                        className={`flex-shrink-0 w-48 p-3 rounded-xl border-2 cursor-pointer transition-all relative ${selectedHouseId === house.id
                                ? "border-indigo-600 bg-indigo-50 shadow-md"
                                : "border-gray-200 bg-white hover:border-indigo-300"
                            }`}
                    >
                        {selectedHouseId === house.id && (
                            <div className="absolute top-2 right-2 bg-indigo-600 text-white p-1 rounded-full">
                                <Check size={12} />
                            </div>
                        )}
                        {house.imageUrl ? (
                            <img
                                src={house.imageUrl}
                                alt={house.name}
                                className="w-full h-24 object-cover rounded-lg mb-2"
                            />
                        ) : (
                            <div className="w-full h-24 bg-gray-200 rounded-lg mb-2 flex items-center justify-center text-gray-400">
                                No Image
                            </div>
                        )}
                        <div className="font-medium text-gray-900 truncate" title={house.name}>
                            {house.name}
                        </div>
                        <div className="flex justify-between items-center text-xs text-gray-500">
                            <span>{house.capacity} хүн</span>
                            <span className="font-semibold text-indigo-600">${house.price}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
