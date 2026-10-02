'use strict';
// Selection is separate from stored legacy/reference libraries. A broken explicit
// selection must fail visibly rather than silently recommend an older design set.
async function loadDefault(pluginFolder,dataFolder,progress=async()=>{}){
 let selection;
 try{selection=await pluginFolder.getEntry('assets/templates/working/active-design-set.private.json');}catch(e){/* Legacy installations have no explicit set selection. */}
 let entry,config;
 if(selection){
  config=JSON.parse(await selection.read());
  if(config.schema!=='magazine-active-design-set/v1'||typeof config.libraryPath!=='string'||!/^assets\/templates\/working\/[^/\\]+\.json$/.test(config.libraryPath)||!config.designSetId||!config.version)throw new Error('활성 디자인 세트 설정 오류');
  entry=await pluginFolder.getEntry(config.libraryPath);
 }else{
  try{entry=await pluginFolder.getEntry('assets/templates/working/active-library.private.json');}
  catch(e){try{entry=await (await dataFolder()).getEntry('registered-library.private.json');}catch(missing){return null;}}
 }
 const start=Date.now(),text=await entry.read();await progress('Library 읽기 완료 · '+(Date.now()-start)+'ms · 파싱 중…');
 const parseStart=Date.now(),data=JSON.parse(text);await progress('Library 파싱 완료 · '+(Date.now()-parseStart)+'ms');
 if(config){
  if(data.schema!=='magazine-registered-library/v1'||!Array.isArray(data.designs))throw new Error('활성 Library 형식 오류');
  const designs=data.designs.filter(d=>d.descriptor.designSet?.id===config.designSetId&&d.descriptor.designSet?.version===config.version&&d.descriptor.designSet?.active!==false);
  if(!designs.length)throw new Error('선택한 최신 디자인 세트가 Library에 없습니다.');
  return {...data,designs};
 }
 return data;
}
module.exports={loadDefault};
