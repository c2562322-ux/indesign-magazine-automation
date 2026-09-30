(function(){
 const $=id=>document.getElementById(id),counts={fonts:0,create:0,check:0,save:0,pdf:0};
 function count(k){counts[k]++;$('simCounts').textContent=JSON.stringify(counts);}
 let records=[],context;
 function initPlan(plan){
  const page={bounds:[0,0,plan.settings.height,plan.settings.width],allPageItems:[]};records=[];
  plan.pages[0].elements.forEach(b=>{const bounds=[b.y,b.x,b.y+b.height,b.x+b.width],f={label:b.label||'AUTO_'+b.role.toUpperCase(),isValid:true,parentPage:page,rotationAngle:0,shearAngle:0,geometricBounds:bounds,get visibleBounds(){return this.geometricBounds;}};page.allPageItems.push(f);
   if(!['title','subtitle'].includes(b.role))return;
   const type=MagazineLayout.typography(b,plan.settings),t={pointSize:type.size,leading:type.leading,tracking:type.tracking,spaceBefore:type.spaceBefore||0,spaceAfter:type.spaceAfter||0,appliedFont:{name:type.font},fontStyle:'Mock only'};
   const st={texts:{item:()=>t},textContainers:[f],get overflows(){return $('simOverflow').checked&&($('simUnresolved').checked||parseFloat(f.geometricBounds[2])<bounds[2]+1-1e-6&&t.pointSize>type.size-1);}};
   f.parentStory=st;Object.defineProperty(f,'overflows',{get:()=>st.overflows});f.textFramePreferences={insetSpacing:b.inset||[0,0,0,0],textColumnCount:1,verticalJustification:1};
   records.push({frame:f,label:f.label,role:b.role,initial:true,inset:b.inset||[0,0,0,0],expected:MagazineAutoFit.snapshot(f)});
  });context={unitsOK:()=>true,topAligned:v=>v===1,recompose:()=>{}};
 }
 function report(repair){
  const issues=[];for(const r of records){if(r.frame.overflows){const diagnosis=MagazineAutoFit.diagnose(r,context);if(repair&&diagnosis.category==='AUTO_FIXABLE'&&!r.attempt)MagazineAutoFit.fit(r,context,diagnosis);if(r.frame.overflows)issues.push({role:r.role,category:'USER_ACTION_REQUIRED',message:(r.role==='title'?'제목':'부제')+' 텍스트가 넘칩니다.',hint:'안전 한도에서 해결되지 않아 원복했습니다. 다른 디자인 또는 직접 조정을 확인해주세요.',detail:'MOCK '+r.label});}}
  return {pageCount:2,errors:issues.map(i=>i.message),issues,warnings:[],autoFixes:records.filter(r=>r.attempt).map(r=>r.attempt)};
 }
 async function action(k,progress){count(k);if(progress)progress(k+'.MockHost');await new Promise(r=>setTimeout(r,600));if($('simFail').checked){$('simFail').checked=false;throw new Error('['+k+'.MockHost] 모의 실패');}return report(k==='create'||k==='check');}
 const fonts=Array.from({length:146},(_,i)=>['Book','Medium','SemiBold','Bold','Black'].map(style=>({family:i?'테스트 Family '+String(i).padStart(3,'0'):'Demo Sans',style,name:(i?'테스트 Family '+String(i).padStart(3,'0'):'Demo Sans')+'\t'+style}))).flat();
 window.magazineApp=MagazineStudio.mount({native:true,yieldUI:()=>new Promise(r=>setTimeout(r,0)),designs:()=>MagazineJSONDesign.load(async name=>(await fetch('designs/'+name)).text()),fonts:async()=>{count('fonts');await new Promise(r=>setTimeout(r,300));return fonts;},validateDesignFonts:()=>[],validateFonts:()=>[],image:async()=>({path:'mock-photo.jpg',name:'모의 사진',preview:''}),load:async()=>null,saveProject:async()=>true,create:async(a,p,progress)=>{initPlan(p);return action('create',progress);},check:progress=>action('check',progress),saveIndd:progress=>action('save',progress),exportPdf:progress=>action('pdf',progress)});
})();
