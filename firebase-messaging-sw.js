importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyCXF8oiGvPCvUCwq1RVKHsttIsOAnOb4kM",
    authDomain: "balkansitepwa.firebaseapp.com",
    projectId: "balkansitepwa",
    storageBucket: "balkansitepwa.appspot.com",
    messagingSenderId: "449921654999",
    appId: "1:449921654999:web:73e35ca97ef5b7d32d9092"
});

const messaging = firebase.messaging();

// iOS Arka Plan ve Kilit Ekranı Tetikleyicisi
messaging.onBackgroundMessage(function(payload) {
    console.log('Arka plan bildirimi yakalandı:', payload);
    
    const title = payload.notification?.title || payload.data?.title || 'Balkan Yapı';
    const body = payload.notification?.body || payload.data?.body || 'Yeni bir bildiriminiz var.';
    
    const options = {
        body: body,
        icon: 'https://cdn-icons-png.flaticon.com/512/1018/1018525.png',
        badge: 'https://cdn-icons-png.flaticon.com/512/1018/1018525.png',
        data: payload.data || {}
    };

    return self.registration.showNotification(title, options);
});