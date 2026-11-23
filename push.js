"use strict";
// Hikki Fit v1.1: registro opcional para notificações push.
// A chave VAPID é pública; credenciais administrativas ficam somente no GitHub Actions.
(async function () {
  const status = document.createElement("p");
  status.id = "pushStatus";
  status.textContent = "Push desativado. Ative para receber lembretes com o app fechado.";
  const button = document.createElement("button");
  button.type = "button";
  button.className = "primary-btn";
  button.textContent = "🔔 Ativar notificações push";
  const panel = document.createElement("div");
  panel.className = "card";
  const heading = document.createElement("h3");
  heading.textContent = "🐱 Notificações push (v1.1)";
  panel.append(heading, status, button);
  const anchor = document.getElementById("saveReminder");
  if (!anchor) return;
  anchor.parentElement.after(panel);

  if (!("serviceWorker" in navigator) || !("Notification" in window) || !("PushManager" in window)) {
    status.textContent = "Este navegador não oferece suporte a notificações push.";
    button.disabled = true;
    return;
  }
  const firebaseConfig = {
    apiKey: "AIzaSyCaSNNW97GtwzjOWhrnEcKzz8DMyPsfsfs",
    authDomain: "hikki-fit.firebaseapp.com",
    projectId: "hikki-fit",
    storageBucket: "hikki-fit.firebasestorage.app",
    messagingSenderId: "976187661742",
    appId: "1:976187661742:web:be7f32998613c665a37c3f"
  };
  const vapidKey = "BDuVsTPsf0T17-YfrppsG6B3McBDZv5adzpFUv0BOw7zV7gmnbmV-AFVnkCya2dcKxwJhgEZEMU3b-AnDTYpi0k";
  let auth, db, messaging, sdk;
  async function setup() {
    if (sdk) return;
    const [appMod, authMod, dbMod, messagingMod] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js"),
      import("https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js"),
      import("https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging.js")
    ]);
    const app = appMod.initializeApp(firebaseConfig);
    auth = authMod.getAuth(app);
    db = dbMod.getFirestore(app);
    if (!(await messagingMod.isSupported())) throw new Error("Firebase Messaging indisponível neste navegador.");
    messaging = messagingMod.getMessaging(app);
    sdk = {authMod,dbMod,messagingMod};
  }
  async function identity() {
    await setup();
    if (auth.currentUser) return auth.currentUser;
    const result = await sdk.authMod.signInAnonymously(auth);
    return result.user;
  }
  async function sync() {
    const user = await identity();
    const settings = JSON.parse(localStorage.getItem("hikki_fit_reminders_v1") || "null");
    if (!settings || !settings.enabled || !settings.days.length) {
      await sdk.dbMod.deleteDoc(sdk.dbMod.doc(db, "pushSubscriptions", user.uid));
      status.textContent = "Lembretes desativados. Push pausado.";
      return;
    }
    if (Notification.permission !== "granted") {
      status.textContent = "Permita notificações para receber lembretes com o app fechado.";
      return;
    }
    const registration = await navigator.serviceWorker.ready;
    const token = await sdk.messagingMod.getToken(messaging, {vapidKey,serviceWorkerRegistration:registration});
    if (!token) throw new Error("Não foi possível registrar este dispositivo.");
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Sao_Paulo";
    await sdk.dbMod.setDoc(sdk.dbMod.doc(db,"pushSubscriptions",user.uid),{
      token,enabled:true,time:settings.time,days:settings.days,timezone,
      updatedAt:sdk.dbMod.serverTimestamp()
    });
    status.textContent = "Push ativo! 🐱💜 Horários sincronizados.";
  }
  button.addEventListener("click",async()=>{
    button.disabled=true;
    try {
      if (Notification.permission !== "granted") {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") throw new Error("Permissão de notificações não concedida.");
      }
      await sync();
    } catch(e) {console.error(e);status.textContent = "Não foi possível ativar: "+e.message;}
    finally {button.disabled=false;}
  });
  const save = document.getElementById("saveReminder");
  save.addEventListener("click",()=> {
    if (Notification.permission === "granted") {
      setTimeout(()=>sync().catch(e=>{console.error(e);status.textContent="Falha ao sincronizar lembrete push."; }),250);
    }
  });
  if (Notification.permission==="granted") {
    window.addEventListener("load",()=>sync().catch(console.error));
  }
})();
