/* Opt-in comparison of private extracted models; source contents never printed. */
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),M=require('../src/design-model'),P=require('../src/design-matching');
const files=process.argv.slice(2);assert.ok(files.length>=2,'Provide at least two extracted original models');
const summaries=files.map((file,index)=>{
    const model=JSON.parse(fs.readFileSync(file,'utf8')),before=JSON.stringify(model);assert.deepEqual(M.validate(model),[]);
    const frames=model.elements.filter(e=>e.textFrame),capacities=frames.map(e=>P.capacity(model,e)).filter(c=>c.known);
    const entries=model.pages.filter(p=>p.kind==='Spread').map(p=>P.libraryEntry(model,{id:index+'-'+p.id,sourceSha256:model.metadata.sourceSha256,pageIds:[p.id]}));
    const article=P.parseArticle('sample.docx',fs.readFileSync('sample/article-eye-clinic-with-photo.docx'));
    const ranking=P.rank(entries,article.profile);assert.equal(ranking.selectedId,null);
    if(!model.elements.some(e=>e.role.confirmed))assert.equal(ranking.candidates.length,0);
    assert.equal(JSON.stringify(model),before);
    return {source:model.metadata.sourceSha256,pages:entries.length,placedImageFrames:model.elements.filter(e=>e.image.length).length,
        largestFrameEstimate:Math.max(...capacities.map(c=>c.estimatedCharacters.high)),knownFrameEstimates:capacities.length,
        reviewRequired:ranking.reviewRequired.length,excluded:ranking.excluded.length};
});
assert.ok(new Set(summaries.map(s=>s.source)).size>1,'Sources must differ');
assert.ok(new Set(summaries.map(s=>s.largestFrameEstimate+':'+s.placedImageFrames)).size>1,'Structural capabilities must differ');
console.log(JSON.stringify({passed:true,summaries},null,2));
