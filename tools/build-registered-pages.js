'use strict';
// Read-only source inputs; new private outputs must not already exist.
const fs=require('node:fs'),path=require('node:path');
const R=require('../src/design-registration'),N=require('../src/registered-native');
function build(reference,models){
 const entries=[],rows=[],referenceRows=new Map(reference.designs.map(d=>[d.modelKey+':'+d.descriptor.pageIds.join(','),d.descriptor]));
 for(const [label,input] of models){let model=input;
  for(const page of model.pages.filter(p=>p.kind==='Spread')){
   const original=referenceRows.get(model.metadata.sourceSha256+':'+page.id);
   const descriptor=original?JSON.parse(JSON.stringify(original)):R.autoDraft(model,page.id,label+' · '+page.id);
   let entry=R.register(model,descriptor);model=entry.original;
   descriptor.capability=N.support(entry);entry=R.register(model,descriptor);
   entries.push(entry);
   const roles=role=>Object.entries(descriptor.roles).filter(([,v])=>v.role===role).map(([id])=>id);
   const body=roles('body'),fidelity=descriptor.capability.fidelityTestable;
   const pageElements=R.frames(model,page.id),pageText=pageElements.filter(e=>e.textFrame).flatMap(e=>model.stories.find(s=>s.id===e.textFrame.storyRef)?.paragraphs.flatMap(p=>p.runs.flatMap(r=>r.tokens.filter(t=>t.type==='Content').map(t=>t.text)))||[]).join(' ');
   const type=!pageElements.length?'empty':/목차|CONTENTS/i.test(pageText)?'contents':body.length>1?'multi-body':body.length?'article':'cover/review';
   rows.push({source:label,sourceHash:model.metadata.sourceSha256,pageId:page.id,designId:descriptor.id,
    type,title:roles('title'),subtitle:roles('subtitle'),body,
    bodyFlow:descriptor.bodyFlow||[],imageSlots:entry.profile.imageSlots.length,caption:roles('caption'),
    mapping:entry.profile.readyForMatching?'AUTO_MAPPED':'ROLE_MAPPING_REQUIRED',confidence:original?'existing confirmed mapping':descriptor.mappingEvidence,
    evaluation:true,fidelityTestable:fidelity,fidelityState:fidelity?'FIDELITY_TEST_REQUIRED':'UNSUPPORTED',productionReady:false,
    reasons:[...entry.profile.issues,...descriptor.capability.fidelityReasons,...descriptor.capability.productionReasons]});
  }
 }
 return {library:R.pack(entries),audit:{schema:'magazine-page-capabilities/v1',rows,counts:{total:rows.length,evaluation:rows.length,roleReview:rows.filter(r=>r.mapping==='ROLE_MAPPING_REQUIRED').length,fidelityTestable:rows.filter(r=>r.fidelityTestable).length,fidelityVerified:0,productionReady:0,unsupported:rows.filter(r=>r.fidelityState==='UNSUPPORTED').length}}};
}
if(require.main===module){
 const [referenceFile,otherModel,output]=process.argv.slice(2);
 if(!output)throw new Error('Usage: node tools/build-registered-pages.js reference.review.json other-model.json NEW-output.private.json');
 const report=output.replace(/\.json$/,'.audit.json');
 for(const name of [output,report])if(fs.existsSync(name))throw new Error('Refusing to overwrite '+name);
 const reference=JSON.parse(fs.readFileSync(referenceFile,'utf8'));
 const models=Object.values(reference.models).map(m=>['original',m]);models.push(['central',JSON.parse(fs.readFileSync(otherModel,'utf8'))]);
 const result=build(reference,models);
 fs.writeFileSync(output,JSON.stringify(result.library),{flag:'wx'});
 fs.writeFileSync(report,JSON.stringify(result.audit,null,2),{flag:'wx'});
 console.log(JSON.stringify({output:path.resolve(output),report:path.resolve(report),...result.audit.counts}));
}
module.exports={build};
