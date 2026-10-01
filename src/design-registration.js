(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./design-model'),require('./design-matching'),require('./design-color-slots'));else root.MagazineRegistration=factory(root.MagazineDesignModel,root.MagazineMatching,root.MagazineColorSlots);})(typeof window!=='undefined'?window:this,function(Model,Match,Colors){
'use strict';
const ROLES=['title','subtitle','body','image1','image2','caption','header','footer','pageNumber','keep'];
const copy=x=>JSON.parse(JSON.stringify(x));
function frames(model,pageId){return model.elements.filter(e=>e.pageCandidates.length===1&&e.pageCandidates[0]===pageId);}
function candidates(model,e){
 const explicit=e.role&&e.role.confirmed;
 if(ROLES.includes(explicit)||/^image[1-9]\d*$/.test(explicit||''))return [{role:explicit,confidence:1,reason:'원본의 명시적 역할',confirmed:true}];
 if(['GraphicLine','Group'].includes(e.type))return [{role:'keep',confidence:1,reason:'선/그룹 컨테이너 유지 (자식은 별도 확인)',confirmed:true}];
 const story=e.textFrame&&model.stories.find(s=>s.id===e.textFrame.storyRef),paras=story?story.paragraphs:[],runs=paras.flatMap(p=>p.runs);
 const text=runs.flatMap(r=>r.tokens.filter(t=>t.type==='Content').map(t=>t.text)).join('');
 const layer=(model.layers||[]).find(l=>l.id===e.layerRef);
 const sources=[['문단/문자 스타일',paras.map(p=>p.styleRef).concat(runs.map(r=>r.styleRef)).join(' ')],['객체 스타일',e.objectStyleRef||''],['프레임 이름',e.properties.Name||''],['레이어',layer&&layer.properties.Name||'']];
 const patterns=[['subtitle',/subtitle|부제/i],['title',/(?:^|[\s/_-])title(?:$|[\s/_-])|제목/i],['body',/body|본문/i],['caption',/caption|캡션/i],['pageNumber',/page.?number|페이지.?번호/i],['header',/header|머리말/i],['footer',/footer|꼬리말/i]];
 const out=[];
 for(const [i,[source,value]] of sources.entries())for(const [role,rx] of patterns)if(rx.test(value))out.push({role,confidence:.8-i*.1,reason:source+' 이름 일치',confirmed:false});
 if(e.textFrame){
  if(/^\s*\d{1,4}\s*$/.test(text))out.push({role:'pageNumber',confidence:.65,reason:'짧은 숫자 텍스트 — 페이지 번호 여부 확인',confirmed:false});
  if(text.length>250)out.push({role:'body',confidence:.55,reason:'긴 연속 텍스트',confirmed:false});
  const b=e.pageBounds[e.pageCandidates[0]],page=model.pages.find(p=>p.id===e.pageCandidates[0]);
  if(b&&page&&b[0]<page.height*.4&&runs.some(r=>r.resolvedProperties.PointSize>=24))out.push({role:'title',confidence:.5,reason:'상단의 큰 글자 (장식일 수도 있음)',confirmed:false});
 }
 if(e.image&&e.image.length)out.push({role:'image1',confidence:.4,reason:'배치 이미지 — 기사 사진/배경과 순서 확인',confirmed:false});
 if(!out.length)out.push({role:'keep',confidence:.2,reason:'역할 불명확 — 유지 여부 확인',confirmed:false});
 return out;
}
function draft(model,pageId,name){
 const errors=Model.validate(model);if(errors.length)throw new Error(errors.join('; '));
 if(!model.pages.some(p=>p.id===pageId&&p.kind==='Spread'))throw new Error('일반 페이지를 선택해주세요.');
 const d={id:model.metadata.sourceSha256.slice(0,16)+'-'+pageId,name:name||pageId,sourceSha256:model.metadata.sourceSha256,pageIds:[pageId],roles:{},images:{},preserveElementIds:[]};
 for(const e of frames(model,pageId)){const c=candidates(model,e)[0];if(c.confirmed&&!/^image/.test(c.role))confirm(d,e.id,c.role);else confirm(d,e.id,'keep');}
 return d;
}
function confirm(d,id,role,requirement){
 if(!ROLES.includes(role)&&!/^image[1-9]\d*$/.test(role))throw new Error('지원하지 않는 역할');
 if(/^image/.test(role)&&!['required','optional'].includes(requirement))throw new Error('사진 필수/선택 확인 필요');
 delete d.roles[id];delete d.images[id];d.preserveElementIds=d.preserveElementIds.filter(x=>x!==id);
 if(role==='keep')d.preserveElementIds.push(id);
 else {d.roles[id]={role,confirmed:true};if(/^image/.test(role)){if(!['required','optional'].includes(requirement))throw new Error('사진 필수/선택 확인 필요');d.images[id]=requirement;}}
 return d;
}
function autoDraft(model,pageId,name){
 const d=draft(model,pageId,name),page=model.pages.find(p=>p.id===pageId),all=frames(model,pageId),review=[],evidence=[];
 const text=all.filter(e=>e.textFrame).map(e=>{const story=model.stories.find(s=>s.id===e.textFrame.storyRef),runs=story?story.paragraphs.flatMap(p=>p.runs):[],content=runs.flatMap(r=>r.tokens.filter(t=>t.type==='Content').map(t=>t.text)).join(''),sizes=runs.map(r=>r.resolvedProperties.PointSize).filter(Number.isFinite);return {e,story,content,b:e.pageBounds[pageId],size:Math.max(0,...sizes)};});
 const assign=(t,role,confidence,reason)=>{confirm(d,t.e?t.e.id:t.id,role,/^image/.test(role)?'required':undefined);evidence.push({elementId:t.e?t.e.id:t.id,role,confidence,reason});};
 const titles=text.filter(t=>t.content.trim().length>=4&&t.content.length<=120&&t.size>=20&&!/^(대표|일반)?이미지$/.test(t.content.trim())).sort((a,b)=>b.size-a.size);
 if(titles.length&&(!titles[1]||titles[0].size>=titles[1].size*1.2))assign(titles[0],'title',.9,'유일한 큰 제목 프레임');else review.push('제목 후보가 없거나 여러 개: 핵심 역할 확인');
 const title=titles[0],bodies=text.filter(t=>t!==title&&t.content.length>=100&&t.size>=9&&t.size<=18&&t.b[2]-t.b[0]>=20&&!/캡션.*입력|문구.*입력/.test(t.content)&&t.b[0]<page.height*.9).sort((a,b)=>Math.abs(a.b[0]-b.b[0])<20?a.b[1]-b.b[1]:a.b[0]-b.b[0]);
 for(const t of bodies)assign(t,'body',.85,'긴 본문 프레임 · 위→아래/왼쪽→오른쪽');
 if(!bodies.length)review.push('본문 영역 확인 필요');
 if(bodies.length>1){d.bodyFlow=[...new Set(bodies.map(t=>t.story.id))];evidence.push({role:'body',confidence:.85,reason:'독립 Story에 원본 글 분량 비율로 연속 분배; 문자 누락/복제 없음'});}
 if(title&&bodies.length){const subs=text.filter(t=>t!==title&&!bodies.includes(t)&&t.content.length>=8&&t.content.length<=160&&t.size>=11&&t.size<title.size&&t.b[0]>=title.b[2]-2&&t.b[2]<=Math.min(...bodies.map(b=>b.b[0]))+2);subs.sort((a,b)=>a.b[0]-b.b[0]);const near=subs[0],isolated=near&&near.b[0]-title.b[2]<=title.size&&(!subs[1]||subs[1].b[0]-near.b[2]>=near.size*2)&&Math.min(near.b[3],title.b[3])>Math.max(near.b[1],title.b[1]);if(subs.length>1&&isolated)assign(near,'subtitle',.85,'제목 직후 겹치는 수평 영역의 부제; 다음 소제목과 2em 이상 분리');else if(subs.length===1)assign(subs[0],'subtitle',.85,'제목과 본문 사이의 단독 설명 프레임');else if(subs.length>1)review.push('부제 후보 여러 개: 핵심 역할 확인');}
 const images=all.filter(e=>['Rectangle','Oval','Polygon'].includes(e.type)).filter(e=>{const b=e.pageBounds[pageId];return b&&(b[2]-b[0])>=80&&(b[3]-b[1])>=80&&text.some(t=>/^(대표|일반)?이미지$/.test(t.content.trim())&&t.b[0]>=b[0]&&t.b[2]<=b[2]&&t.b[1]>=b[1]&&t.b[3]<=b[3]);}).sort((a,b)=>{const x=a.pageBounds[pageId],y=b.pageBounds[pageId];return Math.abs(x[0]-y[0])<20?x[1]-y[1]:x[0]-y[0];});
 images.forEach((e,i)=>assign(e,'image'+(i+1),.95,'원본 이미지 자리표시 문구를 포함한 프레임'));
 const placed=all.filter(e=>(e.image||[]).length&&!images.includes(e));if(placed.length)review.push('배치 이미지 '+placed.length+'개: 기사 사진/설명·배경 여부 확인 (현재 유지)');
 const captions=text.filter(t=>!d.roles[t.e.id]&&/^(캡션|caption)[:：]/i.test(t.content.trim()));if(captions.length===1)assign(captions[0],'caption',.9,'명시적 캡션 라벨');else if(captions.length>1)review.push('캡션 여러 개: 분배 확인');
 d.mappingReview=review;d.mappingEvidence=evidence;return d;
}
function resolveClearRoles(model,descriptor){
 const d=copy(descriptor),pageId=d.pageIds[0],proposal=autoDraft(model,pageId),all=frames(model,pageId),evidence=[];
 // Complete only previously unconfirmed registration drafts. Existing confirmed roles stay intact.
 if(!d.mappingReview?.length)return d;
 for(const [id,r] of Object.entries(proposal.roles)){
  if(d.roles[id])continue;
  if(r.role==='body'||/^image[1-9]/.test(r.role)){
   confirm(d,id,r.role,proposal.images[id]);evidence.push({elementId:id,role:r.role,reason:'single-page story/body or explicit image-placeholder containment'});
  }
 }
 for(const e of all.filter(e=>e.textFrame&&!d.roles[e.id])){
  const story=model.stories.find(s=>s.id===e.textFrame.storyRef),text=story?.paragraphs.flatMap(p=>p.runs.flatMap(r=>r.tokens.map(t=>t.text||''))).join('').trim()||'';
  if(/^(?:POINT_TEXT|강조문구를\s*입력하세요)[.!。]?$/i.test(text.replace(/[“”"']/g,''))){
   if(!Object.values(d.roles).some(r=>r.role==='subtitle')){confirm(d,e.id,'subtitle');evidence.push({elementId:e.id,role:'subtitle',reason:'explicit POINT_TEXT placeholder; current subtitle/pointText contract'});}
  }
 }
 if(!Object.values(d.roles).some(r=>r.role==='title')){
  const bodies=all.filter(e=>d.roles[e.id]?.role==='body'),top=bodies.length?Math.min(...bodies.map(e=>e.pageBounds[pageId][0])):0;
  const headings=all.filter(e=>e.textFrame&&!d.roles[e.id]).map(e=>{const s=model.stories.find(s=>s.id===e.textFrame.storyRef),runs=s?.paragraphs.flatMap(p=>p.runs)||[];return {e,text:runs.flatMap(r=>r.tokens.map(t=>t.text||'')).join('').trim(),size:Math.max(0,...runs.map(r=>r.resolvedProperties.PointSize||0))};}).filter(t=>t.text.length>=4&&t.text.length<=100&&!/강조|이미지|설명|캡션|목차|부제|[“”]/.test(t.text)&&t.e.pageBounds[pageId][2]<=top&&t.size>=14).sort((a,b)=>b.size-a.size);
  if(headings.length===1){confirm(d,headings[0].e.id,'title');evidence.push({elementId:headings[0].e.id,role:'title',reason:'unique short heading above all article body frames; quote/caption/TOC excluded'});}
 }
 if(proposal.bodyFlow)d.bodyFlow=proposal.bodyFlow;
 d.mappingEvidence=(d.mappingEvidence||[]).concat(evidence);
 // Partial objective mapping does not certify a standalone title, caption distribution or logo.
 d.mappingReview=['단독 기사 TITLE 및 남은 설명/캡션/장식의 의미 확인 필요'];
 return d;
}
function gate(entry){
 // A saved file cannot grant itself production authorization. Full renderer/readback is pending.
 return {state:(entry.descriptor.capability?.fidelityReasons||[]).length?'UNSUPPORTED':entry.profile.readyForMatching?'READY_FOR_FIDELITY_TEST':'ROLE_MAPPING_REQUIRED',productionReady:false,
  reasons:(entry.descriptor.capability?.fidelityReasons||[]).concat(entry.profile.issues).concat('실제 Host Fidelity 검사 전 · 검증 제작 가능, 출력은 검사 결과에 따름')};
}
function register(model,descriptor){Colors.validate(model,descriptor);const entry=Match.libraryEntry(model,descriptor);return {...entry,fidelity:gate(entry)};}
function recommendations(entries,article,fonts){
 const assessments=entries.map(e=>Match.productionAssessment(e,article,{installedFonts:fonts}));
 const candidates=assessments.filter(r=>r.status==='candidate').sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
 return {assessments,reviewRequired:assessments.filter(r=>r.status==='review-required'),excluded:assessments.filter(r=>r.status==='excluded'),allCandidates:candidates,candidates:candidates.slice(0,3),selectedId:null};
}
function selection(entry,article,fonts){return {designId:entry.descriptor.id,articleSignature:JSON.stringify(article),overlay:Match.bindContent(entry,article,{installedFonts:fonts}),fidelity:gate(entry)};}
function lifecycle(entry,evidence){
 const unsupported=entry.descriptor.capability?.fidelityReasons||[],production=entry.descriptor.capability?.productionReasons||[],mappingState=entry.profile.readyForMatching?'MAPPED':'ROLE_MAPPING_REQUIRED';
 let fidelityState=unsupported.length?'UNSUPPORTED':'FIDELITY_TEST_REQUIRED',productionReady=false,reasons=[...unsupported,...entry.profile.issues,...production];
 if(!unsupported.length&&evidence?.host==='adobe'&&evidence.report){const r=evidence.report,f=r.fidelity,issues=r.issues||[];
  const failed=!f||f.phase==='FIDELITY_FAILED'||issues.some(i=>['GENERATOR_MISMATCH','SOURCE_OVERFLOW','SOURCE_INSPECTION','EXTERNAL_ASSET_UNAVAILABLE','EXTERNAL_ASSET_UNVERIFIED'].includes(i.cause))||(f.proofOnly&&(r.errors||[]).length);
  fidelityState=failed?'FIDELITY_FAILED':['FIDELITY_PASSED','CONTENT_APPLIED'].includes(f.phase)?'FIDELITY_VERIFIED':'FIDELITY_TEST_REQUIRED';
  productionReady=entry.profile.readyForMatching&&!production.length&&!failed&&f.phase==='CONTENT_APPLIED'&&!(r.errors||[]).length&&r.outputReady===true;
  reasons=reasons.concat(r.errors||[]);
 }
 const state=unsupported.length?'UNSUPPORTED':mappingState==='ROLE_MAPPING_REQUIRED'?mappingState:productionReady?'PRODUCTION_READY':fidelityState;
 return {state,mappingState,fidelityState,productionReady,reasons};
}
function groupFailures(evidence){
 const groups=new Map();for(const [designId,item] of Object.entries(evidence||{})){
  const report=item.report||{},entry=item.entry,records=report.fidelity?.records||[],issues=report.issues||[],seen=new Set();
  for(const r of records.concat(issues))for(const d of r.comparison?.differences||r.differences||[]){const elementId=r.elementId||/^\$\.objects\.([^.]+)/.exec(d.path||'')?.[1],objectType=entry?.original.elements.find(e=>e.id===elementId)?.type||null,path=(d.path||'$').replace(/\.runs\.\d+/g,'.runs.*').replace(/\.objects\.[^.]+/g,'.objects.*'),key=JSON.stringify([path,d.expected,d.actual,objectType,r.cause||'FIDELITY_MISMATCH']),one=JSON.stringify([elementId,d.path,d.expected,d.actual]);if(seen.has(one))continue;seen.add(one);if(!groups.has(key))groups.set(key,{path,expected:d.expected,actual:d.actual,objectType,cause:r.cause||'FIDELITY_MISMATCH',count:0,designIds:[]});const g=groups.get(key);g.count++;if(!g.designIds.includes(designId))g.designIds.push(designId);}
  const failure=item.diagnostic?.hostFailure?.registeredFailure;
  if(failure||(!records.some(r=>r.comparison?.differences?.length)&&!issues.some(r=>r.differences?.length))){
   const errors=failure?[{path:failure.property||failure.operation,actual:failure.adobeMessage,objectType:failure.object?.type||null,cause:failure.operation,operation:failure.operation,property:failure.property,adobeError:failure.adobeMessage,adobeCode:failure.adobeCode??failure.code??null}]:[...new Set(report.errors||[])].map(message=>({path:'$',actual:message,objectType:null,cause:'HOST_OR_INSPECTION_FAILURE'}));
   for(const e of errors){const key=JSON.stringify([e.path,null,e.actual,e.objectType,e.cause]);if(!groups.has(key))groups.set(key,{...e,expected:null,count:0,designIds:[]});const g=groups.get(key);g.count++;if(!g.designIds.includes(designId))g.designIds.push(designId);}
  }
 }
 return [...groups.values()];
}
function batchReport(entries,evidence,run={}){
 const states=entries.map(entry=>{const e=evidence[entry.descriptor.id],life=lifecycle(entry,e),failure=e?.diagnostic?.hostFailure?.registeredFailure||null;
  const outcome=e?.skipped?'UNSUPPORTED':!e?'NOT_RUN':e.report?.fidelity?.phase==='FIDELITY_PASSED'&&!(e.report.errors||[]).length?(e.host==='adobe'?'PASSED':'MOCK_PASSED'):'FIDELITY_FAILED';
  return {designId:entry.descriptor.id,sourceHash:entry.descriptor.sourceSha256,pageIds:entry.descriptor.pageIds,name:entry.descriptor.name,...life,outcome,failure,failures:(e?.report?.issues||[]).filter(i=>i.cause!=='CONTENT_OVERFLOW').map(i=>({operation:i.failureOperation||'registered.fidelity.compare',elementId:i.elementId||null,objectType:entry.original.elements.find(x=>x.id===i.elementId)?.type||null,property:i.property||null,adobeError:i.adobeError||null,adobeCode:i.adobeErrorCode??null,message:i.message,differences:i.differences||[]})),skipReasons:e?.skipReasons||[]};});
 const groups=groupFailures(evidence).map(g=>({...g,pageCount:g.designIds.length,pages:g.designIds.map(id=>{const e=entries.find(e=>e.descriptor.id===id);return {designId:id,sourceHash:e?.descriptor.sourceSha256,pageIds:e?.descriptor.pageIds};})}));
 return {schema:'magazine-page-verification/v1',createdAt:new Date().toISOString(),run,counts:{total:states.length,passed:states.filter(s=>s.outcome==='PASSED').length,mockPassed:states.filter(s=>s.outcome==='MOCK_PASSED').length,roleMappingRequired:states.filter(s=>s.mappingState==='ROLE_MAPPING_REQUIRED').length,unsupported:states.filter(s=>s.outcome==='UNSUPPORTED').length,fidelityFailed:states.filter(s=>s.outcome==='FIDELITY_FAILED').length,notRun:states.filter(s=>s.outcome==='NOT_RUN').length},states,groups,reports:Object.entries(evidence).map(([designId,e])=>({designId,host:e.host,skipped:!!e.skipped,skipReasons:e.skipReasons||[],report:e.report||null,diagnostic:e.diagnostic||null})),historicalIssues:[{status:'USER_REPORTED_PREVIOUS_RUN_NOT_CURRENT_RESULT',pageId:'u3d6',source:'original',operation:'registered.snapshot.read',objectType:'Group',sourceId:'u7e7e',property:'fillColor',adobeError:'이 개체 내용에 이 그래픽 특성에 대한 값이 여러 개 있습니다.',adobeCode:null,note:'Group fix applied; current batch must determine whether this recurs.'}]};
}
function diagnose({comparison,originalOverflow,currentOverflow,missingFonts=false}){
 if(missingFonts)return {cause:'MISSING_FONT',autoFix:false};
 if(!comparison||!comparison.equal)return {cause:comparison?'GENERATOR_MISMATCH':'FIDELITY_UNVERIFIED',autoFix:false};
 if(originalOverflow!==false)return {cause:'SOURCE_OVERFLOW_OR_UNKNOWN',autoFix:false};
 return {cause:currentOverflow?'CONTENT_OVERFLOW':'NONE',autoFix:!!currentOverflow};
}
function pack(entries){const models={};return {schema:'magazine-registered-library/v1',models,designs:entries.map(e=>{const key=e.original.metadata.sourceSha256;models[key]=e.original;return {modelKey:key,descriptor:copy(e.descriptor)};})};}
function unpack(data){if(!data||data.schema!=='magazine-registered-library/v1'||!Array.isArray(data.designs))throw new Error('등록 라이브러리 JSON이 아닙니다.');const entries=[],errors=[],ids=new Set(),cache=new Map();for(const row of data.designs)try{const model=cache.get(row.modelKey)||data.models&&data.models[row.modelKey]||row.model;const entry=register(model,row.descriptor);if(ids.has(entry.descriptor.id))throw new Error('중복 디자인 ID');ids.add(entry.descriptor.id);if(row.modelKey)cache.set(row.modelKey,entry.original);entries.push(entry);}catch(e){errors.push(String(e.message));}return {entries,errors};}
return {resolveClearRoles,Colors,ROLES,batchReport,lifecycle,groupFailures,autoDraft,frames,candidates,draft,confirm,gate,register,recommendations,selection,diagnose,pack,unpack};
});
