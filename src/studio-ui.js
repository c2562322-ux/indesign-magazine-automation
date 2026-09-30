(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./layout-engine.js'),require('./ai-layout.js'),require('./production-diagnostics.js'));else root.MagazineStudio=factory(root.MagazineLayout,root.MagazineAI,root.MagazineProductionDiagnostics);})(typeof window!=='undefined'?window:this,function(L,AI,D){
 'use strict';
 let mounted=null;
 const SAMPLE={title:'도시를 읽는\n또 하나의 방법',subtitle:'빠르게 지나쳤던 골목에서 발견하는\n우리 동네의 새로운 표정',kicker:'LIFE & CULTURE',author:'편집실',images:[],body:'도시를 이해하는 가장 좋은 방법은 잠시 속도를 늦추는 일이다. 매일 같은 길을 걷더라도 익숙한 풍경을 다르게 바라보면 전에는 보이지 않던 이야기가 드러난다. 오래된 간판의 글씨, 작은 가게의 진열장, 낮은 담장 너머의 나무가 그 시작이 될 수 있다.\n\n골목에는 사람들이 살아온 시간이 겹겹이 쌓여 있다. 새로운 카페 옆에서 수십 년째 문을 여는 수선집은 서로 다른 속도로 동네의 하루를 만든다. 변화를 살펴보는 일은 오래된 것을 지키는 이유와 새로움을 받아들이는 방법을 함께 생각하게 한다.\n\n산책의 목적지를 미리 정하지 않아도 좋다. 평소 버스를 타고 지나던 구간을 걸어보거나 익숙한 교차로에서 반대편으로 방향을 바꾸는 것만으로도 충분하다. 다만 가게와 주택이 이어지는 길에서는 생활하는 사람들의 공간을 존중하며 천천히 머무는 태도가 필요하다.\n\n같은 장소를 다른 시간에 찾는 것도 한 가지 방법이다. 아침에는 문을 여는 사람들의 움직임이, 오후에는 창문에 비치는 빛이, 저녁에는 하루를 마무리하는 소리가 눈에 들어온다. 한 번의 방문으로는 알 수 없었던 표정들이 조금씩 모여 동네에 대한 이해를 넓힌다.\n\n돌아오는 길에는 인상 깊었던 장면 하나를 메모해보자. 사진 한 장이나 짧은 문장이면 된다. 기록은 멋진 장소를 모으기 위한 목록이 아니라 우리가 무엇에 관심을 기울였는지 돌아보는 작은 단서가 된다. 도시의 이야기는 그렇게 각자의 걸음 속에서 새롭게 이어진다.'};
 function mount(adapter){
    const doc=document,root=doc.getElementById('studioPanel');
    if(!root)throw new Error('DOM ready: studioPanel이 없습니다.');
    if(mounted&&mounted.root===root&&!mounted.disposed)return mounted;
    if(mounted)mounted.destroy();
    const nodes=new Map(Array.from(doc.querySelectorAll('[id]')).map(e=>[e.id,e]));
    const optional=['productionStatus','selectedDesign','inspectionSummary','inspectionIssues','pdfReason','btnDiagnostics','diagnosticsPanel','btnLoadDesigns','designLibraryStatus','jsonDesignList','jsonDesignInfo','btnFonts','fontBrowser','fontSearch','fontSummary','fontChoices','btnFontMore','btnFontRefresh','fontSelection','fontCurrent','btnFontBody','btnFontTitle','btnAI','btnAiSettings','aiPanel','apiKey','aiModel','studioDiagnostics'];
    const missing=optional.filter(id=>!nodes.has(id));
    missing.forEach(id=>{const node=doc.createElement('div');node.value='';nodes.set(id,node);});
    const $=id=>nodes.get(id),listeners=[];
    const state={library:[],libraryLoading:false,libraryPromise:null,designIssues:[],designFontsChecked:false,images:[],plans:[],selected:0,page:0,busy:false,signature:'',cache:new Map(),hasDocument:false,documentKey:'',pdfReady:false,fonts:[],fontLimit:30,fontsLoaded:false,fontMatches:[],fontFamilyCount:0,fontByName:new Map(),selectedFont:null,openFamily:null,report:null};
    let status;
    const api={root,disposed:false,destroy(){if(api.disposed)return;api.disposed=true;if(api.registration)api.registration.destroy();listeners.splice(0).forEach(([node,event,handler])=>{try{node.removeEventListener(event,handler);}catch(e){/* A disposed wrapper is inert even if its old DOM has gone away. */}});try{if(adapter.dispose)adapter.dispose();}catch(e){/* Disposal must not prevent a fresh mount. */}}};
    const diagnostics=[],initStart=Date.now();
    function diagnostic(message){if(api.disposed)return;diagnostics.push(D.redact(message,[($('apiKey')||{}).value].concat(state.images.map(im=>im.path))));if(diagnostics.length>35)diagnostics.shift();$('studioDiagnostics').textContent=diagnostics.join('\n');}
    function on(id,event,handler){
        if(missing.includes(id))return;
        const node=$(id);if(!node)throw new Error('Events binding: '+id+' 요소 누락');
        const failed=e=>{if(api.disposed)return;status(e.message,true);diagnostic(id+' 실패: '+e.message);};
        const wrapped=(...args)=>{if(api.disposed)return;state.action=id;try{const result=handler(...args);return result&&typeof result.catch==='function'?result.catch(failed):result;}catch(e){failed(e);}};
        try{node.addEventListener(event,wrapped);listeners.push([node,event,wrapped]);}
        catch(e){if(!optional.includes(id))throw e;missing.push(id);node.disabled=true;diagnostic('선택 기능 binding 실패: '+id+' · '+e.message);}
    }
    diagnostic('Studio init start');diagnostic('DOM ready');
    try{
    const required=['studioStatus','autoTitle','autoSubtitle','autoBody','autoKicker','autoAuthor','pageWidth','pageHeight','pageMargin','pageBleed','bodySize','accent','publication','bodyFont','titleFont','btnPrepare','btnSample','btnClear','btnLoadAuto','btnAddImage','btnSettings','settingsPanel','candidateList','largePreview','designName','designDescription','pageIndicator','previewNote','wordCount','imageCount','autoImages','prevPage','nextPage','btnCreateAuto','btnCheckAuto','btnSaveIndd','btnExportPdf','btnSaveProject','hostReport'];
    const absent=required.filter(id=>!$(id));if(absent.length)throw new Error('DOM ready 필수 요소 누락: '+absent.join(', '));
    diagnostic('State ready');
    try{if(adapter.resetSession)adapter.resetSession();}catch(e){adapter.native=false;adapter.hostError=D.redact(e.message);diagnostic('Host adapter 초기화 실패: '+adapter.hostError);}
    diagnostic(adapter.native?'Host adapter ready':'Host adapter unavailable · 미리보기/입력 유지');
    if(missing.length)diagnostic('선택 기능 요소 누락: '+missing.join(', '));
    const editable=['autoTitle','autoSubtitle','autoBody','autoKicker','autoAuthor','pageWidth','pageHeight','pageMargin','pageBleed','bodySize','accent','publication','bodyFont','titleFont'];
    const safe=message=>D.redact(message,[$('apiKey').value].concat(state.images.map(im=>im.path)));
    status=(message,error)=>{$('studioStatus').textContent=safe(message);$('studioStatus').className='studio-status'+(error?' error':'');};
    function read(){return {article:L.article({title:$('autoTitle').value,subtitle:$('autoSubtitle').value,body:$('autoBody').value,kicker:$('autoKicker').value,author:$('autoAuthor').value,images:state.images}),settings:L.settings({width:$('pageWidth').value,height:$('pageHeight').value,margin:$('pageMargin').value,bleed:$('pageBleed').value,bodySize:$('bodySize').value,accent:$('accent').value,publication:$('publication').value,bodyFont:$('bodyFont').value,titleFont:$('titleFont').value})};}
    function fingerprint(a,s){return JSON.stringify({article:L.safeArticle(a),settings:s});}
    function fresh(){const v=read();if(!state.plans.length||state.signature!==fingerprint(v.article,v.settings))throw new Error('원고 또는 설정이 바뀌었습니다. 시안을 다시 만들어주세요.');return v;}
    function buttons(){
        if(api.registration&&api.registration.refresh)api.registration.refresh();
        const fontAvailable=!missing.some(id=>/^font|^btnFont/.test(id));
        const aiAvailable=!missing.some(id=>/^ai|^apiKey|^btnAi|^btnAI/.test(id));
        let valid=false;try{const v=read();valid=state.plans.length>0&&state.signature===fingerprint(v.article,v.settings);}catch(e){}
        $('btnCreateAuto').disabled=state.busy||!valid||!adapter.native;
        $('btnSaveProject').disabled=state.busy||!valid;
        const isCurrent=valid&&state.documentKey===state.signature+'|'+JSON.stringify(state.plans[state.selected]);
        ['btnSaveIndd','btnExportPdf','btnCheckAuto'].forEach(id=>$(id).disabled=state.busy||!state.hasDocument||!isCurrent||!adapter.native);
        $('btnExportPdf').disabled=$('btnExportPdf').disabled||!state.pdfReady;
        $('btnAI').disabled=state.busy||!adapter.native||!aiAvailable;
        $('btnAiSettings').disabled=state.busy||!aiAvailable;
        $('btnFonts').disabled=state.busy||!adapter.native||!fontAvailable;
        $('btnFontRefresh').disabled=$('btnFonts').disabled;
        $('btnFontBody').disabled=state.busy||!state.selectedFont;
        $('btnFontTitle').disabled=state.busy||!state.selectedFont;
        $('prevPage').disabled=state.busy||!valid||state.page===0;
        $('nextPage').disabled=state.busy||!valid||state.page>=((state.plans[state.selected]||{pages:[]}).pages.length-1);
        $('btnFontMore').disabled=state.busy||state.fontLimit>=state.fontFamilyCount;
        $('btnLoadDesigns').disabled=state.busy||state.libraryLoading;
        for(const child of $('jsonDesignList').children)child.disabled=state.busy||child.designError===true;
        const p=state.plans[state.selected];
        if(!state.busy)inspectionUI(isCurrent&&state.hasDocument?state.report:null);
        $('selectedDesign').textContent=valid&&p?'✓ 현재 선택: '+p.name+' · '+p.settings.width+' × '+p.settings.height+' mm':'원고·설정에 맞는 디자인을 먼저 선택해주세요.';
        $('pdfReason').textContent=!adapter.native?'INDD/PDF는 InDesign 플러그인에서 사용할 수 있습니다.':!isCurrent||!state.hasDocument?'다음 단계: 선택한 디자인으로 새 문서를 만들어주세요.':state.busy?'작업 중입니다. 완료 후 다음 단계가 열립니다.':state.pdfReady?'✓ 기본 검사 통과 · PDF 내보내기 가능':state.report&&state.report.errors.length?'PDF 차단: 검사 오류 '+state.report.errors.length+'건을 안내에 따라 수정한 뒤 다시 검사해주세요.':'PDF 출력 전 문서 검사를 실행해주세요.';
        $('btnCheckAuto').textContent=state.report?'다시 검사':'문서 검사';

    }
    async function run(fn){
        if(state.busy||api.disposed)return;state.busy=true;
        const label=state.action||'작업',start=Date.now();diagnostic(label+' 시작');
        let controls=[];
        try{
            controls=Array.from(doc.querySelectorAll('#studioPanel button, #studioPanel input, #studioPanel textarea'));
            controls.forEach(e=>{if(!['btnDiagnostics','btnSettings','btnAiSettings'].includes(e.id))e.disabled=true;});const active=$(label);const old=active&&active.textContent;if(active)active.textContent=old+' · 처리 중…';try{await fn();}finally{if(active&&!api.disposed)active.textContent=old;}
        }catch(e){if(!api.disposed){status(e.message||'작업을 완료하지 못했습니다.',true);diagnostic(label+' 실패: '+e.message);}}
        finally{state.busy=false;if(!api.disposed){controls.forEach(e=>e.disabled=false);fontCurrent();buttons();diagnostic(label+' 종료 '+(Date.now()-start)+'ms');}}
    }
    function imageList(){
        const root=$('autoImages');root.textContent='';
        state.images.forEach((im,i)=>{const row=doc.createElement('div');row.className='image-row';const label=doc.createElement('span');label.textContent=im.name||im.path||('사진 '+(i+1));row.appendChild(label);const remove=doc.createElement('button');remove.textContent='삭제';remove.className='quiet';remove.addEventListener('click',()=>{if(state.busy||api.disposed)return;state.images.splice(i,1);imageList();changed();status('사진을 제거했습니다. 시안을 다시 만들어주세요.');});row.appendChild(remove);root.appendChild(row);});
        $('imageCount').textContent=state.images.length+' / 2';
    }
    function fill(a,s){
        const values={autoTitle:a.title,autoSubtitle:a.subtitle||a.pointText||'',autoBody:a.body,autoKicker:a.kicker||'ARTICLE',autoAuthor:a.author||'',pageWidth:s.width,pageHeight:s.height,pageMargin:s.margin,pageBleed:s.bleed,bodySize:s.bodySize,accent:s.accent,publication:s.publication,bodyFont:s.bodyFont,titleFont:s.titleFont};
        Object.keys(values).forEach(id=>$(id).value=values[id]);state.images=a.images||[];imageList();changed();
    }
    function invalidateDocument(){state.report=null;$('productionStatus').textContent='';$('inspectionSummary').textContent='아직 검사한 문서가 없습니다.';$('inspectionIssues').textContent='';state.hasDocument=false;state.documentKey='';state.pdfReady=false;if(adapter.invalidateDocument)adapter.invalidateDocument();}
    function changed(){
        if(api.registration)api.registration.invalidate();
        $('wordCount').textContent=($('autoBody').value||'').length.toLocaleString()+'자';
        invalidateDocument();fontCurrent();buttons();
        if(state.plans.length){let same=false;try{const v=read();same=state.signature===fingerprint(v.article,v.settings);}catch(e){}$('previewNote').textContent=same?'배치 미리보기 · 실제 줄바꿈과 페이지 수는 InDesign에서 확정됩니다.':'원고·설정이 변경되었습니다. 아래 시안은 이전 내용입니다. 다시 생성해주세요.';}
    }
    function element(tag,cls,text){const e=doc.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
    function renderPage(parent,plan,a,pageIndex,width){
        parent.textContent='';const s=plan.settings,scale=width/s.width;
        // L.PT is points per millimetre: convert points to mm, then mm to preview pixels.
        const fontPixels=points=>(L.ptToMm(points)*scale)+'px';
        const type=(node,b)=>{
            const t=L.typography(b,s),face=state.fontByName.get(t.font),parts=face?[face.family,face.style]:t.font.split('\t');
            const style=parts[1]||'',weight=/black|heavy/i.test(style)?900:/extra.?bold|ultra.?bold/i.test(style)?800:/semi.?bold|demi/i.test(style)?600:/bold/i.test(style)?700:/medium/i.test(style)?500:/extra.?light|ultra.?light/i.test(style)?200:/light/i.test(style)?300:/thin/i.test(style)?100:400;
            Object.assign(node.style,{fontFamily:JSON.stringify(parts[0])+', sans-serif',fontSize:fontPixels(t.size),
                fontWeight:String(weight),fontStyle:/italic|oblique/i.test(style)?'italic':'normal',
                lineHeight:fontPixels(t.leading),letterSpacing:fontPixels(t.size*t.tracking/1000),textAlign:t.align,color:t.color,
                whiteSpace:'pre-wrap',padding:'0px',border:'none',boxSizing:'border-box'});
        };
        const sheet=element('div','design-sheet');sheet.style.width=width+'px';sheet.style.height=(s.height*scale)+'px';
        const pos=(node,x,y,w,h)=>{Object.assign(node.style,{position:'absolute',left:(x*scale)+'px',top:(y*scale)+'px',width:(w*scale)+'px',height:(h*scale)+'px'});sheet.appendChild(node);};
        (plan.origin==='json'?[]:L.furniture(s,a,pageIndex+1)).forEach(b=>{
            const node=element('div',b.role==='rule'?'preview-rule':'preview-meta',b.text);
            if(b.role==='rule')node.style.backgroundColor=b.fill;else type(node,b);
            pos(node,b.x,b.y,b.width,b.height);
        });
        const bodyDemand=Math.max(1,L.demand(a.body));
        let offset=0;
        for(let i=0;i<pageIndex;i++)offset+=plan.pages[i].elements.filter(b=>b.role==='body').reduce((sum,b)=>sum+Math.floor(L.capacity(b,s)*a.body.length/bodyDemand),0);
        const starts=new Map();plan.pages[pageIndex].elements.filter(b=>b.role==='body').slice().sort((a,b)=>(a.flowOrder||0)-(b.flowOrder||0)).forEach(b=>{starts.set(b,offset);offset+=Math.floor(L.capacity(b,s)*a.body.length/bodyDemand);});
        plan.pages[pageIndex].elements.forEach(b=>{
            if(b.role==='line'){const node=element('div','preview-rule'),h=L.ptToMm(b.stroke.weight);node.style.backgroundColor=b.stroke.color.css;const cap=b.stroke.cap==='ButtEndCap'?0:h/2;node.style.borderRadius=b.stroke.cap==='RoundEndCap'?fontPixels(b.stroke.weight/2):'0px';pos(node,b.x-cap,b.y-h/2,b.width+cap*2,h);return;}
            if(b.role==='image'){
                const im=a.images[b.imageIndex]||{},wrap=element('div','preview-photo');wrap.style.backgroundColor=b.fill?b.fill.css:s.accent;wrap.style.borderRadius=((b.cornerRadius||0)*scale)+'px';
                if(im.preview){if(plan.origin!=='json')wrap.style.backgroundColor='transparent';const img=element('img');img.src=im.preview;img.alt=im.name;img.style.objectFit=b.fit||L.RENDER.imageFit;img.style.objectPosition=L.RENDER.imagePosition;wrap.appendChild(img);}else{wrap.textContent=plan.origin==='json'&&!im.path?'':im.name||'PHOTO';}
                pos(wrap,b.x,b.y,b.width,b.height);return;
            }
            if(b.role==='body'){
                const cap=Math.floor(L.capacity(b,s)*a.body.length/bodyDemand),text=a.body.slice(starts.get(b),starts.get(b)+cap);
                const inset=b.inset||[0,0,0,0],gutter=b.columnGap===undefined?L.RENDER.gutter:b.columnGap;
                const cw=(b.width-inset[1]-inset[3]-(b.columns-1)*gutter)/b.columns,chunk=Math.ceil(text.length/b.columns);
                for(let c=0;c<b.columns;c++){
                    const node=element('div','preview-body');type(node,b);
                    text.slice(c*chunk,(c+1)*chunk).split('\n').forEach(line=>{
                        const p=element('div','preview-paragraph',line||'\u00a0');
                        p.style.marginTop=((L.typography(b,s).spaceBefore||0)*scale)+'px';p.style.marginBottom=(L.typography(b,s).spaceAfter*scale)+'px';node.appendChild(p);
                    });
                    pos(node,b.x+inset[1]+c*(cw+gutter),b.y+inset[0],cw,b.height-inset[0]-inset[2]);
                }
                return;
            }
            const node=element('div','preview-'+b.role,L.content(b,a,pageIndex+1));type(node,b);const inset=b.inset||[0,0,0,0];node.style.overflow='hidden';node.style.padding=[inset[0],inset[3],inset[2],inset[1]].map(v=>(v*scale)+'px').join(' ');pos(node,b.x,b.y,b.width,b.height);
        });
        parent.appendChild(sheet);
    }
    function render(){
        const v=fresh(),plan=state.plans[state.selected];state.page=Math.min(state.page,plan.pages.length-1);
        const grid=$('candidateList');grid.textContent='';
        state.plans.forEach((p,i)=>{
            if(p.origin==='json')return;
            const button=element('button','candidate'+(i===state.selected?' selected':''));button.setAttribute('aria-pressed',i===state.selected?'true':'false');
            button.appendChild(element('span','candidate-num',String(i+1).padStart(2,'0')));
            button.appendChild(element('strong','',p.name+(i===state.selected?' ✓ 선택됨':'')));button.appendChild(element('span','candidate-desc',p.origin==='ai'?'AI 제안 · '+p.estimatedPages+'p 예상':p.estimatedPages+'p 예상'));
            button.addEventListener('click',()=>{if(state.busy||api.disposed)return;try{fresh();state.selected=i;state.page=0;if(state.documentKey!==documentKey())$('productionStatus').textContent='';render();}catch(e){status(e.message,true);}});grid.appendChild(button);
        });
        renderLibrary();designInfo(plan);fontCurrent();$('designName').textContent=plan.name;$('designDescription').textContent=plan.description;
        $('pageIndicator').textContent=(state.page+1)+' / '+plan.pages.length;
        const available=$('largePreview').clientWidth||360;
        renderPage($('largePreview'),plan,v.article,state.page,Math.max(120,Math.min(430,available-40)));
        $('previewNote').textContent='배치 미리보기 · 실제 줄바꿈과 페이지 수는 InDesign에서 확정됩니다.';
        buttons();
    }
    function prepare(){const v=read();state.plans=L.candidates(v.article,v.settings);state.signature=fingerprint(v.article,v.settings);state.selected=0;state.page=0;render();status('무료 시안 3개를 만들었습니다. 원하는 안을 선택해주세요.');}

    function designInfo(plan){
        if(!plan||plan.origin!=='json'){$('jsonDesignInfo').textContent='';return;}
        const fonts=[...new Set(plan.pages[0].elements.filter(b=>b.typography).map(b=>b.typography.font.replace(/\t/g,' — ')))];
        $('jsonDesignInfo').textContent='사용 폰트: '+fonts.join(' / ')+'\n'+(state.designIssues.length?'이 디자인에 필요한 폰트가 없습니다: '+state.designIssues.map(f=>f.name.replace(/\t/g,' — ')).join(' / '):state.designFontsChecked?'현재 InDesign에서 필요한 폰트 확인됨 (생성 직전 재검사)':'설치 상태는 선택/생성 때 확인합니다.')+'\n'+plan.warnings.join(' · ')+'\n사진 없으면 빈 프레임 유지. 본문 폰트 대체는 부제·헤더·페이지 번호에도 적용됩니다.';
    }
    function renderLibrary(){
        const grid=$('jsonDesignList');grid.textContent='';
        state.library.forEach(row=>{
            const selected=state.plans[state.selected],button=element('button','candidate'+(selected&&selected.origin==='json'&&selected.id===row.id?' selected':''));
            button.setAttribute('aria-pressed',selected&&selected.origin==='json'&&selected.id===row.id?'true':'false');button.appendChild(element('strong','',(row.design?row.design.name:row.id)+(selected&&selected.origin==='json'&&selected.id===row.id?' ✓ 선택됨':'')));
            if(row.error){button.designError=true;button.disabled=true;button.appendChild(element('span','candidate-desc','JSON 오류: '+safe(row.error)));}
            else{const bodies=row.design.elements.filter(e=>e.role==='body');button.appendChild(element('span','candidate-desc','사진 '+row.design.contentSlots.images.min+'장 · 본문 '+bodies.reduce((n,e)=>n+(e.columns||1),0)+'열 · 폰트 선택 시 확인'));button.disabled=state.busy;
                button.addEventListener('click',()=>{if(api.disposed||state.busy)return;state.action='JSON 디자인 선택';return run(async()=>{
                    const v=read(),p=L.fromDesign(row.design,v.article);invalidateDocument();state.designIssues=[];state.designFontsChecked=false;
                    if(state.signature!==fingerprint(v.article,v.settings)){try{state.plans=L.candidates(v.article,v.settings);}catch(e){state.plans=[];}}
                    state.plans=state.plans.filter(x=>x.origin!=='json');state.plans.push(p);state.selected=state.plans.length-1;state.page=0;state.signature=fingerprint(v.article,v.settings);render();
                    if(adapter.validateDesignFonts){if(adapter.yieldUI)await adapter.yieldUI();if(api.disposed)return;const issues=await adapter.validateDesignFonts(p);if(api.disposed)return;state.designIssues=issues.filter(f=>f.error);state.designFontsChecked=true;designInfo(p);}
                    status(state.designIssues.length?'이 디자인에 필요한 폰트가 없습니다. 설정 → 폰트 더보기에서 제목/본문 대체 폰트를 선택해주세요.':'JSON 디자인을 선택했습니다. 사진이 없으면 이미지 프레임을 비워 둡니다.',!!state.designIssues.length);
                });});}
            grid.appendChild(button);
        });
    }
    async function loadLibrary(){
        if(state.libraryLoading)return state.libraryPromise;
        state.libraryLoading=true;$('designLibraryStatus').textContent='디자인 JSON 읽는 중…';
        state.libraryPromise=(async()=>{try{
            if(!adapter.designs)throw new Error('이 환경에 JSON 로더가 없습니다.');
            const rows=await adapter.designs();if(api.disposed)return;state.library=rows;renderLibrary();
            $('designLibraryStatus').textContent=rows.filter(r=>r.design).length+'개 사용 가능 · '+rows.filter(r=>r.error).length+'개 오류';
        }catch(e){if(!api.disposed)$('designLibraryStatus').textContent='디자인 읽기 실패: '+safe(e.message)+' · 다시 읽기로 재시도 (브라우저는 로컬 HTTP 서버 필요)';}
        finally{state.libraryLoading=false;if(!api.disposed)buttons();}})();return state.libraryPromise;
    }
    diagnostic('Events binding start');
    on('btnLoadDesigns','click',()=>run(loadLibrary));
    editable.forEach(id=>on(id,'input',changed));
    on('btnPrepare','click',()=>run(prepare));
    on('btnSample','click',()=>run(()=>{fill(JSON.parse(JSON.stringify(SAMPLE)),L.DEFAULTS);prepare();status('예시 원고입니다. 직접 입력하거나 원고 파일을 불러와주세요.');}));
    on('btnClear','click',()=>run(()=>{fill({title:'',subtitle:'',body:'',kicker:'ARTICLE',images:[]},L.DEFAULTS);state.plans=[];state.hasDocument=false;state.documentKey='';state.pdfReady=false;$('candidateList').textContent='';['designName','designDescription','pageIndicator','previewNote','hostReport','jsonDesignInfo'].forEach(id=>$(id).textContent='');$('largePreview').textContent='원고를 입력하고 시안을 만들어주세요.';renderLibrary();fontCurrent();status('새 원고를 입력해주세요.');}));
    on('btnLoadAuto','click',()=>run(async()=>{
        const result=await adapter.load();if(api.disposed)return;if(!result){status('불러오기를 취소했습니다.');return;}
        const a=L.article(result.article),s=L.settings(result.settings||readSettingsOnly());
        if(result.plan){L.validate(result.plan,a);if(result.plan.origin!=='json'&&JSON.stringify(L.settings(result.plan.settings))!==JSON.stringify(s))throw new Error('저장된 시안과 설정이 일치하지 않습니다.');}
        fill(a,s);prepare();
        if(result.plan){state.plans.push(result.plan);state.selected=state.plans.length-1;render();}
        const issues=result.plan&&result.plan.origin==='json'&&adapter.validateDesignFonts?await adapter.validateDesignFonts(result.plan):adapter.validateFonts?await adapter.validateFonts(s):[];if(api.disposed)return;
        const missing=issues.filter(f=>f.error);if(result.plan&&result.plan.origin==='json'){state.designIssues=missing;state.designFontsChecked=!!adapter.validateDesignFonts;designInfo(result.plan);}
        status(missing.length?'원고 불러오기 완료 · '+missing.map(f=>(f.name?f.name.replace(/\t/g,' — ')+': ':f.role==='bodyFont'?'본문: ':'제목: ')+f.error).join('\n'):'원고를 불러왔습니다. 사진과 추출된 내용을 확인해주세요.',!!missing.length);
    }));
    function readSettingsOnly(){try{return L.settings({width:$('pageWidth').value,height:$('pageHeight').value,margin:$('pageMargin').value,bleed:$('pageBleed').value,bodySize:$('bodySize').value,accent:$('accent').value,publication:$('publication').value,bodyFont:$('bodyFont').value,titleFont:$('titleFont').value});}catch(e){return L.DEFAULTS;}}
    on('btnAddImage','click',()=>run(async()=>{if(state.images.length>=2)throw new Error('사진은 최대 2장입니다.');const im=await adapter.image();if(api.disposed)return;if(im){state.images.push(im);imageList();changed();status('사진을 추가했습니다. 시안을 다시 만들어주세요.');}else status('사진 선택을 취소했습니다.');}));
    on('btnSettings','click',()=>{$('settingsPanel').style.display=$('settingsPanel').style.display==='none'?'block':'none';});
    on('btnAiSettings','click',()=>{$('aiPanel').style.display=$('aiPanel').style.display==='none'?'block':'none';});
    function filterFonts(){
        const q=$('fontSearch').value.trim().toLowerCase();
        state.fontMatches=state.fonts.filter(f=>f.searchText.includes(q));state.fontFamilyCount=new Set(state.fontMatches.map(f=>f.family)).size;
    }
    function fontCurrent(){
        const p=state.plans[state.selected],s=p&&p.origin==='json'?p.settings:{bodyFont:$('bodyFont').value,titleFont:$('titleFont').value};
        $('fontCurrent').textContent='본문: '+s.bodyFont.replace(/\t/g,' — ')+'\n제목: '+s.titleFont.replace(/\t/g,' — ');
        $('btnFontBody').textContent=state.selectedFont&&s.bodyFont===state.selectedFont.name?'✓ 본문 적용됨':'본문에 적용';$('btnFontTitle').textContent=state.selectedFont&&s.titleFont===state.selectedFont.name?'✓ 제목 적용됨':'제목에 적용';
        $('fontSelection').textContent=state.selectedFont?'선택한 스타일: '+state.selectedFont.family+' — '+state.selectedFont.style:'Family를 펼쳐 Style을 고른 다음 적용할 대상을 눌러주세요.';
    }
    function fontChoices(){
        const root=$('fontChoices');root.textContent='';const groups=new Map();
        state.fontMatches.forEach(f=>{if(!groups.has(f.family))groups.set(f.family,[]);groups.get(f.family).push(f);});
        $('fontSummary').textContent=groups.size+'개 Family · 이름을 펼쳐 스타일을 선택하세요.';
        Array.from(groups).slice(0,state.fontLimit).forEach(([family,faces])=>{
            const group=element('div','font-family'),open=state.openFamily===family;
            const heading=element('button','font-family-toggle',(open?'▾ ':'▸ ')+family+' · '+faces.length+'개 스타일');heading.setAttribute('aria-expanded',String(open));
            heading.addEventListener('click',()=>{if(state.busy||api.disposed)return;state.openFamily=open?null:family;fontChoices();});group.appendChild(heading);
            if(open)faces.forEach(f=>{const selected=state.selectedFont&&state.selectedFont.name===f.name;
                const button=element('button','font-style'+(selected?' selected':''),f.style+(selected?' ✓ 선택됨':''));button.setAttribute('aria-pressed',String(!!selected));
                button.addEventListener('click',()=>{if(state.busy||api.disposed)return;state.selectedFont=f;fontChoices();});group.appendChild(button);
            });root.appendChild(group);
        });fontCurrent();buttons();
    }
    function applyFont(id){return run(async()=>{
        const f=state.selectedFont;if(!f)throw new Error('먼저 설치된 스타일을 선택해주세요.');
        let current=false;try{fresh();current=true;}catch(e){}
        $(id).value=f.name;invalidateDocument();
        if(current){const v=read();state.plans=state.plans.map((p,i)=>p.origin==='json'?(i===state.selected?L.fromDesign(p.design,v.article,{...p.fontOverrides,[id]:f.name}):p):({...p,settings:v.settings}));state.designIssues=[];state.designFontsChecked=false;state.signature=fingerprint(v.article,v.settings);render();}
        else{changed();try{prepare();}catch(e){status('폰트 선택 완료 · '+e.message,true);return;}}
        const plan=state.plans[state.selected];if(plan&&plan.origin==='json'&&adapter.validateDesignFonts){const issues=await adapter.validateDesignFonts(plan);if(api.disposed)return;state.designIssues=issues.filter(f=>f.error);state.designFontsChecked=true;designInfo(plan);}
        fontCurrent();status('✓ '+(id==='bodyFont'?'본문':'제목')+' 폰트 적용: '+f.family+' — '+f.style+' · 새 문서를 만들어주세요.');
    });}
    async function loadFonts(refresh){
        $('fontSummary').textContent='InDesign 설치 폰트 조회 중…';status('설치 폰트 조회 중…');
        if(adapter.yieldUI)await adapter.yieldUI();if(api.disposed)return;
        try{
            const fonts=await adapter.fonts(refresh);if(api.disposed)return;
            state.fonts=fonts.map(f=>typeof f==='string'?{name:f,family:f.split('\t')[0],style:f.split('\t')[1]||''}:f)
                .map(f=>({...f,searchText:[f.name,f.family,f.style,f.postscriptName].join(' ').toLowerCase()}));
            state.fontByName=new Map(state.fonts.map(f=>[f.name,f]));state.fontsLoaded=true;
            state.selectedFont=state.selectedFont?state.fontByName.get(state.selectedFont.name)||null:null;
            state.fontLimit=30;filterFonts();fontChoices();
            let valid=false;try{fresh();valid=true;}catch(e){}if(valid)render();
            status(state.fonts.length?'Family 아래의 실제 Style 선택 → 본문 또는 제목에 적용해주세요.':'사용 가능한 설치 폰트가 없습니다. 활성화 후 새로고침해주세요.',!state.fonts.length);
        }catch(e){$('fontSummary').textContent='폰트 조회 실패 · '+safe(e.message)+' · 설치 폰트 새로고침으로 재시도해주세요.';throw e;}
    }
    on('fontSearch','input',()=>{state.fontLimit=30;filterFonts();fontChoices();});
    on('btnFontMore','click',()=>{state.fontLimit+=30;fontChoices();});
    on('btnFontBody','click',()=>applyFont('bodyFont'));
    on('btnFontTitle','click',()=>applyFont('titleFont'));
    on('btnFontRefresh','click',()=>run(()=>loadFonts(true)));
    on('btnFonts','click',()=>run(async()=>{
        if($('fontBrowser').style.display==='block'){$('fontBrowser').style.display='none';return;}
        $('fontBrowser').style.display='block';
        if(!state.fontsLoaded)await loadFonts(false);else{fontCurrent();status('설치 폰트 캐시를 표시했습니다. 변경 사항은 새로고침해주세요.');}
    }));
    on('btnAI','click',()=>run(async()=>{
        if(!adapter.native)throw new Error('AI 호출은 InDesign 플러그인에서 사용할 수 있습니다.');
        const v=read(),model=$('aiModel').value.trim(),sig=fingerprint(v.article,v.settings),cacheKey=sig+'|'+model;
        let plan=state.cache.get(cacheKey),cached=!!plan;
        if(!plan){status('AI가 디자인을 구성하고 있습니다. 최대 60초 기다려주세요.');plan=await AI.generate(v.article,v.settings,$('apiKey').value,model);if(api.disposed)return;state.cache.set(cacheKey,plan);}
        if(state.signature!==sig)state.plans=L.candidates(v.article,v.settings);
        state.plans=state.plans.filter(p=>p.origin!=='ai');state.plans.push(plan);state.signature=sig;state.selected=state.plans.length-1;state.page=0;render();
        status(cached?'동일한 원고·설정의 AI 시안을 재사용했습니다. API를 호출하지 않았습니다.':'AI 시안을 추가했습니다. 원고 내용은 변경하지 않았습니다.');
    }));
    on('btnSaveProject','click',()=>run(async()=>{const v=fresh();const result=await adapter.saveProject({schemaVersion:1,article:L.safeArticle(v.article),settings:v.settings,plan:state.plans[state.selected]});status(result?'원고와 디자인 설정을 저장했습니다. 사진은 원본 파일을 함께 보관해주세요.':'저장을 취소했습니다.');}));
    function inspectionUI(report){
        if(!report){$('inspectionSummary').textContent='현재 디자인으로 문서를 만들고 검사해주세요.';$('inspectionIssues').textContent='';return;}
        $('inspectionSummary').textContent=report.errors.length?'⚠ 문서 검사 · 수정 필요 '+report.errors.length+'건':'✓ 문서 검사 통과';
        $('inspectionIssues').textContent='';
        const roleNames={title:'제목',subtitle:'부제',body:'본문'};
        (report.autoFixes||[]).forEach(f=>{const text=f.result==='resolved'?'✓ 자동 수정됨 · '+(roleNames[f.role]||'텍스트'):'⚠ 자동 수정 미해결 · '+(roleNames[f.role]||'텍스트')+' · 안전 한도를 확인했습니다.';$('inspectionIssues').appendChild(element('p','brand-note',text));});
        (report.issues||report.errors.map(message=>({message,hint:'InDesign에서 해당 영역을 수정한 뒤 다시 검사해주세요.'}))).forEach(issue=>{const row=element('div','inspection-issue');row.appendChild(element('strong','',safe((issue.category==='BLOCKING'?'✕ 출력 차단 · ':issue.category==='USER_ACTION_REQUIRED'?'⚠ 사용자 확인 필요 · ':'')+issue.message)));row.appendChild(element('p','small',safe(issue.hint||'수정 후 다시 검사해주세요.')));$('inspectionIssues').appendChild(row);});
        report.warnings.forEach(w=>$('inspectionIssues').appendChild(element('p','small',safe('참고: '+w))));
    }
    function showReport(report,label,trace){
        state.hasDocument=true;state.report=report;
        state.pdfReady=report.errors.length===0;
        $('hostReport').textContent=safe(trace.join('\n')+'\n'+label+' · '+report.pageCount+'페이지\n'+(report.errors.length?'확인 필요\n'+report.errors.join('\n')+(report.issues?'\n'+report.issues.map(i=>[i.category||'',i.cause||'',i.role||'',i.detail||''].join(' · ')).join('\n'):''):'텍스트 넘침·폰트·링크 기본 검사 통과')+(report.warnings.length?'\n'+report.warnings.join('\n'):'')+'\n최종 인쇄 전 크롭·색상·재단 여백을 확인해주세요.');
        if(report.autoFixes&&report.autoFixes.length)$('hostReport').textContent+='\n자동 수정 기록\n'+safe(JSON.stringify(report.autoFixes,null,2));
        if(report.outcome==='unconfirmed')status(label+' 완료 미확인: 옵션 창에서 취소했거나 완료 신호를 확인하지 못했습니다. 출력 파일을 확인해주세요.');
        else status(label+(report.errors.length?' 완료 · 검사 오류가 있어 PDF를 차단했습니다. 수정 후 문서 검사를 다시 실행해주세요.':' 성공'),!!report.errors.length);
    }
    function documentKey(){return state.signature+'|'+JSON.stringify(state.plans[state.selected]);}
    function requireCurrentDocument(){
        fresh();
        if(!state.hasDocument||state.documentKey!==documentKey())throw new Error('현재 원고와 시안으로 새 문서를 먼저 만들어주세요.');
    }
    function production(label,action){return run(async()=>{
        const started=Date.now(),trace=[label+' 시작'];$('pdfReason').textContent='작업 중입니다. 완료 후 다음 단계가 열립니다.';status(trace[0]);$('productionStatus').textContent=label+' 중…';$('hostReport').textContent=trace[0];
        const progress=stage=>{if(api.disposed)return;trace.push((Date.now()-started)+'ms · '+stage);if(trace.length>40)trace.splice(1,1);$('hostReport').textContent=safe(trace.join('\n'));status(label+' 중…');};
        try{
            if(adapter.yieldUI)await adapter.yieldUI();if(api.disposed)return;
            const report=await action(progress);if(api.disposed)return;
            if(report){showReport(report,label,trace);$('productionStatus').textContent=report.outcome==='unconfirmed'?label+' 완료 미확인 · 출력 파일을 확인해주세요.':'✓ '+label+' 완료'+(report.errors.length?' · 검사 수정 필요':'');}
            else{trace.push(label+' 취소');$('hostReport').textContent=safe(trace.join('\n'));status(label+' 취소');$('productionStatus').textContent=label+' 취소 · 다시 시도할 수 있습니다.';}
        }catch(e){
            state.pdfReady=false;state.report=null;
            const result=e.productionStage==='save.completed.postCheck'?'INDD 저장 완료 후 검사 실패':label+' 실패';
            const message=result+' · '+safe(e.message||e);
            $('hostReport').textContent=safe(trace.join('\n')+'\n'+message);status(result+' · 상세 진단에서 오류를 확인한 뒤 다시 시도해주세요.',true);$('productionStatus').textContent=result+' · 상세 진단을 확인하고 다시 시도해주세요.';
        }
    });}
    on('btnCreateAuto','click',()=>production('문서 생성',async progress=>{
        invalidateDocument();$('productionStatus').textContent='문서 생성 중…';
        const v=fresh(),key=documentKey();
        const report=await adapter.create(v.article,state.plans[state.selected],progress);
        state.documentKey=key;return report;
    }));
    on('btnDiagnostics','click',()=>{const open=$('diagnosticsPanel').style.display!=='block';$('diagnosticsPanel').style.display=open?'block':'none';$('btnDiagnostics').textContent=open?'상세 진단 접기':'상세 진단 펼치기';$('btnDiagnostics').setAttribute('aria-expanded',String(open));});
    on('btnCheckAuto','click',()=>production('문서 검사',progress=>{requireCurrentDocument();return adapter.check(progress);}));
    on('btnSaveIndd','click',()=>production('INDD 저장',progress=>{requireCurrentDocument();return adapter.saveIndd(progress);}));
    on('btnExportPdf','click',()=>production('PDF 내보내기',progress=>{requireCurrentDocument();if(!state.pdfReady)throw new Error('문서 검사를 먼저 통과해야 합니다.');return adapter.exportPdf(progress);}));
    ['prevPage','nextPage'].forEach((id,i)=>on(id,'click',()=>{try{fresh();state.page=Math.max(0,Math.min(state.plans[state.selected].pages.length-1,state.page+(i?1:-1)));render();}catch(e){status(e.message,true);}}));
    if($('modeLegacy'))on('modeLegacy','click',()=>{if(state.busy||api.disposed)return;$('studioPanel').style.display='none';$('legacyPanel').style.display='block';});
    if($('modeStudio'))on('modeStudio','click',()=>{$('legacyPanel').style.display='none';$('studioPanel').style.display='block';});
    diagnostic('Events binding complete · '+listeners.length+' listeners');
    fill(JSON.parse(JSON.stringify(SAMPLE)),L.DEFAULTS);prepare();status(adapter.native?'예시 원고가 입력되어 있습니다. 원고를 바꿔 시작해주세요.':adapter.hostError?'Host 시작 실패 · '+adapter.hostError+' · 원고/무료 시안은 사용 가능합니다.':'브라우저 체험판 · 무료 시안과 원고 저장을 사용할 수 있습니다. INDD/PDF 생성은 플러그인에서 실행하세요.');
    Object.assign(api,{read,state,prepare,diagnostics});mounted=api;try{if(adapter.registration)api.registration=adapter.registration(api);}catch(e){diagnostic('등록 디자인 UI 초기화 실패: '+e.message);}diagnostic('Studio ready [stability-01] [json-design-01] '+(Date.now()-initStart)+'ms');if(adapter.designs&&!missing.includes('jsonDesignList'))loadLibrary();return api;
    }catch(e){diagnostic('Studio init 실패: '+e.message);api.destroy();const el=$('studioStatus');if(el)el.textContent='Studio init 실패: '+D.redact(e.message);throw e;}
 }
 return {mount,SAMPLE};
});
