'use strict';
// Offline registration metadata. No static signature grants Adobe approval.
const crypto=require('crypto'),R=require('../src/design-registration'),N=require('../src/registered-native');
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');
function pageSets(model){
 const pages=model.pages.filter(p=>p.kind==='Spread'),parent=new Map(pages.map(p=>[p.id,p.id]));
 const find=id=>parent.get(id)===id?id:find(parent.get(id));
 const join=ids=>{ids=ids.filter(id=>parent.has(id));for(const id of ids.slice(1))parent.set(find(id),find(ids[0]));};
 for(const e of model.elements)join(e.pageCandidates);
 // Unassigned pasteboard/shared furniture requires its complete source Spread.
 for(const e of model.elements)if(!e.pageCandidates.length&&e.type!=='Group')join(pages.filter(p=>p.spreadId===e.spreadId).map(p=>p.id));
 for(const e of model.elements.filter(e=>e.type==='Group'))join(model.elements.filter(c=>c.groupId===e.id).flatMap(c=>c.pageCandidates));
 const stories=new Map();for(const e of model.elements)if(e.textFrame){const id=e.textFrame.storyRef;stories.set(id,(stories.get(id)||[]).concat(e.pageCandidates));}
 for(const ids of stories.values())join(ids);
 const sets=new Map();for(const p of pages){const key=find(p.id);sets.set(key,(sets.get(key)||[]).concat(p.id));}
 return [...sets.values()];
}
function fingerprint(model,pageIds,contentPolicy={}){
 // Source identity validates the contract at registration; it is not a page
 // dependency. A change elsewhere in the package must not invalidate this page.
 contentPolicy={...contentPolicy};if(contentPolicy.contentContract){const {sourceSha256,...semantic}=contentPolicy.contentContract;contentPolicy.contentContract=semantic;}
 const pages=model.pages.filter(p=>pageIds.includes(p.id)),parents=new Set(pages.map(p=>p.parentRef).filter(x=>x&&x!=='n'));
 const parentPages=model.pages.filter(p=>parents.has(p.spreadId)),scope=new Set(pageIds.concat(parentPages.map(p=>p.id)));
 const elements=model.elements.filter(e=>e.pageCandidates.some(id=>scope.has(id))||e.type==='Group'&&model.elements.some(c=>c.groupId===e.id&&c.pageCandidates.some(id=>scope.has(id))));
 const ids=new Set(elements.filter(e=>e.textFrame).map(e=>e.textFrame.storyRef)),stories=model.stories.filter(s=>ids.has(s.id));
 const styleRefs=new Set(elements.map(e=>e.objectStyleRef));for(const s of stories)for(const p of s.paragraphs){styleRefs.add(p.styleRef);for(const r of p.runs)styleRefs.add(r.styleRef);}
 const allStyles=Object.values(model.styles).flat();let added=true;while(added){added=false;for(const s of allStyles)if(styleRefs.has(s.id)&&s.properties?.BasedOn&&!styleRefs.has(s.properties.BasedOn)){styleRefs.add(s.properties.BasedOn);added=true;}}
 const styles=allStyles.filter(s=>styleRefs.has(s.id));
 const evidence={pages:pages.concat(parentPages).map(({documentIndex,index,...p})=>p),elements,stories,styles,layers:model.layers.filter(l=>elements.some(e=>e.layerRef===l.id))};
 let encoded=JSON.stringify(evidence),colors=[],grew=true;while(grew){grew=false;for(const c of model.colors)if(!colors.includes(c)&&encoded.includes(JSON.stringify(c.id))){colors.push(c);encoded+=JSON.stringify(c);grew=true;}}
 const fonts=model.fonts.filter(f=>stories.some(s=>s.paragraphs.some(p=>p.runs.some(r=>r.resolvedProperties.AppliedFont===f.family&&r.resolvedProperties.FontStyle===f.style))));
 return hash({...evidence,colors,fonts,contentPolicy});
}
function changes(previous,next){
 const old=new Map(previous.map(d=>[d.pageSet.id,d])),current=new Set(next.map(d=>d.pageSet.id));
 return next.map(d=>({id:d.pageSet.id,state:!old.has(d.pageSet.id)?'ADDED':old.get(d.pageSet.id).pageSet.fingerprint===d.pageSet.fingerprint?'UNCHANGED':'CHANGED'})).concat(previous.filter(d=>!current.has(d.pageSet.id)).map(d=>({id:d.pageSet.id,state:'REMOVED'})));
}
function register(model,{setId,version,previous=[]}){
 if(!setId||!version)throw new Error('Explicit stable design-set identity and version required');
 const entries=[];
 for(const pageIds of pageSets(model)){
  const proposals=pageIds.map(id=>R.autoDraft(model,id)),d={...proposals[0],pageIds,roles:{},images:{},preserveElementIds:[],mappingReview:[],bodyFlow:[]};
  for(const p of proposals){Object.assign(d.roles,p.roles);Object.assign(d.images,p.images);d.preserveElementIds.push(...p.preserveElementIds);d.mappingReview.push(...p.mappingReview);}
  let image=0;for(const p of proposals)for(const [id,r] of Object.entries(p.roles))if(/^image/.test(r.role))d.roles[id]={...r,role:'image'+(++image)};
  d.preserveElementIds=[...new Set(d.preserveElementIds)];
  for(const role of ['title','subtitle','caption']){const ids=Object.keys(d.roles).filter(id=>d.roles[id].role===role);const stories=new Set(ids.map(id=>model.elements.find(e=>e.id===id).textFrame.storyRef));if(stories.size>1)d.mappingReview.push('page-set '+role+' 복수 콘텐츠 의미 확인 필요');}
  d.bodyFlow=[...new Set(Object.keys(d.roles).filter(id=>d.roles[id].role==='body').map(id=>model.elements.find(e=>e.id===id).textFrame.storyRef))];
  const stableId=setId+':'+pageIds.slice().sort().join('+');d.id=stableId+'@'+version;d.designSet={id:setId,version,active:true};d.imageMatching='minimum-crop/v1';d.pageSet={id:stableId,pageIds:pageIds.slice(),fingerprint:fingerprint(model,pageIds,{roles:d.roles,images:d.images,bodyFlow:d.bodyFlow,imageMatching:d.imageMatching}),fingerprintVersion:1};
  const tables=model.issues.filter(i=>i.code==='COMPLEX_STORY_TOKEN'&&model.elements.some(e=>e.textFrame?.storyRef===i.ref&&e.pageCandidates.some(id=>pageIds.includes(id))));
  if(tables.length)d.mappingReview.push('복합 Story/Table의 PRESERVE 또는 CONTENT 의미 및 Host 검증 필요');
  d.mappingReview=[...new Set(d.mappingReview)];const contracted=R.contentContract(model,d);Object.assign(d,contracted);if(!contracted.contentContract)delete d.contentContract;d.pageSet.fingerprint=fingerprint(model,pageIds,{roles:d.roles,images:d.images,bodyFlow:d.bodyFlow,imageMatching:d.imageMatching,contentContract:d.contentContract});d.capability=N.support(R.register(model,d));if(model.metadata.sourceFilename)d.provenance={designSetId:setId,designSetVersion:version,sourceFilename:model.metadata.sourceFilename,sourceSha256:model.metadata.sourceSha256,sourcePageIds:pageIds.slice(),sourceSpreadIds:[...new Set(model.pages.filter(p=>pageIds.includes(p.id)).map(p=>p.spreadId))],pageSetId:d.pageSet.id,fingerprint:d.pageSet.fingerprint};entries.push(R.register(model,d));
 }
 const descriptors=entries.map(e=>e.descriptor);return {library:R.pack(entries),entries,changes:changes(previous,descriptors)};
}
module.exports={pageSets,fingerprint,changes,register};
