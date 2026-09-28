// 기사 데이터 파일(JSON 또는 Word .docx)을 선택해서 읽어오는 기능을 담당한다.
// InDesign 문서는 전혀 건드리지 않는다 — "indesign" 모듈이 아니라 UXP 플랫폼 공통 파일 시스템
// API(require("uxp").storage)만 사용한다.
//
// require("uxp").storage.localFileSystem.getFileForOpening() / Entry.read()는 Adobe UXP
// 공식 문서에 있는 표준 API이지만, 이 프로젝트에서 "uxp" 모듈을 실제로 호출하는 것은 이번이
// 처음이라 이 InDesign UXP 환경에서 문서와 동일하게 동작하는지는 아직 검증되지 않았다.
// getFileForOpening()의 파일 형식 필터(types 옵션)는 InDesign UXP에서 정확히 어떤 형태를
// 기대하는지 확인되지 않아 생략했다 — 대신 사용자가 아무 파일이나 선택할 수 있고, 파일
// 확장자로 JSON/DOCX를 구분한 뒤 각각의 파싱 단계에서 오류로 처리된다.
//
// D019: 파일 확장자가 ".docx"이면 Word 입력 계층(src/docxArticle.js)으로 분기한다. 이 분기는
// 기존 JSON 경로(로직 변경 없음)와 나란히 존재하며, 최종적으로 같은 반환 형태({status,
// fileName, fileNativePath, data})로 합쳐져 index.js/validation.js는 전혀 수정하지 않아도
// 된다 — Word/JSON 모두 같은 Article Data 구조로 검증되고 같은 Generate 로직으로 흘러간다.

const uxp = require("uxp");
const localFileSystem = uxp.storage.localFileSystem;
const { parseDocxToArticleData } = require("./docxArticle.js");

function getLowerCaseExtension(fileName) {
    const lastDot = fileName.lastIndexOf(".");
    return lastDot === -1 ? "" : fileName.slice(lastDot).toLowerCase();
}

// 사용자가 파일을 선택하면 읽어서 파싱까지 시도한다. InDesign 문서는 전혀 건드리지 않는다.
// 반환값의 status:
//   "cancelled"   - 사용자가 파일 선택을 취소함
//   "read-error"  - 파일 선택 또는 읽기 자체가 실패함 (message에 상세 내용)
//   "parse-error" - 파일은 읽었지만 JSON 문법/DOCX 구조/마커가 잘못됨 (message에 상세 내용)
//   "loaded"      - 정상적으로 읽고 파싱함 (data에 파싱된 객체)
async function loadArticleFile() {
    let file;
    try {
        file = await localFileSystem.getFileForOpening();
    } catch (err) {
        return { status: "read-error", fileName: null, message: `파일 선택 실패: ${err.message}` };
    }

    if (!file) {
        return { status: "cancelled" };
    }

    const isDocx = getLowerCaseExtension(file.name) === ".docx";

    let data;
    if (isDocx) {
        let docxArrayBuffer;
        try {
            docxArrayBuffer = await file.read({ format: uxp.storage.formats.binary });
        } catch (err) {
            return { status: "read-error", fileName: file.name, message: err.message };
        }

        try {
            data = parseDocxToArticleData(docxArrayBuffer);
        } catch (err) {
            return { status: "parse-error", fileName: file.name, message: err.message };
        }
    } else {
        let rawText;
        try {
            rawText = await file.read();
        } catch (err) {
            return { status: "read-error", fileName: file.name, message: err.message };
        }

        try {
            data = JSON.parse(rawText);
        } catch (err) {
            return { status: "parse-error", fileName: file.name, message: err.message };
        }
    }

    // fileNativePath: heroImage 같은 상대 경로를 이 원고 파일(JSON 또는 DOCX)이 있는 폴더
    // 기준으로 해석할 때 쓴다(src/image.js의 resolveHeroImagePath). file.nativePath는 UXP
    // Entry의 표준 속성이다.
    return { status: "loaded", fileName: file.name, fileNativePath: file.nativePath, data };
}

module.exports = {
    loadArticleFile,
};
