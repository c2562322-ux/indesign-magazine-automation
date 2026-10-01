'use strict';
const R=require('../src/design-registration'),N=require('../src/registered-native');
function append(library,model,{approvedColors={}}={}){
 const sourceScores=Object.entries(library.models).map(([hash,m])=>({hash,model:m,count:m.elements.filter(e=>model.elements.some(n=>n.id===e.id&&n.type===e.type)).length})).sort((a,b)=>b.count-a.count);
 const donor=sourceScores[0]&&sourceScores[0].count>=sourceScores[0].model.elements.length*.8&&sourceScores[0].count>(sourceScores[1]?.count||0)?sourceScores[0]:null;
 const entries=[],rows=[];
 for(const p of model.pages.filter(p=>p.kind==='Spread')){
  const previous=donor&&library.designs.find(d=>d.modelKey===donor.hash&&d.descriptor.pageIds.length===1&&d.descriptor.pageIds[0]===p.id),all=R.frames(model,p.id),proposal=R.autoDraft(model,p.id);
  let d=R.draft(model,p.id,'새 샘플 · '+p.name+'쪽 · '+p.id),matched=false;
  if(previous){const old=previous.descriptor;matched=Object.keys(old.roles).every(id=>{const a=donor.model.elements.find(e=>e.id===id),b=all.find(e=>e.id===id);return a&&b&&a.type===b.type&&a.textFrame?.storyRef===b.textFrame?.storyRef;});if(matched){for(const [id,role] of Object.entries(old.roles))R.confirm(d,id,role.role,old.images?.[id]);if(old.bodyFlow)d.bodyFlow=old.bodyFlow.slice();d.revisionOf={designId:old.id,sourceSha256:previous.modelKey};d.supersedesDesignIds=library.designs.filter(x=>x.descriptor.revisionOf?.designId===old.id).map(x=>x.descriptor.id);}}
  if(!matched){d.proposedRoles=proposal.roles;d.mappingReview=['새 지면의 제목/부제/본문/사진 의미 확인 필요'];
   const title=all.find(e=>proposal.roles[e.id]?.role==='title'),story=title&&model.stories.find(s=>s.id===title.textFrame?.storyRef),text=story?.paragraphs.flatMap(p=>p.runs.flatMap(r=>r.tokens.map(t=>t.text||''))).join('')||'';
   if(/제목/.test(text)&&!/부제|혹은/.test(text)){for(const [id,r] of Object.entries(proposal.roles))if(['title','body'].includes(r.role)||/^image/.test(r.role))R.confirm(d,id,r.role,proposal.images[id]);if(proposal.bodyFlow)d.bodyFlow=proposal.bodyFlow.slice();d.mappingReview=[];d.mappingNotes=['명시 제목 자리표시와 본문 구조 확인; 기타 영역은 KEEP'];}
  }
  if(approvedColors[p.id])d.colorSlots=approvedColors[p.id];
  let entry=R.register(model,d);d.capability=N.support(entry);entry=R.register(model,d);entries.push(entry);
  rows.push({pageId:p.id,name:p.name,revisionOf:d.revisionOf?.designId||null,roles:d.roles,proposedRoles:d.proposedRoles||null,colorSlots:d.colorSlots||[],readyForMatching:entry.profile.readyForMatching,capability:d.capability});
 }
 const packed=R.pack(entries);if(packed.designs.some(d=>library.designs.some(old=>old.descriptor.id===d.descriptor.id)))throw new Error('Source already registered');
 return {library:{...library,models:{...library.models,...packed.models},designs:library.designs.concat(packed.designs)},rows,donor:donor?.hash||null};
}
module.exports={append};
if(require.main===module){const fs=require('fs'),[lib,source,out,approval]=process.argv.slice(2);if(!out)throw new Error('Usage: existing-library extracted-model NEW-library [explicit-color-approval.json]');const result=append(JSON.parse(fs.readFileSync(lib)),JSON.parse(fs.readFileSync(source)),approval?{approvedColors:JSON.parse(fs.readFileSync(approval))}:{});fs.writeFileSync(out,JSON.stringify(result.library),{flag:'wx'});console.log(JSON.stringify({donor:result.donor,rows:result.rows},null,2));}
