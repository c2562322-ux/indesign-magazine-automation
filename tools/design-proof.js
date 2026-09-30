/* Offline proof projection. Both browser and UXP consume the exact exported plan. */
'use strict';
const fs=require('node:fs');
const Model=require('../src/design-model.js');
if(process.argv.length!==5){console.error('Usage: node tools/design-proof.js MODEL.json FRAME_ID OUTPUT_PREFIX');process.exitCode=1;}
else{
    const [, ,source,id,prefix]=process.argv;
    const plan=Model.textProof(JSON.parse(fs.readFileSync(source,'utf8')),id,{acknowledgeApproximation:true});
    // Exclusive files: never overwrite previous proof/source.
    fs.writeFileSync(prefix+'.json',JSON.stringify(plan,null,2),{flag:'wx'});
    fs.writeFileSync(prefix+'.html',Model.previewHTML(plan),{flag:'wx'});
    console.log('Text-property proof written. Read omitted list before Host reproduction.');
}
