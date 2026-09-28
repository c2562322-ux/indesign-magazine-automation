// 검증된 기사 데이터를 InDesign 텍스트 프레임에 실제로 채워 넣는 모듈.
// 지금까지 TITLE, POINT_TEXT를 다룬다(applyTitleAndPointText, 하나의 doScript로 통합
// — D014) — BODY/BODY_COLUMN_1/BODY_COLUMN_2 입력과 HERO_IMAGE 이미지 배치는 아직
// 구현하지 않는다 (다음 단계).
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

// 검증을 통과한 OPENING_PAGE 기사 데이터의 title과 pointText를 TITLE/POINT_TEXT 프레임에
// 채운다. BODY/BODY_COLUMN_1/BODY_COLUMN_2/HERO_IMAGE는 이 함수에서 전혀 건드리지 않는다.
//
// D014: 이전에는 applyTitleOnly()/applyPointTextOnly()가 각각 독립된 app.doScript(=독립된
// Undo 트랜잭션)였다. 그 결과 TITLE 쓰기가 성공한 뒤 POINT_TEXT의 안전 검사가 실패하면,
// "이번 Generate 클릭은 실패했다"는 메시지와 달리 문서에는 TITLE만 반영된 부분 상태가
// 남을 수 있었다("검증 실패 시 문서를 수정하지 않는다"는 원칙이 필드 단위에서는 지켜져도
// Generate 클릭 전체 단위에서는 지켜지지 않음). 이를 막기 위해 TITLE/POINT_TEXT 두 필드의
// 탐색(검증)을 모두 끝낸 뒤에만 두 필드의 쓰기를 시작하도록, 하나의 app.doScript 콜백 안에서
// "탐색 단계 전부 → 쓰기 단계 전부" 순서로 묶었다. 탐색 단계에서 하나라도 실패하면 예외가
// 쓰기 단계에 도달하기 전에 발생하므로, 문서는 전혀 수정되지 않는다.
async function applyTitleAndPointText(articleData) {
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

    const doc = getActiveDocument();

    // 탐색(검증)과 쓰기를 모두 doScript 안에서 수행한다(D012의 연장 — doScript 밖에서 얻은
    // 프레임 참조를 doScript 안에서 쓰는 방식은 검증된 적이 없어 계속 피한다).
    await app.doScript(
        () => {
            // 1) 탐색/검증 단계: 이 시점까지는 문서에 아무것도 쓰지 않는다. 둘 중 하나라도
            //    findLabeledFrameForVariant가 던지면 아래 쓰기 단계는 실행되지 않는다.
            const titleFrame = findTitleFrameForVariant(doc, articleData.variant);
            const pointTextFrame = findPointTextFrameForVariant(doc, articleData.variant);

            // 2) 쓰기 단계: 위 탐색이 둘 다 성공했을 때만 실행된다.
            titleFrame.contents = articleData.title;
            pointTextFrame.contents = articleData.pointText;
        },
        indesign.ScriptLanguage.JAVASCRIPT,
        [],
        indesign.UndoModes.ENTIRE_SCRIPT,
        "Generate Opening Page (Title + Point Text)"
    );
}

module.exports = {
    applyTitleAndPointText,
};
