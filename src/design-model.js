/* Design Model v2 is separate from the stable v1 magazine production plan.
 * Raw source properties are data, never blindly assigned to a Host object.
 */
'use strict';
const SCHEMA='magazine-studio-design/v2';
const clone=value=>JSON.parse(JSON.stringify(value));
const TYPE={PointSize:'pointSize',Leading:'leading',Tracking:'tracking',HorizontalScale:'horizontalScale',
    VerticalScale:'verticalScale',BaselineShift:'baselineShift',CharacterRotation:'characterRotation',
    KerningMethod:'kerningMethod',Ligatures:'ligatures',Underline:'underline',StrikeThru:'strikeThru',
    AutoLeading:'autoLeading'};
const PARA={LeftIndent:'leftIndent',RightIndent:'rightIndent',FirstLineIndent:'firstLineIndent',
    LastLineIndent:'lastLineIndent',SpaceBefore:'spaceBefore',SpaceAfter:'spaceAfter',Hyphenation:'hyphenation'};
const ALIGN={LeftAlign:'LEFT_ALIGN',RightAlign:'RIGHT_ALIGN',CenterAlign:'CENTER_ALIGN',LeftJustified:'LEFT_JUSTIFIED',
    RightJustified:'RIGHT_JUSTIFIED',CenterJustified:'CENTER_JUSTIFIED',FullyJustified:'FULLY_JUSTIFIED'};
const VERTICAL={TopAlign:'TOP_ALIGN',CenterAlign:'CENTER_ALIGN',BottomAlign:'BOTTOM_ALIGN',JustifyAlign:'JUSTIFY_ALIGN'};
const BASELINE={AscentOffset:'ASCENT_OFFSET',CapHeight:'CAP_HEIGHT',LeadingOffset:'LEADING_OFFSET',EmBoxHeight:'EMBOX_HEIGHT',FixedHeight:'FIXED_HEIGHT',XHeight:'X_HEIGHT'};
function validate(model){
    const errors=[];
    if(!model||model.schema!==SCHEMA||model.schemaVersion!==2||model.unit!=='pt')return ['Expected Design Model v2 with pt units'];
    for(const key of ['pages','spreads','elements','stories','fonts','colors','threads','issues']){
        if(!Array.isArray(model[key]))errors.push(key+' must be an array');
    }
    if(errors.length)return errors;
    if(!model.styles||!['paragraph','character','object'].every(k=>Array.isArray(model.styles[k])))errors.push('Missing style collections');
    if(!model.metadata||typeof model.metadata.sourceSha256!=='string')errors.push('Missing source identity');
    for(const key of ['pages','spreads','elements','stories']){
        const ids=new Set();
        for(const item of model[key]){if(typeof item.id!=='string'||!item.id||ids.has(item.id))errors.push(key+': invalid/duplicate id');ids.add(item.id);}
    }
    for(const p of model.pages)if(!Number.isFinite(p.width)||!Number.isFinite(p.height)||p.width<=0||p.height<=0)errors.push(p.id+': invalid page size');
    const pages=new Set(model.pages.map(p=>p.id)),spreads=new Set(model.spreads.map(s=>s.id));
    for(const e of model.elements){
        if(!spreads.has(e.spreadId))errors.push(e.id+': missing spread');
        if(!Array.isArray(e.spreadTransform)||e.spreadTransform.length!==6||!e.spreadTransform.every(Number.isFinite))errors.push(e.id+': invalid transform');
        for(const [page,b] of Object.entries(e.pageBounds||{}))if(!pages.has(page)||!Array.isArray(b)||b.length!==4||!b.every(Number.isFinite))errors.push(e.id+': invalid page bounds');
    }
    return errors;
}
function assertModel(model){const errors=validate(model);if(errors.length)throw new Error(errors.join('; '));}
function compare(expected,actual,tolerance=0.01){
    if(!Number.isFinite(tolerance)||tolerance<0)throw new Error('Invalid tolerance');
    const differences=[];
    function visit(a,b,path){
        if(typeof a==='number'&&typeof b==='number'&&Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=tolerance)return;
        if(a===b)return;
        if(a&&b&&typeof a==='object'&&typeof b==='object'&&Array.isArray(a)===Array.isArray(b)){
            for(const key of new Set([...Object.keys(a),...Object.keys(b)]))visit(a[key],b[key],path+'.'+key);
        }else differences.push({path,expected:a,actual:b});
    }
    visit(expected,actual,'$');return {equal:differences.length===0,tolerance,differences};
}
function runtimeSession(model){assertModel(model);return {original:clone(model),adjustments:[]};}
function recordAdjustment(session,entry){
    if(!entry||!entry.elementId||!entry.reason||entry.before==null||entry.after==null)throw new Error('Incomplete runtime adjustment');
    session.adjustments.push(clone(entry)); // Never writes to original or source JSON.
}
function color(model,ref){
    if(ref==='Swatch/None')return {kind:'none'};
    const c=model.colors.find(c=>c.id===ref);
    if(!c||c.type!=='Color')throw new Error('Proof requires a resolved solid color: '+ref);
    const p=c.properties,values=String(p.ColorValue).trim().split(/\s+/).map(Number);
    if(!['RGB','CMYK','LAB'].includes(p.Space)||!['Process','Spot'].includes(p.Model)||!values.every(Number.isFinite)||values.length!==({RGB:3,CMYK:4,LAB:3}[p.Space]))throw new Error('Unsupported proof color: '+ref);
    return {kind:'color',name:p.Name||c.id,space:p.Space,model:p.Model,values};
}
function textProof(model,elementId,{acknowledgeApproximation=false}={}){
    assertModel(model);
    if(!acknowledgeApproximation)throw new Error('This is a text-property proof, not a complete design. Explicit approximation acknowledgement required.');
    const e=model.elements.find(e=>e.id===elementId);
    if(!e||e.type!=='TextFrame'||e.groupId||e.pageCandidates.length!==1)throw new Error('Select an ungrouped TextFrame on one unambiguous page');
    const p=model.pages.find(p=>p.id===e.pageCandidates[0]);
    if(p.kind!=='Spread')throw new Error('Parent-page proof is not supported');
    const axis=m=>m[0]===1&&m[1]===0&&m[2]===0&&m[3]===1;
    if(!axis(e.spreadTransform)||!axis(p.transform))throw new Error('Rotated/scaled/skewed frame requires Phase 2 renderer');
    const path=e.paths;
    if(path.length!==1||path[0].open||path[0].points.length!==4||path[0].points.some(p=>JSON.stringify(p.Anchor)!==JSON.stringify(p.LeftDirection)||JSON.stringify(p.Anchor)!==JSON.stringify(p.RightDirection)))throw new Error('Proof requires a straight rectangular path');
    const anchors=path[0].points.map(p=>p.Anchor),xs=[...new Set(anchors.map(p=>p[0]))],ys=[...new Set(anchors.map(p=>p[1]))];
    if(xs.length!==2||ys.length!==2||new Set(anchors.map(p=>p.join(','))).size!==4)throw new Error('Nonrectangular path');
    const tf=e.textFrame;
    if([tf.previousRef,tf.nextRef].some(r=>r&&r!=='n')||model.elements.filter(x=>x.textFrame&&x.textFrame.storyRef===tf.storyRef).length!==1)throw new Error('Threaded story is preserved but not supported by single-frame proof');
    const story=model.stories.find(s=>s.id===tf.storyRef);
    if(!story||!story.paragraphs.length)throw new Error('Missing story');
    const objectStyle=model.styles.object.find(s=>s.id===e.objectStyleRef);
    const objectProps=objectStyle&&objectStyle.resolvedProperties||{};
    // Only explicitly enabled object-style groups participate. No document defaults invented.
    const inherited=objectStyle&&objectStyle.children.TextFramePreference||{},prefs={};
    const general=['TextColumnCount','TextColumnGutter','InsetSpacing','VerticalJustification'];
    const baseline=['FirstBaselineOffset','MinimumFirstBaselineOffset'];
    for(const key of general)if(objectProps.EnableTextFrameGeneralOptions===true&&inherited[key]!=null)prefs[key]=inherited[key];
    for(const key of baseline)if(objectProps.EnableTextFrameBaselineOptions===true&&inherited[key]!=null)prefs[key]=inherited[key];
    Object.assign(prefs,tf.properties);
    const frameTypography={};
    if(prefs.VerticalJustification!=null){if(!VERTICAL[prefs.VerticalJustification])throw new Error('Unsupported vertical justification');frameTypography.verticalJustification=VERTICAL[prefs.VerticalJustification];}
    if(prefs.FirstBaselineOffset!=null){if(!BASELINE[prefs.FirstBaselineOffset])throw new Error('Unsupported first baseline');frameTypography.firstBaselineOffset=BASELINE[prefs.FirstBaselineOffset];}
    if(prefs.MinimumFirstBaselineOffset!=null)frameTypography.minimumFirstBaselineOffset=prefs.MinimumFirstBaselineOffset;
    for(const k of ['TextColumnCount','TextColumnGutter','InsetSpacing'])if(prefs[k]==null)throw new Error('Unresolved frame preference '+k+'; inspect object style, do not invent it');
    const insets=Array.isArray(prefs.InsetSpacing)?prefs.InsetSpacing:[prefs.InsetSpacing,prefs.InsetSpacing,prefs.InsetSpacing,prefs.InsetSpacing];
    if(!Number.isInteger(prefs.TextColumnCount)||prefs.TextColumnCount<1||!Number.isFinite(prefs.TextColumnGutter)||insets.length!==4||!insets.every(Number.isFinite))throw new Error('Invalid frame preferences');
    const ignored=new Set(),runs=[];
    for(const para of story.paragraphs)for(const r of para.runs){
        if(r.tokens.some(t=>!['Content','Br'].includes(t.type)))throw new Error('Complex story tokens require InDesign-aware reconstruction');
        const text=r.tokens.map(t=>t.type==='Br'?'\r':t.text).join('');
        if(/[\uD800-\uDFFF]/.test(text))throw new Error('Non-BMP text indexing needs Host verification before proof');
        if(!text)continue;
        const v=r.resolvedProperties;
        if(typeof v.AppliedFont!=='string'||typeof v.FontStyle!=='string')throw new Error('Unresolved font family/style');
        const typography={};
        for(const [key,dest] of Object.entries({...TYPE,...PARA}))if(v[key]!=null)typography[dest]=v[key];
        if(!(typography.pointSize>0)||!(Number.isFinite(typography.leading)&&typography.leading>0||typography.leading==='Auto'))throw new Error('Unresolved point size/leading');
        if(!ALIGN[v.Justification])throw new Error('Unresolved justification');
        const known=new Set([...Object.keys(TYPE),...Object.keys(PARA),'AppliedFont','FontStyle','Justification','FillColor']);
        for(const key of Object.keys(v))if(!known.has(key))ignored.add('text.'+key);
        const fonts=model.fonts.filter(f=>f.family===v.AppliedFont&&f.style===v.FontStyle);
        runs.push({text,font:{family:v.AppliedFont,style:v.FontStyle,postscriptName:fonts.length===1?fonts[0].postscriptName:null},
            typography,alignment:ALIGN[v.Justification],fill:color(model,v.FillColor)});
    }
    if(!runs.length)throw new Error('Empty proof text');
    for(const key of new Set([...Object.keys(inherited),...Object.keys(prefs)]))if(!['TextColumnCount','TextColumnGutter','InsetSpacing',...general,...baseline].includes(key))ignored.add('framePreference.'+key);
    const effectiveFrame={...(objectProps.EnableFill===true?{FillColor:objectProps.FillColor}:{}),
        ...(objectProps.EnableStroke===true?{StrokeColor:objectProps.StrokeColor,StrokeWeight:objectProps.StrokeWeight}:{}),...e.properties};
    const fill=color(model,effectiveFrame.FillColor),stroke=color(model,effectiveFrame.StrokeColor);
    if(!Number.isFinite(effectiveFrame.StrokeWeight))throw new Error('Unresolved frame stroke weight');
    const omitted=['All other page objects and pages','Parent/group/layer reconstruction','Object style and advanced typography; see preserved sourceXml',
        'Frame auto-sizing, wrap/effects/corners; unresolved baseline preferences use Host defaults','Live composition differs in browser',...ignored];
    return {schema:'magazine-studio-text-proof/v1',unit:'pt',source:{hash:model.metadata.sourceSha256,elementId,storyId:story.id},
        page:{width:p.width,height:p.height},frame:{bounds:clone(e.pageBounds[p.id]),columns:prefs.TextColumnCount,gap:prefs.TextColumnGutter,
            insets:clone(insets),preferences:frameTypography,fill,stroke,strokeWeight:effectiveFrame.StrokeWeight},runs,omitted};
}
function previewHTML(plan){
    if(plan.schema!=='magazine-studio-text-proof/v1')throw new Error('Expected text proof');
    const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const cssColor=c=>{
        if(c.kind==='none')return 'transparent';
        if(c.space==='RGB')return 'rgb('+c.values.join(',')+')';
        if(c.space==='CMYK'){const [c1,m,y,k]=c.values.map(x=>x/100);return 'rgb('+[c1,m,y].map(x=>Math.round(255*(1-x)*(1-k))).join(',')+')';}
        return 'black'; // Explicitly disclosed below: LAB preview is not implemented.
    };
    const b=plan.frame.bounds,f=plan.frame;
    const spans=plan.runs.map(r=>{
        const t=r.typography;
        const style='font-family:'+JSON.stringify(r.font.family)+';font-size:'+t.pointSize+'pt;line-height:'+(t.leading==='Auto'?(t.autoLeading||120)/100:t.leading+'pt')+';letter-spacing:'+(t.tracking||0)/1000+'em;color:'+cssColor(r.fill);
        return '<span style="'+esc(style)+'">'+esc(r.text).replace(/\r/g,'<br>')+'</span>';
    }).join('');
    return '<!doctype html><meta charset="utf-8"><title>Design text proof</title><p>Text-property proof / Preview approximation: font style, composition, paragraph spacing, baseline and advanced typography are not faithfully rendered. LAB is shown black. Full source layout is not reproduced.</p><div style="position:relative;background:white;border:1px solid #aaa;width:'+plan.page.width+'pt;height:'+plan.page.height+'pt"><div style="position:absolute;box-sizing:border-box;white-space:pre-wrap;left:'+b[1]+'pt;top:'+b[0]+'pt;width:'+(b[3]-b[1])+'pt;height:'+(b[2]-b[0])+'pt;padding:'+f.insets.map(n=>n+'pt').join(' ')+';column-count:'+f.columns+';column-gap:'+f.gap+'pt;background:'+cssColor(f.fill)+';border:'+f.strokeWeight+'pt solid '+cssColor(f.stroke)+'">'+spans+'</div></div><details><summary>Omitted properties / 미재현 항목</summary><pre>'+esc(plan.omitted.join('\n'))+'</pre></details>';
}
module.exports={SCHEMA,TYPE,PARA,ALIGN,VERTICAL,BASELINE,validate,compare,runtimeSession,recordAdjustment,textProof,previewHTML};
