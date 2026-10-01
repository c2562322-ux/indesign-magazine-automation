const test=require('node:test'),assert=require('node:assert/strict');
const P=require('../src/package-xml'),Z=require('../src/docxZip'),D=require('../src/docx-media'),N=require('../src/registered-native'),Match=require('../src/design-matching');
const png=(w,h)=>{const b=Buffer.alloc(24);Buffer.from([137,80,78,71,13,10,26,10]).copy(b);b.writeUInt32BE(13,8);b.write('IHDR',12);b.writeUInt32BE(w,16);b.writeUInt32BE(h,20);return b;};
test('CJK composer and Roman-only kerning normalize in both run and direct paths without merging modes',()=>{
 const F=require('../src/registered-fidelity');
 const expected={runs:[{KerningMethod:'$ID/Metrics - Roman Only',direct:{Composer:'HL Composer J',KerningMethod:'Metrics - Roman Only'}}]},actual={runs:[{KerningMethod:'메트릭 - 로마자 전용',direct:{Composer:'Adobe CJK 단락 컴포저',KerningMethod:'메트릭 - 로마자 전용'}}]};
 assert.equal(F.compare(expected,actual,{}).equal,true);
 assert.equal(F.directCompare({composer:'Adobe CJK 단락 컴포저',kerningMethod:'메트릭 - 로마자 전용'},{Composer:'HL Composer J',KerningMethod:'Metrics - Roman Only'},{}).comparison.equal,true);
 for(const different of ['Metrics','Optical',0,'Unknown'])assert.equal(F.compare({KerningMethod:'Metrics - Roman Only'},{KerningMethod:different},{}).equal,false);
 for(const different of ['Adobe 단락 컴포저','Adobe CJK 싱글라인 컴포저','HL Composer','Unknown'])assert.equal(F.compare({Composer:'HL Composer J'},{Composer:different},{}).equal,false);
 const ID={app:{findKeyStrings:v=>v==='localized composer'?['$ID/HL Composer J']:[],translateKeyString:k=>k==='$ID/Metrics - Roman Only'?'localized roman':k}};
 assert.equal(F.compare({Composer:'HL Composer J',KerningMethod:'Metrics - Roman Only'},{Composer:'localized composer',KerningMethod:'localized roman'},ID).equal,true);
 assert.equal(expected.runs[0].KerningMethod,'$ID/Metrics - Roman Only');
});
test('page cleanup compares line and Bezier paths relative to actual page origin, preserving real drift',()=>{
 const F=require('../src/registered-fidelity');
 const path=[[10,20],[[30,40],[50,60],[70,80]]],shift=p=>p.length===2&&p.every(Number.isFinite)?[p[0]+612.283465,p[1]+100]:p.map(shift);
 assert.deepEqual(F.pagePath(shift(path),[100,612.283465,900,1224]),path);
 const make=(bounds,points)=>({parentPage:{bounds},geometricBounds:[bounds[0]+20,bounds[1]+10,bounds[0]+80,bounds[1]+70],paths:[{entirePath:points}]});
 const a=F.frameSnapshot(make([0,0,800,612],path)),b=F.frameSnapshot(make([100,612.283465,900,1224],shift(path)));
 assert.equal(F.preservation({objects:{x:a}},{objects:{x:b}}).equal,true);
 b.paths[0][1][0][0]+=1;assert.equal(F.preservation({objects:{x:a}},{objects:{x:b}}).equal,false);
 assert.throws(()=>F.pagePath([[NaN,1]],[0,0,1,1]),/UNSUPPORTED/);
});
test('shading and border origin enums compare semantically, including CJK em-box, without accepting different origins',()=>{
 const F=require('../src/registered-fidelity');
 const token=name=>({toString:()=>name});
 for(const family of ['Shading','Border'])for(const edge of ['Top','Bottom']){
  const key='Paragraph'+family+edge+'Origin',hostKey=key[0].toLowerCase()+key.slice(1),name='EmBox'+edge+'Origin',member='EM_BOX_'+edge.toUpperCase()+'_ORIGIN',native=token(member),ID={[key+'Enum']:{[member]:native}};
  assert.equal(F.directCompare({[hostKey]:native},{[key]:name},ID).comparison.equal,true);
  assert.equal(F.directCompare({[hostKey]:token(member)},{[key]:name},{}).comparison.equal,true);
  const different=token('BASELINE_'+edge.toUpperCase()+'_ORIGIN');
  assert.equal(F.directCompare({[hostKey]:different},{[key]:name},ID).comparison.equal,false);
  assert.throws(()=>F.directCompare({[hostKey]:token('UNKNOWN')},{[key]:name},ID),/UNSUPPORTED/);
 }
});
test('native special Character enum becomes its exact Unicode, never a literal enum-looking string',()=>{
 const F=require('../src/registered-fidelity'),SpecialCharacters={FORCED_LINE_BREAK:1397124194,DOUBLE_LEFT_QUOTE:1396984945,DOUBLE_RIGHT_QUOTE:1396986481};
 assert.equal(F.characterText(SpecialCharacters.FORCED_LINE_BREAK,{SpecialCharacters}),'\u2028');
 assert.equal(F.characterText(SpecialCharacters.DOUBLE_LEFT_QUOTE,{SpecialCharacters}),'“');
 assert.equal(F.characterText(SpecialCharacters.DOUBLE_RIGHT_QUOTE,{SpecialCharacters}),'”');
 assert.equal(F.characterText('DOUBLE_LEFT_QUOTE',{SpecialCharacters}),'DOUBLE_LEFT_QUOTE');
 assert.notEqual(F.characterText(SpecialCharacters.DOUBLE_LEFT_QUOTE,{SpecialCharacters}),'”');
 assert.equal(F.characterText(99,{SpecialCharacters}),'99');
});
test('HSB readback compares equivalent RGB without conflating color spaces or channel differences',()=>{
 const F=require('../src/registered-fidelity'),ID={ColorSpace:{HSB:1,RGB:2,CMYK:3}},doc={};
 const actual=v=>F.colorActual({space:1,colorValue:v},ID,doc);
 assert.equal(F.compare({space:'RGB',values:[183.6,183.6,183.6]},actual([0,0,72])).equal,true);
 for(const [h,rgb] of [[0,[255,0,0]],[120,[0,255,0]],[240,[0,0,255]],[360,[255,0,0]]])assert.deepEqual(actual([h,100,100]),{space:'RGB',values:rgb});
 assert.equal(F.compare({space:'RGB',values:[183.6,183.6,183.6]},actual([0,0,70])).equal,false);
 assert.equal(F.compare({space:'CMYK',values:[0,0,0,0]},actual([0,0,100])).equal,false);
 assert.throws(()=>actual([0,101,50]),/UNSUPPORTED/);
 assert.throws(()=>F.colorActual({space:99,colorValue:[1,2,3]},ID,doc),/99.*1,2,3/);
});
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
 for(const g of entry.original.elements.filter(e=>e.type==='Group')){const children=frames.filter(f=>entry.original.elements.find(e=>e.id===f.extractLabel()).groupId===g.id);if(!children.length)continue;const page=children[0].parentPage;const group=Object.assign(new (class Group {})(),{extractLabel:()=>g.id,visible:g.properties.Visible,locked:g.properties.Locked,parentPage:page,parent:{extractLabel:()=>g.spreadId},geometricBounds:[Math.min(...children.map(f=>f.geometricBounds[0])),Math.min(...children.map(f=>f.geometricBounds[1])),Math.max(...children.map(f=>f.geometricBounds[2])),Math.max(...children.map(f=>f.geometricBounds[3]))],pageItems:children});for(const child of children)child.parent=group;frames.push(group);page.allPageItems.push(group);}
 const doc={pages,spreads:[{}],recompose(){recomposes++;},allPageItems:frames,swatches:{item:()=>none}};
 return {ID,doc,frames,env:{ID,open:async()=>doc,guard(){},inspect:()=>({errors:originalOverflow?['source overflow']:[],warnings:[],issues:[]})},get recomposes(){return recomposes;}};
}
test('Kinsoku built-in enums stay distinct and custom table names cannot impersonate them',()=>{
 const F=require('../src/registered-fidelity'),ID={KinsokuSet:{KOREAN_KINSOKU:1263692659,HARD_KINSOKU:1248357235,NOTHING:1851876449}};
 for(const got of [1263692659,'KoreanKinsoku','$ID/KoreanKinsoku',{toString:()=> 'KOREAN_KINSOKU'}])assert.equal(F.directCompare({kinsokuSet:got},{KinsokuSet:'KoreanKinsoku'},ID).comparison.equal,true);
 for(const got of [1248357235,1851876449])assert.equal(F.directCompare({kinsokuSet:got},{KinsokuSet:'KoreanKinsoku'},ID).comparison.equal,false);
 for(const got of [99,null,{name:'KoreanKinsoku',cantBeginLineChars:'custom'}])assert.throws(()=>F.directCompare({kinsokuSet:got},{KinsokuSet:'KoreanKinsoku'},ID),/UNSUPPORTED/);
});
test('direct color overrides use source color definitions and reject actual paint changes',()=>{
 const F=require('../src/registered-fidelity'),model={colors:[{id:'Color/example',type:'Color',properties:{Space:'RGB',ColorValue:'10 20 30'}}]},ID={ColorSpace:{RGB:1}},doc={};
 const compare=values=>F.directCompare({fillColor:{space:1,colorValue:values}},{FillColor:'Color/example'},ID,model,doc);
 assert.equal(compare([10,20,30]).comparison.equal,true);assert.equal(compare([10,20,31]).comparison.equal,false);
 assert.throws(()=>F.directCompare({fillColor:{}},{FillColor:'Color/missing'},ID,model,doc),/UNSUPPORTED/);
});
test('native proof and original recheck share enum/character canonicalization and still block real typography drift',async()=>{
 const e=JSON.parse(JSON.stringify(fixture()));for(const story of e.original.stories)for(const p of story.paragraphs){p.properties.ParagraphShadingTopOrigin='EmBoxTopOrigin';p.properties.KinsokuSet='KoreanKinsoku';p.properties.Composer='HL Composer J';for(const r of p.runs){r.tokens=[{type:'Content',text:'“가\u2028”'}];r.properties.KerningMethod='Metrics - Roman Only';r.resolvedProperties.KerningMethod='Metrics - Roman Only';}}
 const h=host(e),member={toString:()=> 'EM_BOX_TOP_ORIGIN'};
 h.ID.ParagraphShadingTopOriginEnum={EM_BOX_TOP_ORIGIN:member};h.ID.SpecialCharacters={DOUBLE_LEFT_QUOTE:1,DOUBLE_RIGHT_QUOTE:2,FORCED_LINE_BREAK:3};
 h.ID.KinsokuSet={KOREAN_KINSOKU:1263692659};let drift=false;
 for(const frame of h.frames.filter(f=>f.parentStory)){const chars=frame.parentStory.characters,original=chars.item;chars.item=i=>{const r=original(i),v={'“':1,'”':2,'\u2028':3}[r.contents];return Object.create(r,{contents:{value:v===undefined?r.contents:v},paragraphShadingTopOrigin:{value:member},kinsokuSet:{value:1263692659},composer:{value:'Adobe CJK 단락 컴포저'},kerningMethod:{value:'메트릭 - 로마자 전용'},pointSize:{value:r.pointSize+(drift?1:0)}});};}
 const c=await N.create(e,null,{...h.env,mode:'proof'});assert.equal(c.phase,'FIDELITY_PASSED',JSON.stringify(c.baseline.records.filter(r=>!r.comparison.equal)));
 assert.equal(N.check(c,h.ID).length,0);
 drift=true;assert.ok(N.check(c,h.ID).some(i=>i.cause==='GENERATOR_MISMATCH'));
});
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
 const e=JSON.parse(JSON.stringify(fixture()));e.original.sourceXml['META-INF/container.xml']={tag:'container',attributes:{},children:[]};e.original.metadata.sourceProcessingInstructions['META-INF/container.xml']=[];
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
 assert.equal(F.directCompare({kerningMethod:'메트릭'},{KerningMethod:'Metrics'},{}).comparison.equal,true);
 assert.throws(()=>F.canonicalPair('KerningMethod','Metrics','unknown localized value',{app:{translateKeyString(){throw new Error('Host translation failed');}}}),/Host translation failed/);
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

test('all 766 reported kerning differences normalize with untranslated translation API and preserve raw evidence',()=>{
 const F=require('../src/registered-fidelity'),ID={app:{translateKeyString:k=>k}};
 const a={runs:Array.from({length:766},()=>({KerningMethod:'Metrics'}))},b={runs:Array.from({length:766},()=>({KerningMethod:'메트릭'}))};
 assert.equal(M.compare(a,b).differences.length,766);assert.equal(F.compare(a,b,ID).equal,true);assert.equal(b.runs[0].KerningMethod,'메트릭');
 for(const [key,value] of Object.entries({KerningMethod:'Optical',AppliedFont:'Other family',FontStyle:'Bold',PointSize:14,Leading:23,Tracking:40})){
  const expected={runs:[{[key]:key==='KerningMethod'?'Metrics':typeof value==='number'?12:'Original'}]},actual={runs:[{[key]:value}]};assert.equal(F.compare(expected,actual,ID).equal,false,key);
 }
 assert.equal(F.compare({bounds:[0,0,10,10]},{bounds:[0,0,11,10]},ID).equal,false);
 assert.equal(F.compare({kerningMethod:'Metrics'},{kerningMethod:'Metrics - Roman Only'},ID).equal,false);
 assert.equal(F.compare({fontStyle:'Metrics'},{fontStyle:'메트릭'},ID).equal,false);
});
test('proof, recheck and post-content comparisons share kerning canonicalization even when translation fails to resolve',async()=>{
 const F=require('../src/registered-fidelity'),entry=fixture();for(const s of entry.original.stories)for(const p of s.paragraphs)for(const r of p.runs){r.resolvedProperties.KerningMethod='Metrics';r.properties.KerningMethod='Metrics';}
 let h=host(entry);h.ID.app.translateKeyString=k=>k;
 for(const f of h.frames)if(f.parentStory)f.parentStory.texts.item(0).kerningMethod='메트릭';
 const proof=await N.create(entry,{title:'새 제목',body:'새 본문',images:[]},{...h.env,mode:'proof'});
 assert.equal(proof.phase,'FIDELITY_PASSED');assert.equal(N.check(proof,h.ID).length,0);
 h=host(entry);h.ID.app.translateKeyString=k=>k;for(const f of h.frames)if(f.parentStory)f.parentStory.texts.item(0).kerningMethod='메트릭';
 const c=await N.create(entry,{title:'새 제목',body:'새 본문',images:[]},h.env);assert.equal(c.phase,'CONTENT_APPLIED');
 for(const f of h.frames)if(f.parentStory)f.parentStory.texts.item(0).kerningMethod='Metrics';
 assert.equal(N.check(c,h.ID).length,0);
 h.frames[0].parentStory.texts.item(0).kerningMethod='광학';assert.ok(N.check(c,h.ID).some(i=>i.cause==='GENERATOR_MISMATCH'));
 assert.equal(F.compare({appliedLanguage:'Korean'},{appliedLanguage:'English: USA'},h.ID).equal,false);
});
test('other locales resolve only exact unambiguous Adobe keys; unknown and Roman-only values remain unequal',()=>{
 const F=require('../src/registered-fidelity');
 assert.equal(F.compare({KerningMethod:'Metrics'},{KerningMethod:'Métrique'},{app:{findKeyStrings:()=>['$ID/Metrics']}}).equal,true);
 assert.equal(F.compare({KerningMethod:'Metrics'},{KerningMethod:'unknown'},{app:{findKeyStrings:()=>['$ID/Metrics','$ID/Optical']}}).equal,false);
 assert.equal(F.compare({KerningMethod:'Metrics'},{KerningMethod:'메트릭 - 로마자 전용'},{}).equal,false);
});

test('independent BODY stories partition content once in explicit order and preserve frame typography',async()=>{
 const e=JSON.parse(JSON.stringify(fixture())),body=e.original.elements.find(e=>e.id==='body'),story=e.original.stories.find(s=>s.id==='bodyStory');
 e.original.elements.push({...JSON.parse(JSON.stringify(body)),id:'body2',textFrame:{...body.textFrame,storyRef:'bs2'}});e.original.stories.push({...JSON.parse(JSON.stringify(story)),id:'bs2'});e.descriptor.roles.body2={role:'body',confirmed:true};e.descriptor.bodyFlow=['bodyStory','bs2'];
 const entry=R.register(e.original,e.descriptor);assert.equal(entry.profile.readyForMatching,true);
 const a={title:'새 제목',body:'한글 본문 첫 부분\r\nSecond paragraph 😀 마지막 문단.',images:[]},binding=Match.bindContent(entry,a,{installedFonts:entry.profile.requiredFonts}).content.filter(x=>x.role==='body');assert.equal(binding.map(b=>b.text).join(''),a.body);assert.ok(binding.every(b=>b.text.length));
 const h=host(entry),c=await N.create(entry,a,h.env);assert.equal(c.phase,'CONTENT_APPLIED');assert.equal(N.check(c,h.ID).length,0);
 assert.equal(c.contentChecks.filter(x=>x.role==='body').map(x=>x.frame.parentStory.contents).join(''),a.body.replace(/\r\n?|\n/g,'\r'));
 const bad=R.register(e.original,{...e.descriptor,bodyFlow:['bodyStory','bodyStory']});assert.equal(bad.profile.readyForMatching,false);
});
test('IMAGE 1 through 10 bind and place distinct internal files without single-digit truncation',async()=>{
 const e=JSON.parse(JSON.stringify(fixture())),base=e.original.elements.find(e=>e.type==='Rectangle');for(let i=1;i<=10;i++){e.original.elements.push({...JSON.parse(JSON.stringify(base)),id:'photo'+i,pageCandidates:['p1'],pageBounds:{p1:[10,450,150,590]},properties:{},details:{},image:[],groupId:null});e.descriptor.roles['photo'+i]={role:'image'+i,confirmed:true};e.descriptor.images['photo'+i]='required';}
 const entry=R.register(e.original,e.descriptor),a={title:'새 제목',body:'새 본문',images:Array.from({length:10},(_,i)=>({source:'docx',path:'C:/smoke/'+i+'.png',widthPx:1200,heightPx:800,documentOrder:i+1}))};
 const h=host(entry),c=await N.create(entry,a,h.env);assert.equal(c.phase,'CONTENT_APPLIED');assert.equal(c.contentChecks.find(x=>x.role==='image10').imagePath,'C:/smoke/9.png');assert.equal(N.check(c,h.ID).length,0);
});
test('unassigned Group wholly contained by selected child pages is safe; shared children still block',()=>{
 const e=JSON.parse(JSON.stringify(fixture())),child=e.original.elements[0];child.groupId='container';e.original.elements.push({id:'container',type:'Group',pageCandidates:[],spreadId:child.spreadId,properties:{},image:[]});assert.doesNotThrow(()=>N.packagePlan(e));
 child.pageCandidates=['p1','p2'];assert.throws(()=>N.packagePlan(e),/귀속/);
});
test('original proof can inspect unmapped pages without permitting production content writes',async()=>{
 const e=JSON.parse(JSON.stringify(fixture()));e.profile.readyForMatching=false;assert.throws(()=>N.packagePlan(e),/역할/);const h=host(e),c=await N.create(e,null,{...h.env,mode:'proof'});assert.equal(c.phase,'FIDELITY_PASSED');assert.deepEqual(c.edits,[]);
});


test('image crop and low-resolution warnings retain source geometry and do not hide preservation errors',async()=>{
 const e=JSON.parse(JSON.stringify(fixture())),photo=e.original.elements.find(e=>e.type==='Rectangle');photo.pageCandidates=['p1'];photo.pageBounds={p1:[10,450,150,590]};photo.image=[];photo.properties={};photo.details={};e.descriptor.roles[photo.id]={role:'image1',confirmed:true};e.descriptor.images[photo.id]='required';e.descriptor.preserveElementIds=e.descriptor.preserveElementIds.filter(id=>id!==photo.id);
 const entry=R.register(e.original,e.descriptor),h=host(entry),c=await N.create(entry,{title:'새 제목',body:'새 본문',images:[{path:'C:/smoke/photo.png',source:'docx',widthPx:100,heightPx:50}]},h.env);
 assert.equal(c.phase,'CONTENT_APPLIED');assert.ok(c.contentWarnings.some(s=>s.includes('비율')));assert.ok(c.contentWarnings.some(s=>s.includes('해상도')));assert.equal(N.check(c,h.ID).length,0);
 const frame=c.contentChecks.find(c=>c.imagePath).frame;frame.geometricBounds[0]+=1;assert.ok(N.check(c,h.ID).some(i=>i.cause==='GENERATOR_MISMATCH'));assert.equal(c.autoFixAllowed,false);
});


test('confirmed IMAGE instruction is hidden only after successful placement; proof and caption remain intact',async()=>{
 const e=JSON.parse(JSON.stringify(fixture())),photo=e.original.elements.find(e=>e.type==='Rectangle');photo.pageCandidates=['p1'];photo.pageBounds={p1:[10,450,150,590]};photo.image=[];photo.properties={};photo.details={};e.descriptor.roles[photo.id]={role:'image1',confirmed:true};e.descriptor.images[photo.id]='required';
 const label=JSON.parse(JSON.stringify(e.original.elements[0])),story=JSON.parse(JSON.stringify(e.original.stories[0]));label.id='guide';label.role={};label.textFrame.storyRef='guideStory';label.pageBounds={p1:[50,460,65,570]};story.id='guideStory';for(const p of story.paragraphs)for(const r of p.runs)r.tokens=[];story.paragraphs[0].runs[0].tokens=[{type:'Content',text:'image placeholder'}];e.original.elements.push(label);e.original.stories.push(story);e.descriptor.preserveElementIds.push('guide');const entry=R.register(e.original,e.descriptor),article={title:'새 제목',body:'새 본문',images:[{path:'C:/photo.png',widthPx:1200,heightPx:800}]};
 assert.equal(Match.imagePlaceholders(entry).length,1);const proofHost=host(entry),proof=await N.create(entry,article,{...proofHost.env,mode:'proof'});assert.equal(proof.phase,'FIDELITY_PASSED');assert.notEqual(proofHost.frames.find(f=>f.extractLabel()==='guide').visible,false);
 const h=host(entry),c=await N.create(entry,article,h.env),guide=h.frames.find(f=>f.extractLabel()==='guide');assert.equal(guide.visible,false);assert.equal(guide.parentStory.contents,'image placeholder');assert.equal(N.check(c,h.ID).length,0);guide.visible=true;assert.ok(N.check(c,h.ID).some(i=>i.cause==='GENERATOR_MISMATCH'));guide.visible=false;guide.geometricBounds[0]+=2;assert.ok(N.check(c,h.ID).some(i=>i.cause==='GENERATOR_MISMATCH'));
 const bad=host(entry,{onPlace:f=>{f.allGraphics=[];}});await assert.rejects(()=>N.create(entry,article,bad.env),/placeholder 유지/);assert.notEqual(bad.frames.find(f=>f.extractLabel()==='guide').visible,false);
 e.descriptor.roles.guide={role:'caption',confirmed:true};assert.equal(Match.imagePlaceholders(R.register(e.original,e.descriptor)).length,0);delete e.descriptor.roles.guide;label.pageBounds.p1=[200,460,215,570];assert.equal(Match.imagePlaceholders(R.register(e.original,e.descriptor)).length,0);
});


test('DOCX 1/2/3/4/40 images survive extraction, ranking, selection and native production; fewer slots reject',async()=>{
 for(const count of [1,2,3,4,40]){
  // Synthetic PNG metadata and Host; this is not an Adobe placement test.
  const parts=[['word/document.xml','<w:document><w:body><w:p><w:r><w:t>제목</w:t></w:r></w:p><w:p><w:r><w:t>본문</w:t></w:r></w:p>'+Array.from({length:count},(_,i)=>'<w:p>'+drawing('r'+i)+'</w:p>').join('')+'</w:body></w:document>'],['word/_rels/document.xml.rels','<Relationships>'+Array.from({length:count},(_,i)=>rel('r'+i,i+'.png')).join('')+'</Relationships>'],...Array.from({length:count},(_,i)=>['word/media/'+i+'.png',png(1200,800)])];
  const parsed=Match.parseArticle('many.docx',P.zip(parts));assert.equal(parsed.profile.imageCount,count);assert.equal(parsed.article.images.length,count);const article=parsed.article;article.images.forEach((im,i)=>{im.path='C:/docx/'+i+'.png';delete im.bytes;assert.equal(im.documentOrder,i+1);});
  const e=JSON.parse(JSON.stringify(fixture())),base=e.original.elements.find(e=>e.type==='Rectangle');for(let i=1;i<=count;i++){e.original.elements.push({...JSON.parse(JSON.stringify(base)),id:'slot'+i,pageCandidates:['p1'],pageBounds:{p1:[10,450,150,590]},properties:{},details:{},image:[],groupId:null});e.descriptor.roles['slot'+i]={role:'image'+i,confirmed:true};e.descriptor.images['slot'+i]='required';}
  const entry=R.register(e.original,e.descriptor),fonts=entry.profile.requiredFonts,rank=R.recommendations([entry],article,fonts);assert.equal(rank.allCandidates.length,1);const selected=R.selection(entry,article,fonts);assert.equal(selected.overlay.content.filter(c=>c.image).length,count);
  const h=host(entry),c=await N.create(entry,article,h.env);assert.equal(c.phase,'CONTENT_APPLIED');assert.equal(c.contentChecks.filter(c=>c.imagePath).length,count);assert.equal(N.check(c,h.ID).length,0);assert.equal(c.contentChecks.find(c=>c.role==='image'+count).imagePath,'C:/docx/'+(count-1)+'.png');
  delete e.descriptor.roles['slot'+count];delete e.descriptor.images['slot'+count];e.descriptor.preserveElementIds.push('slot'+count);const fewer=R.register(e.original,e.descriptor);assert.ok(Match.evaluate(fewer,article,{installedFonts:fonts}).hard.some(i=>i.code==='EXTRA_IMAGES'));assert.throws(()=>R.selection(fewer,article,fonts),/EXTRA_IMAGES/);
 }
});


test('mixed Group paint delegates to strict child snapshots and retains container structure/effects',()=>{
 const F=require('../src/registered-fidelity'),page={extractLabel:()=> 'p',bounds:[0,0,500,500]},group=Object.assign(new (class Group {})(),{extractLabel:()=> 'g',parentPage:page,geometricBounds:[0,0,100,100],transparencySettings:{blendingSettings:{opacity:100,blendMode:'Normal',isolateBlending:false,knockoutGroup:false}}});
 for(const k of ['fillColor','strokeColor','strokeWeight','fillTint','strokeTint','overprintFill','overprintStroke','strokeType','frameFittingOptions','paths','allGraphics'])Object.defineProperty(group,k,{get(){throw new Error('Mixed aggregate '+k);}});
 const child=(id,name)=>({extractLabel:()=>id,parent:group,parentPage:page,geometricBounds:[0,0,50,50],fillColor:{name},fillTint:100,overprintFill:false,strokeColor:{name:'Black'},strokeWeight:1,strokeTint:100,overprintStroke:false,strokeType:'Solid'}),a=child('a','Cyan'),b=child('b','Paper');group.pageItems=[a,b];page.allPageItems=[group,a,b];const doc={pages:[page]};
 const before=F.capture(doc,['p']);assert.equal(before.objects.g.appearanceSource,'CHILD_OBJECTS');assert.equal(F.preservation(before,F.capture(doc,['p'])).equal,true);
 const oldFill=a.fillColor;a.fillColor={name:'Red'};assert.equal(F.preservation(before,F.capture(doc,['p'])).equal,false);a.fillColor=oldFill;group.geometricBounds[0]=1;assert.equal(F.preservation(before,F.capture(doc,['p'])).equal,false);group.geometricBounds[0]=0;
 for(const [key,v] of [['fillTint',50],['overprintFill',true],['strokeWeight',2],['strokeTint',30],['overprintStroke',true]]){const old=a[key];a[key]=v;assert.equal(F.preservation(before,F.capture(doc,['p'])).equal,false,key);a[key]=old;}
 group.transparencySettings.blendingSettings.opacity=40;assert.equal(F.preservation(before,F.capture(doc,['p'])).equal,false);group.transparencySettings.blendingSettings.opacity=100;
 group.pageItems=[b,a];assert.equal(F.preservation(before,F.capture(doc,['p'])).equal,false);group.pageItems=[a,b];page.allPageItems=[group,a];assert.throws(()=>F.capture(doc,['p']),/child snapshot/);page.allPageItems=[group,a,b];Object.defineProperty(a,'fillColor',{get(){throw new Error('Required child read failed');}});assert.throws(()=>F.capture(doc,['p']),/Required child read failed/);
});

test('original-byte PI evidence survives extraction, registration and package recreation; loss is blocked',()=>{
 const Markers=require('../src/idml-markers'),raw=spawnSync(fs.existsSync(py)?py:'python3',['tests/test_design_extraction.py','--marker-model'],{encoding:'utf8'});assert.equal(raw.status,0,raw.stderr);
 const model=JSON.parse(raw.stdout),d=R.draft(model,'p1'),entry=R.register(model,d);
 Markers.validateSource(model);const packed=R.pack([entry]),restored=R.unpack(packed).entries[0],plan=N.packagePlan(restored,{allowUnmapped:true});
 assert.equal(plan.validation.markerValidation.sourceVerified,true);
 const story=Object.keys(model.sourceXml).find(n=>n.startsWith('Stories/')),xml=Z.utf8BytesToString(Z.readZipEntry(plan.bytes,story));assert.match(xml,/before<\?ACE 18\?>middle<\?future preserve\?>after/);
 const mutate=JSON.parse(JSON.stringify(model));function lose(n){if(n.children)n.children=n.children.filter(c=>c.tag!=='#pi');for(const c of n.children||[])lose(c);}lose(mutate.sourceXml[story]);assert.throws(()=>Markers.validateSource(mutate),/SOURCE_MARKER_LOSS/);
 const projection=JSON.parse(JSON.stringify(model));delete projection.stories[0].paragraphs[0].runs[0].tokens[0].contentTree;assert.throws(()=>Markers.validateSource(projection),/PROJECTION_LOSS/);
 const legacy=JSON.parse(JSON.stringify(model));delete legacy.metadata.markerPreservationVersion;assert.throws(()=>Markers.validateSource(legacy),/REEXTRACTION_REQUIRED/);
 const entries=Object.entries(model.sourceXml).map(([n,t])=>[n,P.serialize(t)]);entries.find(([n])=>n===story)[1]=xml.replace('<?ACE 18?>','');assert.throws(()=>Markers.validateSerialized(model.sourceXml,entries),/GENERATED_MARKER_LOSS/);
});
test('PI serialization retains generic instructions and rejects terminator injection',()=>{
 const tree={tag:'Content',text:'a',children:[{tag:'#pi',target:'future',data:'x < y & z',tail:'b'},{tag:'#comment',text:'note',tail:'c'},{tag:'#pi',target:'ACE',data:'18',tail:'d'}],beforeRoot:[{tag:'#pi',target:'before',data:'v'}],afterRoot:[{tag:'#pi',target:'after',data:'v'}]};
 const xml=P.serialize(tree);assert.ok(xml.includes('<?before v?><Content>a<?future x < y & z?>b<!--note-->c<?ACE 18?>d</Content><?after v?>'));
 assert.throws(()=>P.serialize({tag:'#pi',target:'ACE',data:'18?><evil/>'}),/Invalid/);
});
test('Host Current Page Number audit requires native marker identity, not a literal page number',()=>{
 const M=require('../src/idml-markers'),entry={descriptor:{pageIds:['p']},original:{pages:[{id:'master',kind:'MasterSpread'}],elements:[{id:'frame',pageCandidates:['master'],textFrame:{storyRef:'s'}}],stories:[{id:'s',paragraphs:[{runs:[{tokens:[{type:'Content',contentTree:{tag:'Content',text:'',children:[{tag:'#pi',target:'ACE',data:'18',tail:''}]}}]}]}]}]}},ID={SpecialCharacters:{AUTO_PAGE_NUMBER:123}};
 let contents=123;const f={extractLabel:()=> 'frame',parentStory:{characters:{length:1,item:()=>({contents})}}},doc={allPageItems:[],masterSpreads:[{allPageItems:[f]}]};const check=()=>{let result;M.checkHost(entry,doc,ID,(_role,_id,a,b)=>{result=Mdl.compare(a,b);});return result;};const Mdl=require('../src/design-model');
 assert.equal(check().equal,true);contents='4';assert.equal(check().equal,false);contents='';assert.equal(check().equal,false);
 entry.original.stories[0].paragraphs[0].runs[0].tokens[0].contentTree.children[0].data='999';assert.equal(check().equal,false);
});
test('explicit page number restoration only fills an empty single-style Story and retains style',()=>{
 const M=require('../src/idml-markers'),tree={tag:'Story',attributes:{Self:'s'},children:[{tag:'ParagraphStyleRange',attributes:{AppliedParagraphStyle:'p'},children:[{tag:'CharacterStyleRange',attributes:{PointSize:10},children:[]}]}]},trees={'Stories/s.xml':tree},request=[{kind:'RESTORE_CURRENT_PAGE_NUMBER',storyId:'s',donorSourceSha256:'source',donorStoryId:'old'}];
 M.applyRestorations(trees,request);assert.equal(tree.children[0].children[0].attributes.PointSize,10);assert.equal(M.inventory(tree)[0].data,'18');assert.throws(()=>M.applyRestorations(trees,request),/EMPTY/);
});

test('mixed language policy preserves source character classes, rejects unseen or ambiguous structure',()=>{
 const T=require('../src/registered-text-policy'),make=(text,lang)=>({styleRef:'same',properties:{PointSize:13,...(lang==='Korean'?{AppliedLanguage:lang}:{})},resolvedProperties:{PointSize:13,AppliedLanguage:lang},tokens:[{type:'Content',text}]}),s={paragraphs:[{styleRef:'p',properties:{},runs:[make('한글','Korean'),make(' .','[No Language]')]}]};
 const p=T.policy(s);assert.equal(p.mode,'language-by-source-character-class');assert.deepEqual(T.assignments(p,'글. '),['Korean','[No Language]','[No Language]']);assert.throws(()=>T.assignments(p,'English'),/UNSUPPORTED/);
 const chars=Array.from('글. ',()=>({})),story={characters:{itemByRange:(a,b)=>({set appliedLanguage(v){for(let i=a;i<=b;i++)chars[i].appliedLanguage=v;}})}};T.apply(story,T.assignments(p,'글. '),{Korean:'native-ko','[No Language]':'native-none'});assert.deepEqual(chars.map(c=>c.appliedLanguage),['native-ko','native-none','native-none']);
 const ambiguous=structuredClone(s);ambiguous.paragraphs[0].runs.push(make('글','[No Language]'));assert.throws(()=>T.policy(ambiguous),/UNSUPPORTED/);
 const styled=structuredClone(s);styled.paragraphs[0].runs[1].resolvedProperties.PointSize=12;assert.throws(()=>T.policy(styled),/UNSUPPORTED/);
});
test('PNG Fidelity compares source transform, bounds, link state, clipping and color management',()=>{
 const G=require('../src/registered-graphics'),F=require('../src/registered-fidelity'),ID={CoordinateSpaces:{PARENT_COORDINATES:1},LinkStatus:{NORMAL:2},ClippingPathType:{NONE:3},Profile:{NO_CMS:4},RenderingIntent:{USE_COLOR_SETTINGS:5}};
 const source={type:'Image',properties:{ItemTransform:'2 0 0 2 10 20',GraphicBounds:{Left:0,Top:0,Right:100,Bottom:50},ImageTypeName:'PNG',Space:'$ID/#Links_RGB',Profile:'$ID/None',ImageRenderingIntent:'UseColorSettings',Visible:true},details:{Link:{StoredState:'Normal',LinkResourceURI:'file:C:/a.png'},ClippingPathSettings:{ClippingType:'None'},TextWrapPreference:{TextWrapMode:'None'}}};
 source.details.MetadataPacketPreference={Contents:'<x:xmpmeta>source identity</x:xmpmeta>'};assert.equal(G.reason(source),null);
 const e={pageCandidates:['p'],spreadTransform:[1,0,0,1,0,0],image:[source]},model={pages:[{id:'p',transform:[1,0,0,1,0,0],bounds:[0,0,500,500]}]},g={constructor:{name:'Image'},transformValuesOf:()=>[{matrixValues:[2,0,0,2,10,20]}],geometricBounds:[20,10,120,210],itemLink:{filePath:'C:/a.png',status:2},clippingPath:{clippingType:3},space:'RGB',profile:4,imageRenderingIntent:5,visible:true},frame={parentPage:{bounds:[0,0,500,500]},allGraphics:[g]};
 const check=()=>{const c=G.compare(model,e,frame,ID);return F.compare(c.expected,c.actual,ID).equal;};assert.equal(check(),true);
 for(const mutate of [()=>g.itemLink.status=99,()=>g.geometricBounds[0]++,()=>g.clippingPath.clippingType=99,()=>g.space='CMYK',()=>g.itemLink.filePath='C:/other.png',()=>g.profile=99,()=>g.imageRenderingIntent=99]){const saved={...g,itemLink:{...g.itemLink},clippingPath:{...g.clippingPath},geometricBounds:g.geometricBounds.slice()};mutate();assert.equal(check(),false);Object.assign(g,saved);}
 source.details.ClippingPathSettings.ClippingType='DetectEdges';assert.match(G.reason(source),/active graphic clipping/);
});
test('placed graphic snapshots remain page-relative through cleanup and detect real motion',()=>{
 const F=require('../src/registered-fidelity'),frame=(y,x)=>({parentPage:{bounds:[y,x,y+500,x+500]},geometricBounds:[y,x,y+100,x+100],allGraphics:[{geometricBounds:[y-10,x-10,y+110,x+110],itemLink:{filePath:'a.png'}}]});
 const a=F.frameSnapshot(frame(0,0)),b=F.frameSnapshot(frame(50,600));assert.deepEqual(a.graphics,b.graphics);b.graphics[0].bounds[0]++;assert.notDeepEqual(a.graphics,b.graphics);
});
test('FillProportionally rejects letterboxing or distorted scale while preserving frame geometry',async()=>{
 const e=JSON.parse(JSON.stringify(fixture())),photo=e.original.elements.find(e=>e.type==='Rectangle');photo.pageCandidates=['p1'];photo.pageBounds={p1:[10,450,150,590]};photo.image=[];photo.properties={};photo.details={FrameFittingOption:{FittingOnEmptyFrame:'FillProportionally'}};e.descriptor.roles[photo.id]={role:'image1',confirmed:true};e.descriptor.images[photo.id]='required';const entry=R.register(e.original,e.descriptor),article={title:'새 제목',body:'새 본문',images:[{path:'C:/a.png',widthPx:1200,heightPx:800}]};
 for(const bad of [false,true]){const h=host(entry,{onPlace:f=>{Object.assign(f.allGraphics[0],{horizontalScale:100,verticalScale:bad?80:100});}});h.ID.EmptyFrameFittingOptions={FILL_PROPORTIONALLY:42};h.frames.find(f=>f.extractLabel()===photo.id).frameFittingOptions.fittingOnEmptyFrame=42;
 if(bad)await assert.rejects(()=>N.create(entry,article,h.env),/FillProportionally/);else {const c=await N.create(entry,article,h.env);assert.equal(c.phase,'CONTENT_APPLIED');assert.deepEqual(c.contentChecks.find(c=>c.imagePath).bounds,photo.pageBounds.p1);}}
});

test('native mixed-language BODY replacement preserves styles, rechecks each character and reports content overflow',async()=>{
 const e=JSON.parse(JSON.stringify(fixture())),s=e.original.stories.find(s=>s.id==='bodyStory'),r=structuredClone(s.paragraphs[0].runs[0]);r.tokens=[{type:'Content',text:'한글'}];r.properties.AppliedLanguage='Korean';r.resolvedProperties.AppliedLanguage='Korean';const r2=structuredClone(r);r2.tokens=[{type:'Content',text:' .'}];delete r2.properties.AppliedLanguage;r2.resolvedProperties.AppliedLanguage='[No Language]';s.paragraphs=[{...s.paragraphs[0],runs:[r,r2]}];
 const entry=R.register(e.original,e.descriptor),h=host(entry),f=h.frames.find(f=>f.extractLabel()==='body'),story=f.parentStory,base=story.texts.item(0),languages=['Korean','Korean','[No Language]','[No Language]'];
 story.characters.item=i=>Object.create(base,{contents:{get:()=>story.contents[i]},appliedLanguage:{get:()=>languages[i],set:v=>{languages[i]=v;}}});
 story.characters.itemByRange=(a,b)=>({set appliedLanguage(v){for(let i=a;i<=b;i++)languages[i]=v;}});
 const c=await N.create(entry,{title:'새 제목',body:'새 글.',images:[]},h.env);assert.equal(c.phase,'CONTENT_APPLIED');assert.equal(story.contents,'새 글.');assert.deepEqual(languages,['Korean','[No Language]','Korean','[No Language]']);assert.equal(N.check(c,h.ID).length,0);assert.equal(c.autoFixAllowed,false);
 languages[0]='English';assert.ok(N.check(c,h.ID).some(i=>i.cause==='GENERATOR_MISMATCH'));languages[0]='Korean';Object.defineProperty(story,'overflows',{get:()=>true});assert.ok(N.check(c,h.ID).some(i=>i.cause==='CONTENT_OVERFLOW'));
});

test('POINT_TEXT alias uses subtitle role and reports overset without changing source size',async()=>{
 const Input=require('../src/article-input'),a=Input.parse('a.txt','[TITLE]\n새 제목\n[POINT_TEXT]\n새 본문\n[BODY]\n본문');assert.equal(a.subtitle,'새 본문');
 const e=JSON.parse(JSON.stringify(fixture())),b=e.original.elements.find(e=>e.id==='body'),story=e.original.stories.find(s=>s.id==='bodyStory'),sub=structuredClone(b),ss=structuredClone(story);sub.id='point';sub.textFrame.storyRef='pointStory';ss.id='pointStory';e.original.elements.push(sub);e.original.stories.push(ss);e.descriptor.roles.point={role:'subtitle',confirmed:true};
 const entry=R.register(e.original,e.descriptor),h=host(entry,{contentOverflow:true}),c=await N.create(entry,{...a,images:[]},h.env),frame=h.frames.find(f=>f.extractLabel()==='point');assert.equal(c.phase,'CONTENT_APPLIED');assert.equal(frame.parentStory.contents,'새 본문');assert.ok(h.recomposes>=2);assert.ok(N.check(c,h.ID).some(i=>i.role==='subtitle'&&i.cause==='CONTENT_OVERFLOW'));assert.deepEqual(frame.geometricBounds,sub.pageBounds.p1);assert.equal(frame.parentStory.texts.item(0).pointSize,ss.paragraphs[0].runs[0].resolvedProperties.PointSize);
});

test('missing template asset is explicit and separate from DOCX media, never authorizes output',()=>{
 const ID={app:{scriptPreferences:{measurementUnit:'mm'}},MeasurementUnits:{POINTS:'pt'}},c={phase:'FIDELITY_FAILED',failure:'external source unavailable',baseline:{externalAssets:[{elementId:'frame',state:'EXTERNAL_ASSET_UNAVAILABLE'}]},contentChecks:[]};
 const issues=N.check(c,ID);assert.ok(issues.some(i=>i.cause==='EXTERNAL_ASSET_UNAVAILABLE'&&i.source==='template'&&i.category==='BLOCKING'));assert.ok(!issues.some(i=>i.cause==='CONTENT_OVERFLOW'));
 const report={errors:['external source unavailable'],issues,fidelity:{phase:'FIDELITY_FAILED',records:[]}},diag=require('../src/production-diagnostics').fidelityDiagnostic(report,fixture());assert.ok(JSON.stringify(diag).includes('EXTERNAL_ASSET_UNAVAILABLE'));
});

test('COLOR_SLOT changes only confirmed fills after Fidelity; original option and drift remain strict',async()=>{
 const e=JSON.parse(JSON.stringify(fixture())),shape=e.original.elements.find(e=>e.type==='Rectangle');shape.pageCandidates=['p1'];shape.pageBounds={p1:[20,460,120,580]};shape.properties={ContentType:'Unassigned',FillColor:e.original.colors.find(c=>c.type==='Color').id};shape.image=[];shape.details={};e.descriptor.roles[shape.id]&&delete e.descriptor.roles[shape.id];e.descriptor.preserveElementIds=[...new Set(e.descriptor.preserveElementIds.concat(shape.id))];e.descriptor.colorSlots=[{name:'ACCENT',confirmed:true,elementIds:[shape.id]}];const entry=R.register(e.original,e.descriptor),article={title:'새 제목',body:'새 본문',images:[],themeColors:{ACCENT:{space:'RGB',values:[12,45,90]}}};
 function setup(){const h=host(entry);h.ID.ColorModel={PROCESS:1};h.doc.colors={add:p=>({name:'theme',space:p.space,colorValue:p.colorValue})};return h;}
 const original=setup(),plain=await N.create(entry,{...article,themeColors:{}},original.env);assert.equal(plain.edits.some(e=>e.colorFill),false);assert.equal(N.check(plain,original.ID).length,0);
 const h=setup(),c=await N.create(entry,article,h.env);assert.equal(c.phase,'CONTENT_APPLIED');assert.equal(N.check(c,h.ID).length,0,JSON.stringify(N.check(c,h.ID)));assert.deepEqual(h.frames.find(f=>f.extractLabel()===shape.id).fillColor.colorValue,[12,45,90]);const f=h.frames.find(f=>f.extractLabel()===shape.id);f.fillColor.colorValue=[12,45,91];assert.ok(N.check(c,h.ID).some(i=>i.cause==='GENERATOR_MISMATCH'));assert.deepEqual(entry.original.elements.find(e=>e.id===shape.id).properties.FillColor,shape.properties.FillColor);
 const failed=host(entry,{originalOverflow:true});let writes=0;failed.doc.colors={add:()=>{writes++;}};const blocked=await N.create(entry,article,failed.env);assert.equal(blocked.phase,'FIDELITY_FAILED');assert.equal(writes,0);
 const proof=setup(),p=await N.create(entry,article,{...proof.env,mode:'proof'});assert.equal(p.edits.length,0);
});


test('metadata packet package preservation rejects loss and retains duplicate packets',()=>{
 const G=require('../src/registered-graphics'),P=require('../src/package-xml');const packet={tag:'MetadataPacketPreference',attributes:{},text:'',children:[{tag:'Properties',attributes:{},text:'',children:[{tag:'Contents',attributes:{},text:'<x:xmpmeta>identity</x:xmpmeta>',children:[]}]}]};const tree={tag:'Spread',attributes:{},children:[packet,packet]};const xml=P.serialize(tree);
 assert.equal(G.validateMetadata({'Spreads/a.xml':tree},[['Spreads/a.xml',xml]]).packetCount,2);
 assert.throws(()=>G.validateMetadata({'Spreads/a.xml':tree},[['Spreads/a.xml',xml.replace(P.serialize(packet).replace(/^<\?xml[^?]*\?>/,''),'')]]),/serialization loss/);
});
