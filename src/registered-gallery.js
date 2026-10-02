(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./design-matching'),require('./active-design-set'));else root.MagazineGallery=factory(root.MagazineMatching,root.MagazineActiveSet);})(typeof window!=='undefined'?window:this,function(Match,Guard){
'use strict';
function identity(entry){if(Guard)Guard.assertEntry(entry);const d=entry.descriptor;if(!d.provenance)throw new Error('갤러리 디자인의 원본 출처 정보가 없습니다.');return JSON.stringify({designId:d.id,provenance:d.provenance});}
function describe(entry,article,index){
 const selectedIdentity=identity(entry),assessment=Match.directAssessment(entry,article,{installedFonts:null});
 const blocks=assessment.diagnostics.filter(d=>d.severity==='BLOCK').map(d=>d.message||d.code);
 return {entry,identity:selectedIdentity,name:'디자인 '+String(index+1).padStart(2,'0'),pageCount:entry.descriptor.pageIds.length,imageCount:entry.profile.imageSlots.length,bodyCount:Object.values(entry.descriptor.roles).filter(r=>r.role==='body').length,subtitle:entry.profile.supportedRoles.includes('subtitle'),articleImages:(article.images||[]).length,canProduce:assessment.decision!=='BLOCK',blocks};
}
function assertResult(entry,report,selectedIdentity){
 if(identity(entry)!==selectedIdentity||report?.fidelity?.designId!==entry.descriptor.id||JSON.stringify(report.fidelity.provenance)!==JSON.stringify(entry.descriptor.provenance))throw new Error('GALLERY_RESULT_SOURCE_MISMATCH: 선택한 디자인과 제작 결과의 출처가 다릅니다.');
}
function gate(selected,article){
 const guards={selectedEntry:!!selected?.entry,galleryIdentity:!!selected?.galleryIdentity,sourceIdentity:false,articleUnchanged:false,productionAssessment:false},reasons=[];
 if(!guards.selectedEntry||!guards.galleryIdentity)reasons.push('GALLERY_SELECTION_REQUIRED: 갤러리에서 디자인을 선택해주세요.');
 if(guards.selectedEntry&&guards.galleryIdentity){try{guards.sourceIdentity=identity(selected.entry)===selected.galleryIdentity;if(!guards.sourceIdentity)reasons.push('GALLERY_IDENTITY_CHANGED: 선택한 디자인 출처가 변경됐습니다.');}catch(e){reasons.push(String(e.message));}guards.articleUnchanged=JSON.stringify(article)===selected.articleSignature;if(!guards.articleUnchanged)reasons.push('GALLERY_ARTICLE_CHANGED: 원고가 변경됐습니다. 갤러리를 다시 열어 선택해주세요.');try{const info=describe(selected.entry,article,0);guards.productionAssessment=info.canProduce;reasons.push(...info.blocks);}catch(e){reasons.push(String(e.message));}}
 return {allowed:Object.values(guards).every(Boolean),guards,reasons};
}
return {identity,describe,assertResult,gate};
});
