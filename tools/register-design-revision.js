'use strict';
// Add a new source version using unique persisted source labels, never geometry guesses.
const R=require('../src/design-registration'),N=require('../src/registered-native');
function revision(library,model,baseId,pageId,{restoreCurrentPageNumbers=false}={}){
 const base=library.designs.find(d=>d.descriptor.id===baseId);if(!base)throw new Error('Base design missing');
 const descriptor=R.draft(model,pageId,base.descriptor.name+' · 디자이너 수정본');
 const selected=R.frames(model,pageId),mapping=new Map();
 for(const e of selected){const labels=e.properties.Label?.children||[];const refs=labels.filter(x=>x.attributes?.Key==='MagazineStudioSourceRef');if(refs.length>1)throw new Error('Ambiguous source labels');const ref=refs[0]?.attributes.Value;if(ref){if(mapping.has(ref))throw new Error('Duplicate source reference');mapping.set(ref,e.id);}}
 const oldModel=library.models[base.modelKey];
 for(const [oldId,value] of Object.entries(base.descriptor.roles)){const id=mapping.get(oldId);if(!id)throw new Error('Missing role source reference: '+oldId);const old=oldModel.elements.find(e=>e.id===oldId),fresh=model.elements.find(e=>e.id===id);if(old.type!==fresh.type)throw new Error('Role frame type changed');R.confirm(descriptor,id,value.role,base.descriptor.images?.[oldId]);}
 if(base.descriptor.bodyFlow?.length)descriptor.bodyFlow=base.descriptor.bodyFlow.map(story=>{const frames=oldModel.elements.filter(e=>e.textFrame?.storyRef===story&&mapping.has(e.id));const ids=[...new Set(frames.map(e=>model.elements.find(n=>n.id===mapping.get(e.id)).textFrame.storyRef))];if(ids.length!==1)throw new Error('Ambiguous body Story mapping');return ids[0];});
 descriptor.revisionOf={designId:baseId,sourceSha256:base.modelKey};
 if(restoreCurrentPageNumbers)descriptor.markerRestorations=pageNumberRestorations(oldModel,model);
 let entry=R.register(model,descriptor);descriptor.capability=N.support(entry);entry=R.register(model,descriptor);
 const packed=R.pack([entry]);return {library:{...library,models:{...library.models,...packed.models},designs:[...library.designs,...packed.designs]},capability:descriptor.capability,designId:descriptor.id};
}
function pageNumberRestorations(donor,model){
 const M=require('../src/idml-markers');M.validateSource(donor);M.validateSource(model);
 const parentIds=new Set(model.pages.filter(p=>p.kind==='MasterSpread').map(p=>p.id)),donorParents=new Set(donor.pages.filter(p=>p.kind==='MasterSpread').map(p=>p.id)),out=[],seen=new Set();
 for(const e of model.elements.filter(e=>e.textFrame&&e.pageCandidates.some(p=>parentIds.has(p)))){
  const refs=(e.properties.Label?.children||[]).filter(c=>c.attributes?.Key==='MagazineStudioSourceRef');if(refs.length!==1)continue;
  const old=donor.elements.find(o=>o.id===refs[0].attributes.Value&&o.textFrame&&o.pageCandidates.some(p=>donorParents.has(p)));if(!old)continue;
  const parts=M.storyParts(donor.stories.find(s=>s.id===old.textFrame.storyRef));
  if(parts.length!==1||parts[0].target!=='ACE'||parts[0].data!=='18')continue;
  const fresh=model.stories.find(s=>s.id===e.textFrame.storyRef);if(M.storyParts(fresh).length)throw new Error('Refusing nonempty page-number Story restoration');
  if(seen.has(old.id)||out.some(r=>r.storyId===fresh.id))throw new Error('Ambiguous Parent source reference');seen.add(old.id);
  out.push({kind:'RESTORE_CURRENT_PAGE_NUMBER',frameId:e.id,storyId:fresh.id,donorSourceSha256:donor.metadata.sourceSha256,donorStoryId:old.textFrame.storyRef});
 }
 const trees=JSON.parse(JSON.stringify(model.sourceXml));M.applyRestorations(trees,out);return out;
}
module.exports={revision,pageNumberRestorations};
if(require.main===module){const fs=require('fs'),[lib,model,base,page,out,option]=process.argv.slice(2);if(!out)throw new Error('Usage: library model baseDesign page NEW-output [--restore-current-page-numbers]');if(option&&option!=='--restore-current-page-numbers')throw new Error('Unknown option');const result=revision(JSON.parse(fs.readFileSync(lib)),JSON.parse(fs.readFileSync(model)),base,page,{restoreCurrentPageNumbers:!!option});fs.writeFileSync(out,JSON.stringify(result.library),{flag:'wx'});console.log(JSON.stringify({designId:result.designId,capability:result.capability}));}
