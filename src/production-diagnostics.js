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
    function registeredFailure(error){
        const d=error&&error.registeredFailure;if(!d)return null;
        const val=v=>v===undefined||v===null?'해당 없음 / 미취득':typeof v==='object'?JSON.stringify(v):String(v);
        const object=o=>o?['type='+val(o.type),'id='+val(o.id),'name='+val(o.name),'sourceId='+val(o.sourceId)].join(' · '):'해당 없음 / 미취득';
        return ['실패 operation: '+val(d.operation),'DOM 객체: '+object(d.object),'소유 객체: '+object(d.owner),'페이지: '+object(d.page),'스프레드: '+object(d.spread),'property: '+val(d.property),'attempted value: '+(d.attemptedValue===null?'없음 (읽기 또는 인자 없는 작업)':val(d.attemptedValue)),'Adobe error: '+val(d.adobeMessage),'Adobe code: '+val(d.adobeNumber)].map(line=>redact(line)).join('\n');
    }
    function fidelityRows(report){
        const rows=[],seen=new Map();
        function add(elementId,role,stage,d){
            const path=d.path||'$',expected=d.expected===undefined?'[미취득]':d.expected,actual=d.actual===undefined?'[미취득]':d.actual;
            const values=JSON.stringify([expected,actual]);
            const classification=/SOURCE_UNRESOLVED/.test(values)?'SOURCE_UNRESOLVED':/UNSUPPORTED|readback/.test(values+' '+path)?'READBACK_UNSUPPORTED':/bounds|width|height|geometry/i.test(path)?'GEOMETRY_MISMATCH':/story|thread|previous|next|parent|page|order|reference/i.test(path)?'REFERENCE_MISMATCH':/text$/.test(path)?'TEXT_MISMATCH':/runs|typography|font|leading|tracking|frame\./i.test(path)?'TYPOGRAPHY_MISMATCH':/appearance|graphic|crop|fitting|color|stroke|fill/i.test(path)?'GRAPHIC_MISMATCH':'PROPERTY_MISMATCH';
            const key=JSON.stringify([elementId,path,expected,actual]);if(seen.has(key)){const row=seen.get(key);if(!row.stages.includes(stage))row.stages.push(stage);return;}
            const row={elementId,role,path,expected,actual,classification,blocking:true,stages:[stage]};rows.push(row);seen.set(key,row);
        }
        for(const r of report.fidelity&&report.fidelity.records||[])for(const d of r.comparison&&r.comparison.differences||[])add(r.elementId,r.role,'original',d);
        for(const i of report.issues||[])for(const d of i.differences||[])add(i.elementId,i.role,'recheck',d);
        return rows;
    }
    function fidelityDiagnostic(report,entry,hostFailure,trace=[]){
        const original=entry&&entry.original,descriptor=entry&&entry.descriptor;
        function context(id){const object=original&&(original.elements||[]).find(e=>e.id===id),page=original&&(original.pages||[]).find(p=>p.id===id);
            return {elementId:id||null,sourceId:id||null,objectType:object?object.type:page?'Page':null,page:object?object.pageCandidates:page?[page.id]:null,spread:object?object.spreadId:page?page.spreadId:null};}
        const issues=report&&report.issues||[],fidelityIssues=issues.filter(i=>['GENERATOR_MISMATCH','SOURCE_OVERFLOW','SOURCE_INSPECTION'].includes(i.cause));
        const failure=hostFailure&&hostFailure.registeredFailure;
        const errors=fidelityIssues.map(i=>{let differences=i.differences;if(!differences&&i.detail){try{const parsed=JSON.parse(i.detail);if(Array.isArray(parsed))differences=parsed;}catch(e){/* Preserve the unparsed detail in rawIssue. */}}
            return {...context(i.elementId),role:i.role||null,differences:differences||[],failureOperation:i.failureOperation||null,property:i.property||null,adobeError:i.adobeError||null,adobeErrorCode:i.adobeErrorCode===undefined?null:i.adobeErrorCode,rawIssue:i};});
        if(failure)errors.push({...context(failure.object&&failure.object.sourceId),objectType:failure.object&&failure.object.type,page:failure.page,spread:failure.spread,role:null,differences:[],failureOperation:failure.operation,property:failure.property,attemptedValue:failure.attemptedValue,adobeError:failure.adobeMessage,adobeErrorCode:failure.adobeNumber,rawFailure:failure});
        return {schema:'magazine-fidelity-diagnostic/v1',createdAt:new Date().toISOString(),privacy:'Contains original text, file paths and private diagnostic values. Share only with the intended reviewer.',
            encoding:'Undefined and non-finite numbers use __diagnosticType tagged objects; null is not a missing-value substitute.',
            selectedDesign:descriptor?{id:descriptor.id,name:descriptor.name,pageIds:descriptor.pageIds,sourceSha256:original.metadata.sourceSha256}:null,
            fidelityErrorCount:errors.length,reportedErrorCount:report&&report.errors?report.errors.length:hostFailure?1:0,
            differenceSummary:fidelityRows(report||{}).reduce((groups,row)=>{const property=row.path.replace(/\.runs\.\d+/g,'.runs.*'),key=row.classification+' '+property;groups[key]=(groups[key]||0)+1;return groups;},{}),
            contentOverflowCount:issues.filter(i=>i.cause==='CONTENT_OVERFLOW').length,errors,
            comparisons:(report&&report.fidelity&&report.fidelity.records||[]).map(r=>({...context(r.elementId),role:r.role||null,original:r.original,generated:r.generated,comparison:r.comparison,readbackFailure:r.readbackFailure||null})),
            rawReport:report||null,hostFailure:hostFailure?{message:hostFailure.message,registeredFailure:failure||null}:null,trace};
    }
    function diagnosticJSON(data){return JSON.stringify(data,(key,value)=>value===undefined?{__diagnosticType:'undefined'}:typeof value==='number'&&!Number.isFinite(value)?{__diagnosticType:String(value)}:value,2);}
    return {redact,failure,step,asyncStep,registeredFailure,fidelityRows,fidelityDiagnostic,diagnosticJSON};
});
