// UI 이벤트 바인딩과 프로그램 시작점. InDesign 제어 로직은 src/indesign.js에 위임한다.

const { addHelloText } = require("./src/indesign.js");
const { inspectDocument, formatReport } = require("./src/inspector.js");
const { validateFrameLabels, formatValidationReport } = require("./src/validation.js");

const statusText = document.getElementById("statusText");
const inspectLog = document.getElementById("inspectLog");

function setStatus(message) {
    statusText.textContent = message;
}

document.getElementById("btnLoadArticle").addEventListener("click", () => {
    // TODO: sample/article.json 로드 기능은 다음 단계에서 구현 (src/data.js)
    setStatus("Load Article: 아직 구현되지 않음");
});

document.getElementById("btnGenerate").addEventListener("click", async () => {
    try {
        setStatus("Generating...");
        await addHelloText();
        setStatus("완료: \"Hello Magazine\" 텍스트 생성됨");
    } catch (err) {
        console.error(err);
        setStatus(`오류: ${err.message}`);
    }
});

document.getElementById("btnInspect").addEventListener("click", () => {
    try {
        setStatus("Inspecting...");
        const report = inspectDocument();
        const inspectionText = formatReport(report);

        const validationResults = validateFrameLabels(report);
        const validationText = formatValidationReport(validationResults);

        const combinedText = `${inspectionText}\n\n${validationText}`;
        inspectLog.textContent = combinedText;
        console.log("[Inspect Template]\n" + combinedText);
        setStatus(`완료: 페이지 ${report.pageCount}개 분석 + Label 검증 (읽기 전용, 문서 변경 없음)`);
    } catch (err) {
        console.error(err);
        inspectLog.textContent = `오류: ${err.message}`;
        setStatus(`오류: ${err.message}`);
    }
});
