'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const L=require('../src/layout-engine'),J=require('../src/json-design');
const read=name=>fs.readFileSync('designs/'+name,'utf8'),manifest=JSON.parse(read('manifest.json'));
const templates=manifest.templates.map(row=>JSON.parse(read(row.file))),article={title:'제목',subtitle:'부제',body:'본문 '.repeat(250),images:[]};
test('provided manifest discovers three original draft JSON files and all validate',async()=>{const rows=await J.load(read);assert.equal(rows.length,3);assert.ok(rows.every(r=>r.design));assert.deepEqual(rows.map(r=>r.id),manifest.templates.map(r=>r.id));});
for(const [i,raw] of templates.entries())test('JSON Layout '+(i+1)+' preserves every frame and original typography value',()=>{
 const p=L.fromDesign(raw,article);assert.equal(p.origin,'json');assert.equal(p.settings.width,216);assert.equal(p.settings.height,303);assert.equal(p.pages[0].elements.length,i===2?9:8);
 raw.elements.forEach((e,j)=>{const b=p.pages[0].elements[j];for(const k of ['x','y','width','height'])assert.equal(b[k],e.frame[k]);if(e.typography){const t=L.typography(b,p.settings);assert.equal(t.font,e.typography.fontFamily+'\t'+e.typography.fontStyle);if(e.typography.fontSizePt!==null)assert.equal(t.size,e.typography.fontSizePt);if(e.typography.leadingPt!==null)assert.equal(t.leading,e.typography.leadingPt);assert.equal(t.tracking,e.typography.tracking);}if(e.stroke){assert.equal(b.stroke.weight,1.5);assert.equal(b.stroke.color.css,'#303558');}if(e.type==='image'){assert.equal(b.cornerRadius,5);assert.equal(b.fill.space,'CMYK');assert.equal(b.fit,'cover');}});
 assert.equal(L.validate(p,article),true);assert.equal(p.warnings.length,2);assert.equal(L.pageElements(p,article,0),p.pages[0].elements);
});
test('schema rejects invalid types, coordinates, typography, color, columns, gaps and decorative strokes',()=>{
 const bad=[x=>x.$schema='unknown',x=>x.schemaVersion=2,x=>x.id='../x',x=>x.page.units='pt',x=>x.page.widthMm=-1,x=>x.elements[0].type='script',x=>x.elements[0].role='unknown',x=>x.elements[0].frame.x='1',x=>x.elements[0].frame.height=0,x=>x.elements[1].typography.fontSizePt=NaN,x=>x.elements[1].typography.leadingPt=-5,x=>x.elements[1].typography.tracking='20',x=>x.elements[1].columns=1.5,x=>x.elements[1].columnGap=-2,x=>x.elements[1].inset=[99,99,99,99],x=>x.elements[0].fit='stretch',x=>x.elements[0].fillColorRef='Color/unknown',x=>x.elements[6].stroke.weightPt=-1,x=>x.elements[6].stroke.cap='bad',x=>x.elements[2].flowOrder=1];
 for(const change of bad){const x=structuredClone(templates[0]);change(x);assert.throws(()=>J.validate(x),/디자인 JSON/);}
});
test('one corrupt JSON is isolated; unsafe manifest paths never reach the reader',async()=>{
 const rows=await J.load(name=>name===manifest.templates[1].file?'bad json':read(name));assert.ok(rows[0].design);assert.ok(rows[1].error);assert.ok(rows[2].design);
 let reads=0;const bad=await J.load(name=>{reads++;assert.equal(name,'manifest.json');return JSON.stringify({schema:'magazine-studio-layout-library/v1-draft',templates:[{id:'escape',file:'../private.json'}]});});assert.equal(reads,1);assert.ok(bad[0].error);
});
test('common units round trip mm/pt including small frame and 1.5pt line',()=>{assert.equal(L.mmToPt(25.4),72);assert.equal(L.ptToMm(72),25.4);for(const n of [1.5,4.013,13,51])assert.ok(Math.abs(L.mmToPt(L.ptToMm(n))-n)<1e-10);});
test('long body preserves original first page, uses ordered body frames and inherited continuation typography',()=>{
 const long={...article,body:'긴 본문 '.repeat(3000)},short=L.fromDesign(templates[2],article),p=L.fromDesign(templates[2],long);
 assert.ok(p.pages.length>1);assert.deepEqual(p.pages[0],short.pages[0]);assert.deepEqual(p.pages[1].elements[0].typography,p.pages[0].elements.find(b=>b.role==='body').typography);assert.ok(p.pages[1].elements[0].columns>1);
 const tamper=structuredClone(p);tamper.pages[0].elements[0].x+=1;assert.throws(()=>L.validate(tamper,long),/원본 디자인/);
});
test('font replacement is explicit, survives project JSON and never changes geometry',()=>{
 const original=L.fromDesign(templates[0],article),p=L.fromDesign(templates[0],article,{bodyFont:'Installed\tBook',titleFont:'Installed\tHeavy'});
 assert.equal(p.pages[0].elements.find(b=>b.role==='title').typography.font,'Installed\tHeavy');assert.equal(p.pages[0].elements.find(b=>b.role==='header').typography.font,'Installed\tBook');
 assert.deepEqual(p.pages[0].elements.map(b=>[b.x,b.y,b.width,b.height]),original.pages[0].elements.map(b=>[b.x,b.y,b.width,b.height]));assert.equal(L.validate(JSON.parse(JSON.stringify(p)),article),true);
});
test('no photo keeps original frame; free three candidates remain independent of JSON designs',()=>{const p=L.fromDesign(templates[0],article);assert.equal(p.pages[0].elements.filter(b=>b.role==='image').length,1);assert.equal(p.design.contentSlots.images.min,1);assert.deepEqual(L.candidates(article).map(p=>p.origin),['local','local','local']);});

test('independent frames preserve flowOrder and extra photos cannot be silently ignored',()=>{
 const shuffled=structuredClone(templates[0]);[shuffled.elements[1],shuffled.elements[2]]=[shuffled.elements[2],shuffled.elements[1]];
 const p=L.fromDesign(shuffled,article);assert.deepEqual(p.pages[0].elements.filter(b=>b.role==='body').map(b=>b.flowOrder),[2,1]);assert.equal(L.validate(p,article),true);
 assert.throws(()=>L.fromDesign(templates[0],{...article,images:[{path:'a'},{path:'b'}]}),/사진 1장/);
});
