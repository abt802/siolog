const showNotification = body => {
  return self.registration.showNotification('siolog', {
    //icon: 'image/icon.png',
    body: body || '(with empty payload)',
    //vibrate: [400,100,400]
  });
};

const receivePush = ev => {
  let data = '';

  if(ev.data) {
    data = ev.data.text();
  }
  if('showNotification' in self.registration) {
    ev.waitUntil(showNotification(data));
  }
};

self.addEventListener('push', receivePush, false);
