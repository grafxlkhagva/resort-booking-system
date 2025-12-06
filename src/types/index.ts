export type UserRole = 'admin' | 'user';

export interface UserProfile {
    uid: string;
    email: string;
    firstName?: string;
    lastName?: string;
    displayName?: string; // Computed or from Auth
    phoneNumber?: string; // Phone number for OTP verification
    phoneVerified?: boolean; // Whether phone is verified
    role?: UserRole; // Optional because it might be missing in DB
    createdAt: number;
}

export interface Amenity {
    id: string;
    name: string;
    imageUrl: string;
    totalQuantity: number;
    createdAt: number;
}

export interface HouseAmenity {
    amenityId: string;
    quantity: number;
}

export interface House {
    id: string;
    name: string;
    houseNumber: number; // New field
    description: string;
    longDescription?: string;
    price: number;
    capacity: number;
    imageUrl: string;
    images?: string[];
    amenities: HouseAmenity[]; // Changed from string[] to support quantity
    createdAt: number;
    discount?: {
        price: number;
        startDate?: number;
        endDate?: number;
        validDays?: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
        label?: string;
        isActive?: boolean;
    };
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled';

export interface Booking {
    id: string;
    userId: string;
    houseId: string;
    houseName: string; // Denormalized for easier display
    startDate: number; // Timestamp
    endDate: number;   // Timestamp
    totalPrice: number;
    status: BookingStatus;
    createdAt: number;
    guestCount: number;
}

export interface ResortSettings {
    map: {
        lat: number;
        lng: number;
        zoom: number;
    };
    contact: {
        phone: string;
        email: string;
        address: string;
    };
    cover: {
        imageUrl: string;
        title: string;
        subtitle: string;
    };
    branding: {
        siteName: string;
        siteNameColor: string;
        logoUrl: string;
        showLogo: boolean;
        showName: boolean;
    };
}

export interface Review {
    id: string;
    houseId: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    rating: number; // 1-5
    comment: string;
    createdAt: number;
}
