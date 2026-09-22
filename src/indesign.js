// InDesign document, page, frame 등 DOM 접근 및 제어를 전담하는 모듈.
// UI 로직(index.js)은 이 모듈의 함수만 호출하고, InDesign API를 직접 다루지 않는다.

const indesign = require("indesign");
const app = indesign.app;

function getActiveDocument() {
    if (!app.activeDocument) {
        throw new Error("열려 있는 InDesign 문서가 없습니다. 문서를 먼저 열어주세요.");
    }
    return app.activeDocument;
}

// MVP 동작 확인용: 현재 문서 첫 페이지에 "Hello Magazine" 텍스트 프레임을 생성한다.
async function addHelloText() {
    const doc = getActiveDocument();

    await app.doScript(
        () => {
            const page = doc.pages.item(0);
            const frame = page.textFrames.add();
            frame.geometricBounds = [72, 72, 200, 300];
            frame.contents = "Hello Magazine";
        },
        indesign.ScriptLanguage.JAVASCRIPT,
        [],
        indesign.UndoModes.ENTIRE_SCRIPT,
        "Add Hello Magazine Text"
    );
}

module.exports = {
    getActiveDocument,
    addHelloText,
};
