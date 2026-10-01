// Read-only capability audit. Counts never confer Adobe approval.
'use strict';
const R=require('../src/design-registration'),N=require('../src/registered-native'),T=require('../src/registered-text-policy');
function audit(library,sourceHash){return R.unpack(library).entries.filter(e=>e.original.metadata.sourceSha256===sourceHash).map(e=>{
 const cap=N.support(e),text=e.original.elements.filter(f=>f.pageCandidates.length===1&&e.descriptor.pageIds.includes(f.pageCandidates[0])&&f.textFrame).map(f=>{const story=e.original.stories.find(s=>s.id===f.textFrame.storyRef);try{return {id:f.id,role:e.descriptor.roles[f.id]?.role||'unconfirmed',policy:T.policy(story).mode};}catch(error){return {id:f.id,role:e.descriptor.roles[f.id]?.role||'unconfirmed',reason:error.message};}});
 return {id:e.descriptor.id,page:e.descriptor.pageIds[0],name:e.profile.name,roles:e.descriptor.roles,images:Object.values(e.descriptor.roles).filter(r=>/^image[1-9]/.test(r.role)).length,roleIssues:e.profile.issues,capability:cap,text,productionTestEligible:e.profile.readyForMatching&&!cap.fidelityReasons.length&&!cap.productionReasons.length,adobeVerified:false};
});}
module.exports={audit};
if(require.main===module){const fs=require('fs'),[file,hash]=process.argv.slice(2);if(!file||!hash)throw new Error('Usage: library.json source-sha256');console.log(JSON.stringify(audit(JSON.parse(fs.readFileSync(file)),hash),null,2));}
