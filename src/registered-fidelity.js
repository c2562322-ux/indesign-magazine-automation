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
function value(v){
 if(v===undefined)return null;
 if(v===null||['string','number','boolean'].includes(typeof v))return v;
 if(Array.isArray(v))return v.map(value);
 if(v.name!==undefined)return {name:String(v.name)};
 return String(v);
}
const OBJECT=['fillColor','fillTint','strokeColor','strokeTint','strokeWeight','strokeType','rotationAngle','shearAngle','visible','locked','overprintFill','overprintStroke'];
const FIT=['autoFit','leftCrop','topCrop','rightCrop','bottomCrop','fittingOnEmptyFrame','fittingAlignment'];
function read(o,keys){const out={};for(const k of keys)out[k]=value(o&&o[k]);return out;}
function frameSnapshot(f,progress=()=>{}){
 const get=Trace.reader(progress,f),R=(o,keys)=>Object.fromEntries(keys.map(k=>[k,value(get(o,k))]));
 const page=get(f,'parentPage'),p=page?Array.from(get(page,'bounds'),Number):[0,0,0,0],b=Array.from(get(f,'geometricBounds'),Number);
 const result={page:ref(page),bounds:[b[0]-p[0],b[1]-p[1],b[2]-p[0],b[3]-p[1]],object:R(f,OBJECT),layer:value(get(f,'itemLayer')),group:ref(get(f,'parent')),objectStyle:value(get(f,'appliedObjectStyle')),
  fitting:R(get(f,'frameFittingOptions'),FIT),paths:list(get(f,'paths')).map(p=>value(get(p,'entirePath'))),
  graphics:list(get(f,'allGraphics')).map(g=>{const link=get(g,'itemLink');return {bounds:value(get(g,'geometricBounds')),scale:R(g,['horizontalScale','verticalScale','rotationAngle','shearAngle']),link:link?String(get(link,'filePath')):null};}),
  wrap:R(get(f,'textWrapPreferences'),['textWrapMode','textWrapOffset','inverse','textWrapSide'])};
 const transparency=get(f,'transparencySettings');result.effects=R(get(transparency,'blendingSettings'),['opacity','blendMode','isolateBlending','knockoutGroup']);
 const story=optional(f,'parentStory');if(story){result.storyRef=ref(story);result.story=String(get(story,'contents'));result.thread=list(get(story,'textContainers')).map(ref);result.previous=ref(get(f,'previousTextFrame'));result.next=ref(get(f,'nextTextFrame'));
  result.frame=R(get(f,'textFramePreferences'),['textColumnCount','textColumnGutter','insetSpacing','verticalJustification','firstBaselineOffset','autoSizingType']);}
 return result;
}
function capture(doc,pageIds,progress=()=>{}){
 const get=Trace.reader(progress,doc),pages=list(get(doc,'pages')).filter(p=>!pageIds||pageIds.includes(ref(p))),masters=list(get(doc,'masterSpreads')).flatMap(s=>list(get(s,'allPageItems')));
 const candidates=pageIds?pages.flatMap(p=>list(get(p,'allPageItems'))).concat(masters):list(get(doc,'allPageItems')).concat(masters);
 const objects={},seen=new Set();for(const f of candidates){if(seen.has(f))continue;seen.add(f);const id=ref(f);if(id){if(objects[id])throw new Error('중복 원본 객체 식별: '+id);objects[id]=Trace.run(progress,'registered.snapshot.object',f,'snapshot',undefined,()=>frameSnapshot(f,progress),{before:false});}}
 return {pages:pages.map(p=>({id:ref(p),parent:ref(get(p,'appliedMaster')),order:list(get(p,'allPageItems')).map(ref)})),objects};
}
function preservation(before,after,edits=[]){
 const a=JSON.parse(JSON.stringify(before)),b=JSON.parse(JSON.stringify(after));
 for(const edit of edits)for(const state of [a,b]){
  if(edit.storyId)for(const obj of Object.values(state.objects))if(obj.storyRef===edit.storyId)delete obj.story;
  const obj=state.objects[edit.elementId];if(obj&&edit.image){delete obj.graphics;delete obj.fitting;}
 }
 return Model.compare(a,b);
}
function colorExpected(model,ref){
 if(ref==='Swatch/None')return {none:true};
 const c=model.colors.find(c=>c.id===ref);if(!c||c.type!=='Color')throw new Error('UNSUPPORTED 색상/효과: '+ref);
 return {space:c.properties.Space,values:String(c.properties.ColorValue).trim().split(/\s+/).map(Number)};
}
function colorActual(v,ID,doc){
 if(!v)return null;
 const none=doc.swatches&&doc.swatches.item(0);if(none&&v.id!==undefined&&v.id===none.id)return {none:true};
 if(['None','[None]','$ID/None','없음','[없음]'].includes(v.name)||v==='none')return {none:true};
 return {space:Object.keys(ID.ColorSpace||{}).find(k=>enumEqual(v.space,ID.ColorSpace[k])),values:v.colorValue?Array.from(v.colorValue,Number):null};
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
function directCompare(source,properties,ID){
 const expected={},actual={};for(const k of directKeys(properties)){
  const v=properties[k],got=source[hostKey(k)];
  // Numeric/boolean overrides are compared against their source, without defaults.
  if(typeof v==='number'||typeof v==='boolean'){expected[k]=v;actual[k]=value(got);}
  else if(k==='AppliedFont'){expected[k]=v;actual[k]=got&&got.fontFamily;}
  else if(k==='AppliedLanguage'){expected[k]=String(v).replace(/^\$ID\//,'');actual[k]=got&&String(got.name).replace(/^\$ID\//,'');}
  else if(k==='Justification'){expected[k]=v;actual[k]=Object.keys(Model.ALIGN).find(n=>enumEqual(got,(ID.Justification||{})[Model.ALIGN[n]]));}
  else if(k==='Leading'&&v==='Auto'){expected[k]='Auto';actual[k]=enumEqual(got,ID.Leading.AUTO)?'Auto':value(got);}
  else if(typeof v==='string'&&typeof got==='string'){expected[k]=k==='KerningMethod'?v.replace(/^\$ID\//,''):v;actual[k]=k==='KerningMethod'?got.replace(/^\$ID\//,''):got;}
  else throw new Error('UNSUPPORTED direct override 비교: '+k);
 }
 return {expected,actual,comparison:Model.compare(expected,actual)};
}
module.exports={list,ref,value,read,FIT,capture,preservation,frameSnapshot,colorExpected,colorActual,objectProperties,directSnapshot,directCompare,restore};
