'use strict';
const M=require('./design-model');
const withoutLanguage=o=>Object.fromEntries(Object.entries(o||{}).filter(([k])=>k!=='AppliedLanguage'));
function kind(c){if(/[\uac00-\ud7af\u1100-\u11ff\u3130-\u318f]/u.test(c))return 'hangul';if(/[A-Za-z]/u.test(c))return 'latin';if(/[0-9]/u.test(c))return 'number';if(/\s/u.test(c))return 'space';if(/\p{P}|\p{S}/u.test(c))return 'punctuation';if(/\p{Script=Han}/u.test(c))return 'han';return 'other';}
function policy(story){
 const runs=story?.paragraphs.flatMap(p=>p.runs)||[],first=runs[0];
 const fail=()=>{const paths=[...new Set(runs.flatMap(r=>M.compare(first?.resolvedProperties||{},r.resolvedProperties||{}).differences.map(d=>d.path)))];throw new Error('UNSUPPORTED 혼합 Typography: 원본 스타일/언어 패턴을 안전하게 대응할 수 없습니다.'+(paths.length?' 실제 속성 차이: '+paths.join(', '):' 문단/문자 스타일·특수 콘텐츠 구조 확인 필요'));};
 if(!first||runs.some(r=>r.tokens.some(t=>!['Content','Br'].includes(t.type)||t.contentTree)))return fail();
 if(story.paragraphs.some(p=>p.styleRef!==story.paragraphs[0].styleRef||!M.compare(p.properties,story.paragraphs[0].properties).equal))return fail();
 // Different explicit/inherited representations are safe only when every changed
 // key is resolved, effective values match, and named style identity is unchanged.
 const uniform=runs.every(r=>r.styleRef===first.styleRef&&M.compare(r.resolvedProperties,first.resolvedProperties).equal&&M.compare(r.properties,first.properties).differences.every(d=>{const key=d.path.slice(2);return Object.prototype.hasOwnProperty.call(first.resolvedProperties,key)&&Object.prototype.hasOwnProperty.call(r.resolvedProperties,key);}));
 if(uniform)return {mode:'uniform'};
 // A single enlarged initial has a semantic destination: the new first letter.
 // Other visual emphasis and ambiguous language patterns remain unsupported.
 const base=runs[1],initialText=first.tokens.map(t=>t.type==='Br'?'\r':t.text).join('');
 const omitSize=o=>Object.fromEntries(Object.entries(o||{}).filter(([k])=>k!=='PointSize'));
 if(base&&story.paragraphs.length===1&&initialText.length===1&&['hangul','latin','han'].includes(kind(initialText))&&first.resolvedProperties.PointSize>base.resolvedProperties.PointSize&&
  runs.every(r=>r.styleRef===base.styleRef&&M.compare(omitSize(r.resolvedProperties),omitSize(base.resolvedProperties)).equal&&M.compare(omitSize(r.properties),omitSize(base.properties)).equal)&&
  runs.slice(1).every(r=>M.compare(r.resolvedProperties,base.resolvedProperties).equal&&M.compare(r.properties,base.properties).equal))
  return {mode:'enlarged-story-initial',baseIndex:1,initialSize:first.resolvedProperties.PointSize};
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
