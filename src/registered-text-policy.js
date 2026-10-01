'use strict';
const M=require('./design-model');
const withoutLanguage=o=>Object.fromEntries(Object.entries(o||{}).filter(([k])=>k!=='AppliedLanguage'));
function kind(c){if(/[\uac00-\ud7af\u1100-\u11ff\u3130-\u318f]/u.test(c))return 'hangul';if(/[A-Za-z]/u.test(c))return 'latin';if(/[0-9]/u.test(c))return 'number';if(/\s/u.test(c))return 'space';if(/\p{P}|\p{S}/u.test(c))return 'punctuation';if(/\p{Script=Han}/u.test(c))return 'han';return 'other';}
function policy(story){
 const runs=story?.paragraphs.flatMap(p=>p.runs)||[],first=runs[0];
 const fail=()=>{throw new Error('UNSUPPORTED 혼합 Typography: 원본 스타일/언어 패턴을 안전하게 대응할 수 없습니다.');};
 if(!first||runs.some(r=>r.tokens.some(t=>!['Content','Br'].includes(t.type)||t.contentTree)))return fail();
 if(story.paragraphs.some(p=>p.styleRef!==story.paragraphs[0].styleRef||!M.compare(p.properties,story.paragraphs[0].properties).equal))return fail();
 const uniform=runs.every(r=>r.styleRef===first.styleRef&&M.compare(r.properties,first.properties).equal&&M.compare(r.resolvedProperties,first.resolvedProperties).equal);
 if(uniform)return {mode:'uniform'};
 if(runs.some(r=>r.styleRef!==first.styleRef||!M.compare(withoutLanguage(r.properties),withoutLanguage(first.properties)).equal||!M.compare(withoutLanguage(r.resolvedProperties),withoutLanguage(first.resolvedProperties)).equal))return fail();
 const classes={},samples={};let offset=0;
 for(const r of runs){const language=r.resolvedProperties.AppliedLanguage;if(typeof language!=='string')return fail();const text=r.tokens.map(t=>t.type==='Br'?'\r':t.text).join('');
  for(const c of text){if(c.length!==1)return fail();const k=kind(c);if(classes[k]&&classes[k]!==language)return fail();classes[k]=language;if(samples[language]===undefined)samples[language]=offset;offset++;}
 }
 return {mode:'language-by-source-character-class',classes,samples};
}
function assignments(p,text){return Array.from(text,c=>{const language=p.classes[kind(c)];if(c.length!==1||!language)throw new Error('UNSUPPORTED 원고 문자 종류의 원본 언어 패턴 없음: '+kind(c));return language;});}
function capture(story,p){return Object.fromEntries(Object.entries(p.samples).map(([language,index])=>{const char=story.characters.item(index);if(char.appliedLanguage==null)throw new Error('원본 언어 readback 실패');return [language,char.appliedLanguage];}));}
function apply(story,plan,values){for(let start=0;start<plan.length;){let end=start+1;while(end<plan.length&&plan[end]===plan[start])end++;story.characters.itemByRange(start,end-1).appliedLanguage=values[plan[start]];start=end;}}
module.exports={policy,assignments,capture,apply,withoutLanguage,kind};
