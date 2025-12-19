
// Telegram Notification Service

const BOT_TOKEN = "8553346222:AAHQbUbK5dpipLd0Piu3EFSyhqf5kP1NPbQ";
const CHAT_ID = "8553346222";
const SYSTEM_URL = "https://resort-booking-system-two.vercel.app"; // Replace with actual URL if different

interface InlineButton {
    text: string;
    url?: string;
    callback_data?: string;
}

export const sendTelegramMessage = async (
    text: string,
    buttons?: InlineButton[][]
): Promise<{ success: boolean; error?: string }> => {
    try {
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

        const body: any = {
            chat_id: CHAT_ID,
            text: text,
            parse_mode: 'HTML'
        };

        if (buttons && buttons.length > 0) {
            body.reply_markup = {
                inline_keyboard: buttons
            };
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (!data.ok) {
            console.error("Telegram API Error:", data);
            return { success: false, error: data.description || "Telegram API Error" };
        }

        return { success: true };
    } catch (error: any) {
        console.error("Failed to send Telegram notification:", error);
        return { success: false, error: error.message || "Network Error" };
    }
};

export const sendBookingNotification = async (
    houseName: string,
    customerName: string,
    customerPhone: string,
    startDate: string,
    endDate: string,
    totalPrice: number,
    isManual: boolean = false
) => {
    const type = isManual ? "👨‍💻 <b>АДМИН ЗАХИАЛГА</b>" : "🌐 <b>ОНЛАЙН ЗАХИАЛГА</b>";

    // Sanitize phone for tel link
    const cleanPhone = customerPhone.replace(/\D/g, '');

    const message = `
${type}

🏠 <b>Байшин:</b> ${houseName}
👤 <b>Зочин:</b> ${customerName}
📞 <b>Утас:</b> ${customerPhone}
📅 <b>Огноо:</b> ${startDate} - ${endDate}
💰 <b>Нийт үнэ:</b> ${totalPrice.toLocaleString()}₮

<i>Системд бүртгэгдлээ.</i>
    `.trim();

    const buttons = [
        [
            { text: "📞 Залгах", url: `tel:+976${cleanPhone}` }, // Add country code if missing
            { text: "🔗 Систем рүү орох", url: `${SYSTEM_URL}/admin/bookings` }
        ]
    ];

    return await sendTelegramMessage(message, buttons);
};

export const sendDailyReport = async (stats: {
    checkIns: number,
    checkOuts: number,
    occupied: number,
    revenue: number,
    details: string
}) => {
    const date = new Date().toLocaleDateString('mn-MN');

    const message = `
📊 <b>ӨДРИЙН ТАЙЛАН</b> (${date})

📥 <b>Ирэх:</b> ${stats.checkIns}
📤 <b>Явах:</b> ${stats.checkOuts}
🏠 <b>Дүүргэлт:</b> ${stats.occupied} байшин
💰 <b>Тооцоолсон орлого:</b> ${stats.revenue.toLocaleString()}₮

<b>Дэлгэрэнгүй:</b>
${stats.details}
    `.trim();

    const buttons = [
        [{ text: "🖥 Үйл ажиллагааны хэсэг", url: `${SYSTEM_URL}/admin/operations` }]
    ];

    return await sendTelegramMessage(message, buttons);
};

// Legacy support if needed, but better to use new function
export const sendTelegramNotification = async (message: string) => {
    return sendTelegramMessage(message);
}
export const formatTelegramBookingMessage = (houseName: string, customerName: string, customerPhone: string, startDate: string, endDate: string, totalPrice: number, isManual: boolean) => {
    // This is now handled inside sendBookingNotification, but kept for compatibility if needed.
    return "";
}
