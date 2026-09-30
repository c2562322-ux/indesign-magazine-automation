'use strict';
// WIP HANDOFF 2026-09-30: Adobe Host E2E is unverified. See HANDOFF.md NEXT STEP.
// Native fidelity/readback coverage is partial; do not treat this as production-ready.
// Native IDML import preserves source constructs instead of approximating them
// with the v1 coordinate renderer. No original file is opened or written.
const Model=require('./design-model'),Match=require('./design-matching'),Package=require('./package-xml'),IDML=require('./idml-package'),F=require('./registered-fidelity'),Trace=require('./registered-dom-trace');
const KEY='MagazineStudioSourceRef',local=n=>n.tag.replace(/^\{[^}]+\}/,'');
const clone=x=>JSON.parse(JSON.stringify(x));
function validatePageStories(entry){
 const selected=new Set(entry.descriptor.pageIds),stories=new Map();
 const spreads=new Set(entry.original.pages.filter(p=>selected.has(p.id)).map(p=>p.spreadId));
 for(const e of entry.original.elements){
  const children=entry.original.elements.filter(c=>c.groupId===e.id);
  const removedGroup=e.type==='Group'&&children.length&&children.every(c=>c.pageCandidates.length===1&&!selected.has(c.pageCandidates[0]));
  if((e.pageCandidates.some(id=>selected.has(id))&&e.pageCandidates.length!==1)||(!e.pageCandidates.length&&spreads.has(e.spreadId)&&!removedGroup))throw new Error('UNSUPPORTED 페이지 귀속/공유 객체: '+e.id);
 }
 for(const e of entry.original.elements){if(!e.textFrame)continue;const id=e.textFrame.storyRef;if(!stories.has(id))stories.set(id,[]);stories.get(id).push(e);}
 for(const frames of stories.values()){
  if(!frames.some(e=>e.pageCandidates.some(id=>selected.has(id))))continue;
  if(frames.some(e=>e.pageCandidates.length!==1||!selected.has(e.pageCandidates[0])))throw new Error('선택 페이지 밖 Story 연결 · 고정 콘텐츠를 포함한 원본 유지');
 }
}
function packagePlan(entry){
 validatePageStories(entry);
 const m=entry.original;if(!m.sourceXml||!m.sourceXml['designmap.xml'])throw new Error('원본 IDML XML이 없는 모델입니다. 다시 추출해주세요.');
 const unsupported=(m.issues||[]).filter(i=>['MISSING_STYLE','STYLE_CYCLE','DUPLICATE_STYLE','UNMODELED_SPREAD_OBJECT'].includes(i.code));
 if(unsupported.length)throw new Error('UNSUPPORTED 원본 참조/객체: '+unsupported.map(i=>i.code+' '+i.ref).join(', '));
 if(!entry.profile.readyForMatching)throw new Error('제목/본문/사진 역할을 먼저 확인해주세요.');
 const trees=clone(m.sourceXml),normal=new Set(m.pages.filter(p=>p.kind==='Spread').map(p=>p.id));
 const tagged=new Set([...m.spreads.map(p=>p.id),...m.pages.map(p=>p.id),...m.stories.map(s=>s.id),...m.elements.map(e=>e.id)]);
 function tag(n){if(tagged.has(n.attributes&&n.attributes.Self)){
  let p=n.children.find(c=>local(c)==='Properties');if(!p){p={tag:'Properties',attributes:{},text:'',tail:'',children:[]};n.children.unshift(p);}let label=p.children.find(c=>local(c)==='Label');if(!label){label={tag:'Label',attributes:{},text:'',tail:'',children:[]};p.children.push(label);}label.children=label.children.filter(c=>c.attributes.Key!==KEY);label.children.push({tag:'KeyValuePair',attributes:{Key:KEY,Value:n.attributes.Self},text:'',tail:'',children:[]});}
  for(const c of n.children||[])tag(c);
 }
 for(const tree of Object.values(trees))tag(tree);
 // XML trees contain all design properties. Unknown binary package members
 // cannot be reconstructed from the model and therefore block this path.
 const unknown=(m.metadata.packageInventory||[]).filter(x=>!trees[x.name]&&!['mimetype','META-INF/container.xml'].includes(x.name));
 if(unknown.length)throw new Error('원본 바이너리 리소스가 모델에 없어 재현 불가: '+unknown.map(x=>x.name).join(', '));
 const entries=[['mimetype','application/vnd.adobe.indesign-idml-package'],['META-INF/container.xml','<?xml version="1.0" encoding="UTF-8"?><container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0"><rootfiles><rootfile full-path="designmap.xml" media-type="application/vnd.adobe.indesign-idml-package"/></rootfiles></container>'],...Object.entries(trees).filter(([name])=>name!=='META-INF/container.xml'&&name!=='mimetype').map(([name,tree])=>[name,name==='designmap.xml'?IDML.designmap(tree,m.metadata.aidProcessingInstruction):Package.serialize(tree)])];
 const bytes=Package.zip(entries),validation=IDML.validate(bytes);
 return {bytes,validation,packagingNotes:m.metadata.aidProcessingInstruction===undefined?['Legacy model omitted processing instructions; standard IDML document aid declaration restored (not a typography fallback).']:[],sourceHash:m.metadata.sourceSha256,pageIds:entry.descriptor.pageIds.slice(),normalPageIds:[...normal]};
}
function items(collection){if(Array.isArray(collection))return collection;const out=[];for(let i=0;i<collection.length;i++)out.push(collection.item(i));return out;}
function sameEnum(a,b){return a&&typeof a.equals==='function'?a.equals(b):a===b;}
function relative(frame){const p=Array.from(frame.parentPage.bounds,Number),b=Array.from(frame.geometricBounds,Number);return [b[0]-p[0],b[1]-p[1],b[2]-p[0],b[3]-p[1]];}
const fields={...Model.TYPE,...Model.PARA,
 KeepAllLinesTogether:'keepAllLinesTogether',KeepWithNext:'keepWithNext',KeepFirstLines:'keepFirstLines',KeepLastLines:'keepLastLines',KeepLinesTogether:'keepLinesTogether',KeepWithPrevious:'keepWithPrevious',
 RuleAbove:'ruleAbove',RuleBelow:'ruleBelow',RuleAboveLineWeight:'ruleAboveLineWeight',RuleBelowLineWeight:'ruleBelowLineWeight',
 DesiredWordSpacing:'desiredWordSpacing',MinimumWordSpacing:'minimumWordSpacing',MaximumWordSpacing:'maximumWordSpacing',
 DesiredLetterSpacing:'desiredLetterSpacing',MinimumLetterSpacing:'minimumLetterSpacing',MaximumLetterSpacing:'maximumLetterSpacing',
 DesiredGlyphScaling:'desiredGlyphScaling',MinimumGlyphScaling:'minimumGlyphScaling',MaximumGlyphScaling:'maximumGlyphScaling'};
function canonical(key,value){return key==='KerningMethod'&&typeof value==='string'?value.replace(/^\$ID\//,''):value;}
function readType(range,ID){const t={};for(const key of Object.keys(fields)){const v=range[fields[key]];if(v!==undefined)t[key]=canonical(key,key==='Leading'&&sameEnum(v,ID.Leading.AUTO)?'Auto':v);}t.AppliedFont=range.appliedFont.fontFamily;t.FontStyle=range.fontStyle;t.Justification=Object.keys(Model.ALIGN).find(k=>sameEnum(range.justification,ID.Justification[Model.ALIGN[k]]));return t;}
function diagnostics(entry,doc,ID,{ignoreStories=[]}={}){
 const records=[],frames=new Map(),pages=items(doc.pages);
 const record=(role,id,expected,actual,error=null)=>records.push({role,elementId:id,original:expected,generated:actual,comparison:Model.compare(expected,actual),readbackFailure:error?{operation:'registered.fidelity.readback',property:error.registeredFailure&&error.registeredFailure.property||null,message:String(error.message),code:Number.isInteger(error.number)?error.number:null}:null});
 for(const page of pages)for(const f of items(page.allPageItems)){const id=f.extractLabel(KEY);if(id){if(frames.has(id))record('reference',id,{unique:true},{unique:false});frames.set(id,f);}}
 record('page-count','document',{count:entry.descriptor.pageIds.length},{count:pages.length});
 for(const pageId of entry.descriptor.pageIds){const expected=entry.original.pages.find(p=>p.id===pageId),page=pages.find(p=>p.extractLabel(KEY)===pageId);record('page',pageId,{width:expected.width,height:expected.height},page?{width:page.bounds[3]-page.bounds[1],height:page.bounds[2]-page.bounds[0]}:null);}
 for(const e of entry.original.elements.filter(e=>e.pageCandidates.length===1&&entry.descriptor.pageIds.includes(e.pageCandidates[0]))){
  const f=frames.get(e.id),role=entry.descriptor.roles[e.id]?.role||'keep';if(!f){record(role,e.id,{present:true},{present:false});continue;}
  try{
   const expected={bounds:e.pageBounds[e.pageCandidates[0]],page:e.pageCandidates[0]},actual={bounds:relative(f),page:F.ref(f.parentPage)};
   const props=F.objectProperties(entry.original,e);expected.appearance={};actual.appearance={};
   for(const [key,v] of Object.entries(props)){expected.appearance[key]=/Color$/.test(key)?F.colorExpected(entry.original,v):v;const inactive=(key==='FillTint'&&props.FillColor==='Swatch/None'&&F.noPaint(f.fillColor,doc))||(key==='StrokeTint'&&(props.StrokeColor==='Swatch/None'||props.StrokeWeight===0)&&(F.noPaint(f.strokeColor,doc)||f.strokeWeight===0));if(inactive){expected.appearance[key]=F.na('source and generated paint inactive');actual.appearance[key]=F.na('source and generated paint inactive');continue;}const got=f[key[0].toLowerCase()+key.slice(1)];actual.appearance[key]=/Color$/.test(key)?F.colorActual(got,ID,doc):got;}
   // Fixed placed graphics are retained by the native importer. Unsupported
   // clipping/effects cannot be certified by bounds alone.
   expected.graphicCount=(e.image||[]).length;actual.graphicCount=F.list(f.allGraphics).length;
   if(ignoreStories.includes('image:'+e.id)){delete expected.graphicCount;delete actual.graphicCount;}
   const fitting=e.details&&e.details.FrameFittingOption||{};expected.crop={};actual.crop={};
   if(!ignoreStories.includes('image:'+e.id))for(const k of ['LeftCrop','TopCrop','RightCrop','BottomCrop'])if(fitting[k]!==undefined){expected.crop[k]=fitting[k];actual.crop[k]=f.frameFittingOptions&&f.frameFittingOptions[k[0].toLowerCase()+k.slice(1)];}
   const unsupported=[];
   if((e.image||[]).length)unsupported.push('fixed graphic source transform/color readback');
   for(const [k,v] of Object.entries(e.details||{}))if(/Transparency|Shadow|Glow|Feather|Bevel|Satin/.test(k))unsupported.push(k);
   for(const g of e.image||[])if(g.details&&Object.keys(g.details).some(k=>/Clipping|Transparency/.test(k)))unsupported.push('graphic clipping/transparency');
   if(unsupported.length){expected.supported=true;actual.supported='UNSUPPORTED: '+unsupported.join(', ');}
   if(e.textFrame){
    expected.story=e.textFrame.storyRef;actual.story=F.ref(f.parentStory);
    const pref=Match.framePreferences(entry.original,e).effective;expected.frame={};actual.frame={};
    for(const [source,key] of Object.entries({TextColumnCount:'textColumnCount',TextColumnGutter:'textColumnGutter',InsetSpacing:'insetSpacing'})){
     expected.frame[source]=pref[source]===undefined?'SOURCE_UNRESOLVED':pref[source];actual.frame[source]=f.textFramePreferences[key];
    }
    expected.previous=e.textFrame.previousRef==='n'?null:e.textFrame.previousRef||null;actual.previous=F.ref(f.previousTextFrame);
    expected.next=e.textFrame.nextRef==='n'?null:e.textFrame.nextRef||null;actual.next=F.ref(f.nextTextFrame);
    const story=entry.original.stories.find(s=>s.id===e.textFrame.storyRef);let offset=0;expected.runs=[];actual.runs=[];
    if(!ignoreStories.includes(story.id))for(const p of story.paragraphs)for(const r of p.runs){
     const text=r.tokens.map(t=>t.type==='Content'?t.text:t.type==='Br'?'\r':'').join('');
     if(r.tokens.some(t=>!['Content','Br'].includes(t.type))||/[\uD800-\uDFFF]/.test(text)){expected.unsupported='UNSUPPORTED 복합 텍스트 토큰/문자 인덱스';continue;}if(!text)continue;
     const source=r.resolvedProperties,range=f.parentStory.characters.itemByRange(offset,offset+text.length-1),got=readType(range,ID),want={};
     for(const k of [...Object.keys(fields),'AppliedFont','FontStyle','Justification'])if(source[k]!==undefined)want[k]=canonical(k,source[k]);
     for(const k of ['AppliedFont','FontStyle','PointSize','Leading','Tracking','Justification','SpaceBefore','SpaceAfter'])if(source[k]===undefined)want[k]='SOURCE_UNRESOLVED';
     if(source.Leading==='Auto'&&!Number.isFinite(source.AutoLeading))want.AutoLeading='SOURCE_UNRESOLVED';
     const direct=F.directCompare(range,{...p.properties,...r.properties},ID);
     const colorsExpected={},colorsActual={};for(const key of ['FillColor','StrokeColor'])if(source[key]!==undefined){colorsExpected[key]=F.colorExpected(entry.original,source[key]);colorsActual[key]=F.colorActual(range[key[0].toLowerCase()+key.slice(1)],ID,doc);}
     expected.runs.push({text,...want,direct:direct.expected,colors:colorsExpected});actual.runs.push({text:String(range.contents),...Object.fromEntries(Object.keys(want).map(k=>[k,got[k]])),direct:direct.actual,colors:colorsActual});offset+=text.length;
    }
   }
   record(role,e.id,expected,actual);
  }catch(error){record(role,e.id,{readback:'supported'},{readback:'UNSUPPORTED: '+error.message},error);}
 }
 return {frames,records,equal:records.every(r=>r.comparison.equal),fallbacks:[]};
}
function replacementPlan(entry,article){const binding=Match.bindContent(entry,article,{installedFonts:entry.profile.requiredFonts});
 const edits=[];for(const b of binding.content){if(b.storyId){const story=entry.original.stories.find(s=>s.id===b.storyId),runs=story.paragraphs.flatMap(p=>p.runs);
   if(!runs.length||runs.some(r=>r.tokens.some(t=>!['Content','Br'].includes(t.type))||!Model.compare(r.resolvedProperties,runs[0].resolvedProperties).equal||r.styleRef!==runs[0].styleRef||!Model.compare(r.properties,runs[0].properties).equal)||story.paragraphs.some(p=>p.styleRef!==story.paragraphs[0].styleRef||!Model.compare(p.properties,story.paragraphs[0].properties).equal))throw new Error(b.role+': 혼합 Typography 콘텐츠 교체는 아직 지원하지 않습니다. 원본 유지');
   const frames=entry.original.elements.filter(e=>e.textFrame&&e.textFrame.storyRef===b.storyId);if(frames.some(e=>e.pageCandidates.length!==1||!entry.descriptor.pageIds.includes(e.pageCandidates[0])))throw new Error('선택 페이지 밖 Story 연결');
   edits.push({...b,elementId:frames[0].id,typography:runs[0].resolvedProperties,paragraphOverrides:story.paragraphs[0].properties,characterOverrides:runs[0].properties});
  }else edits.push(b);}
 return edits;
}
async function create(entry,article,{ID,open,guard,inspect,progress=()=>{},mode='production'}){
 const plan=packagePlan(entry);guard();progress('registered.nativeImport');const doc=await open(plan.bytes);const old=ID.app.scriptPreferences.measurementUnit;
 let failure;
 const operation=(name,o,p,v,fn)=>Trace.run(progress,name,o,p,v,fn);
 progress('registered.document.acquired '+JSON.stringify(Trace.identity(doc)));
 try{guard();operation('registered.units.set',ID.app.scriptPreferences,'measurementUnit',String(ID.MeasurementUnits.POINTS),()=>{ID.app.scriptPreferences.measurementUnit=ID.MeasurementUnits.POINTS;});
  const pages=operation('registered.pageReferences.acquire',doc,'pages',undefined,()=>items(doc.pages)),ids=pages.map(p=>operation('registered.pageReferences.identity',p,'extractLabel',KEY,()=>p.extractLabel(KEY)));
  operation('registered.pageReferences.validate',doc,'page source IDs',plan.normalPageIds,()=>{if(ids.length!==plan.normalPageIds.length||new Set(ids).size!==ids.length||ids.some(id=>!plan.normalPageIds.includes(id)))throw new Error('원본 페이지 수/식별 실패: '+JSON.stringify(ids));});
  progress('registered.pageReferences.beforeCleanup.start');const beforeTrim=F.capture(doc,plan.pageIds,progress,ID);
  progress('registered.pageReferences.beforeCleanup.success');
  progress('registered.cleanup.start');
  for(const spread of operation('registered.cleanup.spreads.acquire',doc,'spreads',undefined,()=>items(doc.spreads))){
   const shuffle=operation('registered.cleanup.shuffle.read',spread,'allowPageShuffle',undefined,()=>spread.allowPageShuffle);
   // Avoid a needless native setter when the imported spread already has this value.
   if(shuffle!==false)operation('registered.cleanup.shuffle.set',spread,'allowPageShuffle',false,()=>{spread.allowPageShuffle=false;});
  }
  for(const page of pages.slice().reverse())if(!plan.pageIds.includes(operation('registered.cleanup.page.identity',page,'extractLabel',KEY,()=>page.extractLabel(KEY))))operation('registered.cleanup.page.remove',page,'remove()',null,()=>page.remove());
  operation('registered.cleanup.recompose',doc,'recompose()',null,()=>doc.recompose());progress('registered.cleanup.success');
  progress('registered.fidelity.start');const baseline=diagnostics(entry,doc,ID),before=inspect(doc),snapshot=F.capture(doc,plan.pageIds,progress,ID);
  const trimming=F.preservation(beforeTrim,snapshot);
  baseline.records.push({role:'page-cleanup',elementId:'references',comparison:trimming});baseline.equal=baseline.equal&&trimming.equal;
  progress('registered.fidelity.completed '+JSON.stringify({equal:baseline.equal,originalErrors:before.errors.length}));
  const context={doc,entry,baseline,snapshot,notApplicable:F.applicability(snapshot),packageValidation:plan.validation,packagingNotes:plan.packagingNotes,phase:'FIDELITY_FAILED',contentChecks:[],edits:[],autoFixAllowed:false,proofOnly:mode==='proof',originalInspection:before};
  if(!baseline.equal||before.errors.length){context.failure='원본 재현 검사 실패 · 콘텐츠 미교체 · Auto Fix 금지';return context;}
  context.phase='FIDELITY_PASSED';if(mode==='proof')return context;
  progress('registered.content.plan.start');const edits=replacementPlan(entry,article);context.edits=edits;progress('registered.content.plan.success '+JSON.stringify(edits.map(e=>({role:e.role,elementId:e.elementId,storyId:e.storyId,characters:e.text&&e.text.length,image:e.image&&{source:e.image.source,widthPx:e.image.widthPx,heightPx:e.image.heightPx,documentOrder:e.image.documentOrder}}))));
  // Read every destination and direct override before the first write.
  const targets=edits.map(edit=>{
   const f=baseline.frames.get(edit.elementId);if(!f)throw new Error('교체 프레임 식별 실패');if(edit.image&&!edit.image.path)throw new Error('Word 이미지 파일 위치 없음');
   const target={edit,f,bounds:relative(f)};
   if(edit.storyId){const first=f.parentStory.characters.item(0),para=f.parentStory.paragraphs.item(0);Object.assign(target,{paragraphStyle:para.appliedParagraphStyle,characterStyle:first.appliedCharacterStyle,paragraph:F.directSnapshot(para,edit.paragraphOverrides),character:F.directSnapshot(first,edit.characterOverrides),hostType:readType(first,ID)});}
   if(edit.image){target.fitting={};for(const k of F.FIT){const v=f.frameFittingOptions&&f.frameFittingOptions[k];if(v===undefined)throw new Error('UNSUPPORTED 이미지 fitting readback: '+k);target.fitting[k]=v;}}
   return target;
  });
  for(const target of targets){const {edit,f,bounds}=target;guard();
   if(edit.storyId){const story=f.parentStory;operation('registered.content.'+edit.role+'.replace',story,'contents',{characters:edit.text.length},()=>{story.contents=edit.text.replace(/\r\n?|\n/g,'\r');});const text=story.texts.item(0);
    text.appliedParagraphStyle=target.paragraphStyle;text.appliedCharacterStyle=target.characterStyle;
    // Restore only explicit source overrides, using native values captured
    // before replacement. Style inheritance is left in the imported styles.
    F.restore(text,target.paragraph);F.restore(text,target.character);
    context.contentChecks.push({role:edit.role,elementId:edit.elementId,frame:f,bounds,typography:target.hostType,overrides:{...target.paragraph,...target.character},text:edit.text.replace(/\r\n?|\n/g,'\r')});
   }else if(edit.image){
    operation('registered.content.'+edit.role+'.place',f,'place()',{source:edit.image.source,widthPx:edit.image.widthPx,heightPx:edit.image.heightPx},()=>f.place(edit.image.path));F.restore(f.frameFittingOptions,target.fitting);operation('registered.content.'+edit.role+'.fit',f,'fit()','APPLY_FRAME_FITTING_OPTIONS',()=>f.fit(ID.FitOptions.APPLY_FRAME_FITTING_OPTIONS));F.restore(f.frameFittingOptions,target.fitting);
    context.contentChecks.push({role:edit.role,elementId:edit.elementId,frame:f,bounds,imagePath:edit.image.path,imageMetadata:{documentOrder:edit.image.documentOrder,widthPx:edit.image.widthPx,heightPx:edit.image.heightPx,aspectRatio:edit.image.aspectRatio,orientation:edit.image.orientation},fitting:F.read(target.fitting,F.FIT),imageGeometry:F.frameSnapshot(f,undefined,doc,ID).graphics});
   }
  }
  operation('registered.content.recompose',doc,'recompose()',null,()=>doc.recompose());context.phase='CONTENT_APPLIED';progress('registered.content.inspection.ready');return context;
 }catch(e){failure=e;e.registeredDocument=doc;throw e;}finally{try{operation('registered.units.restore',ID.app.scriptPreferences,'measurementUnit',String(old),()=>{ID.app.scriptPreferences.measurementUnit=old;});}catch(restoreError){if(failure){failure.message+=' · restore failed: '+restoreError.message;}else{restoreError.registeredDocument=doc;throw restoreError;}}}
}
function check(context,ID){const old=ID.app.scriptPreferences.measurementUnit;try{ID.app.scriptPreferences.measurementUnit=ID.MeasurementUnits.POINTS;const issues=[];
 if(!['CONTENT_APPLIED','FIDELITY_PASSED'].includes(context.phase))issues.push({cause:'GENERATOR_MISMATCH',category:'BLOCKING',message:context.failure||'원본 Fidelity 미검증',hint:'원본/생성 비교를 확인해주세요. Auto Fix는 실행하지 않습니다.'});
 if(context.phase==='FIDELITY_FAILED'&&context.originalInspection)for(const message of context.originalInspection.errors)issues.push({cause:/overflow|넘칩니다|넘침/i.test(message)?'SOURCE_OVERFLOW':'SOURCE_INSPECTION',category:'BLOCKING',message:'원본 단계: '+message,hint:'원고 교체/Auto Fix로 원본 오류를 숨기지 않습니다.'});
 if(context.snapshot){
  const current=F.capture(context.doc,context.entry.descriptor.pageIds,undefined,ID),kept=F.preservation(context.snapshot,current,context.edits);
  if(!kept.equal)issues.push({cause:'GENERATOR_MISMATCH',category:'BLOCKING',message:'고정 객체/페이지/Story/레이어/쌓임 순서 보존 불일치',detail:JSON.stringify(kept.differences)});
  const live=diagnostics(context.entry,context.doc,ID,{ignoreStories:context.edits.filter(e=>e.storyId||e.image).map(e=>e.storyId||'image:'+e.elementId)});
  for(const r of live.records.filter(r=>!r.comparison.equal))issues.push({role:r.role,cause:'GENERATOR_MISMATCH',category:'BLOCKING',message:'원본 속성 재검사 불일치: '+r.elementId,elementId:r.elementId,differences:r.comparison.differences,failureOperation:r.readbackFailure&&r.readbackFailure.operation,property:r.readbackFailure&&r.readbackFailure.property,adobeError:r.readbackFailure&&r.readbackFailure.message,adobeErrorCode:r.readbackFailure&&r.readbackFailure.code,detail:JSON.stringify(r.comparison.differences)});
 }
 for(const c of context.contentChecks){const f=c.frame;let comparison=Model.compare(c.bounds,relative(f));if(c.typography){const got=readType(f.parentStory.texts.item(0),ID);comparison=Model.compare({bounds:c.bounds,typography:c.typography},{bounds:relative(f),typography:got});}
  if(!comparison.equal)issues.push({role:c.role,cause:'GENERATOR_MISMATCH',category:'BLOCKING',message:c.role+' 원본 대비 속성 불일치',detail:JSON.stringify(comparison.differences)});
  if(c.overrides){const text=f.parentStory.texts.item(0),actual={};for(const k of Object.keys(c.overrides))actual[k]=F.value(text[k]);const expected=Object.fromEntries(Object.entries(c.overrides).map(([k,v])=>[k,F.value(v)]));const cmp=Model.compare(expected,actual);if(!cmp.equal)issues.push({role:c.role,cause:'GENERATOR_MISMATCH',category:'BLOCKING',message:c.role+' direct override 보존 불일치',detail:JSON.stringify(cmp.differences)});}
  if(c.imagePath){const graphics=F.list(f.allGraphics),path=graphics[0]&&graphics[0].itemLink&&graphics[0].itemLink.filePath;const normalize=p=>String(p||'').replace(/\\/g,'/');if(graphics.length!==1||normalize(path)!==normalize(c.imagePath))issues.push({role:c.role,cause:'GENERATOR_MISMATCH',category:'BLOCKING',message:c.role+' 이미지 place/링크 불일치'});if(!Model.compare(c.imageGeometry,F.frameSnapshot(f,undefined,context.doc,ID).graphics).equal)issues.push({role:c.role,cause:'GENERATOR_MISMATCH',category:'BLOCKING',message:c.role+' 배치 이미지 geometry/crop 변경'});if(!Model.compare(c.fitting,F.read(f.frameFittingOptions,F.FIT)).equal)issues.push({role:c.role,cause:'GENERATOR_MISMATCH',category:'BLOCKING',message:c.role+' fitting/crop 변경'});}
  if(c.typography&&String(f.parentStory.contents)!==c.text)issues.push({role:c.role,cause:'GENERATOR_MISMATCH',category:'BLOCKING',message:c.role+' 새 원고와 실제 Story 내용 불일치',hint:'콘텐츠 누락/변경을 확인해주세요. Auto Fix는 실행하지 않습니다.'});
  if(c.typography&&f.parentStory.overflows)issues.push({role:c.role,cause:'CONTENT_OVERFLOW',category:'USER_ACTION_REQUIRED',message:c.role+' 새 원고가 원본 프레임 수용량을 초과합니다.',hint:'이 원고에는 다른 템플릿을 권장합니다. 원고 분량을 줄이거나 다른 등록 디자인을 선택해주세요. 원본 스레드/지면은 늘리지 않습니다.'});
 }
 return issues;
 }finally{ID.app.scriptPreferences.measurementUnit=old;}}
function rebind(context,doc){context.doc=doc;const all=items(doc.allPageItems);for(const c of context.contentChecks){const found=all.find(f=>f.extractLabel(KEY)===c.elementId);if(!found)throw new Error('저장 후 등록 프레임 재연결 실패');c.frame=found;}}
module.exports={KEY,packagePlan,replacementPlan,diagnostics,create,check,rebind};
