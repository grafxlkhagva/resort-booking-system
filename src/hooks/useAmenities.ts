import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Amenity } from '@/types';

export const useAmenities = () => {
    const [amenities, setAmenities] = useState<Amenity[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAmenities = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, 'amenities'));
                const amenitiesData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Amenity[];
                setAmenities(amenitiesData);
            } catch (error) {
                console.error("Error fetching amenities:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAmenities();
    }, []);

    const getAmenityName = (id: string) => {
        const amenity = amenities.find(a => a.id === id);
        return amenity ? amenity.name : id;
    };

    return { amenities, loading, getAmenityName };
};
