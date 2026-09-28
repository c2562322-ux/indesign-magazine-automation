// heroImage 파일 경로 해석과 InDesign Rectangle에의 이미지 place만 담당하는 모듈.
// 레이아웃을 새로 디자인하지 않는다 — 기존 HERO_IMAGE Rectangle의 위치/크기/디자인은
// 전혀 건드리지 않고, 그 프레임에 이미지 파일만 place한다(D016 "자동배치의 의미" 참고).
//
// 이 모듈이 쓰는 두 API는 이 프로젝트에서 이번에 처음 사용하며, 아직 실기로 검증되지 않았다:
//   - require("fs")(UXP가 제공하는 Node 스타일 fs 모듈)로 파일 접근 가능 여부 확인
//   - Rectangle.place(nativePath)로 이미지 배치
// InDesign 문서를 실제로 수정하는 것은 placeHeroImage() 하나뿐이다 — 나머지는 순수 파일
// 경로 계산/확인이며 InDesign API를 호출하지 않는다.

const fs = require("fs");

// article JSON 파일의 nativePath와 heroImage 상대 경로로부터 이미지의 절대 nativePath를
// 만든다. 순수 문자열 처리만 하며 InDesign/UXP API를 전혀 호출하지 않는다.
// UXP의 Entry 클래스에는 부모 폴더를 얻는 API(getParent 등)가 없어(공식 레퍼런스에 없음),
// nativePath 문자열에서 마지막 경로 구분자를 잘라 폴더 경로를 직접 계산한다.
function resolveHeroImagePath(articleFileNativePath, heroImageRelativePath) {
    if (typeof articleFileNativePath !== "string" || articleFileNativePath.length === 0) {
        throw new Error("기사 JSON 파일의 경로를 알 수 없어 heroImage 상대 경로를 해석할 수 없습니다.");
    }
    if (typeof heroImageRelativePath !== "string" || heroImageRelativePath.length === 0) {
        throw new Error("article 데이터에 heroImage가 없습니다.");
    }

    const lastSlash = Math.max(articleFileNativePath.lastIndexOf("/"), articleFileNativePath.lastIndexOf("\\"));
    if (lastSlash === -1) {
        throw new Error(`기사 JSON 파일 경로에서 폴더를 분리할 수 없습니다: ${articleFileNativePath}`);
    }

    const separator = articleFileNativePath.charAt(lastSlash);
    const folderPath = articleFileNativePath.slice(0, lastSlash);

    return `${folderPath}${separator}${heroImageRelativePath}`;
}

// 이미지 파일이 실제로 존재/접근 가능한지 InDesign 문서를 건드리지 않고 미리 확인한다.
// require("fs")의 "file:" 스킴 경로 조회를 사용한다.
//
// D017 최초 구현은 fs.stat()을 썼으나 실기 테스트에서 "fs.stat is not a function"으로
// 실패했다(2026-09-28) — Adobe 공식 InDesign UXP fs 모듈 레퍼런스
// (developer.adobe.com/indesign/uxp/reference/uxp-api/reference-js/modules/fs/)를 다시
// 확인한 결과, 이 모듈은 stat/access를 제공하지 않고 lstat(비동기)/lstatSync(동기)만
// 제공한다(Node.js의 Stats 클래스를 따르는 값을 반환한다고 명시됨). 그래서 lstat으로
// 교체했다. lstat이 없는/접근할 수 없는 경로에서 정확히 어떤 오류를 던지는지(Node의
// ENOENT와 동일한 형태인지 등)까지는 이 프로젝트에서 실기로 확인되지 않았지만, try/catch로
// 감싸 어떤 형태의 오류든 실패로 처리하므로 안전성 자체는 이 세부 사항에 의존하지 않는다.
// 실패하면 실제 InDesign 문서 수정 전에 Error를 던진다.
async function assertImageFileAccessible(imageNativePath) {
    try {
        await fs.lstat(`file:${imageNativePath}`);
    } catch (err) {
        throw new Error(`heroImage 파일에 접근할 수 없습니다: ${imageNativePath} (${err.message})`);
    }
}

// HERO_IMAGE Rectangle에 이미지 파일을 place한다. 프레임의 위치/크기/디자인은 전혀 건드리지
// 않는다 — fit/resize 등 프레임 형태를 바꾸는 호출은 하지 않는다. rectangle.place(nativePath)는
// 공개된 InDesign UXP 스크립트 예제 기준으로 네이티브 경로 문자열을 받는 것으로 확인했지만,
// 이 InDesign UXP 환경에서 실기로 검증된 적은 없다.
function placeHeroImage(rectangle, imageNativePath) {
    rectangle.place(imageNativePath);
}

module.exports = {
    resolveHeroImagePath,
    assertImageFileAccessible,
    placeHeroImage,
};
