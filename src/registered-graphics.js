'use strict';
const F=require('./registered-fidelity');
const eq=(a,b)=>a===b||a&&typeof a.equals==='function'&&a.equals(b);
const path=s=>decodeURI(String(s||'').replace(/^file:\/*/i,'').replace(/\\/g,'/'));
const nums=s=>String(s).trim().split(/\s+/).map(Number);
function reason(g){
 if(['FillColor','StrokeColor','FillTint','StrokeTint','OverprintFill','OverprintStroke'].some(k=>g.properties[k]!==undefined))return 'UNSUPPORTED graphic paint override';
 if(g.type!=='Image')return 'UNSUPPORTED graphic type: '+g.type;
 if(!/PNG|JPEG|TIFF|Portable Network Graphics/i.test(g.properties.ImageTypeName||''))return 'UNSUPPORTED bitmap format';
 if(!g.properties.GraphicBounds||nums(g.properties.ItemTransform).length!==6||nums(g.properties.ItemTransform).some(n=>!Number.isFinite(n)))return 'UNSUPPORTED graphic geometry';
 for(const k of Object.keys(g.details||{}))if(!['Link','ClippingPathSettings','TextWrapPreference','ImageIOPreference'].includes(k))return 'UNSUPPORTED graphic detail: '+k;
 if(g.details?.ClippingPathSettings?.ClippingType!=='None')return 'UNSUPPORTED active graphic clipping';
 if(g.details?.TextWrapPreference?.TextWrapMode!=='None')return 'UNSUPPORTED graphic text wrap';
 if(g.details?.Link?.StoredState!=='Normal'||!g.details.Link.LinkResourceURI)return 'UNSUPPORTED source link state';
 if(!['$ID/#Links_RGB','$ID/#Links_CMYK','$ID/#Links_Gray'].includes(g.properties.Space))return 'UNSUPPORTED image color space';
 if(g.properties.Profile!=='$ID/None'||g.properties.ImageRenderingIntent!=='UseColorSettings')return 'UNSUPPORTED custom image color management';
 return null;
}
function point(m,[x,y]){return [m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]];}
function inverse(m){const d=m[0]*m[3]-m[1]*m[2];if(!d)throw new Error('Invalid page transform');return [m[3]/d,-m[1]/d,-m[2]/d,m[0]/d,(m[2]*m[5]-m[3]*m[4])/d,(m[1]*m[4]-m[0]*m[5])/d];}
function assets(e,frame,ID){return (e.image||[]).map((source,index)=>{let state='EXTERNAL_ASSET_UNVERIFIED',error=null;try{const link=F.list(frame.allGraphics)[index]?.itemLink,status=link?.status;if(['LINK_MISSING','LINK_INACCESSIBLE'].some(k=>ID.LinkStatus?.[k]!==undefined&&eq(status,ID.LinkStatus[k])))state='EXTERNAL_ASSET_UNAVAILABLE';else if(ID.LinkStatus?.NORMAL!==undefined&&eq(status,ID.LinkStatus.NORMAL))state='AVAILABLE';}catch(e){error=String(e.message);}return {elementId:e.id,graphicIndex:index,source:'template',state,error};});}
function compare(model,e,frame,ID){
 const expected=[],actual=[],graphics=F.list(frame.allGraphics),page=model.pages.find(p=>p.id===e.pageCandidates[0]);
 for(let i=0;i<e.image.length;i++){
  const s=e.image[i],why=reason(s);if(why)throw new Error(why);const g=graphics[i];if(!g)throw new Error('원본 배치 이미지 없음');
  const transform=nums(s.properties.ItemTransform),b=s.properties.GraphicBounds;
  const points=[[b.Left,b.Top],[b.Right,b.Top],[b.Right,b.Bottom],[b.Left,b.Bottom]].map(p=>point(inverse(page.transform),point(e.spreadTransform,point(transform,p))));
  const bounds=[Math.min(...points.map(p=>p[1]))-page.bounds[0],Math.min(...points.map(p=>p[0]))-page.bounds[1],Math.max(...points.map(p=>p[1]))-page.bounds[0],Math.max(...points.map(p=>p[0]))-page.bounds[1]];
  const matrices=g.transformValuesOf(ID.CoordinateSpaces.PARENT_COORDINATES),matrix=matrices.matrixValues?matrices:matrices[0];
  if(!matrix?.matrixValues||!g.itemLink)throw new Error('원본 이미지 transform/link readback 실패');
  const pb=frame.parentPage.bounds,gb=Array.from(g.geometricBounds,Number);
  const color=s.properties.Space.replace('$ID/#Links_','');
  const normalizeSpace=v=>String(v).replace(/^\$ID\/#Links_/,'');
  const linkStatus=g.itemLink.status,unavailable=['LINK_MISSING','LINK_INACCESSIBLE'].some(k=>ID.LinkStatus?.[k]!==undefined&&eq(linkStatus,ID.LinkStatus[k]));
  const resourceState=unavailable?'EXTERNAL_ASSET_UNAVAILABLE':ID.LinkStatus?.NORMAL!==undefined&&eq(linkStatus,ID.LinkStatus.NORMAL)?'AVAILABLE':'EXTERNAL_ASSET_UNVERIFIED';
  expected.push({resourceState:'AVAILABLE',type:'Image',transform,bounds,path:path(s.details.Link.LinkResourceURI),linkNormal:true,clipping:'None',space:color,profile:'None',rendering:'UseColorSettings',visible:s.properties.Visible});
  actual.push({resourceState,type:g.constructor?.name,transform:Array.from(matrix.matrixValues,Number),bounds:[gb[0]-pb[0],gb[1]-pb[1],gb[2]-pb[0],gb[3]-pb[1]],path:path(g.itemLink.filePath),linkNormal:ID.LinkStatus?.NORMAL!==undefined&&eq(g.itemLink.status,ID.LinkStatus.NORMAL),clipping:ID.ClippingPathType?.NONE!==undefined&&eq(g.clippingPath.clippingType,ID.ClippingPathType.NONE)?'None':String(g.clippingPath.clippingType),space:normalizeSpace(g.space),profile:(ID.Profile?.NO_CMS!==undefined&&eq(g.profile,ID.Profile.NO_CMS))||['$ID/None','None'].includes(g.profile)?'None':String(g.profile),rendering:ID.RenderingIntent?.USE_COLOR_SETTINGS!==undefined&&eq(g.imageRenderingIntent,ID.RenderingIntent.USE_COLOR_SETTINGS)?'UseColorSettings':String(g.imageRenderingIntent),visible:g.visible});
 }
 return {expected,actual};
}
module.exports={reason,compare,path,assets};
