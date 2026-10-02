'use strict';
// Native source previews only. No recommendation, proof approval or content writes.
const Guard=require('./active-design-set'),Native=require('./registered-native'),F=require('./registered-fidelity'),Image=require('./image-dimensions');
const VERSION='indesign-jpeg/v1';
function identity(entry,hostVersion){Guard.assertEntry(entry);const d=entry.descriptor;if(!d.provenance)throw new Error('Preview source provenance missing');return {renderer:VERSION,resolution:36,quality:'MEDIUM',hostVersion:String(hostVersion),designId:d.id,provenance:d.provenance,pageIds:d.pageIds};}
function key(entry){const p=entry.descriptor.provenance;if(!p||!/^[a-f0-9]{64}$/.test(p.sourceSha256)||!/^[a-f0-9]{64}$/.test(p.fingerprint))throw new Error('Preview fingerprint missing');return 'v1-'+p.sourceSha256.slice(0,16)+'-'+p.fingerprint.slice(0,16);}
function cacheMatches(saved,expected){return saved?.schema==='magazine-native-preview/v1'&&JSON.stringify(saved.identity)===JSON.stringify(expected)&&saved.files?.length===expected.pageIds.length&&saved.files.every((f,i)=>f.pageId===expected.pageIds[i]&&/^[\w-]+\.jpg$/.test(f.name));}
async function subfolder(folder,name){try{return await folder.getEntry(name);}catch(e){return folder.createFolder(name);}}
function create({ID,fs,format,folder,open,guard=()=>{}}){
 const memory=new Map();let pending=false;
 async function verify(saved,expected){if(!cacheMatches(saved,expected))return null;const images=[];for(const f of saved.files){const file=await folder.getEntry(f.name),size=Image.dimensions(new Uint8Array(await file.read({format})));if(!size.width||!size.height)throw new Error('Preview JPEG invalid');images.push({pageId:f.pageId,url:'file:'+file.nativePath.replace(/\\/g,'/'),...size});}return {identity:expected,images};}
 async function load(entries,progress=async()=>{}){
  if(pending)throw new Error('디자인 미리보기 생성이 진행 중입니다.');pending=true;
  const result={},missing=[];
  try{
   for(const entry of entries){guard();const expected=identity(entry,ID.app.version),signature=JSON.stringify(expected);let preview=memory.get(signature);if(!preview)try{preview=await verify(JSON.parse(await (await folder.getEntry(key(entry)+'.json')).read()),expected);}catch(e){/* A missing/damaged cache is regenerated, never replaced with another source. */}if(preview){result[entry.descriptor.id]=preview;memory.set(signature,preview);}else missing.push(entry);}
   await progress('원본 미리보기 캐시 '+(entries.length-missing.length)+'/'+entries.length);if(!missing.length)return result;
   const groups=new Map();for(const entry of missing){const sha=entry.original.metadata.sourceSha256;groups.set(sha,(groups.get(sha)||[]).concat(entry));}
   for(const group of groups.values()){
    guard();let doc;const preferences=ID.app.jpegExportPreferences,settings={jpegExportRange:ID.ExportRangeOrAllPages.EXPORT_RANGE,exportingSpread:false,exportResolution:36,jpegQuality:ID.JPEGOptionsQuality.MEDIUM,jpegColorSpace:ID.JpegColorSpaceEnum.RGB,embedColorProfile:false,useDocumentBleeds:false,antiAlias:true,simulateOverprint:false},old={},interaction=ID.app.scriptPreferences.userInteractionLevel;
    try{
     for(const k of [...Object.keys(settings),'pageString'])old[k]=preferences[k];
     ID.app.scriptPreferences.userInteractionLevel=ID.UserInteractionLevels.NEVER_INTERACT;
     await progress('원본 디자인을 미리보기용으로 여는 중…');doc=await open(Native.packagePlan(group[0],{allowUnmapped:true}).bytes);guard();
     const pages=F.list(doc.pages),byId=new Map(pages.map(p=>[F.ref(p),p]));if(byId.size!==pages.length||pages.some(p=>!F.ref(p)))throw new Error('Preview source page identity mismatch');
     for(const [k,v] of Object.entries(settings))preferences[k]=v;
     for(const entry of group){guard();const files=[],stem=key(entry);await progress('원본 디자인 미리보기 '+(Object.keys(result).length+1)+'/'+entries.length);
      for(const [i,pageId] of entry.descriptor.pageIds.entries()){
       const page=byId.get(pageId);if(!page)throw new Error('Preview source page missing: '+pageId);
       preferences.pageString='+'+(page.documentOffset+1);const name=stem+'-p'+i+'.jpg',target=await folder.createFile(name,{overwrite:true});guard();doc.exportFile(ID.ExportFormat.JPG,target.nativePath,false);guard();
       // Host versions may append a page suffix even for a single-page export.
       const candidates=(await folder.getEntries()).filter(f=>f.name===name||f.name.startsWith(stem+'-p'+i+'_')&&f.name.endsWith('.jpg'));let actual;
       for(const f of candidates){try{const size=Image.dimensions(new Uint8Array(await f.read({format})));if(size.width&&size.height){if(actual)throw new Error('Ambiguous preview JPEG');actual=f;}}catch(e){if(String(e.message).includes('Ambiguous'))throw e;}}
       if(!actual)throw new Error('원본 미리보기 JPEG 저장 결과가 없습니다.');files.push({pageId,name:actual.name});
      }
      const expected=identity(entry,ID.app.version),saved={schema:'magazine-native-preview/v1',identity:expected,files},file=await folder.createFile(stem+'.json',{overwrite:true});await file.write(JSON.stringify(saved));guard();const preview=await verify(saved,expected);if(!preview)throw new Error('Preview cache verification failed');memory.set(JSON.stringify(expected),preview);result[entry.descriptor.id]=preview;
     }
    }finally{try{if(doc?.isValid)doc.close(ID.SaveOptions.NO);}finally{try{for(const [k,v] of Object.entries(old))preferences[k]=v;}finally{ID.app.scriptPreferences.userInteractionLevel=interaction;}}}
   }
   return result;
  }finally{pending=false;}
 }
 return {load};
}
module.exports={identity,key,cacheMatches,subfolder,create};
