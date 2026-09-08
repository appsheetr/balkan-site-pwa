importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Mevcut Firebase ayarlarımız
firebase.initializeApp({
    apiKey: "AIzaSyCXF8oiGvPCvUCwq1RVKHsttIsOAnOb4kM",
    authDomain: "balkansitepwa.firebaseapp.com",
    projectId: "balkansitepwa",
    storageBucket: "balkansitepwa.appspot.com",
    messagingSenderId: "449921654999",
    appId: "1:449921654999:web:73e35ca97ef5b7d32d9092"
});

const messaging = firebase.messaging();

// Uygulama kapalıyken veya arka plandayken bildirim geldiğinde çalışacak kod
messaging.onBackgroundMessage(function(payload) {
  console.log('Arka plan bildirimi alındı: ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: 'https://cdn-icons-png.flaticon.com/512/1018/1018525.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});