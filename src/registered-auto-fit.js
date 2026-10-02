'use strict';
// A narrow content contract, never a source Fidelity normalization.
const records=new WeakMap();
const POLICY=Object.freeze({body:Object.freeze([.98,.96,.94,.92,.90]),subtitle:Object.freeze([.98,.96])});
const clone=x=>JSON.parse(JSON.stringify(x));
function expected(source,ratio){const value=clone(source);for(const key of ['PointSize','Leading'])if(typeof value.typography[key]==='number')value.typography[key]*=ratio;for(const key of ['pointSize','leading'])if(typeof value.overrides[key]==='number')value.overrides[key]*=ratio;return value;}
function snapshot(c,read,value){const s=c.frame.parentStory,result=[];for(let i=0;i<s.characters.length;i++){const char=s.characters.item(i);result.push({typography:read(char),paragraphStyle:value(char.appliedParagraphStyle),characterStyle:value(char.appliedCharacterStyle),overrides:Object.fromEntries(Object.keys(c.overrides||{}).map(k=>[k,value(char[k])]))});}return result;}
function run(context,{read,value,compare,bounds,guard,progress}){
 context.autoFit={policy:'bounded-relative/v1',tracking:'unchanged',groups:[]};
 for(const role of ['body','subtitle']){
  const group=context.contentChecks.filter(c=>c.role===role&&c.typography);if(!group.some(c=>c.frame.parentStory.overflows))continue;
  if(group.some(c=>!['uniform','enlarged-story-initial','language-by-source-character-class'].includes(c.textPolicy?.mode)))throw new Error('UNSUPPORTED Auto-fit typography relationship: '+role);
  const sources=group.map(c=>snapshot(c,read,value));
  if(sources.some(chars=>!chars.length||chars.some(c=>!Number.isFinite(c.typography.PointSize)||c.typography.PointSize<=0||!(c.typography.Leading==='Auto'||Number.isFinite(c.typography.Leading)&&c.typography.Leading>0))))throw new Error('UNSUPPORTED Auto-fit font size/leading readback: '+role);
  const result={role,steps:[],ratio:1,success:false,stories:group.map((c,i)=>({elementId:c.elementId,characters:Array.from(c.text).length,sourceTypography:sources[i].map(s=>s.typography)}))};context.autoFit.groups.push(result);
  for(const ratio of POLICY[role]){
   guard();for(let j=0;j<group.length;j++){const c=group[j],story=c.frame.parentStory;if(String(story.contents)!==c.text||story.characters.length!==sources[j].length)throw new Error('Auto-fit text/character count changed: '+role);for(let i=0;i<sources[j].length;i++){const char=story.characters.item(i),type=sources[j][i].typography;char.pointSize=type.PointSize*ratio;if(typeof type.Leading==='number')char.leading=type.Leading*ratio;}}
   context.doc.recompose();const step={ratio,stories:group.map(c=>({elementId:c.elementId,overflows:c.frame.parentStory.overflows}))};result.steps.push(step);result.ratio=ratio;
   for(let j=0;j<group.length;j++){const c=group[j];if(String(c.frame.parentStory.contents)!==c.text||!compare(c.bounds,bounds(c.frame)).equal)throw new Error('Auto-fit content/geometry changed: '+role);for(let i=0;i<sources[j].length;i++){const char=c.frame.parentStory.characters.item(i),type=sources[j][i].typography;if(Math.abs(char.pointSize-type.PointSize*ratio)>.0001||typeof type.Leading==='number'&&Math.abs(char.leading-type.Leading*ratio)>.0001)throw new Error('Auto-fit size/leading readback mismatch: '+role);}c.autoFit={policy:'bounded-relative/v1',ratio,sourceTypography:c.typography,sourceInitial:c.initial||null};records.set(c.autoFit,{ratio,source:sources[j],expected:sources[j].map(s=>expected(s,ratio))});}
   progress('registered.content.autoFit.step '+JSON.stringify({role,...step}));if(step.stories.every(s=>!s.overflows)){result.success=true;break;}
  }
  result.stories.forEach(s=>{s.adjustedSizeLeading=[...new Map(s.sourceTypography.map(t=>{const x={pointSize:t.PointSize*result.ratio,leading:typeof t.Leading==='number'?t.Leading*result.ratio:t.Leading};return [JSON.stringify(x),x];})).values()];});
  context.contentWarnings.push(role+' 제한적 Auto-fit '+Math.round(result.ratio*100)+'% · '+(result.success?'넘침 해소':'안전 한계에서도 넘침 유지'));
 }
}
function check(c,read,value,compare){const record=records.get(c.autoFit);if(!record||c.autoFit?.ratio!==record.ratio||!POLICY[c.role]?.includes(record.ratio))return {equal:false,differences:[{path:'$.autoFit',expected:'authenticated bounded adjustment',actual:c.autoFit}]};return compare(record.expected,snapshot(c,read,value));}
module.exports={POLICY,expected,run,check};
