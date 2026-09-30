/* Bounded runtime fitting for generated title/subtitle frames. Never edits a plan. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.MagazineAutoFit=factory();})(typeof window!=='undefined'?window:this,function(){
'use strict';
const POLICY=Object.freeze({title:{growth:3,ratio:.9,min:24,step:.5},subtitle:{growth:2,ratio:.92,min:10,step:.25}});
const near=(a,b)=>Math.abs(a-b)<.02;
function number(v){if(typeof v==='number'&&Number.isFinite(v))return v;if(typeof v==='string'&&/^-?(?:\d+(?:\.\d*)?|\.\d+)mm$/.test(v))return Number(v.slice(0,-2));throw new Error('측정 단위를 확인할 수 없습니다.');}
function rect(values){const r=Array.from(values,number);if(r.length!==4||r[2]<r[0]||r[3]<r[1])throw new Error('프레임 좌표를 확인할 수 없습니다.');return r;}
function snapshot(f){const t=f.parentStory.texts.item(0);return {bounds:rect(f.geometricBounds),fontSize:number(t.pointSize),leading:number(t.leading),tracking:number(t.tracking),spaceBefore:number(t.spaceBefore),spaceAfter:number(t.spaceAfter),font:t.appliedFont.name,fontStyle:t.fontStyle};}
function same(a,b){return a.bounds.every((v,i)=>near(v,b.bounds[i]))&&near(a.fontSize,b.fontSize)&&near(a.leading,b.leading)&&['tracking','spaceBefore','spaceAfter'].every(k=>near(a[k],b[k]))&&a.font===b.font&&a.fontStyle===b.fontStyle;}
function overlap(a,b){return a[1]<b[3]&&a[3]>b[1]&&a[0]<b[2]&&a[2]>b[0];}
function limit(f,bounds,max,context){
 const page=rect(f.parentPage.bounds),items=Array.from(f.parentPage.allPageItems);let bottom=Math.min(bounds[2]+max,page[2]-.5);
 if(bounds[0]<page[0]||bounds[1]<page[1]||bounds[3]>page[3]||bounds[2]>page[2])throw new Error('FRAME_COLLISION');
 for(const item of items){if(item===f||(item.id!==undefined&&item.id===f.id))continue;
  const box=rect(item.visibleBounds);if(overlap(bounds,box))throw new Error('FRAME_COLLISION');
  if(bounds[1]<box[3]&&bounds[3]>box[1]&&box[0]>=bounds[2])bottom=Math.min(bottom,box[0]-.5);
 }
 return Math.max(0,bottom-bounds[2]);
}
function diagnose(record,context){
 const f=record.frame;
 try{
  if(record.poisoned)return {cause:'UNKNOWN',category:'BLOCKING',hint:'자동 수정 원복 확인에 실패했습니다. 새 문서를 만들어주세요.'};
  if(!POLICY[record.role])return {cause:record.role==='body'?'CONTENT_OVERFLOW':'UNKNOWN',category:'USER_ACTION_REQUIRED'};
  if(f.label!==record.label)throw new Error('프레임 라벨이 바뀌었습니다.');
  if(!context.unitsOK())throw new Error('측정 단위가 바뀌었습니다. 새 문서를 만들어주세요.');
  const current=snapshot(f),expected=record.accepted||record.expected;
  if(current.fontSize<1||current.fontSize>300||current.leading<1||current.leading>500)throw new Error('글자 크기 또는 행간을 확인할 수 없습니다.');
  if(!same(current,expected))return {cause:record.initial?'GENERATOR_MISMATCH':'DOCUMENT_CHANGED',category:record.initial?'BLOCKING':'USER_ACTION_REQUIRED',hint:'원본과 다른 프레임/글자 속성이 감지되어 자동 조정하지 않았습니다.'};
  const pref=f.textFramePreferences;
  const ins=typeof pref.insetSpacing==='number'||typeof pref.insetSpacing==='string'?Array(4).fill(number(pref.insetSpacing)):Array.from(pref.insetSpacing,number);
  if(ins.length!==4||!ins.every((v,i)=>near(v,record.inset[i]))||!near(number(pref.textColumnCount),1)||!context.topAligned(pref.verticalJustification))return {cause:'GENERATOR_MISMATCH',category:'BLOCKING',hint:'프레임 속성이 생성 명세와 다릅니다. 상세 진단을 전달해주세요.'};
  if(f.locked||f.itemLayer&&f.itemLayer.locked||number(f.rotationAngle)!==0||number(f.shearAngle)!==0||(f.absoluteRotationAngle!==undefined&&number(f.absoluteRotationAngle)!==0)||Array.from(f.parentStory.textContainers).length!==1)throw new Error('잠금·회전·연결 프레임은 자동 조정하지 않습니다.');
  const growth=limit(f,current.bounds,POLICY[record.role].growth,context);
  return {cause:'CONTENT_OVERFLOW',category:'AUTO_FIXABLE',growth};
 }catch(e){return {cause:e.message==='FRAME_COLLISION'?'FRAME_COLLISION':'UNKNOWN',category:'USER_ACTION_REQUIRED',hint:e.message==='FRAME_COLLISION'?'다른 객체와 겹치거나 페이지 밖에 있습니다. 직접 확인해주세요.':'안전한 자동 수정 조건을 확인하지 못했습니다. 직접 확인해주세요.'};}
}
function fit(record,context,diagnosis){
 if(record.attempt)return record.attempt;
 const f=record.frame,t=f.parentStory.texts.item(0),before=snapshot(f),policy=POLICY[record.role];
 const log={role:record.role,before,after:before,reason:diagnosis.cause,result:'unresolved',steps:0};record.attempt=log;
 const restore=()=>{f.geometricBounds=before.bounds.map(n=>n+'mm');t.pointSize=before.fontSize;t.leading=before.leading;context.recompose();if(!same(snapshot(f),before))throw new Error('원복 검증 실패');};
 const resolved=()=>{context.recompose();log.steps++;limit(f,snapshot(f).bounds,0,context);return f.parentStory.overflows===false&&f.overflows===false;};
 try{
  let done=false;
  for(let growth=.5;growth<=diagnosis.growth+.001;growth+=.5){f.geometricBounds=[before.bounds[0],before.bounds[1],before.bounds[2]+growth,before.bounds[3]].map(n=>n+'mm');if(resolved()){done=true;break;}}
  const minimum=Math.min(before.fontSize,Math.max(policy.min,before.fontSize*policy.ratio));
  for(let size=before.fontSize-policy.step;!done&&size>=minimum-.001;size-=policy.step){t.pointSize=size;t.leading=before.leading*size/before.fontSize;if(resolved())done=true;}
  if(done){log.result='resolved';log.after=snapshot(f);record.accepted=log.after;}
  else{restore();log.reason='SAFE_LIMIT_REACHED';}
 }catch(e){log.reason='HOST_FAILURE';log.detail=context.describeError?context.describeError(e):'Host API 실패';try{restore();}catch(rollback){record.poisoned=true;throw new Error('자동 수정 원복 실패. 새 문서를 만들어주세요.');}}
 return log;
}
return {POLICY,rect,snapshot,same,diagnose,fit};
});
