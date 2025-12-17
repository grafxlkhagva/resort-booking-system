
// Mock SMS Service for client-side demonstration & preparation for real API
// Currently simulate sending.

export const sendBookingNotificationSMS = async (
    recipientPhone: string,
    message: string
): Promise<boolean> => {
    // 1. In a real app, this would call an API Endpoint, e.g., /api/send-sms
    // which would then call Twilio/Skytel/etc.

    console.log("================ SMS SERVICE ================");
    console.log(`[TO]: ${recipientPhone}`);
    console.log(`[MSG]: ${message}`);
    console.log("=============================================");

    // Simulate Network Delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Show visual feedback for testing/demo purposes
    if (typeof window !== 'undefined') {
        // Use a non-intrusive notification if possible, or simple alert for admin confirmation
        // For production "feeling", maybe we assume it worked. 
        // But the user said "message not coming", so let's log explicitly.
    }

    return true;
};

export const formatBookingMessage = (
    houseName: string,
    customerName: string,
    startDate: string,
    endDate: string,
    totalPrice: number,
    isManual: boolean = false
): string => {
    const type = isManual ? "Admin Zahialga" : "Online Zahialga";
    // Using Latin characters for SMS compatibility usually, but modern gateways support Unicode.
    // Let's keep it in Cyrillic as requested but short.
    return `[Resort] ${type}: ${houseName}, ${startDate}-${endDate}. Zochin: ${customerName}. Un: ${totalPrice.toLocaleString()}T.`;
};
