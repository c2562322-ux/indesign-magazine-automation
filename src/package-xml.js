(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./docxZip'));else root.MagazinePackage=factory(root.MagazineZip);})(typeof window!=='undefined'?window:this,function(Z){
'use strict';
function utf8(text){const out=[];for(const c of text){const n=c.codePointAt(0);if(n<128)out.push(n);else if(n<2048)out.push(192|n>>6,128|n&63);else if(n<65536)out.push(224|n>>12,128|n>>6&63,128|n&63);else out.push(240|n>>18,128|n>>12&63,128|n>>6&63,128|n&63);}return new Uint8Array(out);}
function crc(bytes){let n=0xffffffff;for(const b of bytes){n^=b;for(let i=0;i<8;i++)n=(n>>>1)^((n&1)?0xedb88320:0);}return (n^0xffffffff)>>>0;}
function zip(entries){const parts=[],central=[];let offset=0,total=0;const seen=new Set();
 for(const [name,input] of entries){if(seen.has(name)||! /^[\w./-]+$/.test(name)||name.includes('..'))throw new Error('Invalid package entry');seen.add(name);const n=utf8(name),data=typeof input==='string'?utf8(input):new Uint8Array(input);total+=data.length;if(total>64*1024*1024)throw new Error('Package limit 64MB');const local=new Uint8Array(30+n.length),v=new DataView(local.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint32(14,crc(data),true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,n.length,true);local.set(n,30);parts.push(local,data);
 const c=new Uint8Array(46+n.length),w=new DataView(c.buffer);w.setUint32(0,0x02014b50,true);w.setUint16(4,20,true);w.setUint16(6,20,true);w.setUint32(16,crc(data),true);w.setUint32(20,data.length,true);w.setUint32(24,data.length,true);w.setUint16(28,n.length,true);w.setUint32(42,offset,true);c.set(n,46);central.push(c);offset+=local.length+data.length;}
 const end=new Uint8Array(22),v=new DataView(end.buffer),size=central.reduce((n,c)=>n+c.length,0);v.setUint32(0,0x06054b50,true);v.setUint16(8,entries.length,true);v.setUint16(10,entries.length,true);v.setUint32(12,size,true);v.setUint32(16,offset,true);const out=new Uint8Array(offset+size+22);let p=0;for(const chunk of [...parts,...central,end]){out.set(chunk,p);p+=chunk.length;}return out;
}
const escape=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/\r/g,'&#13;');
function serialize(tree){const uris=new Map();function name(n){const m=n.match(/^\{([^}]+)\}(.*)$/);if(!m)return n;if(!uris.has(m[1]))uris.set(m[1],m[1]==='http://www.w3.org/XML/1998/namespace'?'xml':m[1]==='http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging'?'idPkg':'ns'+uris.size);return uris.get(m[1])+':'+m[2];}
 function collect(n){if(n.tag==='#pi'||n.tag==='#comment')return;name(n.tag);Object.keys(n.attributes||{}).forEach(name);(n.children||[]).forEach(collect);}collect(tree);
 function node(n,isRoot){
 if(n.tag==='#pi'){if(!/^[A-Za-z_][\w.:-]*$/.test(n.target)||/^xml$/i.test(n.target)||/\?>/.test(n.data||''))throw new Error('Invalid processing instruction');return '<?'+n.target+(n.data?' '+n.data:'')+'?>'+escape(n.tail||'');}
 if(n.tag==='#comment'){if(/--/.test(n.text||'')||/-$/.test(n.text||''))throw new Error('Invalid XML comment');return '<!--'+(n.text||'')+'-->'+escape(n.tail||'');}
 const attrs=Object.entries(n.attributes||{}).map(([k,v])=>' '+name(k)+'="'+escape(v).replace(/\n/g,'&#10;').replace(/\t/g,'&#9;')+'"').join(''),ns=isRoot?[...uris].filter(([,p])=>p!=='xml').map(([u,p])=>' xmlns:'+p+'="'+escape(u)+'"').join(''):'';return '<'+name(n.tag)+attrs+ns+'>'+escape(n.text||'')+(n.children||[]).map(c=>node(c,false)).join('')+'</'+name(n.tag)+'>'+escape(n.tail||'');}return '<?xml version="1.0" encoding="UTF-8"?>'+(tree.beforeRoot||[]).map(n=>node(n,false)).join('')+node(tree,true)+(tree.afterRoot||[]).map(n=>node(n,false)).join('');
}
return {utf8,crc,zip,serialize,escape};
});
