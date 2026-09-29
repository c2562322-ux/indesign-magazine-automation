(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.MagazineWordText=factory();})(typeof window!=='undefined'?window:this,function(){
    'use strict';
    function decode(text){return text.replace(/&(lt|gt|quot|apos|amp|#x[0-9a-fA-F]+|#\d+);/g,(_,v)=>{const map={lt:'<',gt:'>',quot:'"',apos:"'",amp:'&'};if(map[v])return map[v];const n=v[1]==='x'?parseInt(v.slice(2),16):parseInt(v.slice(1),10);if(n<0||n>0x10ffff||(n>=0xd800&&n<=0xdfff))throw new Error('Word 문자 코드가 유효하지 않습니다.');return String.fromCodePoint(n);});}
    function extract(xml, asParagraphs){
        if(typeof xml!=='string'||xml.length>8000000)throw new Error('Word 원고가 너무 큽니다.');
        if(/<!DOCTYPE|<!ENTITY/i.test(xml))throw new Error('지원하지 않는 XML 선언입니다.');
        if(/<w:(tbl|footnoteReference|endnoteReference|txbxContent|del|ins|fldSimple|instrText)(?=[\s/>])|<m:oMath(?=[\s/>])/.test(xml))throw new Error('표·각주·텍스트상자·변경 추적·필드·수식이 포함된 Word입니다. 본문을 일반 문단으로 정리하거나 직접 붙여넣어주세요.');
        const paragraphs=[];let current='',inP=false,inText=false;
        const tokens=xml.match(/<[^>]*>|[^<]+/g)||[];
        for(const token of tokens){
            if(token[0]!=='<'){if(inP&&inText)current+=decode(token);continue;}
            const m=token.match(/^<\s*(\/?)\s*([\w:.-]+)(?:\s[^>]*)?\/?\s*>$/);
            if(!m)continue;
            const end=!!m[1],name=m[2],self=/\/\s*>$/.test(token);
            if(name==='w:p'){
                if(end){if(inP)paragraphs.push(current);inP=false;inText=false;}
                else{if(inP)throw new Error('Word 문단 중첩을 처리할 수 없습니다.');current='';inP=!self;if(self)paragraphs.push('');}
            }else if(name==='w:t'){inText=!end&&!self;}
            else if(inP&&!end&&(name==='w:br'||name==='w:cr'))current+='\n';
            else if(inP&&!end&&name==='w:tab')current+='\t';
        }
        if(inP)throw new Error('Word 문단이 정상적으로 끝나지 않았습니다.');
        return asParagraphs ? paragraphs : paragraphs.join('\n');
    }
    return {extract,decode};
});
