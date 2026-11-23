"use strict";
const admin = require("firebase-admin");
const { DateTime } = require("luxon");
const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT não configurado.");
admin.initializeApp({credential:admin.credential.cert(JSON.parse(raw))});
const db=admin.firestore();
const now=DateTime.utc();
function valid(s) {
  return s && s.enabled===true && typeof s.token==="string" && s.token.length>0 && s.token.length<=4096
    && /^([01]\d|2[0-3]):[0-5]\d$/.test(s.time)
    && Array.isArray(s.days) && s.days.length<=7 && s.days.every(d=>Number.isInteger(d)&&d>=0&&d<=6)
    && typeof s.timezone==="string" && s.timezone.length<=100;
}
async function main() {
  const snapshot=await db.collection("pushSubscriptions").where("enabled","==",true).get();
  for(const doc of snapshot.docs) {
    const s=doc.data();
    if(!valid(s)) continue;
    let local;
    try {local=now.setZone(s.timezone);if(!local.isValid)continue;}catch{continue;}
    const day=local.weekday%7;
    const minutes=local.hour*60+local.minute;
    const [h,m]=s.time.split(":").map(Number);
    const delta=minutes-(h*60+m);
    if(!s.days.includes(day) || delta<0 || delta>=15) continue;
    const key=local.toISODate()+"_"+s.time;
    const lock=db.collection("pushDispatches").doc(doc.id+"_"+key);
    try {await lock.create({createdAt:admin.firestore.FieldValue.serverTimestamp()});}
    catch(e){if(e.code===6 || e.code==="already-exists")continue;throw e;}
    try {
      await admin.messaging().send({
        token:s.token,
        data:{title:"Hikki Fit 💜",body:"🐱 Miau! Hora de treinar! Seu treino está esperando por você."},
        webpush:{headers:{TTL:"3600"}}
      });
      await lock.update({status:"sent",sentAt:admin.firestore.FieldValue.serverTimestamp()});
      console.log("Push enviado:",doc.id,key);
    }catch(e){
      console.error("Falha ao enviar:",doc.id,e.code||e.message);
      await lock.update({status:"failed",error:String(e.code||e.message).slice(0,150)});
      if(["messaging/registration-token-not-registered","messaging/invalid-registration-token"].includes(e.code)) await doc.ref.delete();
    }
  }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
