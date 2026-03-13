import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { 
    TelegramUpdate, 
    TelegramInlineKeyboard,
    Booking,
    Order,
    MenuItem,
    MenuCategory,
    ResortSettings
} from '@/types';

// Telegram API helper
async function sendTelegramMessage(
    botToken: string,
    chatId: string | number,
    text: string,
    replyMarkup?: { inline_keyboard: TelegramInlineKeyboard }
) {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const body: Record<string, unknown> = {
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
    };
    
    if (replyMarkup) {
        body.reply_markup = replyMarkup;
    }
    
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    
    return response.json();
}

// Answer callback query (remove loading state from button)
async function answerCallbackQuery(botToken: string, callbackQueryId: string, text?: string) {
    const url = `https://api.telegram.org/bot${botToken}/answerCallbackQuery`;
    await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            callback_query_id: callbackQueryId,
            text: text
        })
    });
}

// Edit message to update buttons after action
async function editMessageReplyMarkup(
    botToken: string,
    chatId: string | number,
    messageId: number,
    replyMarkup?: { inline_keyboard: TelegramInlineKeyboard }
) {
    const url = `https://api.telegram.org/bot${botToken}/editMessageReplyMarkup`;
    await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            message_id: messageId,
            reply_markup: replyMarkup
        })
    });
}

// Send location
async function sendLocation(botToken: string, chatId: string | number, lat: number, lng: number) {
    const url = `https://api.telegram.org/bot${botToken}/sendLocation`;
    await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            latitude: lat,
            longitude: lng
        })
    });
}

// Get settings from Firestore
async function getSettings(): Promise<ResortSettings | null> {
    const settingsRef = doc(db, 'settings', 'general');
    const settingsSnap = await getDoc(settingsRef);
    if (settingsSnap.exists()) {
        return settingsSnap.data() as ResortSettings;
    }
    return null;
}

// Get booking by ID
async function getBooking(bookingId: string): Promise<Booking | null> {
    const bookingRef = doc(db, 'bookings', bookingId);
    const bookingSnap = await getDoc(bookingRef);
    if (bookingSnap.exists()) {
        return { id: bookingSnap.id, ...bookingSnap.data() } as Booking;
    }
    return null;
}

// Get order by ID
async function getOrder(orderId: string): Promise<Order | null> {
    const orderRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);
    if (orderSnap.exists()) {
        return { id: orderSnap.id, ...orderSnap.data() } as Order;
    }
    return null;
}

// Handle callback queries (button clicks)
async function handleCallbackQuery(
    update: TelegramUpdate,
    settings: ResortSettings
) {
    const callbackQuery = update.callback_query;
    if (!callbackQuery || !callbackQuery.data) return;
    
    const botToken = settings.telegram?.botToken;
    if (!botToken) return;
    
    const [action, entity, id] = callbackQuery.data.split(':');
    const chatId = callbackQuery.message?.chat.id;
    const messageId = callbackQuery.message?.message_id;
    
    // Answer the callback to remove loading state
    await answerCallbackQuery(botToken, callbackQuery.id);
    
    switch (`${action}:${entity}`) {
        case 'approve:booking': {
            const booking = await getBooking(id);
            if (!booking) {
                await sendTelegramMessage(botToken, chatId!, '❌ Захиалга олдсонгүй');
                return;
            }
            
            if (booking.status !== 'pending') {
                await sendTelegramMessage(botToken, chatId!, `⚠️ Энэ захиалга аль хэдийн "${booking.status}" төлөвтэй байна.`);
                return;
            }
            
            // Update booking status
            await updateDoc(doc(db, 'bookings', id), { status: 'confirmed' });
            
            // Remove buttons from original message
            if (messageId) {
                await editMessageReplyMarkup(botToken, chatId!, messageId, { inline_keyboard: [] });
            }
            
            // Send confirmation to admin
            await sendTelegramMessage(
                botToken,
                chatId!,
                `✅ <b>Захиалга баталгаажлаа!</b>\n\n🏠 ${booking.houseName}\n👤 ${booking.guestDetails?.firstName || 'Зочин'}`,
                {
                    inline_keyboard: [
                        [
                            { text: '📍 Байршил илгээх', callback_data: `send:location:${id}` },
                            { text: '💳 Данс илгээх', callback_data: `send:bank:${id}` }
                        ]
                    ]
                }
            );
            
            // If payment info exists and booking has guest phone, send to guest
            if (settings.payment && booking.guestDetails?.phoneNumber) {
                // Note: We can only send to users who have started the bot
                // For now, we'll just notify admin that they should contact the guest
            }
            break;
        }
        
        case 'reject:booking': {
            const booking = await getBooking(id);
            if (!booking) {
                await sendTelegramMessage(botToken, chatId!, '❌ Захиалга олдсонгүй');
                return;
            }
            
            if (booking.status !== 'pending') {
                await sendTelegramMessage(botToken, chatId!, `⚠️ Энэ захиалга аль хэдийн "${booking.status}" төлөвтэй байна.`);
                return;
            }
            
            // Update booking status
            await updateDoc(doc(db, 'bookings', id), { status: 'cancelled' });
            
            // Remove buttons from original message
            if (messageId) {
                await editMessageReplyMarkup(botToken, chatId!, messageId, { inline_keyboard: [] });
            }
            
            await sendTelegramMessage(
                botToken,
                chatId!,
                `❌ <b>Захиалга цуцлагдлаа</b>\n\n🏠 ${booking.houseName}\n👤 ${booking.guestDetails?.firstName || 'Зочин'}`
            );
            break;
        }
        
        case 'send:location': {
            if (settings.map) {
                await sendLocation(botToken, chatId!, settings.map.lat, settings.map.lng);
                await sendTelegramMessage(
                    botToken,
                    chatId!,
                    `📍 <b>Байршил:</b> ${settings.contact?.address || 'Хаяг оруулаагүй'}`
                );
            } else {
                await sendTelegramMessage(botToken, chatId!, '⚠️ Байршил тохируулаагүй байна.');
            }
            break;
        }
        
        case 'send:bank': {
            if (settings.payment) {
                let bankMessage = `💳 <b>Төлбөрийн мэдээлэл</b>\n\n`;
                bankMessage += `🏦 <b>Банк:</b> ${settings.payment.bankName}\n`;
                bankMessage += `📝 <b>Данс:</b> <code>${settings.payment.accountNumber}</code>\n`;
                bankMessage += `👤 <b>Эзэмшигч:</b> ${settings.payment.accountName}`;
                
                // Get booking to show amount
                const booking = await getBooking(id);
                if (booking) {
                    bankMessage += `\n\n💰 <b>Төлөх дүн:</b> ${booking.totalPrice.toLocaleString()}₮`;
                }
                
                await sendTelegramMessage(botToken, chatId!, bankMessage);
                
                // Send QR if available
                if (settings.payment.qrImageUrl) {
                    const qrUrl = `https://api.telegram.org/bot${botToken}/sendPhoto`;
                    await fetch(qrUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: chatId,
                            photo: settings.payment.qrImageUrl,
                            caption: 'QR код уншуулж төлбөр хийх'
                        })
                    });
                }
            } else {
                await sendTelegramMessage(botToken, chatId!, '⚠️ Төлбөрийн мэдээлэл тохируулаагүй байна.');
            }
            break;
        }
        
        case 'confirm:order': {
            const order = await getOrder(id);
            if (!order) {
                await sendTelegramMessage(botToken, chatId!, '❌ Захиалга олдсонгүй');
                return;
            }
            
            await updateDoc(doc(db, 'orders', id), { 
                status: 'confirmed',
                updatedAt: Date.now()
            });
            
            if (messageId) {
                await editMessageReplyMarkup(botToken, chatId!, messageId, {
                    inline_keyboard: [
                        [{ text: '👨‍🍳 Бэлтгэж эхлэх', callback_data: `prepare:order:${id}` }]
                    ]
                });
            }
            
            await sendTelegramMessage(botToken, chatId!, `✅ Хоолны захиалга #${id.slice(-6)} хүлээн авлаа!`);
            break;
        }
        
        case 'prepare:order': {
            await updateDoc(doc(db, 'orders', id), { 
                status: 'preparing',
                updatedAt: Date.now()
            });
            
            if (messageId) {
                await editMessageReplyMarkup(botToken, chatId!, messageId, {
                    inline_keyboard: [
                        [{ text: '✅ Бэлэн боллоо', callback_data: `ready:order:${id}` }]
                    ]
                });
            }
            
            await sendTelegramMessage(botToken, chatId!, `👨‍🍳 Захиалга #${id.slice(-6)} бэлтгэж эхэллээ`);
            break;
        }
        
        case 'ready:order': {
            const order = await getOrder(id);
            await updateDoc(doc(db, 'orders', id), { 
                status: 'ready',
                updatedAt: Date.now()
            });
            
            if (messageId) {
                await editMessageReplyMarkup(botToken, chatId!, messageId, {
                    inline_keyboard: [
                        [{ text: '📦 Хүргэгдсэн', callback_data: `deliver:order:${id}` }]
                    ]
                });
            }
            
            const deliveryInfo = order?.deliveryType === 'house' 
                ? `🏠 ${order.houseName || 'Байшин'} руу хүргэх` 
                : '🏪 Авч явна';
            
            await sendTelegramMessage(botToken, chatId!, `🍽 Захиалга #${id.slice(-6)} бэлэн боллоо!\n${deliveryInfo}`);
            break;
        }
        
        case 'deliver:order': {
            await updateDoc(doc(db, 'orders', id), { 
                status: 'delivered',
                updatedAt: Date.now()
            });
            
            if (messageId) {
                await editMessageReplyMarkup(botToken, chatId!, messageId, { inline_keyboard: [] });
            }
            
            await sendTelegramMessage(botToken, chatId!, `✅ Захиалга #${id.slice(-6)} амжилттай хүргэгдлээ!`);
            break;
        }
        
        case 'cancel:order': {
            await updateDoc(doc(db, 'orders', id), { 
                status: 'cancelled',
                updatedAt: Date.now()
            });
            
            if (messageId) {
                await editMessageReplyMarkup(botToken, chatId!, messageId, { inline_keyboard: [] });
            }
            
            await sendTelegramMessage(botToken, chatId!, `❌ Захиалга #${id.slice(-6)} цуцлагдлаа`);
            break;
        }
        
        // Menu browsing callbacks
        case 'menu:category': {
            await showCategoryItems(botToken, chatId!, id, settings);
            break;
        }
        
        case 'menu:back': {
            await showMenuCategories(botToken, chatId!);
            break;
        }
    }
}

// Show menu categories
async function showMenuCategories(botToken: string, chatId: string | number) {
    const categoriesRef = collection(db, 'menu_categories');
    const q = query(categoriesRef, where('isActive', '==', true));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
        await sendTelegramMessage(botToken, chatId, '📋 Меню хоосон байна.');
        return;
    }
    
    const categories: MenuCategory[] = [];
    snapshot.forEach(doc => {
        categories.push({ id: doc.id, ...doc.data() } as MenuCategory);
    });
    
    // Sort by order
    categories.sort((a, b) => a.order - b.order);
    
    const keyboard: TelegramInlineKeyboard = [];
    for (let i = 0; i < categories.length; i += 2) {
        const row: { text: string; callback_data: string }[] = [
            { text: categories[i].name, callback_data: `menu:category:${categories[i].id}` }
        ];
        if (categories[i + 1]) {
            row.push({ text: categories[i + 1].name, callback_data: `menu:category:${categories[i + 1].id}` });
        }
        keyboard.push(row);
    }
    
    await sendTelegramMessage(
        botToken,
        chatId,
        '🍽 <b>Меню</b>\n\nКатегори сонгоно уу:',
        { inline_keyboard: keyboard }
    );
}

// Show items in a category
async function showCategoryItems(
    botToken: string, 
    chatId: string | number, 
    categoryId: string,
    settings: ResortSettings
) {
    const itemsRef = collection(db, 'menu_items');
    const q = query(itemsRef, where('categoryId', '==', categoryId), where('isAvailable', '==', true));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
        await sendTelegramMessage(botToken, chatId, '📋 Энэ категорид хоол байхгүй байна.', {
            inline_keyboard: [[{ text: '⬅️ Буцах', callback_data: 'menu:back:0' }]]
        });
        return;
    }
    
    const items: MenuItem[] = [];
    snapshot.forEach(doc => {
        items.push({ id: doc.id, ...doc.data() } as MenuItem);
    });
    
    let message = '🍽 <b>Меню</b>\n\n';
    items.forEach((item, index) => {
        message += `<b>${index + 1}. ${item.name}</b>\n`;
        message += `   💰 ${item.price.toLocaleString()}₮\n`;
        if (item.description) {
            message += `   📝 ${item.description}\n`;
        }
        message += '\n';
    });
    
    message += '\n📞 Захиалга өгөхийн тулд <b>' + (settings.contact?.phone || 'дугаар руу') + '</b> залгана уу.';
    
    await sendTelegramMessage(botToken, chatId, message, {
        inline_keyboard: [[{ text: '⬅️ Буцах', callback_data: 'menu:back:0' }]]
    });
}

// Handle text messages
async function handleMessage(update: TelegramUpdate, settings: ResortSettings) {
    const message = update.message;
    if (!message || !message.text) return;
    
    const botToken = settings.telegram?.botToken;
    const adminChatId = settings.telegram?.chatId;
    if (!botToken) return;
    
    const chatId = message.chat.id;
    const text = message.text.trim();
    const isAdmin = adminChatId === String(chatId);
    
    // Handle commands
    if (text.startsWith('/')) {
        const command = text.split(' ')[0].toLowerCase();
        
        switch (command) {
            case '/start':
                if (isAdmin) {
                    await sendTelegramMessage(
                        botToken,
                        chatId,
                        '👋 <b>Сайн байна уу!</b>\n\n' +
                        'Та админ эрхтэй байна. Захиалгын мэдэгдлүүд энд ирнэ.\n\n' +
                        '<b>Командууд:</b>\n' +
                        '/today - Өнөөдрийн захиалгууд\n' +
                        '/pending - Хүлээгдэж буй захиалгууд\n' +
                        '/menu - Меню харах'
                    );
                } else {
                    await sendTelegramMessage(
                        botToken,
                        chatId,
                        '👋 <b>Тавтай морил!</b>\n\n' +
                        '/menu - Меню харах\n' +
                        '/contact - Холбоо барих'
                    );
                }
                break;
                
            case '/menu':
                await showMenuCategories(botToken, chatId);
                break;
                
            case '/contact':
                let contactMsg = '📞 <b>Холбоо барих</b>\n\n';
                if (settings.contact?.phone) {
                    contactMsg += `📱 Утас: ${settings.contact.phone}\n`;
                }
                if (settings.contact?.email) {
                    contactMsg += `📧 Имэйл: ${settings.contact.email}\n`;
                }
                if (settings.contact?.address) {
                    contactMsg += `📍 Хаяг: ${settings.contact.address}`;
                }
                await sendTelegramMessage(botToken, chatId, contactMsg);
                break;
                
            case '/today':
                if (!isAdmin) {
                    await sendTelegramMessage(botToken, chatId, '⚠️ Энэ команд зөвхөн админд зориулагдсан.');
                    return;
                }
                await showTodayBookings(botToken, chatId);
                break;
                
            case '/pending':
                if (!isAdmin) {
                    await sendTelegramMessage(botToken, chatId, '⚠️ Энэ команд зөвхөн админд зориулагдсан.');
                    return;
                }
                await showPendingBookings(botToken, chatId);
                break;
                
            default:
                await sendTelegramMessage(
                    botToken,
                    chatId,
                    '❓ Танигдаагүй команд. /start гэж бичээд туслахыг авна уу.'
                );
        }
    }
}

// Show today's bookings (check-ins and check-outs)
async function showTodayBookings(botToken: string, chatId: string | number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();
    const todayEnd = todayStart + 24 * 60 * 60 * 1000;
    
    const bookingsRef = collection(db, 'bookings');
    const snapshot = await getDocs(bookingsRef);
    
    const checkIns: Booking[] = [];
    const checkOuts: Booking[] = [];
    
    snapshot.forEach(doc => {
        const booking = { id: doc.id, ...doc.data() } as Booking;
        if (booking.status === 'confirmed') {
            if (booking.startDate >= todayStart && booking.startDate < todayEnd) {
                checkIns.push(booking);
            }
            if (booking.endDate >= todayStart && booking.endDate < todayEnd) {
                checkOuts.push(booking);
            }
        }
    });
    
    let message = `📅 <b>Өнөөдрийн байдал</b> (${today.toLocaleDateString('mn-MN')})\n\n`;
    
    message += `📥 <b>Ирэх:</b> ${checkIns.length}\n`;
    checkIns.forEach(b => {
        message += `   • ${b.houseName} - ${b.guestDetails?.firstName || 'Зочин'}\n`;
    });
    
    message += `\n📤 <b>Явах:</b> ${checkOuts.length}\n`;
    checkOuts.forEach(b => {
        message += `   • ${b.houseName} - ${b.guestDetails?.firstName || 'Зочин'}\n`;
    });
    
    await sendTelegramMessage(botToken, chatId, message);
}

// Show pending bookings
async function showPendingBookings(botToken: string, chatId: string | number) {
    const bookingsRef = collection(db, 'bookings');
    const q = query(bookingsRef, where('status', '==', 'pending'));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
        await sendTelegramMessage(botToken, chatId, '✅ Хүлээгдэж буй захиалга байхгүй байна.');
        return;
    }
    
    const bookings: Booking[] = [];
    snapshot.forEach(doc => {
        bookings.push({ id: doc.id, ...doc.data() } as Booking);
    });
    
    for (const booking of bookings) {
        const startDate = new Date(booking.startDate).toLocaleDateString('mn-MN');
        const endDate = new Date(booking.endDate).toLocaleDateString('mn-MN');
        
        const message = 
            `⏳ <b>Хүлээгдэж буй захиалга</b>\n\n` +
            `🏠 <b>Байшин:</b> ${booking.houseName}\n` +
            `👤 <b>Зочин:</b> ${booking.guestDetails?.firstName || 'N/A'} ${booking.guestDetails?.lastName || ''}\n` +
            `📞 <b>Утас:</b> ${booking.guestDetails?.phoneNumber || 'N/A'}\n` +
            `📅 <b>Огноо:</b> ${startDate} - ${endDate}\n` +
            `💰 <b>Үнэ:</b> ${booking.totalPrice.toLocaleString()}₮`;
        
        await sendTelegramMessage(botToken, chatId, message, {
            inline_keyboard: [
                [
                    { text: '✅ Баталгаажуулах', callback_data: `approve:booking:${booking.id}` },
                    { text: '❌ Татгалзах', callback_data: `reject:booking:${booking.id}` }
                ]
            ]
        });
    }
}

// Main webhook handler
export async function POST(request: NextRequest) {
    try {
        // Get settings
        const settings = await getSettings();
        if (!settings || !settings.telegram?.isActive || !settings.telegram?.botToken) {
            return NextResponse.json({ ok: true, message: 'Telegram not configured' });
        }
        
        // Verify webhook secret if configured
        const secretHeader = request.headers.get('x-telegram-bot-api-secret-token');
        if (settings.telegram.webhookSecret && secretHeader !== settings.telegram.webhookSecret) {
            return NextResponse.json({ ok: false, error: 'Invalid secret' }, { status: 403 });
        }
        
        const update: TelegramUpdate = await request.json();
        
        // Handle callback query (button click)
        if (update.callback_query) {
            await handleCallbackQuery(update, settings);
        }
        
        // Handle text message
        if (update.message) {
            await handleMessage(update, settings);
        }
        
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('Webhook error:', error);
        return NextResponse.json({ ok: true }); // Always return 200 to Telegram
    }
}

// GET endpoint to verify webhook is working
export async function GET() {
    return NextResponse.json({ 
        status: 'ok', 
        message: 'Telegram webhook endpoint is active' 
    });
}
