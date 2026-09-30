const test=require('node:test'),assert=require('node:assert/strict');
const P=require('../src/package-xml'),Z=require('../src/docxZip'),D=require('../src/docx-media'),N=require('../src/registered-native'),Match=require('../src/design-matching');
const png=(w,h)=>{const b=Buffer.alloc(24);Buffer.from([137,80,78,71,13,10,26,10]).copy(b);b.writeUInt32BE(13,8);b.write('IHDR',12);b.writeUInt32BE(w,16);b.writeUInt32BE(h,20);return b;};
const drawing=id=>`<w:drawing><wp:inline><a:blip r:embed="${id}"/></wp:inline></w:drawing>`;
function word(body,rels){return P.zip([['word/document.xml',`<w:document><w:body><w:p><w:r><w:t>제목</w:t></w:r></w:p>${body}<w:p><w:r><w:t>본문입니다.</w:t></w:r></w:p></w:body></w:document>`],['word/_rels/document.xml.rels',`<Relationships>${rels}</Relationships>`],['word/media/a.png',png(1200,800)],['word/media/b.png',png(600,900)],['word/media/unused.png',png(1,1)]]);}
const rel=(id,name)=>`<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${name}"/>`;
test('DOCX relationships determine image order, dimensions and profile; unused resources excluded',()=>{const out=D.extract(word(`<w:p>${drawing('b')}</w:p><w:p>${drawing('a')}</w:p>`,rel('a','a.png')+rel('b','b.png')));assert.deepEqual(out.article.images.map(i=>i.originalName),['b.png','a.png']);assert.equal(out.article.images[0].orientation,'portrait');assert.equal(out.article.images[1].aspectRatio,1.5);const profile=Match.articleProfile(out.article);assert.equal(profile.imageCount,2);assert.equal(profile.images[0].paragraphPosition,1);});
test('duplicate relationships to same image retain occurrence positions without duplicate photos',()=>{const out=D.extract(word(`<w:p>${drawing('a')}${drawing('alias')}</w:p>`,rel('a','a.png')+rel('alias','a.png')));assert.equal(out.article.images.length,1);assert.equal(out.article.images[0].occurrences.length,2);});
test('explicit decorative/background images excluded with warning',()=>{const out=D.extract(word(`<w:p><w:drawing><wp:anchor behindDoc="1"><a:blip r:embed="a"/></wp:anchor></w:drawing></w:p>`,rel('a','a.png')));assert.equal(out.article.images.length,0);assert.equal(out.warnings.length,1);});
test('ambiguous duplicate relationship IDs and escaping paths rejected',()=>{assert.throws(()=>D.extract(word(`<w:p>${drawing('a')}</w:p>`,rel('a','a.png')+rel('a','b.png'))),/중복/);for(const p of ['../secret','file:///secret','../../media/a.png'])assert.throws(()=>D.target(p));});
test('stored package CRC, UTF8 and XML namespace escaping roundtrip',()=>{const xml=P.serialize({tag:'{urn:test}root',attributes:{name:'한글 & "'},text:'<본문>\r',children:[]});assert.match(xml,/xmlns:ns0="urn:test"/);assert.match(xml,/&amp;/);const bytes=P.zip([['mimetype','application/test'],['test.xml',xml]]);assert.equal(Z.utf8BytesToString(Z.readZipEntry(bytes,'test.xml')),xml);assert.equal(P.crc(Buffer.from('123456789')),0xcbf43926);assert.throws(()=>P.zip([['../escape','x']]));});
test('Fidelity failure remains blocking and forbids false output success',()=>{const ID={app:{scriptPreferences:{measurementUnit:'mm'}},MeasurementUnits:{POINTS:'pt'}};const issues=N.check({phase:'FIDELITY_FAILED',contentChecks:[]},ID);assert.equal(issues[0].cause,'GENERATOR_MISMATCH');assert.equal(issues[0].category,'BLOCKING');assert.equal(ID.app.scriptPreferences.measurementUnit,'mm');});
test('content geometry drift classified as fidelity failure, not content fit',()=>{const ID={app:{scriptPreferences:{measurementUnit:'mm'}},MeasurementUnits:{POINTS:'pt'}};const c={phase:'CONTENT_APPLIED',contentChecks:[{role:'image1',bounds:[0,0,10,10],frame:{parentPage:{bounds:[0,0,100,100]},geometricBounds:[0,0,11,10]}}]};assert.equal(N.check(c,ID)[0].cause,'GENERATOR_MISMATCH');});
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawnSync}=require('node:child_process'),R=require('../src/design-registration'),M=require('../src/design-model');
const py=path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe');
const result=spawnSync(fs.existsSync(py)?py:'python3',['tests/test_design_extraction.py','--model'],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);
function fixture(){const m=JSON.parse(result.stdout),base=m.elements[0],s=m.stories.find(s=>s.id===base.textFrame.storyRef);for(const r of s.paragraphs.flatMap(p=>p.runs)){r.resolvedProperties=JSON.parse(JSON.stringify(s.paragraphs[0].runs[0].resolvedProperties));r.properties=JSON.parse(JSON.stringify(s.paragraphs[0].runs[0].properties));r.styleRef=s.paragraphs[0].runs[0].styleRef;}const body=JSON.parse(JSON.stringify(base)),bs=JSON.parse(JSON.stringify(s));body.id='body';body.role.confirmed=null;body.textFrame.storyRef='bodyStory';body.pageBounds.p1=[150,20,700,420];bs.id='bodyStory';m.elements.push(body);m.stories.push(bs);const d=R.draft(m,'p1');R.confirm(d,'body','body');return R.register(m,d);}
function host(entry,{drift=false,originalOverflow=false,contentOverflow=false,onRemove,onPlace}={}){
 const ID={MeasurementUnits:{POINTS:'pt'},app:{scriptPreferences:{measurementUnit:'mm'}},Leading:{AUTO:'auto'},Justification:Object.fromEntries(Object.values(M.ALIGN).map(k=>[k,k])),ColorSpace:{RGB:'RGB',CMYK:'CMYK'},FitOptions:{APPLY_FRAME_FITTING_OPTIONS:'apply'}};
 const frames=[],pages=[];let recomposes=0;
 const none={name:'None',id:0};
 for(const p of entry.original.pages.filter(p=>p.kind==='Spread'))pages.push({extractLabel:()=>p.id,bounds:[0,0,p.height,p.width],allPageItems:[],remove(){if(onRemove)onRemove(frames);pages.splice(pages.indexOf(this),1);}});
 const color=ref=>ref==='Swatch/None'?none:(()=>{const c=entry.original.colors.find(c=>c.id===ref);return c?{name:c.properties.Name,space:c.properties.Space,colorValue:c.properties.ColorValue.split(' ').map(Number)}:undefined;})();
 for(const e of entry.original.elements.filter(e=>e.pageCandidates.length===1&&entry.descriptor.pageIds.includes(e.pageCandidates[0]))){
  const page=pages.find(p=>p.extractLabel()===e.pageCandidates[0]),style=entry.original.styles.object.find(s=>s.id===e.objectStyleRef),props={...(style&&style.resolvedProperties),...e.properties};
  const f={extractLabel:()=>e.id,parentPage:page,geometricBounds:e.pageBounds[e.pageCandidates[0]].map((x,i)=>x+(drift&&i===0?1:0)),fillColor:color(props.FillColor),strokeColor:color(props.StrokeColor),strokeWeight:props.StrokeWeight,fillTint:props.FillTint,strokeTint:props.StrokeTint,allGraphics:[],itemLayer:{name:e.layerRef},appliedObjectStyle:{name:e.objectStyleRef}};
  if(e.textFrame){
   const s=entry.original.stories.find(s=>s.id===e.textFrame.storyRef),runs=s.paragraphs.flatMap(p=>p.runs),props=runs[0].resolvedProperties;
   let contents=runs.flatMap(r=>r.tokens.map(t=>t.type==='Content'?t.text:t.type==='Br'?'\r':'')).join('');
   const t={};for(const [k,v] of Object.entries(props))t[k[0].toLowerCase()+k.slice(1)]=v;
   Object.assign(t,{appliedFont:{fontFamily:props.AppliedFont},fontStyle:props.FontStyle,justification:M.ALIGN[props.Justification],fillColor:color(props.FillColor),appliedCharacterStyle:{name:runs[0].styleRef},appliedParagraphStyle:{name:s.paragraphs[0].styleRef}});
   Object.defineProperty(t,'contents',{enumerable:true,get:()=>contents});
   const story={extractLabel:()=>s.id,get contents(){return contents;},set contents(v){contents=v;},get overflows(){return contents==='새 본문'&&contentOverflow;},textContainers:[f],characters:{item:i=>Object.create(t,{contents:{get:()=>contents[i]}}),itemByRange:()=>{throw new Error('Plural Character properties are not scalar');}},paragraphs:{item:()=>t},texts:{item:()=>t}};
   f.parentStory=story;const prefs=Match.framePreferences(entry.original,e).effective;f.textFramePreferences={textColumnCount:prefs.TextColumnCount,textColumnGutter:prefs.TextColumnGutter,insetSpacing:prefs.InsetSpacing};
  }else{
   f.frameFittingOptions={autoFit:false,leftCrop:0,topCrop:0,rightCrop:0,bottomCrop:0,fittingOnEmptyFrame:'None',fittingAlignment:'CenterAnchor'};
   f.place=path=>{f.allGraphics=[{itemLink:{filePath:path},geometricBounds:f.geometricBounds}];if(onPlace)onPlace(f,path);};f.fit=()=>{};
  }
  frames.push(f);page.allPageItems.push(f);
 }
 const doc={pages,spreads:[{}],recompose(){recomposes++;},allPageItems:frames,swatches:{item:()=>none}};
 return {ID,doc,frames,env:{ID,open:async()=>doc,guard(){},inspect:()=>({errors:originalOverflow?['source overflow']:[],warnings:[],issues:[]})},get recomposes(){return recomposes;}};
}
test('native pipeline compares original first, replaces uniform text, retains original model and bounds',async()=>{const entry=fixture(),before=JSON.stringify(entry.original),h=host(entry),c=await N.create(entry,{title:'새 제목',body:'새 본문',images:[]},h.env);assert.equal(c.phase,'CONTENT_APPLIED');assert.equal(h.recomposes,2);assert.equal(N.check(c,h.ID).length,0);assert.equal(JSON.stringify(entry.original),before);assert.equal(h.frames.find(f=>f.extractLabel()==='body').parentStory.contents,'새 본문');});
test('source mismatch or original overflow leaves content untouched and blocks output',async()=>{for(const option of [{drift:true},{originalOverflow:true}]){const entry=fixture(),h=host(entry,option),text=h.frames[0].parentStory.contents,c=await N.create(entry,{title:'새 제목',body:'새 본문',images:[]},h.env);assert.equal(c.phase,'FIDELITY_FAILED');assert.equal(c.autoFixAllowed,false);assert.equal(h.frames[0].parentStory.contents,text);assert.ok(N.check(c,h.ID).length);}});
test('post replacement overflow is content issue, never silently auto-fitted',async()=>{const entry=fixture(),h=host(entry,{contentOverflow:true}),c=await N.create(entry,{title:'새 제목',body:'새 본문',images:[]},h.env);assert.equal(c.phase,'CONTENT_APPLIED');assert.equal(N.check(c,h.ID)[0].cause,'CONTENT_OVERFLOW');assert.equal(c.autoFixAllowed,false);});
test('stale open identifies only newly opened document for cleanup',async()=>{const entry=fixture(),h=host(entry);let calls=0;h.env.guard=()=>{if(++calls>1)throw new Error('reload');};await assert.rejects(()=>N.create(entry,{title:'새 제목',body:'새 본문',images:[]},h.env),e=>e.registeredDocument===h.doc);});
test('fixed story crossing page selection is rejected before import',async()=>{
 const entry=JSON.parse(JSON.stringify(fixture())),fixed=JSON.parse(JSON.stringify(entry.original.elements[0]));
 fixed.id='fixed';fixed.textFrame.storyRef='fixedStory';
 const outside=JSON.parse(JSON.stringify(fixed));outside.id='outside';outside.pageCandidates=['otherPage'];
 entry.original.elements.push(fixed,outside);
 let opened=false;
 await assert.rejects(()=>N.create(entry,{title:'새 제목',body:'새 본문',images:[]},{open:async()=>{opened=true;},guard(){}}),/선택 페이지 밖 Story 연결/);
 assert.equal(opened,false);
 outside.pageCandidates=['p1'];assert.doesNotThrow(()=>N.packagePlan(entry));
 outside.pageCandidates=['p1','otherPage'];assert.throws(()=>N.packagePlan(entry),/페이지 귀속|선택 페이지 밖 Story 연결/);
});
test('content loss blocks output even with matching typography and simultaneous overflow',async()=>{
 const entry=fixture(),h=host(entry,{contentOverflow:true}),c=await N.create(entry,{title:'새 제목',body:'새 본문',images:[]},h.env);
 const body=c.contentChecks.find(x=>x.role==='body');body.text='새 본문 누락 부분';
 const issues=N.check(c,h.ID);
 assert.ok(issues.some(i=>i.cause==='GENERATOR_MISMATCH'&&i.category==='BLOCKING'));
 assert.ok(issues.some(i=>i.cause==='CONTENT_OVERFLOW'));
 assert.equal(c.autoFixAllowed,false);
});
test('self-closing empty Word paragraphs preserve subtitle and image paragraph indices',()=>{
 const out=D.extract(word(`<w:p/><w:p><w:pPr><w:pStyle w:val="Subtitle"/></w:pPr><w:r><w:t>부제 문장</w:t></w:r></w:p><w:p /> <w:p>${drawing('a')}</w:p>`,rel('a','a.png')));
 assert.equal(out.article.title,'제목');assert.equal(out.article.subtitle,'부제 문장');
 assert.doesNotMatch(out.article.body,/부제 문장/);assert.match(out.article.body,/본문입니다/);
 assert.equal(out.article.images[0].paragraphIndex,4);
});
test('proof-only native import preserves source text and records page cleanup without replacement',async()=>{
 const entry=fixture(),h=host(entry),before=h.frames[0].parentStory.contents;
 const c=await N.create(entry,null,{...h.env,mode:'proof'});
 assert.equal(c.phase,'FIDELITY_PASSED');assert.equal(c.proofOnly,true);assert.equal(c.contentChecks.length,0);
 assert.equal(h.frames[0].parentStory.contents,before);assert.equal(h.doc.pages.length,1);
 assert.ok(c.baseline.records.some(r=>r.role==='page-count'&&r.comparison.equal));assert.ok(c.baseline.records.some(r=>r.role==='page-cleanup'&&r.comparison.equal));assert.deepEqual(c.baseline.fallbacks,[]);
});
test('page removal mutation of selected frame, parent or order fails before content writes',async()=>{
 for(const change of [frames=>{frames[0].geometricBounds[0]++;},frames=>{frames[0].parentPage.allPageItems.reverse();},frames=>{frames[0].parentPage.appliedMaster={extractLabel:()=> 'changed-master'};}]){
  const entry=fixture(),h=host(entry,{onRemove:change}),before=h.frames[0].parentStory.contents;
  const c=await N.create(entry,{title:'새 제목',body:'새 본문',images:[]},h.env);
  assert.equal(c.phase,'FIDELITY_FAILED');assert.equal(h.frames[0].parentStory.contents,before);assert.equal(c.autoFixAllowed,false);
 }
});
test('fill and stroke mismatch block original fidelity',async()=>{
 for(const change of [f=>{f.fillColor={name:'wrong',space:'RGB',colorValue:[255,0,0]};},f=>{f.strokeWeight=3;}]){
  const e=fixture(),h=host(e);change(h.frames[0]);const c=await N.create(e,null,{...h.env,mode:'proof'});assert.equal(c.phase,'FIDELITY_FAILED');
  assert.ok(c.baseline.records.some(r=>r.comparison.differences.some(d=>JSON.stringify(d).includes('appearance'))));
 }
});
test('paragraph inheritance, direct keep/rule overrides and nonstandard leading survive replacement',async()=>{
 const e=JSON.parse(JSON.stringify(fixture()));for(const s of e.original.stories)for(const p of s.paragraphs){Object.assign(p.properties,{KeepWithNext:2,RuleAbove:true,RuleAboveLineWeight:7.25});for(const r of p.runs)Object.assign(r.resolvedProperties,{KeepWithNext:2,RuleAbove:true,RuleAboveLineWeight:7.25});}
 const h=host(e),c=await N.create(e,{title:'새 제목',body:'새 본문',images:[]},h.env);
 assert.equal(c.phase,'CONTENT_APPLIED');assert.equal(N.check(c,h.ID).length,0);const t=h.frames[0].parentStory.texts.item(0);
 assert.equal(t.leading,54);assert.notEqual(t.leading,t.pointSize*1.2);assert.equal(t.keepWithNext,2);assert.equal(t.ruleAboveLineWeight,7.25);
 t.keepWithNext=0;assert.ok(N.check(c,h.ID).some(i=>/override|속성/.test(i.message)));
});
test('unresolved leading never receives a point-size fallback',async()=>{
 const e=JSON.parse(JSON.stringify(fixture()));for(const s of e.original.stories)for(const r of s.paragraphs.flatMap(p=>p.runs))delete r.resolvedProperties.Leading;
 const h=host(e),c=await N.create(e,null,{...h.env,mode:'proof'});assert.equal(c.phase,'FIDELITY_FAILED');assert.deepEqual(c.baseline.fallbacks,[]);
 assert.ok(c.baseline.records.some(r=>JSON.stringify(r.original).includes('SOURCE_UNRESOLVED')));
});
test('blank and break-only mixed overrides cannot escape uniform replacement gate',()=>{
 const e=JSON.parse(JSON.stringify(fixture())),s=e.original.stories.find(s=>s.id===e.original.elements[0].textFrame.storyRef),p=s.paragraphs[0],r=JSON.parse(JSON.stringify(p.runs[0]));r.tokens=[{type:'Br'}];r.properties.KeepWithNext=9;p.runs.push(r);
 assert.throws(()=>N.replacementPlan(e,{title:'제목',body:'본문',images:[]}),/혼합/);
});
test('KEEP_AS_IS text and decoration mutations are caught on subsequent checks',async()=>{
 const e=JSON.parse(JSON.stringify(fixture())),fixed=JSON.parse(JSON.stringify(e.original.elements[0]));fixed.id='fixed';fixed.role.confirmed=null;fixed.textFrame.storyRef='fixed-story';
 const story=JSON.parse(JSON.stringify(e.original.stories.find(s=>s.id===e.original.elements[0].textFrame.storyRef)));story.id='fixed-story';e.original.elements.push(fixed);e.original.stories.push(story);
 const decoration={id:'decoration',type:'GraphicLine',pageCandidates:['p1'],pageBounds:{p1:[20,20,20,420]},properties:{StrokeWeight:1,StrokeColor:'Swatch/None'},image:[]};e.original.elements.push(decoration);
 const h=host(e),c=await N.create(e,{title:'새 제목',body:'새 본문',images:[]},h.env);assert.equal(c.phase,'CONTENT_APPLIED');assert.equal(N.check(c,h.ID).length,0);
 h.frames.find(f=>f.extractLabel()==='fixed').parentStory.contents='unexpected';h.frames.find(f=>f.extractLabel()==='decoration').strokeWeight=2;
 assert.ok(N.check(c,h.ID).some(i=>i.cause==='GENERATOR_MISMATCH'));
});
test('DOCX relationship metadata binds to IMAGE slot and reaches native place; wrong link is blocked',async()=>{
 const e=JSON.parse(JSON.stringify(fixture())),im={...JSON.parse(JSON.stringify(e.original.elements.find(e=>e.type==='Rectangle'))),id:'slot-photo',pageCandidates:['p1'],pageBounds:{p1:[10,450,150,590]},properties:{},details:{},image:[],groupId:null};e.original.elements.push(im);e.descriptor.roles['slot-photo']={role:'image1',confirmed:true};e.descriptor.images['slot-photo']='required';
 // Rebuild the profile with the additional confirmed slot.
 const entry=R.register(e.original,e.descriptor),out=D.extract(word(`<w:p>${drawing('a')}</w:p>`,rel('a','a.png')));out.article.images[0].path='C:/smoke/word-image.png';
 const h=host(entry),c=await N.create(entry,out.article,h.env);assert.equal(c.phase,'CONTENT_APPLIED');const check=c.contentChecks.find(c=>c.role==='image1');
 assert.equal(check.imageMetadata.widthPx,1200);assert.equal(check.imageMetadata.aspectRatio,1.5);assert.equal(check.imageMetadata.documentOrder,1);
 assert.equal(h.frames.find(f=>f.extractLabel()==='slot-photo').allGraphics[0].itemLink.filePath,'C:/smoke/word-image.png');assert.equal(N.check(c,h.ID).length,0);
 h.frames.find(f=>f.extractLabel()==='slot-photo').allGraphics[0].itemLink.filePath='C:/wrong.png';assert.ok(N.check(c,h.ID).some(i=>/place/.test(i.message)));
});
test('original overflow and replacement overflow have separate causes, neither permits Auto Fix',async()=>{
 const e=fixture(),source=host(e,{originalOverflow:true}),c=await N.create(e,null,{...source.env,mode:'proof'});assert.ok(N.check(c,source.ID).some(i=>i.cause==='SOURCE_OVERFLOW'));assert.equal(c.autoFixAllowed,false);
 const target=host(e,{contentOverflow:true}),made=await N.create(e,{title:'새 제목',body:'새 본문',images:[]},target.env);assert.ok(N.check(made,target.ID).some(i=>i.cause==='CONTENT_OVERFLOW'));assert.equal(made.autoFixAllowed,false);
});
test('package keeps a single container and escapes XML attribute whitespace',()=>{
 const e=JSON.parse(JSON.stringify(fixture()));e.original.sourceXml['META-INF/container.xml']={tag:'container',attributes:{},children:[]};
 const bytes=N.packagePlan(e).bytes;assert.equal(Z.utf8BytesToString(Z.readZipEntry(bytes,'META-INF/container.xml')).includes('rootfile'),true);
 const xml=P.serialize({tag:'x',attributes:{label:'a\tb\nc\rd'},children:[]});assert.match(xml,/&#9;/);assert.match(xml,/&#10;/);assert.match(xml,/&#13;/);
});
test('registered package validates legacy aid repair and refuses missing inventoried metadata',()=>{
 const e=JSON.parse(JSON.stringify(fixture())),plan=N.packagePlan(e);
 assert.match(plan.validation.aid,/type="document"/);assert.equal(plan.packagingNotes.length,1);
 e.original.metadata.packageInventory.push({name:'META-INF/metadata.xml'});delete e.original.sourceXml['META-INF/metadata.xml'];
 assert.throws(()=>N.packagePlan(e),/META-INF\/metadata.xml/);
});
test('registered native pipeline integrates with Host check, save, proof PDF block and production PDF',async()=>{
 const vm=require('node:vm'),entry=fixture(),h=host(entry),calls=[],coll=a=>({length:a.length,item:i=>a[i]});
 Object.assign(h.ID,{FontStatus:{INSTALLED:1},LinkStatus:{NORMAL:1},ExportFormat:{PDF_TYPE:1},SaveOptions:{NO:1}});
 function productionDoc(){const x=host(entry),doc=x.doc;let exported;Object.assign(doc,{isValid:true,stories:coll(x.frames.filter(f=>f.parentStory).map((f,i)=>{f.parentStory.id=i+1;return f.parentStory;})),fonts:coll([{status:1}]),links:coll([]),allGraphics:[],save(){calls.push('save');return doc;},exportFile(){calls.push('pdf');exported();},addEventListener(n,fn){exported=fn;},removeEventListener(){},close(){doc.isValid=false;}});return doc;}
 const module={exports:{}};vm.runInNewContext(fs.readFileSync('src/auto-indesign.js','utf8'),{module,require:n=>n==='indesign'?h.ID:n==='fs'?fs:require('../src/'+n.replace('./','')),console});const api=module.exports;
 const proof=await api.createRegistered(entry,null,async()=>productionDoc(),undefined,'proof');assert.equal(proof.fidelity.phase,'FIDELITY_PASSED');assert.equal(proof.outputReady,false);
 assert.throws(()=>api.exportPdf('proof.pdf'),/검증용/);assert.equal(calls.length,0);
 const made=await api.createRegistered(entry,{title:'새 제목',body:'새 본문',images:[]},async()=>productionDoc());assert.equal(made.outputReady,true);assert.equal(api.check().errors.length,0);assert.equal(api.save('new.indd').errors.length,0);assert.equal(api.exportPdf('new.pdf').outcome,'exported');assert.deepEqual(calls,['save','pdf']);
 api.resetSession();assert.throws(()=>api.check(),/먼저/);
});
test('unsupported graphic effects and changed Story references cannot pass source fidelity',async()=>{
 const e=JSON.parse(JSON.stringify(fixture()));e.original.elements[0].details={TransparencySetting:{opacity:50}};
 const h=host(e),c=await N.create(e,null,{...h.env,mode:'proof'});assert.equal(c.phase,'FIDELITY_FAILED');assert.ok(JSON.stringify(c.baseline.records).includes('UNSUPPORTED'));
 const simple=fixture(),other=host(simple);other.frames[0].parentStory.extractLabel=()=> 'wrong-story';const bad=await N.create(simple,null,{...other.env,mode:'proof'});assert.equal(bad.phase,'FIDELITY_FAILED');
});
test('synthetic self-contained Word smoke file extracts a valid internal PNG and never overwrites input',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'registered-smoke-')),file=path.join(tmp,'smoke.docx');
 try{const generated=spawnSync(fs.existsSync(py)?py:'python3',['tools/create-registered-smoke-docx.py',file],{encoding:'utf8'});assert.equal(generated.status,0,generated.stderr);const out=D.extract(fs.readFileSync(file));assert.equal(out.article.title,'작은 발견');assert.equal(out.article.images.length,1);assert.equal(out.article.images[0].widthPx,1200);assert.equal(out.article.images[0].heightPx,800);assert.equal(out.article.images[0].paragraphIndex,5);assert.match(out.article.subtitle,/일상/);
  const before=fs.readFileSync(file),again=spawnSync(fs.existsSync(py)?py:'python3',['tools/create-registered-smoke-docx.py',file]);assert.notEqual(again.status,0);assert.deepEqual(fs.readFileSync(file),before);
 }finally{assert.equal(path.dirname(path.resolve(tmp)),path.resolve(os.tmpdir()));assert.ok(path.basename(tmp).startsWith('registered-smoke-'));fs.rmSync(tmp,{recursive:true,force:true});}
});

test('native snapshot getter failure names exact object/property and stops before cleanup',async()=>{
 const e=fixture(),h=host(e),trace=[];let removed=false;
 h.frames[0].id=731;Object.defineProperty(h.frames[0],'textWrapPreferences',{get(){return Object.defineProperty({},'textWrapOffset',{get(){throw new Error('현재 상태에서 이 속성을 적용할 수 없습니다.');}});}});
 for(const p of h.doc.pages)p.remove=()=>{removed=true;};
 await assert.rejects(N.create(e,null,{...h.env,mode:'proof',progress:s=>trace.push(s)}),error=>/textWrapOffset/.test(error.message)&&/731/.test(error.message)&&error.registeredDocument===h.doc);
 assert.ok(trace.some(s=>s==='registered.pageReferences.beforeCleanup.start'));assert.ok(!trace.includes('registered.pageReferences.beforeCleanup.success'));assert.equal(removed,false);assert.equal(h.recomposes,0);
});
test('native shuffle setter failure is attributed after snapshot success without deleting pages',async()=>{
 const e=fixture(),h=host(e),trace=[];h.doc.spreads=[Object.defineProperties({id:12,name:'spread test'},{allowPageShuffle:{get:()=>true,set(){throw new Error('현재 상태에서 이 속성을 적용할 수 없습니다.');}}})];
 await assert.rejects(N.create(e,null,{...h.env,mode:'proof',progress:s=>trace.push(s)}),/shuffle.set.*allowPageShuffle.*false/);
 assert.ok(trace.includes('registered.pageReferences.beforeCleanup.success'));assert.ok(!trace.includes('registered.cleanup.success'));assert.equal(h.recomposes,0);
});
test('already disabled shuffle is preserved without redundant native assignment',async()=>{
 const e=fixture(),h=host(e),trace=[];h.doc.spreads=[Object.defineProperty({},'allowPageShuffle',{get:()=>false,set(){throw new Error('redundant setter rejected');}})];
 const result=await N.create(e,null,{...h.env,mode:'proof',progress:s=>trace.push(s)});assert.equal(result.phase,'FIDELITY_PASSED');assert.ok(trace.includes('registered.fidelity.start'));assert.ok(!trace.some(s=>s.includes('shuffle.set')));
});
test('page remove failure reports page identity and stops before recompose and fidelity',async()=>{
 const e=fixture(),h=host(e),trace=[],p=h.doc.pages.find(p=>!e.descriptor.pageIds.includes(p.extractLabel()));assert.ok(p);p.id=942;p.remove=()=>{throw new Error('page removal refused');};
 await assert.rejects(N.create(e,null,{...h.env,mode:'proof',progress:s=>trace.push(s)}),/page.remove.*942.*remove/);assert.ok(!trace.includes('registered.fidelity.start'));assert.equal(h.recomposes,0);
});
test('unit restoration failure cannot mask the first native snapshot error',async()=>{
 const e=fixture(),h=host(e);Object.defineProperty(h.frames[0],'geometricBounds',{get(){throw new Error('first geometry error');}});
 Object.defineProperty(h.ID.app.scriptPreferences,'measurementUnit',{get:()=> 'mm',set(v){if(v==='mm')throw new Error('restore error');}});
 await assert.rejects(N.create(e,null,{...h.env,mode:'proof'}),error=>/geometricBounds/.test(error.message)&&/first geometry error/.test(error.message)&&/restore error/.test(error.message)&&error.registeredDocument===h.doc);
});

test('post-acquire Page label method failure is exact, structured and stops before snapshot',async()=>{
 const e=fixture(),h=host(e),trace=[];h.doc.pages[0].id=887;h.doc.pages[0].extractLabel=()=>{throw new Error('page label rejected');};
 await assert.rejects(N.create(e,null,{...h.env,mode:'proof',progress:s=>trace.push(s)}),error=>error.registeredFailure.operation==='registered.pageReferences.identity'&&error.registeredFailure.object.id===887&&error.registeredFailure.property==='extractLabel'&&error.registeredFailure.adobeMessage==='page label rejected');
 assert.ok(trace.includes('registered.pageReferences.acquire.success'));assert.ok(!trace.includes('registered.pageReferences.beforeCleanup.start'));assert.equal(h.recomposes,0);
});
test('nested snapshot captures original getter and page/spread identity without masking it',()=>{
 const Trace=require('../src/registered-dom-trace');class Spread{}class Page{}class TextFrame{};const spread=Object.assign(new Spread(),{id:30,name:'spread'}),page=Object.assign(new Page(),{id:20,name:'2',parent:spread}),frame=Object.assign(new TextFrame(),{id:10,parentPage:page});
 assert.throws(()=>Trace.run(()=>{},'outer',frame,'snapshot',null,()=>Trace.run(()=>{},'registered.snapshot.read',{},'insetSpacing',undefined,()=>{throw new Error('denied');},{owner:frame})),e=>e.registeredFailure.operation==='registered.snapshot.read'&&e.registeredFailure.page.id===20&&e.registeredFailure.spread.id===30&&e.registeredFailure.owner.id===10&&e.registeredFailure.attemptedValue===null);
});

test('Adobe None-filled TextFrame snapshot marks inactive paint/fitting/wrap without invoking rejected getters',async()=>{
 const e=JSON.parse(JSON.stringify(fixture()));for(const item of e.original.elements)if(item.textFrame)Object.assign(item.properties,{FillColor:'Swatch/None',StrokeColor:'Swatch/None',StrokeWeight:0});
 const h=host(e),trace=[];h.ID.TextWrapModes={NONE:17};class TextFrame{}
 for(const f of h.frames.filter(f=>f.parentStory)){
  Object.setPrototypeOf(f,TextFrame.prototype);f.id=2692;
  for(const key of ['overprintFill','overprintStroke','fillTint','strokeTint','strokeType','frameFittingOptions'])Object.defineProperty(f,key,{get(){throw new Error('현재 상태에서 이 속성을 적용할 수 없습니다.');},configurable:true});
  f.textWrapPreferences={textWrapMode:17};for(const key of ['textWrapOffset','inverse','textWrapSide'])Object.defineProperty(f.textWrapPreferences,key,{get(){throw new Error('inactive wrap rejected');}});
 }
 const c=await N.create(e,null,{...h.env,mode:'proof',progress:s=>trace.push(s)});assert.equal(c.phase,'FIDELITY_PASSED');assert.ok(trace.includes('registered.pageReferences.beforeCleanup.success'));assert.ok(trace.includes('registered.cleanup.success'));assert.ok(trace.includes('registered.fidelity.start'));
 const state=c.snapshot.objects[h.frames[0].extractLabel()];assert.equal(state.object.overprintFill.status,'NOT_APPLICABLE');assert.equal(state.wrap.inverse.status,'NOT_APPLICABLE');assert.equal(state.fitting.status,'NOT_APPLICABLE');assert.equal(N.check(c,h.ID).length,0);
});
test('applicable paint getter failure remains fatal with original DOM diagnostics',async()=>{
 const e=fixture(),h=host(e),f=h.frames[0];f.fillColor={id:123,name:'Black'};Object.defineProperty(f,'overprintFill',{get(){throw new Error('active overprint rejected');}});
 await assert.rejects(N.create(e,null,{...h.env,mode:'proof'}),e=>e.registeredFailure.property==='overprintFill'&&e.registeredFailure.adobeMessage==='active overprint rejected');assert.equal(h.recomposes,0);
});
test('inactive to active paint and active overprint changes are preservation failures',()=>{
 const F=require('../src/registered-fidelity'),h=host(fixture()),f=h.frames[0];f.fillColor={id:0,name:'None'};
 const before=F.capture(h.doc,['p1']);f.fillColor={id:12,name:'Black'};f.overprintFill=false;f.fillTint=100;
 const active=F.capture(h.doc,['p1']);assert.equal(F.preservation(before,active).equal,false);f.overprintFill=true;assert.equal(F.preservation(active,F.capture(h.doc,['p1'])).equal,false);
});
test('None applicability uses builtin swatch identity, not an arbitrary named color',()=>{
 const F=require('../src/registered-fidelity'),doc={swatches:{item:()=>({id:0,name:'localized'})}};
 assert.equal(F.noPaint({id:0,name:'localized'},doc),true);assert.equal(F.noPaint({id:99,name:'None'},doc),false);
});

test('production rechecks native fidelity even after a successful separate proof, before any DOCX edits',async()=>{
 const e=fixture(),proof=host(e);assert.equal((await N.create(e,null,{...proof.env,mode:'proof'})).phase,'FIDELITY_PASSED');
 const production=host(e,{drift:true}),original=production.frames[0].parentStory.contents,result=await N.create(e,{title:'새 제목',body:'새 본문',images:[]},production.env);
 assert.equal(result.phase,'FIDELITY_FAILED');assert.equal(result.edits.length,0);assert.equal(production.frames[0].parentStory.contents,original);
});
test('real synthetic DOCX text and internal image complete all four slots through native mock pipeline',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'registered-e2e-')),file=path.join(tmp,'smoke.docx');
 return (async()=>{try{
  const generated=spawnSync(fs.existsSync(py)?py:'python3',['tools/create-registered-smoke-docx.py',file],{encoding:'utf8'});assert.equal(generated.status,0,generated.stderr);
  const a=D.extract(fs.readFileSync(file)).article;const pngPath=path.join(tmp,'internal.png');fs.writeFileSync(pngPath,a.images[0].bytes);a.images[0].path=pngPath;delete a.images[0].bytes;
  const e=JSON.parse(JSON.stringify(fixture())),base=e.original.elements.find(x=>x.textFrame),sub=JSON.parse(JSON.stringify(base)),story=JSON.parse(JSON.stringify(e.original.stories.find(s=>s.id===base.textFrame.storyRef)));sub.id='subtitle-slot';sub.textFrame.storyRef='subtitle-story';story.id='subtitle-story';e.original.elements.push(sub);e.original.stories.push(story);e.descriptor.roles[sub.id]={role:'subtitle',confirmed:true};
  const im=JSON.parse(JSON.stringify(e.original.elements.find(x=>x.type==='Rectangle')));Object.assign(im,{id:'image-slot',pageCandidates:['p1'],pageBounds:{p1:[10,450,150,590]},properties:{},details:{},image:[],groupId:null});e.original.elements.push(im);e.descriptor.roles[im.id]={role:'image1',confirmed:true};e.descriptor.images[im.id]='required';
  // Synthetic test layout uses body-sized type; do not relax production capacity checks.
  for(const story of e.original.stories)for(const run of story.paragraphs.flatMap(p=>p.runs)){Object.assign(run.properties,{PointSize:13,Leading:20});Object.assign(run.resolvedProperties,{PointSize:13,Leading:20});}
  const entry=R.register(e.original,e.descriptor),h=host(entry),trace=[],c=await N.create(entry,a,{...h.env,progress:s=>trace.push(s)});assert.equal(c.phase,'CONTENT_APPLIED');assert.equal(N.check(c,h.ID).length,0);
  for(const role of ['title','subtitle','body']){const edit=c.contentChecks.find(x=>x.role===role);assert.equal(edit.frame.parentStory.contents,a[role].replace(/\n/g,'\r'));}
  const image=c.contentChecks.find(x=>x.role==='image1');assert.equal(image.frame.allGraphics[0].itemLink.filePath,pngPath);assert.equal(image.imageMetadata.widthPx,1200);assert.equal(image.imageMetadata.heightPx,800);assert.ok(trace.some(s=>s.startsWith('registered.content.image1.place')));assert.ok(trace.includes('registered.content.inspection.ready'));
 }finally{assert.equal(path.dirname(path.resolve(tmp)),path.resolve(os.tmpdir()));assert.ok(path.basename(tmp).startsWith('registered-e2e-'));fs.rmSync(tmp,{recursive:true,force:true});}})();
});

test('UXP non-enumerable color enums retain exact space and channels; unknown spaces block',()=>{
 const F=require('../src/registered-fidelity'),ColorSpace={};
 Object.defineProperty(ColorSpace,'CMYK',{value:1129142603});
 const c={name:'test',space:{equals:v=>v===1129142603},colorValue:[10,0,0,0]};
 assert.deepEqual(F.colorActual(c,{ColorSpace},{}),{space:'CMYK',values:[10,0,0,0]});
 assert.throws(()=>F.colorActual({...c,space:999},{ColorSpace},{}),/UNSUPPORTED color space/);
 assert.equal(M.compare(F.colorActual(c,{ColorSpace},{}),{space:'CMYK',values:[11,0,0,0]}).equal,false);
});
test('scalar Character inspection detects interior font differences before any content replacement',async()=>{
 const entry=fixture(),h=host(entry),story=h.frames[0].parentStory,original=story.contents,item=story.characters.item;
 story.characters.item=i=>{const c=item(i);return i===1?Object.create(c,{fontStyle:{value:'Different face'}}):c;};
 const c=await N.create(entry,{title:'new',body:'new',images:[]},h.env);
 assert.equal(c.phase,'FIDELITY_FAILED');assert.equal(story.contents,original);assert.equal(c.autoFixAllowed,false);
 assert.ok(c.baseline.records.some(r=>r.comparison.differences.some(d=>d.path.includes('FontStyle'))));
});

test('locale normalization uses Adobe keys and untranslated language names without weakening typography',()=>{
 const F=require('../src/registered-fidelity'),ID={app:{translateKeyString:k=>({'$ID/Metrics':'메트릭','$ID/Optical':'광학'})[k]||k}};
 assert.deepEqual(F.canonicalPair('KerningMethod','$ID/Metrics','메트릭',ID),{expected:'Metrics',actual:'Metrics'});
 assert.equal(F.directCompare({kerningMethod:'메트릭',appliedLanguage:{name:'한국어',untranslatedName:'Korean'}},{KerningMethod:'Metrics',AppliedLanguage:'$ID/Korean'},ID).comparison.equal,true);
 assert.equal(F.directCompare({appliedLanguage:{name:'독일어',untranslatedName:'German: 2006 Reform'}},{AppliedLanguage:'German: 2006 Reform'},ID).comparison.equal,true);
 assert.equal(F.directCompare({kerningMethod:'광학'},{KerningMethod:'Metrics'},ID).comparison.equal,false);
 assert.equal(F.directCompare({appliedLanguage:{name:'영어',untranslatedName:'English: USA'}},{AppliedLanguage:'Korean'},ID).comparison.equal,false);
 assert.equal(F.directCompare({fontStyle:'메트릭'},{FontStyle:'Metrics'},ID).comparison.equal,false);
 assert.equal(F.directCompare({kerningMethod:'메트릭'},{KerningMethod:'Metrics'},{}).comparison.equal,false);
 assert.throws(()=>F.canonicalPair('KerningMethod','Metrics','메트릭',{app:{translateKeyString(){throw new Error('Host translation failed');}}}),/Host translation failed/);
});
test('localized kerning passes both resolved typography and direct override gates in native production',async()=>{
 const entry=fixture();for(const s of entry.original.stories)for(const p of s.paragraphs)for(const r of p.runs){r.resolvedProperties.KerningMethod='Metrics';r.properties.KerningMethod='Metrics';}
 const h=host(entry);h.ID.app.translateKeyString=k=>k==='$ID/Metrics'?'메트릭':k;
 for(const f of h.frames)if(f.parentStory)f.parentStory.texts.item(0).kerningMethod='메트릭';
 const c=await N.create(entry,{title:'새 제목',body:'새 본문',images:[]},h.env);assert.equal(c.phase,'CONTENT_APPLIED');assert.equal(N.check(c,h.ID).length,0);
});
test('diagnostic groups remaining differences without dropping full evidence',()=>{
 const D=require('../src/production-diagnostics'),report={fidelity:{records:[{elementId:'x',comparison:{differences:[{path:'$.runs.0.PointSize',expected:12,actual:13},{path:'$.runs.1.PointSize',expected:12,actual:13}]}}]}};
 const out=D.fidelityDiagnostic(report);assert.equal(out.differenceSummary['TYPOGRAPHY_MISMATCH $.runs.*.PointSize'],2);assert.equal(out.comparisons[0].comparison.differences.length,2);
});
