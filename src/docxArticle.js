// Word(.docx) 원고 파일에서 마커([TITLE]/[POINT_TEXT]/[BODY]/[HERO_IMAGE])로 구획된
// 내용을 읽어 기존 JSON과 동일한 Article Data 구조로 변환하는 모듈이다(D019).
//
// InDesign 문서/프레임은 전혀 건드리지 않는다 — 순수 데이터 변환만 담당한다. 이 모듈이
// 만든 결과는 기존 src/validation.js의 validateArticleData()로 그대로 검증되고,
// src/text.js의 applyOpeningPageContent()로 그대로 흘러간다 — 둘 다 전혀 수정하지 않았다.
//
// 이번 MVP 범위: OPENING_PAGE/WITH_PHOTO 고정, 서식(굵게/기울임 등)은 무시하고 텍스트
// 내용만 추출, HWP/HWPX/Excel/Template Selection 자동화는 다루지 않는다.

const { readZipEntry, utf8BytesToString } = require("./docxZip.js");

const MARKER_FIELD_MAP = {
    TITLE: "title",
    POINT_TEXT: "pointText",
    BODY: "body",
    HERO_IMAGE: "heroImage",
};

function unescapeXmlEntities(text) {
    return text
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
        .replace(/&amp;/g, "&"); // 다른 엔티티가 다시 풀리는 걸 막기 위해 &amp;는 마지막에 처리
}

// word/document.xml의 문단(<w:p>)마다 그 안의 <w:t> 텍스트를 이어붙이고, 문단 사이는
// 줄바꿈(\n)으로 구분한 일반 텍스트로 만든다. 서식/표/각주 등은 다루지 않는 최소 구현이며,
// 전체 XML을 파싱하지 않고 필요한 태그만 정규식으로 뽑아낸다.
//
// InDesign TextFrame.contents에 이 결과의 줄바꿈(\n)을 그대로 대입했을 때 실제로 별도
// 문단으로 나뉘어 보이는지(문단 구분 vs 줄 안 개행)는 이 프로젝트에서 아직 실기로 확인된
// 적이 없다 — 실제 InDesign 테스트에서 육안으로 확인이 필요하다.
function extractTextFromDocumentXml(xmlText) {
    // 빈 문단은 자체 닫힘 형태(<w:p/>)나 여닫힘 형태(<w:p></w:p>) 둘 다로 나타날 수 있어
    // 두 형태 모두 매칭한다(실제 Word는 보통 후자를 쓰지만, 방어적으로 둘 다 처리한다).
    const paragraphMatches = xmlText.match(/<w:p(?:\s[^>]*)?\/>|<w:p[ >][\s\S]*?<\/w:p>/g) || [];

    const paragraphs = paragraphMatches.map((paragraphXml) => {
        const textTagMatches = paragraphXml.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [];
        return textTagMatches
            .map((tagMatch) => {
                const innerMatch = tagMatch.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/);
                return innerMatch ? unescapeXmlEntities(innerMatch[1]) : "";
            })
            .join("");
    });

    return paragraphs.join("\n");
}

// 마커로 구획된 일반 텍스트를 파싱해 OPENING_PAGE/WITH_PHOTO Article Data로 만든다.
// 마커 줄은 앞뒤 공백을 허용한다(예: "[ TITLE ]", "[BODY]" 모두 인식). 네 마커 모두
// 존재하고 내용이 비어 있지 않아야 한다 — 하나라도 없으면 Error를 던진다(호출자가
// Status/콘솔에 표시하며, 이 시점까지 InDesign 문서는 전혀 건드리지 않는다).
function parseArticleFromMarkedText(plainText) {
    const lines = plainText.split("\n");
    const markerPattern = /^\[\s*(TITLE|POINT_TEXT|BODY|HERO_IMAGE)\s*\]$/;

    const sections = {};
    let currentField = null;
    let currentLines = [];

    const flushCurrent = () => {
        if (currentField) {
            sections[currentField] = currentLines.join("\n").trim();
        }
    };

    for (const rawLine of lines) {
        const trimmedLine = rawLine.trim();
        const markerMatch = trimmedLine.match(markerPattern);
        if (markerMatch) {
            flushCurrent();
            currentField = MARKER_FIELD_MAP[markerMatch[1]];
            currentLines = [];
        } else if (currentField) {
            currentLines.push(rawLine);
        }
    }
    flushCurrent();

    const requiredFields = ["title", "pointText", "body", "heroImage"];
    const missingFields = requiredFields.filter((field) => !sections[field]);
    if (missingFields.length > 0) {
        throw new Error(
            `DOCX에서 다음 마커(또는 그 안의 내용)를 찾지 못했습니다: ${missingFields.join(", ")}`
        );
    }

    return {
        templateType: "OPENING_PAGE",
        variant: "WITH_PHOTO",
        title: sections.title,
        pointText: sections.pointText,
        body: sections.body,
        heroImage: sections.heroImage,
    };
}

// .docx 파일의 원본 바이트(ArrayBuffer)를 받아 Article Data로 변환한다. word/document.xml을
// 찾지 못하거나(올바른 .docx가 아님), 마커를 찾지 못하면 Error를 던진다.
function parseDocxToArticleData(docxArrayBuffer) {
    const documentXmlBytes = readZipEntry(docxArrayBuffer, "word/document.xml");
    const xmlText = utf8BytesToString(documentXmlBytes);
    const plainText = extractTextFromDocumentXml(xmlText);
    return parseArticleFromMarkedText(plainText);
}

module.exports = {
    parseDocxToArticleData,
    extractTextFromDocumentXml,
    parseArticleFromMarkedText,
};
