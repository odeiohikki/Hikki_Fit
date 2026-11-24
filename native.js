"use strict";
(function(){
 const cap=window.Capacitor;
 if(!cap?.isNativePlatform?.())return;
 const plugins=cap.Plugins, notifications=plugins.LocalNotifications;
 const profile=document.getElementById('profile');
 const badge=document.createElement('p');badge.className='muted small';badge.textContent='Android experimental • 0.2';document.querySelector('.topbar').after(badge);
 const panel=document.createElement('section');panel.className='card';
 const heading=document.createElement('h3');heading.textContent='🔔 Notificações nativas — teste';panel.append(heading);
 const status=document.createElement('p');status.className='muted';status.setAttribute('role','status');status.textContent='Teste local, sem Firebase. Agende e feche normalmente o aplicativo.';panel.append(status);
 const ids=[91001,91002,91003,91004];
 const log=(message)=>{try{const entries=JSON.parse(localStorage.getItem('hikki_native_log')||'[]');entries.push(new Date().toISOString()+' '+message);localStorage.setItem('hikki_native_log',JSON.stringify(entries.slice(-30)));}catch{}};
 notifications.addListener('localNotificationReceived',n=>log('Recebida '+n.id));
 async function permission(){let p=await notifications.checkPermissions();if(p.display!=='granted')p=await notifications.requestPermissions();if(p.display!=='granted')throw Error('Permissão não concedida');}
 function button(label,action){const b=document.createElement('button');b.className='secondary-btn wide';b.textContent=label;b.onclick=async()=>{b.disabled=true;try{status.textContent=await action();}catch(e){status.textContent='Falha: '+e.message;}finally{b.disabled=false;}};panel.append(b);}
 async function schedule(delay,id){await permission();await notifications.cancel({notifications:[{id}]});await notifications.schedule({notifications:[{id,title:'Hikki Fit 💜',body:'🐱 Lembrete local experimental',schedule:{at:new Date(Date.now()+delay),allowWhileIdle:true}}]});log('Agendado '+id+' para '+new Date(Date.now()+delay).toISOString());return 'Teste agendado. O Android pode atrasar a entrega.';}
 button('Solicitar permissão',async()=>{await permission();return 'Permissão concedida.';});
 button('Testar notificação agora',()=>schedule(2000,ids[0]));
 button('Agendar teste em 1 minuto',()=>schedule(60000,ids[1]));
 button('Agendar teste em 5 minutos',()=>schedule(300000,ids[2]));
 button('Agendar teste em 15 minutos',()=>schedule(900000,ids[3]));
 button('Permitir alarmes exatos',async()=>{const p=await notifications.changeExactNotificationSetting();return 'Alarmes exatos: '+p.exact_alarm;});
 button('Diagnóstico',async()=>{const p=await notifications.checkPermissions();const e=await notifications.checkExactNotificationSetting();const pending=await notifications.getPending();return 'Notificações: '+p.display+' • Alarmes exatos: '+e.exact_alarm+' • Pendentes: '+pending.notifications.map(n=>n.id).join(', ')+' • '+(JSON.parse(localStorage.getItem('hikki_native_log')||'[]').slice(-5).join(' | '));});
 button('Cancelar notificações de teste',async()=>{await notifications.cancel({notifications:ids.map(id=>({id}))});log('Testes cancelados');return 'Testes cancelados.';});
 profile.append(panel);
 // Existing browser reminder UI remains available for in-app reminders only.
 const old=document.getElementById('enableNotifications');if(old)old.hidden=true;
 window.hikkiNativeExport=async (value,share=false)=>{
 const name='hikki-fit-backup-v2-'+new Date().toISOString().slice(0,10)+'.json';
 const file=await plugins.Filesystem.writeFile({path:name,data:JSON.stringify(value),directory:'CACHE',encoding:'utf8'});
 if(!share){return plugins.HikkiBackup.save({uri:file.uri,name});}
 await plugins.Share.share({title:'Backup Hikki Fit',files:[file.uri],dialogTitle:'Salvar backup'});
 };
})();
