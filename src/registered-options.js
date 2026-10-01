'use strict';
// Orchestration only. Parsing, binding and source Fidelity remain in the single engine.
const copy=x=>JSON.parse(JSON.stringify(x));
function freeze(entries,article){
 const selected=[],ids=new Set();
 for(const entry of entries){if(ids.has(entry.descriptor.id))continue;
  require('./design-registration').selection(entry,article,null); // Existing BLOCK/role/image policy, no separate binding engine.
  ids.add(entry.descriptor.id);selected.push({entry:{...entry,profile:copy(entry.profile),fidelity:copy(entry.fidelity)},descriptor:copy(entry.descriptor),optionId:'OPTION_'+(selected.length+1)});if(selected.length===3)break;
 }
 if(!selected.length)throw new Error('현재 원고로 제작 가능한 추천 디자인이 없습니다.');
 return {article:copy(article),selected};
}
async function run(job,adapter){
 const rows=[],successful=[];
 try{
  for(const option of job.selected){
   const row={optionId:option.optionId,designId:option.descriptor.id,designName:option.descriptor.name,sourceId:option.descriptor.sourceSha256,pageIds:option.descriptor.pageIds.slice(),status:'BLOCK',stage:'production',errors:[]};rows.push(row);
   adapter.progress(row.optionId+' '+(row.designName||row.designId)+' 독립 제작 중');let made;
   try{
    made=await adapter.produce({...option.entry,descriptor:copy(option.descriptor)},copy(job.article));
    row.report=made.report;row.errors=made.report.errors||[];
    if(made.report.outputReady!==true||row.errors.length||made.report.fidelity?.phase!=='CONTENT_APPLIED'){
     row.stage=made.report.fidelity?.phase||'production';if(!row.errors.length)row.errors=['콘텐츠 적용/검사 완료 미확인'];if(made.doc)adapter.close(made.doc);continue;
    }
    row.stage='independent-check';row.status='PASS';successful.push({...made,row});
   }catch(e){row.errors=[String(e.message)];row.failure=e.registeredFailure||null;if(made?.doc)adapter.close(made.doc);}
  }
  if(!successful.length)return {doc:null,rows};
  return await adapter.combine(successful,rows);
 }catch(e){for(const made of successful)adapter.close(made.doc);throw e;}
}
function report(rows,pageCount){
 const passed=rows.filter(r=>r.status==='PASS').length,errors=rows.flatMap(r=>r.errors.map(message=>r.optionId+' · '+r.stage+' · '+message));
 if(rows.length<3)errors.unshift('제작 가능 '+rows.length+'/3 · 3안 미충족: 부분 결과는 INDD 저장/PDF 출력 차단');
 return {pageCount,options:rows,errors,warnings:rows.flatMap(r=>(r.report?.warnings||[]).map(w=>r.optionId+' · '+w)),issues:rows.flatMap(r=>(r.report?.issues||[]).map(i=>({...i,optionId:r.optionId}))),outputReady:passed===3&&errors.length===0,outcome:pageCount?'options':'blocked',autoFixes:[]};
}
module.exports={freeze,run,report};
