'use strict';
// IDML anchors alone are not the bounds of a curved path. Compare the exact
// cubic extrema in page coordinates; do not enlarge the Fidelity tolerance.
function bounds(element,page){
 const paths=element.paths||[];
 if(!paths.some(p=>p.points.some(v=>['LeftDirection','RightDirection'].some(k=>v[k]?.some((n,i)=>n!==v.Anchor[i])))))return element.pageBounds[page.id];
 const [a,b,c,d,x,y]=page.transform,det=a*d-b*c;
 if(!Number.isFinite(det)||det===0)throw new Error('Invalid page transform for curved geometry');
 const m=element.spreadTransform;
 const point=v=>{const sx=m[0]*v[0]+m[2]*v[1]+m[4]-x,sy=m[1]*v[0]+m[3]*v[1]+m[5]-y;return [(d*sx-c*sy)/det-page.bounds[1],(-b*sx+a*sy)/det-page.bounds[0]];};
 const samples=[];
 const at=(v,t)=>{const s=1-t;return s*s*s*v[0]+3*s*s*t*v[1]+3*s*t*t*v[2]+t*t*t*v[3];};
 for(const path of paths){const points=path.points.map(v=>({anchor:point(v.Anchor),left:point(v.LeftDirection),right:point(v.RightDirection)}));samples.push(...points.map(v=>v.anchor));
  for(let i=0;i<points.length-(path.open?1:0);i++){const current=points[i],next=points[(i+1)%points.length],xy=[0,1].map(k=>[current.anchor[k],current.right[k],next.left[k],next.anchor[k]]),roots=[];
   for(const v of xy){const A=3*(-v[0]+3*v[1]-3*v[2]+v[3]),B=2*(3*v[0]-6*v[1]+3*v[2]),C=-3*v[0]+3*v[1];if(Math.abs(A)<1e-12){if(Math.abs(B)>1e-12)roots.push(-C/B);}else{const disc=B*B-4*A*C;if(disc>=0){roots.push((-B+Math.sqrt(disc))/(2*A),(-B-Math.sqrt(disc))/(2*A));}}}
   for(const t of roots.filter(t=>t>0&&t<1))samples.push(xy.map(v=>at(v,t)));
  }
 }
 if(!samples.length)throw new Error('Empty curved path geometry');
 return [Math.min(...samples.map(v=>v[1])),Math.min(...samples.map(v=>v[0])),Math.max(...samples.map(v=>v[1])),Math.max(...samples.map(v=>v[0]))];
}
module.exports={bounds};
