const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process');
test('Android bundle preserves core files and excludes push',()=>{cp.execFileSync(process.execPath,['scripts/build-android.cjs']);const html=fs.readFileSync('www/index.html','utf8');assert.match(html,/journey\.js/);assert.match(html,/native\.js/);assert.doesNotMatch(html,/push\.js|rel="manifest"/);for(const f of ['script.js','media.js','style.css'])assert.equal(fs.readFileSync('www/'+f,'utf8'),fs.readFileSync(f,'utf8'));for(const f of ['script.js','media.js','final.js','native.js','journey.js'])cp.execFileSync(process.execPath,['--check','www/'+f]);});

test('backup beta inclui perfil e separa compartilhamento',()=>{const f=fs.readFileSync('www/final.js','utf8');assert.match(f,/journey:window.hikkiJourney/);assert.match(f,/exportBackup\(true\)/);assert.match(f,/hikkiJourney.normalize/);});

test('conselhos originais e cinco estágios do mascote',()=>{
 const src=fs.readFileSync('journey.js','utf8');
 const tips=JSON.parse(src.match(/const tips=(\[[^\n]*\]);/)[1]);
 assert.equal(tips.length,365);
 assert.equal(new Set(tips).size,tips.length);
 assert.ok(tips.every(t=>typeof t==='string'&&t.trim().length>=20));
 const stages=JSON.parse(src.match(/const turtleStages=(\[[^\n]*?\]);const mascot=/)[1]);
 assert.equal(stages.length,5);
 assert.equal(new Set(stages).size,5);
 assert.ok(stages.every(s=>s.startsWith('<svg ')&&s.endsWith('</svg>')));
});
test('restauração protege mídias antes da substituição',()=>{
 const f=fs.readFileSync('www/final.js','utf8');
 assert.match(f,/let mediaChanged=false/);
 assert.match(f,/await writeMediaBatch\(decoded\); mediaChanged=true/);
 assert.match(f,/if\(mediaChanged&&previousMedia!==null\)/);
 assert.match(f,/Object\.keys\(previous\)\.forEach/);
});
test('controle de tela nativo tem ativação e desativação',()=>{
 const java=fs.readFileSync('android-src/HikkiBackup.java','utf8');
 assert.match(java,/addFlags\(android\.view\.WindowManager\.LayoutParams\.FLAG_KEEP_SCREEN_ON\)/);
 assert.match(java,/clearFlags\(android\.view\.WindowManager\.LayoutParams\.FLAG_KEEP_SCREEN_ON\)/);
 assert.match(fs.readFileSync('native.js','utf8'),/setAwake\(\{enabled:!!session&&!document.hidden\}\)/);
});
