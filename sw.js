const CACHE_NAME = 'planning-bar-v6-2';

const APP_SHELL = [

  './',

  './index.html',

  './manifest.json',

  './icon.PNG'

];

/* =========================================

   INSTALLATION

========================================= */

self.addEventListener('install', event => {

  self.skipWaiting();

  event.waitUntil(

    caches

      .open(CACHE_NAME)

      .then(cache => cache.addAll(APP_SHELL))

      .catch(error => {

        console.log('Cache install error:', error);

      })

  );

});

/* =========================================

   ACTIVATION

========================================= */

self.addEventListener('activate', event => {

  event.waitUntil(

    caches

      .keys()

      .then(keys => {

        return Promise.all(

          keys.map(key => {

            if(key !== CACHE_NAME){

              return caches.delete(key);

            }

          })

        );

      })

      .then(() => self.clients.claim())

  );

});

/* =========================================

   FETCH

   Réseau en priorité

========================================= */

self.addEventListener('fetch', event => {

  const request = event.request;

  if(request.method !== 'GET'){

    return;

  }

  const url =

    new URL(request.url);

  /*

    Pour index.html et la page principale :

    toujours essayer internet d'abord

  */

  if(

    url.origin === self.location.origin &&

    (

      url.pathname.endsWith('/') ||

      url.pathname.endsWith('/index.html')

    )

  ){

    event.respondWith(

      fetch(request)

        .then(response => {

          const copy =

            response.clone();

          caches

            .open(CACHE_NAME)

            .then(cache => {

              cache.put(request, copy);

            });

          return response;

        })

        .catch(() => {

          return caches.match(request)

            .then(cached => {

              return cached ||

                caches.match('./index.html');

            });

        })

    );

    return;

  }

  /*

    Pour les autres fichiers :

    réseau d'abord puis cache

  */

  event.respondWith(

    fetch(request)

      .then(response => {

        if(

          response &&

          response.status === 200 &&

          url.origin === self.location.origin

        ){

          const copy =

            response.clone();

          caches

            .open(CACHE_NAME)

            .then(cache => {

              cache.put(request, copy);

            });

        }

        return response;

      })

      .catch(() => {

        return caches.match(request);

      })

  );

});

/* =========================================

   MESSAGE MANUEL DE MISE A JOUR

========================================= */

self.addEventListener('message', event => {

  if(

    event.data &&

    event.data.type === 'SKIP_WAITING'

  ){

    self.skipWaiting();

  }

});

/* =========================================

   PUSH NOTIFICATIONS

   Préparation pour la suite

========================================= */

self.addEventListener('push', event => {

  let data = {

    title:'Planning Bar',

    body:'Nouvelle notification',

    url:'./'

  };

  try{

    if(event.data){

      const incoming =

        event.data.json();

      data = {

        ...data,

        ...incoming

      };

    }

  }catch(error){

    try{

      data.body =

        event.data.text();

    }catch(e){}

  }

  const options = {

    body:

      data.body,

    icon:

      './icon.PNG',

    badge:

      './icon.PNG',

    data:{

      url:

        data.url || './'

    }

  };

  event.waitUntil(

    self.registration.showNotification(

      data.title || 'Planning Bar',

      options

    )

  );

});

/* =========================================

   CLIC SUR NOTIFICATION

========================================= */

self.addEventListener(

  'notificationclick',

  event => {

    event.notification.close();

    const targetUrl =

      event.notification.data?.url ||

      './';

    event.waitUntil(

      clients

        .matchAll({

          type:'window',

          includeUncontrolled:true

        })

        .then(windowClients => {

          for(const client of windowClients){

            if('focus' in client){

              client.navigate(targetUrl);

              return client.focus();

            }

          }

          if(clients.openWindow){

            return clients.openWindow(

              targetUrl

            );

          }

        })

    );

  }

);
