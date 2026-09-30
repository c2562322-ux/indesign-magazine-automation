'use strict';
// Identity reads are best-effort diagnostics only; operation failures stay fatal.
function safe(fn){try{return fn();}catch(e){return '<unavailable>';}}
function identity(o){return {type:safe(()=>o&&o.constructor&&o.constructor.name),id:safe(()=>o&&o.id),name:safe(()=>o&&o.name),sourceId:safe(()=>o&&typeof o.extractLabel==='function'?o.extractLabel('MagazineStudioSourceRef'):null)};}
function run(progress,operation,object,property,attemptedValue,action,{before=true,owner}={}){
 const detail={operation,object:identity(object),owner:owner&&identity(owner),pageId:safe(()=>owner&&owner.parentPage?identity(owner.parentPage):object&&object.parentPage?identity(object.parentPage):null),property,attemptedValue};
 const label=operation+' '+JSON.stringify(detail);
 if(before)progress(label+'.start');
 try{const result=action();if(before)progress(operation+'.success');return result;}
 catch(error){const message='REGISTERED_DOM_FAILED '+label+' · '+error.message;progress(message);const failure=new Error(message);failure.cause=error;throw failure;}
}
function reader(progress,owner){return (object,key)=>run(progress,'registered.snapshot.read',object,key,undefined,()=>object&&object[key],{before:false,owner});}
module.exports={identity,run,reader};
