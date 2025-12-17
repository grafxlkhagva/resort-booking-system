
// Mock SMS Service for client-side demonstration
// Since we don't have a backend to send SMS, we will simulate it.

export const sendBookingNotificationSMS = async (
    recipientPhone: string,
    message: string
): Promise<boolean> => {
    console.log("---------------------------------------------------");
    console.log(`[SMS MOCK] Sending SMS to: ${recipientPhone}`);
    console.log(`[SMS MOCK] Message: ${message}`);
    console.log("---------------------------------------------------");

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Return success
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
    const type = isManual ? "АДМИН ЗАХИАЛГА" : "ОНЛАЙН ЗАХИАЛГА";
    return `[System] ${type}: ${houseName}-д ${startDate}-ээс ${endDate} хүртэл. Үйлчлүүлэгч: ${customerName}. Нийт: ${totalPrice.toLocaleString()}₮.`;
};
