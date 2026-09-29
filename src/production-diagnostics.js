/* Shared, path-free production diagnostics. Never log the original error object. */
(function(root,factory){
    if(typeof module==='object'&&module.exports)module.exports=factory();
    else root.MagazineProductionDiagnostics=factory();
})(typeof window!=='undefined'?window:this,function(){
    'use strict';
    function redact(value,secrets){
        let text=String(value==null?'알 수 없는 오류':value);
        (secrets||[]).filter(Boolean).forEach(secret=>{text=text.split(String(secret)).join('[비공개]');});
        return text
            .replace(/\bBearer\s+\S+/gi,'Bearer [비공개]')
            .replace(/\b(?:sk-|ghp_|github_pat_)[A-Za-z0-9_-]+/g,'[비공개 키]')
            .replace(/(?:file:|https?:\/\/|[A-Za-z]:[\\/]|\\\\)[^\r\n]*/gi,'[비공개 경로]')
            .replace(/\/(?:[^\s/]+\/)+[^\r\n]*/g,'[비공개 경로]');
    }
    function failure(stage,error){
        if(error&&error.productionStage)return error;
        const code=error&&Number.isInteger(error.number)?' (Host code '+error.number+')':'';
        const result=new Error('['+stage+'] '+redact(error&&error.message||error)+code);
        result.productionStage=stage;
        return result;
    }
    function step(stage,fn,progress){
        const start=Date.now();
        if(progress)progress(stage);
        try{const result=fn();if(progress)progress(stage+' 완료 '+(Date.now()-start)+'ms');return result;}catch(error){throw failure(stage,error);}
    }
    async function asyncStep(stage,fn,progress){
        const start=Date.now();
        if(progress)progress(stage);
        try{const result=await fn();if(progress)progress(stage+' 완료 '+(Date.now()-start)+'ms');return result;}catch(error){throw failure(stage,error);}
    }
    return {redact,failure,step,asyncStep};
});
