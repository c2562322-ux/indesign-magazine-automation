(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./design-model'),require('./article-input'),require('./auto-fit'),require('./docx-media'));else root.MagazineMatching=factory(root.MagazineDesignModel,root.MagazineInput,root.MagazineAutoFit,root.MagazineDocxMedia);})(typeof window!=='undefined'?window:this,function(Model,Input,Fit,Media){
/* Phase B/C: measurable, offline analysis. Never mutates/creates a Host document.
 * Estimates are not typography metrics and cannot authorize PDF or Auto Fix.
 */
'use strict';

const clone=x=>JSON.parse(JSON.stringify(x));
const ROLES=['title','subtitle','body','image1','image2','caption','header','footer','pageNumber'];
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const originals=new WeakSet();
function immutable(model){if(originals.has(model))return model;const value=freeze(clone(model));originals.add(value);return value;}
const count=text=>Array.from(String(text||'')).length;
// Rectangular minimum-cost assignment; source order is a deterministic tie breaker.
// Unknown dimensions retain source order rather than inventing image geometry.
function imageAssignment(slots,images){
 if(images.length>slots.length)throw new Error('사진 수보다 IMAGE 슬롯이 적습니다.');
 const required=slots.map((s,i)=>s.requirement==='required'?i:null).filter(i=>i!==null);
 if(required.length>images.length)throw new Error('필수 IMAGE 슬롯에 필요한 사진이 없습니다.');
 if(!images.length)return slots.map(()=>null);
 const profiles=images.map(imageProfile);
 if(profiles.some(p=>!p.known)){const result=slots.map(()=>null),order=required.concat(slots.map((s,i)=>i).filter(i=>!required.includes(i)));for(let i=0;i<images.length;i++)result[order[i]]=i;return result;}
 if(profiles.some(p=>!Number.isFinite(p.aspectRatio)||p.aspectRatio<=0))throw new Error('사진 비율이 유효하지 않습니다.');
 if(slots.some(s=>!Number.isFinite(s.aspectRatio)||s.aspectRatio<=0))throw new Error('IMAGE 슬롯 비율이 유효하지 않습니다.');
 const n=images.length,m=slots.length,u=Array(n+1).fill(0),v=Array(m+1).fill(0),p=Array(m+1).fill(0),way=Array(m+1).fill(0);
 const loss=(i,j)=>Math.abs(Math.log(profiles[i].aspectRatio)-Math.log(slots[j].aspectRatio));
 let maxLoss=0;for(let i=0;i<n;i++)for(let j=0;j<m;j++)maxLoss=Math.max(maxLoss,loss(i,j));
 const requiredPriority=maxLoss*(n+1)+1;
 const cost=(i,j)=>loss(i,j)-(slots[j].requirement==='required'?requiredPriority:0);
 for(let i=1;i<=n;i++){p[0]=i;let j0=0;const min=Array(m+1).fill(Infinity),used=Array(m+1).fill(false);
  do{used[j0]=true;const i0=p[j0];let delta=Infinity,j1=0;for(let j=1;j<=m;j++)if(!used[j]){const cur=cost(i0-1,j-1)-u[i0]-v[j];if(cur<min[j]){min[j]=cur;way[j]=j0;}if(min[j]<delta){delta=min[j];j1=j;}}
   for(let j=0;j<=m;j++)if(used[j]){u[p[j]]+=delta;v[j]-=delta;}else min[j]-=delta;j0=j1;
  }while(p[j0]!==0);
  do{const j1=way[j0];p[j0]=p[j1];j0=j1;}while(j0);
 }
 const result=slots.map(()=>null);for(let j=1;j<=m;j++)if(p[j])result[j-1]=p[j]-1;
 if(required.some(i=>result[i]===null))throw new Error('필수 IMAGE 슬롯 매칭 실패');
 return result;
}
function imageProfile(image={}){
    const width=image.width||image.widthPx,height=image.height||image.heightPx;
    if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)return {known:false,width:null,height:null,aspectRatio:null,orientation:'unknown'};
    const ratio=width/height;
    return {known:true,width,height,aspectRatio:ratio,orientation:Math.abs(ratio-1)<.05?'square':ratio>1?'landscape':'portrait',source:'supplied-pixel-dimensions'};
}
function articleProfile(article){
    const metrics=text=>{text=String(text||'').replace(/\r\n?/g,'\n');const paragraphs=text.split('\n').filter(p=>p.trim()),chars=count(text.replace(/\n/g,''));
        return {characters:chars,words:text.trim()?text.trim().split(/\s+/u).length:0,paragraphs:paragraphs.length,averageParagraphLength:paragraphs.length?chars/paragraphs.length:0,
            cjkFraction:chars?(text.match(/[\u3000-\u9fff\uac00-\ud7af]/g)||[]).length/chars:0};};
    return {schema:'magazine-article-profile/v1',title:metrics(article.title),subtitle:metrics(article.subtitle),body:metrics(article.body),
        subtitlePresent:!!String(article.subtitle||'').trim(),captionPresent:!!String(article.caption||'').trim(),images:(article.images||[]).map(im=>({...imageProfile(im),documentOrder:im.documentOrder??null,paragraphPosition:im.paragraphIndex??null})),imageCount:(article.images||[]).length,
        category:typeof article.category==='string'?article.category:null};
}
function parseArticle(name,bytes,images=[]){
    if(!Array.isArray(images))throw new Error('사진 목록은 배열이어야 합니다.');
    const result=/\.docx$/i.test(name)?Media.extract(bytes):{article:Input.parse(name,bytes),warnings:[]};const article=result.article;article.images=(article.images||[]).concat(clone(images));return {...result,article,profile:articleProfile(article)};
}
function framePreferences(model,e){
    const direct=e.textFrame&&e.textFrame.properties||{},style=model.styles.object.find(s=>s.id===e.objectStyleRef),inherited={};
    // Do not flatten inactive Object Style groups or guess unresolved parents.
    if(style&&style.resolvedProperties.EnableTextFrameGeneralOptions===true){
        const p=Model.styleChildren(model,style).TextFramePreference||{};
        for(const key of ['TextColumnCount','TextColumnGutter','InsetSpacing','VerticalJustification'])if(p[key]!=null)inherited[key]=p[key];
    }
    return {inherited:clone(inherited),direct:clone(direct),effective:{...inherited,...direct}};
}
function capacity(model,e,{paragraphs=1,cjkFraction=1}={}){
    const unknown=reason=>({known:false,reason,confidence:'unknown'});
    if(e.type!=='TextFrame'||e.pageCandidates.length!==1)return unknown('프레임의 페이지/텍스트 유형 확인 필요');
    if(e.spreadTransform.slice(0,4).some((n,i)=>n!==[1,0,0,1][i]))return unknown('회전·배율·기울임 프레임');
    if(e.paths.length!==1||e.paths[0].open||e.paths[0].points.length!==4||e.paths[0].points.some(p=>JSON.stringify(p.Anchor)!==JSON.stringify(p.LeftDirection)||JSON.stringify(p.Anchor)!==JSON.stringify(p.RightDirection)))return unknown('비사각/곡선 프레임');
    const anchors=e.paths[0].points.map(p=>p.Anchor);
    if(new Set(anchors.map(p=>p[0])).size!==2||new Set(anchors.map(p=>p[1])).size!==2)return unknown('비사각 프레임');
    const story=model.stories.find(s=>s.id===e.textFrame.storyRef),runs=story&&story.paragraphs.flatMap(p=>p.runs);
    if(!runs||!runs.length)return unknown('Story/style 확인 필요');
    if(runs.some(r=>r.tokens.some(t=>!['Content','Br'].includes(t.type))))return unknown('복합 Story 객체');
    const types=runs.map(r=>r.resolvedProperties);
    if(types.some(t=>!Number.isFinite(t.PointSize)||t.PointSize<=0||typeof t.AppliedFont!=='string'||typeof t.FontStyle!=='string'||!Number.isFinite(t.Tracking)||!Number.isFinite(t.SpaceBefore)||!Number.isFinite(t.SpaceAfter)))return unknown('폰트/조판 속성 미해결');
    if(types.some(t=>t.Tracking< -200||Math.abs(t.BaselineShift||0)>t.PointSize))return unknown('극단 자간/기준선 이동은 실제 폰트 metric 확인 필요');
    const leads=types.map(t=>t.Leading==='Auto'?t.PointSize*t.AutoLeading/100:t.Leading);
    if(leads.some(n=>!Number.isFinite(n)||n<=0))return unknown('행간 미해결');
    const p=framePreferences(model,e).effective,b=e.pageBounds[e.pageCandidates[0]];
    const inset=Array.isArray(p.InsetSpacing)?p.InsetSpacing:Array(4).fill(p.InsetSpacing),columns=p.TextColumnCount,gap=p.TextColumnGutter;
    if(inset.length!==4||!inset.every(n=>Number.isFinite(n)&&n>=0)||!Number.isInteger(columns)||columns<1||!Number.isFinite(gap)||gap<0)return unknown('단/간격/inset 미해결');
    const width=(b[3]-b[1]-inset[1]-inset[3]-(columns-1)*gap)/columns,height=b[2]-b[0]-inset[0]-inset[2];
    const maxSize=Math.max(...types.map(t=>t.PointSize));
    // Unknown font metrics: envelope of em advances, not a claimed glyph measurement.
    const cf=Math.min(1,Math.max(0,cjkFraction));
    const advances=factor=>types.map(t=>t.PointSize*((cf+(1-cf)*factor)+t.Tracking/1000)*(t.HorizontalScale==null?1:t.HorizontalScale/100));
    const maxAdvance=Math.max(...advances(.7)),minAdvance=Math.min(...advances(.4));
    const indent=Math.max(...types.map(t=>Math.max(0,t.LeftIndent||0)+Math.max(0,t.RightIndent||0)+Math.max(0,t.FirstLineIndent||0)));
    const spacing=Math.max(...types.map(t=>Math.max(0,t.SpaceBefore)+Math.max(0,t.SpaceAfter)))*Math.max(0,paragraphs);
    const availableHeight=Math.max(0,height-spacing/columns),leading=Math.max(...leads);
    if(![width,height,maxAdvance,minAdvance,indent,spacing,leading].every(Number.isFinite)||minAdvance<=0)return unknown('유효하지 않은 조판 수치');
    const glyphHeight=Math.max(...types.map(t=>t.PointSize*(t.VerticalScale==null?1:t.VerticalScale/100)+Math.abs(t.BaselineShift||0)));
    if(!Number.isFinite(glyphHeight)||glyphHeight<=0)return unknown('글자 높이 미해결');
    // Leading can be much smaller than point size in a valid one-line design.
    // Account for the first line's glyph height rather than packing height/leading lines.
    const lines=Math.max(0,1+Math.floor((availableHeight-glyphHeight*1.1)/leading));
    const highLines=Math.max(0,1+Math.floor((availableHeight-glyphHeight*.7)/leading));
    const low=Math.max(0,Math.floor((width-indent)/maxAdvance))*lines*columns;
    const high=Math.max(0,Math.floor(width/minAdvance))*highLines*columns;
    return {known:true,estimatedCharacters:{low:Math.floor(low*.75),high:Math.floor(high*1.15)},confidence:'low',
        sourceObservation:{characters:count(runs.flatMap(r=>r.tokens.filter(t=>t.type==='Content').map(t=>t.text)).join('')),paragraphs:story.paragraphs.length,exclusiveFrame:model.elements.filter(x=>x.textFrame&&x.textFrame.storyRef===story.id).length===1,hostFitVerified:false},
        practicalLines:lines,columns,columnGap:gap,insets:clone(inset),fontSize:maxSize,leading,
        assumptions:['실제 glyph metric 미측정; 첫 줄 높이 0.7~1.1em 가정','혼합 run의 보수적 행간/글자 폭','문단 간격 반영; keep/조판/단어 줄바꿈 근사','추정 하한 -25%, 상한 +15%'],
        fontFaces:[...new Set(types.map(t=>t.AppliedFont+'\t'+t.FontStyle))]};
}
function roleSuggestions(model,e){
    if(e.role&&e.role.confirmed)return [{role:e.role.confirmed,confidence:1,evidence:'script-label',confirmed:true}];
    const story=e.textFrame&&model.stories.find(s=>s.id===e.textFrame.storyRef);
    const styleNames=[e.objectStyleRef,...(story?story.paragraphs.map(p=>p.styleRef):[])].filter(Boolean).join(' ');
    const layer=model.layers.find(l=>l.id===e.layerRef),signals=[['style',styleNames],['frame-name',e.properties.Name||''],['layer',layer&&layer.properties.Name||'']];
    const out=[];
    for(const [source,text] of signals)for(const [role,rx] of [['subtitle',/subtitle|부제/i],['title',/(?:^|[\s/_-])title(?:$|[\s/_-])|제목/i],['body',/body|본문/i],['caption',/caption|캡션/i]])if(rx.test(text))out.push({role,confidence:.6,evidence:source,confirmed:false});
    if(e.image&&e.image.length)out.push({role:'image1',confidence:.4,evidence:'placed-image; image order unconfirmed',confirmed:false});
    else if(e.properties.ContentType==='GraphicType')out.push({role:'image1',confidence:.2,evidence:'empty graphic frame; may be decoration',confirmed:false});
    if(story){
        const types=story.paragraphs.flatMap(p=>p.runs.map(r=>r.resolvedProperties));
        if(types.some(t=>Number.isFinite(t.PointSize)&&t.PointSize>=24))out.push({role:'title',confidence:.25,evidence:'large type only; may be furniture',confirmed:false});
        if(framePreferences(model,e).effective.TextColumnCount>1)out.push({role:'body',confidence:.25,evidence:'multiple columns only',confirmed:false});
    }
    return out;
}
function libraryEntry(model,descriptor){
    const errors=Model.validate(model);if(errors.length)throw new Error(errors.join('; '));
    if(!descriptor||!descriptor.id||descriptor.sourceSha256!==model.metadata.sourceSha256)throw new Error('Design identity/source hash mismatch');
    if(!Array.isArray(descriptor.pageIds)||!descriptor.pageIds.length||new Set(descriptor.pageIds).size!==descriptor.pageIds.length||descriptor.pageIds.some(id=>!model.pages.some(p=>p.id===id&&p.kind==='Spread')))throw new Error('Explicit normal-page scope required');
    const original=immutable(model),d=clone(descriptor),pages=model.pages.filter(p=>d.pageIds.includes(p.id));
    if(d.contentContract){const c=d.contentContract,s=c.subtitle;
        if(c.schema!=='magazine-content-contract/v1'||c.sourceSha256!==model.metadata.sourceSha256||s?.support!=='absent'||s.optional!==true||s.handling!=='omit-with-warning'||d.mappingReview?.length||Object.values(d.roles||{}).some(r=>r.role==='subtitle')||!['title','body'].every(role=>Object.values(d.roles||{}).some(r=>r.role===role)))throw new Error('Invalid/ambiguous optional content contract');
    }
    const elements=model.elements.filter(e=>e.pageCandidates.length===1&&d.pageIds.includes(e.pageCandidates[0]));
    for(const id of Object.keys(d.roles||{}))if(!elements.some(e=>e.id===id))throw new Error('Role mapping is outside selected pages: '+id);
    const mapped=elements.map(e=>{
        const override=d.roles&&d.roles[e.id];
        if(override&&(!(ROLES.includes(override.role)||/^image[1-9]\d*$/.test(override.role))||override.confirmed!==true))throw new Error('Role mapping requires user confirmation');
        const role=override?override.role:e.role&&e.role.confirmed;
        if(role&&(['title','subtitle','body','caption','header','footer','pageNumber'].includes(role)?e.type!=='TextFrame':!['Rectangle','Oval','Polygon'].includes(e.type)))throw new Error('Role/object type mismatch: '+e.id);
        return {element:e,role:role||null};
    });
    const text=mapped.filter(x=>x.element.textFrame),requiredFonts=[];
    if(d.contentContract&&mapped.some(x=>x.role==='subtitle'))throw new Error('Optional content contract conflicts with source SUBTITLE role');
    for(const {element:e} of text){const s=model.stories.find(s=>s.id===e.textFrame.storyRef);for(const r of s?s.paragraphs.flatMap(p=>p.runs):[]){const t=r.resolvedProperties;if(t.AppliedFont&&t.FontStyle&&!requiredFonts.some(f=>f.family===t.AppliedFont&&f.style===t.FontStyle))requiredFonts.push({family:t.AppliedFont,style:t.FontStyle});}}
    const imageSlots=mapped.filter(x=>/^image[1-9]\d*$/.test(x.role||'')).map(({element:e,role})=>{
        const b=e.pageBounds[e.pageCandidates[0]],width=b[3]-b[1],height=b[2]-b[0],page=pages.find(p=>p.id===e.pageCandidates[0]);
        const declared=d.images&&d.images[e.id],fitting=e.details&&e.details.FrameFittingOption;
        if(declared&&!['required','optional'].includes(declared))throw new Error('Image policy must be explicit required/optional');
        return {elementId:e.id,sourceId:e.id,pageId:e.pageCandidates[0],pageSetId:d.pageSet?.id||d.id,role,width,height,area:width*height,relativeArea:width*height/(page.width*page.height),aspectRatio:width/height,orientation:width===height?'square':width>height?'landscape':'portrait',
            prominence:width*height/(page.width*page.height),requirement:declared||'unknown',fitting:fitting||null};
    });
    const issues=[...(d.mappingReview||[])];
    if(imageSlots.some(s=>!Number.isFinite(s.aspectRatio)||s.width<=0||s.height<=0))issues.push('이미지 슬롯 geometry 확인 필요');
    for(const {element:e} of text){
        const story=model.stories.find(s=>s.id===e.textFrame.storyRef);
        if(!story||story.paragraphs.some(p=>p.runs.some(r=>!r.resolvedProperties.AppliedFont||!r.resolvedProperties.FontStyle)))issues.push('텍스트 폰트 식별 정보 확인 필요');
    }
    if(!mapped.some(x=>x.role==='title'))issues.push('제목 역할 확인 필요');
    if(!mapped.some(x=>x.role==='body'))issues.push('본문 역할 확인 필요');
    for(const role of ['title','subtitle','body']){
        const entries=mapped.filter(x=>x.role===role),stories=new Set(entries.map(x=>x.element.textFrame.storyRef));
        if(stories.size>1&&!(role==='body'&&Array.isArray(d.bodyFlow)&&d.bodyFlow.length===stories.size&&new Set(d.bodyFlow).size===stories.size&&d.bodyFlow.every(id=>stories.has(id))))issues.push(role+' 복수 Story 콘텐츠 분배 확인 필요');
        for(const {element:e} of entries){
            const all=model.elements.filter(x=>x.textFrame&&x.textFrame.storyRef===e.textFrame.storyRef);
            if(all.some(x=>!entries.some(v=>v.element.id===x.id)))issues.push(role+' Story가 선택 영역/역할 밖으로 연결됨');
        }
    }
    if(new Set(imageSlots.map(s=>s.role)).size!==imageSlots.length)issues.push('사진 순서 역할 중복');
    if(imageSlots.some(s=>s.requirement==='unknown'))issues.push('사진 필수/선택 정책 확인 필요');
    for(const i of model.issues)if(['BROKEN_THREAD','MISSING_STORY','STYLE_CYCLE','MISSING_STYLE'].includes(i.code))issues.push('원본 참조 오류: '+i.code);
    const unassigned=mapped.filter(x=>!x.role&&(x.element.textFrame||x.element.image&&x.element.image.length));
    // Unmapped content may be deliberate furniture, but it must be acknowledged as such.
    if(unassigned.some(x=>!(d.preserveElementIds||[]).includes(x.element.id)))issues.push('미확정 콘텐츠 영역 확인 필요');
    const profile={id:d.id,name:d.name||d.id,pageCount:pages.length,orientations:pages.map(p=>p.width>p.height?'landscape':p.width<p.height?'portrait':'square'),
        imageSlots,requiredFonts,supportedRoles:[...new Set(mapped.map(x=>x.role).filter(Boolean))],
        textFrames:text.map(({element:e,role})=>({elementId:e.id,role,capacity:capacity(model,e),preferences:framePreferences(model,e)})),
        continuation:{canAddPages:false,threadedFrames:text.filter(x=>x.element.textFrame.nextRef&&x.element.textFrame.nextRef!=='n').length},
        roleCandidates:mapped.filter(x=>!x.role).map(x=>({elementId:x.element.id,suggestions:roleSuggestions(model,x.element)})).filter(x=>x.suggestions.length),
        observedGraphicFrames:elements.filter(e=>e.properties.ContentType==='GraphicType'||e.image&&e.image.length).map(e=>{
            const b=e.pageBounds[e.pageCandidates[0]],page=pages.find(p=>p.id===e.pageCandidates[0]);
            return {elementId:e.id,width:b[3]-b[1],height:b[2]-b[0],placedImageCount:e.image.length,
                pageAreaFraction:(b[3]-b[1])*(b[2]-b[0])/(page.width*page.height),roleConfirmed:false};
        }),
        issues:[...new Set(issues)],readyForMatching:issues.length===0,productionReady:false};
    profile.roleCapacities=Object.fromEntries(['title','subtitle','body'].map(role=>{
        const rows=profile.textFrames.filter(f=>f.role===role),known=rows.length>0&&rows.every(f=>f.capacity.known);
        return [role,{known,frameCount:rows.length,estimatedCharacters:known?{
            low:rows.reduce((n,f)=>n+f.capacity.estimatedCharacters.low,0),high:rows.reduce((n,f)=>n+f.capacity.estimatedCharacters.high,0)}:null,
            columns:rows.map(f=>f.capacity.known?f.capacity.columns:null),confidence:known?'low':'unknown'}];
    }));
    return freeze({id:d.id,descriptor:d,original,profile});
}
function evaluate(entry,article,{installedFonts=null}={}){
    const a=article.schema==='magazine-article-profile/v1'?article:articleProfile(article),p=entry.profile;
    const hard=[],review=[],soft=[],reasons=[];let score=100;
    const add=(list,code,message,penalty=0)=>{list.push({code,message});score-=penalty;};
    for(const message of p.issues)add(review,'DESIGN_REVIEW',message);
    if(installedFonts===null)add(review,'FONT_STATUS_UNKNOWN','설치 폰트 확인 필요');
    else for(const f of p.requiredFonts)if(!installedFonts.some(x=>x.family===f.family&&x.style===f.style))add(hard,'MISSING_FONT','필수 폰트 없음: '+f.family+' / '+f.style);
    if(a.subtitlePresent&&!p.supportedRoles.includes('subtitle')){
        if(p.readyForMatching&&entry.descriptor.contentContract?.subtitle?.handling==='omit-with-warning')add(soft,'SUBTITLE_NOT_APPLIED','이 디자인에는 SUBTITLE 슬롯이 없어 DOCX 부제는 미적용됩니다. TITLE/BODY에 합치지 않습니다.',12);
        else add(p.readyForMatching?hard:review,'SUBTITLE_UNSUPPORTED','부제를 넣을 확정 영역이 없습니다.');
    }
    if(a.captionPresent&&!p.supportedRoles.includes('caption'))add(p.readyForMatching?hard:review,'CAPTION_UNSUPPORTED','캡션을 넣을 확정 영역이 없습니다.');
    if(a.imageCount>p.imageSlots.length)add(p.readyForMatching?hard:review,'EXTRA_IMAGES','사진 수보다 확인된 이미지 슬롯이 적습니다.');
    const imageOrder=entry.descriptor.imageMatching==='minimum-crop/v1'&&a.images.length<=p.imageSlots.length&&p.imageSlots.filter(s=>s.requirement==='required').length<=a.images.length?imageAssignment(p.imageSlots,a.images):p.imageSlots.map(s=>Number(s.role.slice(5))-1);
    for(const [slotIndex,slot] of p.imageSlots.entries()){const index=imageOrder[slotIndex],image=index===null?null:a.images[index];
        if(!image&&slot.requirement==='required')add(hard,'MISSING_IMAGE',slot.role+' 필수 사진이 없습니다.');
        if(image){if(!image.known)add(review,'IMAGE_DIMENSIONS_UNKNOWN','사진 비율 확인 필요');
            else {const ppi=Math.min(image.width/(slot.width/72),image.height/(slot.height/72));if(ppi<150)add(soft,'IMAGE_RESOLUTION','사진 '+(index+1)+' 해상도가 슬롯 크기에 비해 낮습니다 (추정 '+Math.round(ppi)+' ppi).',10);const retained=Math.min(image.aspectRatio/slot.aspectRatio,slot.aspectRatio/image.aspectRatio);
                if(retained<.8)add(soft,'IMAGE_RATIO','사진과 슬롯 비율 차이: 크롭/여백 확인 필요',Math.round((1-retained)*15));
                else reasons.push('사진 '+(index+1)+' 비율이 슬롯에 가깝습니다.');}}
    }
    const estimates={};
    for(const role of ['title','subtitle','body']){
        if(role==='subtitle'&&!a.subtitlePresent)continue;
        const rows=p.textFrames.filter(t=>t.role===role),metrics=a[role];if(!rows.length)continue;
        const caps=rows.map(t=>capacity(entry.original,entry.original.elements.find(e=>e.id===t.elementId),{paragraphs:Math.ceil(metrics.paragraphs/rows.length),cjkFraction:metrics.cjkFraction}));
        if(caps.some(c=>!c.known)){add(review,'CAPACITY_UNKNOWN',role+' 수용량 계산에 필요한 속성 확인 필요');continue;}
        const low=caps.reduce((n,c)=>n+c.estimatedCharacters.low,0),high=caps.reduce((n,c)=>n+c.estimatedCharacters.high,0);estimates[role]={low,high,characters:metrics.characters,confidence:'low'};
        if(metrics.characters<=low)reasons.push(({title:'제목',subtitle:'부제',body:'본문'})[role]+' 분량이 보수적 추정 범위 안입니다.');
        else if(metrics.characters<=high)add(soft,'CAPACITY_MARGIN',role+' 여유가 적어 실제 조판 확인 필요',8);
        else if(role==='title'&&entry.descriptor.autoFit&&entry.descriptor.autoFit.title&&entry.descriptor.autoFit.title.confirmed===true){
            const policy=entry.descriptor.autoFit.title,min=policy.minFontSize,original=Math.max(...caps.map(c=>c.fontSize));
            const floor=Math.min(original,Math.max(Fit.POLICY.title.min,original*Fit.POLICY.title.ratio));
            if(Number.isFinite(min)&&min>0&&min<=original&&min>=floor&&metrics.characters<=high*Math.pow(original/min,2))add(soft,'AUTO_FIT_REQUIRED','제목은 승인된 축소 한계 내 추정이나 충돌/넘침 실기 확인 필요',20);
            else add(hard,'TITLE_CAPACITY','제목이 승인된 추정 범위를 초과합니다.');
        }else if(caps.some(c=>c.sourceObservation.exclusiveFrame&&c.sourceObservation.characters>c.estimatedCharacters.high))add(review,'SOURCE_CAPACITY_UNCALIBRATED',role+' 추정 상한이 원본 Story 분량보다 작음: 원본 overflow/실제 폰트 metric 확인 필요 (적합 판정 아님)');
        else if(metrics.characters>high*1.5)add(hard,'SEVERE_CAPACITY',role+' 분량이 추정 상한을 크게 초과합니다 (실기 미확정).');
        else add(review,'OVER_ESTIMATE',role+' 추정 상한 초과: 실제 조판 확인 전 추천 보류');
    }
    return {id:p.id,name:p.name,status:hard.length?'excluded':review.length?'review-required':'candidate',score:Math.max(0,score),hard,review,soft,reasons,estimates,
        fixedPages:p.pageCount,productionReady:false};
}
// Recommendation uncertainty is not evidence of broken output. Only this explicit
// allowlist moves estimates to WARN; unknown diagnostics fail closed. Native
// Fidelity, font, role, content readback and overset checks still run at production.
const ESTIMATE_WARNINGS=new Set(['CAPACITY_UNKNOWN','CAPACITY_MARGIN','SOURCE_CAPACITY_UNCALIBRATED','OVER_ESTIMATE','SEVERE_CAPACITY','TITLE_CAPACITY','AUTO_FIT_REQUIRED']);
function productionAssessment(entry,article,options){
    const row=evaluate(entry,article,options),diagnostics=[];
    for(const [origin,list] of [['hard',row.hard],['review',row.review],['soft',row.soft]])for(const d of list){
        const estimate=ESTIMATE_WARNINGS.has(d.code);
        const severity=estimate||d.code==='FONT_STATUS_UNKNOWN'||origin==='soft'?'WARN':'BLOCK';
        diagnostics.push({...d,severity,origin,message:estimate?d.message.replace('실제 조판 확인 전 추천 보류','제작 후 실제 조판 검사 필요')+' · 추정치이며 제작 후 Recompose/overflow 검사로 판정':d.message});
    }
    for(const message of [...(entry.descriptor.capability?.fidelityReasons||[]),...(entry.descriptor.capability?.productionReasons||[])])diagnostics.push({code:'PRODUCTION_UNSUPPORTED',message,severity:'BLOCK',origin:'capability'});
    diagnostics.push({code:'HOST_CHECK_REQUIRED',severity:'INFO',origin:'runtime',message:'제작 시 원본 Fidelity와 콘텐츠 검사를 실행합니다. 추천은 Adobe 검증 완료를 의미하지 않습니다.'});
    const blocks=diagnostics.filter(d=>d.severity==='BLOCK'),warnings=diagnostics.filter(d=>d.severity==='WARN');
    return {...row,decision:blocks.length?'BLOCK':warnings.length?'WARN':'INFO',diagnostics,
        status:blocks.length?(blocks.some(d=>d.origin==='hard')?'excluded':'review-required'):'candidate',
        hard:blocks.filter(d=>d.origin==='hard'),review:blocks.filter(d=>d.origin!=='hard'),soft:warnings,
        score:Math.max(0,row.score-diagnostics.filter(d=>ESTIMATE_WARNINGS.has(d.code)&&d.origin!=='soft').length*20),productionReady:false};
}
function rank(entries,article,options){
    const rows=entries.map(e=>evaluate(e,article,options));
    return {candidates:rows.filter(r=>r.status==='candidate').sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id)),
        reviewRequired:rows.filter(r=>r.status==='review-required'),excluded:rows.filter(r=>r.status==='excluded'),selectedId:null};
}
async function loadLibrary(manifest,read){
    if(!manifest||manifest.schema!=='magazine-design-library/v1'||!Array.isArray(manifest.designs))throw new Error('Invalid design library manifest');
    const entries=[],errors=[],seen=new Set(),models=new Map();
    for(const row of manifest.designs){
        try{
            if(!row||typeof row.id!=='string'||seen.has(row.id))throw new Error('Duplicate/invalid design ID');
            seen.add(row.id);
            if(typeof row.model!=='string'||! /^[A-Za-z0-9_-]+\.json$/.test(row.model))throw new Error('Model must be a local JSON basename');
            if(!models.has(row.model))models.set(row.model,immutable(JSON.parse(await read(row.model))));
            entries.push(libraryEntry(models.get(row.model),row));
        }catch(error){errors.push({id:row&&row.id||null,error:String(error.message)});}
    }
    return {entries,errors};
}
function storyWeight(model,id){const s=model.stories.find(s=>s.id===id);return Math.max(1,s.paragraphs.flatMap(p=>p.runs).flatMap(r=>r.tokens).reduce((n,t)=>n+(t.type==='Content'?t.text.length:t.type==='Br'?1:0),0));}
function bindContent(entry,article,options){
    if(!entry.profile.readyForMatching)throw new Error('Confirm roles and source references before binding');
    const suitability=productionAssessment(entry,article,options);
    if(suitability.decision==='BLOCK')throw new Error('Content violates constraints: '+suitability.diagnostics.filter(x=>x.severity==='BLOCK').map(x=>x.code).join(', '));
    const bindings=[];
    for(const t of entry.profile.textFrames.filter(t=>['title','subtitle','body','caption'].includes(t.role))){
        if(t.role==='caption'&&!String(article.caption||'').trim())continue; // An absent DOCX caption does not erase fixed source text.
        const e=entry.original.elements.find(e=>e.id===t.elementId);
        if(!bindings.some(b=>b.storyId===e.textFrame.storyRef))bindings.push({storyId:e.textFrame.storyRef,role:t.role,text:String(article[t.role]||'')});
    }
    const body=bindings.filter(b=>b.role==='body');
    if(body.length>1){
        const ordered=entry.descriptor.bodyFlow.map(id=>body.find(b=>b.storyId===id));
        const chars=String(article.body||'').match(/\r\n|[\s\S]/gu)||[];if(chars.length<ordered.length)throw new Error('본문이 독립 BODY 영역 수보다 짧습니다. 다른 템플릿을 선택해주세요.');
        let offset=0,total=ordered.reduce((n,b)=>n+storyWeight(entry.original,b.storyId),0);
        for(let i=0;i<ordered.length;i++){
            const b=ordered[i],weight=storyWeight(entry.original,b.storyId);let end=chars.length;
            if(i<ordered.length-1){const limit=chars.length-(ordered.length-i-1),target=Math.min(limit,Math.max(offset+1,offset+Math.round((chars.length-offset)*weight/total)));
                const breaks=[];for(let j=offset+1;j<=limit;j++)if(/\s/.test(chars[j-1])&&chars[j-1]!=='\r')breaks.push(j);
                end=breaks.length?breaks.reduce((a,n)=>Math.abs(n-target)<Math.abs(a-target)?n:a,breaks[0]):target;
            }
            b.text=chars.slice(offset,end).join('');offset=end;total-=weight;
        }
    }
    const slots=entry.profile.imageSlots,images=article.images||[],assignment=entry.descriptor.imageMatching==='minimum-crop/v1'?imageAssignment(slots,images):slots.map(slot=>Number(slot.role.slice(5))-1);
    for(const [index,slot] of slots.entries()){const image=assignment[index]===null?null:images[assignment[index]];bindings.push({elementId:slot.elementId,role:slot.role,image:image?clone(image):null,imageSourceIndex:assignment[index]});}
    const unappliedContent=suitability.diagnostics.filter(d=>d.code==='SUBTITLE_NOT_APPLIED').map(d=>({role:'subtitle',characters:String(article.subtitle||'').length,reason:'NO_REGISTERED_SLOT',handling:'omit-with-warning',message:d.message}));
    return {original:entry.original,content:bindings,unappliedContent,runtimeAdjustments:[],suitability,productionReady:false,
        reason:'원본 Fidelity 검사 후 registered-native에서 콘텐츠만 교체합니다. 바인딩만으로 출력 승인하지 않습니다.'};
}
// A relation, not a page/text deletion rule: a unique empty IMAGE slot must
// wholly contain an unassigned, standalone instruction frame. Captions and
// explicit roles are never eligible. Ambiguous containment remains untouched.
function imagePlaceholders(entry){
 const m=entry.original,d=entry.descriptor,out=[];
 for(const e of m.elements){
  if(!e.textFrame||e.pageCandidates.length!==1||!d.pageIds.includes(e.pageCandidates[0])||d.roles[e.id]||e.role?.confirmed||!d.preserveElementIds?.includes(e.id))continue;
  const story=m.stories.find(s=>s.id===e.textFrame.storyRef);
  if(!story||m.elements.filter(f=>f.textFrame?.storyRef===story.id).length!==1)continue;
  const tokens=story.paragraphs.flatMap(p=>p.runs.flatMap(r=>r.tokens));
  if(tokens.some(t=>!['Content','Br'].includes(t.type)))continue;
  const label=tokens.map(t=>t.type==='Content'?t.text:' ').join('').trim();
  if(!/^(?:(?:대표|일반)?이미지|image\s*placeholder|photo\s*placeholder)$/i.test(label))continue;
  const b=e.pageBounds[e.pageCandidates[0]],area=(b[2]-b[0])*(b[3]-b[1]);
  const slots=entry.profile.imageSlots.filter(slot=>{const f=m.elements.find(f=>f.id===slot.elementId),a=f.pageBounds[e.pageCandidates[0]];return a&&f.pageCandidates.length===1&&!(f.image||[]).length&&b[0]>=a[0]&&b[1]>=a[1]&&b[2]<=a[2]&&b[3]<=a[3]&&area>0&&area*4<(a[2]-a[0])*(a[3]-a[1]);});
  if(slots.length===1)out.push({elementId:e.id,imageElementId:slots[0].elementId,role:slots[0].role,evidence:'standalone instruction wholly inside one confirmed empty IMAGE frame'});
 }
 return out;
}
function calibration(estimate,observed){
    if(!estimate.known||!observed||typeof observed.overflows!=='boolean'||!Number.isFinite(observed.characters)||!observed.documentEvidence)throw new Error('Measured Host evidence required');
    return {estimate:clone(estimate),observed:clone(observed),insideEstimatedRange:observed.characters>=estimate.estimatedCharacters.low&&observed.characters<=estimate.estimatedCharacters.high,
        note:'한 관측값으로 최대 수용량이나 자동 보정 계수를 확정하지 않습니다.'};
}
return {imageAssignment,productionAssessment,isImmutable:model=>originals.has(model),imagePlaceholders,imageProfile,articleProfile,parseArticle,framePreferences,capacity,roleSuggestions,libraryEntry,evaluate,rank,loadLibrary,bindContent,calibration};

});
