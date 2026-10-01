'use strict';
// Native snapshots are evidence of preservation across our mutations, not a
// replacement for Original Model -> Host comparisons or visual Adobe proof.
const Model=require('./design-model'),Trace=require('./registered-dom-trace');
const KEY='MagazineStudioSourceRef';
const list=c=>!c?[]:Array.isArray(c)?c:Array.from({length:c.length},(_,i)=>c.item(i));
const ref=o=>o&&typeof o.extractLabel==='function'?o.extractLabel(KEY)||null:null;
const camel=k=>k[0].toLowerCase()+k.slice(1);
const enumEqual=(a,b)=>a&&typeof a.equals==='function'?a.equals(b):a===b;
// Some Adobe PageItem subtypes throw for inapplicable properties. Required
// source fields still use strict reads in diagnostics/directSnapshot.
function optional(o,key){try{return o&&o[key];}catch(e){return undefined;}}
function value(v,get=(o,k)=>o[k]){
 if(v===undefined)return null;
 if(v===null||['string','number','boolean'].includes(typeof v))return v;
 if(Array.isArray(v))return v.map(x=>value(x,get));
 const name=get(v,'name');if(name!==undefined)return {name:String(name)};
 return String(v);
}
const OBJECT=['rotationAngle','shearAngle','visible','locked'];
const na=reason=>({status:'NOT_APPLICABLE',reason});
function noPaint(color,doc){
 if(!color)return false;
 if(doc&&doc.swatches){const none=doc.swatches.item(0);return color.id!==undefined&&color.id===none.id;}
 return ['None','[None]','$ID/None','없음','[없음]'].includes(color.name);
}
const FIT=['autoFit','leftCrop','topCrop','rightCrop','bottomCrop','fittingOnEmptyFrame','fittingAlignment'];
// entirePath uses [x,y], including Bezier control points, in ruler coordinates.
// Page removal can move the page origin without changing its artwork.
function pagePath(path,pageBounds){
 if(!Array.isArray(path))throw new Error('UNSUPPORTED path coordinate readback');
 if(path.length===2&&path.every(Number.isFinite))return [path[0]-pageBounds[1],path[1]-pageBounds[0]];
 return path.map(point=>pagePath(point,pageBounds));
}
function read(o,keys){const out={};for(const k of keys)out[k]=value(o&&o[k]);return out;}
function frameSnapshot(f,progress=()=>{},doc,ID={}){
 const get=Trace.reader(progress,f),V=v=>value(v,get),ref=o=>Trace.run(progress,'registered.snapshot.reference',o,'extractLabel',KEY,()=>(o&&typeof o.extractLabel==='function'?o.extractLabel(KEY)||null:null),{before:false,owner:f}),R=(o,keys)=>Object.fromEntries(keys.map(k=>[k,V(get(o,k))]));
 const page=get(f,'parentPage'),p=page?Array.from(get(page,'bounds'),Number):[0,0,0,0],b=Array.from(get(f,'geometricBounds'),Number);
 if(f.constructor&&f.constructor.name==='Group'){
  const children=list(get(f,'pageItems')).map(child=>{const id=ref(child);if(!id)throw new Error('Group child source reference missing');return id;});
  if(!children.length||new Set(children).size!==children.length)throw new Error('Group children empty or duplicated');
  const wrap=get(f,'textWrapPreferences'),mode=get(wrap,'textWrapMode'),noWrap=mode!==undefined&&ID.TextWrapModes&&enumEqual(mode,ID.TextWrapModes.NONE);
  const wrapState={textWrapMode:V(mode)};for(const key of ['textWrapOffset','inverse','textWrapSide'])wrapState[key]=noWrap?na('textWrapMode=NONE'):V(get(wrap,key));
  // Group paint/fitting/graphics are aggregate child values, not scalar paint.
  // Keep child identities rather than duplicating mutable image/text content.
  return {kind:'Group',children,appearanceSource:'CHILD_OBJECTS',page:ref(page),bounds:[b[0]-p[0],b[1]-p[1],b[2]-p[0],b[3]-p[1]],object:R(f,OBJECT),layer:V(get(f,'itemLayer')),group:ref(get(f,'parent')),objectStyle:V(get(f,'appliedObjectStyle')),wrap:wrapState,effects:R(get(get(f,'transparencySettings'),'blendingSettings'),['opacity','blendMode','isolateBlending','knockoutGroup'])};
 }
 const fill=get(f,'fillColor'),stroke=get(f,'strokeColor'),weight=get(f,'strokeWeight'),fillAbsent=noPaint(fill,doc),strokeAbsent=noPaint(stroke,doc)||weight===0;
 const appearance={...R(f,OBJECT),fillColor:V(fill),strokeColor:V(stroke),strokeWeight:V(weight)};
 for(const key of ['fillTint','overprintFill'])appearance[key]=fillAbsent?na('fillColor=None'):V(get(f,key));
 for(const key of ['strokeTint','strokeType','overprintStroke'])appearance[key]=strokeAbsent?na('strokeColor=None or strokeWeight=0'):V(get(f,key));
 const textFrame=['TextFrame','EndnoteTextFrame'].includes(f.constructor&&f.constructor.name);
 const result={page:ref(page),bounds:[b[0]-p[0],b[1]-p[1],b[2]-p[0],b[3]-p[1]],object:appearance,layer:V(get(f,'itemLayer')),group:ref(get(f,'parent')),objectStyle:V(get(f,'appliedObjectStyle')),
  fitting:textFrame?na('text frame: graphic fitting inactive'):R(get(f,'frameFittingOptions'),FIT),paths:list(get(f,'paths')).map(path=>pagePath(V(get(path,'entirePath')),p)),
  graphics:list(get(f,'allGraphics')).map(g=>{const link=get(g,'itemLink');return {bounds:(()=>{const b=V(get(g,'geometricBounds'));return Array.isArray(b)&&p?[b[0]-p[0],b[1]-p[1],b[2]-p[0],b[3]-p[1]]:b;})(),scale:R(g,['horizontalScale','verticalScale','rotationAngle','shearAngle']),link:link?String(get(link,'filePath')):null};}),
  wrap:{}};
 const wrap=get(f,'textWrapPreferences'),mode=get(wrap,'textWrapMode');result.wrap.textWrapMode=V(mode);
 const noWrap=mode!==undefined&&ID.TextWrapModes&&ID.TextWrapModes.NONE!==undefined&&enumEqual(mode,ID.TextWrapModes.NONE);
 for(const key of ['textWrapOffset','inverse','textWrapSide'])result.wrap[key]=noWrap?na('textWrapMode=NONE'):V(get(wrap,key));
 const transparency=get(f,'transparencySettings');result.effects=R(get(transparency,'blendingSettings'),['opacity','blendMode','isolateBlending','knockoutGroup']);
 const story=textFrame?Trace.run(progress,'registered.snapshot.read',f,'parentStory',undefined,()=>{const s=get(f,'parentStory');if(!s)throw new Error('Required TextFrame.parentStory is unavailable');return s;},{before:false}):optional(f,'parentStory');if(story){result.storyRef=ref(story);result.story=String(get(story,'contents'));result.thread=list(get(story,'textContainers')).map(ref);result.previous=ref(get(f,'previousTextFrame'));result.next=ref(get(f,'nextTextFrame'));
  result.frame=R(get(f,'textFramePreferences'),['textColumnCount','textColumnGutter','insetSpacing','verticalJustification','firstBaselineOffset','autoSizingType']);}
 return result;
}
function capture(doc,pageIds,progress=()=>{},ID={}){
 const get=Trace.reader(progress,doc),ref=o=>Trace.run(progress,'registered.snapshot.reference',o,'extractLabel',KEY,()=>(o&&typeof o.extractLabel==='function'?o.extractLabel(KEY)||null:null),{before:false}),pages=list(get(doc,'pages')).filter(p=>!pageIds||pageIds.includes(ref(p))),masters=list(get(doc,'masterSpreads')).flatMap(s=>list(get(s,'allPageItems')));
 const candidates=pageIds?pages.flatMap(p=>list(get(p,'allPageItems'))).concat(masters):list(get(doc,'allPageItems')).concat(masters);
 const objects={},seen=new Set();for(const f of candidates){if(seen.has(f))continue;seen.add(f);const id=ref(f);if(id){if(objects[id])throw new Error('중복 원본 객체 식별: '+id);objects[id]=Trace.run(progress,'registered.snapshot.object',f,'snapshot',undefined,()=>frameSnapshot(f,progress,doc,ID),{before:false});}}
 for(const [id,obj] of Object.entries(objects))if(obj.kind==='Group')for(const child of obj.children)if(!objects[child]||objects[child].group!==id)throw new Error('Group child snapshot/reference missing: '+id+' / '+child);
 return {pages:pages.map(p=>({id:ref(p),parent:ref(get(p,'appliedMaster')),order:list(get(p,'allPageItems')).map(ref)})),objects};
}
function preservation(before,after,edits=[]){
 const a=JSON.parse(JSON.stringify(before)),b=JSON.parse(JSON.stringify(after));
 for(const edit of edits)if(edit.colorFill&&a.objects[edit.elementId])a.objects[edit.elementId].object.fillColor=edit.colorFill;
 for(const edit of edits)if(edit.hidePlaceholder&&a.objects[edit.elementId])a.objects[edit.elementId].object.visible=false;
 for(const edit of edits)for(const state of [a,b]){
  if(edit.storyId)for(const obj of Object.values(state.objects))if(obj.storyRef===edit.storyId)delete obj.story;
  const obj=state.objects[edit.elementId];if(obj&&edit.image){delete obj.graphics;delete obj.fitting;}
 }
 return Model.compare(a,b);
}
function applicability(snapshot){
 const out=[];function walk(v,path){if(!v||typeof v!=='object')return;if(v.status==='NOT_APPLICABLE'){out.push({path,reason:v.reason});return;}for(const [k,x] of Object.entries(v))walk(x,path?path+'.'+k:k);}
 walk(snapshot.objects,'objects');return out;
}
function canonicalColor(space,values){
 if(space!=='HSB')return {space,values};
 if(!Array.isArray(values)||values.length!==3||!values.every(Number.isFinite)||values[0]<0||values[0]>360||values.slice(1).some(v=>v<0||v>100))throw new Error('UNSUPPORTED HSB channels: '+JSON.stringify(values));
 const [h,s,b]=[values[0]/60,values[1]/100,values[2]/100],c=b*s,x=c*(1-Math.abs(h%2-1)),m=b-c;
 const rgb=[[c,x,0],[x,c,0],[0,c,x],[0,x,c],[x,0,c],[c,0,x]][Math.floor(h)%6];
 return {space:'RGB',values:rgb.map(v=>(v+m)*255)};
}
function colorExpected(model,ref){
 if(ref==='Swatch/None')return {none:true};
 const c=model.colors.find(c=>c.id===ref);if(!c||c.type!=='Color')throw new Error('UNSUPPORTED 색상/효과: '+ref);
 return canonicalColor(c.properties.Space,String(c.properties.ColorValue).trim().split(/\s+/).map(Number));
}
function colorActual(v,ID,doc){
 if(!v)return null;
 const none=doc.swatches&&doc.swatches.item(0);if(none&&v.id!==undefined&&v.id===none.id)return {none:true};
 if(['None','[None]','$ID/None','없음','[없음]'].includes(v.name)||v==='none')return {none:true};
 // Native enum members need not be enumerable in UXP. Never infer space from channel count.
 const space=['CMYK','RGB','LAB','MIXEDINK','HSB'].find(k=>ID.ColorSpace&&ID.ColorSpace[k]!==undefined&&enumEqual(v.space,ID.ColorSpace[k]));
 if(!space)throw new Error('UNSUPPORTED color space readback: '+String(v.space)+' / '+JSON.stringify(v.colorValue));
 return canonicalColor(space,v.colorValue?Array.from(v.colorValue,Number):null);
}
function objectProperties(model,e){
 const style=model.styles.object.find(s=>s.id===e.objectStyleRef),p=style&&style.resolvedProperties||{},out={};
 for(const k of ['FillColor','FillTint','StrokeColor','StrokeTint','StrokeWeight']){
  const enabled=k.startsWith('Fill')?p.EnableFill:p.EnableStroke;
  if(enabled!==false&&p[k]!==undefined)out[k]=p[k];
  if(e.properties[k]!==undefined)out[k]=e.properties[k];
 }
 return out;
}
const ignored=new Set(['AppliedParagraphStyle','AppliedCharacterStyle','Self']);
const aliases={StrikeThru:'strikeThru'};
function directKeys(properties){return Object.keys(properties||{}).filter(k=>!ignored.has(k));}
function hostKey(key){return aliases[key]||camel(key);}
function directSnapshot(source,properties){
 const out={};for(const k of directKeys(properties)){const dest=hostKey(k),v=source[dest];if(v===undefined||v===null)throw new Error('UNSUPPORTED direct override readback: '+k);out[dest]=v;}
 return out;
}
function restore(target,values){
 // A face can reject fontStyle if it is still paired with the old font family.
 for(const key of ['appliedFont','fontStyle'])if(Object.prototype.hasOwnProperty.call(values,key))target[key]=values[key];
 for(const [key,v] of Object.entries(values))if(!['appliedFont','fontStyle'].includes(key))target[key]=v;
}
// Property-scoped semantic values, not a general display-name translator.
// Adobe Korean help documents Metrics=메트릭 and Optical=광학; the former is
// also confirmed by the user's Host report. Roman-only is a distinct mode;
// manual, unknown strings and numeric kerning remain distinct.
const KERNING=new Map([['Metrics','Metrics'],['메트릭','Metrics'],['Optical','Optical'],['광학','Optical'],['Metrics - Roman Only','Metrics - Roman Only'],['메트릭 - 로마자 전용','Metrics - Roman Only']]);
const COMPOSER=new Map([['HL Composer J','HL Composer J'],['Adobe CJK 단락 컴포저','HL Composer J']]);
const stripKey=v=>typeof v==='string'?v.replace(/^\$ID\//,''):v;
function localizedValue(v,ID,aliases){
 const key=stripKey(v);if(aliases.has(key))return aliases.get(key);
 const allowed=[...new Set(aliases.values())];
 const app=ID&&ID.app;
 if(typeof v!=='string'||!app)return key;
 if(typeof app.findKeyStrings==='function'){
  const found=app.findKeyStrings(v),keys=Array.isArray(found)?found:[found];
  const canonical=[...new Set(keys.map(stripKey).filter(k=>allowed.includes(k)))];
  if(canonical.length===1)return canonical[0];
  if(canonical.length>1)return key;
 }
 if(typeof app.translateKeyString==='function'){
  const matches=allowed.filter(k=>app.translateKeyString('$ID/'+k)===v);
  if(matches.length===1)return matches[0];
 }
 return key;
}
function canonicalPair(key,expected,actual,ID){
 if(key==='AppliedLanguage'||key==='appliedLanguage'){
  const language=v=>stripKey(v&&v.untranslatedName||v&&v.name||v);
  return {expected:language(expected),actual:language(actual)};
 }
 if(key==='KerningMethod'||key==='kerningMethod')return {expected:localizedValue(expected,ID,KERNING),actual:localizedValue(actual,ID,KERNING)};
 if(key==='Composer'||key==='composer')return {expected:localizedValue(expected,ID,COMPOSER),actual:localizedValue(actual,ID,COMPOSER)};
 return {expected,actual};
}
// All serializable typography comparison paths share this boundary. Raw reports
// stay untouched; only comparison operands are converted, without tolerance changes.
function compare(expected,actual,ID){
 function walk(a,b,key){
  if(['KerningMethod','kerningMethod','AppliedLanguage','appliedLanguage','Composer','composer'].includes(key))return canonicalPair(key,a,b,ID);
  if(a&&b&&typeof a==='object'&&typeof b==='object'&&Array.isArray(a)===Array.isArray(b)){
   const x=Array.isArray(a)?[]:{},y=Array.isArray(b)?[]:{};
   for(const k of new Set([...Object.keys(a),...Object.keys(b)])){const p=walk(a[k],b[k],k);if(Object.prototype.hasOwnProperty.call(a,k))x[k]=p.expected;if(Object.prototype.hasOwnProperty.call(b,k))y[k]=p.actual;}
   return {expected:x,actual:y};
  }
  return {expected:a,actual:b};
 }
 const p=walk(expected,actual,'');return Model.compare(p.expected,p.actual);
}
const originNames={AscentTopOrigin:'ASCENT_TOP_ORIGIN',BaselineTopOrigin:'BASELINE_TOP_ORIGIN',LeadingTopOrigin:'LEADING_TOP_ORIGIN',EmBoxTopOrigin:'EM_BOX_TOP_ORIGIN',EmBoxTopCenter:'EM_BOX_TOP_CENTER',DescentBottomOrigin:'DESCENT_BOTTOM_ORIGIN',BaselineBottomOrigin:'BASELINE_BOTTOM_ORIGIN',EmBoxBottomOrigin:'EM_BOX_BOTTOM_ORIGIN',EmBoxBottomCenter:'EM_BOX_BOTTOM_CENTER'};
const originTypes={ParagraphShadingTopOrigin:'ParagraphShadingTopOriginEnum',ParagraphShadingBottomOrigin:'ParagraphShadingBottomOriginEnum',ParagraphBorderTopOrigin:'ParagraphBorderTopOriginEnum',ParagraphBorderBottomOrigin:'ParagraphBorderBottomOriginEnum'};
function originValue(key,v,ID){
 const names=Object.entries(originNames).filter(([name])=>name.includes(key.includes('Top')?'Top':'Bottom'));
 for(const [name,member] of names){
  const native=(ID[originTypes[key]]||{})[member];
  if(v===name||(native!==undefined&&enumEqual(v,native))||String(v)===member)return name;
 }
 throw new Error('UNSUPPORTED direct override enum: '+key+' / '+String(v));
}
const specialText={FORCED_LINE_BREAK:'\u2028',DOUBLE_LEFT_QUOTE:'\u201c',DOUBLE_RIGHT_QUOTE:'\u201d',SINGLE_LEFT_QUOTE:'\u2018',SINGLE_RIGHT_QUOTE:'\u2019',SINGLE_STRAIGHT_QUOTE:"'",DOUBLE_STRAIGHT_QUOTE:'"'};
function characterText(v,ID){
 // Character.contents can be a SpecialCharacters enum. Literal story strings
 // are not enum labels and must never be translated by their spelling.
 if(typeof v!=='string')for(const [member,text] of Object.entries(specialText)){
  const native=(ID.SpecialCharacters||{})[member];
  if(native!==undefined&&enumEqual(v,native))return text;
 }
 return String(v);
}
const kinsokuNames={Nothing:'NOTHING',HardKinsoku:'HARD_KINSOKU',SoftKinsoku:'SOFT_KINSOKU',KoreanKinsoku:'KOREAN_KINSOKU',SimplifiedChineseKinsoku:'SIMPLIFIED_CHINESE_KINSOKU',TraditionalChineseKinsoku:'TRADITIONAL_CHINESE_KINSOKU'};
function kinsokuValue(v,ID){
 for(const [name,member] of Object.entries(kinsokuNames)){
  const native=(ID.KinsokuSet||{})[member];
  if(stripKey(v)===name||(native!==undefined&&enumEqual(v,native))||String(v)===member)return name;
 }
 // A custom KinsokuTable cannot be certified from its display name alone:
 // its prohibited-character lists may differ from the built-in set.
 throw new Error('UNSUPPORTED KinsokuSet readback: '+String(v));
}
function directCompare(source,properties,ID,model,doc){
 const expected={},actual={};for(const k of directKeys(properties)){
  const v=properties[k],got=source[hostKey(k)];
  // Numeric/boolean overrides are compared against their source, without defaults.
  if(typeof v==='number'||typeof v==='boolean'){expected[k]=v;actual[k]=value(got);}
  else if(k==='KinsokuSet'){expected[k]=kinsokuValue(v,ID);actual[k]=kinsokuValue(got,ID);}
  else if(['FillColor','StrokeColor'].includes(k)&&model){expected[k]=colorExpected(model,v);actual[k]=colorActual(got,ID,doc);}
  else if(originTypes[k]){expected[k]=originValue(k,v,ID);actual[k]=originValue(k,got,ID);}
  else if(k==='AppliedFont'){expected[k]=v;actual[k]=got&&got.fontFamily;}
  else if(k==='AppliedLanguage'||k==='KerningMethod'||k==='Composer'){const pair=canonicalPair(k,v,got,ID);expected[k]=pair.expected;actual[k]=pair.actual;}
  else if(k==='Justification'){expected[k]=v;actual[k]=Object.keys(Model.ALIGN).find(n=>enumEqual(got,(ID.Justification||{})[Model.ALIGN[n]]));}
  else if(k==='Leading'&&v==='Auto'){expected[k]='Auto';actual[k]=enumEqual(got,ID.Leading.AUTO)?'Auto':value(got);}
  else if(typeof v==='string'&&typeof got==='string'){expected[k]=k==='KerningMethod'?v.replace(/^\$ID\//,''):v;actual[k]=k==='KerningMethod'?got.replace(/^\$ID\//,''):got;}
  else throw new Error('UNSUPPORTED direct override 비교: '+k);
 }
 return {expected,actual,comparison:Model.compare(expected,actual)};
}
module.exports={compare,canonicalPair,pagePath,characterText,applicability,na,noPaint,list,ref,value,read,FIT,capture,preservation,frameSnapshot,colorExpected,colorActual,objectProperties,directSnapshot,directCompare,restore};
