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
test('role evidence retains priority; geometry never auto-confirms',()=>{const m=model(),e=m.elements.find(e=>e.id==='body');e.properties.Name='BODY';const c=R.candidates(m,e);assert.equal(c[0].role,'title');assert.ok(c.some(c=>c.role==='body'));assert.equal(c[0].confirmed,false);assert.equal(R.candidates(m,m.elements[0])[0].confirmed,true);});
test('role confirmation, preserve, capability, original immutability and gate',()=>{const e=registered();assert.equal(e.profile.readyForMatching,true);assert.equal(e.fidelity.state,'READY_FOR_FIDELITY_TEST');assert.equal(e.fidelity.productionReady,false);assert.ok(Object.isFrozen(e.original));});
test('saved file cannot self-authorize fidelity; corrupt entries isolated',()=>{const e=registered(),p=copy(R.pack([e]));p.designs[0].descriptor.productionReady=true;p.designs.push({});const out=R.unpack(p);assert.equal(out.entries.length,1);assert.equal(out.errors.length,1);assert.equal(out.entries[0].fidelity.productionReady,false);});
test('recommendations capped at three and require explicit selection; content leaves typography intact',()=>{const e=registered(),entries=Array.from({length:5},(_,i)=>R.register(e.original,{...e.descriptor,id:'d'+i}));const before=JSON.stringify(entries[0].original);const ranked=R.recommendations(entries,article,fonts);assert.equal(ranked.candidates.length,3);assert.equal(ranked.selectedId,null);const selected=R.selection(entries[0],article,fonts);assert.equal(selected.overlay.content.find(c=>c.role==='title').text,'제목');assert.equal(JSON.stringify(entries[0].original),before);assert.equal(selected.overlay.productionReady,false);});
test('fidelity, missing fonts, source overflow and content overflow never conflated',()=>{for(const args of [{},{comparison:{equal:false}},{comparison:{equal:true},originalOverflow:true},{missingFonts:true}])assert.equal(R.diagnose({...args,currentOverflow:true}).autoFix,false);assert.equal(R.diagnose({comparison:{equal:true},originalOverflow:false,currentOverflow:true}).cause,'CONTENT_OVERFLOW');});
test('effective Object Style children inherit through BasedOn and direct wins',()=>{const m=model(),e=m.elements[0],style=m.styles.object.find(s=>s.id===e.objectStyleRef);m.styles.object.push({id:'ObjectStyle/parent',properties:{},children:{TextFramePreference:{TextColumnGutter:17,InsetSpacing:[1,2,3,4]}}});style.properties.BasedOn='ObjectStyle/parent';delete style.children.TextFramePreference.TextColumnGutter;delete e.textFrame.properties.TextColumnGutter;assert.equal(Match.framePreferences(m,e).effective.TextColumnGutter,17);e.textFrame.properties.TextColumnGutter=6;assert.equal(Match.framePreferences(m,e).effective.TextColumnGutter,6);});
test('image dimensions reject truncated/EXIF unknown data and read PNG/JPEG',()=>{const png=Buffer.alloc(24);Buffer.from([137,80,78,71,13,10,26,10]).copy(png);png.writeUInt32BE(13,8);png.write('IHDR',12);png.writeUInt32BE(1200,16);png.writeUInt32BE(800,20);assert.equal(Image.dimensions(png).width,1200);const jpeg=Buffer.from([255,216,255,192,0,8,8,3,32,4,176,0,255,217]);assert.equal(Image.dimensions(jpeg).height,800);assert.deepEqual(Image.dimensions(jpeg.subarray(0,8)),{});const exif=Buffer.from([255,216,255,225,0,8,69,120,105,102,0,0,...jpeg.subarray(2)]);assert.deepEqual(Image.dimensions(exif),{});});
class El{constructor(doc,tag){this.ownerDocument=doc;this.tagName=tag;this.children=[];this.style={};this.value='';this.handlers={};this._text='';}appendChild(e){this.children.push(e);return e;}set textContent(s){this._text=s;this.children=[];}get textContent(){return this._text;}setAttribute(){}addEventListener(k,f){this.handlers[k]=f;}async click(){if(!this.disabled&&this.handlers.click)await this.handlers.click();}}
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
 const e=registered(),entries=Array.from({length:8},(_,i)=>R.register(e.original,{...e.descriptor,id:'review'+i}));const x=setup({load:async()=>R.pack(entries),fonts:async()=>null});await x.click('디자인 모델 / 등록 파일 불러오기');await x.click('등록 디자인에서 추천');assert.equal(x.nodes().filter(n=>n.className==='registered-card').length,3);assert.ok(x.nodes().some(n=>n.textContent==='추가 후보 5개'));
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
