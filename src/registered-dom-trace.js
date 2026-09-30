'use strict';
// Identity reads are best-effort diagnostics only; operation failures stay fatal.
function safe(fn){try{return fn();}catch(e){return '<unavailable>';}}
function identity(o){return {type:safe(()=>o&&o.constructor&&o.constructor.name),id:safe(()=>o&&o.id),name:safe(()=>o&&o.name),sourceId:safe(()=>o&&typeof o.extractLabel==='function'?o.extractLabel('MagazineStudioSourceRef'):null)};}
function location(object,owner){
 const base=owner||object,page=safe(()=>base&&base.parentPage||((base&&base.constructor&&base.constructor.name)==='Page'?base:null));
 const parent=safe(()=>page&&typeof page==='object'?page.parent:base&&base.parent);
 return {page:page&&typeof page==='object'?identity(page):null,spread:safe(()=>base.constructor.name)==='Spread'?identity(base):parent&&safe(()=>parent.constructor.name)==='Spread'?identity(parent):null};
}
function run(progress,operation,object,property,attemptedValue,action,{before=true,owner}={}){
 const detail={operation,object:identity(object),owner:owner&&identity(owner),...location(object,owner),property,attemptedValue:attemptedValue===undefined?null:attemptedValue};
 const label=operation+' '+JSON.stringify(detail);
 if(before)progress(label+'.start');
 try{const result=action();if(before)progress(operation+'.success');return result;}
 catch(error){
  // Keep the innermost failing getter instead of replacing it with "snapshot".
  if(error.registeredFailure)throw error;
  const message='REGISTERED_DOM_FAILED '+label+' · '+error.message;progress(message);const failure=new Error(message);failure.cause=error;
  failure.registeredFailure={...detail,adobeMessage:String(error.message||error),adobeNumber:Number.isInteger(error.number)?error.number:null};throw failure;
 }
}
function reader(progress,owner){return (object,key)=>run(progress,'registered.snapshot.read',object,key,undefined,()=>object&&object[key],{before:false,owner});}
module.exports={identity,run,reader};
