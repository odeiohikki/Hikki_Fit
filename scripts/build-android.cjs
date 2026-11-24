const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..'), out=path.join(root,'www');
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out);
for(const name of ['index.html','style.css','script.js','media.js','final.js','icon.svg','native.js'])fs.copyFileSync(path.join(root,name),path.join(out,name));
let html=fs.readFileSync(path.join(out,'index.html'),'utf8');
html=html.replace(/<link[^>]+rel="manifest"[^>]*>/,'').replace(/<script[^>]+src="push\.js"[^>]*><\/script>/,'<script src="native.js" defer></script>');
if(!html.includes('native.js')||html.includes('push.js'))throw Error('Falha na adaptação Android');
fs.writeFileSync(path.join(out,'index.html'),html);
let final=fs.readFileSync(path.join(out,'final.js'),'utf8');
// Preserve backup format; use native share for exporting JSON.
final=final.replace('function downloadJson(value){','async function downloadJson(value){\n    if(window.hikkiNativeExport) return window.hikkiNativeExport(value);');
final=final.replace('downloadJson(backup);','await downloadJson(backup);');
fs.writeFileSync(path.join(out,'final.js'),final);
