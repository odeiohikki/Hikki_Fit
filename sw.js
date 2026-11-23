"use strict";
const CACHE="hikki-fit-v1-1-0";
const ASSETS=["./","./index.html","./style.css","./script.js","./media.js","./final.js","./push.js","./manifest.webmanifest","./icon.svg"];
self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch",event=>{
  const request=event.request;
  if(request.method!=="GET" || new URL(request.url).origin!==self.location.origin)return;
  if(request.mode==="navigate"){
    event.respondWith(fetch(request).then(response=>{
      if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put("./index.html",copy));}
      return response;
    }).catch(()=>caches.match("./index.html")));
    return;
  }
  event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{
    if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy));}
    return response;
  })));
});
self.addEventListener("push", event => {
  let data={};
  try {data=event.data ? event.data.json() : {};}catch{}
  const notification=data.notification || {};
  const title=notification.title || "Hikki Fit 💜";
  const body=notification.body || "🐱 Miau! Hora de treinar!";
  event.waitUntil(self.registration.showNotification(title,{
    body,icon:"./icon.svg",badge:"./icon.svg",tag:"hikki-fit-reminder",
    data:{url:self.registration.scope}
  }));
});
self.addEventListener("notificationclick",event=>{
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || self.registration.scope));
});
