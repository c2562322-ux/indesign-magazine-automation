'use strict';
// Host double exercises our adapter control flow. It does not emulate Adobe typography/API compatibility.
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const L=require('../src/layout-engine');
function host(options={}){
 const docs=[],calls=[],metrics={fontItems:0};let counter=0;
 const status=()=>options.objectEnums?{equals:other=>other===1}:1;
 const coll=arr=>({get length(){return arr.length;},item:i=>arr[i]});
 function document(){
  const pages=[],stories=[];
  const none={isValid:true,name:"None"};
  const events={};
  const doc={items:[],characterStyles:{item:()=>({name:"[None]"})},isValid:true,id:++counter,documentPreferences:{},viewPreferences:{},textPreferences:{},allGraphics:[],links:coll([]),fonts:coll([{name:'regular',status:status()}]),colors:{add:p=>p},paragraphStyles:{add:p=>{
   if(!options.strictFonts)return p;
   if('fontStyle' in p)throw new Error('요청한 글꼴 스타일은 사용할 수 없습니다.');
   let face;Object.defineProperty(p,'appliedFont',{enumerable:true,get:()=>face,set:f=>{face=f;}});
   let style;Object.defineProperty(p,'fontStyle',{enumerable:true,get:()=>style,set:v=>{if(options.rejectStyle||!face||face.fontStyleName!==v)throw new Error('요청한 글꼴 스타일은 사용할 수 없습니다.');style=v;}});return p;
  }},swatches:{itemByName:()=>options.localizedNone?{isValid:false}:none,item:()=>none},recompose(){if(options.failCheck)throw new Error('recompose failed');},save(p){calls.push(['save',doc.id,p]);if(options.saveError)throw options.saveError;if(options.saveAsNew){doc.isValid=false;return document();}return doc;},exportFile(format,p,showingOptions){calls.push(['pdf',doc.id,p]);assert.equal(showingOptions,true);if(options.exportError)throw options.exportError;if(!options.silentExport&&events.afterExport)events.afterExport();},addEventListener(name,fn){events[name]=fn;},removeEventListener(name){delete events[name];},close(){doc.isValid=false;calls.push(['close',doc.id]);}};
  function frame(page){
    let current;
    const t={pointSize:10.5,leading:16.2,tracking:900,applyParagraphStyle(style,clear){assert.equal(clear,true);this.appliedParagraphStyle=style;Object.assign(this,style);}};
    const st={id:++counter,data:'',frames:[],texts:{item:()=>t},get contents(){return this.data;},set contents(v){this.data=v;},get overflows(){return this.data.length>this.frames.length*(options.capacity||10000);}};
    current=st;stories.push(st);
    const f={strokeColor:'inherited black',fillColor:'inherited fill',isValid:true,label:'',parentPage:page,textFramePreferences:{},get parentStory(){return current;},get contents(){const idx=current.frames.indexOf(f);return current.data.slice(idx*(options.capacity||10000),(idx+1)*(options.capacity||10000));},set contents(v){current.data=v;},set nextTextFrame(next){const old=next.parentStory;for(const it of old.frames)it._setStory(current);current.frames.push(...old.frames);const ix=stories.indexOf(old);if(ix>=0)stories.splice(ix,1);},_setStory:s=>current=s};
    st.frames=[f];doc.items.push(f);return f;
  }
  function page(){const p={marginPreferences:{},textFrames:{add:()=>frame(p)},rectangles:{add:()=>{const r={strokeColor:'inherited black',fillColor:'inherited fill',fits:[],place(){if(options.failImage)throw new Error('place failed at C:\\Users\\private\\photo.jpg');},fit(option){this.fits.push(option);}};doc.items.push(r);return r;}},remove(){pages.splice(pages.indexOf(p),1);}};return p;}
  pages.push(page());doc.pages={...coll(pages),get length(){return pages.length;},add(){const p=page();pages.push(p);return p;}};doc.stories=coll(stories);docs.push(doc);return doc;
 }
 const enums={VerticalJustification:{TOP_ALIGN:1},FirstBaseline:{ASCENT_OFFSET:1},FontStatus:{INSTALLED:1},ColorModel:{PROCESS:1},ColorSpace:{RGB:1},Justification:{LEFT_ALIGN:1},AutoSizingTypeEnum:{OFF:0},LocationOptions:{AT_END:1},FitOptions:{FILL_PROPORTIONALLY:1,CENTER_CONTENT:2},MeasurementUnits:{MILLIMETERS:1},RulerOrigin:{PAGE_ORIGIN:1},ScriptLanguage:{JAVASCRIPT:1},UndoModes:{ENTIRE_SCRIPT:1},SaveOptions:{NO:0},LinkStatus:{NORMAL:1},ExportFormat:{PDF_TYPE:1}};
 const app={documents:{add:document},fonts:{length:1,itemByName:name=>({name,fontStyleName:name.includes("Bold")?"Bold":"Regular",isValid:!options.missingFont,status:status()}),item:()=>({name:'regular',fontFamily:'regular',status:status()})},doScript:fn=>fn(),get activeDocument(){throw new Error('The active user document must never be accessed');}};
 if(options.fonts)app.fonts={get length(){return options.fonts.length;},item:i=>{metrics.fontItems++;return options.fonts[i];},itemByName:n=>options.fonts.find(f=>f.name===n)||{isValid:false}};
 const module={exports:{}};
 vm.runInNewContext(fs.readFileSync('src/auto-indesign.js','utf8'),{require:n=>n==='indesign'?{...enums,app}:n==='fs'?{lstat:async()=>{if(options.imageGate)await options.imageGate;if(options.missingImage)throw new Error('missing');return {isFile:()=>true};}}:require('../src/'+n.replace('./','')),module,Set,console});
 return {api:module.exports,docs,calls,metrics};
}
const a={title:'제목',subtitle:'',body:'본문입니다 '.repeat(150),images:[]};
test('new document generation never reads/mutates the active document; body is complete',async()=>{const h=host();const p=L.candidates(a)[0],r=await h.api.create(a,p);assert.equal(h.docs.length,1);assert.equal(r.errors.length,0);const body=Array.from({length:h.docs[0].stories.length},(_,i)=>h.docs[0].stories.item(i)).find(s=>s.data===a.body);assert.ok(body);});
test('simulated host overset adds linked continuation pages',async()=>{const h=host({capacity:400});const p=L.candidates(a)[0];const r=await h.api.create(a,p);assert.ok(r.pageCount>p.pages.length);assert.equal(r.errors.length,0);});
test('missing font and inaccessible image fail before document creation',async()=>{const h=host({missingFont:true});await assert.rejects(()=>h.api.create(a,L.candidates(a)[0]));assert.equal(h.docs.length,0);const b={...a,images:[{path:'missing.png'}]},i=host({missingImage:true});await assert.rejects(()=>i.api.create(b,L.candidates(b)[0]));assert.equal(i.docs.length,0);});
test('write failure closes only the new incomplete document',async()=>{const h=host({failImage:true}),b={...a,images:[{path:'p.png'}]};await assert.rejects(()=>h.api.create(b,L.candidates(b)[0]));assert.equal(h.docs.length,1);assert.equal(h.docs[0].isValid,false);assert.deepEqual(h.calls.map(x=>x[0]),['close']);});
test('save/export target the generated document, not active document',async()=>{const h=host();await h.api.create(a,L.candidates(a)[0]);h.api.save('/out/a.indd');h.api.exportPdf('/out/a.pdf');assert.ok(h.calls.every(c=>c[1]===h.docs[0].id));});
test('PDF export is blocked after a font/link error and after closing document',async()=>{const h=host();await h.api.create(a,L.candidates(a)[0]);h.docs[0].fonts.item(0).status=99;assert.throws(()=>h.api.exportPdf('/out/b.pdf'));assert.equal(h.calls.length,0);h.docs[0].isValid=false;assert.throws(()=>h.api.save('/out/c.indd'));});

test('UXP enum wrappers accept installed fonts and normal links',async()=>{
 const h=host({objectEnums:true});assert.equal(h.api.listFonts().length,1);
 await h.api.create(a,L.candidates(a)[0]);
 h.docs[0].links={length:1,item:()=>({name:'private.jpg',status:{equals:v=>v===1}})};
 assert.equal(h.api.check().errors.length,0);
});
test('failed recreation invalidates latest without closing the previous document',async()=>{
 const options={},h=host(options);await h.api.create(a,L.candidates(a)[0]);
 options.missingFont=true;await assert.rejects(()=>h.api.create(a,L.candidates(a)[0]));
 assert.equal(h.docs[0].isValid,true);assert.throws(()=>h.api.save('/out/old.indd'));
});
test('save-as follows the document returned by the host',async()=>{
 const h=host({saveAsNew:true});await h.api.create(a,L.candidates(a)[0]);
 h.api.save('/out/new.indd');h.api.check();h.api.exportPdf('/out/new.pdf');
 assert.equal(h.calls.at(-1)[1],h.docs[1].id);
});
test('native PDF completion is not claimed when the options dialog emits no success',async()=>{
 const h=host({silentExport:true});await h.api.create(a,L.candidates(a)[0]);
 assert.equal(h.api.exportPdf('/out/a.pdf').outcome,'unconfirmed');
});
test('link and overset errors really block PDF but allow repair INDD saves',async()=>{
 const h=host();await h.api.create(a,L.candidates(a)[0]);const d=h.docs[0];
 d.links={length:1,item:()=>({name:'photo',status:99})};
 assert.throws(()=>h.api.exportPdf('/out/a.pdf'));h.api.save('/out/a.indd');
 d.links={length:0};d.stories.item(0).data='x'.repeat(20000);
 assert.throws(()=>h.api.exportPdf('/out/a.pdf'));assert.equal(h.calls.filter(c=>c[0]==='pdf').length,0);
});
test('confirmed PDF reports success and host failures expose safe API stages',async()=>{
 const options={},h=host(options);await h.api.create(a,L.candidates(a)[0]);
 assert.equal(h.api.exportPdf('/private/out.pdf').outcome,'exported');
 options.exportError=new Error('Cannot export /Users/private/out.pdf');
 assert.throws(()=>h.api.exportPdf('/private/out.pdf'),e=>e.productionStage==='pdf.Document.exportFile'&&!e.message.includes('/Users/private'));
 options.saveError=new Error('Cannot save C:\\Users\\private\\out.indd');
 assert.throws(()=>h.api.save('/private/out.indd'),e=>e.productionStage==='save.Document.save'&&!e.message.includes('C:\\Users'));
 assert.equal(h.docs[0].isValid,true);
});
test('image failure identifies the API, redacts its path and closes only the new document',async()=>{
 const options={},h=host(options);await h.api.create(a,L.candidates(a)[0]);options.failImage=true;
 const b={...a,images:[{path:'private.jpg'}]};
 await assert.rejects(()=>h.api.create(b,L.candidates(b)[0]),e=>e.productionStage==='create.image.1.Rectangle.place'&&!e.message.includes('private'));
 assert.equal(h.docs[0].isValid,true);assert.equal(h.docs[1].isValid,false);
 assert.throws(()=>h.api.check());
});
test('a completed save followed by inspection failure is reported distinctly',async()=>{
 const options={},h=host(options);await h.api.create(a,L.candidates(a)[0]);options.failCheck=true;
 assert.throws(()=>h.api.save('/out/a.indd'),e=>e.productionStage==='save.completed.postCheck');
 assert.equal(h.calls.filter(c=>c[0]==='save').length,1);
 options.failCheck=false;assert.equal(h.api.check().errors.length,0);
});

test('all generated frames remove inherited stroke; the intentional accent rule keeps its fill',async()=>{
 for(const localizedNone of [false,true]){
  const h=host({localizedNone}),raw={...a,subtitle:'부제',images:[{path:'photo.jpg'}]};
  await h.api.create(raw,L.candidates(raw)[0]);
  for(const item of h.docs[0].items){
   assert.equal(item.strokeColor.name,'None',item.label);assert.equal(item.strokeWeight,0);
   assert.equal(item.fillColor.name,item.label.startsWith('AUTO_RULE')?'AUTO Accent':'None');
  }
 }
});
test('all three plans send exact mm bounds, dimensions, margins, columns and centered cover fitting to Host',async()=>{
 const raw={...a,subtitle:'부제',images:[{path:'one.jpg'},{path:'two.jpg'}]};
 for(const p of L.candidates(raw,{width:240,height:330,margin:22,bodySize:12})){
  const h=host();await h.api.create(raw,p);const d=h.docs[0],s=p.settings;
  assert.equal(d.documentPreferences.pageWidth,s.width+'mm');assert.equal(d.documentPreferences.pageHeight,s.height+'mm');
  assert.equal(d.pages.item(0).marginPreferences.left,s.margin+'mm');
  for(const b of p.pages[0].elements){
   const label=b.role==='image'?'AUTO_IMAGE_'+b.imageIndex:b.role==='body'?'AUTO_BODY_1':'AUTO_'+b.role.toUpperCase();
   const f=d.items.find(f=>f.label===label);
   assert.deepEqual(Array.from(f.geometricBounds),[b.y,b.x,b.y+b.height,b.x+b.width].map(n=>n+'mm'));
   if(b.role==='image')assert.deepEqual(f.fits,[1,2]);
   else{assert.equal(f.textFramePreferences.textColumnCount,b.columns);assert.equal(f.textFramePreferences.textColumnGutter,'5mm');}
  }
 }
});
test('Host typography, including meta leading, clears inherited overrides and matches shared specification',async()=>{
 const raw={...a,subtitle:'부제'},p=L.candidates(raw,{bodySize:13,bodyFont:'Custom Regular',titleFont:'Custom Bold'})[2],h=host();
 await h.api.create(raw,p);const d=h.docs[0];
 const blocks=p.pages[0].elements.concat(L.furniture(p.settings,L.article(raw),1)).filter(b=>b.role!=='rule');
 for(const b of blocks){
  const f=d.items.find(f=>f.label===(b.label||(b.role==='body'?'AUTO_BODY_1':'AUTO_'+b.role.toUpperCase()))),t=f.parentStory.texts.item(0),spec=L.typography(b,p.settings);
  assert.equal(t.pointSize,spec.size);assert.equal(t.leading,spec.leading);assert.equal(t.appliedFont.name,spec.font);
  assert.equal(t.fontStyle,b.role==='title'?'Bold':'Regular');assert.equal(t.tracking,0);assert.equal(t.spaceAfter,spec.spaceAfter+'mm');
  assert.equal(t.appliedCharacterStyle.name,'[None]');assert.equal(t.leftIndent,0);assert.equal(t.alignToBaseline,false);
  assert.equal(t.paragraphBorderOn,false);assert.equal(t.paragraphShadingOn,false);
 }
});

const face=(family,style,status=1)=>({name:family+'\t'+style,fontFamily:family,fontStyleName:style,fullName:family+' '+style,postscriptName:family+'-'+style,status,isValid:true});
test('font catalog returns actual faces and excludes non-installed fonts',()=>{
 const h=host({fonts:[face('Example','Book'),face('Example','Heavy'),face('Missing','Regular',99)]});
 const rows=h.api.listFonts();assert.equal(rows.length,2);assert.equal(rows[0].family,'Example');assert.equal(rows[0].style,'Book');assert.equal(rows[1].name,'Example\tHeavy');
});
test('styles apply the resolved face before its real style, without assuming Regular or Bold',async()=>{
 const h=host({fonts:[face('Example','Book'),face('Example','Heavy')],strictFonts:true}),steps=[];
 await h.api.create(a,L.candidates(a,{bodyFont:'Example\tBook',titleFont:'Example\tHeavy'})[0],s=>steps.push(s));
 const body=h.docs[0].items.find(f=>f.label==='AUTO_BODY_1').parentStory.texts.item(0);
 assert.equal(body.fontStyle,'Book');assert.ok(steps.find(s=>s.includes('body.appliedFont')&&s.includes('style=Book')));
});
test('missing style and family reject before creating a document; no invented fallback',async()=>{
 const h=host({fonts:[face('Example','Book')]});
 for(const name of ['Example\tBold','Missing'])await assert.rejects(()=>h.api.create(a,L.candidates(a,{bodyFont:name,titleFont:'Example\tBook'})[0]),/自動|자동 대체하지/);
 assert.equal(h.docs.length,0);
});
test('full and PostScript names resolve; an ambiguous family requires explicit style',()=>{
 const h=host({fonts:[face('Example','Book'),face('Example','Heavy')]});
 assert.ok(h.api.validateFonts({bodyFont:'Example Book',titleFont:'Example-Heavy'}).every(f=>!f.error));
 assert.match(h.api.validateFonts({bodyFont:'Example',titleFont:'Missing'})[0].error,/여러 스타일/);
});
test('user-selected installed replacement works, and a subsequently unavailable font is rejected',async()=>{
 const options={fonts:[face('Available','Medium')],strictFonts:true},h=host(options),p=L.candidates(a,{bodyFont:'Available\tMedium',titleFont:'Available\tMedium'})[0];
 await h.api.create(a,p);options.fonts=[];await assert.rejects(()=>h.api.create(a,p),/사용 가능한 폰트/);assert.equal(h.docs.length,1);
});
test('style rejection exposes the role, exact requested face and property stage',async()=>{
 const h=host({fonts:[face('Example','Book')],strictFonts:true,rejectStyle:true});
 await assert.rejects(()=>h.api.create(a,L.candidates(a,{bodyFont:'Example\tBook',titleFont:'Example\tBook'})[0]),e=>e.message.includes('body.fontStyle')&&e.message.includes('style=Book'));
 assert.equal(h.docs[0].isValid,false);
});

test('font catalog and aliases enumerate once until explicit refresh or session reset',()=>{
 const h=host({fonts:[face('Example','Book'),face('Example','Heavy')]});
 h.api.listFonts();h.api.listFonts();h.api.validateFonts({bodyFont:'Example Book',titleFont:'Example-Heavy'});
 assert.equal(h.metrics.fontItems,2);
 h.api.listFonts(true);assert.equal(h.metrics.fontItems,4);
 h.api.resetSession();h.api.listFonts();assert.equal(h.metrics.fontItems,6);
});
test('session reset clears latest without closing a document; creation after reset works',async()=>{
 const h=host();await h.api.create(a,L.candidates(a)[0]);h.api.resetSession();
 assert.equal(h.docs[0].isValid,true);assert.throws(()=>h.api.check(),/먼저/);
 await h.api.create(a,L.candidates(a)[0]);assert.equal(h.api.check().errors.length,0);
});
test('an in-flight old-session creation cannot publish a document after reinitialization',async()=>{
 let release;const h=host({imageGate:new Promise(r=>release=r)}),raw={...a,images:[{path:'photo.jpg'}]};
 const pending=h.api.create(raw,L.candidates(raw)[0]);h.api.resetSession();release();
 await assert.rejects(()=>pending,/다시 초기화/);assert.equal(h.docs.length,0);assert.throws(()=>h.api.check());
});
