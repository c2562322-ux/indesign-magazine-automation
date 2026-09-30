'use strict';
// Minimal DOM double for controller state/event tests, not a real browser rendering test.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const Studio=require('../src/studio-ui');
class Element{
 constructor(id='',tag='div'){this.id=id;this.tagName=tag.toLowerCase();this.value='';this.children=[];this.style={display:''};this.className='';this.disabled=false;this.listeners={};this.handlers={};this.attributes={};this.clientWidth=440;this._text='';}
 set textContent(v){this._text=String(v);this.children.forEach(c=>c.parentNode=null);this.children=[];}get textContent(){return this._text;}
 appendChild(e){this.children.push(e);e.parentNode=this;return e;}setAttribute(k,v){this.attributes[k]=v;}
 addEventListener(t,f){(this.handlers[t]||(this.handlers[t]=[])).push(f);this.listeners[t]=(...args)=>{for(const fn of [...this.handlers[t]])fn(...args);};}
 removeEventListener(t,f){this.handlers[t]=(this.handlers[t]||[]).filter(fn=>fn!==f);}
 click(){if(!this.disabled&&this.listeners.click)this.listeners.click();}
}
function fixture(omit=[]){
 const html=fs.readFileSync('index.html','utf8'),elements={},body=new Element('fixture'),stack=[body];
 for(const m of html.matchAll(/<\/?([a-z][\w-]*)\b[^>]*>/gi)){
  const tag=m[1].toLowerCase();if(m[0].startsWith('</')){const ix=stack.map(n=>n.tagName).lastIndexOf(tag);if(ix>0)stack.length=ix;continue;}
  const id=(m[0].match(/\bid="([^"]+)"/)||[])[1]||'',node=new Element(id,tag);stack.at(-1).appendChild(node);if(id&&!omit.includes(id))elements[id]=node;
  node.value=(m[0].match(/\bvalue="([^"]*)"/)||[])[1]||'';if(m[0].includes('display:none'))node.style.display='none';
  if(!['input','meta','link','br','img','hr'].includes(tag))stack.push(node);
 }
 function descendants(n){return n.children.flatMap(c=>[c,...descendants(c)]);}
 const document={getElementById:id=>elements[id]||null,createElement:tag=>new Element('',tag),querySelectorAll:selector=>selector==='[id]'?Object.values(elements):descendants(elements.studioPanel).filter(n=>['button','input','textarea'].includes(n.tagName))};
 return {document,e:elements};
}
function setup(native=false,overrides={},omit=[]){
 const {document,e:elements}=fixture(omit);global.document=document;
 const saved=[],calls=[];
 const report={pageCount:1,errors:[],warnings:[]};
 const adapter={native,load:async()=>null,image:async()=>({path:'p.jpg',name:'사진',preview:''}),fonts:async()=>[],saveProject:async obj=>{saved.push(obj);return true;},create:async()=>{calls.push('create');return report;},check:()=>{calls.push('check');return report;},saveIndd:()=>{calls.push('save');return report;},exportPdf:()=>{calls.push('pdf');return report;},...overrides};
 const app=Studio.mount(adapter);
 return {app,e:elements,saved,calls,adapter,document};
}
const tick=()=>new Promise(r=>setImmediate(r));
test('registered proof/production uses common check-save-PDF state and proof cannot enable PDF',async()=>{
 const calls=[],entry={descriptor:{id:'ref',name:'Reference'},profile:{name:'Reference'},original:{metadata:{sourceSha256:'hash'}}};
 const x=setup(true,{createRegistered:async(e,a,p,mode)=>{calls.push(mode);return {pageCount:1,errors:[],warnings:[],outputReady:mode!=='proof',fidelity:{phase:mode==='proof'?'FIDELITY_PASSED':'CONTENT_APPLIED',proofOnly:mode==='proof'}};}});
 const proof=await x.app.createRegistered(entry,x.app.read().article,'proof');assert.equal(proof.fidelity.phase,'FIDELITY_PASSED');assert.equal(x.e.btnExportPdf.disabled,true);assert.equal(x.e.btnCheckAuto.disabled,false);
 const made=await x.app.createRegistered(entry,x.app.read().article);assert.equal(made.fidelity.phase,'CONTENT_APPLIED');assert.equal(x.e.btnExportPdf.disabled,false);
 x.e.btnCheckAuto.click();await tick();x.e.btnSaveIndd.click();await tick();x.e.btnExportPdf.click();await tick();assert.deepEqual(x.calls,['check','save','pdf']);assert.deepEqual(calls,['proof','production']);
 x.e.autoTitle.value='changed';x.e.autoTitle.listeners.input();assert.equal(x.e.btnExportPdf.disabled,true);
});
test('loading DOCX with more than two images clears old previews and retains all image metadata',async()=>{
 const images=[1,2,3].map(n=>({source:'docx',path:'image'+n+'.png',widthPx:1200,heightPx:800,aspectRatio:1.5,orientation:'landscape',documentOrder:n,paragraphIndex:n}));
 const x=setup(true,{load:async()=>({article:{title:'DOCX',body:'본문',images}})});x.e.btnLoadAuto.click();await tick();
 assert.equal(x.app.read().article.images.length,3);assert.equal(x.app.read().article.images[2].documentOrder,3);assert.equal(x.app.read().article.images[2].widthPx,1200);
 assert.equal(x.e.candidateList.children.length,0);assert.match(x.e.largePreview.textContent,/등록 디자인/);assert.equal(x.e.btnCreateAuto.disabled,true);
});
test('registered selection cannot accidentally create a leftover free plan from the generic button',()=>{
 const x=setup(true),entry={descriptor:{id:'ref'},profile:{name:'Reference'},original:{metadata:{sourceSha256:'hash'}}};
 x.app.invalidateRegistered(entry);assert.equal(x.e.btnCreateAuto.disabled,true);assert.match(x.e.btnCreateAuto.textContent,/위의 검증/);assert.match(x.e.selectedDesign.textContent,/Reference/);
 x.e.candidateList.children[0].click();assert.equal(x.e.btnCreateAuto.disabled,false);assert.equal(x.app.state.registeredEntry,null);
});
test('optional registration init failure cannot stop stable Studio; lifecycle disposes extension',()=>{
 const broken=setup(false,{registration(){throw new Error('optional failed');}});assert.equal(broken.app.disposed,false);assert.equal(broken.e.candidateList.children.length,3);
 let invalidated=0,disposed=0,mounts=0;const x=setup(false,{registration(){mounts++;return {invalidate(){invalidated++;},destroy(){disposed++;}};}});
 assert.equal(Studio.mount(x.adapter),x.app);assert.equal(mounts,1);x.e.autoTitle.value='changed';x.e.autoTitle.listeners.input();assert.equal(invalidated,1);x.app.destroy();assert.equal(disposed,1);
});
test('all static controller IDs exist once in both HTML entrypoints',()=>{
 const code=fs.readFileSync('src/studio-ui.js','utf8'),required=new Set([...code.matchAll(/\$\('([^']+)'\)/g)].map(x=>x[1]));
 for(const file of ['index.html','preview.html']){const ids=[...fs.readFileSync(file,'utf8').matchAll(/id="([^"]+)"/g)].map(x=>x[1]);assert.equal(ids.length,new Set(ids).size);for(const id of required){if(file==='preview.html'&&['modeStudio','legacyPanel'].includes(id))continue;assert.ok(ids.includes(id),file+': '+id);}}
});
test('default browser state shows three plans but native actions stay disabled',()=>{const {e}=setup();assert.equal(e.candidateList.children.length,3);assert.equal(e.btnCreateAuto.disabled,true);assert.equal(e.btnSaveProject.disabled,false);});
test('changing source disables stale plans until regenerated',async()=>{const {e}=setup(true);assert.equal(e.btnCreateAuto.disabled,false);e.autoBody.value+=' 추가 문장';e.autoBody.listeners.input();assert.equal(e.btnCreateAuto.disabled,true);e.btnPrepare.click();await tick();assert.equal(e.btnCreateAuto.disabled,false);});
test('project save excludes API credentials and transient image data',async()=>{const {e,saved}=setup();e.apiKey.value='example-not-a-real-key';e.btnSaveProject.click();await tick();assert.equal(saved.length,1);assert.equal(saved[0].schemaVersion,1);assert.ok(!JSON.stringify(saved[0]).includes('example-not-a-real-key'));});
test('native creation prevents duplicate clicks and stale export',async()=>{const {e,calls}=setup(true);e.btnCreateAuto.click();e.btnCreateAuto.click();await tick();assert.equal(calls.length,1);assert.equal(e.btnExportPdf.disabled,false);e.autoTitle.value='다른 제목';e.autoTitle.listeners.input();assert.equal(e.btnExportPdf.disabled,true);});
test('photo add invalidates previous plan and cannot exceed two',async()=>{const {e,app}=setup(true);e.btnAddImage.click();await tick();assert.equal(app.state.images.length,1);assert.equal(e.btnCreateAuto.disabled,true);e.btnAddImage.click();await tick();e.btnAddImage.click();await tick();assert.equal(app.state.images.length,2);assert.match(e.studioStatus.textContent,/최대 2장/);});

test('production buttons complete the input-plan-create-check-save-export flow',async()=>{
 const {e,calls}=setup(true);e.autoTitle.value='실기 원고';e.autoTitle.listeners.input();
 e.btnPrepare.click();await tick();e.candidateList.children[1].click();
 e.btnCreateAuto.click();await tick();assert.equal(e.btnCheckAuto.disabled,false);
 e.btnCheckAuto.click();await tick();assert.equal(e.btnSaveIndd.disabled,false);assert.equal(e.btnExportPdf.disabled,false);
 e.btnSaveIndd.click();await tick();assert.match(e.studioStatus.textContent,/INDD 저장 성공/);
 e.btnExportPdf.click();await tick();assert.match(e.studioStatus.textContent,/PDF 내보내기 성공/);
 assert.deepEqual(calls,['create','check','save','pdf']);
});
test('inspection failure blocks PDF until a successful recheck, while repair save remains available',async()=>{
 let failed=true;const {e}=setup(true,{check:()=>{if(failed)throw new Error('check failed');return {pageCount:1,errors:[],warnings:[]};}});
 e.btnCreateAuto.click();await tick();e.btnCheckAuto.click();await tick();
 assert.equal(e.btnExportPdf.disabled,true);assert.equal(e.btnSaveIndd.disabled,false);assert.equal(e.btnCheckAuto.disabled,false);
 failed=false;e.btnCheckAuto.click();await tick();assert.equal(e.btnExportPdf.disabled,false);
});
test('inspection reports with errors disable PDF but keep inspection and repair save enabled',async()=>{
 const {e}=setup(true,{check:()=>({pageCount:1,errors:['텍스트 넘침'],warnings:[]})});
 e.btnCreateAuto.click();await tick();e.btnCheckAuto.click();await tick();
 assert.equal(e.btnExportPdf.disabled,true);assert.equal(e.btnSaveIndd.disabled,false);assert.equal(e.btnCheckAuto.disabled,false);
});
test('failed recreation never leaves the earlier document exportable and creation can retry',async()=>{
 let fail=false;const {e}=setup(true,{create:()=>{if(fail)throw new Error('host failure');return {pageCount:1,errors:[],warnings:[]};}});
 e.btnCreateAuto.click();await tick();fail=true;e.btnCreateAuto.click();await tick();
 assert.equal(e.btnSaveIndd.disabled,true);assert.equal(e.btnCheckAuto.disabled,true);assert.equal(e.btnExportPdf.disabled,true);
 assert.equal(e.btnCreateAuto.disabled,false);fail=false;e.btnCreateAuto.click();await tick();assert.equal(e.btnCheckAuto.disabled,false);
});
test('save and export picker cancellation restores usable buttons and reports cancellation',async()=>{
 const {e}=setup(true,{saveIndd:()=>null,exportPdf:()=>null});e.btnCreateAuto.click();await tick();
 e.btnSaveIndd.click();await tick();assert.match(e.studioStatus.textContent,/INDD 저장 취소/);assert.equal(e.btnSaveIndd.disabled,false);
 e.btnExportPdf.click();await tick();assert.match(e.studioStatus.textContent,/PDF 내보내기 취소/);assert.equal(e.btnCheckAuto.disabled,false);
});
test('changing selected plan blocks all old-document actions until the matching plan is restored',async()=>{
 const {e}=setup(true);e.btnCreateAuto.click();await tick();e.candidateList.children[1].click();
 for(const id of ['btnCheckAuto','btnSaveIndd','btnExportPdf'])assert.equal(e[id].disabled,true);
 e.candidateList.children[0].click();assert.equal(e.btnSaveIndd.disabled,false);
});
test('production errors redact paths and the actual API key and recover the busy state',async()=>{
 const {e,app}=setup(true,{create:()=>{throw new Error('bad example-secret-key C:\\Users\\private\\file.indd');}});
 e.apiKey.value='example-secret-key';e.btnCreateAuto.click();await tick();
 assert.match(e.studioStatus.textContent,/문서 생성 실패/);assert.equal(app.state.busy,false);assert.equal(e.btnCreateAuto.disabled,false);
 assert.ok(!e.studioStatus.textContent.includes('example-secret-key'));assert.ok(!e.hostReport.textContent.includes('private'));
});
test('PDF native cancellation or unconfirmed completion never displays success',async()=>{
 const {e}=setup(true,{exportPdf:()=>({pageCount:1,errors:[],warnings:[],outcome:'unconfirmed'})});
 e.btnCreateAuto.click();await tick();e.btnExportPdf.click();await tick();
 assert.match(e.studioStatus.textContent,/완료 미확인/);assert.doesNotMatch(e.studioStatus.textContent,/성공/);
 assert.equal(e.btnExportPdf.disabled,false);
});
test('save failure leaves check and retry available, and successful check re-enables PDF',async()=>{
 const {e}=setup(true,{saveIndd:()=>{throw new Error('write failed');}});
 e.btnCreateAuto.click();await tick();e.btnSaveIndd.click();await tick();
 assert.match(e.studioStatus.textContent,/INDD 저장 실패/);assert.equal(e.btnSaveIndd.disabled,false);assert.equal(e.btnExportPdf.disabled,true);
 e.btnCheckAuto.click();await tick();assert.equal(e.btnExportPdf.disabled,false);
});

function nativeAdapter(host,picker,opening,pluginFolder,extraFS={},indesign){
 const vm=require('node:vm');let adapter;
 vm.runInNewContext(fs.readFileSync('studio.js','utf8'),{require:n=>{
  if(n==='uxp')return {storage:{formats:{binary:'binary'},localFileSystem:{getFileForSaving:picker,getFileForOpening:opening,getPluginFolder:pluginFolder,...extraFS}}};
  if(n==='indesign')return indesign;
  if(n==='./src/auto-indesign.js')return host;
  if(n==='./src/studio-ui.js')return {mount:a=>{adapter=a;}};
  return require('../'+n);
 },document:{getElementById:()=>({})}});
 assert.ok(adapter);return adapter;
}
test('UXP Word extraction writes internal bytes and retains metadata through registered adapter import',async()=>{
 const P=require('../src/package-xml'),png=Buffer.alloc(24);Buffer.from([137,80,78,71,13,10,26,10]).copy(png);png.writeUInt32BE(13,8);png.write('IHDR',12);png.writeUInt32BE(1200,16);png.writeUInt32BE(800,20);
 const bytes=P.zip([['word/document.xml','<w:document><w:body><w:p><w:r><w:t>제목</w:t></w:r></w:p><w:p><w:r><w:t>본문</w:t></w:r></w:p><w:p><w:drawing><wp:inline><a:blip r:embed="im"/></wp:inline></w:drawing></w:p></w:body></w:document>'],['word/_rels/document.xml.rels','<Relationships><Relationship Id="im" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/a.png"/></Relationships>'],['word/media/a.png',png]]);
 const writes=[],folder={createFile:async name=>({nativePath:'C:/private/'+name,write:async data=>writes.push({name,bytes:new Uint8Array(data)}),read:async()=>writes.find(w=>w.name===name).bytes})};let received,opened;
 const adapter=nativeAdapter({createRegistered:async(e,a,open,p,mode)=>{received={a,mode};const I=require('../src/idml-package');return open(P.zip([['mimetype',I.MIME],['META-INF/container.xml','<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfile full-path="designmap.xml"/></container>'],['designmap.xml',I.designmap({tag:'Document',attributes:{DOMVersion:'21.4'},children:[]})],...['Resources/Styles.xml','Resources/Fonts.xml','Resources/Graphic.xml','Spreads/s.xml','Stories/s.xml'].map(n=>[n,'<test/>'])]));}},null,async()=>({name:'article.docx',nativePath:'C:/private/article.docx',read:async()=>bytes}),null,{getDataFolder:async()=>({createFolder:async()=>folder}),getTemporaryFolder:async()=>folder},{app:{open:(path,show)=>{opened={path,show};return 'new-doc';}}});
 const loaded=await adapter.load();assert.equal(writes.length,1);assert.deepEqual(Buffer.from(writes[0].bytes),png);assert.equal(loaded.article.images[0].bytes,undefined);assert.equal(loaded.article.images[0].documentOrder,1);assert.equal(loaded.article.images[0].widthPx,1200);
 assert.equal(await adapter.createRegistered({},loaded.article,undefined,'proof'),'new-doc');assert.equal(received.mode,'proof');assert.equal(received.a.images[0].path,'C:/private/image-1.png');assert.equal(opened.show,true);assert.match(opened.path,/registered-.*\.idml$/);
});
test('real native adapter passes the selected path and progress to the correct host method',async()=>{
 const calls=[],steps=[],progress=s=>steps.push(s),report={pageCount:1,errors:[],warnings:[]};
 const host={save:(p,cb)=>{calls.push(['save',p]);cb('save.Document.save');return report;},exportPdf:(p,cb)=>{calls.push(['pdf',p]);cb('pdf.Document.exportFile');return report;}};
 const adapter=nativeAdapter(host,async(name,options)=>({nativePath:'C:\\private\\'+name}));
 assert.equal(await adapter.saveIndd(progress),report);assert.equal(await adapter.exportPdf(progress),report);
 assert.deepEqual(calls,[['save','C:\\private\\magazine-design.indd'],['pdf','C:\\private\\magazine-design.pdf']]);
 assert.ok(steps.includes('output.getFileForSaving'));assert.ok(!steps.join(' ').includes('private'));
});
test('real native adapter does not call host output on either file-picker cancellation',async()=>{
 let writes=0;const adapter=nativeAdapter({save:()=>writes++,exportPdf:()=>writes++},async()=>null);
 assert.equal(await adapter.saveIndd(),null);assert.equal(await adapter.exportPdf(),null);assert.equal(writes,0);
});
test('native picker permission failure has a redacted stage and no host write',async()=>{
 let writes=0;const adapter=nativeAdapter({save:()=>writes++},async()=>{throw new Error('Denied /Users/private/out.indd');});
 await assert.rejects(()=>adapter.saveIndd(),e=>e.productionStage==='output.getFileForSaving'&&!e.message.includes('private'));
 assert.equal(writes,0);
});

test('all free plan preview bounds and typography consume the same settings passed to creation',async()=>{
 const L=require('../src/layout-engine');let received;const {app,e}=setup(true,{create:(a,p)=>{received=p;return {pageCount:1,errors:[],warnings:[]};}});
 e.bodyFont.value='Custom Body';e.titleFont.value='Custom Title';e.bodySize.value='12';e.pageWidth.value='240';e.pageHeight.value='330';
 e.btnPrepare.click();await tick();
 for(let i=0;i<3;i++){
  e.candidateList.children[i].click();const p=app.state.plans[i],sheet=e.largePreview.children[0],scale=parseFloat(sheet.style.width)/p.settings.width;
  const near=(actual,expected)=>assert.ok(Math.abs(parseFloat(actual)-expected)<1e-8,actual+' vs '+expected);
  near(sheet.style.height,p.settings.height*scale);
  for(const b of p.pages[0].elements){
   const nodes=sheet.children.filter(n=>n.className==='preview-'+b.role),spec=L.typography(b,p.settings);
   for(let c=0;c<nodes.length;c++){
    const node=nodes[c],cw=b.role==='body'?(b.width-(b.columns-1)*5)/b.columns:b.width;
    near(node.style.left,(b.x+c*(cw+5))*scale);near(node.style.top,b.y*scale);near(node.style.width,cw*scale);near(node.style.height,b.height*scale);
    near(node.style.fontSize,spec.size/L.PT*scale);near(node.style.lineHeight,spec.leading/L.PT*scale);
    assert.equal(node.style.fontFamily,JSON.stringify(spec.font)+', sans-serif');assert.equal(node.style.letterSpacing,'0px');assert.equal(node.style.textAlign,'left');
   }
  }
  e.btnCreateAuto.click();await tick();assert.equal(received,p);
 }
});
test('preview metadata and paragraph spacing match shared furniture and body spec',()=>{
 const L=require('../src/layout-engine'),{app,e}=setup(),p=app.state.plans[0],sheet=e.largePreview.children[0],scale=parseFloat(sheet.style.width)/p.settings.width;
 const a=L.article({title:e.autoTitle.value,body:e.autoBody.value,kicker:e.autoKicker.value,author:e.autoAuthor.value});
 const spec=L.furniture(p.settings,a,1),metas=sheet.children.filter(n=>n.className==='preview-meta');
 assert.equal(metas[0].textContent,spec[0].text);assert.equal(metas[1].textContent,spec[2].text);
 assert.equal(parseFloat(metas[0].style.lineHeight),8*1.4/L.PT*scale);
 const rule=sheet.children.find(n=>n.className==='preview-rule');assert.equal(parseFloat(rule.style.height),0.45*scale);
 const body=sheet.children.find(n=>n.className==='preview-body');assert.ok(body.children.length>0);
 assert.equal(parseFloat(body.children[0].style.marginBottom),2*scale);
});
test('preview photos use centered cover with exact image-plan geometry',async()=>{
 const {app,e}=setup(true,{image:async()=>({path:'photo.jpg',preview:'data:image/png;base64,AA==',name:'photo'})});
 e.btnAddImage.click();await tick();e.btnPrepare.click();await tick();
 for(let i=0;i<3;i++){
  e.candidateList.children[i].click();const p=app.state.plans[i],b=p.pages[0].elements.find(b=>b.role==='image'),sheet=e.largePreview.children[0],scale=parseFloat(sheet.style.width)/p.settings.width;
  const photo=sheet.children.find(n=>n.className==='preview-photo');assert.equal(photo.children[0].style.objectFit,'cover');assert.equal(photo.children[0].style.objectPosition,'center');
  assert.equal(parseFloat(photo.style.width),b.width*scale);assert.equal(parseFloat(photo.style.height),b.height*scale);
  assert.equal(parseFloat(photo.style.left),b.x*scale);assert.equal(parseFloat(photo.style.top),b.y*scale);
 }
});

test('every studio button and editable design field has an actual listener',()=>{
 const {e}=setup(true),html=fs.readFileSync('index.html','utf8').split('<div id="legacyPanel"')[0];
 for(const m of html.matchAll(/<button[^>]*id="([^"]+)"/g))assert.equal(typeof e[m[1]].listeners.click,'function',m[1]);
 for(const m of html.matchAll(/<(?:input|textarea)[^>]*id="([^"]+)"/g)){
  if(['apiKey','aiModel'].includes(m[1]))continue; // read only on explicit AI click
  assert.equal(typeof e[m[1]].listeners.input,'function',m[1]);
 }
});
const fontRows=Array.from({length:65},(_,i)=>({name:'Family'+i+'\tBook',family:'Family'+i,style:'Book',postscriptName:'Family'+i+'-Book'}));
test('font browser opens, paginates and searches real styles',async()=>{
 const {e}=setup(true,{fonts:()=>fontRows});e.btnFonts.click();await tick();
 assert.equal(e.fontBrowser.style.display,'block');assert.equal(e.fontChoices.children.length,30);
 e.btnFontMore.click();assert.equal(e.fontChoices.children.length,60);
 e.fontSearch.value='Family64';e.fontSearch.listeners.input();assert.equal(e.fontChoices.children.length,1);assert.equal(e.btnFontMore.disabled,true);
});
test('font query failure shows diagnostics and allows retry and empty results',async()=>{
 let fail=true;const {e}=setup(true,{fonts:()=>{if(fail)throw new Error('font host failed');return [];}});
 e.btnFonts.click();await tick();assert.match(e.fontSummary.textContent,/조회 실패/);assert.equal(e.btnFonts.disabled,false);
 fail=false;e.btnFontRefresh.click();await tick();assert.match(e.studioStatus.textContent,/설치 폰트가 없습니다/);
});
test('choosing installed replacements updates preview and creation plan, invalidates old output',async()=>{
 let received;const {app,e}=setup(true,{fonts:()=>fontRows,create:(a,p)=>{received=p;return {pageCount:1,errors:[],warnings:[]};}});
 e.btnCreateAuto.click();await tick();e.btnFonts.click();await tick();
 e.fontChoices.children[0].children[0].click();e.fontChoices.children[0].children[1].click();e.btnFontBody.click();await tick();e.fontChoices.children[1].children[0].click();e.fontChoices.children[1].children[1].click();e.btnFontTitle.click();await tick();
 assert.equal(e.bodyFont.value,fontRows[0].name);assert.equal(e.titleFont.value,fontRows[1].name);assert.equal(e.btnExportPdf.disabled,true);
 const sheet=e.largePreview.children[0];assert.equal(sheet.children.find(n=>n.className==='preview-title').style.fontFamily,'"Family1", sans-serif');
 e.btnCreateAuto.click();await tick();assert.equal(received.settings.bodyFont,fontRows[0].name);assert.equal(received.settings.titleFont,fontRows[1].name);
 assert.equal(app.state.plans.length,3);
});
test('load warns about fonts missing on this PC without replacing saved settings',async()=>{
 const {e}=setup(true,{load:()=>({article:Studio.SAMPLE,settings:{bodyFont:'Missing',titleFont:'Missing'}}),validateFonts:()=>[{role:'bodyFont',error:'폰트 없음'}]});
 e.btnLoadAuto.click();await tick();assert.equal(e.bodyFont.value,'Missing');assert.match(e.studioStatus.textContent,/본문: 폰트 없음/);
});
test('sample, clear, settings, AI panel and mode switches change their intended state',async()=>{
 const {e,app}=setup(true);e.btnSettings.click();assert.equal(e.settingsPanel.style.display,'block');e.btnSettings.click();assert.equal(e.settingsPanel.style.display,'none');
 e.btnAiSettings.click();assert.equal(e.aiPanel.style.display,'block');e.btnAiSettings.click();assert.equal(e.aiPanel.style.display,'none');
 e.modeLegacy.click();assert.equal(e.studioPanel.style.display,'none');e.modeStudio.click();assert.equal(e.studioPanel.style.display,'block');
 e.btnClear.click();await tick();assert.equal(app.state.plans.length,0);assert.equal(e.btnCreateAuto.disabled,true);
 e.btnSample.click();await tick();assert.equal(app.state.plans.length,3);assert.equal(e.autoTitle.value,Studio.SAMPLE.title);
});
test('load cancel, failure, retry and saved-plan restore reach the real adapter',async()=>{
 let result=null;const {e,app}=setup(true,{load:()=>{if(result instanceof Error)throw result;return result;}});
 e.btnLoadAuto.click();await tick();assert.match(e.studioStatus.textContent,/취소/);
 result=new Error('read failure');e.btnLoadAuto.click();await tick();assert.match(e.studioStatus.textContent,/read failure/);
 result={article:Studio.SAMPLE,settings:app.state.plans[0].settings,plan:app.state.plans[1]};
 e.btnLoadAuto.click();await tick();assert.equal(app.state.selected,3);assert.equal(e.btnLoadAuto.disabled,false);
});
test('photo cancel, failure, retry and dynamic remove preserve expected state',async()=>{
 let mode=0;const {e,app}=setup(true,{image:()=>{if(mode===1)throw new Error('photo error');return mode===0?null:{path:'a.jpg'};}});
 e.btnAddImage.click();await tick();assert.match(e.studioStatus.textContent,/취소/);mode=1;e.btnAddImage.click();await tick();assert.match(e.studioStatus.textContent,/photo error/);
 mode=2;e.btnAddImage.click();await tick();assert.equal(app.state.images.length,1);e.autoImages.children[0].children[1].click();assert.equal(app.state.images.length,0);
});
test('project save failure and cancel recover, and a retry succeeds',async()=>{
 let mode=0;const {e}=setup(true,{saveProject:()=>{if(mode===0)throw new Error('save error');return mode===2;}});
 e.btnSaveProject.click();await tick();assert.match(e.studioStatus.textContent,/save error/);mode=1;e.btnSaveProject.click();await tick();assert.match(e.studioStatus.textContent,/취소/);
 mode=2;e.btnSaveProject.click();await tick();assert.match(e.studioStatus.textContent,/저장했습니다/);
});
test('page navigation respects boundaries and stale candidate click displays an error',async()=>{
 const {e,app}=setup(true);e.autoBody.value='긴 본문 '.repeat(2500);e.autoBody.listeners.input();e.btnPrepare.click();await tick();
 assert.equal(e.prevPage.disabled,true);e.nextPage.click();assert.equal(app.state.page,1);e.prevPage.click();assert.equal(app.state.page,0);
 e.autoTitle.value+=' 수정';e.autoTitle.listeners.input();e.candidateList.children[1].click();assert.match(e.studioStatus.textContent,/바뀌었습니다/);
});
test('AI controls pass input, show failure, retry, select a plan and reuse cache without a real API call',async()=>{
 const AI=require('../src/ai-layout'),L=require('../src/layout-engine'),original=AI.generate;let calls=0;
 try{
  AI.generate=async(a,s,key,model)=>{calls++;assert.equal(key,'fake-test');assert.equal(model,'test-model');if(calls===1)throw new Error('mock AI error');return {...L.candidates(a,s)[0],origin:'ai',id:'ai'};};
  const {e,app}=setup(true);e.apiKey.value='fake-test';e.aiModel.value='test-model';e.btnAI.click();await tick();assert.match(e.studioStatus.textContent,/mock AI error/);
  e.btnAI.click();await tick();assert.equal(app.state.plans[app.state.selected].origin,'ai');e.btnAI.click();await tick();assert.equal(calls,2);assert.match(e.studioStatus.textContent,/재사용/);
 }finally{AI.generate=original;}
});

test('all editable article and setting values invalidate and reach a regenerated creation plan',async()=>{
 const changes={autoTitle:'다른 제목',autoSubtitle:'다른 부제',autoBody:'새 본문 '.repeat(100),autoKicker:'NEWS',autoAuthor:'필자',pageWidth:'240',pageHeight:'330',pageMargin:'20',pageBleed:'4',bodySize:'12',accent:'#336699',publication:'TEST',bodyFont:'Other Body',titleFont:'Other Title'};
 let received;const {e}=setup(true,{create:(article,plan)=>{received={article,plan};return {pageCount:1,errors:[],warnings:[]};}});
 for(const [id,value] of Object.entries(changes)){e[id].value=value;e[id].listeners.input();assert.equal(e.btnCreateAuto.disabled,true,id);e.btnPrepare.click();await tick();assert.equal(e.btnCreateAuto.disabled,false,id);}
 e.btnCreateAuto.click();await tick();assert.equal(received.article.title,changes.autoTitle);assert.equal(received.article.author,changes.autoAuthor);
 assert.equal(received.plan.settings.width,240);assert.equal(received.plan.settings.margin,20);assert.equal(received.plan.settings.accent,'#336699');assert.equal(received.plan.settings.titleFont,'Other Title');
});
test('native load and image pickers, project write and font adapter actually connect',async()=>{
 let entry=null,written,validation;
 const host={listFonts:()=>fontRows,validateFonts:s=>{validation=s;return [];}};
 const adapter=nativeAdapter(host,async()=>({write:v=>{written=v;}}),async()=>entry);
 assert.equal(await adapter.load(),null);assert.equal(await adapter.image(),null);
 entry={name:'article.txt',nativePath:'C:\\test\\article.txt',read:async()=> '제목\n본문'};
 assert.equal((await adapter.load()).article.title,'제목');
 entry={name:'photo.jpg',nativePath:'C:\\test\\photo.jpg'};assert.equal((await adapter.image()).preview,'file:C:/test/photo.jpg');
 await adapter.saveProject({schemaVersion:1});assert.equal(JSON.parse(written).schemaVersion,1);
 assert.equal(adapter.fonts(),fontRows);adapter.validateFonts({bodyFont:'chosen'});assert.equal(validation.bodyFont,'chosen');
});
test('preview uses catalog Medium style without requesting nonexistent styles from Host',async()=>{
 const {e}=setup(true,{fonts:()=>[{name:'Actual\tMedium',family:'Actual',style:'Medium'}]});
 e.btnFonts.click();await tick();e.fontChoices.children[0].children[0].click();e.fontChoices.children[0].children[1].click();e.btnFontTitle.click();await tick();
 assert.equal(e.largePreview.children[0].children.find(n=>n.className==='preview-title').style.fontWeight,'500');
 assert.equal(e.titleFont.value,'Actual\tMedium');
});

test('same-DOM initialization is idempotent; destroy and remount have one listener and one action',async()=>{
 const {app,e,adapter,calls}=setup(true);
 assert.equal(Studio.mount(adapter),app);assert.equal(e.btnCreateAuto.handlers.click.length,1);
 e.btnCreateAuto.click();await tick();assert.equal(calls.length,1);
 app.destroy();const next=Studio.mount(adapter);assert.notEqual(next,app);assert.equal(e.btnCreateAuto.handlers.click.length,1);
 e.btnCreateAuto.click();await tick();assert.equal(calls.length,2);assert.match(e.studioDiagnostics.textContent,/Studio ready/);
});
test('new DOM mount detaches old listeners and an old async load cannot update the new panel',async()=>{
 let complete;const old=setup(true,{load:()=>new Promise(r=>complete=r)});
 old.e.btnLoadAuto.click();const next=setup(true);complete({article:{...Studio.SAMPLE,title:'old async result'}});await tick();
 assert.equal(old.app.disposed,true);assert.equal(old.e.btnSample.handlers.click.length,0);
 assert.equal(next.e.autoTitle.value,Studio.SAMPLE.title);next.e.btnClear.click();await tick();assert.equal(next.e.autoTitle.value,'');
});
test('missing optional font or AI controls do not prevent core binding and preview use',async()=>{
 for(const missing of ['fontSearch','btnFonts','apiKey','btnAI']){
  const {e}=setup(true,{},[missing]);assert.equal(e.btnPrepare.handlers.click.length,1);
  e.btnClear.click();await tick();e.btnSample.click();await tick();assert.equal(e.candidateList.children.length,3);
  assert.match(e.studioDiagnostics.textContent,/선택 기능 요소 누락/);
 }
});
test('a failed optional listener and failed Host session initialization leave core UI usable',async()=>{
 const fx=fixture();global.document=fx.document;
 fx.e.btnFonts.addEventListener=()=>{throw new Error('optional binding failure');};
 const app=Studio.mount({native:true,resetSession:()=>{throw new Error('host init failure');}});
 fx.e.btnClear.click();await tick();fx.e.btnSample.click();await tick();
 assert.equal(app.state.plans.length,3);assert.equal(fx.e.btnCreateAuto.disabled,true);assert.match(fx.e.studioDiagnostics.textContent,/binding 실패/);
});
test('missing core DOM fails before binding; restoring it permits a clean initialization',()=>{
 const bad=fixture(['autoBody']);global.document=bad.document;
 assert.throws(()=>Studio.mount({native:true}),/autoBody/);assert.equal(bad.e.btnPrepare.handlers.click,undefined);
 const good=setup(true);assert.equal(good.e.btnPrepare.handlers.click.length,1);
});
test('font family/style grouping uses cache for reopen/search/general actions and explicit refresh only',async()=>{
 let queries=0;const faces=[{name:'Family\tBook',family:'Family',style:'Book'},{name:'Family\tMedium',family:'Family',style:'Medium'}];
 const {e}=setup(true,{fonts:refresh=>{queries++;if(queries===2)assert.equal(refresh,true);return faces;}});
 e.btnFonts.click();await tick();assert.equal(e.fontChoices.children.length,1);assert.equal(e.fontChoices.children[0].children.length,1);e.fontChoices.children[0].children[0].click();assert.equal(e.fontChoices.children[0].children.length,3);
 e.fontChoices.children[0].children[2].click();assert.match(e.fontSelection.textContent,/Medium/);e.btnFontTitle.click();await tick();assert.match(e.fontCurrent.textContent,/Family — Medium/);
 e.btnFonts.click();await tick();e.btnSample.click();await tick();e.btnPrepare.click();await tick();e.candidateList.children[1].click();
 e.btnFonts.click();await tick();e.fontSearch.value='Book';e.fontSearch.listeners.input();assert.equal(queries,1);
 e.btnFontRefresh.click();await tick();assert.equal(queries,2);
});
test('edited source cannot revive an old output by restoring its previous value',async()=>{
 const {e}=setup(true);e.btnCreateAuto.click();await tick();const original=e.autoTitle.value;
 e.autoTitle.value+='change';e.autoTitle.listeners.input();e.autoTitle.value=original;e.autoTitle.listeners.input();
 assert.equal(e.btnSaveIndd.disabled,true);assert.equal(e.btnExportPdf.disabled,true);
 e.btnCreateAuto.click();await tick();assert.equal(e.btnSaveIndd.disabled,false);
});
test('production recovers across create failure, check failure, save cancel and PDF failure',async()=>{
 const report={pageCount:1,errors:[],warnings:[]};let step='create';
 const {e}=setup(true,{create:()=>{if(step==='create')throw new Error('font style failure');return report;},check:()=>{if(step==='check')throw new Error('check failed');return report;},saveIndd:()=>step==='save'?null:report,exportPdf:()=>{if(step==='pdf')throw new Error('pdf failed');return report;}});
 e.btnCreateAuto.click();await tick();assert.equal(e.btnCreateAuto.disabled,false);step='';e.btnCreateAuto.click();await tick();
 step='check';e.btnCheckAuto.click();await tick();assert.equal(e.btnCheckAuto.disabled,false);assert.equal(e.btnExportPdf.disabled,true);
 step='';e.btnCheckAuto.click();await tick();step='save';e.btnSaveIndd.click();await tick();assert.equal(e.btnSaveIndd.disabled,false);
 step='';e.btnSaveIndd.click();await tick();step='pdf';e.btnExportPdf.click();await tick();assert.equal(e.btnCheckAuto.disabled,false);
 step='';e.btnCheckAuto.click();await tick();e.btnExportPdf.click();await tick();assert.match(e.studioStatus.textContent,/성공/);
});
test('the actual entrypoint waits for DOM readiness and tolerates unavailable Host',()=>{
 const vm=require('node:vm');let ready,mounts=0,adapter;
 const ctx={require:n=>{
  if(n==='uxp')return {storage:{localFileSystem:{}}};
  if(n==='./src/auto-indesign.js')throw new Error('Host unavailable');
  if(n==='./src/studio-ui.js')return {mount:a=>{mounts++;adapter=a;}};
  return require('../'+n);
 },document:{readyState:'loading',addEventListener:(name,fn,options)=>{assert.equal(name,'DOMContentLoaded');assert.equal(options.once,true);ready=fn;},getElementById:()=>({})}};
 vm.runInNewContext(fs.readFileSync('studio.js','utf8'),ctx);assert.equal(mounts,0);ready();assert.equal(mounts,1);assert.equal(adapter.native,false);assert.match(adapter.hostError,/unavailable/);
});
test('a pending save picker from a disposed panel cannot write into a new session',async()=>{
 let choose,writes=0,session=0;
 const adapter=nativeAdapter({resetSession:()=>session++,sessionId:()=>session,save:()=>writes++},()=>new Promise(r=>choose=r));
 adapter.resetSession();const pending=adapter.saveIndd();adapter.dispose();choose({nativePath:'C:\\private\\out.indd'});
 await assert.rejects(()=>pending,/다시 초기화/);assert.equal(writes,0);
});
test('a control-query exception cannot leave the controller permanently busy',async()=>{
 const {app,e,document}=setup(true),query=document.querySelectorAll;let fail=true;
 document.querySelectorAll=s=>{if(fail&&s!=='[id]')throw new Error('controls unavailable');return query(s);};
 e.btnSample.click();await tick();assert.equal(app.state.busy,false);assert.match(e.studioStatus.textContent,/controls unavailable/);
 fail=false;e.btnSample.click();await tick();assert.equal(app.state.plans.length,3);assert.equal(e.btnCreateAuto.disabled,false);
});

const jsonManifest=JSON.parse(fs.readFileSync('designs/manifest.json')),jsonLibrary=()=>require('../src/json-design').load(name=>fs.readFileSync('designs/'+name,'utf8'));
for(let i=0;i<3;i++)test('JSON Layout '+(i+1)+' selection renders normalized positions/type and sends the same plan to Host',async()=>{
 let received;const {e,app}=setup(true,{designs:jsonLibrary,validateDesignFonts:()=>[],create:async(a,p)=>{received=p;return {pageCount:1,errors:[],warnings:[]};}});await tick();
 assert.equal(e.candidateList.children.length,3);assert.equal(e.jsonDesignList.children.length,3);e.jsonDesignList.children[i].click();await tick();
 const p=app.state.plans[app.state.selected],sheet=e.largePreview.children[0],scale=parseFloat(sheet.style.width)/p.settings.width;
 assert.equal(p.id,jsonManifest.templates[i].id);assert.equal(sheet.children.length,p.pages[0].elements.length);
 p.pages[0].elements.forEach((b,j)=>{const node=sheet.children[j];if(b.role==='line'){assert.equal(node.style.height,(require('../src/layout-engine').ptToMm(b.stroke.weight)*scale)+'px');assert.equal(node.style.backgroundColor,b.stroke.color.css);return;}
 assert.equal(node.style.left,(b.x*scale)+'px');assert.equal(node.style.top,(b.y*scale)+'px');assert.equal(node.style.width,(b.width*scale)+'px');assert.equal(node.style.height,(b.height*scale)+'px');
 if(b.typography){assert.equal(node.style.fontSize,(require('../src/layout-engine').ptToMm(b.typography.size)*scale)+'px');assert.equal(node.style.lineHeight,(require('../src/layout-engine').ptToMm(b.typography.leading)*scale)+'px');assert.equal(node.style.textAlign,b.typography.align);}else{assert.equal(node.style.borderRadius,(5*scale)+'px');assert.equal(node.textContent,'');}});
 e.btnCreateAuto.click();await tick();assert.equal(received,p);assert.equal(e.btnCheckAuto.disabled,false);assert.equal(e.candidateList.children.length,3);
});
test('broken library entry and unavailable fonts cannot kill free UI; explicit font choice changes only typography',async()=>{
 const catalog=[{name:'Available\tBook',family:'Available',style:'Book'}];const {e,app}=setup(true,{designs:async()=>{const rows=await jsonLibrary();rows[1]={id:rows[1].id,error:'bad JSON'};return rows;},validateDesignFonts:()=>[{name:'프리젠테이션\t6 SemiBold',error:'없음'}],fonts:()=>catalog});await tick();
 assert.equal(e.jsonDesignList.children[1].disabled,true);e.jsonDesignList.children[0].click();await tick();assert.match(e.jsonDesignInfo.textContent,/필요한 폰트가 없습니다/);assert.equal(app.state.busy,false);assert.equal(e.btnPrepare.disabled,false);
 const before=app.state.plans.at(-1);e.btnFonts.click();await tick();e.fontChoices.children[0].children[0].click();e.fontChoices.children[0].children[1].click();e.btnFontTitle.click();await tick();const after=app.state.plans[app.state.selected];assert.equal(after.origin,'json');assert.equal(after.fontOverrides.titleFont,'Available\tBook');assert.deepEqual(after.pages[0].elements.map(b=>[b.x,b.y,b.width,b.height]),before.pages[0].elements.map(b=>[b.x,b.y,b.width,b.height]));
 e.btnPrepare.click();await tick();assert.equal(e.candidateList.children.length,3);assert.ok(app.state.plans.every(p=>p.origin==='local'));
});
test('JSON loading failure can retry, and reinitialization does not duplicate listeners or accept stale results',async()=>{
 let fail=true;const first=setup(true,{designs:async()=>{if(fail)throw new Error('read failed');return jsonLibrary();}});await tick();assert.match(first.e.designLibraryStatus.textContent,/읽기 실패/);first.e.btnSample.click();await tick();assert.equal(first.e.candidateList.children.length,3);
 fail=false;first.e.btnLoadDesigns.click();await tick();assert.equal(first.e.jsonDesignList.children.length,3);assert.equal(Studio.mount(first.adapter),first.app);assert.equal(first.e.btnLoadDesigns.handlers.click.length,1);
 let resolve;const old=setup(true,{designs:()=>new Promise(r=>resolve=r)}),next=setup(true,{designs:jsonLibrary});await tick();resolve([{id:'old',error:'stale'}]);await tick();assert.equal(old.app.disposed,true);assert.equal(next.e.jsonDesignList.children.length,3);assert.doesNotMatch(next.e.designLibraryStatus.textContent,/stale/);
});
test('JSON project roundtrip preserves source plan and document freshness without replacing free designs',async()=>{
 const first=setup(true,{designs:jsonLibrary});await tick();first.e.jsonDesignList.children[2].click();await tick();first.e.btnSaveProject.click();await tick();const saved=JSON.parse(JSON.stringify(first.saved[0]));assert.equal(saved.plan.origin,'json');
 const next=setup(true,{designs:jsonLibrary,load:async()=>saved,validateDesignFonts:()=>[]});await tick();next.e.btnLoadAuto.click();await tick();assert.equal(next.app.state.plans[next.app.state.selected].id,saved.plan.id);assert.equal(next.e.candidateList.children.length,3);next.e.btnCreateAuto.click();await tick();assert.equal(next.e.btnSaveIndd.disabled,false);next.e.autoBody.value+='수정';next.e.autoBody.listeners.input();assert.equal(next.e.btnSaveIndd.disabled,true);assert.equal(next.e.btnCreateAuto.disabled,true);
});

test('actual UXP adapter reads the plugin designs folder through manifest, never the user document folder',async()=>{
 const paths=[],adapter=nativeAdapter({},null,null,async()=>({getEntry:async path=>{paths.push(path);return {read:async()=>fs.readFileSync(path,'utf8')};}}));
 const rows=await adapter.designs();assert.equal(rows.filter(r=>r.design).length,3);assert.deepEqual(paths,['designs/manifest.json',...jsonManifest.templates.map(r=>'designs/'+r.file)]);
});

test('JSON preview maps asymmetric InDesign inset order and preserves contain image background',async()=>{
 const rows=await jsonLibrary(),raw=rows[0].design;for(const e of raw.elements.filter(e=>e.role==='body')){e.inset=[1,2,3,4];e.columns=2;e.columnGap=3;e.typography.spaceBeforeMm=1;e.typography.spaceAfterMm=2;}raw.elements[0].fit='contain';
 const {e,app}=setup(true,{designs:async()=>rows,image:async()=>({path:'p.jpg',preview:'file:/p.jpg'})});await tick();e.btnAddImage.click();await tick();e.jsonDesignList.children[0].click();await tick();
 const p=app.state.plans[app.state.selected],b=p.pages[0].elements.find(b=>b.role==='body'),sheet=e.largePreview.children[0],scale=parseFloat(sheet.style.width)/p.settings.width,node=sheet.children[1];assert.equal(node.style.left,((b.x+2)*scale)+'px');assert.equal(node.style.top,((b.y+1)*scale)+'px');assert.equal(node.style.width,((b.width-2-4-3)/2*scale)+'px');assert.equal(node.children[0].style.marginTop,scale+'px');assert.equal(node.children[0].style.marginBottom,(2*scale)+'px');assert.equal(sheet.children[0].style.backgroundColor,p.pages[0].elements[0].fill.css);assert.equal(sheet.children[0].children[0].style.objectFit,'contain');
});

test('UX selection is textual and PDF blocking gives actionable role summaries with diagnostics collapsed',async()=>{
 const report={pageCount:1,errors:['제목 텍스트가 넘칩니다.'],warnings:[],issues:[{role:'title',message:'제목 텍스트가 넘칩니다.',hint:'프레임 높이를 확인하고 다시 검사해주세요.',detail:'Story 323'}]};
 const {e}=setup(true,{create:async()=>report});
 assert.match(e.candidateList.children[0].children[1].textContent,/선택됨/);assert.match(e.selectedDesign.textContent,/에디토리얼/);
 e.btnCreateAuto.click();await tick();assert.match(e.inspectionSummary.textContent,/수정 필요 1건/);assert.match(e.pdfReason.textContent,/오류 1건/);assert.equal(e.btnExportPdf.disabled,true);
 assert.match(e.inspectionIssues.children[0].children[0].textContent,/제목/);assert.doesNotMatch(e.inspectionIssues.children[0].children[0].textContent,/323/);assert.match(e.hostReport.textContent,/Story 323/);assert.equal(e.diagnosticsPanel.style.display,'none');
 e.btnDiagnostics.click();assert.equal(e.diagnosticsPanel.style.display,'block');e.btnDiagnostics.click();assert.equal(e.diagnosticsPanel.style.display,'none');
 e.candidateList.children[1].click();assert.match(e.selectedDesign.textContent,/여백 중심/);assert.equal(e.inspectionIssues.children.length,0);assert.equal(e.btnExportPdf.disabled,true);
});
test('UX processing, failure, retry, recheck and source edits never leave stale success',async()=>{
 let finish;let fail=true;const {e}=setup(true,{create:()=>new Promise((resolve,reject)=>finish=()=>fail?reject(new Error('[create.Mock] error')):resolve({pageCount:1,errors:[],warnings:[]}))});
 e.btnCreateAuto.click();assert.match(e.btnCreateAuto.textContent,/처리 중/);assert.match(e.productionStatus.textContent,/생성 중/);assert.equal(e.btnCreateAuto.disabled,true);assert.equal(e.btnDiagnostics.disabled,false);
 finish();await tick();assert.match(e.productionStatus.textContent,/실패/);assert.equal(e.btnCreateAuto.disabled,false);assert.doesNotMatch(e.studioStatus.textContent,/create.Mock/);
 fail=false;e.btnCreateAuto.click();finish();await tick();assert.match(e.productionStatus.textContent,/완료/);assert.equal(e.btnExportPdf.disabled,false);assert.match(e.pdfReason.textContent,/가능/);
 e.autoBody.value+=' 변경';e.autoBody.listeners.input();assert.equal(e.productionStatus.textContent,'');assert.equal(e.btnExportPdf.disabled,true);
});
test('UX fonts render bounded collapsed families, exact selected style, and applied target feedback',async()=>{
 let calls=0;const faces=Array.from({length:100},(_,i)=>['Book','Black'].map(style=>({family:'Family'+i,style,name:'Family'+i+'\t'+style}))).flat();
 const {e}=setup(true,{fonts:async()=>{calls++;return faces;}});e.btnFonts.click();await tick();assert.equal(e.fontChoices.children.length,30);assert.ok(e.fontChoices.children.every(g=>g.children.length===1));
 e.fontSearch.value='Family99';e.fontSearch.listeners.input();assert.equal(e.fontChoices.children.length,1);e.fontChoices.children[0].children[0].click();e.fontChoices.children[0].children[2].click();assert.match(e.fontSelection.textContent,/Black/);assert.match(e.fontChoices.children[0].children[2].textContent,/선택됨/);
 e.btnFontBody.click();await tick();assert.match(e.btnFontBody.textContent,/적용됨/);e.btnFontTitle.click();await tick();assert.match(e.btnFontTitle.textContent,/적용됨/);assert.equal(calls,1);
});

test('narrow preview leaves room for panel padding and diagnostics toggle survives remount',async()=>{
 const first=setup(true);first.e.largePreview.clientWidth=280;first.e.btnPrepare.click();await tick();assert.equal(parseFloat(first.e.largePreview.children[0].style.width),240);
 first.e.btnDiagnostics.click();assert.equal(first.e.diagnosticsPanel.style.display,'block');
 const next=setup(true);assert.equal(next.e.diagnosticsPanel.style.display,'none');assert.equal(next.e.btnDiagnostics.handlers.click.length,1);first.e.btnDiagnostics.click();assert.equal(next.e.diagnosticsPanel.style.display,'none');
});

test('auto-fit summary enables PDF only after final clean report, keeps unresolved errors and resets on source change',async()=>{
 let failed=false;const fixed={role:'title',before:{fontSize:36},after:{fontSize:35},reason:'CONTENT_OVERFLOW',result:'resolved'};
 const {e}=setup(true,{create:async()=>({pageCount:1,errors:[],issues:[],warnings:[],autoFixes:[fixed]}),check:()=>({pageCount:1,errors:failed?['제목 넘침']:[],issues:failed?[{message:'제목 넘침',category:'USER_ACTION_REQUIRED',hint:'직접 조정 필요'}]:[],warnings:[],autoFixes:[{...fixed,result:failed?'unresolved':'resolved'}]})});
 e.btnCreateAuto.click();await tick();assert.equal(e.btnExportPdf.disabled,false);assert.match(e.inspectionIssues.children[0].textContent,/자동 수정됨/);assert.match(e.hostReport.textContent,/fontSize/);
 failed=true;e.btnCheckAuto.click();await tick();assert.equal(e.btnExportPdf.disabled,true);assert.match(e.inspectionIssues.children[0].textContent,/미해결/);assert.match(e.inspectionIssues.children[1].children[0].textContent,/사용자 확인/);
 e.autoTitle.value+=' 수정';e.autoTitle.listeners.input();assert.equal(e.inspectionIssues.children.length,0);
});

test('registered DOM failure remains visible without scrolling and ends both diagnostic logs',async()=>{
 const Trace=require('../src/registered-dom-trace'),entry={descriptor:{id:'ref',name:'Reference'},profile:{name:'Reference'},original:{metadata:{sourceSha256:'hash'}}};let caught;
 const x=setup(true,{createRegistered:async(e,a,progress)=>{for(let i=0;i<180;i++)progress('prior '+i);try{Trace.run(progress,'registered.snapshot.object',{},'snapshot',null,()=>Trace.run(progress,'registered.snapshot.read',{id:73,name:'frame'},'textWrapOffset',undefined,()=>{const e=new Error('현재 상태에서 이 속성을 적용할 수 없습니다.');e.number=55;throw e;},{before:false}));}catch(e){caught=e;throw e;}}});
 await x.app.createRegistered(entry,x.app.read().article,'proof');
 assert.equal(caught.registeredFailure.operation,'registered.snapshot.read');
 for(const field of ['registered.snapshot.read','id=73','textWrapOffset','attempted value','현재 상태','55'])assert.ok(x.e.productionStatus.textContent.includes(field),field);
 assert.ok(x.e.hostReport.textContent.endsWith(x.e.productionStatus.textContent));assert.ok(x.e.studioDiagnostics.textContent.includes('textWrapOffset'));
 assert.equal(x.e.btnExportPdf.disabled,true);assert.equal(x.app.state.hasDocument,false);
});

test('Fidelity report shows per-property source/host evidence and conservatively classifies failures',()=>{
 const D=require('../src/production-diagnostics'),diffs=[{path:'$.bounds.0',expected:1,actual:2},{path:'$.runs.0.Leading',expected:20,actual:24},{path:'$.readback',expected:'supported',actual:'UNSUPPORTED: fill'},{path:'$.frame.InsetSpacing',expected:'SOURCE_UNRESOLVED',actual:0}];
 const report={fidelity:{records:[{elementId:'u7caf',role:'subtitle',comparison:{equal:false,differences:diffs}}]},issues:[{elementId:'u7caf',role:'subtitle',differences:diffs}]};
 const rows=D.fidelityRows(report);assert.equal(rows.length,4);assert.deepEqual(rows.map(r=>r.classification),['GEOMETRY_MISMATCH','TYPOGRAPHY_MISMATCH','READBACK_UNSUPPORTED','SOURCE_UNRESOLVED']);assert.ok(rows.every(r=>r.blocking));assert.deepEqual(rows[0].stages,['original','recheck']);assert.equal(rows[0].expected,1);assert.equal(rows[0].actual,2);
});
test('registered Fidelity differences are visible in inspection without opening raw diagnostics',async()=>{
 const x=setup(true,{createRegistered:async()=>({errors:['원본 재현 실패'],warnings:[],pageCount:1,issues:[],outputReady:false,fidelity:{phase:'FIDELITY_FAILED',proofOnly:true,records:[{elementId:'u7caf',comparison:{equal:false,differences:[{path:'$.runs.0.Leading',expected:24,actual:28}]}}]}})});
 const entry={descriptor:{id:'ref'},profile:{name:'Reference'},original:{metadata:{sourceSha256:'hash'}}};await x.app.createRegistered(entry,x.app.read().article,'proof');
 const flatten=n=>n.textContent+' '+n.children.map(flatten).join(' '),text=flatten(x.e.inspectionIssues);assert.match(text,/u7caf/);assert.match(text,/원본: 24/);assert.match(text,/생성: 28/);assert.match(text,/TYPOGRAPHY_MISMATCH/);assert.equal(x.e.btnExportPdf.disabled,true);
});

function fidelityExportFixture(){
 const differences=[{path:'$.runs.0.Leading',expected:24,actual:28},{path:'$.text',expected:'원문\n전체 /private/source',actual:'생성문'},{path:'$.missing',expected:undefined,actual:null}];
 const issues=[{cause:'GENERATOR_MISMATCH',category:'BLOCKING',message:'원본 재현 실패'},...Array.from({length:5},(_,i)=>({cause:'GENERATOR_MISMATCH',elementId:'u'+i,role:'body',message:'원본 속성 재검사 불일치',differences,adobeError:'Host error '+i,adobeErrorCode:100+i,failureOperation:'registered.fidelity.readback',property:'leading'}))];
 const entry={descriptor:{id:'design',name:'기준',pageIds:['page']},profile:{name:'기준'},original:{metadata:{sourceSha256:'hash'},elements:Array.from({length:5},(_,i)=>({id:'u'+i,type:'TextFrame',pageCandidates:['page'],spreadId:'spread'})),pages:[]}};
 const report={errors:issues.map(i=>i.message),warnings:[],issues,pageCount:1,outputReady:false,fidelity:{phase:'FIDELITY_FAILED',proofOnly:true,records:issues.slice(1).map(i=>({elementId:i.elementId,role:i.role,original:{text:'원문'},generated:{text:'생성문'},comparison:{equal:false,differences}}))}};return {entry,report};
}
test('diagnostic JSON preserves all six issues, every difference, original report and special values',()=>{
 const D=require('../src/production-diagnostics'),{entry,report}=fidelityExportFixture();report.issues[1].differences.push({path:'$.infinite',expected:Infinity,actual:NaN});
 const json=JSON.parse(D.diagnosticJSON(D.fidelityDiagnostic(report,entry,null,['stage'])));
 assert.equal(json.fidelityErrorCount,6);assert.equal(json.errors.length,6);assert.equal(json.comparisons.length,5);assert.equal(json.rawReport.issues.length,6);
 const error=json.errors[1];assert.equal(error.sourceId,'u0');assert.equal(error.objectType,'TextFrame');assert.deepEqual(error.page,['page']);assert.equal(error.spread,'spread');assert.equal(error.adobeErrorCode,100);assert.equal(error.failureOperation,'registered.fidelity.readback');assert.equal(error.property,'leading');
 assert.equal(error.differences[1].expected,'원문\n전체 /private/source');assert.deepEqual(error.differences[2].expected,{__diagnosticType:'undefined'});assert.equal(error.differences[2].actual,null);assert.deepEqual(error.differences[3].expected,{__diagnosticType:'Infinity'});assert.deepEqual(error.differences[3].actual,{__diagnosticType:'NaN'});
 assert.equal(json.errors[0].elementId,null);assert.equal(json.errors[0].rawIssue.message,'원본 재현 실패');
});
test('diagnostic export preserves structured Host exceptions and does not claim comparison differences',()=>{
 const D=require('../src/production-diagnostics'),{entry}=fidelityExportFixture(),error=new Error('Adobe rejected');error.registeredFailure={operation:'registered.snapshot.read',object:{sourceId:'u0',type:'TextFrame'},page:{id:12},spread:{id:13},property:'overprintFill',attemptedValue:null,adobeMessage:'Adobe rejected',adobeNumber:42};
 const out=JSON.parse(D.diagnosticJSON(D.fidelityDiagnostic(null,entry,error)));assert.equal(out.fidelityErrorCount,1);assert.equal(out.errors[0].adobeErrorCode,42);assert.deepEqual(out.errors[0].differences,[]);assert.equal(out.errors[0].page.id,12);
});
test('JSON button exports immutable failure snapshot, permits retry/cancel and invalidates on source edit',async()=>{
 const {entry,report}=fidelityExportFixture(),saved=[];let mode='cancel';
 const x=setup(true,{createRegistered:async()=>report,saveFidelityDiagnostic:async text=>{saved.push(text);if(mode==='fail')throw new Error('disk full');return mode==='ok';}});
 assert.equal(x.e.btnSaveFidelity.disabled,true);await x.app.createRegistered(entry,x.app.read().article,'proof');assert.equal(x.e.btnSaveFidelity.disabled,false);report.issues.length=0;
 x.e.btnSaveFidelity.click();await tick();assert.match(x.e.studioStatus.textContent,/취소/);assert.equal(JSON.parse(saved[0]).errors.length,6);assert.equal(x.e.btnExportPdf.disabled,true);
 mode='fail';x.e.btnSaveFidelity.click();await tick();assert.match(x.e.studioStatus.textContent,/disk full/);assert.equal(x.e.btnSaveFidelity.disabled,false);
 mode='ok';x.e.btnSaveFidelity.click();await tick();assert.match(x.e.studioStatus.textContent,/저장 완료/);assert.equal(saved[0],saved[2]);assert.equal(x.e.btnExportPdf.disabled,true);
 x.e.autoTitle.value='changed';x.e.autoTitle.listeners.input();assert.equal(x.e.btnSaveFidelity.disabled,true);
});
test('UXP diagnostic file save awaits write then verifies full UTF8 text with readback',async()=>{
 let release,stored;const events=[],text='{ "한글": "원문\\n본문" }';
 const a=nativeAdapter({},async(name,options)=>{assert.equal(name,'magazine-fidelity.private.json');assert.deepEqual(Array.from(options.types),['json']);return {write:async v=>{events.push('write');await new Promise(r=>release=r);stored=v;events.push('written');},read:async()=>{events.push('read');return stored;}};});
 const pending=a.saveFidelityDiagnostic(text);await tick();assert.deepEqual(events,['write']);release();assert.equal(await pending,true);assert.equal(stored,text);assert.deepEqual(events,['write','written','read']);
});
test('UXP diagnostic save rejects damaged readback, supports cancellation and blocks stale picker',async()=>{
 const bad=nativeAdapter({},async()=>({write:async()=>{},read:async()=> 'damaged'}));await assert.rejects(bad.saveFidelityDiagnostic('original'),/내용 검증 실패/);
 const cancel=nativeAdapter({},async()=>null);assert.equal(await cancel.saveFidelityDiagnostic('{}'),null);
 let choose,writes=0;const stale=nativeAdapter({},()=>new Promise(r=>choose=r));const pending=stale.saveFidelityDiagnostic('{}');stale.dispose();choose({write:async()=>writes++,read:async()=> '{}'});await assert.rejects(pending,/다시 초기화/);assert.equal(writes,0);
});
