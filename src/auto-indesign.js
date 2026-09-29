/* Host boundary. Only newly-created documents are written; all original documents stay untouched. */
'use strict';
const ID = require('indesign');
const app = ID.app;
const L = require('./layout-engine.js');
const fs = require('fs');
let latest = null;
function mm(n) { return n + 'mm'; }
function bounds(b) { return [b.y,b.x,b.y+b.height,b.x+b.width].map(mm); }
function installedFont(name) {
    const direct = app.fonts.itemByName(name);
    if (direct && direct.isValid && direct.status === ID.FontStatus.INSTALLED) return direct;
    for(let i=0;i<app.fonts.length;i++){
        const f=app.fonts.item(i);
        if(f.status===ID.FontStatus.INSTALLED && (f.fontFamily===name || f.fullName===name || f.name===name)) return f;
    }
    throw new Error('설치된 폰트를 찾지 못했습니다: '+name+'. 폰트를 설치하거나 설치 폰트 목록에서 이름을 복사해주세요.');
}
function listFonts(){
    const out=[];
    for(let i=0;i<app.fonts.length;i++){const f=app.fonts.item(i);if(f.status===ID.FontStatus.INSTALLED)out.push(f.name);}
    return out.sort();
}
function rgb(hex){return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));}
function createStyles(doc,s,bodyFont,titleFont){
    const ink=doc.colors.add({name:'AUTO Ink',model:ID.ColorModel.PROCESS,space:ID.ColorSpace.RGB,colorValue:[29,33,38]});
    const accent=doc.colors.add({name:'AUTO Accent',model:ID.ColorModel.PROCESS,space:ID.ColorSpace.RGB,colorValue:rgb(s.accent)});
    const muted=doc.colors.add({name:'AUTO Muted',model:ID.ColorModel.PROCESS,space:ID.ColorSpace.RGB,colorValue:[95,99,103]});
    const style=(name,size,font,color,leading)=>doc.paragraphStyles.add({name,appliedFont:font,pointSize:size,leading:size*leading,fillColor:color,hyphenation:false,justification:ID.Justification.LEFT_ALIGN});
    const body=style('AUTO Body',s.bodySize,bodyFont,ink,1.55);
    body.spaceAfter=mm(2);body.keepFirstLines=2;body.keepLastLines=2;
    return {ink,accent,muted,body,title:style('AUTO Title',36,titleFont,ink,1.3),subtitle:style('AUTO Subtitle',13,bodyFont,muted,1.5),meta:style('AUTO Meta',8,bodyFont,muted,1.4)};
}
function noFill(doc){
    for(const name of ['None','[None]']){const s=doc.swatches.itemByName(name);if(s.isValid)return s;}
    return doc.swatches.item(0);
}
function textFrame(page,doc,b,label,style,text){
    const f=page.textFrames.add();f.label=label;f.geometricBounds=bounds(b);
    f.strokeWeight=0;f.fillColor=noFill(doc);
    f.textFramePreferences.insetSpacing=[0,0,0,0];
    f.textFramePreferences.textColumnCount=b.columns||1;f.textFramePreferences.textColumnGutter=mm(5);
    if(ID.AutoSizingTypeEnum)f.textFramePreferences.autoSizingType=ID.AutoSizingTypeEnum.OFF;
    if(text!==undefined)f.contents=text.replace(/\r\n?|\n/g,'\r');
    f.parentStory.texts.item(0).appliedParagraphStyle=style;
    if(b.fontSize){f.parentStory.texts.item(0).pointSize=b.fontSize;f.parentStory.texts.item(0).leading=b.fontSize*(b.role==='title'?1.3:b.role==='subtitle'?1.5:1.55);}
    return f;
}
function furniture(page,doc,s,a,styles,pageNumber){
    const w=s.width-2*s.margin;
    textFrame(page,doc,{x:s.margin,y:s.margin,width:w,height:7,fontSize:8},'AUTO_HEADER_'+pageNumber,styles.meta,s.publication+'  /  '+a.kicker);
    const line=page.rectangles.add();line.label='AUTO_RULE_'+pageNumber;line.geometricBounds=[mm(s.margin+9),mm(s.margin),mm(s.margin+9.45),mm(s.width-s.margin)];line.fillColor=styles.accent;line.strokeWeight=0;
    const label=(a.author?a.author+'   ·   ':'')+String(pageNumber).padStart(2,'0');
    textFrame(page,doc,{x:s.margin,y:s.height-s.margin-6,width:w,height:6,fontSize:8},'AUTO_FOOTER_'+pageNumber,styles.meta,label);
}
function addPage(doc,design,s,a,styles,index){
    const page=index===0?doc.pages.item(0):doc.pages.add(ID.LocationOptions.AT_END);
    furniture(page,doc,s,a,styles,index+1);
    let body;
    design.elements.forEach((b,j)=>{
        if(b.role==='image'){
            const rect=page.rectangles.add();rect.label='AUTO_IMAGE_'+b.imageIndex;rect.geometricBounds=bounds(b);rect.strokeWeight=0;rect.fillColor=noFill(doc);
            rect.place(a.images[b.imageIndex].path);rect.fit(ID.FitOptions.FILL_PROPORTIONALLY);rect.fit(ID.FitOptions.CENTER_CONTENT);
        }else if(b.role==='body'){
            body=textFrame(page,doc,b,'AUTO_BODY_'+(index+1),styles.body);
        }else{textFrame(page,doc,b,'AUTO_'+b.role.toUpperCase(),styles[b.role],a[b.role]);}
    });
    return body;
}
function check(doc){
    if(!doc||!doc.isValid)throw new Error('생성한 문서가 닫혔습니다. 새 문서를 만들어주세요.');
    doc.recompose();
    const errors=[],warnings=[],seen=new Set();
    for(let i=0;i<doc.stories.length;i++){
        const st=doc.stories.item(i);if(st.overflows)errors.push('텍스트 넘침: Story '+st.id);
    }
    for(let i=0;i<doc.fonts.length;i++){
        const f=doc.fonts.item(i);if(f.status!==ID.FontStatus.INSTALLED)errors.push('폰트 확인 필요: '+f.name);
    }
    for(let i=0;i<doc.links.length;i++){
        const link=doc.links.item(i);
        if(link.status!==ID.LinkStatus.NORMAL)errors.push('이미지 링크 확인 필요: '+link.name);
    }
    const graphics=doc.allGraphics;
    for(let i=0;i<graphics.length;i++){
        try{const g=graphics[i],ppi=g.effectivePpi;if(ppi&&Math.min(Number(ppi[0]),Number(ppi[1]))<200)warnings.push('배치 이미지 '+(i+1)+': 유효 해상도 200ppi 미만. 인쇄소 기준을 확인해주세요.');}catch(e){warnings.push('이미지 '+(i+1)+' 해상도를 읽지 못했습니다.');}
    }
    return {pageCount:doc.pages.length,errors:[...new Set(errors)],warnings:[...new Set(warnings)]};
}
async function create(raw,plan){
    const a=L.article(raw),s=L.settings(plan.settings);L.validate(plan,a);
    const fonts={body:installedFont(s.bodyFont),title:installedFont(s.titleFont)};
    for(const image of a.images){
        if(!image.path)throw new Error('사진 파일을 다시 선택해주세요.');
        try{const stat=await fs.lstat('file:'+image.path);if(typeof stat.isFile==='function'&&!stat.isFile())throw new Error('파일이 아닙니다.');}catch(e){throw new Error('사진 파일을 읽을 수 없습니다: '+image.name);}
    }
    let doc;
    try{
        await app.doScript(()=>{
            doc=app.documents.add();
            doc.documentPreferences.facingPages=false;doc.documentPreferences.pagesPerDocument=1;
            doc.documentPreferences.pageWidth=mm(s.width);doc.documentPreferences.pageHeight=mm(s.height);
            doc.documentPreferences.documentBleedUniformSize=true;doc.documentPreferences.documentBleedTopOffset=mm(s.bleed);
            doc.viewPreferences.horizontalMeasurementUnits=ID.MeasurementUnits.MILLIMETERS;
            doc.viewPreferences.verticalMeasurementUnits=ID.MeasurementUnits.MILLIMETERS;
            doc.viewPreferences.rulerOrigin=ID.RulerOrigin.PAGE_ORIGIN;doc.zeroPoint=[0,0];
            // Smart reflow must not silently introduce host-created pages outside this plan.
            doc.textPreferences.smartTextReflow=false;
            const styles=createStyles(doc,s,fonts.body,fonts.title);
            const bodyFrames=[];
            plan.pages.forEach((design,i)=>bodyFrames.push(addPage(doc,design,s,a,styles,i)));
            for(let i=0;i<bodyFrames.length-1;i++)bodyFrames[i].nextTextFrame=bodyFrames[i+1];
            const story=bodyFrames[0].parentStory;story.contents=a.body.replace(/\r\n?|\n/g,'\r');story.texts.item(0).appliedParagraphStyle=styles.body;
            doc.recompose();
            while(story.overflows && doc.pages.length<L.MAX_PAGES){
                const next=addPage(doc,L.continuation(s,a),s,a,styles,doc.pages.length);
                bodyFrames[bodyFrames.length-1].nextTextFrame=next;bodyFrames.push(next);doc.recompose();
            }
            if(story.overflows)throw new Error('본문이 40페이지를 초과했습니다. 원고를 나눠주세요.');
            // Estimates are conservative; remove only trailing generated pages with zero body text.
            while(bodyFrames.length>1){
                const last=bodyFrames[bodyFrames.length-1];
                if(last.contents.length!==0)break;
                const page=last.parentPage;bodyFrames.pop();page.remove();doc.recompose();
            }
        },ID.ScriptLanguage.JAVASCRIPT,[],ID.UndoModes.ENTIRE_SCRIPT,'Create original magazine design');
        latest=doc;
        return check(doc);
    }catch(e){
        if(doc&&doc.isValid){try{doc.close(ID.SaveOptions.NO);}catch(closeError){throw new Error(e.message+' / 생성 도중 문서가 남았습니다. 해당 새 문서를 확인해주세요.');}}
        throw e;
    }
}
function current(){if(!latest||!latest.isValid)throw new Error('먼저 이 패널에서 새 문서를 만들어주세요.');return latest;}
function save(path){const doc=current();doc.save(path);return check(doc);}
function exportPdf(path){const doc=current(),report=check(doc);if(report.errors.length)throw new Error('PDF 출력 전 오류를 해결해주세요: '+report.errors.join(' / '));doc.exportFile(ID.ExportFormat.PDF_TYPE,path,true);return report;}
module.exports={create,listFonts,check:()=>check(current()),save,exportPdf};
