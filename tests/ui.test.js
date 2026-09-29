'use strict';
// Minimal DOM double for controller state/event tests, not a real browser rendering test.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const Studio=require('../src/studio-ui');
class Element{
 constructor(id=''){this.id=id;this.value='';this.children=[];this.style={display:''};this.className='';this.disabled=false;this.listeners={};this.clientWidth=440;this._text='';}
 set textContent(v){this._text=String(v);this.children=[];}get textContent(){return this._text;}
 appendChild(e){this.children.push(e);return e;}setAttribute(){}
 addEventListener(t,f){this.listeners[t]=f;}click(){if(!this.disabled&&this.listeners.click)this.listeners.click();}
}
function setup(native=false,overrides={}){
 const html=fs.readFileSync('index.html','utf8'),elements={};for(const m of html.matchAll(/id="([^"]+)"/g))elements[m[1]]=new Element(m[1]);
 elements.aiModel.value='gpt-4.1-mini';elements.settingsPanel.style.display='none';elements.aiPanel.style.display='none';
 global.document={getElementById:id=>elements[id],querySelectorAll:()=>Object.values(elements),createElement:()=>new Element()};
 const saved=[],calls=[];
 const report={pageCount:1,errors:[],warnings:[]};
 const app=Studio.mount({native,load:async()=>null,image:async()=>({path:'p.jpg',name:'사진',preview:''}),fonts:async()=>[],saveProject:async obj=>{saved.push(obj);return true;},create:async()=>{calls.push('create');return report;},check:()=>{calls.push('check');return report;},saveIndd:()=>{calls.push('save');return report;},exportPdf:()=>{calls.push('pdf');return report;},...overrides});
 return {app,e:elements,saved,calls};
}
const tick=()=>new Promise(r=>setImmediate(r));
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

function nativeAdapter(host,picker,opening){
 const vm=require('node:vm');let adapter;
 vm.runInNewContext(fs.readFileSync('studio.js','utf8'),{require:n=>{
  if(n==='uxp')return {storage:{formats:{binary:'binary'},localFileSystem:{getFileForSaving:picker,getFileForOpening:opening}}};
  if(n==='./src/auto-indesign.js')return host;
  if(n==='./src/studio-ui.js')return {mount:a=>{adapter=a;}};
  return require('../'+n);
 },document:{getElementById:()=>({})}});
 assert.ok(adapter);return adapter;
}
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
 fail=false;e.btnFonts.click();await tick();assert.match(e.studioStatus.textContent,/설치 폰트가 없습니다/);
});
test('choosing installed replacements updates preview and creation plan, invalidates old output',async()=>{
 let received;const {app,e}=setup(true,{fonts:()=>fontRows,create:(a,p)=>{received=p;return {pageCount:1,errors:[],warnings:[]};}});
 e.btnCreateAuto.click();await tick();e.btnFonts.click();await tick();
 e.fontChoices.children[0].children[1].click();await tick();e.fontChoices.children[1].children[2].click();await tick();
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
 e.btnFonts.click();await tick();e.fontChoices.children[0].children[2].click();await tick();
 assert.equal(e.largePreview.children[0].children.find(n=>n.className==='preview-title').style.fontWeight,'500');
 assert.equal(e.titleFont.value,'Actual\tMedium');
});
