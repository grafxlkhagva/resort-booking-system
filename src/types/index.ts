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

export type HouseStatus = 'clean' | 'dirty' | 'cleaning' | 'occupied' | 'maintenance';

export interface House {
    id: string;
    name: string;
    houseNumber: number;
    description: string;
    longDescription?: string;
    price: number;
    capacity: number;
    imageUrl: string;
    images?: string[];
    amenities: HouseAmenity[];
    createdAt: number;
    status?: HouseStatus; // Default: 'clean'
    currentGuest?: {
        name: string;
        phone: string;
        bookingId: string;
        checkOutDate: number; // For showing when they leave
    };
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
    userId?: string; // Made optional for manual bookings
    guestDetails?: { // For manual bookings
        firstName: string;
        lastName: string;
        phoneNumber: string;
        email?: string | null;
    };
    houseId: string;
    houseName: string;
    startDate: number;
    endDate: number;
    totalPrice: number;
    status: BookingStatus;
    createdAt: number;
    guestCount: number;
    paymentType?: 'full' | 'partial' | 'barter' | 'custom'; // New for manual/barter types
    barterDescription?: string | null; // For barter details
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
    branding?: {
        siteName: string;
        siteNameColor: string;
        logoUrl: string;
        showLogo: boolean;
        showName: boolean;
    };
    social?: {
        facebook: string;
        instagram: string;
    };
    bookingControl?: {
        isBlocked: boolean;
        blockStartDate?: number;
        blockEndDate?: number;
        notificationPhone?: string;
        notificationPhoneVerified?: boolean;
    }
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
