(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./design-model'),require('./article-input'),require('./auto-fit'));else root.MagazineMatching=factory(root.MagazineDesignModel,root.MagazineInput,root.MagazineAutoFit);})(typeof window!=='undefined'?window:this,function(Model,Input,Fit){
/* Phase B/C: measurable, offline analysis. Never mutates/creates a Host document.
 * Estimates are not typography metrics and cannot authorize PDF or Auto Fix.
 */
'use strict';

const clone=x=>JSON.parse(JSON.stringify(x));
const ROLES=['title','subtitle','body','image1','image2','caption','header','footer','pageNumber'];
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const originals=new WeakSet();
function immutable(model){if(originals.has(model))return model;const value=freeze(clone(model));originals.add(value);return value;}
const count=text=>Array.from(String(text||'')).length;
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
    if(!Array.isArray(images)||images.length>2)throw new Error('현재 기사 입력은 별도 사진 최대 2장을 지원합니다.');
    const article=Input.parse(name,bytes);article.images=clone(images);return {article,profile:articleProfile(article)};
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
    const elements=model.elements.filter(e=>e.pageCandidates.length===1&&d.pageIds.includes(e.pageCandidates[0]));
    for(const id of Object.keys(d.roles||{}))if(!elements.some(e=>e.id===id))throw new Error('Role mapping is outside selected pages: '+id);
    const mapped=elements.map(e=>{
        const override=d.roles&&d.roles[e.id];
        if(override&&(!ROLES.includes(override.role)||override.confirmed!==true))throw new Error('Role mapping requires user confirmation');
        const role=override?override.role:e.role&&e.role.confirmed;
        if(role&&(['title','subtitle','body','caption','header','footer','pageNumber'].includes(role)?e.type!=='TextFrame':!['Rectangle','Oval','Polygon'].includes(e.type)))throw new Error('Role/object type mismatch: '+e.id);
        return {element:e,role:role||null};
    });
    const text=mapped.filter(x=>x.element.textFrame),requiredFonts=[];
    for(const {element:e} of text){const s=model.stories.find(s=>s.id===e.textFrame.storyRef);for(const r of s?s.paragraphs.flatMap(p=>p.runs):[]){const t=r.resolvedProperties;if(t.AppliedFont&&t.FontStyle&&!requiredFonts.some(f=>f.family===t.AppliedFont&&f.style===t.FontStyle))requiredFonts.push({family:t.AppliedFont,style:t.FontStyle});}}
    const imageSlots=mapped.filter(x=>/^image[12]$/.test(x.role||'')).map(({element:e,role})=>{
        const b=e.pageBounds[e.pageCandidates[0]],width=b[3]-b[1],height=b[2]-b[0],page=pages.find(p=>p.id===e.pageCandidates[0]);
        const declared=d.images&&d.images[e.id],fitting=e.details&&e.details.FrameFittingOption;
        if(declared&&!['required','optional'].includes(declared))throw new Error('Image policy must be explicit required/optional');
        return {elementId:e.id,role,width,height,aspectRatio:width/height,orientation:width===height?'square':width>height?'landscape':'portrait',
            prominence:width*height/(page.width*page.height),requirement:declared||'unknown',fitting:fitting||null};
    });
    const issues=[];
    if(imageSlots.some(s=>!Number.isFinite(s.aspectRatio)||s.width<=0||s.height<=0))issues.push('이미지 슬롯 geometry 확인 필요');
    for(const {element:e} of text){
        const story=model.stories.find(s=>s.id===e.textFrame.storyRef);
        if(!story||story.paragraphs.some(p=>p.runs.some(r=>!r.resolvedProperties.AppliedFont||!r.resolvedProperties.FontStyle)))issues.push('텍스트 폰트 식별 정보 확인 필요');
    }
    if(!mapped.some(x=>x.role==='title'))issues.push('제목 역할 확인 필요');
    if(!mapped.some(x=>x.role==='body'))issues.push('본문 역할 확인 필요');
    for(const role of ['title','subtitle','body']){
        const entries=mapped.filter(x=>x.role===role),stories=new Set(entries.map(x=>x.element.textFrame.storyRef));
        if(stories.size>1)issues.push(role+' 복수 Story 콘텐츠 분배 확인 필요');
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
    if(a.subtitlePresent&&!p.supportedRoles.includes('subtitle'))add(p.readyForMatching?hard:review,'SUBTITLE_UNSUPPORTED','부제를 넣을 확정 영역이 없습니다.');
    if(a.captionPresent&&!p.supportedRoles.includes('caption'))add(p.readyForMatching?hard:review,'CAPTION_UNSUPPORTED','캡션을 넣을 확정 영역이 없습니다.');
    if(a.imageCount>p.imageSlots.length)add(p.readyForMatching?hard:review,'EXTRA_IMAGES','사진 수보다 확인된 이미지 슬롯이 적습니다.');
    for(const slot of p.imageSlots){const index=Number(slot.role.slice(-1))-1,image=a.images[index];
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
        }else if(metrics.characters>high*1.5)add(hard,'SEVERE_CAPACITY',role+' 분량이 추정 상한을 크게 초과합니다 (실기 미확정).');
        else add(review,'OVER_ESTIMATE',role+' 추정 상한 초과: 실제 조판 확인 전 추천 보류');
    }
    return {id:p.id,name:p.name,status:hard.length?'excluded':review.length?'review-required':'candidate',score:Math.max(0,score),hard,review,soft,reasons,estimates,
        fixedPages:p.pageCount,productionReady:false};
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
function bindContent(entry,article,options){
    if(!entry.profile.readyForMatching)throw new Error('Confirm roles and source references before binding');
    const suitability=evaluate(entry,article,options);
    if(suitability.hard.length)throw new Error('Content violates constraints: '+suitability.hard.map(x=>x.code).join(', '));
    const bindings=[];
    for(const t of entry.profile.textFrames.filter(t=>['title','subtitle','body','caption'].includes(t.role))){
        const e=entry.original.elements.find(e=>e.id===t.elementId);
        if(!bindings.some(b=>b.storyId===e.textFrame.storyRef))bindings.push({storyId:e.textFrame.storyRef,role:t.role,text:String(article[t.role]||'')});
    }
    for(const slot of entry.profile.imageSlots){const image=(article.images||[])[Number(slot.role.slice(-1))-1];bindings.push({elementId:slot.elementId,role:slot.role,image:image?clone(image):null});}
    return {original:entry.original,content:bindings,runtimeAdjustments:[],suitability,productionReady:false,
        reason:'v2 전체 지면 renderer 연결 전입니다. 기존 생성기로 자동 변환하지 않습니다.'};
}
function calibration(estimate,observed){
    if(!estimate.known||!observed||typeof observed.overflows!=='boolean'||!Number.isFinite(observed.characters)||!observed.documentEvidence)throw new Error('Measured Host evidence required');
    return {estimate:clone(estimate),observed:clone(observed),insideEstimatedRange:observed.characters>=estimate.estimatedCharacters.low&&observed.characters<=estimate.estimatedCharacters.high,
        note:'한 관측값으로 최대 수용량이나 자동 보정 계수를 확정하지 않습니다.'};
}
return {imageProfile,articleProfile,parseArticle,framePreferences,capacity,roleSuggestions,libraryEntry,evaluate,rank,loadLibrary,bindContent,calibration};

});
