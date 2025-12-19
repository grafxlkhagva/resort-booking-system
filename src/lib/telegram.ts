
// Telegram Notification Service

const BOT_TOKEN = "8553346222:AAHQbUbK5dpipLd0Piu3EFSyhqf5kP1NPbQ";
const CHAT_ID = "8553346222"; // User provided this ID, we will try to use it. Usually chat ID is int but string works for API.

export const sendTelegramNotification = async (message: string): Promise<boolean> => {
    try {
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: message,
                parse_mode: 'HTML'
            })
        });

        const data = await response.json();

        if (!data.ok) {
            console.error("Telegram API Error:", data);
            return false;
        }

        console.log("Telegram notification sent successfully");
        return true;
    } catch (error) {
        console.error("Failed to send Telegram notification:", error);
        return false;
    }
};

export const formatTelegramBookingMessage = (
    houseName: string,
    customerName: string,
    customerPhone: string,
    startDate: string,
    endDate: string,
    totalPrice: number,
    isManual: boolean = false
): string => {
    const type = isManual ? "👨‍💻 <b>АДМИН ЗАХИАЛГА</b>" : "🌐 <b>ОНЛАЙН ЗАХИАЛГА</b>";

    return `
${type}

🏠 <b>Байшин:</b> ${houseName}
👤 <b>Зочин:</b> ${customerName}
📞 <b>Утас:</b> ${customerPhone}
📅 <b>Огноо:</b> ${startDate} - ${endDate}
💰 <b>Нийт үнэ:</b> ${totalPrice.toLocaleString()}₮

<i>Системээс автоматаар илгээв.</i>
    `.trim();
};
