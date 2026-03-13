import { House } from "@/types";

export const isDiscountActive = (discount?: House['discount']): boolean => {
    if (!discount || !discount.price || discount.price <= 0) return false;
    if (discount.isActive === false) return false;

    const now = Date.now();

    // Check date range
    if (discount.startDate && now < discount.startDate) return false;
    if (discount.endDate && now > discount.endDate) return false;

    // Check specific days
    // 0=Sun, 1=Mon, ..., 6=Sat
    if (discount.validDays && discount.validDays.length > 0) {
        const day = new Date().getDay();
        if (!discount.validDays.includes(day)) return false;
    }

    return true;
};

export const formatValidDays = (validDays?: number[]) => {
    if (!validDays || validDays.length === 0) return "";
    const dayNames = ['Ням', 'Дав', 'Мяг', 'Лха', 'Пүр', 'Баа', 'Бям'];
    return validDays.sort().map(d => dayNames[d]).join(", ");
};

export const getDiscountStatus = (discount?: House['discount']) => {
    if (!discount || !discount.price || discount.price <= 0) return { status: "none", label: "Хямдралгүй" };
    if (discount.isActive === false) return { status: "disabled", label: "Идэвхгүй" };

    const now = Date.now();
    if (discount.startDate && now < discount.startDate) return { status: "scheduled", label: "Эхлээгүй байна" };
    if (discount.endDate && now > discount.endDate) return { status: "expired", label: "Хугацаа дууссан" };

    return { status: "active", label: "Идэвхтэй" };
};

export const formatPrice = (price: number) => {
    return new Intl.NumberFormat('mn-MN', { style: 'currency', currency: 'MNT' }).format(price).replace("₮", "₮ ");
};

export interface BookingPriceBreakdown {
    totalDays: number;
    regularDays: number;
    discountedDays: number;
    basePrice: number;
    discountAmount: number;
    totalPrice: number;
}

export const calculateBookingPrice = (
    startDate: Date,
    endDate: Date,
    house: House
): BookingPriceBreakdown => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Calculate total days
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (totalDays <= 0) {
        return {
            totalDays: 0,
            regularDays: 0,
            discountedDays: 0,
            basePrice: 0,
            discountAmount: 0,
            totalPrice: 0
        };
    }

    let regularDays = 0;
    let discountedDays = 0;
    let totalPrice = 0;

    const discount = house.discount;
    const hasDiscount = discount && discount.price > 0 && discount.isActive !== false;

    // Iterate through each day
    for (let i = 0; i < totalDays; i++) {
        const currentDate = new Date(start);
        currentDate.setDate(start.getDate() + i);
        const currentTimestamp = currentDate.getTime();
        const currentDay = currentDate.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

        let dayPrice = house.price;
        let isDiscounted = false;

        if (hasDiscount) {
            // Check date range
            const inDateRange =
                (!discount.startDate || currentTimestamp >= discount.startDate) &&
                (!discount.endDate || currentTimestamp <= discount.endDate);

            // Check valid days
            const isValidDay =
                !discount.validDays ||
                discount.validDays.length === 0 ||
                discount.validDays.includes(currentDay);

            if (inDateRange && isValidDay) {
                dayPrice = discount.price;
                isDiscounted = true;
                discountedDays++;
            } else {
                regularDays++;
            }
        } else {
            regularDays++;
        }

        totalPrice += dayPrice;
    }

    const basePrice = totalDays * house.price;
    const discountAmount = basePrice - totalPrice;

    return {
        totalDays,
        regularDays,
        discountedDays,
        basePrice,
        discountAmount,
        totalPrice
    };
};
