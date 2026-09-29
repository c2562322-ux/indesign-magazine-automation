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
async function load(){
 const f=await fs.getFileForOpening({types:['docx','txt','json']});if(!f)return null;
 let result;
 if(/\.json$/i.test(f.name)){
   const data=JSON.parse((await f.read()).replace(/^\uFEFF/,''));
   if(data.schemaVersion===1 && data.article)result={article:data.article,settings:data.settings,plan:data.plan};
   else result={article:Input.parse(f.name,JSON.stringify(data))};
 }else result={article:Input.parse(f.name,await f.read(/\.docx$/i.test(f.name)?{format:U.storage.formats.binary}:undefined))};
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
Studio.mount({designs:async()=>{const folder=await fs.getPluginFolder();return require('./src/json-design.js').load(async name=>(await folder.getEntry('designs/'+name)).read());},validateDesignFonts:Host?Host.validateDesignFonts:undefined,native:!!Host,hostError,resetSession,dispose,invalidateDocument:()=>{if(Host&&Host.invalidateDocument)Host.invalidateDocument();},yieldUI:()=>new Promise(resolve=>setTimeout(resolve,0)),load,image:async()=>{const f=await fs.getFileForOpening({types:['png','jpg','jpeg']});return f?{path:f.nativePath,name:f.name,preview:previewPath(f.nativePath)}:null;},fonts:refresh=>{guard();if(!Host)throw new Error('Host를 초기화하지 못했습니다.');return Host.listFonts(refresh);},validateFonts:Host?Host.validateFonts:undefined,
 saveProject:obj=>saveAs('magazine-project.json',['json'],async f=>{await f.write(JSON.stringify(obj,null,2));return true;}),
 create:(...args)=>{guard();return Host.create(...args);},check:(...args)=>{guard();return Host.check(...args);},
 saveIndd:progress=>saveProduction('magazine-design.indd',['indd'],(path,cb)=>Host.save(path,cb),progress),
 exportPdf:progress=>saveProduction('magazine-design.pdf',['pdf'],(path,cb)=>Host.exportPdf(path,cb),progress)});
} catch(e) {const el=document.getElementById('studioStatus');if(el)el.textContent='Studio init 실패: '+D.redact(e.message);const log=document.getElementById('studioDiagnostics');if(log)log.textContent+='\nStudio init 실패: '+D.redact(e.message);}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
