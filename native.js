"use strict";
(function(){
 const cap=window.Capacitor;
 if(!cap?.isNativePlatform?.())return;
 const plugins=cap.Plugins, notifications=plugins.LocalNotifications;
 const profile=document.getElementById('profile');
 const badge=document.createElement('p');badge.className='muted small';badge.textContent='Android experimental • 0.1';document.querySelector('.topbar').after(badge);
 const panel=document.createElement('section');panel.className='card';
 const heading=document.createElement('h3');heading.textContent='🔔 Notificações nativas — teste';panel.append(heading);
 const status=document.createElement('p');status.className='muted';status.setAttribute('role','status');status.textContent='Teste local, sem Firebase. Agende e feche normalmente o aplicativo.';panel.append(status);
 const ids=[91001,91002];
 async function permission(){let p=await notifications.checkPermissions();if(p.display!=='granted')p=await notifications.requestPermissions();if(p.display!=='granted')throw Error('Permissão não concedida');}
 function button(label,action){const b=document.createElement('button');b.className='secondary-btn wide';b.textContent=label;b.onclick=async()=>{b.disabled=true;try{status.textContent=await action();}catch(e){status.textContent='Falha: '+e.message;}finally{b.disabled=false;}};panel.append(b);}
 async function schedule(delay,id){await permission();await notifications.cancel({notifications:[{id}]});await notifications.schedule({notifications:[{id,title:'Hikki Fit 💜',body:'🐱 Lembrete local experimental',schedule:{at:new Date(Date.now()+delay),allowWhileIdle:true}}]});return 'Teste agendado. O Android pode atrasar a entrega.';}
 button('Solicitar permissão',async()=>{await permission();return 'Permissão concedida.';});
 button('Testar notificação agora',()=>schedule(2000,ids[0]));
 button('Agendar teste em 1 minuto',()=>schedule(60000,ids[1]));
 button('Cancelar notificações de teste',async()=>{await notifications.cancel({notifications:ids.map(id=>({id}))});return 'Testes cancelados.';});
 profile.append(panel);
 // Existing browser reminder UI remains available for in-app reminders only.
 const old=document.getElementById('enableNotifications');if(old)old.hidden=true;
 window.hikkiNativeExport=async value=>{
 const name='hikki-fit-backup-v2-'+new Date().toISOString().slice(0,10)+'.json';
 const file=await plugins.Filesystem.writeFile({path:name,data:JSON.stringify(value),directory:'CACHE',encoding:'utf8'});
 await plugins.Share.share({title:'Backup Hikki Fit',files:[file.uri],dialogTitle:'Salvar backup'});
 };
})();
