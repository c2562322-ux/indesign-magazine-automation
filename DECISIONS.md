# DECISIONS.md

중요한 기술 결정과 그 이유를 기록한다. 실제로 코드/논의에서 확인 가능한 결정만 기록하며, 추측으로 만들지 않는다.

---

## D001 - Vanilla JavaScript 기반 개발

결정:
React 등 프레임워크 없이 Vanilla JavaScript로 UXP Plugin을 개발한다.

이유:
초기 단계에서는 InDesign과 UXP의 동작 방식(문서/페이지/프레임 제어, 패널 UI)을 익히는 것이 우선이다. 프레임워크 도입은 구조를 안정시킨 이후 필요할 때 검토한다.

변경 조건:
UI 복잡도가 늘어나 상태 관리가 어려워지는 시점에 재검토. 지금은 해당하지 않는다.

---

## D002 - UI 로직과 InDesign 제어 로직 분리

결정:
`index.js`(UI 이벤트 바인딩)와 `src/indesign.js`(InDesign document/page/frame 제어)를 분리한다. UI 코드는 InDesign API를 직접 호출하지 않고, `src/indesign.js`가 노출하는 함수만 호출한다.

이유:
InDesign UXP API 사용 방식이 바뀌거나 검증 과정에서 수정이 필요할 때 UI 코드를 건드리지 않기 위함. 향후 `src/data.js`, `src/template.js`, `src/text.js`, `src/image.js`, `src/validation.js`로 역할을 나누는 구조와도 일관된다.

변경 조건:
없음.

---

## D003 - templateType과 category를 별도 개념으로 관리 (예정)

결정:
기사 데이터의 `category`(TECH, DESIGN, LIFESTYLE 등)와 `templateType`(FEATURE, INTERVIEW, NEWS, PHOTO 등)을 별도 필드로 관리하고, UXP에서 어떤 레이아웃을 사용할지는 `templateType`을 기준으로 판단한다.

이유:
서로 다른 카테고리의 기사가 같은 레이아웃(`FEATURE` 등)을 공유할 수 있기 때문에, 레이아웃 선택 로직을 카테고리가 아닌 templateType에 종속시켜야 중복 템플릿 로직을 피할 수 있다.

변경 조건:
아직 `src/template.js`가 구현되지 않아 실제 코드에는 반영되지 않은 방향성 결정이다. 구현 시점에 이 문서를 갱신한다.

---

## D004 - InDesign 모듈 접근 방식: CommonJS(require/module.exports)

결정:
`index.js`와 `src/*.js`는 ES Module(`import`/`export`) 대신 CommonJS(`require`/`module.exports`) 방식을 사용한다.

이유:
Adobe가 공개한 InDesign UXP 플러그인 샘플들이 공통적으로 CommonJS 패턴(`require("indesign")`, `require("./src/...")`)을 사용한다. UXP 런타임에서 ES Module의 `type="module"` 스크립트가 `require`와 동일하게 동작하는지 검증되지 않았으므로, 검증된 패턴을 따라 동작 불확실성을 줄인다.

변경 조건:
실제 InDesign에서 ES Module 방식이 문제없이 동작함을 확인하면 재검토 가능. 현재는 미검증.

---

## D005 - assets 리소스는 폴더 단위가 아니라 파일 단위로 Git에서 제외

결정:
`.gitignore`에서 `assets/templates/`, `assets/fonts/` 디렉터리 자체를 통째로 무시하지 않고, `assets/templates/original/*`, `assets/templates/working/*`, `assets/fonts/*`처럼 각 폴더의 내용물만 무시한 뒤 `.gitkeep`만 `!`로 예외 처리한다.

이유:
Git의 `.gitignore`는 상위 디렉터리 자체가 무시 대상이면 그 안의 파일을 `!`로 다시 추적하도록 예외를 걸 수 없다(하위 파일을 아예 스캔하지 않음). 디렉터리가 아닌 "내용물"만 무시하는 패턴을 써야 `.gitkeep`을 예외로 추적시켜 빈 폴더 구조를 clone 이후에도 유지할 수 있다.

변경 조건:
없음.
