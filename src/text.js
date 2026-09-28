// 검증된 기사 데이터를 InDesign 텍스트 프레임/이미지 프레임에 실제로 채워 넣는 모듈.
// 지금까지 TITLE, POINT_TEXT, BODY, HERO_IMAGE(+HERO_IMAGE_GUIDE 안내 문구 비우기)를 다룬다
// (applyOpeningPageContent, 하나의 doScript로 통합 — D014/D015/D017/D018) — Overset 처리,
// 페이지 추가는 아직 구현하지 않는다.
//
// 대상 페이지 판별은 src/validation.js의 OPENING_PROFILES_BY_VARIANT(읽기 전용 검증에 쓰는
// 것과 동일한 requiredFrames 정의)를 그대로 재사용한다 — 페이지를 page.name 등으로
// 하드코딩하지 않고, article의 variant에 필요한 Script Label 조합으로 찾는다.
//
// 안전 검사를 통과하기 전까지는 InDesign 문서를 전혀 수정하지 않는다. 문제가 있으면 아무것도
// 쓰지 않고 Error를 던진다(호출자가 메시지를 Status/콘솔에 표시).

const indesign = require("indesign");
const app = indesign.app;
const { OPENING_PROFILES_BY_VARIANT } = require("./validation.js");
const { getLinkedFrameInfo } = require("./inspector.js");
const { resolveHeroImagePath, assertImageFileAccessible, placeHeroImage } = require("./image.js");

function getActiveDocument() {
    if (!app.activeDocument) {
        throw new Error("열려 있는 InDesign 문서가 없습니다. 문서를 먼저 열어주세요.");
    }
    return app.activeDocument;
}

function getLabel(item) {
    try {
        const label = item.label;
        return typeof label === "string" && label.length > 0 ? label : null;
    } catch (err) {
        return null;
    }
}

// 페이지의 Text Frame/Rectangle을 label별로 묶는다. 값은 실제 InDesign 객체 참조를 담는다
// (src/validation.js의 collectLabeledFrames와 달리 읽기 전용 report가 아니라 쓰기 대상을
// 찾기 위한 것이므로 live 객체를 그대로 보관한다).
function collectLiveLabeledItems(page) {
    const byLabel = {};
    const add = (label, type, item) => {
        if (!label) {
            return;
        }
        if (!byLabel[label]) {
            byLabel[label] = [];
        }
        byLabel[label].push({ type, item });
    };

    for (let i = 0; i < page.textFrames.length; i++) {
        const frame = page.textFrames.item(i);
        add(getLabel(frame), "TextFrame", frame);
    }
    for (let i = 0; i < page.rectangles.length; i++) {
        const rect = page.rectangles.item(i);
        add(getLabel(rect), "Rectangle", rect);
    }

    return byLabel;
}

function pageHasAllRequiredLabels(byLabel, requiredFrames) {
    return requiredFrames.every((req) => byLabel[req.label] && byLabel[req.label].length > 0);
}

// variant에 맞는 "시작 페이지"를 문서에서 찾고, 그 페이지의 targetLabel Script Label
// 프레임을 정확히 하나 찾아 반환한다. 아래 중 하나라도 어긋나면 문서를 건드리지 않고 Error를
// 던진다. TITLE/POINT_TEXT 등 여러 입력 기능이 공유하는 탐색 로직이다(같은 페이지 판별 기준을
// 계속 재사용하기 위함, D012 연장선):
//   - variant에 대응하는 프로필이 없음
//   - variant에 필요한 Script Label을 모두 가진 페이지가 하나도 없음 / 2개 이상임
//   - 대상 페이지에 targetLabel Script Label이 없음 / 2개 이상임 / expectedType이 아님
function findLabeledFrameForVariant(doc, variant, targetLabel, expectedType) {
    const profile = OPENING_PROFILES_BY_VARIANT[variant];
    if (!profile) {
        throw new Error(`알 수 없는 variant입니다: ${variant}`);
    }

    const matchingPages = [];
    for (let i = 0; i < doc.pages.length; i++) {
        const page = doc.pages.item(i);
        const byLabel = collectLiveLabeledItems(page);
        if (pageHasAllRequiredLabels(byLabel, profile.requiredFrames)) {
            matchingPages.push({ pageName: page.name, byLabel });
        }
    }

    const requiredLabelList = profile.requiredFrames.map((req) => req.label).join(", ");

    if (matchingPages.length === 0) {
        throw new Error(
            `variant=${variant}(${profile.label})에 필요한 Script Label(${requiredLabelList})을 ` +
                "모두 가진 페이지를 찾지 못했습니다."
        );
    }
    if (matchingPages.length > 1) {
        const pageNames = matchingPages.map((m) => m.pageName).join(", ");
        throw new Error(
            `variant=${variant}(${profile.label})에 맞는 페이지가 ${matchingPages.length}개(${pageNames}) ` +
                "발견되어 어느 페이지인지 특정할 수 없습니다."
        );
    }

    const targetPage = matchingPages[0];
    const items = targetPage.byLabel[targetLabel] || [];

    if (items.length === 0) {
        throw new Error(
            `대상 페이지(${targetPage.pageName})에서 ${targetLabel} Script Label을 가진 프레임을 찾지 못했습니다.`
        );
    }
    if (items.length > 1) {
        throw new Error(
            `대상 페이지(${targetPage.pageName})에 ${targetLabel} Script Label을 가진 프레임이 ` +
                `${items.length}개 있어 특정할 수 없습니다.`
        );
    }
    if (items[0].type !== expectedType) {
        throw new Error(
            `대상 페이지(${targetPage.pageName})의 ${targetLabel} Script Label이 ${expectedType}이 아니라 ` +
                `${items[0].type}입니다.`
        );
    }

    return items[0].item;
}

function findTitleFrameForVariant(doc, variant) {
    return findLabeledFrameForVariant(doc, variant, "TITLE", "TextFrame");
}

function findPointTextFrameForVariant(doc, variant) {
    return findLabeledFrameForVariant(doc, variant, "POINT_TEXT", "TextFrame");
}

function findBodyFrameForVariant(doc, variant) {
    return findLabeledFrameForVariant(doc, variant, "BODY", "TextFrame");
}

function findBodyColumn1FrameForVariant(doc, variant) {
    return findLabeledFrameForVariant(doc, variant, "BODY_COLUMN_1", "TextFrame");
}

function findBodyColumn2FrameForVariant(doc, variant) {
    return findLabeledFrameForVariant(doc, variant, "BODY_COLUMN_2", "TextFrame");
}

function findHeroImageFrameForVariant(doc, variant) {
    return findLabeledFrameForVariant(doc, variant, "HERO_IMAGE", "Rectangle");
}

function findHeroImageGuideFrameForVariant(doc, variant) {
    return findLabeledFrameForVariant(doc, variant, "HERO_IMAGE_GUIDE", "TextFrame");
}

// BODY_COLUMN_1 → BODY_COLUMN_2가 실제로 텍스트 스레드로 연결되어 있는지, body를 쓰기 전에
// 가능한 범위에서 확인한다. src/inspector.js의 getLinkedFrameInfo(Inspect Template에서 이미
// 실기로 확인된 nextTextFrame/previousTextFrame 읽기 로직, D010 검증 당시 사용)를 그대로
// 재사용해 정방향(BODY_COLUMN_1.nextTextFrame)과 역방향(BODY_COLUMN_2.previousTextFrame)이
// 서로를 가리키는지 label 기준으로 확인한다. src/validation.js의 checkFrameLink와 같은 기준
// (양방향 모두 연결로 확인돼야 통과)이지만, 이 함수는 report가 아니라 live 객체를 직접 읽는다.
// 확인되지 않으면 body를 BODY_COLUMN_1에 써도 BODY_COLUMN_2로 자동으로 흐른다고 보장할 수
// 없으므로 쓰기 전에 Error를 던진다.
function verifyBodyColumnsLinked(bodyColumn1Frame, bodyColumn2Frame) {
    const forwardInfo = getLinkedFrameInfo(bodyColumn1Frame, "nextTextFrame");
    const backwardInfo = getLinkedFrameInfo(bodyColumn2Frame, "previousTextFrame");

    const forwardLinked = forwardInfo.status === "linked" && forwardInfo.label === "BODY_COLUMN_2";
    const backwardLinked = backwardInfo.status === "linked" && backwardInfo.label === "BODY_COLUMN_1";

    if (!forwardLinked || !backwardLinked) {
        throw new Error(
            "BODY_COLUMN_1 → BODY_COLUMN_2 텍스트 스레드 연결을 확인하지 못했습니다 " +
                `(forward=${forwardInfo.status}, backward=${backwardInfo.status}). ` +
                "body를 BODY_COLUMN_1에 써도 BODY_COLUMN_2로 자동으로 흐르지 않을 수 있어 쓰기를 중단합니다."
        );
    }
}

// 검증을 통과한 OPENING_PAGE 기사 데이터의 title, pointText, body(, WITH_PHOTO면 heroImage)를
// TITLE/POINT_TEXT/BODY(또는 BODY_COLUMN_1)/HERO_IMAGE 프레임에 채운다. Overset 처리, 페이지
// 추가, HERO_IMAGE 프레임의 위치/크기 변경은 이 함수에서 전혀 하지 않는다(D016).
//
// articleFileNativePath: WITH_PHOTO일 때 heroImage 상대 경로를 해석하는 기준이 되는, Load
// Article로 불러온 JSON 파일 자체의 nativePath(src/data.js의 loadArticleFile 참고). WITHOUT_PHOTO
// 에서는 쓰이지 않는다.
//
// D014/D015: 이전에는 applyTitleOnly()/applyPointTextOnly()가 각각 독립된 app.doScript(=독립된
// Undo 트랜잭션)였다. 그 결과 TITLE 쓰기가 성공한 뒤 POINT_TEXT의 안전 검사가 실패하면,
// "이번 Generate 클릭은 실패했다"는 메시지와 달리 문서에는 TITLE만 반영된 부분 상태가
// 남을 수 있었다("검증 실패 시 문서를 수정하지 않는다"는 원칙이 필드 단위에서는 지켜져도
// Generate 클릭 전체 단위에서는 지켜지지 않음). 이를 막기 위해 관련된 모든 필드의 탐색(검증)을
// 모두 끝낸 뒤에만 쓰기를 시작하도록, 하나의 app.doScript 콜백 안에서
// "탐색 단계 전부 → 쓰기 단계 전부" 순서로 묶었다. BODY(D015)와 HERO_IMAGE(D017)를 추가할 때도
// 별도의 apply*Only 트랜잭션을 만들지 않고 이 흐름에 그대로 포함시켰다 — 탐색 단계에서
// 하나라도 실패하면 예외가 쓰기 단계에 도달하기 전에 발생하므로, 문서는 전혀 수정되지 않는다.
//
// D017: heroImage 파일 접근 확인(src/image.js의 assertImageFileAccessible, InDesign 문서와
// 무관한 순수 파일시스템 확인)은 doScript 밖에서 먼저 수행한다 — doScript 콜백은 지금까지처럼
// 완전히 동기 함수로 유지하고, 그 안에서 비동기 파일 확인을 하는 미검증 패턴을 피하기 위함이다.
// doScript 콜백 안에서는 HERO_IMAGE Rectangle 탐색까지만 하고, 실제 place()는 쓰기 단계에서
// TITLE/POINT_TEXT/BODY보다 먼저 실행한다 — fs 기반 사전 확인이 놓친 경우에도 place() 자체가
// 실패하면 텍스트 필드는 아직 전혀 쓰이지 않은 상태로 남기 위함이다.
async function applyOpeningPageContent(articleData, articleFileNativePath) {
    if (!articleData) {
        throw new Error("Load Article로 먼저 검증된 기사 데이터를 불러와야 합니다.");
    }
    if (articleData.templateType !== "OPENING_PAGE") {
        throw new Error(`templateType이 OPENING_PAGE가 아닙니다: ${articleData.templateType}`);
    }
    if (typeof articleData.title !== "string" || articleData.title.length === 0) {
        throw new Error("article 데이터에 title이 없습니다.");
    }
    if (typeof articleData.pointText !== "string" || articleData.pointText.length === 0) {
        throw new Error("article 데이터에 pointText가 없습니다.");
    }
    if (typeof articleData.body !== "string" || articleData.body.length === 0) {
        throw new Error("article 데이터에 body가 없습니다.");
    }

    // WITH_PHOTO의 heroImage 파일 접근 확인은 InDesign 문서를 전혀 건드리지 않는 순수 파일시스템
    // 확인이므로 doScript 밖에서 먼저 수행한다(D006 원칙의 연장 — 문서를 건드리지 않는 확인은
    // doScript로 감쌀 필요가 없다).
    let heroImageNativePath = null;
    if (articleData.variant === "WITH_PHOTO") {
        heroImageNativePath = resolveHeroImagePath(articleFileNativePath, articleData.heroImage);
        await assertImageFileAccessible(heroImageNativePath);
    }

    const doc = getActiveDocument();

    // 탐색(검증)과 쓰기를 모두 doScript 안에서 수행한다(D012의 연장 — doScript 밖에서 얻은
    // 프레임 참조를 doScript 안에서 쓰는 방식은 검증된 적이 없어 계속 피한다).
    await app.doScript(
        () => {
            // 1) 탐색/검증 단계: 이 시점까지는 문서에 아무것도 쓰지 않는다. 아래 중 하나라도
            //    실패하면 예외가 발생해 아래 쓰기 단계는 실행되지 않는다.
            const titleFrame = findTitleFrameForVariant(doc, articleData.variant);
            const pointTextFrame = findPointTextFrameForVariant(doc, articleData.variant);

            let bodyFrame = null;
            let bodyColumn1Frame = null;
            let heroImageFrame = null;
            let heroImageGuideFrame = null;

            if (articleData.variant === "WITH_PHOTO") {
                bodyFrame = findBodyFrameForVariant(doc, articleData.variant);
                heroImageFrame = findHeroImageFrameForVariant(doc, articleData.variant);
                // "대표이미지" 템플릿 제작 안내 문구 프레임(기사 데이터 필드 아님). HERO_IMAGE
                // 배치가 성공한 뒤 이 프레임의 contents만 비운다(D018) — 삭제하지 않는다.
                heroImageGuideFrame = findHeroImageGuideFrameForVariant(doc, articleData.variant);
            } else if (articleData.variant === "WITHOUT_PHOTO") {
                bodyColumn1Frame = findBodyColumn1FrameForVariant(doc, articleData.variant);
                const bodyColumn2Frame = findBodyColumn2FrameForVariant(doc, articleData.variant);
                // 두 프레임 존재/타입 확인 위에, body가 실제로 BODY_COLUMN_2까지 흐를지
                // 텍스트 스레드 연결까지 쓰기 전에 확인한다(가능한 범위에서 — D015).
                verifyBodyColumnsLinked(bodyColumn1Frame, bodyColumn2Frame);
            } else {
                // findTitleFrameForVariant가 이미 알 수 없는 variant에서 예외를 던지므로
                // 이 분기에는 도달하지 않아야 하지만, 방어적으로 남겨둔다.
                throw new Error(`알 수 없는 variant입니다: ${articleData.variant}`);
            }

            // 2) 쓰기 단계: 위 탐색/검증이 전부 성공했을 때만 실행된다. HERO_IMAGE place는
            //    가장 검증이 덜 된 동작이므로 텍스트 필드보다 먼저 실행한다 — place() 자체가
            //    실패하더라도 TITLE/POINT_TEXT/BODY는 아직 쓰이지 않은 상태로 남는다.
            if (heroImageFrame) {
                placeHeroImage(heroImageFrame, heroImageNativePath);
                // 이미지 place가 성공했을 때만(위 줄에서 예외 없이 통과했을 때만) 안내
                // 문구를 비운다 — place가 실패하면 이 줄에 도달하지 않는다.
                heroImageGuideFrame.contents = "";
            }
            titleFrame.contents = articleData.title;
            pointTextFrame.contents = articleData.pointText;
            if (bodyFrame) {
                bodyFrame.contents = articleData.body;
            } else {
                // WITHOUT_PHOTO: body는 텍스트 스레드 시작 프레임인 BODY_COLUMN_1에만 쓴다.
                // BODY_COLUMN_2는 InDesign이 텍스트 스레드를 통해 자동으로 채운다(D010).
                bodyColumn1Frame.contents = articleData.body;
            }
        },
        indesign.ScriptLanguage.JAVASCRIPT,
        [],
        indesign.UndoModes.ENTIRE_SCRIPT,
        "Generate Opening Page (Title + Point Text + Body + Hero Image)"
    );
}

module.exports = {
    applyOpeningPageContent,
};
