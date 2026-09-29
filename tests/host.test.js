'use strict';
// Host double exercises our adapter control flow. It does not emulate Adobe typography/API compatibility.
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const L=require('../src/layout-engine');
function host(options={}){
 const docs=[],calls=[];let counter=0;
 const coll=arr=>({get length(){return arr.length;},item:i=>arr[i]});
 function document(){
  const pages=[],stories=[];
  const doc={isValid:true,id:++counter,documentPreferences:{},viewPreferences:{},textPreferences:{},allGraphics:[],links:coll([]),fonts:coll([{name:'regular',status:1}]),colors:{add:p=>p},paragraphStyles:{add:p=>p},swatches:{itemByName:()=>({isValid:true}),item:()=>({})},recompose(){},save:p=>calls.push(['save',doc.id,p]),exportFile:(format,p)=>calls.push(['pdf',doc.id,p]),close(){doc.isValid=false;calls.push(['close',doc.id]);}};
  function frame(page){
    let current;
    const t={pointSize:10.5,leading:16.2};
    const st={id:++counter,data:'',frames:[],texts:{item:()=>t},get contents(){return this.data;},set contents(v){this.data=v;},get overflows(){return this.data.length>this.frames.length*(options.capacity||10000);}};
    current=st;stories.push(st);
    const f={isValid:true,label:'',parentPage:page,textFramePreferences:{},get parentStory(){return current;},get contents(){const idx=current.frames.indexOf(f);return current.data.slice(idx*(options.capacity||10000),(idx+1)*(options.capacity||10000));},set contents(v){current.data=v;},set nextTextFrame(next){const old=next.parentStory;for(const it of old.frames)it._setStory(current);current.frames.push(...old.frames);const ix=stories.indexOf(old);if(ix>=0)stories.splice(ix,1);},_setStory:s=>current=s};
    st.frames=[f];return f;
  }
  function page(){const p={textFrames:{add:()=>frame(p)},rectangles:{add:()=>({place(){if(options.failImage)throw new Error('place failed');},fit(){}})},remove(){pages.splice(pages.indexOf(p),1);}};return p;}
  pages.push(page());doc.pages={...coll(pages),get length(){return pages.length;},add(){const p=page();pages.push(p);return p;}};doc.stories=coll(stories);docs.push(doc);return doc;
 }
 const enums={FontStatus:{INSTALLED:1},ColorModel:{PROCESS:1},ColorSpace:{RGB:1},Justification:{LEFT_ALIGN:1},AutoSizingTypeEnum:{OFF:0},LocationOptions:{AT_END:1},FitOptions:{FILL_PROPORTIONALLY:1,CENTER_CONTENT:2},MeasurementUnits:{MILLIMETERS:1},RulerOrigin:{PAGE_ORIGIN:1},ScriptLanguage:{JAVASCRIPT:1},UndoModes:{ENTIRE_SCRIPT:1},SaveOptions:{NO:0},LinkStatus:{NORMAL:1},ExportFormat:{PDF_TYPE:1}};
 const app={documents:{add:document},fonts:{length:1,itemByName:()=>({isValid:!options.missingFont,status:1}),item:()=>({name:'regular',fontFamily:'regular',status:1})},doScript:fn=>fn(),get activeDocument(){throw new Error('The active user document must never be accessed');}};
 const module={exports:{}};
 vm.runInNewContext(fs.readFileSync('src/auto-indesign.js','utf8'),{require:n=>n==='indesign'?{...enums,app}:n==='fs'?{lstat:async()=>{if(options.missingImage)throw new Error('missing');return {isFile:()=>true};}}:L,module,Set,console});
 return {api:module.exports,docs,calls};
}
const a={title:'제목',subtitle:'',body:'본문입니다 '.repeat(150),images:[]};
test('new document generation never reads/mutates the active document; body is complete',async()=>{const h=host();const p=L.candidates(a)[0],r=await h.api.create(a,p);assert.equal(h.docs.length,1);assert.equal(r.errors.length,0);const body=Array.from({length:h.docs[0].stories.length},(_,i)=>h.docs[0].stories.item(i)).find(s=>s.data===a.body);assert.ok(body);});
test('simulated host overset adds linked continuation pages',async()=>{const h=host({capacity:400});const p=L.candidates(a)[0];const r=await h.api.create(a,p);assert.ok(r.pageCount>p.pages.length);assert.equal(r.errors.length,0);});
test('missing font and inaccessible image fail before document creation',async()=>{const h=host({missingFont:true});await assert.rejects(()=>h.api.create(a,L.candidates(a)[0]));assert.equal(h.docs.length,0);const b={...a,images:[{path:'missing.png'}]},i=host({missingImage:true});await assert.rejects(()=>i.api.create(b,L.candidates(b)[0]));assert.equal(i.docs.length,0);});
test('write failure closes only the new incomplete document',async()=>{const h=host({failImage:true}),b={...a,images:[{path:'p.png'}]};await assert.rejects(()=>h.api.create(b,L.candidates(b)[0]));assert.equal(h.docs.length,1);assert.equal(h.docs[0].isValid,false);assert.deepEqual(h.calls.map(x=>x[0]),['close']);});
test('save/export target the generated document, not active document',async()=>{const h=host();await h.api.create(a,L.candidates(a)[0]);h.api.save('/out/a.indd');h.api.exportPdf('/out/a.pdf');assert.ok(h.calls.every(c=>c[1]===h.docs[0].id));});
test('PDF export is blocked after a font/link error and after closing document',async()=>{const h=host();await h.api.create(a,L.candidates(a)[0]);h.docs[0].fonts.item(0).status=99;assert.throws(()=>h.api.exportPdf('/out/b.pdf'));assert.equal(h.calls.length,0);h.docs[0].isValid=false;assert.throws(()=>h.api.save('/out/c.indd'));});
