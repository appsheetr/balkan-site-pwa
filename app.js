if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('PWA Service Worker Kayıt Başarılı:', reg.scope))
      .catch(err => console.log('PWA Kayıt Hatası:', err));
  });
}