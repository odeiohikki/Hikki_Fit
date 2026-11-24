"use strict";
(function(){
 const key="hikki_fit_journey_v2";
 const defaults={name:"Hikki Fit",photo:"",title:"",shell:"lilás",goal:3};
 const catalog={
 frame:[["lilas","Lilás",1,0],["simples","Prateada",1,0],["esmeralda","Esmeralda",5,0],["lunar","Lunar",10,0],["estelar","Estelar",15,0],["cosmica","Cósmica",25,0],["lendaria","Lendária",35,0],["passos","Primeiros passos",1,1],["constelacao","Constelação",1,10],["persistencia","Persistência",1,50],["determinacao","Determinação",1,100],["eclipse","Eclipse",20,0],["eternidade","Eternidade",50,0]],
 banner:[["noite","Noite lilás",1,0],["aurora","Aurora",1,0],["lua","Lua cheia",5,0],["cosmos","Cosmos",15,0]],
 color:[["normal","Padrão",1,0],["lilas","Lilás",1,0],["menta","Menta",5,0],["ouro","Dourado",15,0]],
 insignia:[["none","Sem insígnia",1,0],["moon","☾ Lua",1,0],["star","★ Estrela",1,1],["trophy","🏆 Troféu",1,10],["diamond","◆ Diamante",20,0]]
 };
 const allowed=(k,v)=>catalog[k].some(x=>x[0]===v)?v:catalog[k][0][0];
 function normalize(v){v=v||{};return {name:typeof v.name==="string"?v.name.slice(0,60):defaults.name,photo:typeof v.photo==="string"&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v.photo)&&v.photo.length<400000?v.photo:"",title:typeof v.title==="string"?v.title.slice(0,60):"",shell:["lilás","menta","estrela"].includes(v.shell)?v.shell:"lilás",frame:allowed("frame",v.frame),banner:allowed("banner",v.banner),color:allowed("color",v.color),insignia:allowed("insignia",v.insignia),goal:Number.isInteger(v.goal)&&v.goal>=1&&v.goal<=7?v.goal:3};}
 let state=normalize(load(key,defaults));
 window.hikkiJourney={key,normalize,export:()=>({...state})};
 const card=(heading)=>{const n=el("section","","card journey-card");n.append(el("h3",heading));return n;};
 const profile=document.querySelector(".profile-card"), home=$("home");
 const settings=card("🐢 Minha identidade");
 const name=el("input");name.maxLength=60;name.value=state.name;name.setAttribute("aria-label","Nome");
 const photo=el("input");photo.type="file";photo.accept="image/png,image/jpeg,image/webp";photo.setAttribute("aria-label","Foto de perfil");
 const titles=el("select");titles.setAttribute("aria-label","Título");
 const shells=el("select");shells.setAttribute("aria-label","Casco");
 const goal=el("input");goal.type="number";goal.min=1;goal.max=7;goal.value=state.goal;goal.setAttribute("aria-label","Meta semanal de dias ativos");
 function commit(p){const next=normalize({...state,...p});if(save(key,next)){state=next;refresh();}}
 settings.append(el("label","Nome"),name,el("label","Título"),titles,el("label","Meta opcional de dias ativos por semana"),goal,button("Salvar perfil","primary-btn",()=>commit({name:name.value.trim()||defaults.name,title:titles.value,goal:Number(goal.value)})));
 photo.onchange=()=>{const f=photo.files[0];photo.value="";if(!f)return;if(f.size>280000){toast("Escolha uma imagem menor.");return;}const reader=new FileReader();reader.onload=()=>{if(!normalize({photo:reader.result}).photo){toast("Formato de imagem inválido.");return;}commit({photo:reader.result});photoDialog.close();};reader.readAsDataURL(f);};
 profile.after(settings);
 const avatarButton=profile.querySelector(".avatar");
 avatarButton.setAttribute("role","button");avatarButton.tabIndex=0;avatarButton.setAttribute("aria-label","Alterar foto de perfil");
 const photoDialog=el("dialog");photoDialog.append(el("h3","Foto de perfil"),el("p","Escolha uma imagem de até 280 KB.","muted"),button("Escolher nova foto","primary-btn",()=>photo.click()),button("Remover foto","secondary-btn wide",()=>{commit({photo:""});photoDialog.close();}),button("Cancelar","secondary-btn wide",()=>photoDialog.close()));
 photo.hidden=true;photoDialog.append(photo);document.body.append(photoDialog);
 avatarButton.onclick=()=>photoDialog.showModal();
 avatarButton.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();photoDialog.showModal();}};
 profile.classList.add("compact-profile");
 const banner=el("div","","profile-banner");banner.setAttribute("aria-hidden","true");profile.prepend(banner);
 const insignia=el("span","","profile-insignia");profile.querySelector("h3").after(insignia);
 const cosmetics=el("dialog");cosmetics.className="cosmetic-dialog";const fields=el("div");const selects={};const preview=el("div","","cosmetic-preview");const previewAvatar=el("div","🐢","cosmetic-avatar");const previewName=el("strong");preview.append(previewAvatar,previewName);
 function eligible(item){return calcularNivel().nivel>=item[2]&&history.length>=item[3];}
 function effective(k,v){return catalog[k].some(x=>x[0]===v&&eligible(x))?v:catalog[k][0][0];}
 function paintPreview(){preview.dataset.banner=selects.banner.value;previewAvatar.dataset.frame=selects.frame.value;previewName.dataset.color=selects.color.value;previewName.textContent=state.name+" "+(catalog.insignia.find(x=>x[0]===selects.insignia.value)?.[1]||"").replace("Sem insígnia","");}
 for(const [k,label] of Object.entries({frame:"Moldura",banner:"Banner",color:"Cor do nome",insignia:"Insígnia"})){const select=el("select");select.setAttribute("aria-label",label);select.onchange=paintPreview;selects[k]=select;fields.append(el("label",label),select);}
 cosmetics.append(el("h3","🎨 Personalizar perfil"),preview,fields,button("Salvar personalização","primary-btn",()=>{commit(Object.fromEntries(Object.keys(selects).map(k=>[k,effective(k,selects[k].value)])));cosmetics.close();}),button("Cancelar","secondary-btn wide",()=>cosmetics.close()));document.body.append(cosmetics);
 settings.prepend(button("🎨 Molduras e personalização","secondary-btn wide",()=>{for(const k of Object.keys(selects)){const select=selects[k];select.replaceChildren();for(const item of catalog[k]){const o=el("option",item[1]+(eligible(item)?"":" 🔒 "+(item[3]?item[3]+" treinos":"Nível "+item[2])));o.value=item[0];o.disabled=!eligible(item);select.append(o);}select.value=effective(k,state[k]);}previewAvatar.replaceChildren();if(state.photo){const img=el("img");img.src=state.photo;img.alt="Prévia da foto";previewAvatar.append(img);}else previewAvatar.textContent="🐢";paintPreview();cosmetics.showModal();}));
 
 
 const mascot=card("🌙 Universo Hikki"), stage=el("p"), turtle=el("img");turtle.src="icon.svg";turtle.alt="Tartaruga Hikki";turtle.className="journey-turtle";mascot.append(turtle,stage,el("p","Seu ritmo é suficiente. Descansar também faz parte.","muted"));home.prepend(mascot);
 const tips=["Beba água ao longo do dia.","Descanse entre sessões intensas.","Comece com movimentos leves.","Priorize uma técnica confortável.","Durma o suficiente para recuperar.","Faça pausas quando precisar.","Uma alimentação variada ajuda na recuperação.","Não treine através de dor aguda.","Progresso não precisa ser rápido.","Ajuste o treino ao seu nível de energia."];
 const tip=card("✨ Dica do dia");const today=new Date();tip.append(el("p",tips[Math.floor(Date.UTC(today.getFullYear(),today.getMonth(),today.getDate())/86400000)%tips.length]));mascot.after(tip);
 const evolution=card("📅 Minha evolução"), monthLabel=el("h4"), grid=el("div","","journey-calendar"), detail=el("p","","muted"), stats=el("p");let month=new Date(today.getFullYear(),today.getMonth(),1);
 const controls=el("div","","journey-controls");controls.append(button("←","secondary-btn",()=>{month.setMonth(month.getMonth()-1);calendar();}),monthLabel,button("→","secondary-btn",()=>{month.setMonth(month.getMonth()+1);calendar();}));evolution.append(controls,grid,detail,stats);$("history").prepend(evolution);home.append(button("📅 Calendário e evolução","secondary-btn wide",()=>showPage("history")));
 function calendar(){monthLabel.textContent=month.toLocaleDateString("pt-BR",{month:"long",year:"numeric"});grid.replaceChildren();for(const d of ["D","S","T","Q","Q","S","S"])grid.append(el("span",d));for(let i=0;i<month.getDay();i++)grid.append(el("span"));let count=0,seconds=0;for(let d=1;d<=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();d++){const date=new Date(month.getFullYear(),month.getMonth(),d);const records=history.filter(h=>dateKey(new Date(h.completedAt))===dateKey(date));count+=records.length;seconds+=records.reduce((s,h)=>s+(h.durationSeconds||0),0);const b=button(String(d),records.length?"journey-day active":"journey-day",()=>{detail.textContent=date.toLocaleDateString("pt-BR")+": "+records.length+" treino(s)";});grid.append(b);}const start=new Date();start.setHours(0,0,0,0);start.setDate(start.getDate()-((start.getDay()+6)%7));const days=new Set(history.filter(h=>new Date(h.completedAt)>=start&&new Date(h.completedAt)<=new Date()).map(h=>dateKey(new Date(h.completedAt))));stats.textContent=count+" treinos no mês • "+Math.round(seconds/60)+" min • Semana: "+days.size+"/"+state.goal+" dias ativos • Recorde de duração: "+Math.round(history.reduce((m,h)=>Math.max(m,h.durationSeconds||0),0)/60)+" min";}
 function refresh(){const level=calcularNivel().nivel;const unlocked=["","Pequeno aventureiro","Explorador iniciante","Primeiro passo",...(history.length>=10?["Explorador lunar"]:[]),...(level>=5?["Guardião das estrelas"]:[])].filter(t=>t!=="Primeiro passo"||history.length>0);titles.replaceChildren();for(const t of unlocked){const o=el("option",t||"Sem título");o.value=t;titles.append(o);}titles.value=unlocked.includes(state.title)?state.title:"";shells.replaceChildren();for(const s of ["lilás",...(level>=5?["menta"]:[]),...(level>=10?["estrela"]:[])]){const o=el("option",s);o.value=s;shells.append(o);}shells.value=[...shells.options].some(o=>o.value===state.shell)?state.shell:"lilás";profile.querySelector("h3").textContent=state.name+(titles.value?" • "+titles.value:"");const avatar=profile.querySelector(".avatar");avatar.replaceChildren();if(state.photo){const img=el("img");img.src=state.photo;img.alt="Foto de perfil";avatar.append(img);}else avatar.textContent="🐢";stage.textContent=["Pequena aventureira","Tartaruguinha aprendiz","Exploradora lunar","Guardiã das estrelas","Tartaruga lendária"][level<5?0:level<10?1:level<20?2:level<35?3:4]+" • Nível "+level;avatar.dataset.frame=effective("frame",state.frame);banner.dataset.banner=effective("banner",state.banner);profile.querySelector("h3").dataset.color=effective("color",state.color);insignia.textContent=effective("insignia",state.insignia)==="none"?"":catalog.insignia.find(x=>x[0]===effective("insignia",state.insignia))[1];turtle.dataset.shell=level>=10?"estrela":level>=5?"menta":"lilás";turtle.dataset.stage=String(level<5?1:level<10?2:level<20?3:level<35?4:5);turtle.style.transform="scale("+ (level<5?0.85:level<10?0.92:1)+")";calendar();}
 const oldPage=showPage;showPage=function(page){oldPage(page);if(!session)refresh();};
 const previous=renderStats;renderStats=function(){previous();refresh();};
 const search=el("input");search.placeholder="Buscar exercício";search.setAttribute("aria-label","Buscar exercício");$("exerciseList").before(search);function filter(){const q=search.value.toLocaleLowerCase();for(const node of $("exerciseList").children)node.hidden=!node.textContent.toLocaleLowerCase().includes(q);}search.oninput=filter;const oldRender=renderExercises;renderExercises=function(){oldRender();filter();};
 refresh();
})();
