/* Explicit Phase 1 text-property proof. Never called by Studio production/reload.
 * Pass require('indesign') from UXP. Creates a NEW document only; no save/export.
 */
'use strict';
const Model=require('./design-model.js');
const same=(a,b)=>a&&typeof a.equals==='function'?a.equals(b):a===b;
function catalog(ID){
    const result=[];
    for(let i=0;i<ID.app.fonts.length;i++){
        const f=ID.app.fonts.item(i);
        if(f.isValid!==false&&same(f.status,ID.FontStatus.INSTALLED))result.push(f);
    }
    return result;
}
function resolveFonts(plan,ID){
    const available=catalog(ID);
    return plan.runs.map(r=>{
        const matches=available.filter(f=>f.fontFamily===r.font.family&&f.fontStyleName===r.font.style&&(!r.font.postscriptName||f.postscriptName===r.font.postscriptName));
        if(matches.length!==1)throw new Error('Missing or ambiguous font: '+r.font.family+' / '+r.font.style+' (no automatic substitution)');
        return matches[0];
    });
}
function paint(doc,c,ID,cache){
    if(c.kind==='none')return doc.swatches.itemByName('$ID/None');
    const key=JSON.stringify(c);
    if(!cache.has(key))cache.set(key,doc.colors.add({name:'Design proof '+cache.size,space:ID.ColorSpace[c.space],
        model:ID.ColorModel[c.model==='Spot'?'SPOT':'PROCESS'],colorValue:c.values}));
    return cache.get(key);
}
function validatePlan(plan){
    if(!plan||plan.schema!=='magazine-studio-text-proof/v1'||plan.unit!=='pt'||!Array.isArray(plan.omitted)||!plan.omitted.length)throw new Error('Expected explicit, disclosed text-proof plan');
    if(!plan.page||![plan.page.width,plan.page.height].every(n=>Number.isFinite(n)&&n>0))throw new Error('Invalid proof page');
    const f=plan.frame;
    if(!f||!Array.isArray(f.bounds)||f.bounds.length!==4||!f.bounds.every(Number.isFinite)||f.bounds[2]<=f.bounds[0]||f.bounds[3]<=f.bounds[1])throw new Error('Invalid proof bounds');
    if(!Number.isInteger(f.columns)||f.columns<1||!Number.isFinite(f.gap)||f.gap<0||!Array.isArray(f.insets)||f.insets.length!==4||!f.insets.every(n=>Number.isFinite(n)&&n>=0)||!Number.isFinite(f.strokeWeight)||f.strokeWeight<0)throw new Error('Invalid frame preferences');
    if(!f.preferences||Object.keys(f.preferences).some(k=>!['verticalJustification','firstBaselineOffset','minimumFirstBaselineOffset'].includes(k)))throw new Error('Unapproved frame preferences');
    for(const [key,value] of Object.entries(f.preferences)){
        if(key==='verticalJustification'&&!Object.values(Model.VERTICAL).includes(value)||key==='firstBaselineOffset'&&!Object.values(Model.BASELINE).includes(value)||key==='minimumFirstBaselineOffset'&&!Number.isFinite(value))throw new Error('Invalid frame preference enum/value');
    }
    const allowed=new Set([...Object.values(Model.TYPE),...Object.values(Model.PARA)]);
    if(!Array.isArray(plan.runs)||!plan.runs.length)throw new Error('Missing proof text');
    for(const r of plan.runs){
        if(typeof r.text!=='string'||!r.text||/[\uD800-\uDFFF]/.test(r.text))throw new Error('Unsupported proof text');
        if(!r.font||typeof r.font.family!=='string'||typeof r.font.style!=='string')throw new Error('Invalid font identity');
        for(const key of Object.keys(r.typography))if(!allowed.has(key))throw new Error('Unapproved Host property: '+key);
        for(const [key,value] of Object.entries(r.typography)){
            const valid=key==='kerningMethod'?typeof value==='string':['ligatures','underline','strikeThru','hyphenation'].includes(key)?typeof value==='boolean':key==='leading'&&value==='Auto'||Number.isFinite(value);
            if(!valid)throw new Error('Invalid text property '+key);
        }
        if(!Object.values(Model.ALIGN).includes(r.alignment))throw new Error('Invalid alignment');
    }
}
function create(plan,ID){
    validatePlan(plan);
    // Preflight fonts before creating anything. One catalog read per explicit proof.
    const fonts=resolveFonts(plan,ID),cache=new Map();
    let doc=null,stage='document.add';
    const previous=ID.app.scriptPreferences.measurementUnit;
    try{
        ID.app.scriptPreferences.measurementUnit=ID.MeasurementUnits.POINTS;
        doc=ID.app.documents.add();
        Object.assign(doc.documentPreferences,{facingPages:false,pagesPerDocument:1,pageWidth:plan.page.width+'pt',pageHeight:plan.page.height+'pt'});
        Object.assign(doc.viewPreferences,{horizontalMeasurementUnits:ID.MeasurementUnits.POINTS,verticalMeasurementUnits:ID.MeasurementUnits.POINTS,rulerOrigin:ID.RulerOrigin.PAGE_ORIGIN});
        doc.zeroPoint=[0,0];
        const page=doc.pages.item(0);
        // Do not inherit the user's default Parent page in the new proof document.
        page.appliedMaster=ID.NothingEnum.NOTHING;
        stage='textFrame.add';
        const frame=page.textFrames.add();
        frame.label='DESIGN_PROOF:'+plan.source.elementId;
        frame.geometricBounds=plan.frame.bounds.map(n=>n+'pt');
        frame.fillColor=paint(doc,plan.frame.fill,ID,cache);
        frame.strokeColor=paint(doc,plan.frame.stroke,ID,cache);
        frame.strokeWeight=plan.frame.strokeWeight;
        frame.fillTint=100;frame.strokeTint=100;
        Object.assign(frame.textFramePreferences,{autoSizingType:ID.AutoSizingTypeEnum.OFF,
            useFixedColumnWidth:false,useFlexibleColumnWidth:false,textColumnCount:plan.frame.columns,
            textColumnGutter:plan.frame.gap,insetSpacing:plan.frame.insets});
        for(const [key,value] of Object.entries(plan.frame.preferences)){
            if(key==='verticalJustification')frame.textFramePreferences[key]=ID.VerticalJustification[value];
            else if(key==='firstBaselineOffset')frame.textFramePreferences[key]=ID.FirstBaseline[value];
            else if(key==='minimumFirstBaselineOffset')frame.textFramePreferences[key]=value;
            else throw new Error('Unapproved frame preference '+key);
        }
        stage='text.contents';
        frame.contents=plan.runs.map(r=>r.text).join('');
        let start=0;
        const ranges=[];
        plan.runs.forEach((run,index)=>{
            stage='text.run.'+index+' ('+run.font.family+' / '+run.font.style+')';
            const range=frame.parentStory.characters.itemByRange(start,start+run.text.length-1);
            range.appliedFont=fonts[index];range.fontStyle=fonts[index].fontStyleName;
            for(const [key,value] of Object.entries(run.typography))range[key]=key==='leading'&&value==='Auto'?ID.Leading.AUTO:value;
            range.justification=ID.Justification[run.alignment];
            range.fillColor=paint(doc,run.fill,ID,cache);
            ranges.push({start,end:start+run.text.length-1});start+=run.text.length;
        });
        stage='document.recompose';doc.recompose();
        return {doc,frame,ranges,plan:JSON.parse(JSON.stringify(plan)),omitted:plan.omitted.slice()};
    }catch(error){
        // Keep a failed NEW proof document visible for diagnosis; originals untouched.
        const failure=new Error('[design-proof.'+stage+'] '+String(error.message||error));
        failure.proofDocument=doc;throw failure;
    }finally{ID.app.scriptPreferences.measurementUnit=previous;}
}
function readPaint(swatch,ID){
    if(['None','$ID/None','[None]'].includes(swatch.name))return {kind:'none'};
    const space=['RGB','CMYK','LAB'].find(k=>same(swatch.space,ID.ColorSpace[k]));
    return {kind:'color',space,model:same(swatch.model,ID.ColorModel.SPOT)?'Spot':'Process',values:Array.from(swatch.colorValue)};
}
function comparisonTarget(plan){
    const p=JSON.parse(JSON.stringify(plan));
    for(const c of [p.frame.fill,p.frame.stroke,...p.runs.map(r=>r.fill)])delete c.name;
    return {page:p.page,frame:p.frame,runs:p.runs.map(r=>({...r,font:{family:r.font.family,style:r.font.style}}))};
}
function readback(handle,ID){
    const {doc,frame,plan}=handle,old=ID.app.scriptPreferences.measurementUnit;
    try{
        ID.app.scriptPreferences.measurementUnit=ID.MeasurementUnits.POINTS;
        doc.recompose();
        const preferences={};
        for(const key of Object.keys(plan.frame.preferences)){
            const value=frame.textFramePreferences[key];
            preferences[key]=key==='verticalJustification'?Object.values(Model.VERTICAL).find(k=>same(value,ID.VerticalJustification[k])):
                key==='firstBaselineOffset'?Object.values(Model.BASELINE).find(k=>same(value,ID.FirstBaseline[k])):Number(value);
        }
        return {page:{width:Number(doc.documentPreferences.pageWidth),height:Number(doc.documentPreferences.pageHeight)},
            frame:{bounds:Array.from(frame.geometricBounds,Number),columns:frame.textFramePreferences.textColumnCount,
                gap:Number(frame.textFramePreferences.textColumnGutter),insets:Array.isArray(frame.textFramePreferences.insetSpacing)?Array.from(frame.textFramePreferences.insetSpacing,Number):Array(4).fill(Number(frame.textFramePreferences.insetSpacing)),
                preferences,fill:readPaint(frame.fillColor,ID),stroke:readPaint(frame.strokeColor,ID),strokeWeight:Number(frame.strokeWeight)},
            runs:handle.ranges.map(({start,end},i)=>{
                const r=frame.parentStory.characters.itemByRange(start,end),t={};
                for(const key of Object.keys(plan.runs[i].typography))t[key]=key==='leading'&&same(r[key],ID.Leading.AUTO)?'Auto':r[key];
                return {text:String(r.contents),font:{family:r.appliedFont.fontFamily,style:r.fontStyle},typography:t,
                    alignment:Object.values(Model.ALIGN).find(k=>same(r.justification,ID.Justification[k])),fill:readPaint(r.fillColor,ID)};
            })};
    }finally{ID.app.scriptPreferences.measurementUnit=old;}
}
function verify(handle,ID,tolerance=0.01){return Model.compare(comparisonTarget(handle.plan),readback(handle,ID),tolerance);}
module.exports={validatePlan,resolveFonts,create,readback,comparisonTarget,verify};
