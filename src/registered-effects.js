'use strict';
// Support only an explicit, numeric object blending opacity. Unknown effect
// nodes/attributes still block; source values are read, never synthesized.
function plan(element){
 const effects=Object.entries(element.details||{}).filter(([key])=>/Transparency|Shadow|Glow|Feather|Bevel|Satin/.test(key));
 if(!effects.length)return null;
 if(effects.length!==1||effects[0][0]!=='TransparencySetting')throw new Error('graphic effect readback 미지원');
 const tree=effects[0][1],children=tree.children||[],blend=children[0];
 if(Object.keys(tree.attributes||{}).length||children.length!==1||blend.tag!=='BlendingSetting'||(blend.children||[]).length||Object.keys(blend.attributes||{}).length!==1||blend.attributes.Opacity===undefined)throw new Error('graphic effect readback 미지원');
 const opacity=Number(blend.attributes.Opacity);
 if(!Number.isFinite(opacity)||opacity<0||opacity>100||String(blend.attributes.Opacity).trim()==='')throw new Error('Invalid source blending opacity');
 return {opacity};
}
function compare(element,frame){const expected=plan(element);return expected?{expected,actual:{opacity:frame.transparencySettings.blendingSettings.opacity}}:null;}
module.exports={plan,compare};
