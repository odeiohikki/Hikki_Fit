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

test('níveis e XP nos limites de progressão',()=>{
 const vm=require('node:vm');
 const src=fs.readFileSync('script.js','utf8');
 const fn=src.match(/function calcularNivel\(\) \{[\s\S]*?\n\}/)[0];
 for(const [xp,level,percent] of [[0,1,0],[99,1,99],[100,2,0],[299,2,99],[300,3,0],[599,3,99],[600,4,0]]){
  const result=vm.runInNewContext(fn+';calcularNivel()', {calcularXpTotal:()=>xp});
  assert.equal(result.nivel,level);assert.equal(result.porcentagem,percent);
  assert.equal(result.xpTotal,xp);
 }
});
test('catálogo de títulos único e requisitos consistentes',()=>{
 const vm=require('node:vm');
 const src=fs.readFileSync('journey.js','utf8');
 const themes=src.match(/const themes=(\[[^\n]*?\]), shades=/)[1];
 const extra=src.match(/const extraTitles=[^\n]+/)[0];
 const catalog=src.match(/const titleCatalog=[^\n]+/)[0];
 const eligible=src.match(/function eligible\(item\)\{[^\n]+?\}/)[0];
 const result=vm.runInNewContext('const themes='+themes+';'+extra+catalog+eligible+';({all:titleCatalog.map(t=>t[0]),unlocked:titleCatalog.filter(eligible).map(t=>t[0])})',{calcularNivel:()=>({nivel:1}),history:[]});
 assert.equal(result.all.length,50);assert.equal(new Set(result.all).size,50);
 assert.equal(result.unlocked.length,2);
 assert.match(src,/titleCatalog\.filter\(eligible\)/);
});
test('mascote utiliza as cinco ilustrações conforme o nível',()=>{
 const src=fs.readFileSync('journey.js','utf8');
 const expression=src.match(/turtle\.dataset\.stage=String\(([^;]+)\);/)[1];
 const vm=require('node:vm');
 for(const [level,stage] of [[1,1],[4,1],[5,2],[9,2],[10,3],[19,3],[20,4],[34,4],[35,5],[100,5]])assert.equal(vm.runInNewContext(expression,{level}),stage);
 assert.match(src,/turtleStages\[Number\(turtle\.dataset\.stage\)-1\]/);
});
