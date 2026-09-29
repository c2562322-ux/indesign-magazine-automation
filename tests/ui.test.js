'use strict';
// Minimal DOM double for controller state/event tests, not a real browser rendering test.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const Studio=require('../src/studio-ui');
class Element{
 constructor(id=''){this.id=id;this.value='';this.children=[];this.style={display:''};this.className='';this.disabled=false;this.listeners={};this.clientWidth=440;this._text='';}
 set textContent(v){this._text=String(v);this.children=[];}get textContent(){return this._text;}
 appendChild(e){this.children.push(e);return e;}setAttribute(){}
 addEventListener(t,f){this.listeners[t]=f;}click(){if(!this.disabled&&this.listeners.click)this.listeners.click();}
}
function setup(native=false){
 const html=fs.readFileSync('index.html','utf8'),elements={};for(const m of html.matchAll(/id="([^"]+)"/g))elements[m[1]]=new Element(m[1]);
 elements.aiModel.value='gpt-4.1-mini';elements.settingsPanel.style.display='none';elements.aiPanel.style.display='none';
 global.document={getElementById:id=>elements[id],querySelectorAll:()=>Object.values(elements),createElement:()=>new Element()};
 const saved=[],calls=[];
 const report={pageCount:1,errors:[],warnings:[]};
 const app=Studio.mount({native,load:async()=>null,image:async()=>({path:'p.jpg',name:'사진',preview:''}),fonts:async()=>[],saveProject:async obj=>{saved.push(obj);return true;},create:async()=>{calls.push('create');return report;},check:()=>report,saveIndd:()=>report,exportPdf:()=>report});
 return {app,e:elements,saved,calls};
}
const tick=()=>new Promise(r=>setImmediate(r));
test('all static controller IDs exist once in both HTML entrypoints',()=>{
 const code=fs.readFileSync('src/studio-ui.js','utf8'),required=new Set([...code.matchAll(/\$\('([^']+)'\)/g)].map(x=>x[1]));
 for(const file of ['index.html','preview.html']){const ids=[...fs.readFileSync(file,'utf8').matchAll(/id="([^"]+)"/g)].map(x=>x[1]);assert.equal(ids.length,new Set(ids).size);for(const id of required){if(file==='preview.html'&&['modeStudio','legacyPanel'].includes(id))continue;assert.ok(ids.includes(id),file+': '+id);}}
});
test('default browser state shows three plans but native actions stay disabled',()=>{const {e}=setup();assert.equal(e.candidateList.children.length,3);assert.equal(e.btnCreateAuto.disabled,true);assert.equal(e.btnSaveProject.disabled,false);});
test('changing source disables stale plans until regenerated',async()=>{const {e}=setup(true);assert.equal(e.btnCreateAuto.disabled,false);e.autoBody.value+=' 추가 문장';e.autoBody.listeners.input();assert.equal(e.btnCreateAuto.disabled,true);e.btnPrepare.click();await tick();assert.equal(e.btnCreateAuto.disabled,false);});
test('project save excludes API credentials and transient image data',async()=>{const {e,saved}=setup();e.apiKey.value='example-not-a-real-key';e.btnSaveProject.click();await tick();assert.equal(saved.length,1);assert.equal(saved[0].schemaVersion,1);assert.ok(!JSON.stringify(saved[0]).includes('example-not-a-real-key'));});
test('native creation prevents duplicate clicks and stale export',async()=>{const {e,calls}=setup(true);e.btnCreateAuto.click();e.btnCreateAuto.click();await tick();assert.equal(calls.length,1);assert.equal(e.btnExportPdf.disabled,false);e.autoTitle.value='다른 제목';e.autoTitle.listeners.input();assert.equal(e.btnExportPdf.disabled,true);});
test('photo add invalidates previous plan and cannot exceed two',async()=>{const {e,app}=setup(true);e.btnAddImage.click();await tick();assert.equal(app.state.images.length,1);assert.equal(e.btnCreateAuto.disabled,true);e.btnAddImage.click();await tick();e.btnAddImage.click();await tick();assert.equal(app.state.images.length,2);assert.match(e.studioStatus.textContent,/최대 2장/);});
