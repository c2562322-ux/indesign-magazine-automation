'use strict';
// Orchestration only. Parsing, binding and source Fidelity remain in the single engine.
const copy=x=>JSON.parse(JSON.stringify(x));
function freeze(entries,article){
 const selected=[],ids=new Set();
 for(const entry of entries){const identity=entry.descriptor.pageSet?.id||entry.descriptor.id;if(ids.has(identity))continue;
  require('./design-registration').selection(entry,article,null); // Existing BLOCK/role/image policy, no separate binding engine.
  ids.add(identity);selected.push({entry:{...entry,profile:copy(entry.profile),fidelity:copy(entry.fidelity)},descriptor:copy(entry.descriptor),optionId:'OPTION_'+(selected.length+1)});
 }
 if(!selected.length)throw new Error('현재 원고로 제작 가능한 추천 디자인이 없습니다.');
 return {article:copy(article),selected};
}
async function run(job,adapter){
 const rows=[],successful=[];
 try{
  for(const option of job.selected){
   const row={optionId:'ATTEMPT_'+(rows.length+1),designId:option.descriptor.id,designName:option.descriptor.name,sourceId:option.descriptor.sourceSha256,provenance:option.descriptor.provenance?copy(option.descriptor.provenance):null,pageIds:option.descriptor.pageIds.slice(),attemptId:'ATTEMPT_'+(rows.length+1),candidateCount:job.selected.length,status:'BLOCK',stage:'production',errors:[]};rows.push(row);
   adapter.progress(row.attemptId+' '+(row.designName||row.designId)+' 독립 제작 중 · 실제 PASS '+successful.length+'/3');let made;
   try{
    made=await adapter.produce({...option.entry,descriptor:copy(option.descriptor)},copy(job.article));
    row.report=made.report;row.errors=made.report.errors||[];
    if(made.report.outputReady!==true||row.errors.length||made.report.fidelity?.phase!=='CONTENT_APPLIED'){
     row.stage=made.report.fidelity?.phase||'production';if(!row.errors.length)row.errors=['콘텐츠 적용/검사 완료 미확인'];if(made.doc)adapter.close(made.doc);continue;
    }
    row.stage='independent-check';row.status='PASS';row.productionPassed=true;row.optionId='OPTION_'+(successful.length+1);successful.push({...made,row});
   }catch(e){row.errors=[String(e.message)];row.failure=e.registeredFailure||null;if(made?.doc)adapter.close(made.doc);}
   if(row.status==='PASS'){adapter.progress(row.attemptId+' PASS · '+successful.length+'/3');if(successful.length===3)break;}
  }
  if(!successful.length)return {doc:null,rows};
  return await adapter.combine(successful,rows);
 }catch(e){for(const made of successful)adapter.close(made.doc);throw e;}
}
function report(rows,pageCount){
 const passed=rows.filter(r=>r.status==='PASS').length,attemptFailures=rows.filter(r=>r.status!=='PASS').map(r=>({attemptId:r.attemptId||r.optionId,designId:r.designId,stage:r.stage,errors:r.errors.slice(),failure:r.failure||null}));
 // A rejected candidate is diagnostic history, not a defect in three different
 // successful, independently checked options. Combined-check failures still block.
 const errors=passed===3?[]:rows.flatMap(r=>r.errors.map(message=>(r.attemptId||r.optionId)+' · '+r.stage+' · '+message));
 if(passed<3)errors.unshift('실제 PASS '+passed+'/3 · 3안 미완료');
 return {pageCount,attemptedCount:rows.length,candidateCount:Math.max(rows.length,...rows.map(r=>r.candidateCount||0)),productionPassed:rows.filter(r=>r.productionPassed||r.status==='PASS').length,attemptFailures,options:rows,errors,warnings:attemptFailures.map(r=>r.attemptId+' 후보 실패: '+r.errors.join(' / ')).concat(rows.flatMap(r=>(r.report?.warnings||[]).map(w=>r.optionId+' · '+w))),issues:rows.filter(r=>passed<3||r.status==='PASS').flatMap(r=>(r.report?.issues||[]).map(i=>({...i,optionId:r.optionId}))),outputReady:passed===3&&errors.length===0,outcome:pageCount?'options':'blocked',autoFixes:[]};
}
module.exports={freeze,run,report};
