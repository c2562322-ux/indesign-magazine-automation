'use strict';
(function(){
const D=require('./src/production-diagnostics.js');
function start(){
try {
const U=require('uxp'),fs=U.storage.localFileSystem;
const Input=require('./src/article-input.js'),Studio=require('./src/studio-ui.js');
let Host,hostError='';
try{Host=require('./src/auto-indesign.js');}catch(e){hostError=D.redact(e.message);}
let active=true,token=0;
function guard(expected=token){if(!active||expected!==token||(Host&&Host.sessionId&&Host.sessionId()!==token))throw new Error('패널이 다시 초기화되었습니다. 현재 패널에서 다시 실행해주세요.');}
function resetSession(){if(Host&&Host.resetSession)Host.resetSession();token=Host&&Host.sessionId?Host.sessionId():0;active=true;}
function dispose(){active=false;if(Host&&Host.resetSession&&(!Host.sessionId||Host.sessionId()===token))Host.resetSession();}
function previewPath(path){return 'file:'+path.replace(/\\/g,'/');}
async function load(progress=async()=>{}){
 const f=await fs.getFileForOpening({types:['docx','txt','json']});if(!f)return null;
 let result;
 if(/\.json$/i.test(f.name)){
   const data=JSON.parse((await f.read()).replace(/^\uFEFF/,''));
   if(data.schemaVersion===1 && data.article)result={article:data.article,settings:data.settings,plan:data.plan};
   else result={article:Input.parse(f.name,JSON.stringify(data))};
 }else if(/\.docx$/i.test(f.name)){
   const expected=token;await progress('DOCX 읽는 중…');let started=Date.now();const bytes=await f.read({format:U.storage.formats.binary});guard(expected);await progress('DOCX 읽기 완료 · '+(Date.now()-started)+'ms · 압축 해제/텍스트·사진 분석 중…');started=Date.now();result=require('./src/docx-media').extract(bytes);guard(expected);await progress('텍스트·사진 추출 완료 · '+(Date.now()-started)+'ms');
   if(result.article.images.length){const base=await fs.getDataFolder();const folder=await base.createFolder('docx-'+Date.now()+'-'+Math.random().toString(36).slice(2));guard(expected);
    for(let i=0;i<result.article.images.length;i++){await progress('사진 작업 파일 저장 중… '+(i+1)+'/'+result.article.images.length);guard(expected);const im=result.article.images[i],out=await folder.createFile('image-'+(i+1)+(im.mimeType==='image/png'?'.png':'.jpg'));await out.write(im.bytes.buffer.slice(im.bytes.byteOffset,im.bytes.byteOffset+im.bytes.byteLength),{format:U.storage.formats.binary});guard(expected);im.path=out.nativePath;im.extractedPathOrHandle=out.nativePath;delete im.bytes;}}
 }else result={article:Input.parse(f.name,await f.read())};
 (result.article.images||[]).forEach(im=>{im.path=Input.resolve(f.nativePath,im.path);im.preview=previewPath(im.path);});
 return result;
}
async function saveAs(name,types,write){const requestToken=token;const file=await fs.getFileForSaving(name,{types});guard(requestToken);if(!file)return null;return await write(file);}
async function saveProduction(name,types,write,progress){
 const requestToken=token;
 const file=await D.asyncStep('output.getFileForSaving',()=>fs.getFileForSaving(name,{types}),progress);
 guard(requestToken);if(!file)return null;
 const path=D.step('output.nativePath',()=>{if(!file.nativePath)throw new Error('선택한 저장 위치의 경로를 확인할 수 없습니다.');return file.nativePath;},progress);
 return write(path,progress);
}
Studio.mount({registration:api=>require('./src/design-registration-ui').mount(document.getElementById('registeredDesigns'),api,{
 loadDefault:async(progress=async()=>{})=>{const expected=token;guard(expected);const folder=await fs.getPluginFolder();let entry;try{entry=await folder.getEntry('assets/templates/working/active-library.private.json');}catch(error){const data=await fs.getDataFolder();try{entry=await data.getEntry('registered-library.private.json');}catch(missing){return null;}}guard(expected);const start=Date.now(),text=await entry.read();guard(expected);await progress('Library 읽기 완료 · '+(Date.now()-start)+'ms · 파싱 중…');const parseStart=Date.now(),data=JSON.parse(text);await progress('Library 파싱 완료 · '+(Date.now()-parseStart)+'ms');guard(expected);return data;},
 rememberLibrary:async data=>{const expected=token,folder=await fs.getDataFolder();guard(expected);const file=await folder.createFile('registered-library.private.json',{overwrite:true}),text=JSON.stringify(data);await file.write(text);guard(expected);if(await file.read()!==text)throw new Error('등록 Library 저장 내용 불일치');},
 hostKind:'adobe',capability:entry=>require('./src/registered-native').support(entry),
 saveBatch:data=>{const expected=token;guard(expected);return saveAs('registered-page-verification.private.json',['json'],async f=>{const text=require('./src/production-diagnostics').diagnosticJSON(data);await f.write(text);guard(expected);if(await f.read()!==text)throw new Error('검증 결과 저장 후 내용 불일치');guard(expected);return true;});},
 load:async()=>{const requestToken=token;const f=await fs.getFileForOpening({types:['json']});guard(requestToken);if(!f)return null;const text=await f.read();guard(requestToken);if(text.length>32*1024*1024)throw new Error('최대 32MB');return JSON.parse(text);},
 save:data=>saveAs('registered-designs.private.json',['json'],async f=>{await f.write(JSON.stringify(data));return true;}),
 fonts:()=>{guard();return Host.listFonts(false);},
 proof:async plan=>{guard();const ID=require('indesign'),proof=require('./src/design-model-host');const handle=proof.create(plan,ID);const generated=proof.readback(handle,ID);return {original:proof.comparisonTarget(plan),generated,comparison:require('./src/design-model').compare(proof.comparisonTarget(plan),generated),overflows:!!handle.frame.parentStory.overflows,omitted:plan.omitted};}
}),designs:async()=>{const folder=await fs.getPluginFolder();return require('./src/json-design.js').load(async name=>(await folder.getEntry('designs/'+name)).read());},validateDesignFonts:Host?Host.validateDesignFonts:undefined,native:!!Host,hostError,resetSession,dispose,invalidateDocument:()=>{if(Host&&Host.invalidateDocument)Host.invalidateDocument();},yieldUI:()=>new Promise(resolve=>setTimeout(resolve,0)),load,image:async()=>{const f=await fs.getFileForOpening({types:['png','jpg','jpeg']});if(!f)return null;let size={};try{const metadata=await f.getMetadata();if(metadata.size<=32*1024*1024)size=require('./src/image-dimensions').dimensions(await f.read({format:U.storage.formats.binary}));}catch(e){/* Unknown dimensions never block photo selection. */}return {path:f.nativePath,name:f.name,preview:previewPath(f.nativePath),...size};},fonts:refresh=>{guard();if(!Host)throw new Error('Host를 초기화하지 못했습니다.');return Host.listFonts(refresh);},validateFonts:Host?Host.validateFonts:undefined,
 saveFidelityDiagnostic:text=>{guard();const expected=token;return saveAs('magazine-fidelity.private.json',['json'],async f=>{await f.write(text);guard(expected);if(await f.read()!==text)throw new Error('Fidelity 진단 JSON 저장 후 내용 검증 실패');guard(expected);return true;});},
 saveProject:obj=>saveAs('magazine-project.json',['json'],async f=>{await f.write(JSON.stringify(obj,null,2));return true;}),
 createRegistered:async(entry,article,progress,mode)=>{guard();const expected=token;return Host.createRegistered(entry,article,async bytes=>require('./src/idml-package').open(bytes,{fs,format:U.storage.formats.binary,app:require('indesign').app,guard:()=>guard(expected),progress}),progress,mode);},
 create:(...args)=>{guard();return Host.create(...args);},check:(...args)=>{guard();return Host.check(...args);},
 saveIndd:progress=>saveProduction('magazine-design.indd',['indd'],(path,cb)=>Host.save(path,cb),progress),
 exportPdf:progress=>saveProduction('magazine-design.pdf',['pdf'],(path,cb)=>Host.exportPdf(path,cb),progress)});
} catch(e) {const el=document.getElementById('studioStatus');if(el)el.textContent='Studio init 실패: '+D.redact(e.message);const log=document.getElementById('studioDiagnostics');if(log)log.textContent+='\nStudio init 실패: '+D.redact(e.message);}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
