'use strict';
// This validates our STORE-only writer's output, not arbitrary imported ZIPs.
const P=require('./package-xml'),Z=require('./docxZip');
const MIME='application/vnd.adobe.indesign-idml-package';
const LEGACY_AID='<?aid style="50" type="document" readerVersion="6.0" featureSet="257"?>';
function fail(message){throw new Error('IDML_PACKAGE_INVALID: '+message);}
function designmap(tree,sourceInstruction){
 const instruction=sourceInstruction===undefined?LEGACY_AID:sourceInstruction;
 if(!/^<\?aid\s[^<>]*\?>$/.test(instruction)||! /\btype="document"/.test(instruction))fail('designmap.xml aid 문서 식별 선언 오류');
 return P.serialize(tree).replace(/^(<\?xml[^?]*\?>)/,'$1\n'+instruction+'\n');
}
function validate(input){
 const b=input instanceof Uint8Array?input:new Uint8Array(input),v=new DataView(b.buffer,b.byteOffset,b.byteLength);
 const need=(p,n)=>{if(p<0||p+n>b.length)fail('ZIP 잘림 @'+p);};
 const u16=p=>{need(p,2);return v.getUint16(p,true);},u32=p=>{need(p,4);return v.getUint32(p,true);};
 const text=(p,n)=>{need(p,n);return Z.utf8BytesToString(b.subarray(p,p+n));};
 const end=b.length-22;need(end,22);
 if(u32(end)!==0x06054b50||u16(end+20)!==0||u16(end+4)||u16(end+6))fail('ZIP EOCD/단일 디스크 오류');
 const count=u16(end+10),start=u32(end+16);if(!count||count!==u16(end+8)||start+u32(end+12)!==end)fail('ZIP 중앙 디렉터리 크기 오류');
 const files=new Map();let p=start,localEnd=0;
 for(let i=0;i<count;i++){
  if(u32(p)!==0x02014b50)fail('ZIP 중앙 헤더 오류');
  const n=u16(p+28),extra=u16(p+30),comment=u16(p+32),offset=u32(p+42),size=u32(p+24),name=text(p+46,n);
  if(files.has(name)||! /^[\w./-]+$/.test(name)||name.includes('..'))fail('중복/잘못된 항목: '+name);
  if(offset!==localEnd||u32(offset)!==0x04034b50||u16(p+10)!==0||u16(offset+8)!==0||u16(p+8)!==0||u16(offset+6)!==0)fail('ZIP STORE/헤더 불일치: '+name);
  const ln=u16(offset+26),le=u16(offset+28),data=offset+30+ln+le;
  if(text(offset+30,ln)!==name||u32(p+20)!==size||u32(offset+18)!==size||u32(offset+22)!==size||data+size>start)fail('ZIP 길이/이름 불일치: '+name);
  need(data,size);const bytes=b.subarray(data,data+size),crc=P.crc(bytes);
  if(crc!==u32(p+16)||crc!==u32(offset+14))fail('CRC 불일치: '+name);
  if(i===0&&(name!=='mimetype'||le!==0))fail('첫 항목은 extra 없는 비압축 mimetype이어야 합니다');
  files.set(name,bytes);localEnd=data+size;p+=46+n+extra+comment;
 }
 if(p!==end||localEnd!==start)fail('ZIP 디렉터리/데이터 경계 오류');
 const read=name=>{if(!files.has(name))fail('필수 항목 누락: '+name);return Z.utf8BytesToString(files.get(name));};
 if(read('mimetype')!==MIME)fail('mimetype 값 오류');
 const container=read('META-INF/container.xml');if(!container.includes('urn:oasis:names:tc:opendocument:xmlns:container')||! /full-path="designmap.xml"/.test(container))fail('container rootfile 오류');
 const map=read('designmap.xml');
 if(! /<\?aid\s[^?]*\bstyle="50"[^?]*\?>/.test(map)||! /<\?aid\s[^?]*\btype="document"[^?]*\?>/.test(map)||! /<\?aid\s[^?]*\breaderVersion="[\d.]+"[^?]*\?>/.test(map))fail('designmap.xml aid 식별 선언 누락/오류');
 if(! /<Document\b[^>]*\bDOMVersion="[\d.]+"/.test(map))fail('designmap.xml Document/DOMVersion 오류');
 if(map.indexOf('<?aid')>map.indexOf('<Document')||! /<\?aid\s[^?]*\bfeatureSet="\d+"[^?]*\?>/.test(map))fail('designmap.xml aid 위치/featureSet 오류');
 for(const [name,bytes] of files){if(!name.endsWith('.xml'))continue;const xml=Z.utf8BytesToString(bytes);
  for(const match of xml.matchAll(/\bsrc="([^"]+)"/g))if(!files.has(match[1]))fail(name+' 참조 누락: '+match[1]);
 }
 for(const name of ['Resources/Styles.xml','Resources/Fonts.xml','Resources/Graphic.xml'])read(name);
 for(const prefix of ['Spreads/','Stories/'])if(![...files.keys()].some(n=>n.startsWith(prefix)))fail(prefix+' 항목 누락');
 return {entries:count,bytes:b.length,crc32:P.crc(b).toString(16),aid:map.match(/<\?aid\s[^?]*\?>/)[0]};
}
async function open(bytes,{fs,format,app,guard=()=>{},progress=()=>{}}){
 progress('registered.package.validate');const report=validate(bytes);guard();
 const folder=await fs.getTemporaryFolder(),file=await folder.createFile('registered-'+Date.now()+'-'+Math.random().toString(36).slice(2)+'.idml');
 progress('registered.package.write');await file.write(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),{format});guard();
 progress('registered.package.readback');const saved=new Uint8Array(await file.read({format}));guard();
 if(saved.length!==bytes.length||saved.some((b,i)=>b!==bytes[i]))throw new Error('IDML_WRITE_MISMATCH: 저장 후 바이트 불일치 · '+file.nativePath);
 validate(saved);progress('registered.package.open');
 try{return await app.open(file.nativePath,true);}catch(error){throw new Error('IDML_HOST_OPEN_FAILED: 패키지/저장 바이트 검사 통과 ('+report.entries+'개, '+report.bytes+' bytes, CRC '+report.crc32+') · '+file.nativePath+' · '+error.message);}
}
module.exports={MIME,LEGACY_AID,designmap,validate,open};
