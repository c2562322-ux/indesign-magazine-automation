(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./design-model'),require('./design-matching'));else root.MagazineRegistration=factory(root.MagazineDesignModel,root.MagazineMatching);})(typeof window!=='undefined'?window:this,function(Model,Match){
'use strict';
const ROLES=['title','subtitle','body','image1','image2','caption','header','footer','pageNumber','keep'];
const copy=x=>JSON.parse(JSON.stringify(x));
function frames(model,pageId){return model.elements.filter(e=>e.pageCandidates.length===1&&e.pageCandidates[0]===pageId);}
function candidates(model,e){
 const explicit=e.role&&e.role.confirmed;
 if(ROLES.includes(explicit))return [{role:explicit,confidence:1,reason:'원본의 명시적 역할',confirmed:true}];
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
 if(!ROLES.includes(role))throw new Error('지원하지 않는 역할');
 if(/^image/.test(role)&&!['required','optional'].includes(requirement))throw new Error('사진 필수/선택 확인 필요');
 delete d.roles[id];delete d.images[id];d.preserveElementIds=d.preserveElementIds.filter(x=>x!==id);
 if(role==='keep')d.preserveElementIds.push(id);
 else {d.roles[id]={role,confirmed:true};if(/^image/.test(role)){if(!['required','optional'].includes(requirement))throw new Error('사진 필수/선택 확인 필요');d.images[id]=requirement;}}
 return d;
}
function gate(entry){
 // A saved file cannot grant itself production authorization. Full renderer/readback is pending.
 return {state:entry.profile.readyForMatching?'READY_FOR_FIDELITY_TEST':'ROLE_MAPPING_REQUIRED',productionReady:false,
  reasons:entry.profile.issues.concat('실제 Host Fidelity 검사 전 · 검증 제작 가능, 출력은 검사 결과에 따름')};
}
function register(model,descriptor){const entry=Match.libraryEntry(model,descriptor);return {...entry,fidelity:gate(entry)};}
function recommendations(entries,article,fonts){const result=Match.rank(entries,article,{installedFonts:fonts});return {...result,candidates:result.candidates.slice(0,3),selectedId:null};}
function selection(entry,article,fonts){return {designId:entry.descriptor.id,articleSignature:JSON.stringify(article),overlay:Match.bindContent(entry,article,{installedFonts:fonts}),fidelity:gate(entry)};}
function diagnose({comparison,originalOverflow,currentOverflow,missingFonts=false}){
 if(missingFonts)return {cause:'MISSING_FONT',autoFix:false};
 if(!comparison||!comparison.equal)return {cause:comparison?'GENERATOR_MISMATCH':'FIDELITY_UNVERIFIED',autoFix:false};
 if(originalOverflow!==false)return {cause:'SOURCE_OVERFLOW_OR_UNKNOWN',autoFix:false};
 return {cause:currentOverflow?'CONTENT_OVERFLOW':'NONE',autoFix:!!currentOverflow};
}
function pack(entries){const models={};return {schema:'magazine-registered-library/v1',models,designs:entries.map(e=>{const key=e.original.metadata.sourceSha256;models[key]=e.original;return {modelKey:key,descriptor:copy(e.descriptor)};})};}
function unpack(data){if(!data||data.schema!=='magazine-registered-library/v1'||!Array.isArray(data.designs))throw new Error('등록 라이브러리 JSON이 아닙니다.');const entries=[],errors=[],ids=new Set(),cache=new Map();for(const row of data.designs)try{const model=cache.get(row.modelKey)||data.models&&data.models[row.modelKey]||row.model;const entry=register(model,row.descriptor);if(ids.has(entry.descriptor.id))throw new Error('중복 디자인 ID');ids.add(entry.descriptor.id);if(row.modelKey)cache.set(row.modelKey,entry.original);entries.push(entry);}catch(e){errors.push(String(e.message));}return {entries,errors};}
return {ROLES,frames,candidates,draft,confirm,gate,register,recommendations,selection,diagnose,pack,unpack};
});
