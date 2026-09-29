/* Shared by the UXP panel and the browser preview. Geometry is in millimetres. */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./json-design.js'));
    else root.MagazineLayout = factory(root.MagazineJSONDesign);
})(typeof window !== 'undefined' ? window : this, function (J) {
    'use strict';
    const PT = J.PT;
    const MAX_PAGES = 40;
    // Renderer contract: mm geometry, pt type, InDesign tracking in 1/1000 em.
    const RENDER = Object.freeze({ gutter: 5, ink: '#1D2126', muted: '#5F6367', imageFit: 'cover', imagePosition: 'center' });
    function typography(b, s) {
        if(b.typography)return b.typography;
        const role=b.role, size=b.fontSize || 8;
        return { font: role==='title'?s.titleFont:s.bodyFont, size,
            leading:size*(role==='title'?1.3:role==='subtitle'?1.5:role==='body'?1.55:1.4),
            tracking:0, spaceAfter:role==='body'?2:0, align:'left',
            color:role==='subtitle'||role==='meta'?RENDER.muted:RENDER.ink };
    }
    function furniture(s,a,pageNumber) {
        const width=s.width-2*s.margin;
        return [
            {role:'meta',label:'AUTO_HEADER_'+pageNumber,x:s.margin,y:s.margin,width,height:7,fontSize:8,text:s.publication+'  /  '+a.kicker},
            {role:'rule',label:'AUTO_RULE_'+pageNumber,x:s.margin,y:s.margin+9,width,height:0.45,fill:s.accent},
            {role:'meta',label:'AUTO_FOOTER_'+pageNumber,x:s.margin,y:s.height-s.margin-6,width,height:6,fontSize:8,text:(a.author?a.author+'   ·   ':'')+String(pageNumber).padStart(2,'0')}
        ];
    }
    const DEFAULTS = { width: 210, height: 297, margin: 18, bleed: 3, bodySize: 10.5,
        accent: '#B45732', publication: 'MAGAZINE', bodyFont: 'Freesentation 4 Regular', titleFont: 'Freesentation 7 Bold' };
    function number(value, fallback, min, max, name) {
        const n = value === undefined || value === '' ? fallback : Number(value);
        if (!Number.isFinite(n) || n < min || n > max) throw new Error(name + ': ' + min + '–' + max + ' 범위로 입력해주세요.');
        return n;
    }
    function settings(input) {
        const s = Object.assign({}, DEFAULTS, input || {});
        s.width = number(s.width, 210, 148, 300, '지면 너비');
        s.height = number(s.height, 297, 210, 420, '지면 높이');
        s.margin = number(s.margin, 18, 12, 35, '여백');
        s.bleed = number(s.bleed, 3, 0, 6, '재단 여백');
        s.bodySize = number(s.bodySize, 10.5, 9, 14, '본문 크기');
        if (s.height < s.width) throw new Error('현재 버전은 세로 지면을 지원합니다.');
        if (!/^#[0-9a-f]{6}$/i.test(s.accent)) throw new Error('강조색은 #B45732 형식으로 입력해주세요.');
        ['bodyFont', 'titleFont', 'publication'].forEach(k => {
            s[k] = String(s[k] || '').trim();
            if (!s[k] || s[k].length > 120) throw new Error(k + ' 값을 확인해주세요.');
        });
        return s;
    }
    function article(input) {
        if (!input || typeof input !== 'object') throw new Error('기사 데이터가 필요합니다.');
        ['title','body'].forEach(k=>{if(typeof input[k] !== 'string')throw new Error(k+'는 문자열이어야 합니다.');});
        function txt(v) { return String(v == null ? '' : v).replace(/\r\n?/g, '\n'); }
        const a = { title: txt(input.title).trim(), subtitle: txt(input.subtitle || input.pointText),
            body: txt(input.body), kicker: txt(input.kicker || 'ARTICLE').trim(), author: txt(input.author).trim(), images: [] };
        if (!a.title || a.title.length > 300) throw new Error('제목은 1–300자로 입력해주세요.');
        if (!a.body.trim() || a.body.length > 50000) throw new Error('본문은 공백을 제외한 내용이 있어야 하며 최대 50,000자입니다.');
        if (a.subtitle.length > 500) throw new Error('부제는 최대 500자입니다.');
        if (a.kicker.length > 60 || a.author.length > 100) throw new Error('분류/필자 이름이 너무 깁니다.');
        const images = input.images || (input.heroImage ? [{ path: input.heroImage }] : []);
        if (!Array.isArray(images) || images.length > 2) throw new Error('현재 버전은 기사당 사진을 최대 2장 지원합니다.');
        a.images = images.map((im, i) => ({ path: txt(im.path), name: txt(im.name || '사진 ' + (i + 1)),
            preview: txt(im.preview), width: Number(im.width) || 0, height: Number(im.height) || 0 }));
        return a;
    }
    function units(text) {
        let n = 0;
        for (const ch of String(text)) n += /[\u0000-\u007f]/.test(ch) ? (ch === '\t' ? 2 : 0.54) : 1;
        return n;
    }
    function demand(text) { return units(text) + (String(text).match(/\n/g) || []).length * 14; }
    function box(role, x, y, width, height, size, columns, imageIndex) {
        return { role, x, y, width, height, fontSize: size || 0, columns: columns || 1,
            imageIndex: imageIndex == null ? -1 : imageIndex };
    }
    function capacity(b, s) {
        const inset=b.inset||[0,0,0,0],t=typography(b,s);
        const columnWidth = (b.width-inset[1]-inset[3] - (b.columns - 1) * (b.columnGap===undefined?RENDER.gutter:b.columnGap)) / b.columns;
        const glyphs = Math.max(1, Math.floor(columnWidth * PT / t.size));
        const lines = Math.max(1, Math.floor((b.height-inset[0]-inset[2]) * PT / t.leading));
        return glyphs * lines * b.columns * 0.82;
    }
    function textHeight(text, width, size, leadingFactor) {
        const explicit = String(text).split('\n');
        const lineLength = width * PT / size;
        const count = explicit.reduce((n, p) => n + Math.max(1, Math.ceil(units(p) / lineLength)), 0);
        return count * size * (leadingFactor || 1.3) / PT + 3;
    }
    function headingSize(a, width, preferred) {
        let size = preferred;
        while (size > 24 && textHeight(a.title, width, size) > 72) size -= 2;
        return size;
    }
    function continuation(s, a) {
        const width = s.width - 2 * s.margin;
        return { elements: [box('body', s.margin, s.margin + 16, width, s.height - 2 * s.margin - 30,
            s.bodySize, width >= 160 ? 3 : width >= 81 ? 2 : 1)] };
    }
    function finish(a, s, name, description, blocks, origin, id) {
        const p = { version: 1, id, name, description, origin, settings: s, pages: [{ elements: blocks }] };
        validate(p, a);
        let remaining = demand(a.body) - capacity(blocks.find(b => b.role === 'body'), s);
        while (remaining > 0) {
            if (p.pages.length >= MAX_PAGES) throw new Error('예상 페이지가 40장을 넘습니다. 기사를 나눠주세요.');
            const page = continuation(s, a);
            p.pages.push(page);
            remaining -= capacity(page.elements[0], s);
        }
        p.estimatedPages = p.pages.length;
        return p;
    }
    function make(a, s, kind) {
        const m = s.margin, w = s.width - 2 * m, bottom = s.height - m - 14;
        let y = m + 14, blocks = [], size, h;
        const names = ['에디토리얼', a.images.length ? '비주얼 포커스' : '여백 중심', '타이포그래피'];
        const descriptions = ['단정한 제목과 균형 잡힌 본문', a.images.length ? '사진과 제목을 나란히 배치한 지면' : '좁은 제목 폭과 넉넉한 여백이 있는 지면', '큰 제목과 촘촘한 다단 본문'];
        if (kind === 1 && a.images.length) {
            const tw = (w - 7) * 0.56, iw = w - tw - 7;
            size = headingSize(a, tw, 32);
            h = textHeight(a.title, tw, size);
            blocks.push(box('title', m, y, tw, h, size));
            let sectionHeight = h;
            if (a.subtitle.trim()) {
                const sh = textHeight(a.subtitle, tw, 12.5, 1.5);
                blocks.push(box('subtitle', m, y + h + 5, tw, sh, 12.5));
                sectionHeight += sh + 5;
            }
            sectionHeight = Math.max(82, sectionHeight);
            const each = (sectionHeight - (a.images.length - 1) * 5) / a.images.length;
            a.images.forEach((im, i) => blocks.push(box('image', m + tw + 7, y + i * (each + 5), iw, each, 0, 1, i)));
            y += sectionHeight + 10;
        } else {
            const titleWidth = kind === 1 ? w * 0.78 : w;
            size = headingSize(a, titleWidth, kind === 2 ? 48 : kind === 1 ? 32 : 36);
            h = textHeight(a.title, titleWidth, size);
            blocks.push(box('title', m, y, titleWidth, h, size));
            y += h + 6;
            if (a.subtitle.trim()) {
                h = textHeight(a.subtitle, kind === 2 ? w * 0.82 : w, kind === 2 ? 15 : 12.5, 1.5);
                blocks.push(box('subtitle', m, y, kind === 2 ? w * 0.82 : w, h, kind === 2 ? 15 : 12.5));
                y += h + 8;
            }
            if (a.images.length) {
                const iw = (w - (a.images.length - 1) * 5) / a.images.length;
                h = Math.min(kind === 2 ? 58 : 78, Math.max(30, bottom - y - 45));
                a.images.forEach((im, i) => blocks.push(box('image', m + i * (iw + 5), y, iw, h, 0, 1, i)));
                y += h + 9;
            }
        }
        // Very long headline/subtitle belongs to a spacious opener; body starts on a continuation page.
        if (bottom - y < 30) throw new Error('제목 또는 부제가 길어 첫 페이지를 구성할 수 없습니다. 제목/부제를 정리하거나 큰 판형을 선택해주세요.');
        const cols = kind === 2 && w >= 160 ? 3 : (a.body.length < 450 || w < 81 ? 1 : 2);
        blocks.push(box('body', m, y, w, bottom - y, s.bodySize, cols));
        return finish(a, s, names[kind], descriptions[kind], blocks, 'local', 'local-' + kind);
    }
    function validate(plan, a) {
        if(plan&&plan.origin==='json'){const expected=fromDesign(plan.design,a,plan.fontOverrides);if(JSON.stringify(plan)!==JSON.stringify(expected))throw new Error('JSON plan이 원본 디자인 명세와 다릅니다. 다시 선택해주세요.');return true;}
        if (!plan || !Array.isArray(plan.pages) || !plan.pages.length || plan.pages.length > MAX_PAGES) throw new Error('잘못된 페이지 설계입니다.');
        const s = settings(plan.settings), seen = { title: 0, subtitle: 0, body: 0 }, imgs = [];
        plan.pages.forEach((page, pi) => {
            if (!page || !Array.isArray(page.elements) || page.elements.length > 10) throw new Error('페이지 요소를 확인해주세요.');
            let bodyCount = 0;
            page.elements.forEach(b => {
                if (!['title', 'subtitle', 'body', 'image'].includes(b.role)) throw new Error('지원하지 않는 디자인 요소입니다.');
                ['x', 'y', 'width', 'height', 'fontSize', 'columns', 'imageIndex'].forEach(k => {
                    if (typeof b[k] !== 'number' || !Number.isFinite(b[k])) throw new Error('설계 좌표가 유효하지 않습니다.');
                });
                if (b.width < 10 || b.height < 6 || b.x < s.margin - 0.01 || b.y < s.margin + 12 - 0.01 ||
                    b.x + b.width > s.width - s.margin + 0.01 || b.y + b.height > s.height - s.margin - 12 + 0.01) throw new Error('요소가 본문 영역을 벗어납니다.');
                if (b.role !== 'image') {
                    const min = b.role === 'body' ? 9 : b.role === 'title' ? 24 : 11;
                    const max = b.role === 'body' ? 14 : b.role === 'title' ? 64 : 20;
                    if (b.fontSize < min || b.fontSize > max) throw new Error('글자 크기가 허용 범위를 벗어납니다.');
                    seen[b.role]++;
                    if (pi > 0 && b.role !== 'body') throw new Error('제목/부제는 첫 페이지에만 배치해주세요.');
                }
                if (b.role === 'body') {
                    bodyCount++;
                    if (!Number.isInteger(b.columns) || b.columns < 1 || b.columns > 3 ||
                        (b.width - (b.columns - 1) * RENDER.gutter) / b.columns < 38 || b.height < 25 || b.fontSize !== s.bodySize) throw new Error('본문 폭·단 수·글자 크기를 확인해주세요.');
                }
                if (b.role === 'image') {
                    if (pi > 0 || !Number.isInteger(b.imageIndex) || b.imageIndex < 0 || b.imageIndex >= a.images.length) throw new Error('사진 참조를 확인해주세요.');
                    imgs.push(b.imageIndex);
                }
            });
            if (bodyCount !== 1) throw new Error('각 페이지에는 본문 프레임이 하나 필요합니다.');
            for (let i = 0; i < page.elements.length; i++) for (let j = i + 1; j < page.elements.length; j++) {
                const b = page.elements[i], c = page.elements[j];
                if (Math.min(b.x+b.width,c.x+c.width)-Math.max(b.x,c.x) > 0.1 &&
                    Math.min(b.y+b.height,c.y+c.height)-Math.max(b.y,c.y) > 0.1) throw new Error('디자인 요소가 서로 겹칩니다.');
            }
        });
        if (seen.title !== 1 || seen.subtitle !== (a.subtitle.trim() ? 1 : 0)) throw new Error('제목/부제 프레임 개수가 원고와 맞지 않습니다.');
        if (imgs.length !== a.images.length || new Set(imgs).size !== imgs.length) throw new Error('사진이 누락되거나 중복되었습니다.');
        return true;
    }
    function candidates(raw, opts) {
        const a = article(raw), s = settings(opts);
        return [0,1,2].map(k => make(a,s,k));
    }
    function fromAI(raw, opts, spec) {
        const a = article(raw), s = settings(opts);
        if (!spec || !Array.isArray(spec.blocks)) throw new Error('AI 디자인 응답 형식이 올바르지 않습니다.');
        const blocks = spec.blocks.map(b => box(b.role,b.x,b.y,b.width,b.height,b.fontSize,b.columns,b.imageIndex));
        return finish(a,s,String(spec.name || 'AI 디자인').slice(0,60),String(spec.description || '').slice(0,300),blocks,'ai','ai');
    }

    function pageElements(plan,a,index){return plan.origin==='json'?plan.pages[index].elements:furniture(plan.settings,a,index+1).concat(plan.pages[index].elements);}
    function content(b,a,page){return b.role==='pageNumber'?String(page):b.text!==undefined?b.text:b.role==='header'?a.kicker:a[b.role]||'';}
    function continuationFor(plan,a){
        const page=continuation(plan.settings,a);
        if(plan.origin==='json'){const source=plan.pages[0].elements.find(b=>b.role==='body');Object.assign(page.elements[0],{typography:{...source.typography},columnGap:RENDER.gutter,inset:[0,0,0,0],flowOrder:1,label:'JSON_BODY_CONTINUATION'});}
        return page;
    }
    function fromDesign(raw,rawArticle,overrides={}){
        const a=article(rawArticle),n=J.normalize(raw,overrides),body=n.elements.find(b=>b.role==='body'),title=n.elements.find(b=>b.role==='title');
        if(a.images.length>n.design.contentSlots.images.max)throw new Error('이 디자인은 사진 '+n.design.contentSlots.images.max+'장까지 사용합니다. 추가 사진을 제거해주세요.');
        const s={...DEFAULTS,width:n.design.page.widthMm,height:n.design.page.heightMm,margin:Math.min(18,n.design.page.widthMm/10,n.design.page.heightMm/10),bleed:0,bodySize:body.fontSize,bodyFont:body.typography.font,titleFont:title.typography.font};
        const p={version:1,origin:'json',id:n.design.id,name:n.design.name,description:'IDML 기반 JSON · 원본 첫 페이지 유지',design:n.design,fontOverrides:{...overrides},settings:s,warnings:n.warnings,pages:[{elements:n.elements}]};
        let remaining=demand(a.body)-n.elements.filter(b=>b.role==='body').reduce((sum,b)=>sum+capacity(b,s),0);
        while(remaining>0){if(p.pages.length>=MAX_PAGES)throw new Error('예상 페이지가 40장을 넘습니다.');const page=continuationFor(p,a);p.pages.push(page);remaining-=capacity(page.elements[0],s);}
        p.estimatedPages=p.pages.length;return p;
    }
    function safeArticle(a) {
        const c = article(a);
        c.images = c.images.map(im => ({path:im.path,name:im.name,width:im.width,height:im.height}));
        return c;
    }
    return { J, fromDesign, continuationFor, pageElements, content, ptToMm:J.ptToMm, mmToPt:J.mmToPt, DEFAULTS, PT, MAX_PAGES, RENDER, typography, furniture, settings, article, units, demand, capacity, textHeight, candidates, validate, continuation, fromAI, safeArticle };
});
