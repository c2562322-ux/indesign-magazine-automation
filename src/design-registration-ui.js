(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./design-registration'),require('./design-matching'),require('./design-model'));else root.MagazineRegistrationUI=factory(root.MagazineRegistration,root.MagazineMatching,root.MagazineDesignModel);})(typeof window!=='undefined'?window:this,function(R,Match,Model){
'use strict';
const labels={title:'제목',subtitle:'부제',body:'본문',image1:'사진 1',image2:'사진 2',caption:'캡션',header:'헤더',footer:'푸터',pageNumber:'페이지 번호',keep:'장식/고정 내용 유지'};
function mount(root,studio,adapter){
 if(root._registration&&!root._registration.disposed)return root._registration;
 const doc=root.ownerDocument,state={entries:[],model:null,draft:null,offset:0,busy:false,selected:null,revision:0};
 const api={disposed:false,state,refresh(){const walk=e=>{if(e.registrationDisabled)e.disabled=true;for(const c of Array.from(e.children||[]))walk(c);};walk(root);},destroy(){api.disposed=true;root.textContent='';},invalidate(){state.revision++;state.selected=null;results.textContent='원고/사진 변경 · 다시 추천해주세요.';}};root._registration=api;
 root.textContent='';
 function el(tag,text,parent=root){const e=doc.createElement(tag);if(text!==undefined)e.textContent=text;parent.appendChild(e);return e;}
 const title=el('h2','등록 디자인에서 추천 · 검증판');
 el('p','기존 디자이너 지면을 원고와 비교합니다. API 키 불필요. 검증 제작 시 원본을 먼저 검사한 뒤 콘텐츠를 교체합니다.');
 const actions=el('div'),status=el('p','추출한 v2 모델 또는 저장한 등록 라이브러리를 불러오세요.'),editor=el('div'),results=el('div');status.setAttribute('role','status');
 function button(text,fn,parent=actions){const b=el('button',text,parent);b.addEventListener('click',async()=>{if(api.disposed||state.busy||studio.state.busy||b.registrationDisabled)return;state.busy=true;const rev=state.revision;b.disabled=true;status.textContent=text+' 중…';try{await fn(()=>!api.disposed&&rev===state.revision);if(!api.disposed&&status.textContent===text+' 중…')status.textContent=text+' 완료';}catch(e){if(!api.disposed)status.textContent=String(e.message);}finally{state.busy=false;if(!api.disposed)b.disabled=false;}});return b;}
 button('디자인 모델 / 등록 파일 불러오기',async fresh=>{const data=await adapter.load();if(!fresh())return;if(!data){status.textContent='불러오기 취소';return;}
  if(data.schema==='magazine-registered-library/v1'){const loaded=R.unpack(data);state.entries=state.entries.filter(e=>!loaded.entries.some(n=>n.descriptor.id===e.descriptor.id)).concat(loaded.entries);state.selected=null;results.textContent='';status.textContent='등록 '+loaded.entries.length+'건 · 읽기 오류 '+loaded.errors.length+'건';editor.textContent='';if(loaded.errors.length)el('p',loaded.errors.join('\n'),editor);return;}
  const errors=Model.validate(data);if(errors.length)throw new Error(errors.join('; '));state.model=data;state.draft=null;state.selected=null;results.textContent='';showPages();status.textContent='페이지를 선택하고 기사 영역만 역할을 확인해주세요.';
 });
 button('등록 라이브러리 저장',async fresh=>{if(!state.entries.length)throw new Error('먼저 페이지를 등록해주세요.');const saved=await adapter.save(R.pack(state.entries));if(fresh())status.textContent=saved?'등록 파일 저장 완료 · 원문/개인 자료 포함, GitHub에 올리지 마세요.':'저장 취소';});
 button('등록 디자인에서 추천',async fresh=>{
  if(!state.entries.length)throw new Error('등록된 디자인이 없습니다.');const article=studio.read().article;const signature=JSON.stringify(article);
  let fonts=null;try{if(adapter.fonts)fonts=await adapter.fonts(false);}catch(e){/* Keep analysis available with an explicit review gate. */}
  if(!fresh()||JSON.stringify(studio.read().article)!==signature)return;
  const ranked=R.recommendations(state.entries,article,fonts),profile=Match.articleProfile(article);results.textContent='';state.selected=null;
  el('p','제목 '+profile.title.characters+'자 · 본문 '+profile.body.characters+'자 · 사진 '+profile.imageCount+'장',results);
  const rows=ranked.candidates.concat(ranked.reviewRequired.slice(0,3));
  for(const row of rows){const card=el('div',undefined,results);card.className='registered-card';el('h3',row.name+' · '+(row.status==='candidate'?'구조적 후보':'확인 필요'),card);
   el('p',row.reasons.concat(row.soft.map(r=>r.message||r.reason||r.code),row.review.map(r=>r.message||r.reason||r.code)).join(' / '),card);
   el('p','실제 Host Fidelity 검사 필요 · 실패하면 콘텐츠 교체/PDF 차단',card);
   const entry=state.entries.find(e=>e.descriptor.id===row.id);
   button('구조 미리보기',()=>structure(entry.original,entry.descriptor.pageIds[0],card),card);
   const choose=button('분석 후보로 선택',()=>{if(JSON.stringify(studio.read().article)!==signature)throw new Error('원고가 바뀌었습니다. 다시 추천해주세요.');state.selected=R.selection(entry,article,fonts);state.selected.entry=entry;state.selected.article=article;status.textContent='✓ 선택: '+row.name+' · 아래 검증 제작 버튼을 눌러주세요.';},card);
   choose.registrationDisabled=!entry.profile.readyForMatching;choose.disabled=choose.registrationDisabled;
   if(choose.disabled)el('p','역할·사진 정책을 확인하고 다시 등록해야 선택할 수 있습니다.',card);
  }
  status.textContent='구조적 후보 '+ranked.candidates.length+' · 확인 필요 '+ranked.reviewRequired.length+' · 조건 불일치 '+ranked.excluded.length+' (자동 선택 없음)';
  for(const row of ranked.excluded)el('p',row.name+' 제외: '+row.hard.map(r=>r.message||r.reason||r.code).join(' / '),results);
 });
 button('선택한 등록 디자인으로 제작',async fresh=>{if(!state.selected)throw new Error('추천 후보를 먼저 선택해주세요.');const selected=state.selected;if(JSON.stringify(studio.read().article)!==selected.articleSignature)throw new Error('원고 변경 · 다시 추천해주세요.');await studio.createRegistered(selected.entry,selected.article);if(fresh())status.textContent='제작 결과는 아래 검사 및 출력 영역에서 확인해주세요.';});
 function structure(model,pageId,parent){const page=model.pages.find(p=>p.id===pageId);el('p','구조 위치도 — 글꼴/이미지/조판 재현 미리보기가 아닙니다.',parent);const box=el('div',undefined,parent);box.className='registered-map';box.style.width='260px';box.style.height=260*page.height/page.width+'px';
  for(const e of R.frames(model,pageId)){const b=e.pageBounds[pageId],node=el('span',e.id,box);node.style.position='absolute';node.style.left=100*b[1]/page.width+'%';node.style.top=100*b[0]/page.height+'%';node.style.width=100*(b[3]-b[1])/page.width+'%';node.style.height=100*(b[2]-b[0])/page.height+'%';node.style.border='1px solid #777';node.style.fontSize='9px';node.style.overflow='hidden';}
 }
 function showPages(){editor.textContent='';const select=el('select',undefined,editor);select.setAttribute('aria-label','등록할 원본 페이지');for(const page of state.model.pages.filter(p=>p.kind==='Spread')){const opt=el('option',(page.name||'페이지')+' · '+page.id,select);opt.value=page.id;}
  button('이 페이지 역할 확인',()=>{state.draft=R.draft(state.model,select.value);state.offset=0;showRoles();},editor);
 }
 function showRoles(){editor.textContent='';const m=state.model,d=state.draft,all=R.frames(m,d.pageIds[0]);const name=el('input',undefined,editor);name.value=d.name;name.setAttribute('aria-label','등록 디자인 이름');name.addEventListener('change',()=>{d.name=name.value;});
  structure(m,d.pageIds[0],editor);
  el('p','교체할 핵심 슬롯만 선택하세요. 다른 객체는 자동으로 원본 유지됩니다.',editor);
  for(const role of ['title','subtitle','body','image1','image2','caption']){el('label',labels[role],editor);const slot=el('select',undefined,editor);slot.setAttribute('aria-label',labels[role]+' 교체 슬롯');const none=el('option','교체하지 않음',slot);none.value='';for(const e of all.filter(e=>/^image/.test(role)?['Rectangle','Oval','Polygon'].includes(e.type):!!e.textFrame).sort((a,b)=>(R.candidates(m,b).find(c=>c.role===role)?.confidence||0)-(R.candidates(m,a).find(c=>c.role===role)?.confidence||0))){const st=e.textFrame&&m.stories.find(s=>s.id===e.textFrame.storyRef);const text=st?st.paragraphs.flatMap(p=>p.runs.flatMap(r=>r.tokens.filter(t=>t.type==='Content').map(t=>t.text))).join('').slice(0,45):e.type;const o=el('option',e.id+' · '+text,slot);o.value=e.id;}slot.value=Object.keys(d.roles).find(id=>d.roles[id].role===role)||'';slot.addEventListener('change',()=>{for(const id of Object.keys(d.roles))if(d.roles[id].role===role)R.confirm(d,id,'keep');if(slot.value)R.confirm(d,slot.value,role,/^image/.test(role)?'required':undefined);});}
  const detail=el('div',undefined,editor);detail.style.display='none';button('프레임 상세 / 사진 선택 정책',()=>{detail.style.display=detail.style.display==='none'?'block':'none';},editor);
  el('p','기사 영역을 지정하세요. 나머지는 아래에서 일괄 유지할 수 있습니다. 추정은 자동 확정하지 않습니다.',editor);
  for(const e of all.slice(state.offset,state.offset+12)){const row=el('div',undefined,detail);row.className='registered-card';const guess=R.candidates(m,e)[0];el('p',e.id+' · '+e.type+' · 후보 '+labels[guess.role]+' ('+Math.round(guess.confidence*100)+'%) · '+guess.reason,row);
   if(e.textFrame){const story=m.stories.find(s=>s.id===e.textFrame.storyRef);if(story)el('p',story.paragraphs.flatMap(p=>p.runs.flatMap(r=>r.tokens.filter(t=>t.type==='Content').map(t=>t.text))).join('').slice(0,100),row);}
   const select=el('select',undefined,row);select.setAttribute('aria-label',e.id+' 역할');const empty=el('option','역할 확인 필요',select);empty.value='';for(const role of R.ROLES){const o=el('option',labels[role],select);o.value=role;}select.value=d.roles[e.id]?d.roles[e.id].role:d.preserveElementIds.includes(e.id)?'keep':'';
   const policy=el('select',undefined,row);policy.setAttribute('aria-label',e.id+' 사진 정책');for(const [value,label] of [['required','사진 필수'],['optional','사진 선택']]){const o=el('option',label,policy);o.value=value;}policy.value=d.images[e.id]||'required';
   select.addEventListener('change',()=>{if(select.value)R.confirm(d,e.id,select.value,policy.value);});policy.addEventListener('change',()=>{if(/^image/.test(select.value))R.confirm(d,e.id,select.value,policy.value);});
   if(e.textFrame&&adapter.proof)button('원본 단일 프레임 Host 검증',async fresh=>{const plan=Model.textProof(m,e.id,{acknowledgeApproximation:true});const report=await adapter.proof(plan);if(!fresh())return;el('pre',JSON.stringify({elementId:e.id,role:d.roles[e.id],...report},null,2),row);status.textContent='단일 프레임 검증 완료 · 전체 지면 승인 아님';},row);
  }
  button('이전 12개',()=>{state.offset=Math.max(0,state.offset-12);showRoles();},editor);
  button('다음 12개',()=>{state.offset=state.offset+12<all.length?state.offset+12:0;showRoles();},editor);
  button('미지정 영역은 모두 원본 유지',()=>{for(const e of all)if(!d.roles[e.id])R.confirm(d,e.id,'keep');showRoles();status.textContent='미지정 영역 유지 확인. 제목/본문/사진 역할은 남아 있습니다.';},editor);
  button('이 페이지 등록',()=>{const entry=R.register(m,d);state.model=entry.original;state.entries=state.entries.filter(e=>e.descriptor.id!==d.id).concat(entry);status.textContent='등록됨 · '+entry.fidelity.state+' · '+entry.fidelity.reasons.join(' / ');},editor);
  button('다른 페이지',()=>showPages(),editor);
 }
 return api;
}
return {mount};
});
