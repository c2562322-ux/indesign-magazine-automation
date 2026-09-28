// UI 이벤트 바인딩과 프로그램 시작점. InDesign 제어 로직은 src/text.js, src/inspector.js 등에 위임한다.

const { inspectDocument, formatReport, inspectActivePage, formatActivePageReport } = require("./src/inspector.js");
const {
    validateFrameLabels,
    formatValidationReport,
    validateArticleData,
    formatArticleValidationReport,
} = require("./src/validation.js");
const { loadArticleFile } = require("./src/data.js");
const { applyOpeningPageContent } = require("./src/text.js");

const statusText = document.getElementById("statusText");
const inspectLog = document.getElementById("inspectLog");
const articleFileName = document.getElementById("articleFileName");
const articleLog = document.getElementById("articleLog");

// 검증을 통과한 기사 데이터만 메모리에 보관한다.
let currentArticleData = null;
// 검증을 통과한 JSON 파일 자체의 nativePath. WITH_PHOTO의 heroImage 상대 경로를 이 파일이
// 있는 폴더 기준으로 해석할 때 쓴다(src/image.js의 resolveHeroImagePath). articleData와
// 별개의 앱 상태로 관리한다 — JSON 데이터 계약 자체에는 포함되지 않는다.
let currentArticleFileNativePath = null;

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
            currentArticleFileNativePath = null;
            articleFileName.textContent = loadResult.fileName ? `${loadResult.fileName} (읽기 실패)` : "(읽기 실패)";
            articleLog.textContent = `파일 읽기 실패: ${loadResult.message}`;
            setStatus(`Load Article 오류 (파일 읽기 실패): ${loadResult.message}`);
            return;
        }

        if (loadResult.status === "parse-error") {
            currentArticleData = null;
            currentArticleFileNativePath = null;
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
            currentArticleFileNativePath = loadResult.fileNativePath;
            articleFileName.textContent = `${loadResult.fileName} (검증 통과)`;
            setStatus(
                `Load Article 완료: ${loadResult.fileName} — templateType=${validation.templateType}, ` +
                    `variant=${validation.variant}, 검증 통과`
            );
        } else {
            currentArticleData = null;
            currentArticleFileNativePath = null;
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
        currentArticleFileNativePath = null;
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
        // TITLE/POINT_TEXT/BODY(또는 BODY_COLUMN_1)/HERO_IMAGE(WITH_PHOTO만) 대상
        // 페이지·프레임 탐색(검증)을 모두 마친 뒤에만 실제 쓰기를 시작한다
        // (applyOpeningPageContent 내부에서 하나의 doScript로 처리, D014/D015/D017).
        // 탐색 중 하나라도 실패하면 어느 것도 쓰이지 않는다.
        setStatus("Generate: TITLE + POINT_TEXT + BODY (+ HERO_IMAGE) 검증 및 입력 중...");
        await applyOpeningPageContent(currentArticleData, currentArticleFileNativePath);

        const heroImageNote = currentArticleData.variant === "WITH_PHOTO" ? ", HERO_IMAGE 배치됨" : "";
        setStatus(
            `Generate 완료: TITLE="${currentArticleData.title}", POINT_TEXT="${currentArticleData.pointText}", ` +
                `BODY 입력됨(${currentArticleData.body.length}자)${heroImageNote} (variant=${currentArticleData.variant})`
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
        inspectLog.value = combinedText;
        console.log("[Inspect Template]\n" + combinedText);
        setStatus(`완료: 페이지 ${report.pageCount}개 분석 + Label 검증 (읽기 전용, 문서 변경 없음)`);
    } catch (err) {
        console.error(err);
        inspectLog.value = `오류: ${err.message}`;
        setStatus(`오류: ${err.message}`);
    }
});

// 전체 문서가 아니라 현재 InDesign에서 보고 있는 페이지 하나만 읽기 전용으로 분석한다
// (btnInspect와 완전히 별개 경로, 위 handler는 전혀 수정하지 않았다). 현재 페이지를 확인하지
// 못하면 다른 페이지를 대신 보여주지 않고 실패 사유만 표시한다.
document.getElementById("btnInspectCurrentPage").addEventListener("click", () => {
    try {
        setStatus("Inspecting current page...");
        const result = inspectActivePage();
        const text = formatActivePageReport(result);
        inspectLog.value = text;
        console.log("[Inspect Current Page]\n" + text);

        if (result.ok) {
            setStatus("완료: 현재 페이지 분석 (읽기 전용, 문서 변경 없음)");
        } else {
            setStatus(`Inspect Current Page 중단: ${result.message}`);
        }
    } catch (err) {
        console.error(err);
        inspectLog.value = `오류: ${err.message}`;
        setStatus(`오류: ${err.message}`);
    }
});

// Inspection Log 전체 문자열을 클립보드로 복사한다. UXP 공식 클립보드 API
// (navigator.clipboard.setContent, MIME 타입 키 객체 — 브라우저의 navigator.clipboard.
// writeText()와는 다른 UXP 전용 인터페이스, manifest.json의 "clipboard": "readAndWrite"
// 권한 필요)를 1차로 시도한다. 이 프로젝트에서 클립보드 API를 쓰는 것은 이번이 처음이고,
// InDesign 최소 버전(manifest.json minVersion 17.0)에서 실제 지원되는지는 Adobe 공식 문서도
// "호스트 앱마다 다르니 릴리스 노트를 확인하라"고만 되어 있어 미검증이다 — 실패하면 임시
// textarea + document.execCommand("copy")(Chromium 기반 웹뷰에서 폭넓게 동작하는 구식
// 방식)로 대체한다. Inspector의 조회/판별 로직(D021~D023)은 전혀 건드리지 않는다 — 이미
// 화면에 표시된 inspectLog.value(전체 문자열, 스크롤로 안 보이는 부분 포함)를 읽기만 한다.
async function copyTextToClipboard(text) {
    if (navigator.clipboard && typeof navigator.clipboard.setContent === "function") {
        try {
            await navigator.clipboard.setContent({ "text/plain": text });
            return true;
        } catch (err) {
            console.error(err);
        }
    }

    try {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const copied = document.execCommand("copy");
        document.body.removeChild(textarea);
        return copied;
    } catch (err) {
        console.error(err);
        return false;
    }
}

document.getElementById("btnCopyInspectLog").addEventListener("click", async () => {
    const text = inspectLog.value;
    if (!text || text.trim().length === 0) {
        setStatus("복사할 Inspection Log가 없습니다.");
        return;
    }

    const copied = await copyTextToClipboard(text);
    setStatus(
        copied
            ? "완료: Inspection Log를 클립보드에 복사했습니다."
            : "Inspection Log 복사 실패: 이 환경에서 클립보드 복사가 지원되지 않는 것 같습니다."
    );
});
