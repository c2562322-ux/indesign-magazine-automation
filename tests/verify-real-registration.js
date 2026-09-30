'use strict';
// Opt-in: private extracted models are never committed. No semantic role confirmation.
const fs=require('node:fs'),assert=require('node:assert/strict'),R=require('../src/design-registration'),Match=require('../src/design-matching');
const article=Match.parseArticle('article.docx',fs.readFileSync('sample/article-eye-clinic-with-photo.docx')).article;
for(const file of process.argv.slice(2)){
 const model=JSON.parse(fs.readFileSync(file)),before=JSON.stringify(model),entries=[];
 let explicit=0,keep=0,pending=0;
 for(const page of model.pages.filter(p=>p.kind==='Spread')){
  const d=R.draft(model,page.id);
  for(const frame of R.frames(model,page.id)){const c=R.candidates(model,frame)[0];assert.ok(Number.isFinite(c.confidence));assert.ok(c.reason);if(c.confirmed){if(c.role==='keep')keep++;else explicit++;}else pending++;}
  const entry=R.register(model,d);assert.equal(entry.fidelity.productionReady,false);entries.push(entry);
 }
 const result=R.recommendations(entries,article,null);assert.equal(result.selectedId,null);assert.equal(JSON.stringify(model),before);
 console.log(JSON.stringify({sourceHash:model.metadata.sourceSha256,pages:entries.length,explicit,keep,pending,candidates:result.candidates.length,review:result.reviewRequired.length,excluded:result.excluded.length,unchanged:true}));
}
