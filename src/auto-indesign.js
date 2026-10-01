/* Host boundary. Only newly-created documents are written; all original documents stay untouched. */
'use strict';
const ID = require('indesign');
const app = ID.app;
const L = require('./layout-engine.js');
const fs = require('fs');
const D = require('./production-diagnostics.js');
const Fit = require('./auto-fit.js');
let fitContexts=new WeakMap();
let registeredContexts=new WeakMap();
let latest = null;
let fontCatalog = null, session = 0;
function resetSession(){latest=null;fitContexts=new WeakMap();registeredContexts=new WeakMap();fontCatalog=null;session++;}
// UXP DOM enum values may be distinct wrappers for the same value.
function sameEnum(value,expected){return value!=null&&typeof value.equals==='function'?value.equals(expected):value===expected;}
function mm(n) { return n + 'mm'; }
function bounds(b) { return [b.y,b.x,b.y+b.height,b.x+b.width].map(mm); }
function installedFont(name) {
    const direct = app.fonts.itemByName(name);
    if (direct && direct.isValid && sameEnum(direct.status,ID.FontStatus.INSTALLED) &&
        [direct.name,direct.fullName,direct.postscriptName].includes(name)) return direct;
    const rows=listFonts(),exact=rows.find(f=>[f.name,f.fullName,f.postscriptName,f.family+'\t'+f.style].includes(name));
    const families=rows.filter(f=>f.family===name);
    if(!exact&&families.length>1)throw new Error('여러 스타일이 있는 폰트입니다: '+name+'. 폰트 더보기에서 사용할 스타일을 선택해주세요.');
    const match=exact||(families.length===1?families[0]:null);
    if(match){const f=app.fonts.itemByName(match.name);if(f&&f.isValid&&sameEnum(f.status,ID.FontStatus.INSTALLED))return f;}
    throw new Error('사용 가능한 폰트/스타일을 찾지 못했습니다: '+name+'. 폰트 더보기에서 설치된 대체 폰트를 선택해주세요. 자동 대체하지 않았습니다.');
}
function listFonts(refresh=false){
    if(fontCatalog&&!refresh)return fontCatalog;
    const out=[];
    const length=app.fonts.length;
    for(let i=0;i<length;i++){
        const f=app.fonts.item(i);
        if(f.isValid!==false&&sameEnum(f.status,ID.FontStatus.INSTALLED))out.push({name:f.name,family:f.fontFamily,style:f.fontStyleName,fullName:f.fullName,postscriptName:f.postscriptName});
    }
    fontCatalog=out.sort((a,b)=>a.family.localeCompare(b.family)||a.style.localeCompare(b.style));
    return fontCatalog;
}
function validateFonts(s){
    return ['bodyFont','titleFont'].map(role=>{try{const f=installedFont(s[role]);return {role,name:f.name};}catch(e){return {role,error:D.redact(e.message)};}});
}
function designFonts(plan){
    return [...new Set(plan.pages[0].elements.filter(b=>b.typography).map(b=>b.typography.font))];
}
function validateDesignFonts(plan){return designFonts(plan).map(name=>{try{const f=installedFont(name);return {name,installed:f.name};}catch(e){return {name,error:D.redact(e.message)};}});}
function createJSONPages(doc,a,plan,fonts,progress){
    const paints=new Map(),styles=new Map(),pages=[],allBodies=[];
    function paint(c){const key=JSON.stringify(c);if(!paints.has(key))paints.set(key,doc.colors.add({name:'JSON Color '+paints.size,model:ID.ColorModel.PROCESS,space:ID.ColorSpace[c.space],colorValue:c.values}));return paints.get(key);}
    function style(b){
        const t=L.typography(b,plan.settings),key=JSON.stringify(t);if(styles.has(key))return styles.get(key);
        const font=fonts[t.font],identity='family='+font.fontFamily+'; style='+font.fontStyleName;
        const p=D.step('create.styles.'+b.role+'.add',()=>doc.paragraphStyles.add({name:'JSON '+b.role+' '+styles.size,pointSize:t.size,leading:t.leading,tracking:t.tracking,
            fillColor:paint(t.paint),hyphenation:false,justification:ID.Justification[{left:'LEFT_ALIGN',right:'RIGHT_ALIGN',center:'CENTER_ALIGN',justify:'LEFT_JUSTIFIED'}[t.align]],
            spaceBefore:mm(t.spaceBefore),spaceAfter:mm(t.spaceAfter),leftIndent:0,rightIndent:0,firstLineIndent:0,alignToBaseline:false,
            ruleAbove:false,ruleBelow:false,paragraphBorderOn:false,paragraphShadingOn:false,keepFirstLines:1,keepLastLines:1}),progress);
        D.step('create.styles.'+b.role+'.appliedFont ('+identity+')',()=>{p.appliedFont=font;},progress);
        D.step('create.styles.'+b.role+'.fontStyle ('+identity+')',()=>{p.fontStyle=font.fontStyleName;},progress);
        styles.set(key,p);return p;
    }
    function add(design,index){
        const page=index===0?doc.pages.item(0):doc.pages.add(ID.LocationOptions.AT_END),bodies=[];
        Object.assign(page.marginPreferences,{top:mm(plan.settings.margin),bottom:mm(plan.settings.margin),left:mm(plan.settings.margin),right:mm(plan.settings.margin)});
        design.elements.forEach(b=>D.step('create.json.'+(index+1)+'.'+b.label,()=>{
            if(b.role==='line'){
                const line=page.graphicLines.add();line.label=b.label;line.paths.item(0).entirePath=[[b.x,b.y],[b.x+b.width,b.y]];
                framePaint(line,doc);line.strokeWeight=b.stroke.weight+'pt';line.strokeColor=paint(b.stroke.color);line.strokeTint=100;
                line.endCap=ID.EndCap[{RoundEndCap:'ROUND_END_CAP',ButtEndCap:'BUTT_END_CAP',ProjectingEndCap:'PROJECTING_END_CAP'}[b.stroke.cap]];
                line.leftLineEnd=ID.ArrowHead.NONE;line.rightLineEnd=ID.ArrowHead.NONE;line.strokeType=doc.strokeStyles.item(0);
            }else if(b.role==='image'){
                const rect=page.rectangles.add();rect.label=b.label;rect.geometricBounds=bounds(b);framePaint(rect,doc,paint(b.fill));rect.fillTint=100;
                for(const corner of ['topLeft','topRight','bottomLeft','bottomRight']){rect[corner+'CornerOption']=b.cornerRadius?ID.CornerOptions.ROUNDED_CORNER:ID.CornerOptions.NONE;rect[corner+'CornerRadius']=mm(b.cornerRadius);}
                const im=a.images[b.imageIndex];if(im){rect.place(im.path);rect.fit(b.fit==='cover'?ID.FitOptions.FILL_PROPORTIONALLY:ID.FitOptions.PROPORTIONALLY);rect.fit(ID.FitOptions.CENTER_CONTENT);}
            }else{
                const f=textFrame(page,doc,b,b.label,style(b),b.role==='body'?undefined:L.content(b,a,index+1));
                f.textFramePreferences.insetSpacing=b.inset.map(mm);f.textFramePreferences.textColumnGutter=mm(b.columnGap);
                if(b.role==='body')bodies.push({frame:f,order:b.flowOrder});
            }
        },progress));
        bodies.sort((x,y)=>x.order-y.order);pages.push({page,bodies:bodies.map(x=>x.frame)});
        for(const {frame} of bodies){if(allBodies.length)allBodies[allBodies.length-1].nextTextFrame=frame;allBodies.push(frame);}
    }
    plan.pages.forEach(add);
    const story=allBodies[0].parentStory;story.contents=a.body.replace(/\r\n?|\n/g,'\r');
    story.texts.item(0).applyParagraphStyle(style(plan.pages[0].elements.find(b=>b.role==='body')),true);
    story.texts.item(0).appliedCharacterStyle=doc.characterStyles.item(0);doc.recompose();
    while(story.overflows&&pages.length<L.MAX_PAGES){add(L.continuationFor(plan,a),pages.length);doc.recompose();}
    if(story.overflows)throw new Error('본문이 40페이지를 초과했습니다. 원고를 나눠주세요.');
    // Never delete an original first-page body frame, even if it remains empty.
    while(pages.length>1&&pages[pages.length-1].bodies.every(f=>f.contents.length===0)){pages.pop().page.remove();doc.recompose();}
    allBodies.splice(0,allBodies.length,...pages.flatMap(p=>p.bodies));
    const context=fitContexts.get(doc);context.body={story,frames:pages.flatMap(p=>p.bodies),append(nextProgress){progress=nextProgress;add(L.continuationFor(plan,a),doc.pages.length);this.frames=pages.flatMap(p=>p.bodies);}};
}
function rgb(hex){return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));}
function createStyles(doc,s,bodyFont,titleFont,progress){
    const ink=doc.colors.add({name:'AUTO Ink',model:ID.ColorModel.PROCESS,space:ID.ColorSpace.RGB,colorValue:rgb(L.RENDER.ink)});
    const accent=doc.colors.add({name:'AUTO Accent',model:ID.ColorModel.PROCESS,space:ID.ColorSpace.RGB,colorValue:rgb(s.accent)});
    const muted=doc.colors.add({name:'AUTO Muted',model:ID.ColorModel.PROCESS,space:ID.ColorSpace.RGB,colorValue:rgb(L.RENDER.muted)});
    const style=(role,size,font,color)=>{
        const t=L.typography({role,fontSize:size},s);
        const identity=D.redact('family='+font.fontFamily+'; style='+font.fontStyleName+'; name='+font.name);
        const p=D.step('create.styles.'+role+'.add',()=>doc.paragraphStyles.add({name:'AUTO '+role[0].toUpperCase()+role.slice(1),
            pointSize:t.size,leading:t.leading,fillColor:color,hyphenation:false,justification:ID.Justification.LEFT_ALIGN,
            tracking:t.tracking,spaceBefore:0,spaceAfter:mm(t.spaceAfter),leftIndent:0,rightIndent:0,firstLineIndent:0,
            alignToBaseline:false,ruleAbove:false,ruleBelow:false,paragraphBorderOn:false,paragraphShadingOn:false}),progress);
        // Apply the resolved face first; never ask the inherited family for this style
        // through an unordered bulk property assignment.
        D.step('create.styles.'+role+'.appliedFont ('+identity+')',()=>{p.appliedFont=font;},progress);
        D.step('create.styles.'+role+'.fontStyle ('+identity+')',()=>{p.fontStyle=font.fontStyleName;},progress);
        return p;
    };
    const body=style('body',s.bodySize,bodyFont,ink);
    body.keepFirstLines=2;body.keepLastLines=2;
    return {ink,accent,muted,body,title:style('title',36,titleFont,ink),subtitle:style('subtitle',13,bodyFont,muted),meta:style('meta',8,bodyFont,muted)};
}
function noFill(doc){
    for(const name of ['None','[None]']){const s=doc.swatches.itemByName(name);if(s.isValid)return s;}
    return doc.swatches.item(0);
}
function framePaint(f,doc,fill){
    // Zero weight alone does not explicitly remove an inherited stroke color.
    f.strokeWeight=0;f.strokeColor=noFill(doc);f.fillColor=fill||noFill(doc);
}
function textFrame(page,doc,b,label,style,text){
    const f=D.step('create.'+label+'.textFrames.add',()=>page.textFrames.add());
    D.step('create.'+label+'.framePreferences',()=>{f.label=label;f.geometricBounds=bounds(b);
    framePaint(f,doc);
    f.textFramePreferences.insetSpacing=[0,0,0,0];
    f.textFramePreferences.useFixedColumnWidth=false;
    f.textFramePreferences.textColumnCount=b.columns||1;f.textFramePreferences.textColumnGutter=mm(L.RENDER.gutter);
    f.textFramePreferences.verticalJustification=ID.VerticalJustification.TOP_ALIGN;
    f.textFramePreferences.firstBaselineOffset=ID.FirstBaseline.ASCENT_OFFSET;
    f.textFramePreferences.minimumFirstBaselineOffset=0;
    if(ID.AutoSizingTypeEnum)f.textFramePreferences.autoSizingType=ID.AutoSizingTypeEnum.OFF;
    });
    D.step('create.'+label+'.contentsAndStyle',()=>{
    if(text!==undefined)f.contents=text.replace(/\r\n?|\n/g,'\r');
    const textRange=f.parentStory.texts.item(0);
    textRange.applyParagraphStyle(style,true);
    textRange.appliedCharacterStyle=doc.characterStyles.item(0);
    if(b.fontSize){const t=L.typography(b,{});textRange.pointSize=t.size;textRange.leading=t.leading;}
    });
    const context=fitContexts.get(doc);
    if(context){const type=L.typography(b,{});context.records.push({frame:f,label,role:b.role,initial:true,inset:b.inset||[0,0,0,0],expected:{bounds:[b.y,b.x,b.y+b.height,b.x+b.width],fontSize:b.fontSize||style.pointSize,leading:b.fontSize?type.leading:style.leading,tracking:type.tracking,spaceBefore:type.spaceBefore||0,spaceAfter:type.spaceAfter||0,font:style.appliedFont.name,fontStyle:style.fontStyle}});}
    return f;
}
function furniture(page,doc,s,a,styles,pageNumber){
    L.furniture(s,a,pageNumber).forEach(b=>{
        if(b.role==='rule'){const line=page.rectangles.add();line.label=b.label;line.geometricBounds=bounds(b);framePaint(line,doc,styles.accent);}
        else textFrame(page,doc,b,b.label,styles.meta,b.text);
    });
}
function addPage(doc,design,s,a,styles,index){
    const page=index===0?doc.pages.item(0):doc.pages.add(ID.LocationOptions.AT_END);
    Object.assign(page.marginPreferences,{top:mm(s.margin),bottom:mm(s.margin),left:mm(s.margin),right:mm(s.margin)});
    furniture(page,doc,s,a,styles,index+1);
    let body;
    design.elements.forEach((b,j)=>{
        if(b.role==='image'){
            const rect=page.rectangles.add();rect.label='AUTO_IMAGE_'+b.imageIndex;rect.geometricBounds=bounds(b);framePaint(rect,doc);
            D.step('create.image.'+(b.imageIndex+1)+'.Rectangle.place',()=>rect.place(a.images[b.imageIndex].path));
            D.step('create.image.'+(b.imageIndex+1)+'.Rectangle.fit',()=>{
                if(L.RENDER.imageFit!=='cover'||L.RENDER.imagePosition!=='center')throw new Error('지원하지 않는 사진 배치 명세입니다.');
                rect.fit(ID.FitOptions.FILL_PROPORTIONALLY);rect.fit(ID.FitOptions.CENTER_CONTENT);
            });
        }else if(b.role==='body'){
            body=textFrame(page,doc,b,'AUTO_BODY_'+(index+1),styles.body);
        }else{textFrame(page,doc,b,'AUTO_'+b.role.toUpperCase(),styles[b.role],a[b.role]);}
    });
    return body;
}
function check(doc,progress,repair=false){
    if(!doc||!doc.isValid)throw new Error('생성한 문서가 닫혔습니다. 새 문서를 만들어주세요.');
    D.step('check.Document.recompose',()=>doc.recompose(),progress);
    const context=fitContexts.get(doc),registered=registeredContexts.get(doc);
    if(context)context.recompose=()=>D.step('autoFix.Document.recompose',()=>doc.recompose(),progress);
    const errors=[],warnings=[],issues=[];
    D.step('check.stories.overflows',()=>{for(let i=0;i<doc.stories.length;i++){
        const st=doc.stories.item(i);if(st.overflows){
            const labels=[];try{for(const frame of st.textContainers)labels.push(String(frame.label||''));}catch(e){/* Unknown containers remain unidentified. */}
            const roles={title:'제목',subtitle:'부제',body:'본문',header:'헤더',footer:'푸터',pageNumber:'페이지 번호'};
            const registeredRole=registered&&registered.contentChecks.find(c=>c.typography&&c.frame.parentStory.id===st.id);
            const role=registeredRole?registeredRole.role:Object.keys(roles).find(r=>labels.some(label=>new RegExp('^(AUTO|JSON)_'+r+'(?:_|$)','i').test(label)));
            const message=(roles[role]||'텍스트 영역')+' 텍스트가 넘칩니다.';
            const hint=role==='body'?'InDesign에서 본문 연결과 마지막 페이지의 넘침을 확인하고 다시 검사해주세요.':'InDesign에서 해당 프레임의 높이·글자 크기·폰트를 확인하고 다시 검사해주세요.';
            errors.push(message);issues.push({storyId:st.id,category:registered?'BLOCKING':'USER_ACTION_REQUIRED',cause:registered?(registered.phase==='CONTENT_APPLIED'&&registeredRole?'CONTENT_OVERFLOW':'SOURCE_OVERFLOW'):role==='body'?'CONTENT_OVERFLOW':'UNKNOWN',role:role||'unknown',message,hint:registered?'원본 Fidelity 오류에는 Auto Fix를 적용하지 않습니다. 원본/새 원고 단계를 확인해주세요.':hint,detail:'Story '+st.id+' · '+labels.join(', ')});
        }
    }},progress);
    D.step('check.fonts.status',()=>{for(let i=0;i<doc.fonts.length;i++){
        const f=doc.fonts.item(i);if(!sameEnum(f.status,ID.FontStatus.INSTALLED))errors.push('폰트 확인 필요: 문서 폰트 '+(i+1));
    }},progress);
    D.step('check.links.status',()=>{for(let i=0;i<doc.links.length;i++){
        const link=doc.links.item(i);
        if(!sameEnum(link.status,ID.LinkStatus.NORMAL))errors.push('이미지 링크 확인 필요: 링크 '+(i+1));
    }},progress);
    const graphics=D.step('check.Document.allGraphics',()=>doc.allGraphics,progress);
    for(let i=0;i<graphics.length;i++){
        try{const g=graphics[i],ppi=g.effectivePpi;if(ppi&&Math.min(Number(ppi[0]),Number(ppi[1]))<200)warnings.push('배치 이미지 '+(i+1)+': 유효 해상도 200ppi 미만. 인쇄소 기준을 확인해주세요.');}catch(e){warnings.push('이미지 '+(i+1)+' 해상도를 읽지 못했습니다.');}
    }
    const other=errors.slice(issues.length).map(message=>({category:'BLOCKING',cause:message.includes('폰트')?'MISSING_FONT':'MISSING_LINK',message,hint:message.includes('폰트')?'InDesign에서 누락 폰트를 교체하고 다시 검사해주세요.':'InDesign에서 이미지 링크를 복구하고 다시 검사해주세요.'}));
    let changed=false;
    for(const issue of issues){
        const record=context&&context.records.find(r=>r.frame.isValid&&r.frame.parentStory.id===issue.storyId);
        if(!record)continue;
        if(issue.role==='body'){
            if(!context.unitsOK()){issue.category='BLOCKING';issue.cause='DOCUMENT_CHANGED';issue.hint='문서 단위 또는 원점이 바뀌었습니다. 새 문서를 만들어주세요.';continue;}
            const body=context.body,containers=Array.from(record.frame.parentStory.textContainers);
            const intact=body&&body.story.id===issue.storyId&&body.frames.length===containers.length&&body.frames.every((f,i)=>f.isValid&&(f===containers[i]||f.id!==undefined&&f.id===containers[i].id));
            issue.cause=intact?'CONTENT_OVERFLOW':'BROKEN_THREAD';issue.category=intact?'AUTO_FIXABLE':'BLOCKING';
            if(!intact){issue.hint='본문 연결이 변경되거나 끊겼습니다. 원본 문서와 비교해 연결을 확인해주세요.';continue;}
            if(!Fit.same(Fit.snapshot(record.frame),record.expected)){issue.cause='DOCUMENT_CHANGED';issue.category='USER_ACTION_REQUIRED';issue.hint='본문 속성이 변경되어 자동 연결을 중단했습니다. 직접 확인해주세요.';continue;}
            if(other.some(i=>i.cause==='MISSING_FONT')){issue.cause='MISSING_FONT';issue.category='BLOCKING';continue;}
            if(repair&&!context.bodyAttempt){
                const before=doc.pages.length;context.bodyAttempt={role:'body',before:{pages:before},after:{pages:before},reason:'CONTENT_OVERFLOW',result:'unresolved'};
                D.step('check.autoFix.body',()=>{try{while(body.story.overflows&&doc.pages.length<L.MAX_PAGES){body.append(progress);doc.recompose();}context.bodyAttempt.result=body.story.overflows?'unresolved':'resolved';}catch(e){context.bodyAttempt.reason='HOST_FAILURE';context.bodyAttempt.detail=D.redact(e.message);throw e;}finally{context.bodyAttempt.after.pages=doc.pages.length;}},progress);changed=true;
            }else if(context.bodyAttempt){issue.category='USER_ACTION_REQUIRED';issue.hint='본문 후속 페이지 한도 안에서 해결하지 못했습니다. 원고를 나누거나 연결을 확인해주세요.';}
            continue;
        }
        const diagnosis=other.some(i=>i.cause==='MISSING_FONT')?{cause:'MISSING_FONT',category:'BLOCKING',hint:'누락 폰트를 먼저 해결해주세요. 글자 축소로 숨기지 않습니다.'}:Fit.diagnose(record,context);
        Object.assign(issue,diagnosis);delete issue.growth;
        if(record.attempt&&diagnosis.category!=='BLOCKING'){issue.category='USER_ACTION_REQUIRED';issue.hint=record.attempt.result==='resolved'?'이미 자동 조정한 영역이 다시 넘칩니다. 추가 축소 없이 직접 확인이 필요합니다.':'안전 한도에서 해결되지 않아 원복했습니다. 다른 디자인·제목 길이를 확인하거나 InDesign에서 직접 조정해주세요.';}
        if(repair&&diagnosis.category==='AUTO_FIXABLE'&&!record.attempt){D.step('check.autoFix.'+record.role,()=>Fit.fit(record,context,diagnosis),progress);changed=true;}
    }
    if(context&&context.records.some(r=>r.poisoned)){const message='자동 수정 원복 확인 실패: 새 문서를 만들어주세요.';errors.push(message);other.push({message,category:'BLOCKING',cause:'UNKNOWN',hint:message});}
    if(changed){D.step('check.autoFix.recompose',()=>doc.recompose(),progress);return check(doc,progress,false);}
    if(context)context.records.forEach(r=>r.initial=false);
    if(registered){warnings.push(...(registered.contentWarnings||[]));const extra=require('./registered-native').check(registered,ID).filter(i=>!['SOURCE_OVERFLOW','CONTENT_OVERFLOW'].includes(i.cause)||!issues.some(existing=>existing.cause===i.cause&&(!i.role||existing.role===i.role)));errors.push(...extra.map(i=>i.message));other.push(...extra);}
    return {pageCount:doc.pages.length,errors,warnings:[...new Set(warnings)],issues:issues.concat(other),outputReady:registered?!registered.proofOnly&&errors.length===0:errors.length===0,fidelity:registered?{phase:registered.phase,proofOnly:registered.proofOnly,contentApplied:registered.contentChecks.map(c=>({role:c.role,elementId:c.elementId,characters:c.text===undefined?null:Array.from(c.text).length,imagePlaced:!!c.imagePath,image:c.imageMetadata||null})),design:registered.entry.descriptor.name,pages:registered.entry.descriptor.pageIds,records:registered.baseline.records,externalAssets:registered.baseline.externalAssets,originalErrors:registered.originalInspection.errors,fallbacks:registered.baseline.fallbacks,notApplicable:registered.notApplicable,packageValidation:registered.packageValidation,packagingNotes:registered.packagingNotes,autoFixAllowed:false,visualReviewRequired:['Parent/페이지 번호 표시','그룹/쌓임 순서와 장식','사진 fitting/crop 및 인쇄 색상']}:undefined,autoFixes:context?context.records.filter(r=>r.attempt).map(r=>r.attempt).concat(context.bodyAttempt?[context.bodyAttempt]:[]):[]};
}
async function createRegistered(entry,article,open,progress,mode='production'){
 const generation=session;latest=null;
 const guard=()=>{if(generation!==session)throw new Error('패널이 다시 초기화되었습니다. 다시 제작해주세요.');};
 let created;
 try{const context=await require('./registered-native').create(entry,article,{ID,open,guard,inspect:doc=>check(doc,progress,false),progress,mode});created=context.doc;guard();registeredContexts.set(context.doc,context);latest=context.doc;return check(latest,progress,false);}
 catch(e){const doc=e.registeredDocument||created;if(doc&&doc.isValid)try{doc.close(ID.SaveOptions.NO);}catch(ignore){/* Only this new document; original is never opened. */}latest=null;throw e;}
}
async function create(raw,plan,progress){
    const generation=session;
    // A failed new attempt must never silently export the previous successful document.
    latest=null;
    const a=D.step('create.validate',()=>{const value=L.article(raw);L.validate(plan,value);if(plan.origin==='json'&&value.images.length>plan.design.contentSlots.images.max)throw new Error('이 디자인은 사진 '+plan.design.contentSlots.images.max+'장까지 사용합니다.');return value;},progress),s=plan.origin==='json'?plan.settings:L.settings(plan.settings);
    const fonts=D.step('create.fonts',()=>plan.origin==='json'?Object.fromEntries(designFonts(plan).map(name=>[name,installedFont(name)])):{body:installedFont(s.bodyFont),title:installedFont(s.titleFont)},progress);
    for(const image of a.images){
        if(!image.path)throw new Error('사진 파일을 다시 선택해주세요.');
        await D.asyncStep('create.imageAccess',async()=>{const stat=await fs.lstat('file:'+image.path);if(typeof stat.isFile==='function'&&!stat.isFile())throw new Error('파일이 아닙니다.');},progress);
    }
    let doc;
    try{
        await D.asyncStep('create.app.doScript',()=>app.doScript(()=>{
            if(generation!==session)throw new Error('패널이 다시 초기화되었습니다. 현재 패널에서 다시 생성해주세요.');
            doc=D.step('create.app.documents.add',()=>app.documents.add(),progress);
            fitContexts.set(doc,{records:[],describeError:e=>D.redact(e.message),unitsOK:()=>sameEnum(doc.viewPreferences.horizontalMeasurementUnits,ID.MeasurementUnits.MILLIMETERS)&&sameEnum(doc.viewPreferences.verticalMeasurementUnits,ID.MeasurementUnits.MILLIMETERS)&&sameEnum(doc.viewPreferences.rulerOrigin,ID.RulerOrigin.PAGE_ORIGIN)&&doc.zeroPoint.every(v=>Number(v)===0),topAligned:value=>sameEnum(value,ID.VerticalJustification.TOP_ALIGN),recompose:()=>D.step('autoFix.Document.recompose',()=>doc.recompose(),progress)});
            D.step('create.documentPreferences',()=>{
            doc.documentPreferences.facingPages=false;doc.documentPreferences.pagesPerDocument=1;
            doc.documentPreferences.pageWidth=mm(s.width);doc.documentPreferences.pageHeight=mm(s.height);
            doc.documentPreferences.documentBleedUniformSize=true;doc.documentPreferences.documentBleedTopOffset=mm(s.bleed);
            doc.viewPreferences.horizontalMeasurementUnits=ID.MeasurementUnits.MILLIMETERS;
            doc.viewPreferences.verticalMeasurementUnits=ID.MeasurementUnits.MILLIMETERS;
            doc.viewPreferences.rulerOrigin=ID.RulerOrigin.PAGE_ORIGIN;doc.zeroPoint=[0,0];
            // Smart reflow must not silently introduce host-created pages outside this plan.
            doc.textPreferences.smartTextReflow=false;
            },progress);
            if(plan.origin==='json'){D.step('create.jsonPages',()=>createJSONPages(doc,a,plan,fonts,progress),progress);return;}
            const styles=D.step('create.styles',()=>createStyles(doc,s,fonts.body,fonts.title,progress),progress);
            const bodyFrames=[];
            plan.pages.forEach((design,i)=>bodyFrames.push(D.step('create.page.'+(i+1),()=>addPage(doc,design,s,a,styles,i),progress)));
            D.step('create.body.threadAndContents',()=>{
            for(let i=0;i<bodyFrames.length-1;i++)bodyFrames[i].nextTextFrame=bodyFrames[i+1];
            const story=bodyFrames[0].parentStory;story.contents=a.body.replace(/\r\n?|\n/g,'\r');
            story.texts.item(0).applyParagraphStyle(styles.body,true);story.texts.item(0).appliedCharacterStyle=doc.characterStyles.item(0);
            },progress);
            const story=bodyFrames[0].parentStory;
            D.step('create.Document.recompose',()=>doc.recompose(),progress);
            while(story.overflows && doc.pages.length<L.MAX_PAGES){
                const next=D.step('create.continuation.'+(doc.pages.length+1),()=>addPage(doc,L.continuation(s,a),s,a,styles,doc.pages.length),progress);
                D.step('create.continuation.threadAndRecompose',()=>{bodyFrames[bodyFrames.length-1].nextTextFrame=next;bodyFrames.push(next);doc.recompose();},progress);
            }
            if(story.overflows)throw new Error('본문이 40페이지를 초과했습니다. 원고를 나눠주세요.');
            // Estimates are conservative; remove only trailing generated pages with zero body text.
            D.step('create.removeEmptyTrailingPages',()=>{while(bodyFrames.length>1){
                const last=bodyFrames[bodyFrames.length-1];
                if(last.contents.length!==0)break;
                const page=last.parentPage;bodyFrames.pop();page.remove();doc.recompose();
            }},progress);
            fitContexts.get(doc).body={story,frames:bodyFrames,append(){const next=addPage(doc,L.continuation(s,a),s,a,styles,doc.pages.length);this.frames[this.frames.length-1].nextTextFrame=next;this.frames.push(next);}};
        },ID.ScriptLanguage.JAVASCRIPT,[],ID.UndoModes.ENTIRE_SCRIPT,'Create original magazine design'),progress);
        const report=D.step('create.initialCheck',()=>check(doc,progress,true),progress);
        if(plan.origin==='json'){report.warnings.push(...plan.warnings);if(a.images.length<plan.design.contentSlots.images.min)report.warnings.push('사진 없음: 원본 이미지 프레임을 비워 두었습니다.');}
        if(generation===session)latest=doc;
        return report;
    }catch(e){
        if(doc&&doc.isValid){try{doc.close(ID.SaveOptions.NO);}catch(closeError){throw D.failure('create.cleanup.Document.close',new Error(D.redact(e.message)+' / 새 미완성 문서 정리 실패: '+D.redact(closeError.message)));}}
        throw e;
    }
}
function current(){if(!latest||!latest.isValid)throw new Error('먼저 이 패널에서 새 문서를 만들어주세요.');return latest;}
function save(path,progress){
    const doc=D.step('save.latest',current,progress);
    const saved=D.step('save.Document.save',()=>doc.save(path),progress);
    // Document.save may close the original and return the newly opened copy.
    if(saved&&saved.isValid){const context=registeredContexts.get(doc);if(context){require('./registered-native').rebind(context,saved);registeredContexts.set(saved,context);}latest=saved;}
    try{return check(current(),progress);}catch(e){throw D.failure('save.completed.postCheck',new Error(e.message));}
}
function exportPdf(path,progress){
    const doc=D.step('pdf.latest',current,progress),report=D.step('pdf.preflight',()=>check(doc,progress),progress);
    if(report.outputReady===false||report.errors.length)throw D.failure('pdf.preflight',new Error(report.fidelity&&report.fidelity.proofOnly?'원본 검증용 문서입니다. 선택 디자인으로 제작한 뒤 PDF를 출력해주세요.':'PDF 출력 전 오류를 해결해주세요: '+report.errors.join(' / ')));
    let completed=false,listener;
    const onComplete=()=>{completed=true;};
    // exportFile has no documented success return value. A silent dialog cancel
    // must not be reported as a successful export (nor guessed to be an error).
    try{
        try{listener=doc.addEventListener('afterExport',onComplete);}catch(e){if(progress)progress('pdf.afterExport.listenerUnavailable');}
        D.step('pdf.Document.exportFile',()=>doc.exportFile(ID.ExportFormat.PDF_TYPE,path,true),progress);
    }finally{
        try{if(listener&&typeof listener.remove==='function')listener.remove();else doc.removeEventListener('afterExport',onComplete);}catch(e){if(progress)progress('pdf.afterExport.listenerCleanupUnconfirmed');}
    }
    if(progress)progress(completed?'pdf.afterExport.confirmed':'pdf.afterExport.notObserved');
    return {...report,outcome:completed?'exported':'unconfirmed'};
}
module.exports={create,createRegistered,listFonts,validateFonts,validateDesignFonts,resetSession,sessionId:()=>session,invalidateDocument:()=>{latest=null;},check:progress=>D.step('check.latest',()=>check(current(),progress,true),progress),save,exportPdf};
