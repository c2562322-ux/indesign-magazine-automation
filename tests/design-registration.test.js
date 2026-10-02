'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawnSync}=require('node:child_process');
const R=require('../src/design-registration'),M=require('../src/design-model'),Match=require('../src/design-matching'),UI=require('../src/design-registration-ui'),Image=require('../src/image-dimensions');
const bundled=path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe');
const py=process.env.PYTHON||(fs.existsSync(bundled)?bundled:'python3');
const output=spawnSync(py,['tests/test_design_extraction.py','--model'],{encoding:'utf8'});assert.equal(output.status,0,output.stderr);
const base=JSON.parse(output.stdout),copy=x=>JSON.parse(JSON.stringify(x));
function model(){const m=copy(base),body=copy(m.elements[0]),story=copy(m.stories[0]);body.id='body';body.role.confirmed=null;body.textFrame.storyRef='bs';body.pageBounds.p1=[150,20,700,420];story.id='bs';for(const r of story.paragraphs.flatMap(p=>p.runs))Object.assign(r.resolvedProperties,{PointSize:10,Leading:14});m.elements.push(body);m.stories.push(story);return m;}
function registered(){const m=model(),d=R.draft(m,'p1');R.confirm(d,'body','body');for(const e of R.frames(m,'p1'))if(!d.roles[e.id])R.confirm(d,e.id,'keep');return R.register(m,d);}
const article={title:'제목',body:'본문',images:[]},fonts=[{family:'Design Test',style:'9 Black'}];
test('page-set registration follows shared objects and threads; fingerprints invalidate dependencies',()=>{
 const S=require('../tools/design-set-registration'),m=model();
 m.pages=m.pages.filter(p=>p.id!=='p2');const other=copy(m.pages.find(p=>p.id==='p1'));other.id='p2';other.documentIndex=1;m.pages.push(other);
 const shape={id:'shared',type:'Rectangle',pageCandidates:['p1','p2'],properties:{},pageBounds:{p1:[0,0,10,10],p2:[0,-10,10,0]}};m.elements.push(shape);
 assert.deepEqual(S.pageSets(m),[['p1','p2']]);
 const original=S.fingerprint(m,['p1','p2']);m.pages.reverse();assert.equal(S.fingerprint(m,['p1','p2'])===original,false); // scope ordering is composition evidence
 assert.notEqual(S.fingerprint(m,['p1','p2'],{roles:{body:'body'}}),S.fingerprint(m,['p1','p2'],{roles:{body:'keep'}}));
 m.pages.reverse();m.elements.find(e=>e.id==='body').pageBounds.p1[0]++;assert.notEqual(S.fingerprint(m,['p1','p2']),original);
 const d={pageSet:{id:'stable',fingerprint:'a'}};assert.deepEqual(S.changes([d],[{pageSet:{id:'stable',fingerprint:'b'}}]),[{id:'stable',state:'CHANGED'}]);
 assert.equal(S.changes([d],[d])[0].state,'UNCHANGED');assert.equal(S.changes([], [d])[0].state,'ADDED');assert.equal(S.changes([d],[])[0].state,'REMOVED');
});
test('page fingerprint includes optional content semantics but excludes whole-package provenance',()=>{
 const S=require('../tools/design-set-registration'),m=model(),contract={schema:'magazine-content-contract/v1',sourceSha256:'first',subtitle:{support:'absent',optional:true,handling:'omit-with-warning'}};
 assert.equal(S.fingerprint(m,['p1'],{contentContract:contract}),S.fingerprint(m,['p1'],{contentContract:{...contract,sourceSha256:'second'}}));
 assert.notEqual(S.fingerprint(m,['p1'],{contentContract:contract}),S.fingerprint(m,['p1'],{contentContract:{...contract,subtitle:{...contract.subtitle,handling:'block'}}}));
});
test('shared PRESERVE shape requires all intersecting pages and cannot become shared content',()=>{
 const N=require('../src/registered-native'),m=model(),d=R.draft(m,'p1'),shared={...copy(m.elements[0]),id:'shared',type:'Rectangle',textFrame:null,role:{confirmed:null},pageCandidates:['p1','p2'],properties:{},details:{},image:[],spreadId:m.pages.find(p=>p.id==='p1').spreadId,pageBounds:{p1:[0,0,10,10],p2:[0,-10,10,0]}};m.elements.push(shared);
 assert.ok(N.support(R.register(m,d)).fidelityReasons.some(x=>x.includes('shared')));
 d.pageIds=['p1','p2'];assert.equal(N.support(R.register(m,d)).fidelityReasons.some(x=>x.includes('shared')),false);
 d.roles.shared={role:'image1',confirmed:true};d.images.shared='required';assert.throws(()=>R.register(m,d),/outside selected/);
});
test('global crop matching preserves required slots, unique images, and unknown-dimension gates',()=>{
 const slots=[{aspectRatio:.5,requirement:'required'},{aspectRatio:2,requirement:'required'}],images=[{widthPx:200,heightPx:100},{widthPx:100,heightPx:200}];
 assert.deepEqual(Match.imageAssignment(slots,images),[1,0]);
 assert.deepEqual(Match.imageAssignment([{aspectRatio:1,requirement:'optional'},slots[0]],[images[1]]),[null,0]);
 assert.deepEqual(Match.imageAssignment([{aspectRatio:1,requirement:'optional'},slots[0]],[{}]),[null,0]);
 assert.throws(()=>Match.imageAssignment(slots,[images[0]]),/필수/);
 assert.throws(()=>Match.imageAssignment([slots[0]],images),/사진 수/);
 assert.throws(()=>Match.imageAssignment([{aspectRatio:NaN,requirement:'required'}],[images[0]]),/비율/);
 const many=Array.from({length:9},(_,i)=>({widthPx:i+1,heightPx:1}));assert.equal(new Set(Match.imageAssignment(many.map((im)=>({aspectRatio:im.widthPx,requirement:'required'})),many)).size,9);
});
test('inactive legacy design sets remain registered but cannot enter user recommendations',()=>{
 const e=registered(),legacy=R.register(e.original,{...e.descriptor,designSet:{id:'legacy',version:'1',active:false}});
 assert.equal(R.unpack(R.pack([legacy])).entries.length,1);assert.equal(R.recommendations([legacy],article,fonts).assessments.length,0);
});
test('role evidence retains priority; geometry never auto-confirms',()=>{const m=model(),e=m.elements.find(e=>e.id==='body');e.properties.Name='BODY';const c=R.candidates(m,e);assert.equal(c[0].role,'title');assert.ok(c.some(c=>c.role==='body'));assert.equal(c[0].confirmed,false);assert.equal(R.candidates(m,m.elements[0])[0].confirmed,true);});
test('role confirmation, preserve, capability, original immutability and gate',()=>{const e=registered();assert.equal(e.profile.readyForMatching,true);assert.equal(e.fidelity.state,'READY_FOR_FIDELITY_TEST');assert.equal(e.fidelity.productionReady,false);assert.ok(Object.isFrozen(e.original));});
test('saved file cannot self-authorize fidelity; corrupt entries isolated',()=>{const e=registered(),p=copy(R.pack([e]));p.designs[0].descriptor.productionReady=true;p.designs.push({});const out=R.unpack(p);assert.equal(out.entries.length,1);assert.equal(out.errors.length,1);assert.equal(out.entries[0].fidelity.productionReady,false);});
test('recommendations capped at three and require explicit selection; content leaves typography intact',()=>{const e=registered(),entries=Array.from({length:5},(_,i)=>R.register(e.original,{...e.descriptor,id:'d'+i}));const before=JSON.stringify(entries[0].original);const ranked=R.recommendations(entries,article,fonts);assert.equal(ranked.candidates.length,3);assert.equal(ranked.selectedId,null);const selected=R.selection(entries[0],article,fonts);assert.equal(selected.overlay.content.find(c=>c.role==='title').text,'제목');assert.equal(JSON.stringify(entries[0].original),before);assert.equal(selected.overlay.productionReady,false);});
test('fidelity, missing fonts, source overflow and content overflow never conflated',()=>{for(const args of [{},{comparison:{equal:false}},{comparison:{equal:true},originalOverflow:true},{missingFonts:true}])assert.equal(R.diagnose({...args,currentOverflow:true}).autoFix,false);assert.equal(R.diagnose({comparison:{equal:true},originalOverflow:false,currentOverflow:true}).cause,'CONTENT_OVERFLOW');});
test('effective Object Style children inherit through BasedOn and direct wins',()=>{const m=model(),e=m.elements[0],style=m.styles.object.find(s=>s.id===e.objectStyleRef);m.styles.object.push({id:'ObjectStyle/parent',properties:{},children:{TextFramePreference:{TextColumnGutter:17,InsetSpacing:[1,2,3,4]}}});style.properties.BasedOn='ObjectStyle/parent';delete style.children.TextFramePreference.TextColumnGutter;delete e.textFrame.properties.TextColumnGutter;assert.equal(Match.framePreferences(m,e).effective.TextColumnGutter,17);e.textFrame.properties.TextColumnGutter=6;assert.equal(Match.framePreferences(m,e).effective.TextColumnGutter,6);});
test('image dimensions reject truncated/EXIF unknown data and read PNG/JPEG',()=>{const png=Buffer.alloc(24);Buffer.from([137,80,78,71,13,10,26,10]).copy(png);png.writeUInt32BE(13,8);png.write('IHDR',12);png.writeUInt32BE(1200,16);png.writeUInt32BE(800,20);assert.equal(Image.dimensions(png).width,1200);const jpeg=Buffer.from([255,216,255,192,0,8,8,3,32,4,176,0,255,217]);assert.equal(Image.dimensions(jpeg).height,800);assert.deepEqual(Image.dimensions(jpeg.subarray(0,8)),{});const exif=Buffer.from([255,216,255,225,0,8,69,120,105,102,0,0,...jpeg.subarray(2)]);assert.deepEqual(Image.dimensions(exif),{});});
class El{constructor(doc,tag){this.ownerDocument=doc;this.tagName=tag;this.children=[];this.style={};this.value='';this.handlers={};this.attributes={};this._text='';}appendChild(e){this.children.push(e);return e;}set textContent(s){this._text=s;this.children=[];}get textContent(){return this._text;}setAttribute(k,v){this.attributes[k]=v;}addEventListener(k,f){this.handlers[k]=f;}async click(){if(!this.disabled&&this.handlers.click)await this.handlers.click();}}
test('explicit active-set selection wins over old packaged and remembered libraries without deleting either',async()=>{
 const S=require('../src/design-library-source'),config={schema:'magazine-active-design-set/v1',libraryPath:'assets/templates/working/new.private.json',designSetId:'new',version:'v2'},library={schema:'magazine-registered-library/v1',models:{},designs:[{descriptor:{id:'new',designSet:{id:'new',version:'v2',active:true}}},{descriptor:{id:'legacy',designSet:{id:'old',version:'v1'}}}]};
 let oldReads=0;const folder={getEntry:async path=>{if(path.endsWith('active-design-set.private.json'))return {read:async()=>JSON.stringify(config)};if(path===config.libraryPath)return {read:async()=>JSON.stringify(library)};oldReads++;throw Error('old');}};
 const hash='a'.repeat(64);config.sources=[{sourceFilename:'new.idml',sourceSha256:hash}];library.models.model={metadata:{sourceFilename:'new.idml',sourceSha256:hash},pages:[{id:'p',spreadId:'s'}]};Object.assign(library.designs[0],{modelKey:'model'});Object.assign(library.designs[0].descriptor,{sourceSha256:hash,pageIds:['p'],pageSet:{id:'new:p',fingerprint:'f'},provenance:{designSetId:'new',designSetVersion:'v2',sourceFilename:'new.idml',sourceSha256:hash,sourcePageIds:['p'],sourceSpreadIds:['s'],pageSetId:'new:p',fingerprint:'f'}});
 const result=await S.loadDefault(folder,async()=>{oldReads++;throw Error('remembered');});assert.deepEqual(result.designs.map(d=>d.descriptor.id),['new']);assert.equal(oldReads,0);assert.equal(library.designs.length,2);
 config.version='missing';await assert.rejects(()=>S.loadDefault(folder,async()=>null),/선택한 최신/);
 config.libraryPath='../old.json';await assert.rejects(()=>S.loadDefault(folder,async()=>null),/설정 오류/);require('../src/active-design-set').activate(null);
});
test('long BODY with a large first letter and unique modest heading above it maps without ID exceptions',()=>{
 const m=model(),title=m.elements.find(e=>e.id==='title'),body=m.elements.find(e=>e.id==='body');title.pageBounds.p1=[10,20,30,300];body.pageBounds.p1=[50,20,650,300];
 const st=m.stories.find(s=>s.id===title.textFrame.storyRef);st.paragraphs[0].runs=[{...st.paragraphs[0].runs[0],tokens:[{type:'Content',text:'유일한 기사 제목'}],resolvedProperties:{...st.paragraphs[0].runs[0].resolvedProperties,PointSize:15}}];
 const b=m.stories.find(s=>s.id===body.textFrame.storyRef),r=b.paragraphs[0].runs[0];b.paragraphs[0].runs=[{...r,tokens:[{type:'Content',text:'첫'}],resolvedProperties:{...r.resolvedProperties,PointSize:21}},{...r,tokens:[{type:'Content',text:'본문 내용 '.repeat(60)}],resolvedProperties:{...r.resolvedProperties,PointSize:12}}];
 const d=R.autoDraft(m,'p1');assert.equal(d.roles.title.role,'title');assert.equal(d.roles.body.role,'body');assert.equal(d.mappingReview.length,0);
 const duplicate=copy(title),story=copy(st);duplicate.id='another';story.id='anotherStory';duplicate.textFrame.storyRef=story.id;m.elements.push(duplicate);m.stories.push(story);assert.ok(R.autoDraft(m,'p1').mappingReview.some(x=>x.includes('제목')));
});
function setup(adapter={}){const doc={createElement:t=>new El(doc,t)},root=new El(doc,'div'),studio={state:{busy:false},read:()=>({article})};const ui=UI.mount(root,studio,{load:async()=>R.pack([registered()]),save:async()=>true,fonts:async()=>fonts,...adapter});const nodes=()=>{const walk=e=>[e,...e.children.flatMap(walk)];return walk(root);};const click=async text=>{const e=nodes().find(e=>e.tagName==='button'&&e.textContent===text);assert.ok(e,text);await e.click();};return {root,studio,ui,nodes,click};}
test('actual registration UI flow import -> recommend -> select -> invalidate; no API key',async()=>{const x=setup();await x.click('디자인 모델 / 등록 파일 불러오기');await x.click('등록 디자인에서 추천');await x.click('분석 후보로 선택');assert.ok(x.ui.state.selected);x.ui.invalidate();assert.equal(x.ui.state.selected,null);assert.equal(UI.mount(x.root,x.studio,{}),x.ui);x.ui.destroy();assert.equal(x.root.children.length,0);});
test('stale async import cannot populate disposed UI and failed import retries',async()=>{let resolve;const x=setup({load:()=>new Promise(r=>resolve=r)});const pending=x.click('디자인 모델 / 등록 파일 불러오기');x.ui.destroy();resolve(R.pack([registered()]));await pending;assert.equal(x.ui.state.entries.length,0);let attempts=0;const y=setup({load:async()=>{if(++attempts===1)throw new Error('broken');return R.pack([registered()]);}});await y.click('디자인 모델 / 등록 파일 불러오기');await y.click('디자인 모델 / 등록 파일 불러오기');assert.equal(y.ui.state.entries.length,1);});
test('library stores shared original once across pages and invalid confirmation is atomic',()=>{const e=registered(),e2=R.register(e.original,{...e.descriptor,id:'other'}),data=R.pack([e,e2]);assert.equal(Object.keys(data.models).length,1);const loaded=R.unpack(copy(data));assert.equal(loaded.entries[0].original,loaded.entries[1].original);const d=copy(e.descriptor),before=JSON.stringify(d);assert.throws(()=>R.confirm(d,'title','image1','unknown'));assert.equal(JSON.stringify(d),before);});
test('Auto leading without a resolved percentage cannot silently use Host default',()=>{const m=model();for(const r of m.stories[0].paragraphs.flatMap(p=>p.runs)){r.resolvedProperties.Leading='Auto';delete r.resolvedProperties.AutoLeading;}assert.throws(()=>M.textProof(m,'title',{acknowledgeApproximation:true}),/AutoLeading/);});
test('raw model role screen -> explicit body confirmation -> preserve -> registration',async()=>{const x=setup({load:async()=>model()});await x.click('디자인 모델 / 등록 파일 불러오기');x.nodes().find(e=>e.tagName==='select').value='p1';await x.click('이 페이지 역할 확인');const row=x.nodes().find(e=>e.children.some(c=>c.tagName==='p'&&String(c.textContent).startsWith('body ·')));const bodySelect=row.children.find(e=>e.tagName==='select');bodySelect.value='body';bodySelect.handlers.change();await x.click('미지정 영역은 모두 원본 유지');await x.click('이 페이지 등록');assert.equal(x.ui.state.entries[0].profile.readyForMatching,true);});
test('registered UI requires proof and visual comparison before production; source changes revoke proof',async()=>{
 const x=setup(),calls=[];x.studio.createRegistered=async(e,a,mode)=>{calls.push(mode);return {errors:[],fidelity:{phase:mode==='proof'?'FIDELITY_PASSED':'CONTENT_APPLIED',proofOnly:mode==='proof'}};};
 await x.click('디자인 모델 / 등록 파일 불러오기');await x.click('등록 디자인에서 추천');await x.click('분석 후보로 선택');
 await x.click('선택한 등록 디자인으로 제작');assert.deepEqual(calls,[]);
 await x.click('검증용 문서 생성');assert.equal(x.ui.state.proofPassed,true);await x.click('선택한 등록 디자인으로 제작');assert.deepEqual(calls,['proof']);
 await x.click('원본과 비교 완료');await x.click('선택한 등록 디자인으로 제작');assert.deepEqual(calls,['proof','production']);
 x.ui.invalidate();assert.equal(x.ui.state.proofPassed,false);assert.equal(x.ui.state.visualConfirmed,false);
});
test('failed proof disables production and exposes original fidelity error without developer tools',async()=>{
 const x=setup();x.studio.createRegistered=async()=>({errors:['원본 overflow'],fidelity:{phase:'FIDELITY_FAILED',proofOnly:true}});
 await x.click('디자인 모델 / 등록 파일 불러오기');await x.click('등록 디자인에서 추천');await x.click('분석 후보로 선택');await x.click('검증용 문서 생성');
 assert.equal(x.ui.state.proofPassed,false);assert.ok(x.nodes().some(e=>String(e.textContent).includes('원본 재현 실패')));
 assert.equal(x.nodes().find(e=>e.textContent==='선택한 등록 디자인으로 제작').disabled,true);
});

test('template setup/proof controls are separate from normal recommendation and production controls',()=>{
 const x=setup(),dev=x.nodes().find(n=>n.className==='registered-developer');assert.ok(dev);const walk=n=>[n,...n.children.flatMap(walk)],inside=walk(dev).filter(n=>n.tagName==='button').map(n=>n.textContent);
 for(const text of ['디자인 모델 / 등록 파일 불러오기','등록 라이브러리 저장','검증용 문서 생성','원본과 비교 완료'])assert.ok(inside.includes(text));
 assert.ok(!inside.includes('등록 디자인에서 추천'));assert.ok(!inside.includes('선택한 등록 디자인으로 제작'));
});

test('automatic page mapping preserves source and leaves ambiguous core roles for review',()=>{
 const m=model(),before=JSON.stringify(m),d=R.autoDraft(m,'p1');assert.equal(JSON.stringify(m),before);assert.ok(d.mappingReview.length);assert.ok(d.preserveElementIds.length);assert.equal(R.register(m,d).profile.readyForMatching,false);
});
test('all 25 pages evaluated while top-three API remains compatible; saved claims cannot authorize production',()=>{
 const e=registered(),entries=Array.from({length:25},(_,i)=>R.register(e.original,{...e.descriptor,id:'p'+i}));const ranked=R.recommendations(entries,article,fonts);assert.equal(ranked.allCandidates.length+ranked.reviewRequired.length+ranked.excluded.length,25);assert.equal(ranked.candidates.length,3);
 assert.equal(R.lifecycle(e,{host:'mock',report:{errors:[],fidelity:{phase:'CONTENT_APPLIED'}}}).productionReady,false);
 assert.equal(R.lifecycle(e,{host:'adobe',report:{errors:[],fidelity:{phase:'FIDELITY_PASSED'}}}).state,'FIDELITY_VERIFIED');
 assert.equal(R.lifecycle(e,{host:'adobe',report:{errors:[],outputReady:true,fidelity:{phase:'CONTENT_APPLIED'}}}).state,'PRODUCTION_READY');
 assert.equal(R.lifecycle(e,{host:'adobe',report:{errors:['fixed mismatch'],fidelity:{phase:'CONTENT_APPLIED'}}}).productionReady,false);
 const packed=R.pack([e]);packed.designs[0].descriptor.productionReady=true;assert.equal(R.lifecycle(R.unpack(packed).entries[0]).productionReady,false);
});
test('next unverified uses one loaded library, skips unsupported, and exports full grouped reports',async()=>{
 const e=registered(),e2=R.register(e.original,{...e.descriptor,id:'second'}),blocked=R.register(e.original,{...e.descriptor,id:'blocked',capability:{fidelityReasons:['shared object']}});let saved,calls=[];
 const x=setup({hostKind:'adobe',load:async()=>R.pack([e,blocked,e2]),saveBatch:async data=>{saved=data;return true;}});
 x.studio.createRegistered=async(entry,a,mode)=>{calls.push([entry.descriptor.id,mode]);return {errors:[],issues:[],fidelity:{phase:'FIDELITY_PASSED',proofOnly:true,records:[]}};};
 await x.click('디자인 모델 / 등록 파일 불러오기');await x.click('다음 미검증 디자인 검증');await x.click('다음 미검증 디자인 검증');await x.click('다음 미검증 디자인 검증');
 assert.deepEqual(calls,[[e.descriptor.id,'proof'],['second','proof']]);await x.click('전체 페이지 검증 결과 저장');assert.equal(saved.reports.length,2);assert.equal(saved.states.length,3);
 await x.click('디자인 모델 / 등록 파일 불러오기');assert.equal(Object.keys(x.ui.state.evidence).length,0);
});
test('same mismatch is grouped across pages without duplicate original/recheck counts',()=>{
 const e=registered(),diff={path:'$.runs.1.PointSize',expected:12,actual:15},r={elementId:'title',comparison:{differences:[diff]}};
 const report={fidelity:{records:[r]},issues:[{elementId:'title',cause:'GENERATOR_MISMATCH',differences:[diff]}]};const groups=R.groupFailures({one:{entry:e,report},two:{entry:e,report}});assert.equal(groups.length,1);assert.equal(groups[0].count,2);assert.equal(groups[0].designIds.length,2);
});

test('auto mapping identifies unique title, independent body flow and image placeholders without editing source',()=>{
 const m=model(),title=m.elements.find(e=>e.id==='title'),body=m.elements.find(e=>e.id==='body');
 const ts=m.stories.find(s=>s.id===title.textFrame.storyRef),bs=m.stories.find(s=>s.id===body.textFrame.storyRef);
 ts.paragraphs[0].runs[0].tokens=[{type:'Content',text:'기사 제목'}];for(const r of ts.paragraphs.flatMap(p=>p.runs))r.resolvedProperties.PointSize=40;
 bs.paragraphs[0].runs[0].tokens=[{type:'Content',text:'본문 내용 '.repeat(40)}];
 const before=JSON.stringify(m),d=R.autoDraft(m,'p1');assert.equal(d.roles.title.role,'title');assert.equal(d.roles.body.role,'body');assert.ok(d.mappingEvidence.every(x=>x.confidence>=.85));assert.equal(JSON.stringify(m),before);
});
test('content overflow keeps verified Fidelity separate and blocks production readiness',()=>{
 const e=registered(),result=R.lifecycle(e,{host:'adobe',report:{outputReady:false,errors:['본문 overflow'],issues:[{cause:'CONTENT_OVERFLOW'}],fidelity:{phase:'CONTENT_APPLIED'}}});assert.equal(result.fidelityState,'FIDELITY_VERIFIED');assert.equal(result.productionReady,false);
 const groups=R.groupFailures({a:{report:{errors:['native getter failed']}},b:{report:{errors:['native getter failed']}}});assert.equal(groups.length,1);assert.equal(groups[0].count,2);
});

test('preservation grouping removes source object IDs but retains type and differences',()=>{
 const e=registered(),e2=copy(e);e2.original.elements.find(x=>x.id==='title').id='other-title';const report=id=>({issues:[{cause:'GENERATOR_MISMATCH',differences:[{path:'$.objects.'+id+'.object.strokeWeight',expected:0,actual:1}]}]});const groups=R.groupFailures({a:{entry:e,report:report('title')},b:{entry:e2,report:report('other-title')}});assert.equal(groups.length,1);assert.equal(groups[0].objectType,'TextFrame');assert.equal(groups[0].count,2);
});


test('recommendation UI caps cards and collapses extra candidates without dropping evaluation',async()=>{
 const e=registered(),entries=Array.from({length:8},(_,i)=>R.register(e.original,{...e.descriptor,id:'card'+i}));const x=setup({load:async()=>R.pack(entries)});
 await x.click('디자인 모델 / 등록 파일 불러오기');await x.click('등록 디자인에서 추천');
 assert.equal(x.ui.state.entries.length,8);assert.equal(x.nodes().filter(n=>n.className==='registered-card').length,3);
 const toggle=x.nodes().find(n=>n.textContent==='추가 후보 5개');assert.ok(toggle);const parent=x.nodes().find(n=>n.children.includes(toggle)),content=parent.children[0];assert.equal(content.style.display,'none');await toggle.click();assert.equal(content.style.display,'');
});

test('near subtitle separated from section heading maps safely while crowded alternatives stay review',()=>{
 const m=model(),title=m.elements.find(e=>e.id==='title'),body=m.elements.find(e=>e.id==='body');
 title.pageBounds.p1=[20,20,70,420];body.pageBounds.p1=[250,20,700,420];
 const set=(e,text,size)=>{const st=m.stories.find(s=>s.id===e.textFrame.storyRef);for(const r of st.paragraphs.flatMap(p=>p.runs)){r.tokens=[];r.resolvedProperties.PointSize=size;}st.paragraphs[0].runs[0].tokens=[{type:'Content',text}];};set(title,'기사 제목입니다',40);set(body,'본문 내용 '.repeat(40),10);
 for(const [id,b] of [['subtitle',[90,20,103,420]],['section',[180,20,195,420]]]){const e=copy(title),st=copy(m.stories.find(s=>s.id===title.textFrame.storyRef));e.id=id;e.role.confirmed=null;e.textFrame.storyRef=id+'Story';st.id=e.textFrame.storyRef;e.pageBounds.p1=b;m.elements.push(e);m.stories.push(st);set(e,'설명하는 문장입니다',13);}
 const before=JSON.stringify(m),d=R.autoDraft(m,'p1');assert.equal(d.roles.subtitle.role,'subtitle');assert.ok(d.preserveElementIds.includes('section'));assert.equal(JSON.stringify(m),before);
 m.elements.find(e=>e.id==='section').pageBounds.p1=[105,20,118,420];assert.ok(R.autoDraft(m,'p1').mappingReview.some(s=>s.includes('부제 후보')));
});


test('review and excluded designs stay bounded and excluded reasons expand on demand',async()=>{
 const e=registered(),entries=Array.from({length:8},(_,i)=>R.register(e.original,{...e.descriptor,id:'review'+i}));const x=setup({load:async()=>R.pack(entries.map(e=>R.register(e.original,{...e.descriptor,mappingReview:['ambiguous article role']}))),fonts:async()=>null});await x.click('디자인 모델 / 등록 파일 불러오기');await x.click('등록 디자인에서 추천');assert.equal(x.nodes().filter(n=>n.className==='registered-card').length,0);assert.ok(x.nodes().some(n=>n.textContent==='개발자 확인 필요 8개'));
 const y=setup({load:async()=>R.pack(entries)});y.studio.read=()=>({article:{...article,images:[{width:1200,height:800}]}});await y.click('디자인 모델 / 등록 파일 불러오기');await y.click('등록 디자인에서 추천');assert.equal(y.nodes().filter(n=>n.className==='registered-card').length,0);const toggle=y.nodes().find(n=>n.textContent==='제외된 디자인 8개'),parent=y.nodes().find(n=>n.children.includes(toggle));assert.equal(parent.children[0].style.display,'none');await toggle.click();assert.equal(parent.children[0].style.display,'');assert.equal(y.ui.state.entries.length,8);
});


test('only Adobe production with visual approval permits next manuscript without another manual proof',async()=>{
 for(const hostKind of ['adobe','mock']){const x=setup({hostKind}),calls=[];let current=article;x.studio.read=()=>({article:current});x.studio.createRegistered=async(e,a,mode)=>{calls.push(mode);return {errors:[],issues:[],outputReady:mode==='production',fidelity:{phase:mode==='proof'?'FIDELITY_PASSED':'CONTENT_APPLIED',proofOnly:mode==='proof'}};};
 await x.click('디자인 모델 / 등록 파일 불러오기');await x.click('등록 디자인에서 추천');await x.click('분석 후보로 선택');await x.click('검증용 문서 생성');await x.click('원본과 비교 완료');await x.click('선택한 등록 디자인으로 제작');
 current={...article,title:'다음 제목'};x.ui.invalidate();await x.click('등록 디자인에서 추천');await x.click('분석 후보로 선택');await x.click('선택한 등록 디자인으로 제작');assert.deepEqual(calls,hostKind==='adobe'?['proof','production','production']:['proof','production']);
 await x.click('디자인 모델 / 등록 파일 불러오기');await x.click('등록 디자인에서 추천');await x.click('분석 후보로 선택');assert.equal(x.nodes().find(n=>n.textContent==='선택한 등록 디자인으로 제작').disabled,true);
 }
});


test('role editor exposes IMAGE ordinals from available frames beyond two',async()=>{
 const m=model(),base=m.elements.find(e=>e.type==='Rectangle');for(let i=0;i<4;i++)m.elements.push({...copy(base),id:'newPhoto'+i,pageCandidates:['p1'],pageBounds:{p1:[10,20,100,100]}});
 const x=setup({load:async()=>m});await x.click('디자인 모델 / 등록 파일 불러오기');x.nodes().find(n=>n.tagName==='select').value='p1';await x.click('이 페이지 역할 확인');assert.ok(x.nodes().some(n=>n.tagName==='label'&&n.textContent==='사진 4'));const e=m.elements.find(e=>e.id==='newPhoto0');e.role={confirmed:'image4'};assert.equal(R.candidates(m,e)[0].role,'image4');
});


test('batch continues after native failure, skips unsupported, saves all pages and groups common failures',async()=>{
 const e=registered(),entries=Array.from({length:25},(_,i)=>R.register(e.original,{...e.descriptor,id:'batch'+i,...(i===3?{capability:{fidelityReasons:['shared source page']}}:i===4?{mappingReview:['핵심 역할 확인']}:{})}));let saved;const calls=[],x=setup({hostKind:'adobe',load:async()=>R.pack(entries),saveBatch:async p=>{saved=p;return true;}});
 const failure=id=>({operation:'registered.snapshot.read',object:{type:'Group',sourceId:id},property:'fillColor',adobeMessage:'mixed graphics',adobeCode:7});
 x.studio.createRegistered=async(entry,a,mode)=>{calls.push([entry.descriptor.id,mode]);if(entry.descriptor.id==='batch0'){const e=new Error('mixed graphics');e.registeredFailure=failure('g0');throw e;}if(entry.descriptor.id==='batch1'){x.ui.failed('mixed graphics');x.studio.state.fidelityJSON=JSON.stringify({hostFailure:{registeredFailure:failure('g1')},trace:['read']});return null;}return {errors:[],issues:[],outputReady:false,fidelity:{phase:'FIDELITY_PASSED',proofOnly:true}};};
 await x.click('디자인 모델 / 등록 파일 불러오기');await x.click('전체 등록 디자인 일괄 검증');await x.click('전체 페이지 검증 결과 저장');assert.equal(calls.length,24);assert.ok(calls.every(c=>c[1]==='proof'));assert.equal(saved.counts.total,25);assert.equal(saved.counts.passed,22);assert.equal(saved.counts.fidelityFailed,2);assert.equal(saved.counts.unsupported,1);assert.equal(saved.counts.roleMappingRequired,1);assert.equal(saved.groups[0].pageCount,2);assert.equal(saved.groups[0].property,'fillColor');assert.equal(saved.reports.length,25);assert.equal(saved.states.find(s=>s.designId==='batch1').failure.object.sourceId,'g1');assert.ok(saved.historicalIssues[0].status.includes('NOT_CURRENT'));assert.ok(saved.states.every(s=>!s.productionReady));
 await x.click('전체 등록 디자인 일괄 검증');assert.equal(calls.length,48); // full rerun, including previous failures/successes
});

test('batch cancellation preserves partial results; Mock success never counts as Adobe pass',async()=>{
 const e=registered(),entries=Array.from({length:3},(_,i)=>R.register(e.original,{...e.descriptor,id:'cancel'+i}));let saved;const x=setup({hostKind:'mock',load:async()=>R.pack(entries),saveBatch:async p=>{saved=p;return true;}});let calls=0;
 x.studio.createRegistered=async()=>{calls++;await x.click('일괄 검증 중지');return {errors:[],issues:[],fidelity:{phase:'FIDELITY_PASSED',proofOnly:true}};};await x.click('디자인 모델 / 등록 파일 불러오기');await x.click('전체 등록 디자인 일괄 검증');await x.click('전체 페이지 검증 결과 저장');assert.equal(calls,1);assert.equal(saved.counts.passed,0);assert.equal(saved.counts.mockPassed,1);assert.equal(saved.counts.notRun,2);assert.equal(saved.run.cancelled,true);
});

test('source revision appends without overwriting original library or inheriting proof approval',()=>{
 const {revision}=require('../tools/register-design-revision'),entry=registered(),library=R.pack([entry]),before=JSON.stringify(library),fresh=copy(entry.original);fresh.metadata.sourceSha256='f'.repeat(64);
 for(const e of fresh.elements)e.properties.Label={children:[{attributes:{Key:'MagazineStudioSourceRef',Value:e.id}}]};
 const out=revision(library,fresh,entry.descriptor.id,'p1');assert.equal(out.library.designs.length,2);assert.equal(JSON.stringify(library),before);assert.notEqual(out.designId,entry.descriptor.id);assert.equal(R.unpack(out.library).entries[1].fidelity.productionReady,false);
 const bad=copy(fresh);delete bad.elements.find(e=>e.id==='body').properties.Label;assert.throws(()=>revision(library,bad,entry.descriptor.id,'p1'),/Missing role/);
 const duplicate=copy(fresh);duplicate.elements.find(e=>e.id==='body').properties.Label=duplicate.elements.find(e=>e.id==='title').properties.Label;assert.throws(()=>revision(library,duplicate,entry.descriptor.id,'p1'),/Duplicate/);
});

test('marker-aware library migration requires exact source hashes and preserves roles with fresh IDs',()=>{
 const {upgrade}=require('../tools/reextract-library'),entry=registered(),library=R.pack([entry]),before=JSON.stringify(library);
 const result=upgrade(library,[entry.original]);assert.equal(JSON.stringify(library),before);assert.deepEqual(result.designs[0].descriptor.roles,entry.descriptor.roles);assert.notEqual(result.designs[0].descriptor.id,entry.descriptor.id);assert.equal(R.unpack(result).entries[0].fidelity.productionReady,false);
 assert.throws(()=>upgrade(library,[]),/Missing exact/);const bad=copy(entry.original);delete bad.metadata.markerPreservationVersion;assert.throws(()=>upgrade(library,[bad]),/REEXTRACTION/);
});

test('direct user action runs production without manual proof and retains failure evidence',async()=>{
 const x=setup({hostKind:'adobe',loadDefault:async()=>R.pack([registered()])}),calls=[];
 x.studio.createRegistered=async(e,a,mode)=>{calls.push(mode);return {errors:['원본 차이'],issues:[{cause:'GENERATOR_MISMATCH'}],fidelity:{phase:'FIDELITY_FAILED',proofOnly:false,records:[]}};};
 await x.ui.articleLoaded();assert.equal(x.ui.state.entries.length,1);assert.equal(x.nodes().find(n=>n.className==='registered-developer').style.display,'none');
 await x.click('이 디자인으로 제작');assert.deepEqual(calls,['production']);assert.equal(x.ui.state.report.fidelity.phase,'FIDELITY_FAILED');assert.equal(Object.keys(x.ui.state.readyTemplates).length,0);
});
test('direct user action blocks unsupported capability and ignores late default import',async()=>{
 const e=registered(),blocked=R.register(e.original,{...e.descriptor,capability:{productionReasons:['ambiguous style'],fidelityReasons:[]}}),x=setup({loadDefault:async()=>R.pack([blocked])});let calls=0;x.studio.createRegistered=async()=>{calls++;};await x.ui.articleLoaded();assert.equal(x.nodes().filter(n=>n.tagName==='button'&&n.textContent==='이 디자인으로 제작').length,0);assert.equal(calls,0);
 let resolve;const y=setup({loadDefault:()=>new Promise(r=>resolve=r)});await y.click('디자인 모델 / 등록 파일 불러오기');const before=y.ui.state.entries[0];resolve(R.pack([blocked]));await y.ui.ready;assert.equal(y.ui.state.entries[0],before);
});

test('COLOR_SLOT registration rejects photos/text/duplicates and validates RGB/CMYK without defaults',()=>{
 const C=R.Colors,e=registered(),m=copy(e.original),d=copy(e.descriptor),shape=m.elements.find(e=>e.type==='Rectangle');shape.properties.ContentType='Unassigned';shape.properties.FillColor=m.colors.find(c=>c.type==='Color').id;shape.image=[];shape.pageCandidates=d.pageIds.slice();d.preserveElementIds.push(shape.id);d.colorSlots=[{name:'BACKGROUND',confirmed:true,elementIds:[shape.id]}];const entry=R.register(m,d);assert.deepEqual(C.plan(entry),[]);assert.equal(C.plan(entry,{BACKGROUND:{space:'CMYK',values:[0,10,20,30]}}).length,1);assert.throws(()=>C.plan(entry,{OTHER:{space:'RGB',values:[1,2,3]}}),/미등록/);assert.throws(()=>C.plan(entry,{BACKGROUND:{space:'RGB',values:[999,0,0]}}),/컬러/);
 for(const mode of ['photo','graphic','duplicate','text']){const mm=copy(m),dd=copy(d),ss=mm.elements.find(e=>e.id===shape.id);if(mode==='photo')ss.image=[{}];if(mode==='graphic')ss.properties.ContentType='GraphicType';if(mode==='duplicate')dd.colorSlots[0].elementIds.push(shape.id);if(mode==='text')ss.textFrame={};assert.throws(()=>C.validate(mm,dd),/COLOR_SLOT/);}
});

test('new source append preserves prior library, transfers only stable role references and never approvals',()=>{
 const A=require('../tools/register-source-library'),e=registered(),old=R.pack([e]),m=copy(e.original);m.metadata.sourceSha256='b'.repeat(64);const before=JSON.stringify(old),result=A.append(old,m);assert.equal(JSON.stringify(old),before);assert.equal(result.library.designs.length,old.designs.length+m.pages.filter(p=>p.kind==='Spread').length);assert.equal(result.rows[0].revisionOf,e.descriptor.id);assert.deepEqual(result.rows[0].roles,e.descriptor.roles);assert.equal(R.unpack(result.library).entries.at(-1).fidelity.productionReady,false);
 const changed=copy(m);changed.elements.find(x=>x.id==='title').textFrame.storyRef='bs';const uncertain=A.append(old,changed);assert.equal(uncertain.rows[0].revisionOf,null);assert.ok(uncertain.rows[0].proposedRoles);
});

test('recommendation color input is optional and passes only confirmed theme values to production',async()=>{
 const e=registered(),m=copy(e.original),d=copy(e.descriptor),shape=m.elements.find(e=>e.type==='Rectangle');shape.properties={ContentType:'Unassigned',FillColor:m.colors.find(c=>c.type==='Color').id};shape.image=[];shape.pageCandidates=d.pageIds.slice();shape.pageBounds={[d.pageIds[0]]:[0,0,40,40]};d.preserveElementIds.push(shape.id);d.colorSlots=[{name:'ACCENT',confirmed:true,elementIds:[shape.id]}];const entry=R.register(m,d),x=setup({loadDefault:async()=>R.pack([entry])});let theme;
 x.studio.createRegistered=async(e,a,mode,colors)=>{theme=colors;assert.equal(a,article);return {errors:[],issues:[],fidelity:{phase:'CONTENT_APPLIED',records:[]}};};await x.ui.articleLoaded();await x.click('이 디자인으로 제작');assert.deepEqual(theme,{});
 x.nodes().find(n=>n.tagName==='input').value='#1256ab';await x.click('이 디자인으로 제작');assert.deepEqual(theme,{ACCENT:{space:'RGB',values:[18,86,171]}});
});


test('direct card retains engine failure after null, rejected report, and thrown exception',async()=>{
 const e=registered(),x=setup({loadDefault:async()=>R.pack([e])});let called;
 x.studio.createRegistered=async(entry,a,mode)=>{called=[entry.descriptor.id,mode];x.ui.failed('EXTERNAL_ASSET_UNAVAILABLE: source.png');return null;};
 await x.ui.articleLoaded();await x.click('이 디자인으로 제작');assert.deepEqual(called,[e.descriptor.id,'production']);assert.match(x.ui.state.selected.feedback.textContent,/EXTERNAL_ASSET_UNAVAILABLE: source.png/);
 x.studio.createRegistered=async()=>({errors:['SOURCE_OVERFLOW story-a'],fidelity:{phase:'FIDELITY_FAILED'}});await x.click('이 디자인으로 제작');assert.match(x.ui.state.selected.feedback.textContent,/SOURCE_OVERFLOW story-a/);
 x.studio.createRegistered=async()=>{throw new Error('registered.package.open: Host rejected');};await x.click('이 디자인으로 제작');assert.match(x.ui.state.selected.feedback.textContent,/registered.package.open: Host rejected/);
});
test('unsupported and busy cards explain blocks without invoking production',async()=>{
 const e=registered(),blocked=R.register(e.original,{...e.descriptor,capability:{productionReasons:['mixed typography'],fidelityReasons:[]}}),x=setup({loadDefault:async()=>R.pack([blocked])});await x.ui.articleLoaded();assert.ok(x.nodes().some(n=>String(n.textContent).includes('제작 차단: mixed typography')));
 const y=setup({loadDefault:async()=>R.pack([e])});await y.ui.articleLoaded();y.studio.state.busy=true;let calls=0;y.studio.createRegistered=async()=>{calls++;};await y.click('이 디자인으로 제작');assert.equal(calls,0);assert.ok(y.nodes().some(n=>String(n.textContent).includes('다른 작업이 진행 중')));
});


test('normal recommendations exclude production unsupported and preserve all evaluated records',()=>{
 const e=registered(),blocked=R.register(e.original,{...e.descriptor,id:'blocked',capability:{productionReasons:['real style difference'],fidelityReasons:[]}});const result=R.recommendations([e,blocked],article,fonts);assert.equal(result.allCandidates.length,1);assert.equal(result.allCandidates[0].id,e.descriptor.id);assert.ok(result.reviewRequired.some(r=>r.id==='blocked'&&r.review.some(x=>x.code==='PRODUCTION_UNSUPPORTED')));
 const photos={...article,images:[{widthPx:1200,heightPx:800},{widthPx:1200,heightPx:800},{widthPx:1200,heightPx:800},{widthPx:1200,heightPx:800}]};assert.equal(R.recommendations([e],photos,fonts).allCandidates.length,0);
});
test('objective partial registration preserves existing source, colors and unresolved intent',()=>{
 const e=registered(),d=copy(e.descriptor);d.mappingReview=['review'];d.colorSlots=[];const before=JSON.stringify(d),next=R.resolveClearRoles(e.original,d);assert.equal(JSON.stringify(d),before);assert.deepEqual(next.colorSlots,[]);for(const [id,role] of Object.entries(d.roles))assert.deepEqual(next.roles[id],role);assert.ok(next.mappingReview.length);assert.deepEqual(R.resolveClearRoles(e.original,next),next);
});


test('library analysis yields progress once per batch, stays cached for later articles and surfaces failures',async()=>{
 const e=registered(),entries=Array.from({length:9},(_,i)=>R.register(e.original,{...e.descriptor,id:'entry'+i}));let loads=0,checks=0;const x=setup({loadDefault:async()=>{loads++;return R.pack(entries);},capability:()=>{checks++;return {fidelityReasons:[],productionReasons:[]};}}),events=[];x.studio.progress=async message=>events.push(message);await x.ui.ready;await x.ui.articleLoaded();await x.ui.articleLoaded();assert.equal(loads,1);assert.equal(checks,9);assert.ok(events.some(x=>x.includes('4/9')));assert.ok(events.some(x=>x.includes('추천 조건 계산 완료')));
 const y=setup({loadDefault:async()=>{throw new Error('bad library');}});await assert.rejects(()=>y.ui.articleLoaded(),/bad library/);
});


test('capacity warnings reach direct production with unchanged DOCX payload and no manual proof',async()=>{
 const e=registered(),x=setup({loadDefault:async()=>R.pack([e])}),a={...article,body:'가'.repeat(10000)};x.studio.read=()=>({article:a});let received;
 x.studio.createRegistered=async(entry,payload,mode)=>{received={entry,payload,mode};return {errors:['콘텐츠 overflow'],fidelity:{phase:'CONTENT_APPLIED'}};};
 await x.ui.articleLoaded();const row=R.recommendations([e],a,fonts).allCandidates[0];assert.equal(row.decision,'WARN');assert.equal(row.productionReady,false);
 await x.click('이 디자인으로 제작');assert.equal(received.payload,a);assert.equal(received.mode,'production');assert.equal(received.entry.id,e.id);assert.ok(x.nodes().some(n=>String(n.textContent).includes('콘텐츠 overflow')));
});

test('unknown font inventory warns but does not grant Adobe verification or bypass known missing fonts',()=>{
 const e=registered(),result=R.recommendations([e],article,null);assert.equal(result.allCandidates.length,1);assert.ok(result.allCandidates[0].soft.some(d=>d.code==='FONT_STATUS_UNKNOWN'));assert.equal(result.allCandidates[0].productionReady,false);assert.equal(R.recommendations([e],article,[]).allCandidates.length,0);
});

test('3-option control snapshots all ranked non-BLOCK recommendations and preserves the single button',async()=>{
 const original=registered(),entries=Array.from({length:4},(_,i)=>R.register(original.original,{...original.descriptor,id:'option-'+i}));
 const x=setup({load:async()=>R.pack(entries)}),calls=[];x.studio.createRegisteredOptions=async(es,a)=>{calls.push({ids:es.map(e=>e.descriptor.id),a});return {options:es.slice(0,3).map((e,i)=>({optionId:'OPTION_'+(i+1),status:'PASS',stage:'combined-check',errors:[]})),outputReady:true};};
 await x.click('디자인 모델 / 등록 파일 불러오기');await x.click('등록 디자인에서 추천');assert.equal(x.nodes().filter(e=>e.textContent==='이 디자인으로 제작').length,3);
 await x.click('추천 3안으로 제작');assert.equal(calls.length,1);assert.equal(calls[0].ids.length,4);assert.equal(calls[0].a.title,article.title);
});
test('a job-title/name byline is preserved instead of becoming a subtitle because of its position',()=>{
 const m=model(),title=m.elements.find(e=>e.id==='title'),body=m.elements.find(e=>e.id==='body');title.pageBounds.p1=[20,20,70,420];body.pageBounds.p1=[250,20,700,420];
 const set=(e,text,size)=>{const s=m.stories.find(s=>s.id===e.textFrame.storyRef);s.paragraphs[0].runs=[{...s.paragraphs[0].runs[0],tokens:[{type:'Content',text}],resolvedProperties:{...s.paragraphs[0].runs[0].resolvedProperties,PointSize:size}}];};set(title,'기사 제목입니다',40);set(body,'본문 내용 '.repeat(40),12);
 const e=copy(title),s=copy(m.stories.find(s=>s.id===title.textFrame.storyRef));e.id='author';e.role.confirmed=null;s.id='authorStory';e.textFrame.storyRef=s.id;e.pageBounds.p1=[90,20,103,420];m.elements.push(e);m.stories.push(s);set(e,'의료기관 대표원장 김가나',15);
 const d=R.autoDraft(m,'p1');assert.ok(d.preserveElementIds.includes('author'));assert.ok(!Object.values(d.roles).some(r=>r.role==='subtitle'));assert.ok(d.mappingEvidence.some(r=>r.elementId==='author'&&r.role==='keep'));
});
test('batch export rejects an empty manual inventory rather than claiming Adobe validation',async()=>{
 let saves=0;const x=setup({hostKind:'adobe',saveBatch:async()=>{saves++;return true;}});
 await x.click('디자인 모델 / 등록 파일 불러오기');await x.click('전체 페이지 검증 결과 저장');
 assert.equal(saves,0);assert.ok(x.nodes().some(n=>String(n.textContent).includes('저장할 검증 실행 결과가 없습니다')));
});
test('loaded page-set library fixes batch scope without deleting legacy entries or skipping failures',async()=>{
 const base=registered(),legacy=Array.from({length:55},(_,i)=>R.register(base.original,{...base.descriptor,id:'legacy'+i})),latest=Array.from({length:22},(_,i)=>R.register(base.original,{...base.descriptor,id:'latest'+i,...(i===0?{capability:{fidelityReasons:['unsupported source']}}:{})}));
 let saved,calls=[];const x=setup({hostKind:'adobe',load:async()=>R.pack(latest),saveBatch:async p=>{saved=p;return true;}});x.ui.state.entries=legacy;
 x.studio.createRegistered=async e=>{calls.push(e.id);return {errors:e.id==='latest1'?['source overset']:[],issues:[],fidelity:{phase:e.id==='latest1'?'FIDELITY_FAILED':'FIDELITY_PASSED',proofOnly:true}};};
 await x.click('디자인 모델 / 등록 파일 불러오기');assert.equal(x.ui.state.entries.length,77);
 await x.click('전체 등록 디자인 일괄 검증');await x.click('전체 페이지 검증 결과 저장');
 assert.equal(saved.run.mode,'proof');assert.equal(saved.counts.total,22);assert.equal(saved.reports.length,22);assert.equal(saved.counts.passed,20);assert.equal(saved.counts.fidelityFailed,1);assert.equal(saved.counts.unsupported,1);assert.equal(saved.counts.notRun,0);assert.equal(calls.length,21);assert.ok(calls.every(id=>id.startsWith('latest')));
 await x.click('디자인 모델 / 등록 파일 불러오기');saved=null;await x.click('전체 페이지 검증 결과 저장');assert.equal(saved,null);
});
test('3-option freeze retains descriptor/article snapshot and excludes no safety checks',()=>{
 const Options=require('../src/registered-options'),e=registered(),entries=Array.from({length:4},(_,i)=>R.register(e.original,{...e.descriptor,id:'freeze-'+i}));const manuscript=copy(article),j=Options.freeze(entries,manuscript);
 assert.equal(j.selected.length,4);manuscript.title='changed';assert.equal(j.article.title,article.title);assert.notEqual(j.selected[0].descriptor,entries[0].descriptor);
 const blocked=R.register(e.original,{...e.descriptor,capability:{productionReasons:['unsafe mixed style']}});assert.throws(()=>Options.freeze([blocked],article),/PRODUCTION_UNSUPPORTED/);assert.throws(()=>Options.freeze([],article));
 const aliases=[0,1].map(i=>({...e,descriptor:{...e.descriptor,id:'alias'+i,pageSet:{id:'one-layout'}}}));assert.equal(Options.freeze(aliases,article).selected.length,1);
});

test('batch result status never reports completion for zero/partial successes',async()=>{
 for(const passed of [0,1,2,3]){
  const e=registered(),entries=Array.from({length:3},(_,i)=>R.register(e.original,{...e.descriptor,id:'result-'+i})),x=setup({load:async()=>R.pack(entries)});
  x.studio.createRegisteredOptions=async()=>({options:entries.map((e,i)=>({optionId:'OPTION_'+(i+1),status:i<passed?'PASS':'BLOCK',stage:'production',errors:i<passed?[]:['fitting failed']})),outputReady:passed===3});
  await x.click('디자인 모델 / 등록 파일 불러오기');await x.click('등록 디자인에서 추천');await x.click('추천 3안으로 제작');
  const expected=passed===3?'추천 3안 제작 완료 (3/3)':passed?'추천 3안 제작 미완료 ('+passed+'/3)':'추천 3안 제작 실패 (0/3)';
  assert.ok(x.nodes().some(n=>n.textContent===expected));assert.ok(!x.nodes().some(n=>n.textContent==='추천 3안으로 제작 완료'));
 }
});

function galleryEntry(id,blocked=false){const original=registered();const e={original:original.original,descriptor:JSON.parse(JSON.stringify(original.descriptor))};e.descriptor.id=id;e.descriptor.provenance={designSetId:'fixture',designSetVersion:'v1',sourceFilename:'fixture.idml',sourceSha256:e.original.metadata.sourceSha256,sourcePageIds:e.descriptor.pageIds,pageSetId:id,fingerprint:'fixture'};if(blocked)e.descriptor.capability={productionReasons:['역할 확인 필요'],fidelityReasons:[]};return R.register(e.original,e.descriptor);}
function gallerySetup(entries){return setup({gallery:true,loadDefault:async()=>R.pack(entries),thumbnails:async es=>Object.fromEntries(es.map(e=>[e.descriptor.id,{images:[{url:'file:fixture-'+e.descriptor.id+'.jpg'}]}]))});}
test('gallery displays blocked and safe designs without recommendation and produces only the chosen entry',async()=>{
 const first=galleryEntry('first'),chosen=galleryEntry('chosen'),blocked=galleryEntry('review',true),x=gallerySetup([first,chosen,blocked]),calls=[];
 x.studio.createRegistered=async(e,a,mode)=>{calls.push({id:e.descriptor.id,article:a,mode});return {errors:[],warnings:[],outputReady:true,fidelity:{phase:'CONTENT_APPLIED',designId:e.descriptor.id,provenance:e.descriptor.provenance}};};
 await x.ui.articleLoaded();assert.equal(x.nodes().filter(n=>n.className==='gallery-card').length,3);assert.equal(x.nodes().filter(n=>n.tagName==='img').length,3);assert.equal(x.nodes().some(n=>n.textContent==='추천 3안으로 제작'),false);
 await x.nodes().find(n=>n.attributes['aria-label']==='디자인 02 선택').click();await x.click('선택한 디자인으로 제작');assert.deepEqual(calls,[{id:'chosen',article,mode:'production'}]);assert.equal(x.ui.state.selected.entry.descriptor.id,'chosen');
 await x.nodes().find(n=>n.attributes['aria-label']==='디자인 03 선택').click();assert.equal(x.nodes().find(n=>n.textContent==='선택한 디자인으로 제작').disabled,true);assert.ok(x.nodes().some(n=>n.textContent.includes('역할 확인 필요')));
});
test('gallery Production failure does not choose another design or call sequential Production',async()=>{
 const x=gallerySetup([galleryEntry('one'),galleryEntry('two')]),calls=[];x.studio.createRegistered=async e=>{calls.push(e.descriptor.id);return {errors:['본문 텍스트가 넘칩니다.'],warnings:[],outputReady:false,fidelity:{phase:'CONTENT_APPLIED',designId:e.descriptor.id,provenance:e.descriptor.provenance}};};x.studio.createRegisteredOptions=()=>{throw Error('Must not call');};await x.ui.articleLoaded();await x.nodes().find(n=>n.attributes['aria-label']==='디자인 01 선택').click();await x.click('선택한 디자인으로 제작');assert.deepEqual(calls,['one']);assert.equal(x.ui.state.selected.entry.descriptor.id,'one');assert.ok(x.nodes().some(n=>n.textContent.includes('본문 텍스트가 넘칩니다.')));
});
test('gallery rejects a result from another design and invalidates output instead of reporting success',async()=>{
 const x=gallerySetup([galleryEntry('selected')]);let invalidations=0;x.studio.invalidateRegistered=()=>invalidations++;x.studio.createRegistered=async e=>({errors:[],warnings:[],outputReady:true,fidelity:{phase:'CONTENT_APPLIED',designId:'other',provenance:e.descriptor.provenance}});await x.ui.articleLoaded();await x.nodes().find(n=>n.attributes['aria-label']==='디자인 01 선택').click();await x.click('선택한 디자인으로 제작');assert.equal(invalidations,2);assert.ok(x.nodes().some(n=>n.textContent.includes('GALLERY_RESULT_SOURCE_MISMATCH')));
});
test('gallery manual proof button stays in developer controls and unmet gate is not reported as busy',async()=>{
 const x=gallerySetup([galleryEntry('selected')]);await x.ui.articleLoaded();await x.nodes().find(n=>n.attributes['aria-label']==='디자인 01 선택').click();
 const manual=x.nodes().find(n=>n.textContent==='선택한 등록 디자인으로 제작'),developer=x.nodes().find(n=>n.className==='registered-developer');
 const walk=e=>[e,...e.children.flatMap(walk)];assert.ok(walk(developer).includes(manual));assert.equal(manual.registrationDisabled,true);assert.equal(x.studio.state.busy,false);assert.equal(x.ui.state.busy,false);await manual.handlers.click();assert.ok(x.nodes().some(n=>n.textContent.includes('개발자 검증용 제작')));assert.equal(x.nodes().some(n=>n.textContent.includes('다른 작업이 진행 중')),false);
 const produce=x.nodes().find(n=>n.textContent==='선택한 디자인으로 제작');assert.equal(produce.disabled,false);
});

test('gallery entry-derived guard explains structural failure and ignores a stale cached canProduce flag',async()=>{
 const x=gallerySetup([galleryEntry('safe'),galleryEntry('blocked',true)]);let calls=0;x.studio.createRegistered=async e=>{calls++;return {errors:[],warnings:[],outputReady:true,fidelity:{phase:'CONTENT_APPLIED',designId:e.descriptor.id,provenance:e.descriptor.provenance}};};
 await x.ui.articleLoaded();await x.nodes().find(n=>n.attributes['aria-label']==='디자인 01 선택').click();x.ui.state.galleryCanProduce=false;await x.click('선택한 디자인으로 제작');assert.equal(calls,1);assert.equal(x.ui.state.galleryGate.allowed,true);
 await x.nodes().find(n=>n.attributes['aria-label']==='디자인 02 선택').click();const b=x.nodes().find(n=>n.textContent==='선택한 디자인으로 제작');await b.handlers.click();assert.equal(calls,1);assert.equal(x.ui.state.galleryGate.guards.selectedEntry,true);assert.equal(x.ui.state.galleryGate.guards.galleryIdentity,true);assert.equal(x.ui.state.galleryGate.guards.productionAssessment,false);assert.match(b.blockReason,/역할 확인 필요/);assert.match(b.blockReason,/"productionAssessment":false/);
});
test('gallery guard rejects a changed article or selected source identity before Production',async()=>{
 const x=gallerySetup([galleryEntry('safe')]);await x.ui.articleLoaded();await x.nodes().find(n=>n.attributes['aria-label']==='디자인 01 선택').click();const G=require('../src/registered-gallery');assert.equal(G.gate(x.ui.state.selected,article).allowed,true);assert.equal(G.gate(x.ui.state.selected,{...article,body:'changed'}).guards.articleUnchanged,false);assert.equal(G.gate({...x.ui.state.selected,galleryIdentity:'other'},article).guards.sourceIdentity,false);
});
