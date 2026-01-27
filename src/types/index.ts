export type UserRole = 'admin' | 'user';

export interface Language {
    id: string; // 'mn', 'en', 'ru', 'zh', 'ko'
    name: string;
    isActive: boolean;
    flag?: string;
}

export type LocalizedText = Record<string, string>;

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
    // Localized fields
    localizedNames?: LocalizedText;
    localizedDescriptions?: LocalizedText;
    localizedLongDescriptions?: LocalizedText;
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
    channelMappings?: {
        [key: string]: {
            roomId: string;
            rateId?: string;
            isSyncing: boolean;
        };
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
    checkInDate?: Date; // Added for operations view (client-side converted)
    checkOutDate?: Date; // Added for operations view (client-side converted)
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
    };
    telegram?: {
        botToken: string;
        chatId: string;
        isActive: boolean;
        webhookSecret?: string;
        webhookUrl?: string;
    };
    payment?: {
        bankName: string;
        accountNumber: string;
        accountName: string;
        qrImageUrl?: string;
    };
    channelManager?: {
        isActive: boolean;
        provider: 'booking.com';
        hotelId: string;
        username: string;
        password?: string; // stored securely or just for API mocking
    };
    restaurant?: {
        isActive: boolean;
        openTime: string; // "09:00"
        closeTime: string; // "22:00"
        deliveryEnabled: boolean;
        minOrderAmount?: number;
    };
    languages?: {
        activeLanguages: string[]; // ['mn', 'en', ...]
        defaultLanguage: string; // 'mn'
    };
}

export interface MenuCategory {
    id: string;
    name: string;
    order: number;
    isActive: boolean;
    localizedNames?: LocalizedText;
}

export interface MenuItem {
    id: string;
    categoryId: string;
    name: string;
    description: string;
    price: number;
    imageUrl?: string;
    isAvailable: boolean;
    localizedNames?: LocalizedText;
    localizedDescriptions?: LocalizedText;
    tags?: string[]; // 'spicy', 'vegetarian', etc.
    createdAt: number;
}

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';

export interface OrderItem {
    menuItemId: string;
    name: string; // Snapshot of name at time of order
    price: number; // Snapshot of price
    quantity: number;
    notes?: string;
}

export interface Order {
    id: string;
    userId: string;
    userPhone?: string; // Contact for the order
    guestName?: string;
    items: OrderItem[];
    totalAmount: number;
    status: OrderStatus;
    deliveryType: 'house' | 'pickup';
    houseId?: string; // If deliveryType is house
    houseName?: string; // For easy display
    createdAt: number;
    updatedAt: number;
    note?: string; // General order note
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

// Telegram Bot Types
export interface TelegramUser {
    id: number;
    is_bot: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
}

export interface TelegramChat {
    id: number;
    type: 'private' | 'group' | 'supergroup' | 'channel';
    title?: string;
    username?: string;
    first_name?: string;
    last_name?: string;
}

export interface TelegramMessage {
    message_id: number;
    from?: TelegramUser;
    chat: TelegramChat;
    date: number;
    text?: string;
    contact?: {
        phone_number: string;
        first_name: string;
        last_name?: string;
        user_id?: number;
    };
}

export interface TelegramCallbackQuery {
    id: string;
    from: TelegramUser;
    message?: TelegramMessage;
    chat_instance: string;
    data?: string;
}

export interface TelegramUpdate {
    update_id: number;
    message?: TelegramMessage;
    callback_query?: TelegramCallbackQuery;
}

export interface TelegramInlineButton {
    text: string;
    url?: string;
    callback_data?: string;
}

export type TelegramInlineKeyboard = TelegramInlineButton[][];
