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
  const doc={items:[],strokeStyles:{item:()=>({name:'Solid'})},characterStyles:{item:()=>({name:"[None]"})},isValid:true,id:++counter,documentPreferences:{},viewPreferences:{},textPreferences:{},allGraphics:[],links:coll([]),fonts:coll([{name:'regular',status:status()}]),colors:{add:p=>p},paragraphStyles:{add:p=>{
   if(!options.strictFonts)return p;
   if('fontStyle' in p)throw new Error('요청한 글꼴 스타일은 사용할 수 없습니다.');
   let face;Object.defineProperty(p,'appliedFont',{enumerable:true,get:()=>face,set:f=>{face=f;}});
   let style;Object.defineProperty(p,'fontStyle',{enumerable:true,get:()=>style,set:v=>{if(options.rejectStyle||!face||face.fontStyleName!==v)throw new Error('요청한 글꼴 스타일은 사용할 수 없습니다.');style=v;}});return p;
  }},swatches:{itemByName:()=>options.localizedNone?{isValid:false}:none,item:()=>none},recompose(){if(options.onRecompose)options.onRecompose(doc);if(options.failCheck)throw new Error('recompose failed');},save(p){calls.push(['save',doc.id,p]);if(options.saveError)throw options.saveError;if(options.saveAsNew){doc.isValid=false;return document();}return doc;},exportFile(format,p,showingOptions){calls.push(['pdf',doc.id,p]);assert.equal(showingOptions,true);if(options.exportError)throw options.exportError;if(!options.silentExport&&events.afterExport)events.afterExport();},addEventListener(name,fn){events[name]=fn;},removeEventListener(name){delete events[name];},close(){doc.isValid=false;calls.push(['close',doc.id]);}};
  function frame(page){
    let current;
    const t={pointSize:10.5,leading:16.2,tracking:900,applyParagraphStyle(style,clear){assert.equal(clear,true);this.appliedParagraphStyle=style;Object.assign(this,style);}};
    const st={id:++counter,data:'',frames:[],get textContainers(){return this.frames;},texts:{item:()=>t},get contents(){return this.data;},set contents(v){this.data=v;},get overflows(){if(options.overset){const result=options.overset(this,t);if(result!==undefined)return result;}return this.data.length>this.frames.length*(options.capacity||10000);}};
    current=st;stories.push(st);
    const f={strokeColor:'inherited black',fillColor:'inherited fill',isValid:true,id:++counter,label:'',parentPage:page,rotationAngle:0,shearAngle:0,locked:false,get overflows(){return current.overflows;},get visibleBounds(){return this.geometricBounds;},textFramePreferences:{},get parentStory(){return current;},get contents(){const idx=current.frames.indexOf(f);return current.data.slice(idx*(options.capacity||10000),(idx+1)*(options.capacity||10000));},set contents(v){current.data=v;},set nextTextFrame(next){const old=next.parentStory;for(const it of old.frames)it._setStory(current);current.frames.push(...old.frames);const ix=stories.indexOf(old);if(ix>=0)stories.splice(ix,1);},_setStory:s=>current=s};
    st.frames=[f];doc.items.push(f);return f;
  }
  function page(){const p={get bounds(){return [0,0,parseFloat(doc.documentPreferences.pageHeight),parseFloat(doc.documentPreferences.pageWidth)];},get allPageItems(){return doc.items.filter(f=>f.parentPage===p);},marginPreferences:{},graphicLines:{add:()=>{const path={},line={parentPage:p,get visibleBounds(){const points=path.entirePath;return [points[0][1],points[0][0],points[1][1],points[1][0]];},paths:{item:()=>path}};doc.items.push(line);return line;}},textFrames:{add:()=>frame(p)},rectangles:{add:()=>{const r={parentPage:p,get visibleBounds(){return this.geometricBounds;},strokeColor:'inherited black',fillColor:'inherited fill',fits:[],place(){if(options.failImage)throw new Error('place failed at C:\\Users\\private\\photo.jpg');},fit(option){this.fits.push(option);}};doc.items.push(r);return r;}},remove(){pages.splice(pages.indexOf(p),1);}};return p;}
  pages.push(page());doc.pages={...coll(pages),get length(){return pages.length;},add(){const p=page();pages.push(p);return p;}};doc.stories=coll(stories);docs.push(doc);return doc;
 }
 const enums={VerticalJustification:{TOP_ALIGN:1},FirstBaseline:{ASCENT_OFFSET:1},FontStatus:{INSTALLED:1},ColorModel:{PROCESS:1},ColorSpace:{RGB:1,CMYK:2},Justification:{LEFT_ALIGN:1,LEFT_JUSTIFIED:2,RIGHT_ALIGN:3,CENTER_ALIGN:4},EndCap:{ROUND_END_CAP:1,BUTT_END_CAP:2,PROJECTING_END_CAP:3},ArrowHead:{NONE:0},CornerOptions:{ROUNDED_CORNER:1,NONE:0},AutoSizingTypeEnum:{OFF:0},LocationOptions:{AT_END:1},FitOptions:{FILL_PROPORTIONALLY:1,CENTER_CONTENT:2,PROPORTIONALLY:3},MeasurementUnits:{MILLIMETERS:1},RulerOrigin:{PAGE_ORIGIN:1},ScriptLanguage:{JAVASCRIPT:1},UndoModes:{ENTIRE_SCRIPT:1},SaveOptions:{NO:0},LinkStatus:{NORMAL:1},ExportFormat:{PDF_TYPE:1}};
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

const jsonTemplates=JSON.parse(fs.readFileSync('designs/manifest.json')).templates.map(r=>JSON.parse(fs.readFileSync('designs/'+r.file)));
for(const [i,raw] of jsonTemplates.entries())test('JSON Layout '+(i+1)+' Host consumes normalized frame, style, color, line and image properties',async()=>{
 const input={title:'제목',subtitle:'부제',body:'본문',images:[{path:'image.jpg'}]},p=L.fromDesign(raw,input),h=host({fonts:[face('프리젠테이션','4 Regular'),face('프리젠테이션','5 Medium'),face('프리젠테이션','6 SemiBold')],strictFonts:true});
 await h.api.create(input,p);const doc=h.docs[0];assert.equal(doc.documentPreferences.pageWidth,'216mm');assert.equal(doc.documentPreferences.pageHeight,'303mm');
 for(const b of p.pages[0].elements){const f=doc.items.find(f=>f.label===b.label);assert.ok(f,b.label);if(b.role==='line'){assert.equal(f.strokeWeight,'1.5pt');assert.equal(f.endCap,1);assert.deepEqual(Array.from(f.paths.item(0).entirePath,p=>Array.from(p)),[[b.x,b.y],[b.x+b.width,b.y]]);assert.deepEqual(Array.from(f.strokeColor.colorValue),[48,53,88]);continue;}
 assert.deepEqual(Array.from(f.geometricBounds),[b.y,b.x,b.y+b.height,b.x+b.width].map(v=>v+'mm'));assert.equal(f.strokeWeight,0);assert.equal(f.strokeColor.name,'None');
 if(b.role==='image'){assert.deepEqual(f.fits,[1,2]);assert.equal(f.topLeftCornerRadius,'5mm');assert.equal(f.topLeftCornerOption,1);assert.equal(f.fillColor.space,2);assert.deepEqual(Array.from(f.fillColor.colorValue),[10,0,0,0]);}
 else{const t=f.parentStory.texts.item(0);assert.equal(t.pointSize,b.typography.size);assert.equal(t.leading,b.typography.leading);assert.equal(t.tracking,b.typography.tracking);assert.equal(t.justification,b.typography.align==='right'?3:2);assert.equal(t.appliedFont.name,b.typography.font);assert.equal(f.textFramePreferences.textColumnGutter,b.columnGap+'mm');}}
 assert.equal(doc.items.filter(f=>f.label&&f.label.startsWith('AUTO_')).length,0);
});
test('JSON no-image generation leaves the frame empty and long-body threading never deletes first-page columns',async()=>{
 const input={title:'제목',subtitle:'부제',body:'가'.repeat(1800),images:[]},p=L.fromDesign(jsonTemplates[2],input),h=host({capacity:500});const r=await h.api.create(input,p);const doc=h.docs[0];
 assert.ok(r.warnings.some(w=>w.includes('사진 없음')));const frames=doc.items.filter(f=>f.label&&f.label.startsWith('JSON_body_'));assert.equal(frames.length,3);assert.equal(frames[0].parentStory,frames[2].parentStory);assert.equal(frames[0].parentStory.contents,input.body);assert.ok(r.pageCount>1);assert.equal(doc.items.find(f=>f.label==='JSON_image1_0').fits.length,0);
 const short={...input,body:'짧은 본문'},next=L.fromDesign(jsonTemplates[2],short);await h.api.create(short,next);assert.equal(h.docs[1].pages.length,1);assert.equal(h.docs[1].items.filter(f=>f.label&&f.label.startsWith('JSON_body_')).length,3);
});
test('JSON font diagnostics isolate unavailable exact styles; explicit replacements create and export',async()=>{
 const input={title:'제목',subtitle:'부제',body:'본문',images:[]},h=host({fonts:[face('Installed','Book')],strictFonts:true}),p=L.fromDesign(jsonTemplates[0],input);
 assert.equal(h.api.validateDesignFonts(p).filter(f=>f.error).length,3);await assert.rejects(()=>h.api.create(input,p),/create.fonts/);assert.equal(h.docs.length,0);
 const fixed=L.fromDesign(jsonTemplates[0],input,{bodyFont:'Installed\tBook',titleFont:'Installed\tBook'});await h.api.create(input,fixed);h.api.save('/out/json.indd');h.api.exportPdf('/out/json.pdf');assert.deepEqual(h.calls.map(c=>c[0]),['save','pdf']);
});

test('JSON optional body inset/gutter/paragraph spacing and contain fitting reach Host unchanged',async()=>{
 const raw=structuredClone(jsonTemplates[0]);for(const e of raw.elements.filter(e=>e.role==='body')){e.inset=[1,2,3,4];e.columns=2;e.columnGap=3;e.typography.spaceBeforeMm=1;e.typography.spaceAfterMm=2;}raw.elements[0].fit='contain';
 const input={title:'제목',subtitle:'부제',body:'본문',images:[{path:'p.jpg'}]},p=L.fromDesign(raw,input),h=host();await h.api.create(input,p);
 const f=h.docs[0].items.find(f=>f.label==='JSON_body_1'),t=f.parentStory.texts.item(0);assert.deepEqual(Array.from(f.textFramePreferences.insetSpacing),['1mm','2mm','3mm','4mm']);assert.equal(f.textFramePreferences.textColumnGutter,'3mm');assert.equal(f.textFramePreferences.textColumnCount,2);assert.equal(t.spaceBefore,'1mm');assert.equal(t.spaceAfter,'2mm');assert.deepEqual(h.docs[0].items.find(f=>f.label==='JSON_image1_0').fits,[3,2]);
});

test('overset roles come from generated frame labels, never from Story numbers; unknown remains visible and blocks PDF',async()=>{
 const h=host();await h.api.create(a,L.candidates(a)[0]);const doc=h.docs[0];
 const title=doc.items.find(f=>f.label==='AUTO_TITLE').parentStory;title.data='x'.repeat(10001);
 let r=h.api.check();assert.equal(r.issues[0].role,'title');assert.match(r.errors[0],/제목/);assert.match(r.issues[0].detail,/Story/);assert.doesNotMatch(r.errors[0],/Story/);assert.throws(()=>h.api.exportPdf('/out/test.pdf'));
 title.frames[0].label='';r=h.api.check();assert.equal(r.issues[0].role,'unknown');assert.match(r.errors[0],/텍스트 영역/);title.data='짧은 제목';assert.equal(h.api.check().errors.length,0);
});

test('auto-fit title and subtitle grow safely, recompose and verify real mock overset, without mutating plan',async()=>{
 const input={...a,subtitle:'부제'},p=L.candidates(input)[0],original=JSON.stringify(p);let recomposes=0;
 const heights=Object.fromEntries(p.pages[0].elements.filter(b=>['title','subtitle'].includes(b.role)).map(b=>['AUTO_'+b.role.toUpperCase(),b.height]));
 const h=host({onRecompose:()=>recomposes++,overset:(st)=>{const f=st.frames[0];if(heights[f.label])return parseFloat(f.geometricBounds[2])-parseFloat(f.geometricBounds[0])<heights[f.label]+1-1e-6;}});
 const r=await h.api.create(input,p);assert.equal(r.errors.length,0);assert.equal(r.autoFixes.length,2);assert.ok(r.autoFixes.every(f=>f.result==='resolved'));assert.ok(recomposes>=5);assert.equal(JSON.stringify(p),original);
 for(const f of r.autoFixes){assert.equal(f.before.fontSize,f.after.fontSize);assert.equal(f.after.bounds[2]-f.before.bounds[2],1);assert.equal(f.after.bounds[1],f.before.bounds[1]);}
 const count=recomposes;const again=h.api.check();assert.equal(again.autoFixes.length,2);assert.equal(recomposes,count+1);assert.equal(h.docs[0].items.find(f=>f.label==='AUTO_TITLE').overflows,false);
});
test('auto-fit shrinks title within original budget, preserves leading ratio and never overlaps an obstacle',async()=>{
 const p=L.candidates(a)[0],b=p.pages[0].elements.find(b=>b.role==='title');
 const h=host({overset:(st,t)=>st.frames[0].label==='AUTO_TITLE'?t.pointSize>b.fontSize-1:undefined,onRecompose:doc=>{const f=doc.items.find(f=>f.label==='AUTO_TITLE');if(f&&!doc.obstacle){doc.obstacle=true;doc.items.push({parentPage:f.parentPage,visibleBounds:[b.y+b.height+.1,b.x,b.y+b.height+3,b.x+b.width]});}}});
 const r=await h.api.create(a,p),fix=r.autoFixes[0];assert.equal(fix.result,'resolved');assert.equal(fix.after.fontSize,b.fontSize-1);assert.equal(fix.after.bounds[2],fix.before.bounds[2]);assert.ok(Math.abs(fix.after.leading/fix.after.fontSize-fix.before.leading/fix.before.fontSize)<1e-9);
});
test('unresolvable title restores original size and height, blocks PDF and cannot shrink on repeat check',async()=>{
 const h=host({overset:st=>st.frames[0].label==='AUTO_TITLE'?true:undefined}),p=L.candidates(a)[0];const r=await h.api.create(a,p),fix=r.autoFixes[0];assert.equal(fix.result,'unresolved');assert.equal(fix.reason,'SAFE_LIMIT_REACHED');assert.deepEqual(fix.after,fix.before);assert.ok(fix.steps<100);assert.equal(r.issues[0].category,'USER_ACTION_REQUIRED');assert.throws(()=>h.api.exportPdf('/out/test.pdf'));
 const f=h.docs[0].items.find(f=>f.label==='AUTO_TITLE'),before=JSON.stringify(f.geometricBounds),steps=fix.steps;h.api.check();h.api.check();assert.equal(JSON.stringify(f.geometricBounds),before);assert.equal(fix.steps,steps);assert.equal(f.parentStory.texts.item(0).pointSize,fix.before.fontSize);
});
test('generator mismatch and missing fonts cannot be concealed by automatic shrink',async()=>{
 const mismatch=host({overset:st=>st.frames[0].label==='AUTO_TITLE'?true:undefined,onRecompose:doc=>{const f=doc.items.find(f=>f.label==='AUTO_TITLE');if(f)f.parentStory.texts.item(0).leading=123;}});
 const r=await mismatch.api.create(a,L.candidates(a)[0]);assert.equal(r.autoFixes.length,0);assert.equal(r.issues[0].cause,'GENERATOR_MISMATCH');
 let overflow=false;const missing=host({overset:st=>st.frames[0].label==='AUTO_TITLE'?overflow:undefined});await missing.api.create(a,L.candidates(a)[0]);overflow=true;missing.docs[0].fonts.item(0).status=99;const mr=missing.api.check();assert.equal(mr.autoFixes.length,0);assert.equal(mr.issues[0].cause,'MISSING_FONT');assert.throws(()=>missing.api.exportPdf('/out/test.pdf'));
});
test('body edits use continuation on recheck, not font shrink; broken threads stay blocked',async()=>{
 const h=host();await h.api.create(a,L.candidates(a)[0]);const f=h.docs[0].items.find(f=>f.label==='AUTO_BODY_1'),st=f.parentStory,size=st.texts.item(0).pointSize;st.data='x'.repeat(21000);const r=h.api.check();assert.equal(r.errors.length,0);assert.equal(r.autoFixes[0].role,'body');assert.ok(r.pageCount>=3);assert.equal(st.texts.item(0).pointSize,size);
 const other=host();await other.api.create(a,L.candidates(a)[0]);const bf=other.docs[0].items.find(f=>f.label==='AUTO_BODY_1'),bs=bf.parentStory;bs.data='x'.repeat(21000);bs.frames.push({label:'manually added'});const br=other.api.check();assert.equal(br.issues[0].cause,'BROKEN_THREAD');assert.equal(br.autoFixes.length,0);assert.throws(()=>other.api.exportPdf('/out/test.pdf'));
});
test('auto-fit records belong only to current generated document and vanish on reset or recreation',async()=>{
 const h=host({overset:(st,t)=>st.frames[0].label==='AUTO_TITLE'?t.pointSize>30:undefined});const p=L.candidates(a)[0];await h.api.create(a,p);h.api.invalidateDocument();assert.throws(()=>h.api.check());await h.api.create(a,p);assert.equal(h.api.check().autoFixes.length,1);h.api.resetSession();assert.throws(()=>h.api.check());
});

test('JSON auto-fit uses original geometry and never edits source template or unrelated small frames',async()=>{
 const raw=JSON.parse(fs.readFileSync('designs/layout-01-wide-image-2col.json','utf8')),p=L.fromDesign(raw,a),saved=JSON.stringify(raw);
 const b=p.pages[0].elements.find(b=>b.role==='subtitle');const h=host({overset:st=>{const f=st.frames[0];if(f.label.startsWith('JSON_subtitle_'))return parseFloat(f.geometricBounds[2])<b.y+b.height+1-1e-6;if(f.label.startsWith('JSON_pageNumber_'))return true;}});
 const r=await h.api.create(a,p);assert.equal(r.autoFixes.length,1);assert.equal(r.autoFixes[0].role,'subtitle');assert.equal(r.autoFixes[0].result,'resolved');assert.equal(r.issues[0].role,'pageNumber');assert.equal(r.issues[0].category,'USER_ACTION_REQUIRED');assert.equal(JSON.stringify(raw),saved);assert.throws(()=>h.api.exportPdf('/out/test.pdf'));
});
test('existing collision and unknown geometry prevent any title fit',async()=>{
 const h=host({overset:st=>st.frames[0].label==='AUTO_TITLE'?true:undefined,onRecompose:doc=>{const f=doc.items.find(f=>f.label==='AUTO_TITLE');if(f&&!doc.obstacle){doc.obstacle=true;doc.items.push({parentPage:f.parentPage,visibleBounds:f.geometricBounds});}}});const r=await h.api.create(a,L.candidates(a)[0]);assert.equal(r.autoFixes.length,0);assert.equal(r.issues[0].cause,'FRAME_COLLISION');
 const unknown=host({overset:st=>st.frames[0].label==='AUTO_TITLE'?true:undefined,onRecompose:doc=>{const f=doc.items.find(f=>f.label==='AUTO_TITLE');if(f)f.rotationAngle=15;}});assert.equal((await unknown.api.create(a,L.candidates(a)[0])).autoFixes.length,0);
});
test('Host failure during fitting restores before values and keeps PDF blocked',async()=>{
 let armed=false;const h=host({overset:st=>st.frames[0].label==='AUTO_TITLE'?armed:undefined,onRecompose:doc=>{const f=doc.items.find(f=>f.label==='AUTO_TITLE');if(armed&&f&&parseFloat(f.geometricBounds[2])>doc.originalBottom)throw new Error('mock composition failure');}});
 await h.api.create(a,L.candidates(a)[0]);const doc=h.docs[0],f=doc.items.find(f=>f.label==='AUTO_TITLE');doc.originalBottom=parseFloat(f.geometricBounds[2]);armed=true;const r=h.api.check();assert.equal(r.autoFixes[0].reason,'HOST_FAILURE');assert.equal(parseFloat(f.geometricBounds[2]),doc.originalBottom);assert.throws(()=>h.api.exportPdf('/out/test.pdf'));
});

test('body repair stops at forty pages and remains blocked without repeated appends',async()=>{
 const h=host();await h.api.create(a,L.candidates(a)[0]);h.docs[0].items.find(f=>f.label==='AUTO_BODY_1').parentStory.data='x'.repeat(410000);const r=h.api.check();assert.equal(r.pageCount,40);assert.equal(r.autoFixes[0].result,'unresolved');assert.ok(r.errors.length);assert.equal(h.api.check().pageCount,40);assert.throws(()=>h.api.exportPdf('/out/test.pdf'));
});
test('rollback failure poisons the generated document even if later overset becomes false',async()=>{
 let armed=false;const h=host({overset:st=>st.frames[0].label==='AUTO_TITLE'?armed:undefined,onRecompose:doc=>{const f=doc.items.find(f=>f.label==='AUTO_TITLE');if(armed&&f&&parseFloat(f.geometricBounds[2])>doc.bottom){const value=f.geometricBounds;Object.defineProperty(f,'geometricBounds',{get:()=>value,set:()=>{throw new Error('mock write denied');}});throw new Error('mock compose denied');}}});
 await h.api.create(a,L.candidates(a)[0]);h.docs[0].bottom=parseFloat(h.docs[0].items.find(f=>f.label==='AUTO_TITLE').geometricBounds[2]);armed=true;assert.throws(()=>h.api.check(),/원복 실패/);armed=false;assert.ok(h.api.check().errors.some(e=>e.includes('원복')));assert.throws(()=>h.api.exportPdf('/out/test.pdf'));
});
