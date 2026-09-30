(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./docxZip'),require('./word-text'),require('./article-input'),require('./image-dimensions'));else root.MagazineDocxMedia=factory(root.MagazineZip,root.MagazineWordText,root.MagazineInput,root.MagazineImageDimensions);})(typeof window!=='undefined'?window:this,function(Z,W,Input,Image){
'use strict';
function attrs(tag){const out={};for(const m of tag.matchAll(/([\w:.-]+)\s*=\s*(["'])(.*?)\2/g))out[m[1]]=W.decode(m[3]);return out;}
function target(path){if(/^[a-z]+:|^[\\/]|[?#]/i.test(path))throw new Error('DOCX 외부/절대 이미지 경로는 지원하지 않습니다.');const parts=['word'];for(const p of path.split('/')){if(p==='..'){if(parts.length<=1)throw new Error('DOCX 이미지 경로 이탈');parts.pop();}else if(p&&p!=='.')parts.push(p);}const name=parts.join('/');if(!/^word\/media\/[^/]+$/.test(name))throw new Error('본문 media 이미지 경로가 아닙니다.');return name;}
function extract(buffer){
 const xml=Z.utf8BytesToString(Z.readZipEntry(buffer,'word/document.xml'));const paragraphs=W.extract(xml,true);let article=Input.parse('article.docx',buffer);const warnings=[],images=[],relationships=new Map();
 let relXML='';try{relXML=Z.utf8BytesToString(Z.readZipEntry(buffer,'word/_rels/document.xml.rels'));}catch(e){if(/(?:blip|imagedata)\b/.test(xml))throw new Error('Word 이미지 relationship을 찾지 못했습니다.');}
 if(/<!DOCTYPE|<!ENTITY/i.test(relXML))throw new Error('지원하지 않는 relationship XML');
 for(const m of relXML.matchAll(/<(?:\w+:)?Relationship\b[^>]*\/?\s*>/g)){const a=attrs(m[0]);if(relationships.has(a.Id))throw new Error('중복 relationship ID');relationships.set(a.Id,a);}
 // Existing Word parser deliberately rejects complex text. Only conventional
 // main-document DrawingML is supported; no header/footer/media-directory scan.
 let paragraphIndex=-1,documentOrder=0,totalImageBytes=0;const seen=new Map();
 const blocks=[...xml.matchAll(/<w:p(?=[\s/>])[^>]*?(?:\/\s*>|>[\s\S]*?<\/w:p>)/g)];
 const subtitleIndex=blocks.findIndex(m=>/<w:pStyle\b[^>]*w:val=["'](?:Subtitle|부제)["']/.test(m[0]));
 if(subtitleIndex>=0&&!/^\s*\[TITLE\]/m.test(paragraphs.join('\n'))){const first=paragraphs.findIndex(p=>p.trim());if(subtitleIndex>first)article=Input.textArticle('[TITLE]\n'+paragraphs[first]+'\n[SUBTITLE]\n'+paragraphs[subtitleIndex]+'\n[BODY]\n'+paragraphs.slice(first+1).filter((_,i)=>i+first+1!==subtitleIndex).join('\n'));}
 for(const block of blocks){paragraphIndex++;for(const drawing of block[0].matchAll(/<w:drawing\b[^>]*>[\s\S]*?<\/w:drawing>/g)){
  const content=drawing[0];if(/<(?:\w+:)?decorative\b[^>]*val=["']1["']|<wp:anchor\b[^>]*behindDoc=["']1["']/.test(content)){warnings.push('문단 '+(paragraphIndex+1)+': 장식/배경 그림 제외');continue;}
  const blips=[...content.matchAll(/<a:blip\b[^>]*>/g)];if(!blips.length){warnings.push('문단 '+(paragraphIndex+1)+': 그림 이외 drawing 미지원');continue;}
  for(const b of blips){const a=attrs(b[0]),id=a['r:embed'];documentOrder++;if(!id){warnings.push('외부 연결 이미지는 추출하지 않았습니다.');continue;}const rel=relationships.get(id);if(!rel||! /\/image$/.test(rel.Type||''))throw new Error('이미지 relationship 누락/유형 불일치');if(rel.TargetMode==='External'){warnings.push('외부 이미지 제외');continue;}const name=target(rel.Target);const occurrence={documentOrder,paragraphIndex};if(seen.has(name)){seen.get(name).occurrences.push(occurrence);continue;}
   const ext=name.split('.').pop().toLowerCase(),mime={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg'}[ext];if(!mime){warnings.push(name.split('/').pop()+': PNG/JPEG 외 Word 그림은 미지원');continue;}
   const bytes=Z.readZipEntry(buffer,name),size=Image.dimensions(bytes),widthPx=size.width||null,heightPx=size.height||null,ratio=widthPx&&heightPx?widthPx/heightPx:null;
   const image={source:'docx',originalName:name.split('/').pop(),name:name.split('/').pop(),mimeType:mime,widthPx,heightPx,width:widthPx||0,height:heightPx||0,aspectRatio:ratio,orientation:ratio===null?'unknown':Math.abs(ratio-1)<.05?'square':ratio>1?'landscape':'portrait',documentOrder,paragraphIndex,occurrences:[occurrence],bytes};
   totalImageBytes+=bytes.length;if(totalImageBytes>32*1024*1024)throw new Error('Word 이미지 전체 용량 한도 초과 (32MB); 일부만 추출하지 않습니다.');images.push(image);seen.set(name,image);
  }
 }}
 if(/<w:pict\b/.test(xml))warnings.push('VML 그림은 지원하지 않습니다. Word에서 PNG/JPEG 그림으로 다시 삽입해주세요.');
 article.images=images;return {article,warnings};
}
return {extract,target};
});
