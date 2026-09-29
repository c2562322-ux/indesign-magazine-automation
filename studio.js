'use strict';
const D=require('./src/production-diagnostics.js');
try {
const U=require('uxp'),fs=U.storage.localFileSystem;
const Input=require('./src/article-input.js'),Host=require('./src/auto-indesign.js'),Studio=require('./src/studio-ui.js');
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
async function saveAs(name,types,write){const file=await fs.getFileForSaving(name,{types});if(!file)return null;return await write(file);}
async function saveProduction(name,types,write,progress){
 const file=await D.asyncStep('output.getFileForSaving',()=>fs.getFileForSaving(name,{types}),progress);
 if(!file)return null;
 const path=D.step('output.nativePath',()=>{if(!file.nativePath)throw new Error('선택한 저장 위치의 경로를 확인할 수 없습니다.');return file.nativePath;},progress);
 return write(path,progress);
}
Studio.mount({native:true,load,image:async()=>{const f=await fs.getFileForOpening({types:['png','jpg','jpeg']});return f?{path:f.nativePath,name:f.name,preview:previewPath(f.nativePath)}:null;},fonts:Host.listFonts,validateFonts:Host.validateFonts,
 saveProject:obj=>saveAs('magazine-project.json',['json'],async f=>{await f.write(JSON.stringify(obj,null,2));return true;}),
 create:Host.create,check:Host.check,
 saveIndd:progress=>saveProduction('magazine-design.indd',['indd'],Host.save,progress),
 exportPdf:progress=>saveProduction('magazine-design.pdf',['pdf'],Host.exportPdf,progress)});
} catch(e) {const el=document.getElementById('studioStatus');if(el)el.textContent='패널 시작 오류: '+D.redact(e.message);}
