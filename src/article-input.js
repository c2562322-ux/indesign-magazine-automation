(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory(require('./docxZip.js'),require('./word-text.js'),require('./layout-engine.js'));
 else root.MagazineInput=factory(root.MagazineZip,root.MagazineWordText,root.MagazineLayout);
})(typeof window!=='undefined'?window:this,function(Z,W,L){
 'use strict';
 function textArticle(text){
    const clean=String(text).replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');
    const marker=/^\[\s*(TITLE|POINT_TEXT|SUBTITLE|BODY|HERO_IMAGE|KICKER|AUTHOR)\s*\]$/;
    const lines=clean.split('\n');
    if(!lines.some(x=>marker.test(x.trim()))){const start=lines.findIndex(x=>x.trim());if(start<0)throw new Error('원고가 비어 있습니다.');return L.article({title:lines[start],body:lines.slice(start+1).join('\n')});}
    const map={TITLE:'title',POINT_TEXT:'subtitle',SUBTITLE:'subtitle',BODY:'body',HERO_IMAGE:'heroImage',KICKER:'kicker',AUTHOR:'author'};
    const data={};let field=null,buf=[];const flush=()=>{if(field)data[field]=buf.join('\n').trim();};
    lines.forEach(line=>{const m=line.trim().match(marker);if(m){flush();field=map[m[1]];if(Object.prototype.hasOwnProperty.call(data,field))throw new Error('중복 원고 마커: '+m[1]);buf=[];}else{if(/^\[[A-Z_]+\]$/.test(line.trim()))throw new Error('알 수 없는 원고 마커: '+line.trim());if(field)buf.push(line);else if(line.trim())throw new Error('첫 마커 앞의 원고를 확인해주세요.');}});flush();
    return L.article(data);
 }
 function parse(name,contents){
    const ext=String(name).split('.').pop().toLowerCase();
    if(ext==='docx'){
        const paragraphs=W.extract(Z.utf8BytesToString(Z.readZipEntry(contents,'word/document.xml')),true);
        const plain=paragraphs.join('\n');
        if(/^\[\s*(TITLE|POINT_TEXT|SUBTITLE|BODY|HERO_IMAGE|KICKER|AUTHOR)\s*\]$/m.test(plain))return textArticle(plain);
        const first=paragraphs.findIndex(p=>p.trim());
        if(first<0)throw new Error('Word 원고가 비어 있습니다.');
        return L.article({title:paragraphs[first],body:paragraphs.slice(first+1).join('\n')});
    }
    if(ext==='json')return L.article(JSON.parse(String(contents).replace(/^\uFEFF/,'')));
    if(ext==='txt')return textArticle(contents);
    throw new Error('DOCX, TXT 또는 JSON 파일을 선택해주세요.');
 }
 function resolve(base,path){
    if(!path)return '';
    if(/^(?:[a-z]:[\\/]|\/|\\\\)/i.test(path))return path;
    const p=Math.max(base.lastIndexOf('/'),base.lastIndexOf('\\'));
    if(p<0)throw new Error('사진 상대경로의 기준 폴더가 없습니다. 사진을 다시 선택해주세요.');
    return base.slice(0,p+1)+path;
 }
 return {parse,textArticle,resolve};
});
