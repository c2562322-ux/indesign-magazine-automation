// UI 이벤트 바인딩과 프로그램 시작점. InDesign 제어 로직은 src/indesign.js에 위임한다.

const { inspectDocument, formatReport } = require("./src/inspector.js");
const {
    validateFrameLabels,
    formatValidationReport,
    validateArticleData,
    formatArticleValidationReport,
} = require("./src/validation.js");
const { loadArticleFile } = require("./src/data.js");
const { applyTitleOnly } = require("./src/text.js");

const statusText = document.getElementById("statusText");
const inspectLog = document.getElementById("inspectLog");
const articleFileName = document.getElementById("articleFileName");
const articleLog = document.getElementById("articleLog");

// 검증을 통과한 기사 데이터만 메모리에 보관한다. 아직 Generate 등 다른 기능과 연결하지 않는다.
let currentArticleData = null;

function setStatus(message) {
    statusText.textContent = message;
}

document.getElementById("btnLoadArticle").addEventListener("click", async () => {
    try {
        setStatus("Load Article: 파일 선택 중...");
        const loadResult = await loadArticleFile();

        if (loadResult.status === "cancelled") {
            setStatus("Load Article: 파일 선택이 취소되었습니다.");
            return;
        }

        if (loadResult.status === "read-error") {
            currentArticleData = null;
            articleFileName.textContent = loadResult.fileName ? `${loadResult.fileName} (읽기 실패)` : "(읽기 실패)";
            articleLog.textContent = `파일 읽기 실패: ${loadResult.message}`;
            setStatus(`Load Article 오류 (파일 읽기 실패): ${loadResult.message}`);
            return;
        }

        if (loadResult.status === "parse-error") {
            currentArticleData = null;
            articleFileName.textContent = `${loadResult.fileName} (JSON 문법 오류)`;
            articleLog.textContent = `JSON 문법 오류: ${loadResult.message}`;
            setStatus(`Load Article 오류 (JSON 문법 오류): ${loadResult.fileName}`);
            return;
        }

        // loadResult.status === "loaded"
        const validation = validateArticleData(loadResult.data);
        const reportText = formatArticleValidationReport(loadResult.fileName, validation);
        articleLog.textContent = reportText;
        console.log("[Load Article]\n" + reportText);

        if (validation.ok) {
            currentArticleData = loadResult.data;
            articleFileName.textContent = `${loadResult.fileName} (검증 통과)`;
            setStatus(
                `Load Article 완료: ${loadResult.fileName} — templateType=${validation.templateType}, ` +
                    `variant=${validation.variant}, 검증 통과`
            );
        } else {
            currentArticleData = null;
            const failedFields = validation.checks
                .filter((c) => c.status !== "정상")
                .map((c) => c.field)
                .join(", ");
            articleFileName.textContent = `${loadResult.fileName} (검증 실패)`;
            setStatus(`Load Article 오류: 검증 실패 — 문제 필드: ${failedFields}`);
        }
    } catch (err) {
        console.error(err);
        currentArticleData = null;
        setStatus(`Load Article 오류: ${err.message}`);
    }
});

document.getElementById("btnGenerate").addEventListener("click", async () => {
    // 안전 검사 1: Load Article로 검증을 통과한 데이터가 없으면 아무것도 하지 않는다.
    if (!currentArticleData) {
        setStatus("Generate 중단: 먼저 Load Article로 기사 데이터를 불러와 검증을 통과해야 합니다.");
        return;
    }

    try {
        setStatus("Generate: TITLE 입력 중...");
        // 대상 페이지 탐색, TITLE 프레임 존재/개수/타입 검사는 applyTitleOnly 내부에서 수행하며,
        // 문제가 있으면 문서를 수정하지 않고 Error를 던진다. 이번 단계는 title 하나만 다룬다.
        await applyTitleOnly(currentArticleData);
        setStatus(
            `Generate 완료: TITLE에 "${currentArticleData.title}" 입력됨 ` +
                `(variant=${currentArticleData.variant})`
        );
    } catch (err) {
        console.error(err);
        setStatus(`Generate 중단: ${err.message}`);
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
