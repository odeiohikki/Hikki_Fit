const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..'), out=path.join(root,'www');
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out);
for(const name of ['index.html','style.css','script.js','media.js','final.js','icon.svg','native.js','journey.js'])fs.copyFileSync(path.join(root,name),path.join(out,name));
let html=fs.readFileSync(path.join(out,'index.html'),'utf8');
html=html.replace(/<link[^>]+rel="manifest"[^>]*>/,'').replace(/<script[^>]+src="push\.js"[^>]*><\/script>/,'<script src="journey.js" defer></script><script src="native.js" defer></script>');
if(!html.includes('native.js')||html.includes('push.js'))throw Error('Falha na adaptação Android');
fs.writeFileSync(path.join(out,'index.html'),html);
let final=fs.readFileSync(path.join(out,'final.js'),'utf8');
// Preserve backup format; use native share for exporting JSON.
final=final.replace('function downloadJson(value){','async function downloadJson(value, share=false){\n    if(window.hikkiNativeExport) return window.hikkiNativeExport(value, share);');
final=final.replace('downloadJson(backup);','await downloadJson(backup);');
fs.writeFileSync(path.join(out,'final.js'),final);

final=final.replace('$id("exportBackup").onclick=async()=>{','async function exportBackup(share=false){')
.replace('await downloadJson(backup);','if(new Blob([JSON.stringify(backup)]).size>90*1024*1024) throw Error("Backup excede 90 MB"); await downloadJson(backup,share);')
.replace('  function decodeDataUrl(value){','  $id("exportBackup").onclick=()=>exportBackup(false);\n  const shareButton=document.createElement("button");shareButton.className="secondary-btn wide";shareButton.textContent="Compartilhar backup";shareButton.onclick=()=>exportBackup(true);$id("exportBackup").after(shareButton);\n  function decodeDataUrl(value){')
.replace('card.after(installCard);','if(!window.Capacitor?.isNativePlatform?.())card.after(installCard);')
.replace('if("serviceWorker" in navigator','if(!window.Capacitor?.isNativePlatform?.() && "serviceWorker" in navigator')
.replace('let previousMedia=[];','let previousMedia=null; let mediaChanged=false;')
.replace('await writeMediaBatch(decoded);','await writeMediaBatch(decoded); mediaChanged=true;')
.replace('const recovered=previousMedia.map','if(mediaChanged&&previousMedia!==null){\n        const recovered=previousMedia.map');
final=final.replace('await writeMediaBatch(recovered);','await writeMediaBatch(recovered); }');
fs.writeFileSync(path.join(out,'final.js'),final);

final=final.replace('version:2,media};','version:2,media,journey:window.hikkiJourney?.export()};').replace('let previousMedia=null;','if(window.hikkiJourney)previous[window.hikkiJourney.key]=localStorage.getItem(window.hikkiJourney.key);\n    let previousMedia=null;').replace('localStorage.removeItem(KEYS.reminderDismissed);','if(window.hikkiJourney && backup.journey) localStorage.setItem(window.hikkiJourney.key,JSON.stringify(window.hikkiJourney.normalize(backup.journey)));\n      localStorage.removeItem(KEYS.reminderDismissed);').replace('keys.forEach(k=>{try{previous[k]','Object.keys(previous).forEach(k=>{try{previous[k]');
fs.writeFileSync(path.join(out,'final.js'),final);
