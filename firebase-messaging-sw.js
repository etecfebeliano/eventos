
/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

// Parse query parameters to get config dynamically
// This avoids hardcoding keys in the public file
const urlParams = new URLSearchParams(self.location.search);
const config = Object.fromEntries(urlParams);

if (config.apiKey && config.projectId) {
  firebase.initializeApp(config);

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const notification = (payload && payload.notification) || {};
    const data = (payload && payload.data) || {};
    const notificationTitle = notification.title || data.title || 'EduEvent';
    const defaultIconUrl = new URL('./icon-192x192.png', (self.registration && self.registration.scope) || self.location.href).href;
    const notificationOptions = {
      body: notification.body || data.body || '',
      icon: notification.icon || defaultIconUrl,
      data
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
  });
} else {
  console.warn('[firebase-messaging-sw.js] Firebase config not provided in URL search params.');
}
