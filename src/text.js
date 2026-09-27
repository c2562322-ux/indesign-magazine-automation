// 검증된 기사 데이터를 InDesign 텍스트 프레임에 실제로 채워 넣는 모듈.
// 지금까지 TITLE, POINT_TEXT를 다룬다 — BODY/BODY_COLUMN_1/BODY_COLUMN_2 입력과
// HERO_IMAGE 이미지 배치는 아직 구현하지 않는다 (다음 단계).
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

// 검증을 통과한 OPENING_PAGE 기사 데이터의 title만 TITLE 프레임에 채운다.
// POINT_TEXT/BODY/BODY_COLUMN_1/BODY_COLUMN_2/HERO_IMAGE는 이 함수에서 전혀 건드리지 않는다.
async function applyTitleOnly(articleData) {
    if (!articleData) {
        throw new Error("Load Article로 먼저 검증된 기사 데이터를 불러와야 합니다.");
    }
    if (articleData.templateType !== "OPENING_PAGE") {
        throw new Error(`templateType이 OPENING_PAGE가 아닙니다: ${articleData.templateType}`);
    }
    if (typeof articleData.title !== "string" || articleData.title.length === 0) {
        throw new Error("article 데이터에 title이 없습니다.");
    }

    const doc = getActiveDocument();

    // 대상 페이지/프레임 탐색과 실제 쓰기를 모두 doScript 안에서 수행한다. 탐색을 doScript
    // 밖에서 먼저 하고 찾은 참조를 doScript 안에서 쓰는 방식은 이 UXP 환경에서 검증된 적이
    // 없어, 미검증 API 경계를 하나라도 줄이기 위해 이렇게 묶었다.
    await app.doScript(
        () => {
            const titleFrame = findTitleFrameForVariant(doc, articleData.variant);
            titleFrame.contents = articleData.title;
        },
        indesign.ScriptLanguage.JAVASCRIPT,
        [],
        indesign.UndoModes.ENTIRE_SCRIPT,
        "Apply Title to Opening Page"
    );
}

// 검증을 통과한 OPENING_PAGE 기사 데이터의 pointText만 POINT_TEXT 프레임에 채운다.
// applyTitleOnly와 완전히 같은 패턴(검사 → doScript 안에서 탐색+쓰기)이며, TITLE/BODY 등
// 다른 필드는 이 함수에서 전혀 건드리지 않는다.
async function applyPointTextOnly(articleData) {
    if (!articleData) {
        throw new Error("Load Article로 먼저 검증된 기사 데이터를 불러와야 합니다.");
    }
    if (articleData.templateType !== "OPENING_PAGE") {
        throw new Error(`templateType이 OPENING_PAGE가 아닙니다: ${articleData.templateType}`);
    }
    if (typeof articleData.pointText !== "string" || articleData.pointText.length === 0) {
        throw new Error("article 데이터에 pointText가 없습니다.");
    }

    const doc = getActiveDocument();

    await app.doScript(
        () => {
            const pointTextFrame = findPointTextFrameForVariant(doc, articleData.variant);
            pointTextFrame.contents = articleData.pointText;
        },
        indesign.ScriptLanguage.JAVASCRIPT,
        [],
        indesign.UndoModes.ENTIRE_SCRIPT,
        "Apply Point Text to Opening Page"
    );
}

module.exports = {
    applyTitleOnly,
    applyPointTextOnly,
};
