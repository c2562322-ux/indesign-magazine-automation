(function(){
const Input=window.MagazineInput;
function pick(accept){return new Promise(resolve=>{const f=document.createElement('input');f.type='file';f.accept=accept;f.style.display='none';document.body.appendChild(f);let done=false;const finish=v=>{if(done)return;done=true;f.remove();resolve(v);};f.addEventListener('change',()=>finish(f.files[0]||null));f.addEventListener('cancel',()=>finish(null));f.click();});}
window.magazineApp=MagazineStudio.mount({native:false,load:async()=>{
 const file=await pick('.txt,.docx,.json');if(!file)return null;
 if(file.size>32*1024*1024)throw new Error('원고 파일은 최대 32MB입니다.');
 let result;
 if(/\.json$/i.test(file.name)){const obj=JSON.parse(await file.text());result=obj.schemaVersion===1?{article:obj.article,settings:obj.settings,plan:obj.plan}:{article:Input.parse(file.name,JSON.stringify(obj))};}
 else result={article:Input.parse(file.name,/\.docx$/i.test(file.name)?await file.arrayBuffer():await file.text())};
 (result.article.images||[]).forEach(im=>{im.preview='';});return result;
},image:async()=>{
 const file=await pick('image/png,image/jpeg');if(!file)return null;
 const preview=URL.createObjectURL(file),img=new Image();img.src=preview;await img.decode();
 return {path:file.name,name:file.name,preview,width:img.naturalWidth,height:img.naturalHeight};
},fonts:async()=>{throw new Error('설치 폰트 조회는 InDesign 플러그인에서 사용해주세요.');},saveProject:async obj=>{const url=URL.createObjectURL(new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='magazine-project.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return true;}});
})();
