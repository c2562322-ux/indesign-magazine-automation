'use strict';
const F=require('./registered-fidelity'),N=require('./registered-native'),Model=require('./design-model'),Options=require('./registered-options');
const OPTION='MagazineStudioOption',MANIFEST='MagazineStudioOptions/v1';
const collection=rows=>({length:rows.length,item:i=>rows[i<0?rows.length+i:i]});
// A different definition is not made compatible by a matching display name.
// Until resource namespacing has Host evidence, reject incompatible document resources.
function compatibility(a,b){
 const signature=entry=>({layers:entry.original.layers,resources:Object.fromEntries(Object.entries(entry.original.sourceXml||{}).filter(([name])=>/^Resources\/|^MasterSpreads\/|^XML\/Tags/.test(name)).sort(([a],[b])=>a.localeCompare(b)))});
 const cmp=Model.compare(signature(a),signature(b),0);
 if(!cmp.equal)throw new Error('OPTION_RESOURCE_CONFLICT: 문서 설정/Parent/레이어/Swatch/스타일 정의가 다릅니다. 이름만으로 병합하지 않습니다. '+cmp.differences.slice(0,6).map(d=>d.path).join(', '));
}
function view(doc,pages,masters){
 // Source IDs are local to each OPTION, not globally unique across templates.
 const fields={pages:collection(pages),allPageItems:pages.flatMap(p=>F.list(p.allPageItems)),masterSpreads:collection(masters)};
 // A plain read-only facade avoids proxying Adobe's native DOM bridge objects.
 return {...fields,id:doc.id,name:doc.name,isValid:doc.isValid,swatches:doc.swatches,colors:doc.colors};
}
function pageState(pages){return pages.map(p=>({sourceId:F.ref(p),bounds:[p.bounds[2]-p.bounds[0],p.bounds[3]-p.bounds[1]],side:String(p.side),spread:F.ref(p.parent),parent:F.ref(p.appliedMaster)}));}
function scope(doc,option){
 const pages=F.list(doc.pages).filter(p=>p.extractLabel(OPTION)===option.row.optionId);
 if(pages.length!==option.pageIds.length||pages.some((p,i)=>F.ref(p)!==option.pageIds[i]))throw new Error('OPTION_PAGE_REFERENCE_MISMATCH: '+option.row.optionId);
 const masters=option.masterIds.map(id=>{const found=F.list(doc.masterSpreads).filter(m=>F.ref(m)===id);if(found.length!==1)throw new Error('OPTION_PARENT_REFERENCE_MISMATCH: '+id);return found[0];});
 return view(doc,pages,masters);
}
function bind(doc,option){
 const scoped=scope(doc,option),context={...option.context,contentChecks:option.context.contentChecks.map(c=>({...c}))};N.rebind(context,scoped);return context;
}
function restoreStoryReferences(scoped,produced,optionId){
 // Adobe Spread.duplicate retains frame labels but drops Story labels.
 // Prove the complete copied thread and contents before restoring only metadata.
 const groups=new Map(),actualStories=new Map(),pending=[];
 for(const frame of F.list(scoped.allPageItems)){
  const expected=produced.objects?.[F.ref(frame)];if(!expected?.storyRef)continue;
  const story=frame.parentStory,source=expected.storyRef,existing=groups.get(source);
  if(existing&&existing.id!==story.id)throw new Error('OPTION_THREAD_SPLIT: '+source);
  if(actualStories.has(story.id)&&actualStories.get(story.id)!==source)throw new Error('OPTION_THREAD_MERGED: '+source);
  groups.set(source,story);actualStories.set(story.id,source);
  const frames=F.list(story.textContainers),thread=frames.map(F.ref);
  if(!Model.compare(expected.thread,thread,0).equal||frames.some(f=>f.parentPage?.extractLabel(OPTION)!==optionId))throw new Error('OPTION_THREAD_REFERENCE_MISMATCH: '+source);
  if(String(story.contents)!==expected.story)throw new Error('OPTION_STORY_CONTENT_MISMATCH: '+source);
  const label=F.ref(story);if(label&&label!==source)throw new Error('OPTION_STORY_REFERENCE_MISMATCH: '+source);
 }
 for(const [source,story] of groups)if(!F.ref(story))pending.push({source,story});
 for(const {source,story} of pending){story.insertLabel(N.KEY,source);if(F.ref(story)!==source)throw new Error('OPTION_STORY_LABEL_WRITE_FAILED: '+source);}
}
function validate(doc,option,ID,progress=()=>{}){
 require('./active-design-set').assertOption(option);
 progress(option.row.optionId+' registered.options.scope');
 const scoped=scope(doc,option),context=bind(doc,option);progress(option.row.optionId+' registered.options.fidelity.start');const issues=N.check(context,ID);progress(option.row.optionId+' registered.options.fidelity.success');
 const cmp=F.compare(option.pageState,pageState(F.list(scoped.pages)),ID);
 if(!cmp.equal)issues.push({cause:'OPTION_PAGE_STRUCTURE_MISMATCH',message:'페이지 크기/좌우/Spread/Parent 변경',differences:cmp.differences});
 const after=F.capture(scoped,option.pageIds,progress,ID),snapshot=F.compare(option.produced,after,ID);
 if(!snapshot.equal)issues.push({cause:'OPTION_MERGE_FIDELITY',message:'결합 전후 콘텐츠/geometry/Story/thread/이미지/장식 변경',differences:snapshot.differences});
 const stories=new Map();for(const item of F.list(scoped.allPageItems)){if(['TextFrame','EndnoteTextFrame'].includes(item.constructor?.name))stories.set(item.parentStory.id,item.parentStory);}
 for(const story of stories.values())if(story.overflows)issues.push({cause:'CONTENT_OVERFLOW',message:'결합 후 Story 넘침: '+F.ref(story)});
 return issues;
}
function check(batch,ID,progress=()=>{}){
 const old=ID.app.scriptPreferences.measurementUnit;ID.app.scriptPreferences.measurementUnit=ID.MeasurementUnits.POINTS;try{
 batch.doc.recompose();let page=1;
 for(const option of batch.options){
  const issues=validate(batch.doc,option,ID,progress);option.row.errors=issues.map(i=>i.message);option.row.report={...option.row.report,issues};option.row.status=issues.length?'BLOCK':'PASS';option.row.stage='combined-check';
  option.row.pageRange={start:page,end:page+option.pageIds.length-1};page+=option.pageIds.length;
 }
 const report=Options.report(batch.rows,batch.doc.pages.length);
 const expected=batch.options.reduce((sum,o)=>sum+o.pageIds.length,0);if(batch.doc.pages.length!==expected){report.errors.push('OPTION_PAGE_COUNT_MISMATCH');report.outputReady=false;}
 return report;
 }finally{ID.app.scriptPreferences.measurementUnit=old;}
}
function labelPages(pages,optionId){for(const p of pages)p.insertLabel(OPTION,optionId);}
function prepared(made,ID){
 const pages=F.list(made.doc.pages),masterIds=F.list(made.doc.masterSpreads).map(F.ref);
 if(masterIds.some(id=>!id))throw new Error('OPTION_PARENT_REFERENCE_MISSING');
 const context={...made.context,contentChecks:made.context.contentChecks.map(c=>({...c,overrides:c.overrides?Object.fromEntries(Object.entries(c.overrides).map(([k,v])=>[k,F.value(v)])):undefined}))};
 return {...made,context,pageIds:pages.map(F.ref),masterIds,pageState:pageState(pages),produced:F.capture(made.doc,made.context.entry.descriptor.pageIds,undefined,ID)};
}
function manifest(batch){return batch.rows.map(r=>({optionId:r.optionId,designId:r.designId,sourceId:r.sourceId,provenance:r.provenance||null,pageIds:r.pageIds,pageRange:r.pageRange||null,status:r.status}));}
function close(doc,ID){if(doc?.isValid)doc.close(ID.SaveOptions.NO);}
function combine(successful,rows,ID,progress,guard=()=>{}){
 const old=ID.app.scriptPreferences.measurementUnit;ID.app.scriptPreferences.measurementUnit=ID.MeasurementUnits.POINTS;
 const batch={doc:null,rows,options:[]};
 try{
  for(const made of successful){guard();let additions=[];
   try{
    made.row.stage='merge-snapshot';progress(made.row.optionId+' 결합 검사 중');
    progress(made.row.optionId+' registered.options.snapshot.start');const option=prepared(made,ID);progress(made.row.optionId+' registered.options.snapshot.success');labelPages(F.list(made.doc.pages),made.row.optionId);
    if(!batch.doc)batch.doc=made.doc;
    if(batch.options.length){
     made.row.stage='merge-resource-preflight';compatibility(batch.options[0].context.entry,made.context.entry);
     made.row.stage='merge-copy';
     const before=new Set(F.list(batch.doc.spreads).map(s=>s.id));
     try{for(const spread of F.list(made.doc.spreads)){guard();spread.duplicate(ID.LocationOptions.AT_END,batch.doc);}}
     finally{additions=F.list(batch.doc.spreads).filter(s=>!before.has(s.id));}
     // Native duplication must preserve complete thread sets. Never recreate text or guess a missing connection.
    }
    made.row.stage='merge-story-reference';restoreStoryReferences(scope(batch.doc,option),option.produced,option.row.optionId);
    made.row.stage='merge-fidelity';batch.doc.recompose();const issues=validate(batch.doc,option,ID,progress);
    if(issues.length){made.row.mergeIssues=issues;throw new Error(issues.map(i=>i.message).join(' / '));}
    batch.options.push(option);made.row.stage='combined-check';
   }catch(e){made.row.status='BLOCK';made.row.errors=[String(e.message)];made.row.failure=e.registeredFailure||null;
    for(const spread of additions.reverse())spread.remove();
    if(!batch.options.length){close(batch.doc,ID);batch.doc=null;}
    else if(additions.length){batch.doc.recompose();for(const kept of batch.options)if(validate(batch.doc,kept,ID).length)throw new Error('OPTION_ROLLBACK_UNSAFE: 이전 정상 시안까지 변경되어 결과 문서를 폐기합니다.');}
   }finally{if(made.doc!==batch.doc)close(made.doc,ID);}
  }
  if(!batch.doc)return {doc:null,rows,report:Options.report(rows,0)};
  const report=check(batch,ID,progress);batch.doc.insertLabel(MANIFEST,JSON.stringify(manifest(batch)));return {doc:batch.doc,rows,batch,report};
 }catch(e){close(batch.doc,ID);throw e;}finally{ID.app.scriptPreferences.measurementUnit=old;}
}
module.exports={OPTION,MANIFEST,compatibility,view,pageState,scope,bind,validate,restoreStoryReferences,check,prepared,combine,manifest,close};
