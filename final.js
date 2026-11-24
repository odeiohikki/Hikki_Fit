"use strict";

// Hikki Fit v1.0: conquistas, backup de mídias e instalação.
(function () {
  const $id = id => document.getElementById(id);
  const dayKey = date => [date.getFullYear(), String(date.getMonth()+1).padStart(2,"0"), String(date.getDate()).padStart(2,"0")].join("-");
  const completedDays = () => new Set(history.filter(h => h.completedAt && !Number.isNaN(Date.parse(h.completedAt))).map(h => dayKey(new Date(h.completedAt))));
  function streak() {
    const days = completedDays();
    const today = new Date();
    let current = 0;
    if (!days.has(dayKey(today))) today.setDate(today.getDate()-1);
    while (days.has(dayKey(today))) { current++; today.setDate(today.getDate()-1); }
    let longest = 0, run = 0, previous = null;
    [...days].sort().forEach(key => {
      const date = new Date(key+"T12:00:00");
      if (previous && Math.round((date-previous)/86400000)===1) run++;
      else run=1;
      longest=Math.max(longest,run);
      previous=date;
    });
    return {current,longest};
  }
  const achievements = [
    {icon:"🐾",name:"Primeiro passo",desc:"Concluir 1 treino",check:()=>history.length>=1},
    {icon:"💜",name:"Gatinho dedicado",desc:"Concluir 10 treinos",check:()=>history.length>=10},
    {icon:"🏆",name:"Lenda dos treinos",desc:"Concluir 50 treinos",check:()=>history.length>=50},
    {icon:"🔥",name:"Em chamas",desc:"Treinar 3 dias seguidos",check:()=>streak().longest>=3},
    {icon:"🌙",name:"Constância lunar",desc:"Treinar 7 dias seguidos",check:()=>streak().longest>=7},
    {icon:"⭐",name:"Estrela roxa",desc:"Alcançar nível 5",check:()=>calcularNivel().nivel>=5}
  ];
  const milestones=[
    ["🐢","Jornada",()=>history.length,[2,5,15,20,30,40,75,100,150,200,300,500],"treinos concluídos"],
    ["🌙","Ascensão",()=>calcularNivel().nivel,[2,3,4,6,8,10,15,20,25,35,50,75],"nível alcançado"],
    ["⏳","Tempo dedicado",()=>Math.floor(history.reduce((n,h)=>n+(h.durationSeconds||0),0)/60),[15,30,60,120,240,480,720,1000,1500,2000,3000,5000],"minutos de treino"],
    ["⭐","Movimento",()=>history.reduce((n,h)=>n+h.exercises.length,0),[5,15,25,50,75,100,200,300,500,1000,1500,2000],"exercícios concluídos"],
    ["🌿","Dias ativos",()=>completedDays().size,[2,5,10,20,30,50],"dias com treino"]
  ];
  for(const [icon,label,metric,thresholds,unit] of milestones)for(const n of thresholds)achievements.push({icon,name:label+" • "+n,desc:n+" "+unit,check:()=>metric()>=n});
  const card=document.createElement("section");
  card.className="card";
  card.innerHTML='<h3>🏅 Conquistas</h3><p id="hikkiStreak" class="muted"></p><div id="hikkiAchievements" class="hikki-achievements"></div>';
  const profile=$id("profile");
  const activity=profile.querySelector(".profile-card");
  activity.after(card);
  function renderAchievements(){
    const count=streak();
    $id("hikkiStreak").textContent="🔥 Sequência atual: "+count.current+" dia(s) • Recorde: "+count.longest+" dia(s)";
    const list=$id("hikkiAchievements");
    list.replaceChildren();
    achievements.forEach(a=>{
      const unlocked=a.check();
      const item=document.createElement("div");
      item.className="hikki-achievement"+(unlocked?" unlocked":"");
      const icon=document.createElement("span");
      icon.className="hikki-achievement-icon";
      icon.textContent=unlocked?a.icon:"🔒";
      const copy=document.createElement("div");
      const title=document.createElement("strong");title.textContent=a.name;
      const desc=document.createElement("p");desc.className="muted small";desc.textContent=a.desc;
      copy.append(title,desc);item.append(icon,copy);list.append(item);
    });
  }
  const oldStats=renderStats;
  renderStats=function(){oldStats();renderAchievements();};
  renderAchievements();

  // Backup v2: dados e mídias locais em um único JSON.
  // O importador v1 original permanece disponível para arquivos antigos.
  const note=document.createElement("p");
  note.className="muted small";
  note.textContent="Backup v2 inclui imagens/GIFs locais (até 30 MB por arquivo). Links externos precisam de internet. Guarde o JSON em lugar seguro.";
  $id("backupFile").after(note);

  function downloadJson(value){
    const blob=new Blob([JSON.stringify(value)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;a.download="hikki-fit-backup-v2-"+dayKey(new Date())+".json";
    document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),30000);
  }
  function toBase64(blob){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=()=>resolve(reader.result);
      reader.onerror=()=>reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }
  async function readAllMedia(){
    const entries=[];
    for(const ex of exercises){
      const media=await getExerciseMedia(ex.id);
      if(!media) continue;
      if(media.kind==="file"){
        if(!(media.blob instanceof Blob) || media.blob.size>30*1024*1024) throw Error("Arquivo de mídia inválido ou muito grande: "+ex.name);
        entries.push({id:ex.id,kind:"file",name:media.name||"imagem",mime:media.mime,content:await toBase64(media.blob)});
      }else if(media.kind==="link"){
        entries.push({id:ex.id,kind:"link",url:media.url,type:media.type});
      }
    }
    return entries;
  }
  let backupBusy=false;
  $id("exportBackup").onclick=async()=>{
    if(backupBusy)return;
    backupBusy=true;
    const btn=$id("exportBackup");btn.disabled=true;
    try{
      const media=await readAllMedia();
      const backup={...makeBackup(),version:2,media};
      downloadJson(backup);
      toast("Backup completo preparado! 💾");
    }catch(error){
      console.error(error);
      toast("Falha no backup. Confira o espaço disponível.");
    }finally{backupBusy=false;btn.disabled=false;}
  };
  function decodeDataUrl(value){
    if(typeof value!=="string" || !/^data:(image\/(png|jpeg|webp|gif)|video\/(mp4|webm));base64,/.test(value)) throw Error("Mídia inválida");
    const [header,body]=value.split(",");
    if(!body || body.length>42*1024*1024 || !/^[a-zA-Z0-9+/]*={0,2}$/.test(body))throw Error("Mídia inválida");
    const bytes=atob(body);
    const arr=new Uint8Array(bytes.length);
    for(let i=0;i<bytes.length;i++)arr[i]=bytes.charCodeAt(i);
    return new Blob([arr],{type:header.slice(5,-7)});
  }
  function validV2(backup){
    if(!backup || backup.app!=="Hikki Fit" || backup.version!==2 || !Array.isArray(backup.media))return false;
    return validateBackup({...backup,version:1}) &&
      backup.media.length<=backup.data.exercises.length &&
      new Set(backup.media.map(m=>m?.id)).size===backup.media.length &&
      backup.media.every(m=>m && typeof m.id==="string" && backup.data.exercises.some(e=>e.id===m.id) &&
        (m.kind==="link" ? validMediaUrl(m.url) && ["image","video"].includes(m.type) :
         m.kind==="file" && typeof m.content==="string" && typeof m.name==="string"));
  }
  function writeMediaBatch(entries){
    return openMediaDatabase().then(db=>new Promise((resolve,reject)=>{
      const tx=db.transaction(MEDIA_STORE,"readwrite");
      const store=tx.objectStore(MEDIA_STORE);
      store.clear();
      entries.forEach(([id,value])=>store.put(value,id));
      tx.oncomplete=()=>{db.close();resolve();};
      tx.onerror=()=>{db.close();reject(tx.error);};
      tx.onabort=()=>{db.close();reject(tx.error);};
    }));
  }
  const originalBackupImport=$id("backupFile").onchange;
  $id("backupFile").onchange=async event=>{
    const file=event.target.files && event.target.files[0];
    if(!file)return;
    if(file.size>90*1024*1024){
      event.target.value="";
      toast("Backup grande demais (limite 90 MB).");return;
    }
    let backup;
    try{backup=JSON.parse(await file.text());}
    catch{event.target.value="";toast("JSON inválido.");return;}
    if(backup.version!==2){return originalBackupImport.call(this,event);}

    event.target.value="";
    if(!validV2(backup)){toast("Backup v2 inválido.");return;}
    if(!confirm("Restaurar o backup v2? Isso substitui exercícios, histórico e mídias atuais."))return;
    const btn=$id("importBackup");btn.disabled=true;
    const keys=[KEYS.exercises,KEYS.workouts,KEYS.history,KEYS.reminders,KEYS.theme];
    const previous=Object.fromEntries(keys.map(k=>[k,localStorage.getItem(k)]));
    let previousMedia=[];
    try{
      previousMedia=await readAllMedia();
      const decoded=backup.media.map(m=>{
        if(m.kind==="link")return [m.id,{kind:"link",url:m.url,type:m.type}];
        const blob=decodeDataUrl(m.content);return [m.id,{kind:"file",name:m.name,mime:blob.type,blob}];
      });
      await writeMediaBatch(decoded);
      const data=backup.data;
      [data.exercises,data.workouts,data.history,data.reminders,data.theme].forEach((value,i)=>{
        localStorage.setItem(keys[i],JSON.stringify(value));
      });
      localStorage.removeItem(KEYS.reminderDismissed);
      localStorage.removeItem(KEYS.reminderSent);
      alert("Backup restaurado! O aplicativo será recarregado.");
      location.reload();
    }catch(error){
      console.error(error);
      keys.forEach(k=>{try{previous[k]===null?localStorage.removeItem(k):localStorage.setItem(k,previous[k]);}catch{}});
      try{
        const recovered=previousMedia.map(m=>[m.id,m.kind==="link"?
          {kind:"link",url:m.url,type:m.type}:
          {kind:"file",name:m.name,mime:decodeDataUrl(m.content).type,blob:decodeDataUrl(m.content)}]);
        await writeMediaBatch(recovered);
      }catch(rollbackError){console.error("Falha ao recuperar mídias",rollbackError);}
      toast("Não foi possível restaurar o backup.");
    }finally{btn.disabled=false;}
  };

  // Instalação PWA
  const install=document.createElement("button");
  install.type="button";install.className="secondary-btn wide";
  install.textContent="📲 Instalar Hikki Fit";
  const installInfo=document.createElement("p");
  installInfo.className="muted small";
  installInfo.textContent="No Android, abra no Chrome e use o menu ⋮ → Adicionar à tela inicial / Instalar app.";
  const installCard=document.createElement("div");
  installCard.className="card";
  const title=document.createElement("h3");title.textContent="📲 Aplicativo no celular";
  installCard.append(title,install,installInfo);
  card.after(installCard);
  let installPrompt=null;
  window.addEventListener("beforeinstallprompt",e=>{
    e.preventDefault();installPrompt=e;
    installInfo.textContent="Pronto para instalar no seu dispositivo.";
  });
  install.onclick=async()=>{
    if(!installPrompt){toast("Use o menu do navegador para instalar o aplicativo.");return;}
    const prompt=installPrompt;installPrompt=null;
    await prompt.prompt();
    await prompt.userChoice;
  };
  window.addEventListener("appinstalled",()=>{installInfo.textContent="Hikki Fit instalado! 💜";});
  if("serviceWorker" in navigator && (location.protocol==="https:" || location.hostname==="localhost")){
    window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(console.error));
  }
})();