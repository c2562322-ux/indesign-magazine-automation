'use strict';
// WIP HANDOFF 2026-09-30: Adobe Host E2E is unverified. See HANDOFF.md NEXT STEP.
// Native fidelity/readback coverage is partial; do not treat this as production-ready.
// Native IDML import preserves source constructs instead of approximating them
// with the v1 coordinate renderer. No original file is opened or written.
const Model=require('./design-model'),Match=require('./design-matching'),Package=require('./package-xml');
const KEY='MagazineStudioSourceRef',local=n=>n.tag.replace(/^\{[^}]+\}/,'');
const clone=x=>JSON.parse(JSON.stringify(x));
function packagePlan(entry){
 const m=entry.original;if(!m.sourceXml||!m.sourceXml['designmap.xml'])throw new Error('원본 IDML XML이 없는 모델입니다. 다시 추출해주세요.');
 if(!entry.profile.readyForMatching)throw new Error('제목/본문/사진 역할을 먼저 확인해주세요.');
 const trees=clone(m.sourceXml),normal=new Set(m.pages.filter(p=>p.kind==='Spread').map(p=>p.id));
 const tagged=new Set([...m.pages.map(p=>p.id),...m.elements.map(e=>e.id)]);
 function tag(n){if(tagged.has(n.attributes&&n.attributes.Self)){
  let p=n.children.find(c=>local(c)==='Properties');if(!p){p={tag:'Properties',attributes:{},text:'',tail:'',children:[]};n.children.unshift(p);}let label=p.children.find(c=>local(c)==='Label');if(!label){label={tag:'Label',attributes:{},text:'',tail:'',children:[]};p.children.push(label);}label.children=label.children.filter(c=>c.attributes.Key!==KEY);label.children.push({tag:'KeyValuePair',attributes:{Key:KEY,Value:n.attributes.Self},text:'',tail:'',children:[]});}
  for(const c of n.children||[])tag(c);
 }
 for(const tree of Object.values(trees))tag(tree);
 // XML trees contain all design properties. Unknown binary package members
 // cannot be reconstructed from the model and therefore block this path.
 const unknown=(m.metadata.packageInventory||[]).filter(x=>!trees[x.name]&&!['mimetype','META-INF/container.xml','META-INF/metadata.xml'].includes(x.name));
 if(unknown.length)throw new Error('원본 바이너리 리소스가 모델에 없어 재현 불가: '+unknown.map(x=>x.name).join(', '));
 const entries=[['mimetype','application/vnd.adobe.indesign-idml-package'],['META-INF/container.xml','<?xml version="1.0" encoding="UTF-8"?><container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0"><rootfiles><rootfile full-path="designmap.xml" media-type="application/vnd.adobe.indesign-idml-package"/></rootfiles></container>'],...Object.entries(trees).filter(([name])=>name!=='META-INF/container.xml'&&name!=='mimetype').map(([name,tree])=>[name,Package.serialize(tree)])];
 return {bytes:Package.zip(entries),sourceHash:m.metadata.sourceSha256,pageIds:entry.descriptor.pageIds.slice(),normalPageIds:[...normal]};
}
function items(collection){if(Array.isArray(collection))return collection;const out=[];for(let i=0;i<collection.length;i++)out.push(collection.item(i));return out;}
function sameEnum(a,b){return a&&typeof a.equals==='function'?a.equals(b):a===b;}
function relative(frame){const p=Array.from(frame.parentPage.bounds,Number),b=Array.from(frame.geometricBounds,Number);return [b[0]-p[0],b[1]-p[1],b[2]-p[0],b[3]-p[1]];}
const fields={...Model.TYPE,...Model.PARA};
function readType(range,ID){const t={};for(const key of Object.keys(fields)){const v=range[fields[key]];if(v!==undefined)t[key]=key==='Leading'&&sameEnum(v,ID.Leading.AUTO)?'Auto':v;}t.AppliedFont=range.appliedFont.fontFamily;t.FontStyle=range.fontStyle;t.Justification=Object.keys(Model.ALIGN).find(k=>sameEnum(range.justification,ID.Justification[Model.ALIGN[k]]));return t;}
function diagnostics(entry,doc,ID){
 const records=[],frames=new Map(),pages=items(doc.pages);for(const page of pages)for(const f of items(page.allPageItems)){const id=f.extractLabel(KEY);if(id)frames.set(id,f);}
 for(const pageId of entry.descriptor.pageIds){const expected=entry.original.pages.find(p=>p.id===pageId),page=pages.find(p=>p.extractLabel(KEY)===pageId);records.push({role:'page',elementId:pageId,comparison:Model.compare({width:expected.width,height:expected.height},page?{width:page.bounds[3]-page.bounds[1],height:page.bounds[2]-page.bounds[0]}:null)});}
 for(const e of entry.original.elements.filter(e=>e.pageCandidates.length===1&&entry.descriptor.pageIds.includes(e.pageCandidates[0]))){
  const f=frames.get(e.id),role=entry.descriptor.roles[e.id]?.role||'keep';if(!f){records.push({role,elementId:e.id,comparison:Model.compare({present:true},{present:false})});continue;}
  const expected={bounds:e.pageBounds[e.pageCandidates[0]]},actual={bounds:relative(f)};
  if(e.textFrame){const pref=Match.framePreferences(entry.original,e).effective;expected.frame={};actual.frame={};for(const [source,key] of Object.entries({TextColumnCount:'textColumnCount',TextColumnGutter:'textColumnGutter',InsetSpacing:'insetSpacing'})){if(pref[source]!==undefined){expected.frame[source]=pref[source];actual.frame[source]=f.textFramePreferences[key];}}
   const story=entry.original.stories.find(s=>s.id===e.textFrame.storyRef);let offset=0;expected.runs=[];actual.runs=[];
   for(const r of story.paragraphs.flatMap(p=>p.runs)){const text=r.tokens.map(t=>t.type==='Content'?t.text:t.type==='Br'?'\r':'').join('');if(!text)continue;if(r.tokens.some(t=>!['Content','Br'].includes(t.type))||/[\uD800-\uDFFF]/.test(text)){expected.unsupported='복합 텍스트 토큰/문자 인덱스';continue;}
    const source=r.resolvedProperties,range=f.parentStory.characters.itemByRange(offset,offset+text.length-1);const got=readType(range,ID),want={};for(const k of [...Object.keys(fields),'AppliedFont','FontStyle','Justification'])if(source[k]!==undefined)want[k]=source[k];expected.runs.push({text,...want});actual.runs.push({text:String(range.contents),...Object.fromEntries(Object.keys(want).map(k=>[k,got[k]]))});offset+=text.length;
   }
  }
  records.push({role,elementId:e.id,original:expected,generated:actual,comparison:Model.compare(expected,actual)});
 }
 return {frames,records,equal:records.every(r=>r.comparison.equal)};
}
function replacementPlan(entry,article){const binding=Match.bindContent(entry,article,{installedFonts:entry.profile.requiredFonts});
 const edits=[];for(const b of binding.content){if(b.storyId){const story=entry.original.stories.find(s=>s.id===b.storyId),runs=story.paragraphs.flatMap(p=>p.runs).filter(r=>r.tokens.some(t=>t.type==='Content'&&t.text));
   if(!runs.length||runs.some(r=>!Model.compare(r.resolvedProperties,runs[0].resolvedProperties).equal))throw new Error(b.role+': 혼합 Typography 콘텐츠 교체는 아직 지원하지 않습니다. 원본 유지');
   const frames=entry.original.elements.filter(e=>e.textFrame&&e.textFrame.storyRef===b.storyId);if(frames.some(e=>e.pageCandidates.length!==1||!entry.descriptor.pageIds.includes(e.pageCandidates[0])))throw new Error('선택 페이지 밖 Story 연결');
   edits.push({...b,elementId:frames[0].id,typography:runs[0].resolvedProperties});
  }else edits.push(b);}
 return edits;
}
async function create(entry,article,{ID,open,guard,inspect,progress=()=>{}}){
 const edits=replacementPlan(entry,article),plan=packagePlan(entry);guard();progress('registered.nativeImport');const doc=await open(plan.bytes);const old=ID.app.scriptPreferences.measurementUnit;
 try{guard();ID.app.scriptPreferences.measurementUnit=ID.MeasurementUnits.POINTS;
  for(const spread of items(doc.spreads))spread.allowPageShuffle=false;
  for(const page of items(doc.pages).reverse()){const id=page.extractLabel(KEY);if(!plan.normalPageIds.includes(id))throw new Error('원본 페이지 식별 실패');if(!plan.pageIds.includes(id))page.remove();}
  doc.recompose();progress('registered.fidelity.original');const baseline=diagnostics(entry,doc,ID),before=inspect(doc);
  const context={doc,baseline,phase:'FIDELITY_FAILED',contentChecks:[],autoFixAllowed:false};
  if(!baseline.equal||before.errors.length){context.failure='원본 재현 검사 실패 · 콘텐츠 미교체 · Auto Fix 금지';return context;}
  // Resolve all destinations before the first content write.
  const targets=edits.map(edit=>{const f=baseline.frames.get(edit.elementId);if(!f)throw new Error('교체 프레임 식별 실패');if(edit.image&&!edit.image.path)throw new Error('Word 이미지 파일 위치 없음');return {edit,f,bounds:relative(f)};});
  for(const {edit,f,bounds} of targets){if(edit.storyId){const story=f.parentStory,first=story.characters.item(0),p=story.paragraphs.item(0),paragraphStyle=p.appliedParagraphStyle,characterStyle=first.appliedCharacterStyle;
    const hostType=readType(first,ID),font=first.appliedFont,fill=first.fillColor;
    story.contents=edit.text.replace(/\r\n?|\n/g,'\r');const text=story.texts.item(0);text.appliedParagraphStyle=paragraphStyle;text.appliedCharacterStyle=characterStyle;text.appliedFont=font;text.fontStyle=hostType.FontStyle;text.fillColor=fill;
    for(const [key,dest] of Object.entries(fields))if(hostType[key]!==undefined)text[dest]=key==='Leading'&&hostType[key]==='Auto'?ID.Leading.AUTO:hostType[key];text.justification=ID.Justification[Model.ALIGN[hostType.Justification]];
    context.contentChecks.push({role:edit.role,elementId:edit.elementId,frame:f,bounds,typography:hostType,text:edit.text.replace(/\r\n?|\n/g,'\r')});
   }else if(edit.image){f.place(edit.image.path);f.fit(ID.FitOptions.APPLY_FRAME_FITTING_OPTIONS);context.contentChecks.push({role:edit.role,elementId:edit.elementId,frame:f,bounds});}
  }
  doc.recompose();context.phase='CONTENT_APPLIED';progress('registered.content.recompose');return context;
 }catch(e){e.registeredDocument=doc;throw e;}finally{ID.app.scriptPreferences.measurementUnit=old;}
}
function check(context,ID){const old=ID.app.scriptPreferences.measurementUnit;try{ID.app.scriptPreferences.measurementUnit=ID.MeasurementUnits.POINTS;const issues=[];
 if(context.phase!=='CONTENT_APPLIED')issues.push({cause:'GENERATOR_MISMATCH',category:'BLOCKING',message:context.failure||'원본 Fidelity 미검증',hint:'원본/생성 비교를 확인해주세요. Auto Fix는 실행하지 않습니다.'});
 for(const c of context.contentChecks){const f=c.frame;let comparison=Model.compare(c.bounds,relative(f));if(c.typography){const got=readType(f.parentStory.texts.item(0),ID);comparison=Model.compare({bounds:c.bounds,typography:c.typography},{bounds:relative(f),typography:got});}
  if(!comparison.equal)issues.push({role:c.role,cause:'GENERATOR_MISMATCH',category:'BLOCKING',message:c.role+' 원본 대비 속성 불일치',detail:JSON.stringify(comparison.differences)});
  else if(c.typography&&f.parentStory.overflows)issues.push({role:c.role,cause:'CONTENT_OVERFLOW',category:'USER_ACTION_REQUIRED',message:c.role+' 새 원고가 원본 프레임 수용량을 초과합니다.',hint:'다른 디자인을 선택하거나 원고 분량을 확인해주세요. 원본 스레드/지면은 늘리지 않습니다.'});
 }
 return issues;
 }finally{ID.app.scriptPreferences.measurementUnit=old;}}
function rebind(context,doc){context.doc=doc;const all=items(doc.allPageItems);for(const c of context.contentChecks){const found=all.find(f=>f.extractLabel(KEY)===c.elementId);if(!found)throw new Error('저장 후 등록 프레임 재연결 실패');c.frame=found;}}
module.exports={KEY,packagePlan,replacementPlan,diagnostics,create,check,rebind};
