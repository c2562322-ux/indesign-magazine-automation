// 현재 열린 InDesign 문서의 구조를 읽기 전용으로 분석한다. 문서를 절대 수정하지 않는다
// (app.doScript로 감싸지 않는 이유는 DECISIONS.md D006 참고).
//
// 아래에서 사용하는 InDesign DOM 속성(pages, pageItems, textFrames, rectangles, images,
// paragraphStyles, objectStyles, constructor.name 등)은 classic InDesign Scripting DOM
// 기준으로 작성했으며, 실제 InDesign UXP 환경에서 동일하게 동작하는지 검증되지 않았다.
// (HANDOFF.md "알려진 문제" 참고)

const indesign = require("indesign");
const app = indesign.app;

function getActiveDocument() {
    if (!app.activeDocument) {
        throw new Error("열려 있는 InDesign 문서가 없습니다. 문서를 먼저 열어주세요.");
    }
    return app.activeDocument;
}

function describePageItem(item) {
    const name = item.name && item.name.length > 0 ? item.name : null;
    const type = item.constructor && item.constructor.name ? item.constructor.name : "알 수 없음";
    return name ? `${name} (${type})` : `이름 없음 (type: ${type})`;
}

function inspectPage(page) {
    const textFrames = [];
    for (let i = 0; i < page.textFrames.length; i++) {
        textFrames.push(describePageItem(page.textFrames.item(i)));
    }

    const rectangles = [];
    for (let i = 0; i < page.rectangles.length; i++) {
        const rect = page.rectangles.item(i);
        const imageCount = rect.images ? rect.images.length : 0;
        rectangles.push({
            label: describePageItem(rect),
            imageCount,
        });
    }

    return {
        pageName: page.name,
        pageItemCount: page.pageItems.length,
        textFrames,
        rectangles,
    };
}

// 읽기 전용 분석 결과. 문서를 수정하지 않으므로 app.doScript로 감싸지 않는다.
function inspectDocument() {
    const doc = getActiveDocument();

    const pages = [];
    for (let i = 0; i < doc.pages.length; i++) {
        pages.push(inspectPage(doc.pages.item(i)));
    }

    const paragraphStyleNames = [];
    for (let i = 0; i < doc.paragraphStyles.length; i++) {
        paragraphStyleNames.push(doc.paragraphStyles.item(i).name);
    }

    const objectStyleNames = [];
    for (let i = 0; i < doc.objectStyles.length; i++) {
        objectStyleNames.push(doc.objectStyles.item(i).name);
    }

    return {
        documentName: doc.name,
        pageCount: doc.pages.length,
        pages,
        paragraphStyleNames,
        objectStyleNames,
    };
}

function formatReport(report) {
    const lines = [];
    lines.push(`문서: ${report.documentName}`);
    lines.push(`전체 페이지 수: ${report.pageCount}`);
    lines.push(
        "(참고: 아래 목록은 Text Frame / Rectangle만 개별적으로 나열합니다. Group으로 묶인 개체는 " +
            "pageItems에 최상위 항목으로 잡히지 않아 이 버전에서는 분석되지 않습니다.)"
    );
    lines.push("");

    report.pages.forEach((page) => {
        lines.push(`--- Page ${page.pageName} ---`);
        lines.push(`Page Item 수 (전체 타입 포함): ${page.pageItemCount}`);

        lines.push(`Text Frame (${page.textFrames.length}개):`);
        if (page.textFrames.length === 0) {
            lines.push("  (없음)");
        } else {
            page.textFrames.forEach((t) => lines.push(`  - ${t}`));
        }

        lines.push(`Rectangle / 이미지 프레임 (${page.rectangles.length}개):`);
        if (page.rectangles.length === 0) {
            lines.push("  (없음)");
        } else {
            page.rectangles.forEach((r) => {
                const imageInfo = r.imageCount > 0 ? `이미지 ${r.imageCount}개` : "이미지 없음";
                lines.push(`  - ${r.label} - ${imageInfo}`);
            });
        }

        lines.push("");
    });

    lines.push(
        `사용 가능한 Paragraph Style (${report.paragraphStyleNames.length}개, 스타일 그룹 내부는 ` +
            "포함되지 않을 수 있음):"
    );
    report.paragraphStyleNames.forEach((name) => lines.push(`  - ${name}`));
    lines.push("");

    lines.push(
        `사용 가능한 Object Style (${report.objectStyleNames.length}개, 스타일 그룹 내부는 ` +
            "포함되지 않을 수 있음):"
    );
    report.objectStyleNames.forEach((name) => lines.push(`  - ${name}`));

    return lines.join("\n");
}

module.exports = {
    inspectDocument,
    formatReport,
};
