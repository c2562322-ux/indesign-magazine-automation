// Manual browser QA only. No Adobe API, document or output file is written.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
http.createServer((req,res)=>{
 const url=req.url.split('?')[0];
 if(url==='/ux-test.html'){
  const html=fs.readFileSync(path.join(root,'preview.html'),'utf8').replace('src="preview.js"','src="tests/ux-browser.js"').replace('<div id="studioPanel">','<div style="padding:12px;background:#fff1bf;color:#222">브라우저 모의 검증 — 실제 InDesign/저장/폰트가 아닙니다. <label><input id="simOverflow" type="checkbox" checked>검사 오류 재현</label><label><input id="simFail" type="checkbox">다음 제작 작업 실패</label><span id="simCounts"></span></div><div id="studioPanel">');
  res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(html);
 }
 if(!/^\/(preview\.html|preview\.js|studio\.css|src\/[a-z0-9-]+\.js|designs\/[a-z0-9-]+\.json|tests\/ux-browser\.js)$/.test(url)){res.writeHead(404);return res.end();}
 fs.readFile(path.join(root,url),(e,b)=>{if(e){res.writeHead(404);return res.end();}res.setHeader('Content-Type',url.endsWith('.js')?'text/javascript':url.endsWith('.css')?'text/css':url.endsWith('.json')?'application/json':'text/html');res.end(b);});
}).listen(8766,'127.0.0.1',()=>console.log('Preview: http://127.0.0.1:8766/preview.html | Mock UI: http://127.0.0.1:8766/ux-test.html'));
