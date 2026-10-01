'use strict';
// Add a new source version using unique persisted source labels, never geometry guesses.
const R=require('../src/design-registration'),N=require('../src/registered-native');
function revision(library,model,baseId,pageId){
 const base=library.designs.find(d=>d.descriptor.id===baseId);if(!base)throw new Error('Base design missing');
 const descriptor=R.draft(model,pageId,base.descriptor.name+' · 디자이너 수정본');
 const selected=R.frames(model,pageId),mapping=new Map();
 for(const e of selected){const labels=e.properties.Label?.children||[];const refs=labels.filter(x=>x.attributes?.Key==='MagazineStudioSourceRef');if(refs.length>1)throw new Error('Ambiguous source labels');const ref=refs[0]?.attributes.Value;if(ref){if(mapping.has(ref))throw new Error('Duplicate source reference');mapping.set(ref,e.id);}}
 const oldModel=library.models[base.modelKey];
 for(const [oldId,value] of Object.entries(base.descriptor.roles)){const id=mapping.get(oldId);if(!id)throw new Error('Missing role source reference: '+oldId);const old=oldModel.elements.find(e=>e.id===oldId),fresh=model.elements.find(e=>e.id===id);if(old.type!==fresh.type)throw new Error('Role frame type changed');R.confirm(descriptor,id,value.role,base.descriptor.images?.[oldId]);}
 if(base.descriptor.bodyFlow?.length)descriptor.bodyFlow=base.descriptor.bodyFlow.map(story=>{const frames=oldModel.elements.filter(e=>e.textFrame?.storyRef===story&&mapping.has(e.id));const ids=[...new Set(frames.map(e=>model.elements.find(n=>n.id===mapping.get(e.id)).textFrame.storyRef))];if(ids.length!==1)throw new Error('Ambiguous body Story mapping');return ids[0];});
 descriptor.revisionOf={designId:baseId,sourceSha256:base.modelKey};
 let entry=R.register(model,descriptor);descriptor.capability=N.support(entry);entry=R.register(model,descriptor);
 const packed=R.pack([entry]);return {library:{...library,models:{...library.models,...packed.models},designs:[...library.designs,...packed.designs]},capability:descriptor.capability,designId:descriptor.id};
}
module.exports={revision};
if(require.main===module){const fs=require('fs'),[lib,model,base,page,out]=process.argv.slice(2);if(!out)throw new Error('Usage: library model baseDesign page NEW-output');const result=revision(JSON.parse(fs.readFileSync(lib)),JSON.parse(fs.readFileSync(model)),base,page);fs.writeFileSync(out,JSON.stringify(result.library),{flag:'wx'});console.log(JSON.stringify({designId:result.designId,capability:result.capability}));}
