(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./layout-engine.js'),require('./ai-layout.js'));else root.MagazineStudio=factory(root.MagazineLayout,root.MagazineAI);})(typeof window!=='undefined'?window:this,function(L,AI){
 'use strict';
 const SAMPLE={title:'도시를 읽는\n또 하나의 방법',subtitle:'빠르게 지나쳤던 골목에서 발견하는\n우리 동네의 새로운 표정',kicker:'LIFE & CULTURE',author:'편집실',images:[],body:'도시를 이해하는 가장 좋은 방법은 잠시 속도를 늦추는 일이다. 매일 같은 길을 걷더라도 익숙한 풍경을 다르게 바라보면 전에는 보이지 않던 이야기가 드러난다. 오래된 간판의 글씨, 작은 가게의 진열장, 낮은 담장 너머의 나무가 그 시작이 될 수 있다.\n\n골목에는 사람들이 살아온 시간이 겹겹이 쌓여 있다. 새로운 카페 옆에서 수십 년째 문을 여는 수선집은 서로 다른 속도로 동네의 하루를 만든다. 변화를 살펴보는 일은 오래된 것을 지키는 이유와 새로움을 받아들이는 방법을 함께 생각하게 한다.\n\n산책의 목적지를 미리 정하지 않아도 좋다. 평소 버스를 타고 지나던 구간을 걸어보거나 익숙한 교차로에서 반대편으로 방향을 바꾸는 것만으로도 충분하다. 다만 가게와 주택이 이어지는 길에서는 생활하는 사람들의 공간을 존중하며 천천히 머무는 태도가 필요하다.\n\n같은 장소를 다른 시간에 찾는 것도 한 가지 방법이다. 아침에는 문을 여는 사람들의 움직임이, 오후에는 창문에 비치는 빛이, 저녁에는 하루를 마무리하는 소리가 눈에 들어온다. 한 번의 방문으로는 알 수 없었던 표정들이 조금씩 모여 동네에 대한 이해를 넓힌다.\n\n돌아오는 길에는 인상 깊었던 장면 하나를 메모해보자. 사진 한 장이나 짧은 문장이면 된다. 기록은 멋진 장소를 모으기 위한 목록이 아니라 우리가 무엇에 관심을 기울였는지 돌아보는 작은 단서가 된다. 도시의 이야기는 그렇게 각자의 걸음 속에서 새롭게 이어진다.'};
 function mount(adapter){
    const $=id=>document.getElementById(id),state={images:[],plans:[],selected:0,page:0,busy:false,signature:'',cache:new Map(),hasDocument:false,documentKey:''};
    const editable=['autoTitle','autoSubtitle','autoBody','autoKicker','autoAuthor','pageWidth','pageHeight','pageMargin','pageBleed','bodySize','accent','publication','bodyFont','titleFont'];
    const status=(message,error)=>{$('studioStatus').textContent=message;$('studioStatus').className='studio-status'+(error?' error':'');};
    function read(){return {article:L.article({title:$('autoTitle').value,subtitle:$('autoSubtitle').value,body:$('autoBody').value,kicker:$('autoKicker').value,author:$('autoAuthor').value,images:state.images}),settings:L.settings({width:$('pageWidth').value,height:$('pageHeight').value,margin:$('pageMargin').value,bleed:$('pageBleed').value,bodySize:$('bodySize').value,accent:$('accent').value,publication:$('publication').value,bodyFont:$('bodyFont').value,titleFont:$('titleFont').value})};}
    function fingerprint(a,s){return JSON.stringify({article:L.safeArticle(a),settings:s});}
    function fresh(){const v=read();if(!state.plans.length||state.signature!==fingerprint(v.article,v.settings))throw new Error('원고 또는 설정이 바뀌었습니다. 시안을 다시 만들어주세요.');return v;}
    function buttons(){
        let valid=false;try{const v=read();valid=state.plans.length>0&&state.signature===fingerprint(v.article,v.settings);}catch(e){}
        $('btnCreateAuto').disabled=state.busy||!valid||!adapter.native;
        $('btnSaveProject').disabled=state.busy||!valid;
        const isCurrent=valid&&state.documentKey===state.signature+'|'+JSON.stringify(state.plans[state.selected]);
        ['btnSaveIndd','btnExportPdf','btnCheckAuto'].forEach(id=>$(id).disabled=state.busy||!state.hasDocument||!isCurrent||!adapter.native);
    }
    async function run(fn){
        if(state.busy)return;state.busy=true;
        const controls=Array.from(document.querySelectorAll('#studioPanel button, #studioPanel input, #studioPanel textarea'));
        controls.forEach(e=>e.disabled=true);
        try{await fn();}catch(e){status(e.message||'작업을 완료하지 못했습니다.',true);}finally{state.busy=false;controls.forEach(e=>e.disabled=false);buttons();}
    }
    function imageList(){
        const root=$('autoImages');root.textContent='';
        state.images.forEach((im,i)=>{const row=document.createElement('div');row.className='image-row';const label=document.createElement('span');label.textContent=im.name||im.path||('사진 '+(i+1));row.appendChild(label);const remove=document.createElement('button');remove.textContent='삭제';remove.className='quiet';remove.addEventListener('click',()=>{state.images.splice(i,1);imageList();changed();});row.appendChild(remove);root.appendChild(row);});
        $('imageCount').textContent=state.images.length+' / 2';
    }
    function fill(a,s){
        const values={autoTitle:a.title,autoSubtitle:a.subtitle||a.pointText||'',autoBody:a.body,autoKicker:a.kicker||'ARTICLE',autoAuthor:a.author||'',pageWidth:s.width,pageHeight:s.height,pageMargin:s.margin,pageBleed:s.bleed,bodySize:s.bodySize,accent:s.accent,publication:s.publication,bodyFont:s.bodyFont,titleFont:s.titleFont};
        Object.keys(values).forEach(id=>$(id).value=values[id]);state.images=a.images||[];imageList();changed();
    }
    function changed(){
        $('wordCount').textContent=($('autoBody').value||'').length.toLocaleString()+'자';
        buttons();
        if(state.plans.length){let same=false;try{const v=read();same=state.signature===fingerprint(v.article,v.settings);}catch(e){}$('previewNote').textContent=same?'배치 미리보기 · 실제 줄바꿈과 페이지 수는 InDesign에서 확정됩니다.':'원고·설정이 변경되었습니다. 아래 시안은 이전 내용입니다. 다시 생성해주세요.';}
    }
    function element(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
    function renderPage(parent,plan,a,pageIndex,width){
        parent.textContent='';const s=plan.settings,scale=width/s.width;
        // L.PT is points per millimetre: convert points to mm, then mm to preview pixels.
        const fontPixels=points=>(points/L.PT*scale)+'px';
        const sheet=element('div','design-sheet');sheet.style.width=width+'px';sheet.style.height=(s.height*scale)+'px';
        const pos=(node,x,y,w,h)=>{Object.assign(node.style,{position:'absolute',left:(x*scale)+'px',top:(y*scale)+'px',width:(w*scale)+'px',height:(h*scale)+'px'});sheet.appendChild(node);};
        const header=element('div','preview-meta',s.publication+'  /  '+a.kicker);header.style.fontSize=fontPixels(8);pos(header,s.margin,s.margin,s.width-2*s.margin,7);
        const rule=element('div');rule.style.backgroundColor=s.accent;pos(rule,s.margin,s.margin+9,s.width-2*s.margin,0.45);
        const footer=element('div','preview-meta',(a.author?a.author+' · ':'')+String(pageIndex+1).padStart(2,'0'));footer.style.fontSize=fontPixels(8);pos(footer,s.margin,s.height-s.margin-6,s.width-2*s.margin,6);
        let offset=0;
        for(let i=0;i<pageIndex;i++)offset+=Math.floor(L.capacity(plan.pages[i].elements.find(b=>b.role==='body'),s)*a.body.length/Math.max(1,L.demand(a.body)));
        plan.pages[pageIndex].elements.forEach(b=>{
            if(b.role==='image'){
                const im=a.images[b.imageIndex],wrap=element('div','preview-photo');wrap.style.backgroundColor=s.accent;
                if(im.preview){const img=element('img');img.src=im.preview;img.alt=im.name;wrap.appendChild(img);}else{wrap.textContent=im.name||'PHOTO';}
                pos(wrap,b.x,b.y,b.width,b.height);return;
            }
            if(b.role==='body'){
                const cap=Math.floor(L.capacity(b,s)*a.body.length/Math.max(1,L.demand(a.body))),text=a.body.slice(offset,offset+cap);
                const cw=(b.width-(b.columns-1)*5)/b.columns,chunk=Math.ceil(text.length/b.columns);
                for(let c=0;c<b.columns;c++){const node=element('div','preview-body',text.slice(c*chunk,(c+1)*chunk));node.style.fontSize=fontPixels(b.fontSize);node.style.lineHeight='1.55';pos(node,b.x+c*(cw+5),b.y,cw,b.height);}
                return;
            }
            const node=element('div','preview-'+b.role,a[b.role]);node.style.fontSize=fontPixels(b.fontSize);node.style.lineHeight=b.role==='title'?'1.3':'1.5';pos(node,b.x,b.y,b.width,b.height);
        });
        parent.appendChild(sheet);
    }
    function render(){
        const v=fresh(),plan=state.plans[state.selected];state.page=Math.min(state.page,plan.pages.length-1);
        const grid=$('candidateList');grid.textContent='';
        state.plans.forEach((p,i)=>{
            const button=element('button','candidate'+(i===state.selected?' selected':''));button.setAttribute('aria-pressed',i===state.selected?'true':'false');
            button.appendChild(element('span','candidate-num',String(i+1).padStart(2,'0')));
            button.appendChild(element('strong','',p.name));button.appendChild(element('span','candidate-desc',p.origin==='ai'?'AI 제안 · '+p.estimatedPages+'p 예상':p.estimatedPages+'p 예상'));
            button.addEventListener('click',()=>{if(state.busy)return;state.selected=i;state.page=0;render();});grid.appendChild(button);
        });
        $('designName').textContent=plan.name;$('designDescription').textContent=plan.description;
        $('pageIndicator').textContent=(state.page+1)+' / '+plan.pages.length;
        const available=$('largePreview').clientWidth||360;
        renderPage($('largePreview'),plan,v.article,state.page,Math.max(220,Math.min(430,available-20)));
        $('previewNote').textContent='배치 미리보기 · 실제 줄바꿈과 페이지 수는 InDesign에서 확정됩니다.';
        buttons();
    }
    function prepare(){const v=read();state.plans=L.candidates(v.article,v.settings);state.signature=fingerprint(v.article,v.settings);state.selected=0;state.page=0;render();status('무료 시안 3개를 만들었습니다. 원하는 안을 선택해주세요.');}
    editable.forEach(id=>$(id).addEventListener('input',changed));
    $('btnPrepare').addEventListener('click',()=>run(prepare));
    $('btnSample').addEventListener('click',()=>run(()=>{fill(JSON.parse(JSON.stringify(SAMPLE)),L.DEFAULTS);prepare();status('예시 원고입니다. 직접 입력하거나 원고 파일을 불러와주세요.');}));
    $('btnClear').addEventListener('click',()=>run(()=>{fill({title:'',subtitle:'',body:'',kicker:'ARTICLE',images:[]},L.DEFAULTS);state.plans=[];$('candidateList').textContent='';$('largePreview').textContent='원고를 입력하고 시안을 만들어주세요.';status('새 원고를 입력해주세요.');}));
    $('btnLoadAuto').addEventListener('click',()=>run(async()=>{
        const result=await adapter.load();if(!result){status('불러오기를 취소했습니다.');return;}
        const a=L.article(result.article),s=L.settings(result.settings||readSettingsOnly());
        if(result.plan){L.validate(result.plan,a);if(JSON.stringify(L.settings(result.plan.settings))!==JSON.stringify(s))throw new Error('저장된 시안과 설정이 일치하지 않습니다.');}
        fill(a,s);prepare();
        if(result.plan){state.plans.push(result.plan);state.selected=state.plans.length-1;render();}
        status('원고를 불러왔습니다. 사진과 추출된 내용을 확인해주세요.');
    }));
    function readSettingsOnly(){try{return L.settings({width:$('pageWidth').value,height:$('pageHeight').value,margin:$('pageMargin').value,bleed:$('pageBleed').value,bodySize:$('bodySize').value,accent:$('accent').value,publication:$('publication').value,bodyFont:$('bodyFont').value,titleFont:$('titleFont').value});}catch(e){return L.DEFAULTS;}}
    $('btnAddImage').addEventListener('click',()=>run(async()=>{if(state.images.length>=2)throw new Error('사진은 최대 2장입니다.');const im=await adapter.image();if(im){state.images.push(im);imageList();changed();status('사진을 추가했습니다. 시안을 다시 만들어주세요.');}}));
    $('btnSettings').addEventListener('click',()=>{$('settingsPanel').style.display=$('settingsPanel').style.display==='none'?'block':'none';});
    $('btnAiSettings').addEventListener('click',()=>{$('aiPanel').style.display=$('aiPanel').style.display==='none'?'block':'none';});
    $('btnFonts').addEventListener('click',()=>run(async()=>{$('fontList').value=(await adapter.fonts()).join('\n');$('fontList').style.display='block';status('설치 폰트 이름을 복사해 입력할 수 있습니다.');}));
    $('btnAI').addEventListener('click',()=>run(async()=>{
        if(!adapter.native)throw new Error('AI 호출은 InDesign 플러그인에서 사용할 수 있습니다.');
        const v=read(),model=$('aiModel').value.trim(),sig=fingerprint(v.article,v.settings),cacheKey=sig+'|'+model;
        let plan=state.cache.get(cacheKey),cached=!!plan;
        if(!plan){status('AI가 디자인을 구성하고 있습니다. 최대 60초 기다려주세요.');plan=await AI.generate(v.article,v.settings,$('apiKey').value,model);state.cache.set(cacheKey,plan);}
        if(state.signature!==sig)state.plans=L.candidates(v.article,v.settings);
        state.plans=state.plans.filter(p=>p.origin!=='ai');state.plans.push(plan);state.signature=sig;state.selected=state.plans.length-1;state.page=0;render();
        status(cached?'동일한 원고·설정의 AI 시안을 재사용했습니다. API를 호출하지 않았습니다.':'AI 시안을 추가했습니다. 원고 내용은 변경하지 않았습니다.');
    }));
    $('btnSaveProject').addEventListener('click',()=>run(async()=>{const v=fresh();const result=await adapter.saveProject({schemaVersion:1,article:L.safeArticle(v.article),settings:v.settings,plan:state.plans[state.selected]});status(result?'원고와 디자인 설정을 저장했습니다. 사진은 원본 파일을 함께 보관해주세요.':'저장을 취소했습니다.');}));
    function showReport(report,label){
        state.hasDocument=true;
        $('hostReport').textContent=label+' · '+report.pageCount+'페이지\n'+(report.errors.length?'확인 필요\n'+report.errors.join('\n'):'텍스트 넘침·폰트·링크 기본 검사 통과')+(report.warnings.length?'\n'+report.warnings.join('\n'):'')+'\n최종 인쇄 전 크롭·색상·재단 여백을 확인해주세요.';
        status(report.errors.length?'문서를 만들었지만 확인할 오류가 있습니다.':'편집 가능한 문서가 준비됐습니다. InDesign에서 결과를 확인해주세요.',!!report.errors.length);
    }
    $('btnCreateAuto').addEventListener('click',()=>run(async()=>{const v=fresh();status('새 InDesign 문서를 만드는 중입니다…');const report=await adapter.create(v.article,state.plans[state.selected]);state.documentKey=state.signature+'|'+JSON.stringify(state.plans[state.selected]);showReport(report,'새 문서 생성');}));
    $('btnCheckAuto').addEventListener('click',()=>run(async()=>showReport(await adapter.check(),'검사 결과')));
    $('btnSaveIndd').addEventListener('click',()=>run(async()=>{const r=await adapter.saveIndd();if(r)showReport(r,'INDD 저장');else status('저장을 취소했습니다.');}));
    $('btnExportPdf').addEventListener('click',()=>run(async()=>{const r=await adapter.exportPdf();if(r)showReport(r,'PDF 내보내기');else status('내보내기를 취소했습니다.');}));
    ['prevPage','nextPage'].forEach((id,i)=>$(id).addEventListener('click',()=>{try{fresh();state.page=Math.max(0,Math.min(state.plans[state.selected].pages.length-1,state.page+(i?1:-1)));render();}catch(e){status(e.message,true);}}));
    if($('modeLegacy'))$('modeLegacy').addEventListener('click',()=>{if(state.busy)return;$('studioPanel').style.display='none';$('legacyPanel').style.display='block';});
    if($('modeStudio'))$('modeStudio').addEventListener('click',()=>{$('legacyPanel').style.display='none';$('studioPanel').style.display='block';});
    fill(JSON.parse(JSON.stringify(SAMPLE)),L.DEFAULTS);prepare();status(adapter.native?'예시 원고가 입력되어 있습니다. 원고를 바꿔 시작해주세요.':'브라우저 체험판 · 무료 시안과 원고 저장을 사용할 수 있습니다. INDD/PDF 생성은 플러그인에서 실행하세요.');
    return {read,state,prepare};
 }
 return {mount,SAMPLE};
});
