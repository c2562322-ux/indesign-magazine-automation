'use strict';
const fs=require('node:fs'),Match=require('../src/design-matching'),Model=require('../src/design-model');
function summarize(model){
    const errors=Model.validate(model);if(errors.length)throw new Error(errors.join('; '));
    const rawTags={},transparency=[];
    function visit(n){const name=n.tag.split('}').pop();rawTags[name]=(rawTags[name]||0)+1;if(name==='BlendingSetting')transparency.push(n.attributes);for(const c of n.children||[])visit(c);}
    Object.values(model.sourceXml).forEach(visit);
    return {sourceSha256:model.metadata.sourceSha256,pages:model.pages.filter(p=>p.kind==='Spread').length,parentPages:model.pages.filter(p=>p.kind==='MasterSpread').length,
        spreads:model.spreads.length,layers:model.layers.length,objects:model.elements.length,types:model.elements.reduce((a,e)=>(a[e.type]=(a[e.type]||0)+1,a),{}),
        placedImageFrames:model.elements.filter(e=>e.image&&e.image.length).length,
        stories:model.stories.length,threadEdges:model.threads.filter(t=>t.nextRef&&t.nextRef!=='n').length,
        styles:Object.fromEntries(Object.entries(model.styles).map(([k,v])=>[k,v.length])),swatches:model.colors.length,fonts:model.fonts.length,transparency,
        rawTags,issues:model.issues.reduce((a,i)=>(a[i.code]=(a[i.code]||0)+1,a),{}),
        frames:model.elements.filter(e=>e.textFrame).map(e=>{
            const s=model.stories.find(s=>s.id===e.textFrame.storyRef),runs=s?s.paragraphs.flatMap(p=>p.runs):[];
            return {id:e.id,pages:e.pageCandidates,storyRef:e.textFrame.storyRef,paragraphs:s?s.paragraphs.length:0,runs:runs.length,
                role:e.role,suggestions:Match.roleSuggestions(model,e),capacity:Match.capacity(model,e),
                typography:runs.map(r=>Object.fromEntries(['AppliedFont','FontStyle','PointSize','Leading','AutoLeading','Tracking','KerningMethod','HorizontalScale','VerticalScale','BaselineShift','Justification','LeftIndent','RightIndent','FirstLineIndent','SpaceBefore','SpaceAfter','FillColor','StrokeColor'].map(k=>[k,r.resolvedProperties[k]])))};
        })};
}
if(require.main===module){
    const [, ,input,output]=process.argv;
    if(!input||!output){console.error('Usage: node tools/analyze-design.js MODEL.json REPORT.json');process.exitCode=1;}
    else {const report=summarize(JSON.parse(fs.readFileSync(input,'utf8')));fs.writeFileSync(output,JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify({pages:report.pages,objects:report.objects,frames:report.frames.length}));}
}
module.exports={summarize};
