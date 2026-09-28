// 현재 열린 InDesign 문서의 구조를 읽기 전용으로 분석한다. 문서를 절대 수정하지 않는다
// (app.doScript로 감싸지 않는 이유는 DECISIONS.md D006 참고).
//
// 아래에서 사용하는 InDesign DOM 속성(pages, pageItems, textFrames, rectangles, images,
// geometricBounds, contents, paragraphStyles, objectStyles 등)은 classic InDesign Scripting
// DOM 기준으로 작성했으며, 실제 InDesign UXP 환경에서 동일하게 동작하는지 검증되지 않았다.
// (HANDOFF.md "알려진 문제" 참고)
//
// TextFrame.contents는 classic InDesign DOM 기준으로 그 프레임이 속한 스토리(story) 전체
// 텍스트를 반환하는 것으로 알려져 있다. 즉 Linked Text Frame으로 연결된 프레임이라면 미리보기가
// "이 프레임에 보이는 텍스트"가 아니라 "연결된 스토리 전체의 앞부분"일 수 있다. (미검증, 참고용)
//
// item.label(Script Label)은 이번에 새로 추가한 읽기 전용 출력이다. 목적은 자동화 식별자로
// name 대신 label을 쓸 수 있는지 판단하기 위해, 현재 InDesign UXP 환경에서 label 속성에
// 에러 없이 접근 가능한지 확인하는 것이다. label에 값을 쓰는 코드는 아직 없다.
//
// TextFrame.previousTextFrame / nextTextFrame은 classic InDesign DOM에서 텍스트 스레드(이어진
// 프레임) 연결을 나타내는 속성으로 알려져 있다(연결이 없으면 null 또는 isValid가 false인 참조를
// 반환하는 것으로 알려짐). 이 UXP 환경에서 실제로 동일하게 노출되는지는 이번에 처음 읽어보는
// 것이라 미검증이며, 프레임을 연결하거나 수정하는 코드는 없다(읽기 전용).

const indesign = require("indesign");
const app = indesign.app;

const PREVIEW_LENGTH = 50;

// page.pageItems를 재귀 탐색할 때(Group 내부 등)의 depth 상한. 순환 참조나 예상 밖의 깊은
// 중첩에 대한 방어적 안전장치일 뿐, 실제 템플릿에 이 정도 깊이가 있다고 가정하지 않는다.
const MAX_NESTED_ITEM_DEPTH = 20;

function getActiveDocument() {
    if (!app.activeDocument) {
        throw new Error("열려 있는 InDesign 문서가 없습니다. 문서를 먼저 열어주세요.");
    }
    return app.activeDocument;
}

function getTextPreview(frame) {
    let raw;
    try {
        raw = frame.contents;
    } catch (err) {
        return `(텍스트 읽기 실패: ${err.message})`;
    }

    if (typeof raw !== "string" || raw.length === 0) {
        return "(빈 텍스트)";
    }

    const flattened = raw.replace(/[\r\n]+/g, " ");
    return flattened.length > PREVIEW_LENGTH ? `${flattened.slice(0, PREVIEW_LENGTH)}...` : flattened;
}

function getBoundsText(item) {
    try {
        const bounds = item.geometricBounds;
        if (!bounds || bounds.length !== 4) {
            return "(geometricBounds 없음)";
        }
        const rounded = bounds.map((n) => Math.round(n * 100) / 100);
        return `[${rounded.join(", ")}]`;
    } catch (err) {
        return `(geometricBounds 읽기 실패: ${err.message})`;
    }
}

function getLabelText(item) {
    let label;
    try {
        label = item.label;
    } catch (err) {
        return `(label 읽기 실패: ${err.message})`;
    }

    return typeof label === "string" && label.length > 0 ? label : "(label 없음)";
}

// TextFrame의 previousTextFrame/nextTextFrame을 읽기 전용으로 확인한다. 연결된 프레임이
// 없으면 { status: "none" }, 읽는 도중 에러가 나면 { status: "error", message }, 연결된
// 프레임이 있으면 그 프레임의 label/name을 { status: "linked", label, name }으로 반환한다.
function getLinkedFrameInfo(frame, propertyName) {
    let linked;
    try {
        linked = frame[propertyName];
    } catch (err) {
        return { status: "error", message: err.message };
    }

    if (!linked || (typeof linked.isValid === "boolean" && linked.isValid === false)) {
        return { status: "none" };
    }

    return {
        status: "linked",
        label: getLabelText(linked),
        name: linked.name && linked.name.length > 0 ? linked.name : null,
    };
}

function formatLinkedFrameInfo(info) {
    if (!info) {
        return "(정보 없음)";
    }
    if (info.status === "none") {
        return "(연결 없음)";
    }
    if (info.status === "error") {
        return `(읽기 실패: ${info.message})`;
    }
    return info.name ? `label=${info.label}, name=${info.name}` : `label=${info.label}`;
}

// pageItem의 타입 이름을 읽기 전용으로 추정한다. classic ExtendScript에서는 보통
// item.constructor.name(예: "TextFrame", "Group", "Rectangle")으로 타입을 구분하지만,
// 이 UXP 환경에서 constructor.name이 같은 방식으로 동작하는지는 이번에 처음 읽어보는
// 것이라 미검증이다. 1차로 시도해 보고, 실패하거나 의미 없는 값이면(빈 문자열, "Object" 등)
// 존재하는 속성 기반 휴리스틱으로 대체한다. 그래도 판별하지 못하면 "UNKNOWN"을 반환할 뿐
// 예외를 던지지 않는다 — 타입 하나를 못 알아낸다고 전체 Inspect가 중단되면 안 된다.
function detectPageItemType(item) {
    try {
        const ctorName = item && item.constructor && item.constructor.name;
        if (typeof ctorName === "string" && ctorName.length > 0 && ctorName !== "Object") {
            return ctorName;
        }
    } catch (err) {
        // constructor.name 자체를 읽을 수 없는 경우 — 아래 휴리스틱으로 계속 진행한다.
    }

    // 대체 판별(휴리스틱): 존재가 확인되는 속성으로 타입을 추정한다. 순서가 중요하다 —
    // Group일 가능성(pageItems 보유)을 TextFrame/Rectangle 추정보다 먼저 확인한다.
    if (hasNestedPageItems(item)) {
        return "Group";
    }
    try {
        if (typeof item.contents === "string") {
            return "TextFrame";
        }
    } catch (err) {
        // 무시하고 다음 후보로
    }
    try {
        if (typeof item.images !== "undefined" && typeof item.images.length === "number") {
            return "Rectangle";
        }
    } catch (err) {
        // 무시
    }

    return "UNKNOWN";
}

// item이 하위 pageItems 컬렉션을 가진 컨테이너(전형적으로 Group)인지 읽기 전용으로 확인한다.
// detectPageItemType과 별개로 둔 이유: constructor.name이 "Group"이 아닌 다른 값(또는 UNKNOWN)을
// 반환하더라도 실제로 pageItems를 순회할 수 있는 객체라면 재귀 탐색 자체는 계속 시도할 수 있게
// 하기 위함이다 — 타입 이름 판별 실패가 재귀 탐색 가능 여부까지 막지 않도록 분리했다.
function hasNestedPageItems(item) {
    try {
        return typeof item.pageItems !== "undefined" && typeof item.pageItems.length === "number";
    } catch (err) {
        return false;
    }
}

// page.pageItems(또는 Group.pageItems)를 depth 0부터 재귀적으로 읽기 전용 탐색해 트리 구조로
// 만든다. 어떤 항목에서든 속성 접근이 실패해도(개별 try/catch) 전체 탐색은 계속된다. 문서를
// 전혀 수정하지 않는다 — 값을 대입하는 코드가 없다(app.doScript로 감싸지 않는 이유는
// inspectDocument()와 동일, D006).
function buildPageItemNode(item, depth, parentType, maxDepth) {
    const type = detectPageItemType(item);

    let name = null;
    try {
        name = item.name && item.name.length > 0 ? item.name : null;
    } catch (err) {
        name = null;
    }

    const node = {
        type,
        depth,
        parentType,
        name,
        label: getLabelText(item),
        bounds: getBoundsText(item),
        text: null,
        childCount: null,
        children: [],
        truncated: false,
    };

    // TextFrame으로 판별되지 않았더라도 contents가 문자열이면 텍스트 미리보기를 시도한다 —
    // 휴리스틱이 놓친 텍스트 보유 항목까지 최대한 눈으로 확인할 수 있게 하기 위함이다.
    try {
        if (typeof item.contents === "string") {
            node.text = getTextPreview(item);
        }
    } catch (err) {
        // text는 null로 남는다.
    }

    if (hasNestedPageItems(item)) {
        let childLength = 0;
        try {
            childLength = item.pageItems.length;
        } catch (err) {
            childLength = 0;
        }
        node.childCount = childLength;

        if (depth >= maxDepth) {
            node.truncated = true;
        } else {
            for (let i = 0; i < childLength; i++) {
                try {
                    const child = item.pageItems.item(i);
                    node.children.push(buildPageItemNode(child, depth + 1, type, maxDepth));
                } catch (err) {
                    node.children.push({
                        type: "UNKNOWN",
                        depth: depth + 1,
                        parentType: type,
                        name: null,
                        label: `(읽기 실패: ${err.message})`,
                        bounds: "(읽기 실패)",
                        text: null,
                        childCount: null,
                        children: [],
                        truncated: false,
                    });
                }
            }
        }
    }

    return node;
}

// page 직계의 모든 pageItems(타입 무관, page.pageItems 전체)를 depth 0 루트로 삼아 트리 배열을
// 만든다. 기존 page.textFrames/page.rectangles 기반 탐색과는 완전히 별개의 읽기 전용 경로다.
function buildPageItemForest(page, maxDepth) {
    const roots = [];
    let length = 0;
    try {
        length = page.pageItems.length;
    } catch (err) {
        return roots;
    }

    for (let i = 0; i < length; i++) {
        try {
            const item = page.pageItems.item(i);
            roots.push(buildPageItemNode(item, 0, "Page", maxDepth));
        } catch (err) {
            roots.push({
                type: "UNKNOWN",
                depth: 0,
                parentType: "Page",
                name: null,
                label: `(읽기 실패: ${err.message})`,
                bounds: "(읽기 실패)",
                text: null,
                childCount: null,
                children: [],
                truncated: false,
            });
        }
    }

    return roots;
}

function inspectTextFrame(frame) {
    return {
        name: frame.name && frame.name.length > 0 ? frame.name : null,
        label: getLabelText(frame),
        preview: getTextPreview(frame),
        bounds: getBoundsText(frame),
        previousFrame: getLinkedFrameInfo(frame, "previousTextFrame"),
        nextFrame: getLinkedFrameInfo(frame, "nextTextFrame"),
    };
}

function inspectRectangle(rect) {
    const imageCount = rect.images ? rect.images.length : 0;
    return {
        name: rect.name && rect.name.length > 0 ? rect.name : null,
        label: getLabelText(rect),
        bounds: getBoundsText(rect),
        hasImage: imageCount > 0,
        imageCount,
    };
}

function inspectPage(page, pageIndex) {
    const textFrames = [];
    for (let i = 0; i < page.textFrames.length; i++) {
        textFrames.push(inspectTextFrame(page.textFrames.item(i)));
    }

    const rectangles = [];
    for (let i = 0; i < page.rectangles.length; i++) {
        rectangles.push(inspectRectangle(page.rectangles.item(i)));
    }

    // page.pageItems를 depth 0부터 재귀 탐색한 트리 — 위 textFrames/rectangles(타입별 최상위
    // 컬렉션만 보는 기존 로직)와는 별개로 추가된 것이다. Group 내부의 중첩 항목까지 보기 위함.
    const pageItemTree = buildPageItemForest(page, MAX_NESTED_ITEM_DEPTH);

    return {
        pageIndex,
        pageName: page.name,
        pageItemCount: page.pageItems.length,
        textFrames,
        rectangles,
        pageItemTree,
    };
}

// 읽기 전용 분석 결과. 문서를 수정하지 않으므로 app.doScript로 감싸지 않는다.
function inspectDocument() {
    const doc = getActiveDocument();

    const pages = [];
    for (let i = 0; i < doc.pages.length; i++) {
        pages.push(inspectPage(doc.pages.item(i), i));
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

// 트리 한 노드를 한 줄 텍스트로 만든다(연결선 prefix는 formatPageItemForest가 따로 붙인다).
function formatPageItemNodeLine(node) {
    const parts = [node.type, `depth=${node.depth}`, `parent=${node.parentType}`];
    if (node.name) {
        parts.push(`name=${node.name}`);
    }
    parts.push(`label=${node.label}`);
    if (node.text !== null) {
        parts.push(`text="${node.text}"`);
    }
    parts.push(`bounds=${node.bounds}`);
    if (node.childCount !== null) {
        parts.push(`childCount=${node.childCount}`);
    }
    if (node.truncated) {
        parts.push(`(depth 상한 ${MAX_NESTED_ITEM_DEPTH} 도달, 하위 생략)`);
    }
    return parts.join(" ");
}

// roots(페이지 직계 pageItems 트리)를 "├─"/"└─" 연결선 트리 텍스트로 lines에 이어붙인다.
// 최상위 루트 자체에는 연결선을 붙이지 않고, 그 자식부터 연결선+들여쓰기를 적용한다(사용자
// 요청 예시 형식과 동일).
function formatPageItemForest(roots, lines, basePrefix) {
    const renderNode = (node, prefix, isLast, isRoot) => {
        const connector = isRoot ? "" : isLast ? "└─ " : "├─ ";
        lines.push(`${prefix}${connector}${formatPageItemNodeLine(node)}`);
        const nextPrefix = prefix + (isRoot ? "  " : isLast ? "    " : "│   ");
        node.children.forEach((child, i) => {
            renderNode(child, nextPrefix, i === node.children.length - 1, false);
        });
    };

    roots.forEach((root, i) => {
        renderNode(root, basePrefix, i === roots.length - 1, true);
    });
}

function formatReport(report) {
    const lines = [];
    lines.push(`문서: ${report.documentName}`);
    lines.push(`전체 페이지 수: ${report.pageCount}`);
    lines.push(
        "(참고: 아래 'Text Frame'/'Rectangle / 이미지 프레임' 목록은 페이지에 직접 놓인(=Group 등 " +
            "컨테이너에 묶이지 않은) 해당 타입 항목만 나열합니다. Group 내부에 중첩된 항목까지 보려면 " +
            "'중첩 Page Item 트리' 섹션을 참고하세요. Text Frame 미리보기는 Linked Text Frame인 경우 " +
            "연결된 스토리 전체의 앞부분일 수 있습니다.)"
    );
    lines.push("");

    report.pages.forEach((page) => {
        lines.push(`--- Page index=${page.pageIndex}, name=${page.pageName} ---`);
        lines.push(`Page Item 수 (전체 타입 포함): ${page.pageItemCount}`);

        lines.push(`Text Frame (${page.textFrames.length}개):`);
        if (page.textFrames.length === 0) {
            lines.push("  (없음)");
        } else {
            page.textFrames.forEach((t) => {
                const nameLabel = t.name ? t.name : "(이름 없음)";
                lines.push(`  - name: ${nameLabel}`);
                lines.push(`    label: ${t.label}`);
                lines.push(`    text: "${t.preview}"`);
                lines.push(`    bounds: ${t.bounds}`);
                lines.push(`    이전 연결 프레임(previousTextFrame): ${formatLinkedFrameInfo(t.previousFrame)}`);
                lines.push(`    다음 연결 프레임(nextTextFrame): ${formatLinkedFrameInfo(t.nextFrame)}`);
            });
        }

        lines.push(`Rectangle / 이미지 프레임 (${page.rectangles.length}개):`);
        if (page.rectangles.length === 0) {
            lines.push("  (없음)");
        } else {
            page.rectangles.forEach((r) => {
                const nameLabel = r.name ? r.name : "(이름 없음)";
                const imageInfo = r.hasImage ? `있음 (${r.imageCount}개)` : "없음";
                lines.push(`  - name: ${nameLabel}`);
                lines.push(`    label: ${r.label}`);
                lines.push(`    bounds: ${r.bounds}`);
                lines.push(`    이미지 배치 여부: ${imageInfo}`);
            });
        }

        lines.push(
            `중첩 Page Item 트리 (page.pageItems 재귀, Group 등 컨테이너 내부 포함, depth 상한 ${MAX_NESTED_ITEM_DEPTH}, 읽기 전용):`
        );
        if (page.pageItemTree.length === 0) {
            lines.push("  (없음)");
        } else {
            formatPageItemForest(page.pageItemTree, lines, "  ");
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
    getLinkedFrameInfo,
};
