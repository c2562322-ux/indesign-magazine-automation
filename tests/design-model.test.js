'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {spawnSync}=require('node:child_process');
const M=require('../src/design-model.js');
const H=require('../src/design-model-host.js');
const root=path.resolve(__dirname,'..');
const bundled=path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe');
const python=process.env.PYTHON||(fs.existsSync(bundled)?bundled:process.platform==='win32'?'python':'python3');
function py(args){const r=spawnSync(python,args,{cwd:root,encoding:'utf8',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'},maxBuffer:8*1024*1024});assert.equal(r.status,0,r.stderr||String(r.error));return r.stdout;}
const fixture=JSON.parse(py(['tests/test_design_extraction.py','--model']));
const proof=()=>M.textProof(fixture,'title',{acknowledgeApproximation:true});
const clone=x=>JSON.parse(JSON.stringify(x));
function mockHost(){
    let adds=0,recomposes=0;
    const font={fontFamily:'Design Test',fontStyleName:'9 Black',postscriptName:'DesignTest-Black',isValid:true,status:'installed'};
    const numeric=(obj,keys)=>{
        const values={};for(const k of keys)Object.defineProperty(obj,k,{get:()=>values[k],set:v=>{values[k]=parseFloat(v);},enumerable:true});return obj;
    };
    const ID={MeasurementUnits:{POINTS:'pt'},RulerOrigin:{PAGE_ORIGIN:'page'},NothingEnum:{NOTHING:'nothing'},AutoSizingTypeEnum:{OFF:'off'},
        Leading:{AUTO:'auto'},FontStatus:{INSTALLED:'installed'},ColorSpace:{CMYK:'cmyk',RGB:'rgb',LAB:'lab'},ColorModel:{PROCESS:'process',SPOT:'spot'},
        VerticalJustification:Object.fromEntries(Object.values(M.VERTICAL).map(k=>[k,k])),FirstBaseline:Object.fromEntries(Object.values(M.BASELINE).map(k=>[k,k])),
        Justification:Object.fromEntries(Object.values(M.ALIGN).map(k=>[k,k]))};
    ID.app={scriptPreferences:{measurementUnit:'mm'},fonts:{length:1,item:()=>font},documents:{add(){
        adds++;
        const ranges=new Map(),frame={textFramePreferences:{},parentStory:{characters:{itemByRange(start,end){
            const key=start+':'+end;
            if(!ranges.has(key)){const r={};Object.defineProperty(r,'contents',{get:()=>frame.contents.slice(start,end+1)});ranges.set(key,r);}
            return ranges.get(key);
        }}}};
        let bounds;
        Object.defineProperty(frame,'geometricBounds',{get:()=>bounds,set:v=>bounds=v.map(parseFloat)});
        const page={textFrames:{add:()=>frame}};
        return {documentPreferences:numeric({},['pageWidth','pageHeight']),viewPreferences:{},pages:{item:()=>page},
            colors:{add:p=>({...p})},swatches:{itemByName:name=>({name})},recompose(){recomposes++;},_frame:frame};
    }}};
    return {ID,get adds(){return adds;},get recomposes(){return recomposes;},font};
}

test('IDML XML extraction: Python fidelity/security tests (not Host tests)',()=>{
    py(['tests/test_design_extraction.py']);
});
test('v2 validates references/geometry while old v1 designs remain separate',()=>{
    assert.deepEqual(M.validate(fixture),[]);
    const bad=clone(fixture);bad.elements[0].spreadId='missing';assert.match(M.validate(bad).join(),/missing spread/);
    const J=require('../src/json-design');
    const manifest=JSON.parse(fs.readFileSync(path.join(root,'designs/manifest.json')));
    for(const row of manifest.templates){const design=JSON.parse(fs.readFileSync(path.join(root,'designs',row.file)));assert.doesNotThrow(()=>J.validate(design));assert.ok(M.validate(design).length);}
});
test('source -> proof preserves exact page, frame, typography, CMYK and object-style insets',()=>{
    const p=proof();assert.deepEqual(p.page,{width:600,height:800});assert.deepEqual(p.frame.bounds,[30,20,130,420]);
    assert.deepEqual(p.frame.insets,[3,4,5,6]);assert.equal(p.frame.columns,2);assert.equal(p.frame.gap,12);
    assert.equal(p.runs[0].typography.pointSize,51);assert.equal(p.runs[0].typography.leading,54);assert.equal(p.runs[0].typography.tracking,-20);
    assert.equal(p.runs[1].typography.tracking,-25);assert.equal(p.runs[1].typography.underline,true);
    assert.equal(p.runs[0].typography.spaceAfter,11.338582677165356);
    assert.deepEqual(p.runs[0].fill.values,[10,20,30,40]);assert.equal(p.runs[0].fill.space,'CMYK');
    assert.equal(p.frame.strokeWeight,0);assert.equal(p.frame.stroke.kind,'none');
});
test('text proof requires explicit loss acknowledgement and refuses unsupported geometry/threading',()=>{
    assert.throws(()=>M.textProof(fixture,'title'),/acknowledgement/);
    const m=clone(fixture);m.elements[0].textFrame.nextRef='another';assert.throws(()=>M.textProof(m,'title',{acknowledgeApproximation:true}),/Threaded/);
    m.elements[0].textFrame.nextRef='n';m.elements[0].spreadTransform[0]=2;assert.throws(()=>M.textProof(m,'title',{acknowledgeApproximation:true}),/Rotated/);
    assert.ok(proof().omitted.some(x=>x.includes('Composer')));
});
test('original/runtime separation: a new article starts with unmodified 51pt source',()=>{
    const before=JSON.stringify(fixture),session=M.runtimeSession(fixture);
    M.recordAdjustment(session,{elementId:'title',before:{pointSize:51},after:{pointSize:49.5},reason:'overset',result:'resolved'});
    assert.equal(JSON.stringify(fixture),before);assert.deepEqual(session.original,fixture);assert.equal(M.runtimeSession(fixture).adjustments.length,0);
});
test('preview and Host share the same point-based proof, source never altered',()=>{
    const p=proof(),before=JSON.stringify(p),html=M.previewHTML(p),mock=mockHost();
    assert.match(html,/font-size:51pt/);assert.match(html,/line-height:54pt/);assert.match(html,/width:600pt/);assert.match(html,/left:20pt/);
    assert.match(html,/Preview approximation/);assert.doesNotMatch(html,/11\.338.*mm/);
    const h=H.create(p,mock.ID);assert.deepEqual(h.frame.geometricBounds,[30,20,130,420]);assert.equal(JSON.stringify(p),before);
    assert.equal(mock.ID.app.scriptPreferences.measurementUnit,'mm');
});
test('Host readback round-trip detects changed typography and geometry, tolerance 0.01pt',()=>{
    const mock=mockHost(),h=H.create(proof(),mock.ID);
    assert.deepEqual(H.verify(h,mock.ID).differences,[]);assert.equal(mock.recomposes,2);
    h.frame.geometricBounds=[30.001,20,130,420];assert.equal(H.verify(h,mock.ID).equal,true);
    h.frame.geometricBounds=[30.02,20,130,420];assert.equal(H.verify(h,mock.ID).equal,false);
    const r=h.frame.parentStory.characters.itemByRange(h.ranges[0].start,h.ranges[0].end);r.tracking=0;
    assert.ok(H.verify(h,mock.ID).differences.some(d=>d.path.includes('tracking')));
});
test('missing font stops before any document add; no Regular/Bold fallback or model changes',()=>{
    const mock=mockHost(),p=proof(),before=JSON.stringify(p);mock.font.fontStyleName='Regular';
    assert.throws(()=>H.create(p,mock.ID),/Missing or ambiguous font/);assert.equal(mock.adds,0);assert.equal(JSON.stringify(p),before);
});
test('Host failure restores global units; stable Studio never imports proof modules',()=>{
    const mock=mockHost();mock.ID.app.documents.add=()=>{throw new Error('host failed');};
    assert.throws(()=>H.create(proof(),mock.ID),/design-proof.document.add/);assert.equal(mock.ID.app.scriptPreferences.measurementUnit,'mm');
    for(const file of ['studio.js','src/studio-ui.js','src/auto-indesign.js'])assert.doesNotMatch(fs.readFileSync(path.join(root,file),'utf8'),/require\(['"].*design-model/);
});
test('comparison includes missing/extra values and image/thread/order data, not only text',()=>{
    const copy=clone(fixture);assert.equal(M.compare(fixture,copy).equal,true);
    copy.elements[2].image[0].properties.ItemTransform='1 0 0 1 0 0';copy.elements[2].sourceOrder=99;copy.threads[0].nextRef='missing';
    const paths=M.compare(fixture,copy).differences.map(d=>d.path);assert.ok(paths.some(p=>p.includes('image')));assert.ok(paths.some(p=>p.includes('sourceOrder')));assert.ok(paths.some(p=>p.includes('nextRef')));
});
test('Host assignments are whitelist based, not arbitrary raw XML attributes',()=>{
    const p=proof();p.runs[0].typography.remove='execute';const mock=mockHost();
    assert.throws(()=>H.create(p,mock.ID),/Unapproved Host property/);assert.equal(mock.adds,0);
});
