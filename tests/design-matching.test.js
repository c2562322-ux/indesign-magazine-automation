'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawnSync}=require('node:child_process');
const Match=require('../src/design-matching'),Model=require('../src/design-model');
const bundled=path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe');
const py=process.env.PYTHON||(fs.existsSync(bundled)?bundled:process.platform==='win32'?'python':'python3');
const result=spawnSync(py,['tests/test_design_extraction.py','--model'],{cwd:path.join(__dirname,'..'),encoding:'utf8',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});
assert.equal(result.status,0,result.stderr);
const base=JSON.parse(result.stdout),copy=x=>JSON.parse(JSON.stringify(x));
// Synthetic variations of the XML fixture, never presented as either user's design.
function design({bodyHeight=400,titleHeight=100,imageRatio=1.5,required='optional',id='fixture'}={}){
    const m=copy(base),title=m.elements[0];title.pageBounds.p1=[30,20,30+titleHeight,420];
    const body=copy(title);body.id='body';body.role.confirmed='body';body.textFrame.storyRef='bodyStory';body.pageBounds.p1=[150,20,150+bodyHeight,420];
    const story=copy(m.stories[0]);story.id='bodyStory';for(const r of story.paragraphs[0].runs){Object.assign(r.resolvedProperties,{PointSize:10,Leading:12,Tracking:0,SpaceAfter:0,SpaceBefore:0});}
    m.elements.push(body);m.stories.push(story);
    const image=m.elements.find(e=>e.id==='photo');image.pageCandidates=['p1'];image.pageBounds={p1:[600,20,700,20+100*imageRatio]};
    const d={id,name:id,sourceSha256:m.metadata.sourceSha256,pageIds:['p1'],roles:{body:{role:'body',confirmed:true},photo:{role:'image1',confirmed:true}},images:{photo:required}};
    return {m,d,entry:Match.libraryEntry(m,d)};
}
const article={title:'짧은 제목',subtitle:'',body:'본문 '.repeat(20),images:[]};
const fonts=[{family:'Design Test',style:'9 Black'}];
test('DOCX uses existing parser and provides measured counts, not invented category/images',()=>{
    const file=path.join(__dirname,'../sample/article-eye-clinic-with-photo.docx');
    const x=Match.parseArticle('article.docx',fs.readFileSync(file));
    assert.ok(x.profile.title.characters>0);assert.ok(x.profile.body.characters>0);assert.ok(x.profile.body.paragraphs>0);
    assert.equal(x.profile.category,null);assert.equal(x.profile.imageCount,0);
    assert.throws(()=>Match.parseArticle('x.txt','제목\n본문',[{},{},{}]),/최대 2/);
});
test('article profile counts codepoints and paragraphs; explicit category only',()=>{
    const p=Match.articleProfile({title:'가😀',body:'하나\n\n둘',category:'의료',images:[{width:1200,height:800}]});
    assert.equal(p.title.characters,2);assert.equal(p.body.paragraphs,2);assert.equal(p.category,'의료');assert.equal(p.images[0].aspectRatio,1.5);
    assert.equal(Match.imageProfile({}).orientation,'unknown');assert.equal(Match.imageProfile({width:0,height:10}).known,false);
});
test('capacity depends on columns, insets, tracking, leading and paragraph spacing',()=>{
    const {m}=design(),e=m.elements.find(e=>e.id==='body'),before=Match.capacity(m,e);
    assert.equal(before.known,true);e.textFrame.properties.InsetSpacing=[50,50,50,50];assert.ok(Match.capacity(m,e).estimatedCharacters.high<before.estimatedCharacters.high);
    const r=m.stories.find(s=>s.id==='bodyStory').paragraphs[0].runs;
    for(const x of r)Object.assign(x.resolvedProperties,{Leading:30,Tracking:200,SpaceAfter:10});
    assert.ok(Match.capacity(m,e,{paragraphs:10}).estimatedCharacters.high<Match.capacity(m,e,{paragraphs:1}).estimatedCharacters.high);
});
test('source run/style definitions are never flattened; unknown leading cannot yield capacity',()=>{
    const {m}=design(),e=m.elements[0],before=JSON.stringify(m);Match.capacity(m,e);assert.equal(JSON.stringify(m),before);
    delete m.stories[0].paragraphs[0].runs[1].resolvedProperties.Leading;assert.equal(Match.capacity(m,e).known,false);
    assert.deepEqual(Model.validate(m),[]);
});
test('role suggestions stay unconfirmed; no role inferred from filename',()=>{
    const m=copy(base),e=m.elements[0];e.role.confirmed=null;e.properties.Name='body';
    const suggestions=Match.roleSuggestions(m,e);assert.ok(suggestions.some(s=>s.role==='body'));assert.ok(suggestions.every(s=>s.confirmed===false));assert.equal(e.role.confirmed,null);
});
test('library requires explicit source hash, page scope and confirmed role mapping',()=>{
    const {m,d}=design();assert.throws(()=>Match.libraryEntry(m,{...d,sourceSha256:'wrong'}),/hash/);
    assert.throws(()=>Match.libraryEntry(m,{...d,pageIds:[]}),/scope/);
    assert.throws(()=>Match.libraryEntry(m,{...d,roles:{body:{role:'body',confirmed:false}}}),/confirmation/);
});
test('image slot reports ratio, prominence and explicit requirement; no guessed fitting',()=>{
    const {entry}=design({imageRatio:.5,required:'required'}),s=entry.profile.imageSlots[0];
    assert.equal(s.orientation,'portrait');assert.equal(s.requirement,'required');assert.equal(s.fitting.FittingOnEmptyFrame,'FillProportionally');assert.equal(s.fitting.LeftCrop,2);assert.ok(s.prominence>0);
});
test('hard constraints exclude missing photo, missing font and unsupported subtitle',()=>{
    const {entry}=design({required:'required'}),r=Match.evaluate(entry,{...article,subtitle:'부제'},{installedFonts:[]});
    assert.equal(r.status,'excluded');assert.ok(['MISSING_IMAGE','MISSING_FONT','SUBTITLE_UNSUPPORTED'].every(c=>r.hard.some(x=>x.code===c)));
});
test('unknown installed fonts/images cause review, never a confident recommendation',()=>{
    const {entry}=design();assert.equal(Match.evaluate(entry,article).status,'review-required');
    const r=Match.evaluate(entry,{...article,images:[{}]},{installedFonts:fonts});assert.ok(r.review.some(r=>r.code==='IMAGE_DIMENSIONS_UNKNOWN'));
});
test('different source geometry yields different capacities/ranking with reasons',()=>{
    const small=design({bodyHeight:60,id:'small'}).entry,large=design({bodyHeight:450,id:'large'}).entry;
    assert.ok(small.profile.textFrames.find(t=>t.role==='body').capacity.estimatedCharacters.high<large.profile.textFrames.find(t=>t.role==='body').capacity.estimatedCharacters.low);
    const r=Match.rank([small,large],{...article,body:'가'.repeat(650)},{installedFonts:fonts});
    assert.equal(r.selectedId,null);assert.equal(r.candidates[0].id,'large');assert.ok(r.candidates[0].reasons.length);assert.ok(r.excluded.some(r=>r.id==='small'));
});
test('photo ratio is a soft penalty and title fit requires explicit approved bound',()=>{
    const {m,d,entry}=design({titleHeight:200}),a={...article,images:[{width:100,height:900}]};
    assert.ok(Match.evaluate(entry,a,{installedFonts:fonts}).soft.some(r=>r.code==='IMAGE_RATIO'));
    const initial=Match.evaluate(entry,{...article,title:'가'},{installedFonts:fonts}).estimates.title;
    d.autoFit={title:{confirmed:true,minFontSize:46}};
    const approved=Match.libraryEntry(m,d),r=Match.evaluate(approved,{...article,title:'가'.repeat(initial.high+1)},{installedFonts:fonts});
    assert.ok(r.soft.some(r=>r.code==='AUTO_FIT_REQUIRED'));assert.equal(r.productionReady,false);
});
test('content binding leaves original typography immutable and cannot invoke production',()=>{
    const {entry,m}=design(),before=JSON.stringify(m),bound=Match.bindContent(entry,article);
    assert.equal(JSON.stringify(m),before);assert.ok(Object.isFrozen(bound.original));assert.equal(bound.productionReady,false);
    assert.equal(bound.content.find(x=>x.role==='body').text,article.body);
    assert.deepEqual(bound.original.stories,m.stories);assert.equal(bound.runtimeAdjustments.length,0);
});
test('multi-file library isolates corruption and rejects traversal before reads',async()=>{
    const {m,d}=design();let reads=0;
    const r=await Match.loadLibrary({schema:'magazine-design-library/v1',designs:[{...d,model:'good.json'},{...d,id:'bad',model:'../secret.json'}]},async()=>{reads++;return JSON.stringify(m);});
    assert.equal(reads,1);assert.equal(r.entries.length,1);assert.equal(r.errors.length,1);
});
test('calibration records actual observation without rewriting estimates',()=>{
    const {entry}=design(),estimate=entry.profile.textFrames[0].capacity,before=JSON.stringify(estimate);
    assert.throws(()=>Match.calibration(estimate,{characters:10,overflows:false}),/evidence/);
    const r=Match.calibration(estimate,{characters:10,overflows:false,documentEvidence:'manual-host-measurement'});assert.equal(r.observed.overflows,false);assert.equal(JSON.stringify(estimate),before);
});
test('unknown role mapping is review required, not evidence of missing subtitle slot',()=>{
    const {m,d}=design();m.elements[0].role.confirmed=null;d.roles={};
    const entry=Match.libraryEntry(m,d),r=Match.evaluate(entry,{...article,subtitle:'부제'},{installedFonts:fonts});
    assert.equal(r.status,'review-required');assert.equal(r.hard.length,0);assert.ok(r.review.some(r=>r.code==='SUBTITLE_UNSUPPORTED'));
});
test('multiple library designs share one immutable source and one file read',async()=>{
    const {m,d}=design();let reads=0;
    const r=await Match.loadLibrary({schema:'magazine-design-library/v1',designs:[{...d,model:'same.json'},{...d,id:'another',model:'same.json'}]},async()=>{reads++;return JSON.stringify(m);});
    assert.equal(reads,1);assert.equal(r.entries.length,2);assert.equal(r.entries[0].original,r.entries[1].original);assert.ok(Object.isFrozen(r.entries[0].original));
});
test('large point size with short leading cannot imply many usable lines in a tiny frame',()=>{
    const {m}=design(),e=m.elements[0];e.pageBounds.p1=[0,0,20,400];
    for(const r of m.stories[0].paragraphs[0].runs)Object.assign(r.resolvedProperties,{PointSize:60,Leading:15,SpaceBefore:0,SpaceAfter:0});
    const result=Match.capacity(m,e);assert.equal(result.known,true);assert.equal(result.estimatedCharacters.high,0);
});


test('source text conflicting with estimated capacity requires calibration, never proves fit',()=>{
 const {m,d}=design({bodyHeight:60});const st=m.stories.find(s=>s.id==='bodyStory');for(const r of st.paragraphs.flatMap(p=>p.runs))r.tokens=[];st.paragraphs[0].runs[0].tokens=[{type:'Content',text:'가'.repeat(1000)}];
 const entry=Match.libraryEntry(m,d),r=Match.evaluate(entry,{...article,body:'가'.repeat(650)},{installedFonts:fonts});assert.equal(r.status,'review-required');assert.ok(r.review.some(i=>i.code==='SOURCE_CAPACITY_UNCALIBRATED'));assert.equal(r.productionReady,false);
 const c=Match.capacity(m,m.elements.find(e=>e.id==='body'));assert.equal(c.sourceObservation.characters,1000);assert.equal(c.sourceObservation.hostFitVerified,false);assert.ok(c.estimatedCharacters.high<650);
 const linked=copy(m.elements.find(e=>e.id==='body'));linked.id='linked';m.elements.push(linked);assert.equal(Match.capacity(m,m.elements.find(e=>e.id==='body')).sourceObservation.exclusiveFrame,false);
});
