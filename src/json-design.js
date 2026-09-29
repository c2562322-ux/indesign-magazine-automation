/* External draft schema boundary. No Host/DOM and no executable content from JSON. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.MagazineJSONDesign=factory();})(typeof window!=='undefined'?window:this,function(){
 'use strict';
 const PT=72/25.4,SCHEMA='magazine-studio-layout-template/v1-draft',LIBRARY='magazine-studio-layout-library/v1-draft';
 const clone=v=>JSON.parse(JSON.stringify(v));
 const fail=s=>{throw new Error('디자인 JSON: '+s);};
 function num(v,min,max,key){if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)fail(key+' 범위 오류');return v;}
 function str(v,key){if(typeof v!=='string'||!v.trim()||v.length>200)fail(key+' 문자열 오류');return v;}
 function keys(v,allowed,key){if(!v||typeof v!=='object'||Array.isArray(v))fail(key+' 객체 오류');for(const k of Object.keys(v))if(!allowed.includes(k))fail(key+'.'+k+' 미지원 필드 (무시하지 않음)');}
 function color(ref){
   if(/^#[0-9a-f]{6}$/i.test(ref||''))return {space:'RGB',values:[1,3,5].map(i=>parseInt(ref.slice(i,i+2),16)),css:ref};
   let m=/^Color\/r(\d+)g(\d+)b(\d+)$/.exec(ref||'');
   if(m){const values=m.slice(1).map(Number);values.forEach(v=>num(v,0,255,'RGB'));return {space:'RGB',values,css:'#'+values.map(v=>v.toString(16).padStart(2,'0')).join('')};}
   m=/^Color\/C=(\d+(?:\.\d+)?) M=(\d+(?:\.\d+)?) Y=(\d+(?:\.\d+)?) K=(\d+(?:\.\d+)?)$/.exec(ref||'');
   if(m){const values=m.slice(1).map(Number);values.forEach(v=>num(v,0,100,'CMYK'));const rgb=values.slice(0,3).map(v=>Math.round(255*(1-v/100)*(1-values[3]/100)));return {space:'CMYK',values,css:'#'+rgb.map(v=>v.toString(16).padStart(2,'0')).join('')};}
   fail('해석할 수 없는 색상 '+String(ref));
 }
 const aligns={LeftJustified:'justify',LeftAlign:'left',RightAlign:'right',CenterAlign:'center'};
 function validate(raw){
   keys(raw,['$schema','schemaVersion','id','name','source','page','contentSlots','elements','notes'],'root');
   if(raw.$schema!==SCHEMA||(raw.schemaVersion!==undefined&&raw.schemaVersion!==1))fail('schema 버전 미지원');
   if(!/^[a-z0-9][a-z0-9-]{0,99}$/.test(raw.id||''))fail('id 오류');str(raw.name,'name');
   keys(raw.page,['widthMm','heightMm','units'],'page');if(raw.page.units!=='mm')fail('page.units는 mm여야 합니다');
   num(raw.page.widthMm,50,1000,'page.widthMm');num(raw.page.heightMm,50,1000,'page.heightMm');
   keys(raw.contentSlots,['required','images'],'contentSlots');const slots=raw.contentSlots;
   if(!Array.isArray(slots.required)||slots.required.some(v=>!['title','subtitle','body'].includes(v)))fail('required 오류');
   keys(slots.images,['min','max'],'images');num(slots.images.min,0,2,'images.min');num(slots.images.max,slots.images.min,2,'images.max');
   if(!Number.isInteger(slots.images.min)||!Number.isInteger(slots.images.max))fail('사진 수 정수 필요');
   if(!Array.isArray(raw.elements)||raw.elements.length<1||raw.elements.length>50)fail('elements 개수 오류');
   const roles={text:['title','subtitle','body','header'],image:['image1','image2'],pageNumber:['pageNumber'],line:['headerRule']};
   const seen={},orders=[];let bodyType;
   raw.elements.forEach((e,i)=>{
     const fields=e&&((e.type==='text'||e.type==='pageNumber')?['typography','flowGroup','flowOrder','text','columns','columnGap','inset']:e.type==='image'?['fit','fillColorRef','cornerRadiusMm']:['stroke']);
     keys(e,['type','role','frame','source'].concat(fields||[]),'elements['+i+']');
     if(!roles[e.type]||!roles[e.type].includes(e.role))fail('element type/role 오류');seen[e.role]=(seen[e.role]||0)+1;
     keys(e.frame,['x','y','width','height'],'frame');const b=e.frame;
     num(b.x,0,raw.page.widthMm,'x');num(b.y,0,raw.page.heightMm,'y');num(b.width,.01,raw.page.widthMm,'width');num(b.height,e.type==='line'?0:.01,raw.page.heightMm,'height');
     if(b.x+b.width>raw.page.widthMm+.001||b.y+b.height>raw.page.heightMm+.001)fail('프레임이 페이지 밖입니다');
     if(e.fillColorRef!==undefined)color(e.fillColorRef);
     if(e.text!==undefined&&(e.role!=='header'||typeof e.text!=='string'||e.text.length>500))fail('text는 header의 기본 문구만 지원');
     if(e.type==='text'||e.type==='pageNumber'){
       keys(e.typography,['fontFamily','fontStyle','fontSizePt','leadingPt','tracking','alignment','fillColorRef','spaceBeforeMm','spaceAfterMm'],'typography');const t=e.typography;
       str(t.fontFamily,'fontFamily');str(t.fontStyle,'fontStyle');
       if(t.fontSizePt!=null)num(t.fontSizePt,1,300,'fontSizePt');else if(e.role!=='header')fail('fontSizePt 누락');
       if(t.leadingPt!=null)num(t.leadingPt,1,500,'leadingPt');
       num(t.tracking,-1000,1000,'tracking');if(!Object.prototype.hasOwnProperty.call(aligns,t.alignment))fail('alignment 미지원');
       if(t.fillColorRef!==undefined)color(t.fillColorRef);
       for(const k of ['spaceBeforeMm','spaceAfterMm'])if(t[k]!==undefined){num(t[k],0,100,k);if(e.role!=='body'&&t[k]!==0)fail('문단 간격 확장은 body에서만 지원');}
       if(e.columns!==undefined){num(e.columns,1,6,'columns');if(!Number.isInteger(e.columns)||(e.role!=='body'&&e.columns!==1))fail('다단 columns는 body에서만 지원');}
       if(e.columnGap!==undefined)num(e.columnGap,0,100,'columnGap');
       if(e.inset!==undefined){if(!Array.isArray(e.inset)||e.inset.length!==4)fail('inset: mm 4개 필요');e.inset.forEach(v=>num(v,0,100,'inset'));}
       const ins=e.inset||[0,0,0,0],cols=e.columns||1,gap=e.columnGap||0;
       if(b.width-ins[1]-ins[3]-(cols-1)*gap<=0||b.height-ins[0]-ins[2]<=0)fail('inset/columnGap이 프레임보다 큽니다');
       if(e.role==='body'){
         if(e.flowGroup!=='body'||!Number.isInteger(e.flowOrder)||e.flowOrder<1)fail('body flowGroup/flowOrder 오류');orders.push(e.flowOrder);
         if(bodyType&&bodyType!==JSON.stringify(t))fail('연결 본문에는 동일 typography가 필요합니다');bodyType=JSON.stringify(t);
       }
     }else if(e.type==='image'){
       if(!['cover','contain'].includes(e.fit))fail('image.fit 미지원');if(e.cornerRadiusMm!==undefined)num(e.cornerRadiusMm,0,Math.min(b.width,b.height)/2,'cornerRadiusMm');
     }else{
       if(b.height!==0)fail('첫 버전은 수평 장식선만 지원');keys(e.stroke,['weightPt','colorRef','cap'],'stroke');num(e.stroke.weightPt,.01,50,'stroke.weightPt');color(e.stroke.colorRef);
       if(!['RoundEndCap','ButtEndCap','ProjectingEndCap'].includes(e.stroke.cap))fail('stroke.cap 미지원');
     }
   });
   if(seen.title!==1||!seen.body)fail('title 1개와 body 필요');
   for(const role of Object.keys(seen))if(role!=='body'&&seen[role]>1)fail('중복 role '+role);
   for(const role of slots.required)if(!seen[role])fail('required 프레임 누락 '+role);
   orders.sort((a,b)=>a-b);if(orders.some((n,i)=>n!==i+1))fail('flowOrder는 1부터 중복 없이 연속');
   const imageCount=(seen.image1||0)+(seen.image2||0);if(imageCount!==slots.images.max||(seen.image2&&!seen.image1))fail('이미지 슬롯 수 불일치');
   return clone(raw);
 }
 function normalize(raw,overrides={}){
   const design=validate(raw),warnings=[];
   keys(overrides,['bodyFont','titleFont'],'fontOverrides');Object.values(overrides).forEach(v=>str(v,'대체 폰트'));
   const elements=design.elements.map((e,i)=>{
     const b={...e.frame,role:e.type==='image'?'image':e.type==='line'?'line':e.role,fontSize:0,columns:e.columns||1,columnGap:e.columnGap||0,inset:e.inset||[0,0,0,0],imageIndex:e.type==='image'?Number(e.role.slice(5))-1:-1,label:'JSON_'+e.role+'_'+i,flowOrder:e.flowOrder||0};
     if(e.type==='text'||e.type==='pageNumber'){
       const t=e.typography,size=t.fontSizePt==null?8:t.fontSizePt,leading=t.leadingPt==null?size*1.2:t.leadingPt;
       if(t.fontSizePt==null)warnings.push(e.role+': 원본 글자 크기 누락 → 공통 기본 8pt');
       if(t.leadingPt==null)warnings.push(e.role+': 원본 행간 누락 → 글자 크기 × 1.2');
       const override=overrides[e.role==='title'?'titleFont':'bodyFont'];
       b.fontSize=size;b.typography={font:override||t.fontFamily+'\t'+t.fontStyle,size,leading,tracking:t.tracking,align:aligns[t.alignment],spaceBefore:t.spaceBeforeMm||0,spaceAfter:t.spaceAfterMm||0,color:color(t.fillColorRef||'#000000').css,paint:color(t.fillColorRef||'#000000')};
       b.text=e.text;
     }else if(e.type==='image'){b.fit=e.fit;b.cornerRadius=e.cornerRadiusMm||0;b.fill=color(e.fillColorRef||'#FFFFFF');}
     else b.stroke={weight:e.stroke.weightPt,color:color(e.stroke.colorRef),cap:e.stroke.cap};
     return b;
   });
   return {design,elements,warnings};
 }
 function manifest(raw){
   if(!raw||raw.schema!==LIBRARY||!Array.isArray(raw.templates)||raw.templates.length>100)fail('manifest 형식 오류');return raw.templates;
 }
 async function load(read){
   const rows=manifest(JSON.parse(await read('manifest.json'))),result=[],ids=new Set();
   for(const entry of rows){
     try{
       if(!entry||typeof entry.id!=='string'||ids.has(entry.id))fail('manifest id 누락/중복');ids.add(entry.id);
       if(!/^[a-z0-9][a-z0-9-]*\.json$/.test(entry.file||'')||entry.file==='manifest.json')fail('안전하지 않은 파일명');
       const text=await read(entry.file);if(text.length>500000)fail('파일 크기 초과');const design=validate(JSON.parse(text));
       if(design.id!==entry.id)fail('manifest와 design id 불일치');result.push({id:entry.id,design});
     }catch(e){result.push({id:entry&&entry.id||'unknown',error:e.message});}
   }
   return result;
 }
 return {PT,ptToMm:n=>n/PT,mmToPt:n=>n*PT,validate,normalize,load,color};
});
