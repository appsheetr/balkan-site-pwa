const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
admin.initializeApp();

// Tüm kullanıcılara bildirim gönderme yardımcı fonksiyonu
async function sendNotificationToAll(title, body) {
  const usersSnap = await admin.firestore().collection("users").orderBy("fcmToken").get();
  const tokens = [];
  
  usersSnap.forEach(doc => {
    const data = doc.data();
    if (data.fcmToken) {
      tokens.push(data.fcmToken);
    }
  });

  if (tokens.length > 0) {
    const payload = {
      notification: { title: title, body: body },
      tokens: tokens
    };
    await admin.messaging().sendEachForMulticast(payload);
  }
}

// 1. Admin Panelinden Manuel Bildirim Gönderildiğinde
exports.onManualNotification = functions.region("europe-west3").firestore.document("notifications/{docId}")
  .onCreate(async (snap, context) => {
    const data = snap.data();
    return sendNotificationToAll(data.title, data.body);
  });

// 2. Yeni Duyuru Eklendiğinde
exports.onNewAnnouncement = functions.region("europe-west3").firestore.document("announcements/{docId}")
  .onCreate(async (snap, context) => {
    const data = snap.data();
    return sendNotificationToAll("📢 Yeni Duyuru: " + data.title, "Yönetim yeni bir duyuru yayınladı. Detaylar için uygulamaya girin.");
  });

// 3. Yeni Yönetim Kararı Eklendiğinde
exports.onNewDecision = functions.region("europe-west3").firestore.document("decisions/{docId}")
  .onCreate(async (snap, context) => {
    const data = snap.data();
    return sendNotificationToAll("⚖️ Yeni Yönetim Kararı", data.title + " konulu karar eklendi.");
  });

// 4. Yeni Gelir/Gider Kaydı Girildiğinde
exports.onNewFinance = functions.region("europe-west3").firestore.document("finance/{docId}")
  .onCreate(async (snap, context) => {
    const data = snap.data();
    return sendNotificationToAll("💰 Yeni Kasa Hareketi", `${data.type} işlendi: ${data.amount} ₺ (${data.description})`);
  });