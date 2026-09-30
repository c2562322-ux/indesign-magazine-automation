/* Explicit offline report, never an automatic selection or production command. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),Match=require('../src/design-matching');
async function main(){
    const [, ,libraryFile,articleFile,output]=process.argv;
    if(!libraryFile||!articleFile||!output)throw new Error('Usage: node tools/match-designs.js LIBRARY.json ARTICLE.docx OUTPUT.json');
    const manifest=JSON.parse(fs.readFileSync(libraryFile,'utf8'));
    const library=await Match.loadLibrary(manifest,name=>fs.promises.readFile(path.join(path.dirname(libraryFile),name),'utf8'));
    const bytes=fs.readFileSync(articleFile),input=Match.parseArticle(articleFile,path.extname(articleFile).toLowerCase()==='.docx'?bytes:bytes.toString('utf8'));
    const report={articleProfile:input.profile,designProfiles:library.entries.map(e=>e.profile),loadErrors:library.errors,
        ranking:Match.rank(library.entries,input.profile),notice:'Offline estimates only. Font status unknown. No automatic selection or document generation.'};
    fs.writeFileSync(output,JSON.stringify(report,null,2),{flag:'wx'});
    console.log(JSON.stringify({designs:library.entries.length,loadErrors:library.errors.length,candidates:report.ranking.candidates.length,reviewRequired:report.ranking.reviewRequired.length}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
