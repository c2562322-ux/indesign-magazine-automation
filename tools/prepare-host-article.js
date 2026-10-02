'use strict';
// Host fixtures must be regenerated from the chosen DOCX, not a prior private payload.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),Media=require('../src/docx-media'),Layout=require('../src/layout-engine');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function prepare(bytes,sourcePath,writeImage){
 const result=Media.extract(bytes),sourceSha256=sha(bytes);
 for(const [i,image] of result.article.images.entries()){
  image.contentSha256=sha(Buffer.from(image.bytes));
  image.path=writeImage(image.bytes,i,image.originalName,sourceSha256);image.extractedPathOrHandle=image.path;delete image.bytes;
 }
 // studio-ui inputArticle/read use this same normalization boundary.
 result.article=Layout.article(result.article);
 return {...result,sourcePath,sourceSha256,inputEvidence:{normalization:'layout-engine.article',title:result.article.title,subtitleCharacters:Array.from(result.article.subtitle).length,bodyCharacters:Array.from(result.article.body).length,bodySha256:sha(Buffer.from(result.article.body,'utf8')),images:result.article.images.map(im=>({widthPx:im.widthPx,heightPx:im.heightPx,contentSha256:im.contentSha256}))}};
}
function write(source,output){
 const root=path.resolve(__dirname,'../assets/templates/working'),target=path.resolve(output);
 if(path.dirname(target)!==root||!target.endsWith('.private.json'))throw new Error('Host payload must be a .private.json inside assets/templates/working');
 const original=path.resolve(source);if(path.extname(original).toLowerCase()!=='.docx')throw new Error('DOCX source required');
 fs.mkdirSync(root,{recursive:true});const stem=path.basename(target,'.private.json');
 const result=prepare(fs.readFileSync(original),original,(bytes,i,name,hash)=>{const file=path.join(root,stem+'-'+hash.slice(0,12)+'-'+i+path.extname(name));fs.writeFileSync(file,Buffer.from(bytes));return file.replace(/\\/g,'/');});
 fs.writeFileSync(target,JSON.stringify(result,null,2));return result;
}
if(require.main===module){const [source,output]=process.argv.slice(2);if(!source||!output)throw new Error('Usage: prepare-host-article.js source.docx assets/templates/working/name.private.json');const r=write(source,output);console.log(JSON.stringify({sourcePath:r.sourcePath,sourceSha256:r.sourceSha256,inputEvidence:r.inputEvidence}));}
module.exports={prepare,write};
