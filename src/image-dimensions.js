'use strict';
// Header-only metadata. JPEG with EXIF is unknown until orientation is resolved;
// never silently swap or guess dimensions. Malformed/unsupported data is harmless.
function dimensions(bytes){
 try{
  const a=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes),v=new DataView(a.buffer,a.byteOffset,a.byteLength);
  const result=(width,height)=>width>0&&height>0?{width,height,dimensionSource:'file-header'}:{};
  if(a.length>=24&&[137,80,78,71,13,10,26,10].every((n,i)=>a[i]===n)&&v.getUint32(8)===13&&v.getUint32(12)===0x49484452)return result(v.getUint32(16),v.getUint32(20));
  if(a[0]!==255||a[1]!==216)return {};
  let p=2,found=null,exif=false;
  while(p+4<=a.length){if(a[p++]!==255)return {};while(a[p]===255)p++;const marker=a[p++];if(marker===0xda||marker===0xd9)break;
   if(marker===1||marker>=0xd0&&marker<=0xd7)continue;
   const len=v.getUint16(p);if(len<2||p+len>a.length)return {};
   if(marker===0xe1&&len>=8&&v.getUint32(p+2)===0x45786966)exif=true;
   if([0xc0,0xc1,0xc2].includes(marker)&&len>=8)found=result(v.getUint16(p+5),v.getUint16(p+3));p+=len;
  }
  return exif?{}:found||{};
 }catch(e){return {};}
}
module.exports={dimensions};
