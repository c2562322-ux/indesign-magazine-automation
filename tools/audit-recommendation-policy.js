// Read-only audit: no source, Library, DOCX or Adobe approval is modified.
'use strict';
const R=require('../src/design-registration'),M=require('../src/design-matching'),N=require('../src/registered-native');
function audit(library,article){
 const entries=R.unpack(library);if(entries.errors.length)throw new Error(entries.errors.join('; '));
 const all=entries.entries.map(e=>R.register(e.original,{...e.descriptor,capability:N.support(e)}));
 const superseded=new Set(all.flatMap(e=>[e.descriptor.revisionOf?.designId,...(e.descriptor.supersedesDesignIds||[])]).filter(Boolean));
 // Offline audit assumes required fonts installed; actual UI queries Adobe fonts.
 const fonts=all.flatMap(e=>e.profile.requiredFonts),rows=all.map(e=>{
  const cap=e.descriptor.capability,blocks=[...e.profile.issues,...cap.fidelityReasons,...cap.productionReasons];
  const evaluation=article?M.productionAssessment(e,article,{installedFonts:fonts}):null;
  const before=article?M.evaluate(e,article,{installedFonts:fonts}):null;
  return {id:e.id,name:e.profile.name,pageIds:e.descriptor.pageIds,active:!superseded.has(e.id),imageSlots:e.profile.imageSlots.map(s=>({role:s.role,requirement:s.requirement})),staticDecision:blocks.length?'BLOCK':'INFO',staticReasons:blocks,evaluation,before};
 });
 const count=rs=>Object.fromEntries(['BLOCK','WARN','INFO'].map(s=>[s,rs.filter(r=>(r.evaluation?.decision||r.staticDecision)===s).length]));
 const groups=new Map();for(const r of rows)for(const d of r.evaluation?.diagnostics||r.staticReasons.map(message=>({severity:'BLOCK',code:'STATIC_SUPPORT',message}))){
  const key=d.severity+' '+d.code+' '+d.message.replace(/: u[0-9a-f]+/g,': <source>');if(!groups.has(key))groups.set(key,{severity:d.severity,code:d.code,message:d.message,designIds:[]});const g=groups.get(key);if(!g.designIds.includes(r.id))g.designIds.push(r.id);
 }
 return {schema:'magazine-recommendation-policy-audit/v1',fontAssumption:'Required fonts assumed installed; Adobe UI checks actual fonts',articleProfile:article?M.articleProfile(article):null,total:rows.length,active:rows.filter(r=>r.active).length,counts:count(rows),activeCounts:count(rows.filter(r=>r.active)),groups:[...groups.values()].map(g=>({...g,count:g.designIds.length})),rows};
}
module.exports={audit};
if(require.main===module){const fs=require('fs'),[file,docx]=process.argv.slice(2);if(!file)throw new Error('Usage: library.json [article.docx]');const article=docx?M.parseArticle(docx,fs.readFileSync(docx)).article:null;console.log(JSON.stringify(audit(JSON.parse(fs.readFileSync(file)),article),null,2));}
