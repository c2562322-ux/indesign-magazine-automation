// 두 가지 읽기 전용 검증을 담당한다. 문서를 수정하는 코드는 없다.
//
// 1) Script Label(item.label) 기준으로 "시작 페이지" 템플릿에 필요한 프레임이 정확히
//    존재하는지 검사한다. InDesign API를 직접 호출하지 않고, src/inspector.js의
//    inspectDocument()가 만든 report(문서 구조 스냅샷)만 입력으로 받는다.
//    "시작 페이지"의 실제 Script Label은 working .indd에 사용자가 InDesign에서 직접
//    부여했다(2026-09-23). 아래 규칙은 그 결과를 기준으로 작성했다.
//
// 2) 기사 JSON 데이터(OPENING_PAGE)가 docs/ARTICLE_DATA_SPEC.md 계약을 만족하는지 검사한다
//    (파일 아래쪽 validateArticleData). InDesign API와 무관한 순수 데이터 검증이다.

const OPENING_WITH_PHOTO = {
    key: "OPENING_WITH_PHOTO",
    label: "시작 페이지 (사진 있음)",
    requiredFrames: [
        { label: "TITLE", expectedType: "TextFrame" },
        { label: "POINT_TEXT", expectedType: "TextFrame" },
        { label: "BODY", expectedType: "TextFrame" },
        { label: "HERO_IMAGE", expectedType: "Rectangle" },
    ],
    linkChecks: [],
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
    // BODY_COLUMN_1 → BODY_COLUMN_2가 텍스트 스레드로 실제 연결돼 있는지 확인한다.
    // (InDesign UI에서 연결선이 안 보인다는 보고가 있어 읽기 전용으로 직접 확인하기 위해 추가)
    linkChecks: [
        { fromLabel: "BODY_COLUMN_1", toLabel: "BODY_COLUMN_2", description: "본문 왼쪽 단 → 오른쪽 단 텍스트 스레드 연결" },
    ],
};

// variant 문자열("WITH_PHOTO"/"WITHOUT_PHOTO") → 프로필. src/text.js가 자동조판 시
// "이 variant에는 어떤 Script Label이 필요한가"를 판단할 때 이 프로필을 그대로 재사용한다
// — 읽기 전용 검증과 실제 쓰기 대상 페이지 판별이 같은 기준(requiredFrames)을 쓰도록 하기 위함.
const OPENING_PROFILES_BY_VARIANT = {
    WITH_PHOTO: OPENING_WITH_PHOTO,
    WITHOUT_PHOTO: OPENING_WITHOUT_PHOTO,
};

function isRealLabel(label) {
    return Boolean(label) && label !== "(label 없음)" && !label.startsWith("(label 읽기 실패");
}

// 페이지 안의 Text Frame/Rectangle을 label별로 묶는다.
// { [label]: [{ type, name, previousFrame?, nextFrame? }] }
// previousFrame/nextFrame은 Text Frame에만 있으며 src/inspector.js의 getLinkedFrameInfo() 결과를 그대로 옮긴 것이다.
function collectLabeledFrames(page) {
    const byLabel = {};

    const add = (label, type, name, extra) => {
        if (!isRealLabel(label)) {
            return;
        }
        if (!byLabel[label]) {
            byLabel[label] = [];
        }
        byLabel[label].push({ type, name: name || "(이름 없음)", ...extra });
    };

    page.textFrames.forEach((f) =>
        add(f.label, "TextFrame", f.name, { previousFrame: f.previousFrame, nextFrame: f.nextFrame })
    );
    page.rectangles.forEach((r) => add(r.label, "Rectangle", r.name, {}));

    return byLabel;
}

function describeLinkInfo(info) {
    if (!info) {
        return "(정보 없음)";
    }
    if (info.status === "none") {
        return "연결 없음";
    }
    if (info.status === "error") {
        return `읽기 실패: ${info.message}`;
    }
    return info.name ? `label=${info.label}, name=${info.name}` : `label=${info.label}`;
}

// fromLabel 프레임의 nextTextFrame이 toLabel 프레임을 가리키는지, toLabel 프레임의
// previousTextFrame이 fromLabel 프레임을 가리키는지 label 기준으로 확인한다(읽기 전용).
function checkFrameLink(byLabel, linkCheck) {
    const fromItems = byLabel[linkCheck.fromLabel] || [];
    const toItems = byLabel[linkCheck.toLabel] || [];

    if (fromItems.length !== 1 || toItems.length !== 1) {
        return {
            description: linkCheck.description,
            fromLabel: linkCheck.fromLabel,
            toLabel: linkCheck.toLabel,
            status: "확인 불가 (두 프레임이 각각 정확히 1개씩 있어야 확인 가능)",
            forwardInfo: null,
            backwardInfo: null,
        };
    }

    const from = fromItems[0];
    const to = toItems[0];
    const forwardInfo = from.nextFrame || null;
    const backwardInfo = to.previousFrame || null;

    const forwardError = forwardInfo && forwardInfo.status === "error" ? forwardInfo.message : null;
    const backwardError = backwardInfo && backwardInfo.status === "error" ? backwardInfo.message : null;

    const forwardLinked = Boolean(
        forwardInfo && forwardInfo.status === "linked" && forwardInfo.label === linkCheck.toLabel
    );
    const backwardLinked = Boolean(
        backwardInfo && backwardInfo.status === "linked" && backwardInfo.label === linkCheck.fromLabel
    );

    let status;
    if (forwardError || backwardError) {
        status = `확인 불가 (API 읽기 실패: ${forwardError || backwardError})`;
    } else if (forwardLinked && backwardLinked) {
        status = "연결됨";
    } else if (!forwardLinked && !backwardLinked) {
        status = "연결 안 됨";
    } else {
        status = "일부만 연결됨 (확인 필요)";
    }

    return {
        description: linkCheck.description,
        fromLabel: linkCheck.fromLabel,
        toLabel: linkCheck.toLabel,
        status,
        forwardInfo,
        backwardInfo,
    };
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
            linkChecks: [],
        };
    }

    return {
        pageIndex: page.pageIndex,
        pageName: page.pageName,
        profile,
        checks: profile.requiredFrames.map((req) => checkRequiredFrame(byLabel, req)),
        linkChecks: (profile.linkChecks || []).map((lc) => checkFrameLink(byLabel, lc)),
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

        (result.linkChecks || []).forEach((lc) => {
            const mark = lc.status === "연결됨" ? "OK" : "FAIL";
            lines.push(`  [${mark}] ${lc.description} (${lc.fromLabel} → ${lc.toLabel}) - ${lc.status}`);
            lines.push(`      - ${lc.fromLabel}.nextTextFrame: ${describeLinkInfo(lc.forwardInfo)}`);
            lines.push(`      - ${lc.toLabel}.previousTextFrame: ${describeLinkInfo(lc.backwardInfo)}`);
        });

        const checkFailCount = result.checks.filter((c) => c.status !== "정상").length;
        const linkFailCount = (result.linkChecks || []).filter((lc) => lc.status !== "연결됨").length;
        const failCount = checkFailCount + linkFailCount;
        lines.push(failCount === 0 ? "  결과: 모두 정상" : `  결과: ${failCount}건 문제 발견`);
        lines.push("");
    });

    return lines.join("\n");
}

// ---------------------------------------------------------------------------
// 기사 JSON 데이터(OPENING_PAGE) 검증. docs/ARTICLE_DATA_SPEC.md 계약을 기준으로 한다.
// InDesign API를 전혀 사용하지 않는 순수 데이터 검증이며, 이미 파싱된 JS 객체만 받는다.
// JSON 문법 오류 자체는 이 함수의 대상이 아니다 — src/data.js의 loadArticleFile()이
// JSON.parse 단계에서 별도로 처리한다.
// ---------------------------------------------------------------------------

function hasNonEmptyString(value) {
    return typeof value === "string" && value.length > 0;
}

// data: JSON.parse로 이미 파싱된 객체. { ok, templateType, variant, checks } 를 반환한다.
function validateArticleData(data) {
    const checks = [];
    const addCheck = (field, status, message) => {
        checks.push({ field, status, message: message || null });
    };

    if (data === null || typeof data !== "object" || Array.isArray(data)) {
        addCheck("(전체)", "값 오류", "최상위 데이터가 JSON 객체가 아닙니다.");
        return { ok: false, templateType: undefined, variant: undefined, checks };
    }

    if (!("templateType" in data)) {
        addCheck("templateType", "누락", "templateType 필드가 없습니다.");
    } else if (data.templateType !== "OPENING_PAGE") {
        addCheck("templateType", "값 오류", `templateType은 "OPENING_PAGE"여야 하는데 "${data.templateType}"입니다.`);
    } else {
        addCheck("templateType", "정상");
    }

    const VALID_VARIANTS = ["WITH_PHOTO", "WITHOUT_PHOTO"];
    let variantValid = false;
    if (!("variant" in data)) {
        addCheck("variant", "누락", "variant 필드가 없습니다.");
    } else if (!VALID_VARIANTS.includes(data.variant)) {
        addCheck(
            "variant",
            "값 오류",
            `variant는 "WITH_PHOTO" 또는 "WITHOUT_PHOTO"여야 하는데 "${data.variant}"입니다.`
        );
    } else {
        addCheck("variant", "정상");
        variantValid = true;
    }

    ["title", "pointText", "body"].forEach((field) => {
        if (!(field in data)) {
            addCheck(field, "누락", `${field} 필드가 없습니다.`);
        } else if (!hasNonEmptyString(data[field])) {
            addCheck(field, "값 오류", `${field}는 비어 있지 않은 문자열이어야 합니다.`);
        } else {
            addCheck(field, "정상");
        }
    });

    // heroImage는 variant가 확실히 WITH_PHOTO일 때만 필수로 검사한다.
    // variant 자체가 잘못됐으면(variantValid === false) heroImage 필요 여부를 판단할 수 없으므로 건너뛴다.
    if (variantValid && data.variant === "WITH_PHOTO") {
        if (!("heroImage" in data)) {
            addCheck("heroImage", "누락", "variant가 WITH_PHOTO일 때 heroImage 필드가 필요합니다.");
        } else if (!hasNonEmptyString(data.heroImage)) {
            addCheck("heroImage", "값 오류", "heroImage는 비어 있지 않은 문자열이어야 합니다.");
        } else {
            addCheck("heroImage", "정상");
        }
    }

    return {
        ok: checks.every((c) => c.status === "정상"),
        templateType: data.templateType,
        variant: data.variant,
        checks,
    };
}

function formatArticleValidationReport(fileName, validation) {
    const lines = [];
    lines.push("=== Load Article 데이터 검증 (읽기 전용, 문서 변경 없음) ===");
    lines.push(`파일: ${fileName}`);
    lines.push(`templateType: ${validation.templateType}`);
    lines.push(`variant: ${validation.variant}`);
    lines.push("");

    validation.checks.forEach((check) => {
        const mark = check.status === "정상" ? "OK" : "FAIL";
        const detail = check.message ? ` - ${check.message}` : "";
        lines.push(`  [${mark}] ${check.field}${detail}`);
    });

    lines.push("");
    lines.push(validation.ok ? "결과: 검증 통과" : "결과: 검증 실패");

    return lines.join("\n");
}

module.exports = {
    validateFrameLabels,
    formatValidationReport,
    validateArticleData,
    formatArticleValidationReport,
    OPENING_PROFILES_BY_VARIANT,
};
