'use strict';
// Models must be re-extracted from the exact original package hashes. Old files
// and their evidence stay untouched; every descriptor receives a new version ID.
const R=require('../src/design-registration'),N=require('../src/registered-native'),M=require('../src/idml-markers');
function upgrade(library,models){
 const byHash=new Map();for(const m of models){M.validateSource(m);if(byHash.has(m.metadata.sourceSha256))throw new Error('Duplicate source model');byHash.set(m.metadata.sourceSha256,m);}
 return R.pack(library.designs.map(d=>{
  const model=byHash.get(d.modelKey);if(!model)throw new Error('Missing exact source hash: '+d.modelKey);
  const descriptor=JSON.parse(JSON.stringify(d.descriptor));descriptor.revisionOf={designId:descriptor.id,extractorVersion:library.models[d.modelKey].metadata.extractorVersion};
  descriptor.id+='-markers-v'+model.metadata.extractorVersion;descriptor.name+=' · 마커 보존 v'+model.metadata.extractorVersion;
  delete descriptor.productionReady;delete descriptor.fidelity;delete descriptor.validation;
  const entry=R.register(model,descriptor);descriptor.capability=N.support(entry);return R.register(model,descriptor);
 }));
}
module.exports={upgrade};
if(require.main===module){const fs=require('fs'),[source,out,...files]=process.argv.slice(2);if(!files.length)throw new Error('Usage: OLD-library NEW-library re-extracted-model...');const result=upgrade(JSON.parse(fs.readFileSync(source)),files.map(f=>JSON.parse(fs.readFileSync(f))));fs.writeFileSync(out,JSON.stringify(result),{flag:'wx'});console.log('Versioned designs: '+result.designs.length);}
