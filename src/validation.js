// Script Label(item.label) 기준으로 "시작 페이지" 템플릿에 필요한 프레임이 정확히
// 존재하는지 읽기 전용으로 검사한다. InDesign API를 직접 호출하지 않고,
// src/inspector.js의 inspectDocument()가 만든 report(문서 구조 스냅샷)만 입력으로 받는다.
// 문서를 수정하는 코드는 없다.
//
// "시작 페이지"의 실제 Script Label은 working .indd에 사용자가 InDesign에서 직접
// 부여했다(2026-09-23). 아래 규칙은 그 결과를 기준으로 작성했다.

const OPENING_WITH_PHOTO = {
    key: "OPENING_WITH_PHOTO",
    label: "시작 페이지 (사진 있음)",
    requiredFrames: [
        { label: "TITLE", expectedType: "TextFrame" },
        { label: "POINT_TEXT", expectedType: "TextFrame" },
        { label: "BODY", expectedType: "TextFrame" },
        { label: "HERO_IMAGE", expectedType: "Rectangle" },
    ],
};

const OPENING_WITHOUT_PHOTO = {
    key: "OPENING_WITHOUT_PHOTO",
    label: "시작 페이지 (사진 없음)",
    requiredFrames: [
        { label: "TITLE", expectedType: "TextFrame" },
        { label: "POINT_TEXT", expectedType: "TextFrame" },
        { label: "BODY_COLUMN_1", expectedType: "TextFrame" },
        { label: "BODY_COLUMN_2", expectedType: "TextFrame" },
    ],
};

function isRealLabel(label) {
    return Boolean(label) && label !== "(label 없음)" && !label.startsWith("(label 읽기 실패");
}

// 페이지 안의 Text Frame/Rectangle을 label별로 묶는다. { [label]: [{ type, name }] }
function collectLabeledFrames(page) {
    const byLabel = {};

    const add = (label, type, name) => {
        if (!isRealLabel(label)) {
            return;
        }
        if (!byLabel[label]) {
            byLabel[label] = [];
        }
        byLabel[label].push({ type, name: name || "(이름 없음)" });
    };

    page.textFrames.forEach((f) => add(f.label, "TextFrame", f.name));
    page.rectangles.forEach((r) => add(r.label, "Rectangle", r.name));

    return byLabel;
}

// BODY_COLUMN_1/2는 "사진 없음" 변형에만 존재하는 것으로 확인되어 우선 판별 기준으로 쓴다.
function pickProfile(byLabel) {
    if (byLabel.BODY_COLUMN_1 || byLabel.BODY_COLUMN_2) {
        return OPENING_WITHOUT_PHOTO;
    }
    if (byLabel.HERO_IMAGE || byLabel.BODY) {
        return OPENING_WITH_PHOTO;
    }
    return null;
}

function checkRequiredFrame(byLabel, requiredFrame) {
    const found = byLabel[requiredFrame.label] || [];

    let status;
    if (found.length === 0) {
        status = "누락";
    } else if (found.length > 1) {
        status = "중복";
    } else if (found[0].type !== requiredFrame.expectedType) {
        status = "타입 불일치";
    } else {
        status = "정상";
    }

    return {
        label: requiredFrame.label,
        expectedType: requiredFrame.expectedType,
        foundCount: found.length,
        foundItems: found,
        status,
    };
}

function validatePage(page) {
    const byLabel = collectLabeledFrames(page);
    const profile = pickProfile(byLabel);

    if (!profile) {
        return {
            pageIndex: page.pageIndex,
            pageName: page.pageName,
            profile: null,
            checks: [],
        };
    }

    return {
        pageIndex: page.pageIndex,
        pageName: page.pageName,
        profile,
        checks: profile.requiredFrames.map((req) => checkRequiredFrame(byLabel, req)),
    };
}

// 읽기 전용 검증. report는 src/inspector.js의 inspectDocument() 결과를 그대로 넘긴다.
function validateFrameLabels(report) {
    return report.pages.map(validatePage);
}

function formatValidationReport(results) {
    const lines = [];
    lines.push("=== Script Label 기반 프레임 검증 (읽기 전용, 문서 변경 없음) ===");

    results.forEach((result) => {
        lines.push(`--- Page index=${result.pageIndex}, name=${result.pageName} ---`);

        if (!result.profile) {
            lines.push(
                "  검사 대상 Label(TITLE/POINT_TEXT/BODY/BODY_COLUMN_1/BODY_COLUMN_2/HERO_IMAGE)이 " +
                    "이 페이지에 없음 — 시작 페이지 검증 대상이 아닌 것으로 판단하고 건너뜀"
            );
            lines.push("");
            return;
        }

        lines.push(`  판별된 유형: ${result.profile.label}`);

        result.checks.forEach((check) => {
            const mark = check.status === "정상" ? "OK" : "FAIL";
            lines.push(
                `  [${mark}] ${check.label} (기대 타입: ${check.expectedType}) - ${check.status} ` +
                    `(발견 ${check.foundCount}개)`
            );
            if (check.foundItems.length === 0) {
                lines.push("      (해당 Label을 가진 프레임 없음)");
            } else {
                check.foundItems.forEach((item) => {
                    lines.push(`      - ${item.type}, name=${item.name}`);
                });
            }
        });

        const failCount = result.checks.filter((c) => c.status !== "정상").length;
        lines.push(failCount === 0 ? "  결과: 모두 정상" : `  결과: ${failCount}건 문제 발견`);
        lines.push("");
    });

    return lines.join("\n");
}

module.exports = {
    validateFrameLabels,
    formatValidationReport,
};
