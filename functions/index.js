const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
admin.initializeApp();

// YARDIMCI FONKSİYON: Tüm kullanıcılara Push ve Uygulama İçi Bildirim Gönderir (YENİ: type ve targetId eklendi)
async function sendNotificationToAll(title, body, type = 'general', targetId = '') {
    const usersSnapshot = await admin.firestore().collection('users').where('isApproved', '==', true).get();
    const tokens = [];
    const batch = admin.firestore().batch();

    usersSnapshot.forEach(doc => {
        const userData = doc.data();
        if (userData.fcmToken) {
            tokens.push(userData.fcmToken);
        }

        const userNotifRef = admin.firestore().collection('users').doc(doc.id).collection('notifications').doc();
        batch.set(userNotifRef, {
            title: title,
            body: body,
            type: type,          // Hangi sekmeye gidecek (Örn: announcements, finance)
            targetId: targetId,  // Hangi belgeyi açacak (Örn: Duyuru ID'si)
            isRead: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
    });

    await batch.commit();

    if (tokens.length > 0) {
        const message = {
            tokens: tokens,
            notification: { title: title, body: body },
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
            await admin.messaging().sendEachForMulticast(message);
        } catch (error) {
            console.error("Otomatik bildirim hatası:", error);
        }
    }
}

// 1. MANUEL BİLDİRİM
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
                    type: 'manual', // Sadece okunur, yönlendirme yapmaz
                    targetId: '',
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
            try { await admin.messaging().sendEachForMulticast(message); } catch (err) {}
        }
        return null;
    });

// 2. YENİ DUYURU
exports.onNewAnnouncement = functions.firestore
    .document('announcements/{docId}')
    .onCreate(async (snap, context) => {
        const data = snap.data();
        // İSTEDİĞİN GİBİ: Başlık sabit "Yeni Duyuru", içerik kendi başlığı oldu
        await sendNotificationToAll("📣 Yeni Duyuru", data.title || "Sitemizde yeni bir duyuru yayınlandı.", "announcements", context.params.docId);
        return null;
    });

// 3. YENİ FİNANS
exports.onNewFinance = functions.firestore
    .document('finance/{docId}')
    .onCreate(async (snap, context) => {
        const data = snap.data();
        const typeLabel = data.type === 'Gelir' ? 'Gelir Eklendi' : 'Gider Eklendi';
        const body = `${data.description} (${data.amount} ₺)`;
        await sendNotificationToAll(`💰 ${typeLabel}`, body, "finance", context.params.docId);
        return null;
    });

// 4. YENİ YÖNETİM KARARI
exports.onNewDecision = functions.firestore
    .document('decisions/{docId}')
    .onCreate(async (snap, context) => {
        const data = snap.data();
        await sendNotificationToAll("⚖️ Yeni Yönetim Kararı", data.title || "Sitemiz için yeni bir karar alındı.", "decisions", context.params.docId);
        return null;
    });