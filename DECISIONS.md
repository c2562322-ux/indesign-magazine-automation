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

---

## D006 - 읽기 전용 기능은 app.doScript로 감싸지 않는다

결정:
`src/inspector.js`의 `inspectDocument()`는 문서를 조회만 하고 수정하지 않으므로 `src/indesign.js`의 `addHelloText()`와 달리 `app.doScript(...)` 안에서 실행하지 않는다.

이유:
`app.doScript`는 되돌리기(Undo) 가능한 하나의 작업 단위로 묶기 위한 것으로, 문서를 변경하는 작업에 필요하다. 읽기 전용 조회에는 Undo 단위가 필요 없으므로 감싸지 않는 것이 단순하고 목적에 맞다. InDesign UXP에서 읽기 동작도 반드시 `doScript` 안에서 실행해야 하는지는 실제로 검증되지 않았으며, 만약 그렇다면 이후 수정이 필요하다.

변경 조건:
UDT/InDesign 실기 테스트에서 `doScript` 없이 읽기 동작이 실패하면 재검토.

---

## D007 - Template Inspector를 별도 모듈(src/inspector.js)로 분리

결정:
문서 구조 분석 기능을 `src/indesign.js`에 추가하지 않고 새 파일 `src/inspector.js`로 분리했다.

이유:
`src/indesign.js`의 기존 `addHelloText()`(Generate 기능)를 건드리지 않고 새 기능을 추가하기 위함이다. 두 기능은 읽기 전용 분석과 문서 수정이라는 서로 다른 성격을 가지므로 분리가 자연스럽고, 기존 UI/InDesign 로직 분리 원칙(D002)과도 일관된다.

변경 조건:
없음.

---

## D008 - 자동화 대상 프레임 식별은 name이 아니라 Script Label(label)을 1차 기준으로 사용

결정:
InDesign 프레임을 코드에서 식별할 때, `PageItem.name`이 아니라 Script Label(`PageItem.label`)을 1차 식별자로 사용한다.

이유:
- 실제 디자이너 템플릿("시작 페이지")을 `Inspect Template`으로 확인한 결과, 대부분의 Text Frame/Rectangle에서 `name`이 비어 있음을 실기로 확인했다 (2026-09-23, [docs/TEMPLATE_SPEC.md](docs/TEMPLATE_SPEC.md) Frame 분석 워크시트 참고). `name`은 Layers 패널에 노출되는 범용 표시 속성이라 디자인 작업 중 관리되지 않는 경우가 많아, 자동화가 의존할 안정적인 값으로 보기 어렵다.
- `label`(Script Label)은 InDesign 스크립팅 DOM에서 애초에 스크립트/자동화 전용 식별자로 제공되는 메커니즘이며, Layers 패널 이름과 분리되어 있어 디자이너의 일반 작업 중 실수로 바뀔 가능성이 낮다.
- `src/inspector.js`에 `label`을 읽기 전용으로 출력하도록 추가한 뒤 실제 InDesign UXP 환경에서 테스트한 결과, Text Frame과 Rectangle 모두에서 `item.label`에 에러 없이 접근 가능함을 사용자가 실기로 확인했다 (2026-09-23). 즉 이 프로젝트의 InDesign/UXP 버전에서 `label` 속성이 정상적으로 노출된다는 점이 검증되었다.

이번 결정은 "어떤 속성을 읽어 식별자로 쓸 것인가"까지만 확정한 것이며, 아래는 아직 결정되지 않았다:
- working .indd의 실제 프레임에 TITLE/POINT_TEXT/BODY/HERO_IMAGE 등 Script Label 값을 실제로 부여하는 작업 (다음 작업으로 HANDOFF.md에 제안됨, 아직 미실행)
- `insertLabel`/`extractLabel`(구조화된 key-value 라벨)을 쓸지, 단순 문자열 `label` 하나만 쓸지 여부 — 지금은 단순 문자열 `label`만 검증했다
- `name`을 완전히 버릴지, 사람이 InDesign에서 눈으로 확인할 수 있도록 보조적으로 함께 채울지 여부

변경 조건:
실제로 Script Label을 부여하고 읽어보는 다음 단계에서 문제가 발견되면(예: 특정 개체 타입에서 label 저장이 유지되지 않는 등) 재검토.

---

## D009 - src/validation.js는 InDesign API를 직접 호출하지 않고 inspector.js의 report를 입력으로 받는다

결정:
`src/validation.js`(Script Label 기준 프레임 검증)는 `require("indesign")`을 호출하지 않는다. 대신 `src/inspector.js`의 `inspectDocument()`가 만든 `report` 객체를 함수 인자로 받아, 그 안의 `label`/`name`/textFrames·rectangles 배열만 가지고 검증한다.

이유:
- InDesign DOM을 다시 순회하지 않아도 되므로 `Inspect Template` 버튼 클릭 한 번으로 문서를 두 번 읽는 비효율을 피한다.
- InDesign API 접근을 `src/inspector.js` 한 곳에만 두면, API 사용 방식이 바뀌어도 검증 로직(`src/validation.js`)은 건드릴 필요가 없다. 기존 UI/InDesign 로직 분리 원칙(D002)과 Template Inspector 분리 원칙(D007)의 연장선이다.
- `report`가 이미 `label`/`name`/타입(어느 배열에서 나왔는지)을 담고 있어 검증에 필요한 정보가 충분하다.

변경 조건:
검증 로직이 report에 없는 InDesign 정보(예: 페이지 순서 재계산, 실시간 상태)를 필요로 하게 되면 재검토.

---

## D010 - "시작 페이지(사진 없음)" 본문은 bodyColumn1/bodyColumn2 대신 단일 body 필드 사용

결정:
자동조판 MVP 데이터 계약([docs/ARTICLE_DATA_SPEC.md](docs/ARTICLE_DATA_SPEC.md))에서, 사진 없는 "시작 페이지" 변형의 2단 본문을 `bodyColumn1`/`bodyColumn2` 두 필드로 나눠 받던 기존 설계를 폐기하고, `WITH_PHOTO` 변형과 동일하게 `body` 필드 하나만 사용하기로 했다. 이 값은 텍스트 스레드의 시작 프레임인 `BODY_COLUMN_1`에만 쓰고, `BODY_COLUMN_2`에는 직접 쓰지 않는다.

이유:
- 애초에 `bodyColumn1`/`bodyColumn2`로 나눴던 이유는 "본문 하나를 코드가 어디서 잘라 두 프레임에 나눠 넣을지 예측할 수 없다"는 것이었다(D008 이전, 2026-09-23 이전 버전 ARTICLE_DATA_SPEC.md).
- 사용자가 실제 InDesign에서 `Inspect Template`/`src/validation.js`의 연결 검사로 `BODY_COLUMN_1.nextTextFrame` = `BODY_COLUMN_2`, `BODY_COLUMN_2.previousTextFrame` = `BODY_COLUMN_1`임을 확인했다(2026-09-23) — 즉 두 프레임이 InDesign 텍스트 스레드로 이미 연결되어 있다.
- 텍스트 스레드로 연결된 프레임은 앞쪽 프레임에 본문을 채우면 InDesign이 넘치는 텍스트를 다음 프레임으로 자동으로 흘려보낸다. 따라서 "어디서 자를지"를 코드가 예측할 필요 자체가 없어졌고, 두 필드로 나눌 이유도 사라졌다.
- `body` 필드 하나로 통일하면 `WITH_PHOTO`/`WITHOUT_PHOTO` 두 variant의 필드 구조가 더 단순해지고(공통 필드로 승격), 데이터를 만드는 쪽이 "이 variant는 본문을 어떻게 나눠야 하지"를 고민할 필요가 없어진다.

이번 결정은 `body`를 `BODY_COLUMN_1.contents`에 쓰면 실제로 `BODY_COLUMN_2`까지 올바르게 흐르는지(자동조판 구현 시점의 실기 검증)까지 확인한 것은 아니다 — 지금 확인된 것은 "두 프레임이 텍스트 스레드로 연결돼 있다"는 사실뿐이다.

변경 조건:
자동조판 구현 시 `BODY_COLUMN_1.contents = body`가 실제로 `BODY_COLUMN_2`까지 올바르게 흐르지 않는 것으로 확인되면 재검토.

---

## D011 - 파일 선택/읽기는 "indesign"이 아니라 UXP 플랫폼 공통 "uxp" 모듈(storage.localFileSystem) 사용

결정:
`src/data.js`의 `Load Article` 파일 선택/읽기는 `require("indesign")`이 아니라 `require("uxp").storage.localFileSystem`(`getFileForOpening()`, `Entry.read()`)을 사용한다. 파일 형식 필터(`getFileForOpening`의 `types` 옵션)는 사용하지 않고, 사용자가 아무 파일이나 선택할 수 있게 둔 뒤 JSON이 아니면 `JSON.parse` 단계에서 오류로 처리한다.

이유:
- 파일 선택/읽기는 InDesign 문서나 InDesign 고유 기능과 무관한, UXP 플랫폼 전반에서 공통으로 제공하는 로컬 파일 시스템 접근 기능이다. Adobe UXP 공식 문서에서 이 기능은 앱별 모듈(`indesign`, `photoshop` 등)이 아니라 플랫폼 공통 `uxp` 모듈의 `storage` 네임스페이스로 제공된다.
- `manifest.json`에 이미 `requiredPermissions.localFileSystem: "fullAccess"`가 설정되어 있어(README 작성 시점부터 이 기능을 염두에 두고 미리 추가함), 별도 매니페스트 변경 없이 사용할 수 있다.
- `getFileForOpening()`의 파일 형식 필터 옵션(`types`)이 정확히 어떤 값 형태(단순 확장자 배열인지, `{name, extensions}` 객체인지 등)를 요구하는지는 이 프로젝트에서 실제로 확인된 적이 없다. 잘못된 형태를 넘기면 예외가 날 수 있어, 이번에는 옵션을 생략해 위험을 줄이고 파일 형식 검증은 이미 만들어둔 `JSON.parse` 오류 처리로 대신했다.

`uxp` 모듈 자체를 이 프로젝트에서 처음 사용하는 것이라, `getFileForOpening()`/`Entry.read()`가 이 InDesign UXP 환경에서 문서와 동일하게 동작하는지는 아직 실기로 검증되지 않았다.

변경 조건:
실기 테스트에서 `getFileForOpening()`/`read()`가 예상과 다르게 동작하면(예: 반환값 형태가 다르거나 파일 형식 필터가 필요해지면) 재검토.
