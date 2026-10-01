'use strict';
const Model=require('./design-model');
const local=n=>n.replace(/^\{[^}]+\}/,'');
function inventory(tree){
 const out=[];
 const emit=(n,path,before)=>out.push({path,target:n.target,data:n.data||'',before,after:path==='/before'||path==='/after'?'':n.tail||''});
 for(const n of tree.beforeRoot||[])if(n.tag==='#pi')emit(n,'/before','');
 function walk(n,path){let preceding=n.text||'';const counts={};for(const c of n.children||[]){
  if(c.tag==='#pi')emit(c,path,preceding);
  else if(c.tag!=='#comment'){const tag=local(c.tag),i=counts[tag]||0;counts[tag]=i+1;walk(c,path+'/'+tag+'['+i+']');}
  preceding=c.tail||'';
 }}
 walk(tree,'/'+local(tree.tag)+'[0]');
 for(const n of tree.afterRoot||[])if(n.tag==='#pi')emit(n,'/after','');
 return out;
}
function validateSource(model){
 if(model.metadata.markerPreservationVersion!==1||!model.metadata.sourceProcessingInstructions)throw new Error('MARKER_REEXTRACTION_REQUIRED: 원본 IDML을 새 추출기로 다시 추출해주세요.');
 const evidence=model.metadata.sourceProcessingInstructions;
 if(!Model.compare(Object.keys(evidence).sort(),Object.keys(model.sourceXml).sort()).equal)throw new Error('SOURCE_MARKER_INVENTORY_FILES_MISMATCH');
 for(const [name,tree] of Object.entries(model.sourceXml))if(JSON.stringify(evidence[name])!==JSON.stringify(inventory(tree)))throw new Error('SOURCE_MARKER_LOSS: '+name);
 const rawStories=new Map();function find(n){if(n.tag==='Story'&&n.attributes?.Self)rawStories.set(n.attributes.Self,n);for(const c of n.children||[])find(c);}Object.values(model.sourceXml).forEach(find);
 for(const story of model.stories){const raw=rawStories.get(story.id);if(!raw)continue;
  const projected={paragraphs:(raw.children||[]).filter(n=>n.tag==='ParagraphStyleRange').map(p=>({runs:(p.children||[]).filter(n=>n.tag==='CharacterStyleRange').map(r=>({tokens:(r.children||[]).filter(n=>n.tag!=='Properties').map(n=>({type:n.tag,text:n.text||'',contentTree:n.tag==='Content'||n.tag==='#pi'?n:undefined}))}))}))};
  const a=storyParts(projected),b=storyParts(story);if((a.some(p=>p.target)||b.some(p=>p.target))&&JSON.stringify(a)!==JSON.stringify(b))throw new Error('STORY_MARKER_PROJECTION_LOSS: '+story.id);
 }
}
function validateSerialized(trees,entries){
 const files=new Map(entries);
 for(const [name,tree] of Object.entries(trees)){
  if(!files.has(name))continue;
  const expected=inventory(tree).map(({target,data})=>({target,data}));
  const xml=String(files.get(name)).replace(/<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>/g,'');
  const actual=[...xml.matchAll(/<\?([^\s?]+)(?:\s+([\s\S]*?))?\?>/g)].filter(m=>m[1]!=='xml').map(m=>({target:m[1],data:m[2]||''}));
  // Legacy aid fallback is a document declaration, not Story content.
  if(name==='designmap.xml'&&!expected.some(p=>p.target==='aid')){const aid=actual.findIndex(p=>p.target==='aid');if(aid>=0)actual.splice(aid,1);}
  if(JSON.stringify(expected)!==JSON.stringify(actual))throw new Error('GENERATED_MARKER_LOSS: '+name);
 }
 return {sourceVerified:true,serializedVerified:true,count:Object.values(trees).reduce((n,t)=>n+inventory(t).length,0)};
}
function storyParts(story){
 const out=[];
 const addText=s=>{if(s)out.push({text:s});};
 function walk(n){if(n.tag==='#pi'){out.push({target:n.target,data:n.data||''});return;}if(n.tag==='#comment')return;addText(n.text);for(const c of n.children||[]){walk(c);addText(c.tail);}}
 for(const p of story.paragraphs)for(const r of p.runs)for(const t of r.tokens){if(t.contentTree)walk(t.contentTree);else if(t.type==='Content')addText(t.text);else if(t.type==='Br')addText('\r');else out.push({unsupported:t.type});}
 return out;
}
function applyRestorations(trees,restorations=[]){
 const seen=new Set();
 for(const r of restorations){
  if(r.kind!=='RESTORE_CURRENT_PAGE_NUMBER'||!r.donorSourceSha256||!r.donorStoryId||seen.has(r.storyId))throw new Error('INVALID_MARKER_RESTORATION');seen.add(r.storyId);
  const matches=[];function find(n){if(n.tag==='Story'&&n.attributes.Self===r.storyId)matches.push(n);for(const c of n.children||[])find(c);}Object.values(trees).forEach(find);
  if(matches.length!==1)throw new Error('RESTORATION_STORY_NOT_UNIQUE');
  const chars=[];function ranges(n){if(n.tag==='CharacterStyleRange')chars.push(n);for(const c of n.children||[])ranges(c);}ranges(matches[0]);
  if(chars.length!==1||chars[0].children.some(c=>c.tag!=='Properties'&&(c.tag!=='Content'||c.text||(c.children||[]).length)))throw new Error('RESTORATION_REQUIRES_EMPTY_SINGLE_STYLE_STORY');
  chars[0].children=chars[0].children.filter(c=>c.tag!=='Content');
  chars[0].children.push({tag:'Content',attributes:{},text:'',tail:'',children:[{tag:'#pi',target:'ACE',data:'18',tail:''}]});
 }
}
function checkHost(entry,doc,ID,record){
 const frames=[...(doc.allPageItems?Array.isArray(doc.allPageItems)?doc.allPageItems:Array.from({length:doc.allPageItems.length},(_,i)=>doc.allPageItems.item(i)):[])];
 for(const spread of doc.masterSpreads?Array.isArray(doc.masterSpreads)?doc.masterSpreads:Array.from({length:doc.masterSpreads.length},(_,i)=>doc.masterSpreads.item(i)):[])frames.push(...(Array.isArray(spread.allPageItems)?spread.allPageItems:Array.from({length:spread.allPageItems.length},(_,i)=>spread.allPageItems.item(i))));
 const selected=new Set(entry.descriptor.pageIds.concat(entry.original.pages.filter(p=>p.kind==='MasterSpread').map(p=>p.id)));
 for(const story of entry.original.stories){
  const owners=entry.original.elements.filter(e=>e.textFrame?.storyRef===story.id&&e.pageCandidates.some(p=>selected.has(p)));if(!owners.length)continue;
  const restore=(entry.descriptor.markerRestorations||[]).some(r=>r.storyId===story.id),parts=restore?[{target:'ACE',data:'18'}]:storyParts(story);
  if(!parts.some(p=>p.target))continue;
  const frame=frames.find(f=>owners.some(e=>f.extractLabel('MagazineStudioSourceRef')===e.id));
  const expected=[],actual=[];let offset=0;
  try{
   if(!frame)throw new Error('Marker frame missing');
   const native=frame.parentStory;
   for(const part of parts){if(part.text){for(const c of part.text){expected.push(c);actual.push(String(native.characters.item(offset++).contents));}}else if(part.target){
    const key=part.target==='ACE'&&part.data==='18'?'AUTO_PAGE_NUMBER':null;
    if(!key||ID.SpecialCharacters?.[key]===undefined)throw new Error('UNSUPPORTED Host marker: '+part.target+' '+part.data);
    const got=native.characters.item(offset++).contents,want=ID.SpecialCharacters[key];expected.push({marker:key});actual.push(got===want||got&&typeof got.equals==='function'&&got.equals(want)?{marker:key}:{unexpected:String(got)});
   }else throw new Error('UNSUPPORTED marker Story token');}
   if(native.characters.length!==undefined&&native.characters.length!==offset)throw new Error('Marker Story character count mismatch');
   record('special-markers',owners[0].id,{story:story.id,contents:expected},{story:story.id,contents:actual});
  }catch(e){record('special-markers',owners[0].id,{markers:'preserved'},{markers:e.message},e);}
 }
}
module.exports={inventory,validateSource,validateSerialized,storyParts,applyRestorations,checkHost};
