const test=require('node:test'),assert=require('node:assert/strict'),P=require('../src/package-xml'),I=require('../src/idml-package');
function entries(){return [['mimetype',I.MIME],['META-INF/container.xml','<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="designmap.xml"/></rootfiles></container>'],['designmap.xml',I.designmap({tag:'Document',attributes:{DOMVersion:'21.4'},children:[{tag:'{http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging}Story',attributes:{src:'Stories/s.xml'},children:[]}]})],...['Resources/Styles.xml','Resources/Fonts.xml','Resources/Graphic.xml','Spreads/s.xml','Stories/s.xml'].map(n=>[n,'<test/>'])];}
test('IDML distinguishes readable ZIP from Adobe document identification',()=>{
 const valid=entries();assert.equal(I.validate(P.zip(valid)).entries,8);
 valid[2][1]=valid[2][1].replace(I.LEGACY_AID,'');assert.throws(()=>I.validate(P.zip(valid)),/aid/);
});
test('IDML preserves source aid marker and conventional packaging namespace without invented product',()=>{
 const marker='<?aid style="50" type="document" readerVersion="6.0" featureSet="257" product="21.4(7)"?>';
 const xml=I.designmap({tag:'Document',attributes:{DOMVersion:'21.4'},children:[]},marker);assert.ok(xml.includes(marker));
 assert.match(entries()[2][1],/xmlns:idPkg=/);assert.doesNotMatch(I.LEGACY_AID,/product=/);
 assert.throws(()=>I.designmap({},'<?aid type="snippet"?>'),/aid/);
});
test('IDML blocks CRC corruption, truncation, missing resources and broken designmap references',()=>{
 const bytes=P.zip(entries()),bad=bytes.slice();bad[45]^=1;assert.throws(()=>I.validate(bad),/CRC/);
 assert.throws(()=>I.validate(bytes.slice(0,-1)),/ZIP/);
 assert.throws(()=>I.validate(P.zip(entries().filter(e=>e[0]!=='Stories/s.xml'))),/참조 누락/);
 assert.throws(()=>I.validate(P.zip(entries().filter(e=>e[0]!=='Resources/Fonts.xml'))),/필수 항목/);
 const wrong=entries();wrong[0][1]='application/test';assert.throws(()=>I.validate(P.zip(wrong)),/mimetype/);
});
function adapter({corrupt=false,reject=false}={}){let saved,release;const events=[],file={nativePath:'C:\\Temp\\한글 경로\\registered.idml',write:async(data,{format})=>{assert.equal(format,'binary');events.push('write');await new Promise(r=>release=r);saved=new Uint8Array(data);events.push('written');},read:async({format})=>{assert.equal(format,'binary');events.push('read');const result=saved.slice();if(corrupt)result[0]^=1;return result.buffer;}};
 return {events,release:()=>release(),env:{format:'binary',fs:{getTemporaryFolder:async()=>({createFile:async()=>file})},app:{open:async(path,show)=>{assert.equal(path,file.nativePath);assert.equal(show,true);events.push('open');if(reject)throw new Error('Adobe rejected');return {document:true};}}}};
}
test('native open waits for binary write and readback, supports sliced byte buffers and exact native path',async()=>{
 const h=adapter(),zip=P.zip(entries()),backing=new Uint8Array(zip.length+20);backing.set(zip,7);
 const pending=I.open(backing.subarray(7,7+zip.length),h.env);await new Promise(r=>setImmediate(r));assert.deepEqual(h.events,['write']);h.release();assert.deepEqual(await pending,{document:true});assert.deepEqual(h.events,['write','written','read','open']);
});
test('native open is never called for malformed package or corrupted UXP readback',async()=>{
 const h=adapter({corrupt:true});await assert.rejects(I.open(P.zip([['mimetype','idml']]),h.env),/IDML_PACKAGE_INVALID/);assert.deepEqual(h.events,[]);
 const pending=I.open(P.zip(entries()),h.env);await new Promise(r=>setImmediate(r));h.release();await assert.rejects(pending,/IDML_WRITE_MISMATCH/);assert.ok(!h.events.includes('open'));
});
test('Adobe rejection remains fatal with retained temporary path and package evidence',async()=>{
 const h=adapter({reject:true}),pending=I.open(P.zip(entries()),h.env);await new Promise(r=>setImmediate(r));h.release();await assert.rejects(pending,/IDML_HOST_OPEN_FAILED:.*CRC.*registered.idml.*Adobe rejected/);
});
test('reload during pending IDML write cannot open a stale document',async()=>{
 const h=adapter();let stale=false;h.env.guard=()=>{if(stale)throw new Error('session stale');};
 const pending=I.open(P.zip(entries()),h.env);await new Promise(r=>setImmediate(r));stale=true;h.release();await assert.rejects(pending,/session stale/);assert.ok(!h.events.includes('open'));
});
