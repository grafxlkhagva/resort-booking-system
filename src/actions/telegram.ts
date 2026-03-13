"use server";

import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

// Telegram Notification Server Actions

const SYSTEM_URL = "https://resort-booking-system-two.vercel.app";

interface InlineButton {
    text: string;
    url?: string;
    callback_data?: string;
}

export async function sendTelegramMessageAction(
    text: string,
    buttons?: InlineButton[][]
): Promise<{ success: boolean; error?: string }> {
    try {
        // Fetch settings from Firestore
        const settingsRef = doc(db, "settings", "general");
        const settingsSnap = await getDoc(settingsRef);

        if (!settingsSnap.exists()) {
            return { success: false, error: "Settings not found" };
        }

        const settings = settingsSnap.data();
        const telegram = settings.telegram;

        if (!telegram || !telegram.isActive || !telegram.botToken || !telegram.chatId) {
            console.log("Telegram notification is disabled or not configured.");
            return { success: true }; // Return success to not block the main flow
        }

        const url = `https://api.telegram.org/bot${telegram.botToken}/sendMessage`;

        const body: Record<string, unknown> = {
            chat_id: telegram.chatId,
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
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Network Error";
        console.error("Failed to send Telegram notification:", error);
        return { success: false, error: errorMessage };
    }
}

export async function sendBookingNotificationAction(
    houseName: string,
    customerName: string,
    customerPhone: string,
    startDate: string,
    endDate: string,
    totalPrice: number,
    isManual: boolean = false,
    bookingId?: string
) {
    const type = isManual ? "👨‍💻 <b>АДМИН ЗАХИАЛГА</b>" : "🌐 <b>ШИНЭ ЗАХИАЛГА</b> (#pending)";

    // Sanitize phone for tel link
    const cleanPhone = customerPhone.replace(/\D/g, '');

    const message = `
${type}

🏠 <b>Байшин:</b> ${houseName}
👤 <b>Зочин:</b> ${customerName}
📞 <b>Утас:</b> ${customerPhone}
📅 <b>Огноо:</b> ${startDate} - ${endDate}
💰 <b>Нийт үнэ:</b> ${totalPrice.toLocaleString()}₮

${isManual ? '<i>Админаар бүртгэгдлээ.</i>' : '<i>Баталгаажуулахыг хүлээж байна...</i>'}
    `.trim();

    const buttons: InlineButton[][] = [];

    // For online bookings (not manual), add approval buttons
    if (!isManual && bookingId) {
        buttons.push([
            { text: "✅ Баталгаажуулах", callback_data: `approve:booking:${bookingId}` },
            { text: "❌ Татгалзах", callback_data: `reject:booking:${bookingId}` }
        ]);
        buttons.push([
            { text: "📍 Байршил илгээх", callback_data: `send:location:${bookingId}` },
            { text: "💳 Данс илгээх", callback_data: `send:bank:${bookingId}` }
        ]);
    }

    // Contact row
    const contactRow: InlineButton[] = [];
    if (cleanPhone && cleanPhone.length > 4) {
        contactRow.push({ text: "📞 Залгах", url: `tel:+976${cleanPhone}` });
    }
    contactRow.push({ text: "🔗 Систем", url: `${SYSTEM_URL}/admin/bookings` });
    buttons.push(contactRow);

    return await sendTelegramMessageAction(message, buttons);
}

// Food order notification to admin
export async function sendFoodOrderNotificationAction(
    orderId: string,
    guestName: string,
    items: { name: string; quantity: number; price: number }[],
    totalAmount: number,
    deliveryType: 'house' | 'pickup',
    houseName?: string,
    guestPhone?: string
) {
    let message = `🍽 <b>ШИНЭ ХООЛНЫ ЗАХИАЛГА</b>\n\n`;
    message += `📋 <b>Захиалга:</b> #${orderId.slice(-6)}\n`;
    message += `👤 <b>Зочин:</b> ${guestName}\n`;
    if (guestPhone) {
        message += `📞 <b>Утас:</b> ${guestPhone}\n`;
    }
    message += `🚚 <b>Хүргэлт:</b> ${deliveryType === 'house' ? `${houseName || 'Байшин'}` : 'Авч явна'}\n\n`;
    
    message += `<b>Захиалсан хоол:</b>\n`;
    items.forEach(item => {
        message += `  • ${item.name} x${item.quantity} = ${(item.price * item.quantity).toLocaleString()}₮\n`;
    });
    
    message += `\n💰 <b>Нийт:</b> ${totalAmount.toLocaleString()}₮`;

    const buttons: InlineButton[][] = [
        [
            { text: "✅ Хүлээн авах", callback_data: `confirm:order:${orderId}` },
            { text: "❌ Цуцлах", callback_data: `cancel:order:${orderId}` }
        ],
        [
            { text: "🔗 Захиалгууд", url: `${SYSTEM_URL}/admin/restaurant/orders` }
        ]
    ];

    return await sendTelegramMessageAction(message, buttons);
}

export async function sendDailyReportAction(stats: {
    checkIns: number,
    checkOuts: number,
    occupied: number,
    revenue: number,
    details: string
}) {
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

    return await sendTelegramMessageAction(message, buttons);
}
