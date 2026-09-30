(function(){
const Input=window.MagazineInput;
function pick(accept){return new Promise(resolve=>{const f=document.createElement('input');f.type='file';f.accept=accept;f.style.display='none';document.body.appendChild(f);let done=false;const finish=v=>{if(done)return;done=true;f.remove();resolve(v);};f.addEventListener('change',()=>finish(f.files[0]||null));f.addEventListener('cancel',()=>finish(null));f.click();});}
window.magazineApp=MagazineStudio.mount({registration:api=>MagazineRegistrationUI.mount(document.getElementById('registeredDesigns'),api,{
 load:async()=>{const f=await pick('.json');if(!f)return null;if(f.size>32*1024*1024)throw new Error('최대 32MB');return JSON.parse(await f.text());},
 save:async data=>{const url=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='registered-designs.private.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return true;}
}),designs:()=>MagazineJSONDesign.load(async name=>{const r=await fetch('designs/'+name);if(!r.ok)throw new Error('JSON 파일 읽기 실패: '+name);return r.text();}),native:false,load:async()=>{
 const file=await pick('.txt,.docx,.json');if(!file)return null;
 if(file.size>32*1024*1024)throw new Error('원고 파일은 최대 32MB입니다.');
 let result;
 if(/\.json$/i.test(file.name)){const obj=JSON.parse(await file.text());result=obj.schemaVersion===1?{article:obj.article,settings:obj.settings,plan:obj.plan}:{article:Input.parse(file.name,JSON.stringify(obj))};}
 else if(/\.docx$/i.test(file.name)){result=MagazineDocxMedia.extract(await file.arrayBuffer());for(const im of result.article.images){im.preview=URL.createObjectURL(new Blob([im.bytes],{type:im.mimeType}));im.path=im.originalName;delete im.bytes;}}
 else result={article:Input.parse(file.name,await file.text())};
 (result.article.images||[]).forEach(im=>{if(im.source!=='docx')im.preview='';});return result;
},image:async()=>{
 const file=await pick('image/png,image/jpeg');if(!file)return null;
 const preview=URL.createObjectURL(file),img=new Image();img.src=preview;await img.decode();
 return {path:file.name,name:file.name,preview,width:img.naturalWidth,height:img.naturalHeight};
},fonts:async()=>{throw new Error('설치 폰트 조회는 InDesign 플러그인에서 사용해주세요.');},saveProject:async obj=>{const url=URL.createObjectURL(new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='magazine-project.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return true;}});
})();
