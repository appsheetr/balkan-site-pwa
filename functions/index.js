const functions = require('firebase-functions/v1'); // V1 KESİN BELİRTİLDİ
const admin = require('firebase-admin');
admin.initializeApp();

// YARDIMCI FONKSİYON: Tüm kullanıcılara hem Zil İkonu hem de Telefon Push Bildirimi Gönderir
async function sendNotificationToAll(title, body) {
    const usersSnapshot = await admin.firestore().collection('users').where('isApproved', '==', true).get();
    const tokens = [];
    const batch = admin.firestore().batch();

    usersSnapshot.forEach(doc => {
        const userData = doc.data();
        if (userData.fcmToken) {
            tokens.push(userData.fcmToken);
        }

        // Uygulama İçi (Zil İkonu) Bildirimine Yazma
        const userNotifRef = admin.firestore().collection('users').doc(doc.id).collection('notifications').doc();
        batch.set(userNotifRef, {
            title: title,
            body: body,
            isRead: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
    });

    await batch.commit();

    if (tokens.length > 0) {
        const message = {
            tokens: tokens,
            notification: {
                title: title,
                body: body,
            },
            webpush: {
                headers: { Urgency: "high" },
                notification: {
                    title: title,
                    body: body,
                    icon: "https://cdn-icons-png.flaticon.com/512/1018/1018525.png",
                    requireInteraction: true,
                    vibrate: [200, 100, 200]
                }
            }
        };

        try {
            const response = await admin.messaging().sendEachForMulticast(message);
            console.log("Otomatik bildirimler başarıyla gönderildi:", response.successCount);
        } catch (error) {
            console.error("Otomatik bildirim hatası:", error);
        }
    }
}

// 1. MANUEL BİLDİRİM (Admin Panelinden Seçili Kişilere Gönderilen)
exports.onManualNotification = functions.firestore
    .document('notifications/{docId}')
    .onCreate(async (snap, context) => {
        const data = snap.data();
        const notificationTitle = data.title || "Yeni Bildirim";
        const notificationBody = data.body || "Mesaj detayı bulunamadı.";
        const recipients = data.recipients || []; 
        
        if (recipients.length === 0) return null;

        const tokens = [];
        const batch = admin.firestore().batch();

        for (const userId of recipients) {
            const userDoc = await admin.firestore().collection('users').doc(userId).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                if (userData.fcmToken) tokens.push(userData.fcmToken);

                const userNotifRef = admin.firestore().collection('users').doc(userId).collection('notifications').doc(context.params.docId);
                batch.set(userNotifRef, {
                    title: notificationTitle,
                    body: notificationBody,
                    isRead: false,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        }

        await batch.commit();

        if (tokens.length > 0) {
            const message = {
                tokens: tokens,
                notification: { title: notificationTitle, body: notificationBody },
                webpush: {
                    headers: { Urgency: "high" },
                    notification: { 
                        title: notificationTitle, 
                        body: notificationBody, 
                        icon: "https://cdn-icons-png.flaticon.com/512/1018/1018525.png",
                        vibrate: [200, 100, 200]
                    }
                }
            };
            try {
                await admin.messaging().sendEachForMulticast(message);
            } catch (err) {
                console.error("Manuel bildirim Push hatası:", err);
            }
        }
        return null;
    });

// 2. YENİ DUYURU EKLENDİĞİNDE OTOMATİK TETİKLE
exports.onNewAnnouncement = functions.firestore
    .document('announcements/{docId}')
    .onCreate(async (snap, context) => {
        const data = snap.data();
        await sendNotificationToAll("📣 " + (data.title || "Yeni Duyuru"), data.content || "Sitemizde yeni bir duyuru yayınlandı.");
        return null;
    });

// 3. YENİ FİNANS EKLENDİĞİNDE OTOMATİK TETİKLE
exports.onNewFinance = functions.firestore
    .document('finance/{docId}')
    .onCreate(async (snap, context) => {
        const data = snap.data();
        const typeLabel = data.type === 'Gelir' ? 'Gelir Eklendi' : 'Gider Eklendi';
        const body = `${data.description} (${data.amount} ₺)`;
        await sendNotificationToAll(`💰 ${typeLabel}`, body);
        return null;
    });

// 4. YENİ YÖNETİM KARARI EKLENDİĞİNDE OTOMATİK TETİKLE
exports.onNewDecision = functions.firestore
    .document('decisions/{docId}')
    .onCreate(async (snap, context) => {
        const data = snap.data();
        await sendNotificationToAll("⚖️ Yeni Yönetim Kararı", data.title || "Sitemiz için yeni bir karar alındı.");
        return null;
    });