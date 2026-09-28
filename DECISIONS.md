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

---

## D012 - 첫 자동조판(TITLE 입력): 대상 페이지는 Script Label 프로필 재사용, 탐색+쓰기는 doScript 하나로 묶음

결정:
`src/text.js`의 `applyTitleOnly()`(기사 데이터의 `title`을 TITLE Script Label Text Frame에 쓰는 첫 자동조판 코드)는 두 가지를 결정했다:
1. variant에 맞는 "시작 페이지"를 `page.name`/`page` index 하드코딩으로 찾지 않고, `src/validation.js`의 `OPENING_PROFILES_BY_VARIANT`(읽기 전용 Script Label 검증에 쓰던 것과 동일한 `requiredFrames` 정의)를 그대로 가져와, 그 variant에 필요한 Script Label을 모두 가진 페이지를 문서에서 찾는다.
2. 대상 페이지/TITLE 프레임 탐색과 `contents` 쓰기를 모두 하나의 `app.doScript` 콜백 안에서 수행한다. 탐색을 `doScript` 밖에서 먼저 하고 찾은 프레임 참조를 `doScript` 안에서 쓰는 방식은 시도하지 않았다.

이유:
- Script Label 프로필을 재사용하면 "어떤 프레임 조합이 WITH_PHOTO/WITHOUT_PHOTO 페이지인가"에 대한 기준이 읽기 전용 검증과 실제 쓰기 대상 판별에서 단 하나로 유지된다. 페이지 번호를 하드코딩하면 템플릿이 바뀌거나 페이지 순서가 바뀔 때 조용히 틀린 페이지에 쓸 위험이 있다.
- 탐색과 쓰기를 같은 `doScript` 안에 두면, "`doScript` 밖에서 얻은 객체 참조가 `doScript` 안에서도 유효한가"라는 이 프로젝트에서 아직 확인된 적 없는 질문 자체를 피할 수 있다. 안전 검사(대상 페이지/TITLE 프레임 존재·개수·타입)에서 하나라도 실패하면 `contents` 대입 줄에 도달하기 전에 예외가 발생하므로, 검사 로직이 `doScript` 안에 있어도 실패 시 문서가 수정되지 않는다는 보장은 그대로 유지된다.
- 기존 `src/indesign.js`의 `addHelloText()`(Hello Magazine 텍스트 생성)는 `Generate` 버튼과의 연결을 끊었지만 함수 자체는 삭제하지 않았다. 이번 목적("문제없이 동작한다는 걸 보여준 첫 `doScript` 예제")이 끝났다고 완전히 안 쓰이게 될지 아직 확신이 없어, 되돌리기 쉬운 선택(연결만 끊기)을 우선했다.

변경 조건:
실기 테스트에서 탐색+쓰기를 한 `doScript`에 묶는 것이 불필요하거나 문제를 일으키는 것으로 확인되면(예: 대량의 프레임 탐색이 `doScript` 안에서 성능 문제를 일으키면) 재검토.

---

## D013 - POINT_TEXT 입력 추가 시 대상 프레임 탐색 로직을 공유 함수로 일반화

결정:
`src/text.js`의 `findTitleFrameForVariant(doc, variant)`(TITLE 전용, 실기 검증 완료)를 그대로 복사해 `findPointTextFrameForVariant`를 새로 만드는 대신, 두 함수가 공통으로 쓰는 탐색 로직을 `findLabeledFrameForVariant(doc, variant, targetLabel, expectedType)`로 일반화하고 `findTitleFrameForVariant`/`findPointTextFrameForVariant`는 이 함수를 각자의 label/타입으로 호출하는 얇은 래퍼로 다시 작성했다. `applyTitleOnly`/`applyPointTextOnly`(각각 안전 검사 → `app.doScript` 안에서 탐색+쓰기)는 기존 TITLE 패턴을 그대로 반복한다.

이유:
- 안전 검사 로직(대상 페이지 0개/2개 이상, 대상 Label 0개/2개 이상, 타입 불일치)이 TITLE/POINT_TEXT에서 완전히 동일하다 — 필드명과 기대 타입만 다르다. 이 로직을 복붙하면 나중에 검사 하나를 고칠 때 두 곳을 항상 같이 고쳐야 하고, 실수로 하나만 고치면 조용히 어긋난다.
- `findLabeledFrameForVariant`로 일반화해도 실기 검증이 끝난 TITLE의 동작은 그대로 유지된다 — `findTitleFrameForVariant(doc, variant)`는 이제 `findLabeledFrameForVariant(doc, variant, "TITLE", "TextFrame")`을 호출할 뿐이며, 실행되는 코드 경로와 에러 메시지 형식은 기존과 동일하다.
- `applyTitleOnly`/`applyPointTextOnly`는 각각 독립적인 `app.doScript` 호출로 남겨뒀다(하나로 합치지 않음) — `Generate`가 TITLE을 먼저 쓰고 성공했을 때만 POINT_TEXT를 쓰도록, 필드 단위로 안전 검사와 쓰기를 계속 분리해 두기 위함이다.

변경 조건:
BODY/BODY_COLUMN_1/BODY_COLUMN_2/HERO_IMAGE를 추가할 때도 이 패턴(공유 탐색 함수 + 필드별 독립 `apply*Only` 함수)을 계속 따른다. 프레임 종류가 Rectangle(HERO_IMAGE)인 경우도 `expectedType` 파라미터로 이미 대응 가능하다.

**주의(D014에서 일부 변경됨)**: "필드별 독립 `apply*Only` 함수를 doScript 단위로도 계속 분리한다"는 부분은 D014에서 뒤집혔다. 아래 D014 참고.

---

## D014 - TITLE+POINT_TEXT를 하나의 doScript로 통합해 Generate의 부분 반영 위험을 줄임

결정:
`src/text.js`의 `applyTitleOnly()`/`applyPointTextOnly()`(각각 독립된 `app.doScript` 호출)를 제거하고, 하나의 `applyTitleAndPointText(articleData)`로 합쳤다. 이 함수는 단 하나의 `app.doScript` 콜백 안에서 (1) `findTitleFrameForVariant`와 `findPointTextFrameForVariant`를 **둘 다 먼저** 호출해 탐색/검증을 모두 끝내고, (2) 그 다음에야 `titleFrame.contents`/`pointTextFrame.contents`를 순서대로 쓴다. `index.js`의 `Generate` 핸들러는 이제 이 함수 하나만 호출한다. 탐색 함수(`findLabeledFrameForVariant`/`findTitleFrameForVariant`/`findPointTextFrameForVariant`)와 Script Label 식별 방식(D008)은 전혀 바꾸지 않았다.

이유:
- D013 이후 실제로 확인된 문제(2026-09-28 사용자 요청으로 분석): 기존 구조는 `applyTitleOnly()`가 성공한 뒤에만 `applyPointTextOnly()`를 호출했는데, 둘이 별개의 `app.doScript`/Undo 트랜잭션이라 TITLE 트랜잭션이 이미 커밋된 뒤 POINT_TEXT의 안전 검사가 실패하면, "이번 Generate가 실패했다"는 Status 메시지와 달리 문서에는 TITLE만 반영된 부분 상태가 남을 수 있었다. 필드별 안전 검사는 지켜져도 "Generate 클릭 전체의 원자성"은 보장되지 않는 구조였다.
- TITLE/POINT_TEXT의 탐색을 모두 doScript 콜백 앞부분에 몰아넣고 쓰기를 뒷부분에 몰아넣으면, 둘 중 하나라도 탐색에 실패했을 때 예외가 쓰기 코드 이전에 발생하므로 아무것도 안 쓰인 채로 콜백이 끝난다. 즉 "검증 실패 시 문서를 수정하지 않는다"는 원칙이 TITLE+POINT_TEXT를 합친 단위에서 성립하게 된다.
- 하나의 doScript 콜백은 하나의 Undo 트랜잭션이므로, Generate 클릭 한 번이 Undo 스택에서도 하나의 항목으로 남는다 — 성공하면 Ctrl+Z 한 번으로 TITLE+POINT_TEXT가 함께 되돌아간다.
- 탐색 함수 자체(`findLabeledFrameForVariant` 등)는 이미 순수하게 "찾아서 반환, 실패 시 throw"만 하고 아무것도 쓰지 않으므로 그대로 재사용 가능했다 — 새로 만든 부분은 "탐색 전부 → 쓰기 전부"로 순서를 강제하는 조립부뿐이라 변경 범위가 작다.
- `applyTitleOnly`/`applyPointTextOnly`를 개별 함수로 남겨두는 대신 삭제했다: Generate 흐름에서 더 이상 쓰이지 않고, 남겨두면 누군가 실수로 다시 개별 호출해 같은 부분 반영 문제를 재현할 위험이 있다.

이번 결정이 없애지 못하는 위험(미검증, 추측하지 않음): doScript 콜백 안에서 `titleFrame.contents = ...`가 성공한 바로 다음 줄 `pointTextFrame.contents = ...`가 실패하는 경우, `UndoModes.ENTIRE_SCRIPT`가 예외 발생 시 이미 실행된 대입을 자동으로 롤백하는지는 이 프로젝트에서 확인된 적이 없다. 두 탐색이 모두 성공한 뒤의 단순 `contents` 대입이 실패할 가능성 자체는 낮다고 보지만, 이 지점은 여전히 이론적 위험으로 남는다.

**실기 검증 완료(2026-09-28)**: 사용자가 실제 InDesign에서 (a) 정상 케이스 — WITH_PHOTO/WITHOUT_PHOTO 두 variant 모두 TITLE+POINT_TEXT가 함께 올바르게 반영되고 BODY/HERO_IMAGE/반대쪽 페이지는 그대로임을 확인, (b) 실패 케이스 — WITH_PHOTO의 POINT_TEXT Script Label을 임시로 바꾼 뒤 Generate를 실행하자 "필요한 Script Label을 가진 페이지를 찾지 못했다"는 오류로 중단됐고 TITLE도 전혀 반영되지 않음을 확인(테스트 후 Script Label 원복)했다. 이 실패 케이스는 탐색 단계(`findLabeledFrameForVariant`가 필요한 Script Label을 모두 가진 페이지를 찾는 단계)에서 막힌 것이며, 위에서 언급한 "두 번째 `contents` 대입이 실패하는" 이론적 시나리오를 재현한 것은 아니다 — 그 부분은 여전히 미검증으로 남는다.

변경 조건:
BODY/HERO_IMAGE를 추가할 때 이 "탐색 전부 → 쓰기 전부" 패턴을 그대로 확장할지, 아니면 다른 구조가 필요할지는 그 구현 시점에 다시 검토한다.

---

## D015 - BODY 자동 입력을 별도 트랜잭션 대신 기존 단일 doScript 흐름에 포함, Text Thread 연결도 쓰기 전 확인

결정:
`src/text.js`의 `applyTitleAndPointText()`를 `applyOpeningPageTextContent()`로 이름을 바꾸고(더 이상 TITLE+POINT_TEXT만 쓰지 않으므로), D014에서 만든 "탐색 전부 → 쓰기 전부" 단일 `app.doScript` 콜백 안에 BODY를 포함시켰다. `applyBodyOnly()` 같은 별도 함수/별도 트랜잭션은 만들지 않았다. WITH_PHOTO는 `findBodyFrameForVariant`로 BODY TextFrame 하나를 찾고, WITHOUT_PHOTO는 `findBodyColumn1FrameForVariant`/`findBodyColumn2FrameForVariant`로 두 TextFrame을 각각 찾은 뒤 `verifyBodyColumnsLinked()`로 BODY_COLUMN_1 → BODY_COLUMN_2 텍스트 스레드 연결까지 확인한다. 이 모든 탐색/검증이 성공했을 때만(TITLE·POINT_TEXT 포함) 쓰기 단계로 넘어가며, WITHOUT_PHOTO는 `body`를 `BODY_COLUMN_1`에만 쓴다(`BODY_COLUMN_2`는 쓰지 않음, D010 그대로). `verifyBodyColumnsLinked()`는 `src/inspector.js`의 `getLinkedFrameInfo()`(이미 실기로 확인된 `nextTextFrame`/`previousTextFrame` 읽기 로직)를 그대로 재사용하며, 이를 위해 `getLinkedFrameInfo`를 `src/inspector.js`의 `module.exports`에 추가했다(로직 자체는 변경하지 않음).

이유:
- D014가 확립한 "탐색 전부 → 쓰기 전부, 하나의 doScript" 패턴을 BODY까지 그대로 확장하면, TITLE/POINT_TEXT/BODY 중 어느 것의 검증이 실패해도 셋 다 안 쓰인다는 원칙이 유지된다. BODY를 별도 트랜잭션으로 분리했다면 D013→D014로 이어진 부분 반영 문제가 BODY에서 다시 재현될 수 있었다.
- `findLabeledFrameForVariant`/탐색 함수들은 이미 순수 탐색(찾아서 반환, 실패 시 throw)이라 BODY/BODY_COLUMN_1/BODY_COLUMN_2에도 그대로 재사용 가능했다 — `findBodyFrameForVariant` 등 3개의 얇은 래퍼만 추가하면 됐다(D013과 같은 패턴).
- WITHOUT_PHOTO는 `body`를 `BODY_COLUMN_1`에만 쓰고 InDesign 텍스트 스레드가 `BODY_COLUMN_2`로 자동으로 흘려보내는 것에 의존한다(D010). 이 의존이 실제로 성립하는지(두 프레임이 여전히 연결돼 있는지)를 쓰기 전에 확인하지 않으면, 텍스트 스레드가 끊어진 템플릿에서 `body` 전체가 `BODY_COLUMN_1`에만 들어가고 `BODY_COLUMN_2`는 비거나 이전 상태로 남는 조용한 오류가 날 수 있다. `src/inspector.js`의 `getLinkedFrameInfo()`가 이미 이 프로젝트에서 실기로 확인된 `nextTextFrame`/`previousTextFrame` 읽기 로직을 갖고 있어, 새로 만들지 않고 export만 추가해 재사용했다.
- `applyTitleAndPointText` → `applyOpeningPageTextContent`로 이름을 바꾼 이유: 함수가 더 이상 TITLE+POINT_TEXT만 쓰지 않는데 이전 이름을 유지하면 코드가 실제로 하는 일과 이름이 어긋난다. `applyOpeningPageTextContent`는 "OPENING_PAGE의 텍스트 계열 필드(HERO_IMAGE 같은 이미지 배치는 제외)"를 의미하도록 골랐다.

이번 결정이 범위에 포함하지 않은 것(사용자 명시 지시): HERO_IMAGE 이미지 배치, Overset 텍스트 처리, 페이지 추가/복제, JSON 데이터 계약 변경(`bodyColumn1`/`bodyColumn2` 등 새 필드 추가 없음 — 기존 단일 `body` 필드 그대로 사용).

이번 결정이 없애지 못하는 위험(미검증, 추측하지 않음): `verifyBodyColumnsLinked()`가 통과한 뒤에도 `bodyColumn1Frame.contents = ...` 대입 자체가 실패하는 경우의 자동 롤백 여부는 D014와 동일하게 미검증이다.

**실기 검증 완료(2026-09-28)**: 사용자가 실제 InDesign에서 다음을 확인했다.
- WITH_PHOTO 정상 케이스(`sample/opening-page-with-photo.json`): TITLE·POINT_TEXT·BODY 모두 JSON 값으로 정상 반영, HERO_IMAGE·WITHOUT_PHOTO 페이지는 변화 없음.
- WITHOUT_PHOTO 정상 케이스 + Text Thread(`sample/opening-page-without-photo-long-test.json`, body를 여러 번 반복해 약 3,995자로 늘린 실기 테스트 전용 샘플 — templateType/variant/title/pointText는 기존 샘플과 동일, 제품 코드/데이터 계약 변경 없음): TITLE·POINT_TEXT 정상 반영, `body` 전체가 BODY_COLUMN_1에 입력된 뒤 넘친 분량이 기존 텍스트 스레드를 통해 BODY_COLUMN_2까지 실제로 이어지는 것을 육안으로 확인(BODY_COLUMN_2에 별도로 값을 쓰지 않음). WITH_PHOTO 페이지는 변화 없음. 이 정상 케이스가 통과했다는 것은 `verifyBodyColumnsLinked()`(따라서 `getLinkedFrameInfo()`의 doScript 쓰기 경로 호출)도 정상 동작했다는 뜻이므로, 위에서 남겨뒀던 "이 호출 경로 자체가 미검증"이라는 위험도 이 테스트로 해소됐다.
- 실패 케이스(원자성): WITH_PHOTO의 BODY Script Label을 `BODY` → `BODY_TEMP`로 임시 변경한 뒤 `opening-page-with-photo.json` Load 후 Generate 실행 → Generate가 중단됐고 TITLE/POINT_TEXT/BODY/HERO_IMAGE 전부 변화 없음을 확인(테스트 후 `BODY_TEMP` → `BODY`로 복구, 텍스트 스레드도 정상 상태 유지 확인). 이로써 BODY 검증 실패 시 TITLE/POINT_TEXT의 부분 반영도 없음이 확인됐다. **다만 이때 Status에 정확히 어떤 오류 메시지 문자열이 표시됐는지는 기록되지 않았다** — "Generate 중단, 문서 변화 없음"이라는 동작만 확인됐고 정확한 문구는 단정하지 않는다.

이 테스트에서 다루지 않은 것(추후 필요 시 별도 확인): WITHOUT_PHOTO 쪽 실패 케이스(BODY_COLUMN_1/BODY_COLUMN_2 Script Label 변경, 또는 텍스트 스레드 연결 자체를 끊는 경우)는 테스트되지 않았다 — 실패 유도는 WITH_PHOTO의 BODY Script Label 변경 한 가지 방법으로만 이루어졌다.

변경 조건:
HERO_IMAGE를 추가할 때 이 패턴(탐색 전부 → 쓰기 전부)을 그대로 확장할지, 이미지 배치의 API 특성상 별도 구조가 필요할지는 그 구현 시점에 다시 검토한다.

---

## D016 - 장기 아키텍처 방향: 원고 입력 계층 분리 및 자동 Template 선택 (미구현, 방향성만 기록)

결정:
이 프로젝트의 최종 목표를 다음 흐름으로 정의하고 방향성만 기록해둔다 — **지금 구현하지 않는다**.

```
Word / Excel / JSON 등 입력
→ 공통 Article Data 구조로 변환
→ 기사 특성 분석
→ 적합한 Template Type 선택
→ 해당 템플릿의 TITLE / BODY / HERO_IMAGE 등 프레임에 자동 배치
→ InDesign 문서 생성
```

이 방향을 따를 때 지킬 설계 원칙:
1. Word/Excel 등을 읽는 입력 계층과 InDesign 자동배치 로직(`src/text.js`, `src/image.js` 등)은 분리한다 — 입력 형식이 늘어나도 자동배치 코드는 건드리지 않는다.
2. 어떤 입력 파일을 쓰든 먼저 공통 Article Data 구조로 변환한다 — 지금의 `OPENING_PAGE` JSON 계약([docs/ARTICLE_DATA_SPEC.md](docs/ARTICLE_DATA_SPEC.md))이 이 공통 구조의 시작점이 될 수 있다.
3. 템플릿 선택 로직(어떤 Template Type을 쓸지 판단)도 실제 InDesign 배치 코드와 분리한다 — `src/text.js`가 배치 대상 프레임을 Script Label로 찾는 지금 방식과 마찬가지로, "어떤 템플릿을 쓸지"와 "그 템플릿에 어떻게 채울지"를 서로 다른 모듈이 맡는다.
4. 초기에는 규칙 기반(if/else 등)으로 Template Type을 고르고, 필요해지면 이후 적합도/점수 기반 선택 방식으로 확장할 수 있게 여지를 남긴다 — 지금 점수 체계를 미리 설계하지 않는다.
5. Word냐 Excel이냐(또는 둘 다, 혹은 다른 형식)는 아직 확정하지 않는다 — 실제 업무에서 원고를 전달받는 방식을 먼저 확인한 뒤 결정한다.

Template Type 선택 시 고려할 수 있는 후보 기준(전부 미확정, 예시일 뿐)과 예시 매핑은 [docs/TEMPLATE_SPEC.md](docs/TEMPLATE_SPEC.md)의 "향후 Template Selection 기준" 섹션에 정리했다.

**"자동배치"의 의미(중요, 이 프로젝트 전체에 적용되는 경계):** 이 프로젝트에서 "자동배치"는 프로그램이 InDesign 레이아웃의 위치·크기·디자인을 새로 결정하거나 수정한다는 뜻이 아니다. 기본 원칙은 다음과 같다.
- 디자이너가 만든 InDesign 템플릿의 프레임 위치/크기/디자인은 그대로 유지한다.
- Script Label로 미리 정의된 기존 프레임에 데이터만 입력한다(D008 연장선).
- TITLE/POINT_TEXT/BODY는 기존 TextFrame에 텍스트만 입력한다(`contents` 대입, D012~D015에서 이미 이 원칙대로 구현됨).
- HERO_IMAGE도 기존 Script Label=`HERO_IMAGE` Rectangle에 이미지 파일만 place한다.
- 프로그램이 HERO_IMAGE 프레임(또는 다른 어떤 프레임)을 생성·이동·리사이즈하거나 레이아웃 자체를 재구성하지 않는다.

향후 Template Selection(D016 위 흐름의 "적합한 Template Type 선택" 단계)도 마찬가지로, 프로그램이 레이아웃을 새로 디자인하는 것이 아니라 **디자이너가 미리 제작한 여러 템플릿 중 기사 특성에 맞는 하나를 고르는 것**뿐이다. 즉 "자동배치"와 "자동 Template 선택" 둘 다 디자이너가 만든 결과물 안에서 동작하며, 그 결과물 자체를 만들거나 바꾸지 않는다.

이유:
- 사용자가 이 프로젝트의 최종 목표(Word/Excel 등 원고 파일 + 이미지 자료 → 기사 특성 분석 → 템플릿 자동 선택 → 자동 배치)를 명시적으로 공유했다. 지금 당장 구현하지는 않지만, 앞으로의 설계 결정(예: 데이터 계약을 어떻게 확장할지, 모듈을 어떻게 나눌지)이 이 방향과 어긋나지 않도록 기준을 남겨둔다.
- 지금까지의 구현(TITLE/POINT_TEXT/BODY 자동 입력, D012~D015)은 이미 "Script Label로 배치 대상을 찾는 로직"과 "데이터 계약(JSON)"을 분리해온 방향과 자연스럽게 이어진다 — 이번 장기 방향은 기존 설계를 뒤집는 것이 아니라 그 연장선이다.
- Word/Excel 파싱, 기사 특성 분석, 템플릿 선택 점수 체계는 전부 아직 실제 업무 프로세스(원고 전달 방식, 템플릿 종류별 실제 빈도 등)를 모르는 상태에서 설계하면 추측에 근거하게 된다 — CLAUDE.md의 정확성 원칙에 따라 지금은 방향만 기록하고 구체적인 구현/데이터 구조는 실제 확인 후로 미룬다.

이번 결정이 바꾸지 않는 것: 현재 우선순위는 여전히 실제 InDesign "시작 페이지" 템플릿 구조 분석, 프레임 역할 확정, TITLE/BODY/HERO_IMAGE 매핑 확정, JSON 기반 템플릿 1종 자동배치 MVP다. 이번 커밋은 문서만 변경했고 기능 코드/InDesign 파일은 건드리지 않았다.

변경 조건:
실제 업무에서 원고 전달 방식(Word/Excel/기타)이 확인되거나, MVP가 "시작 페이지"에서 충분히 안정되어 여러 Template Type/입력 형식을 지원할 필요가 실제로 생기면, 이 방향을 구체적인 설계(모듈 구조, 데이터 스키마, 선택 규칙)로 발전시키고 별도 결정으로 기록한다.

---

## D017 - HERO_IMAGE 배치: JSON 파일 폴더 기준 상대 경로 + 파일시스템 확인은 doScript 밖에서 선행

결정:
WITH_PHOTO의 `heroImage`(예: `"hero.jpg"`)를 **Load Article로 불러온 JSON 파일이 있는 폴더 기준 상대 경로**로 해석해 이미지 파일을 찾고, 기존 `HERO_IMAGE` Script Label Rectangle에 `rectangle.place(nativePath)`로 배치한다(위치/크기/디자인은 건드리지 않음, D016 "자동배치의 의미" 참고). 구체적으로:

1. `src/data.js`의 `loadArticleFile()`이 반환값에 `fileNativePath`(UXP `Entry.nativePath`)를 추가로 담아 `index.js`가 `currentArticleFileNativePath`로 별도 보관한다(article JSON 데이터 자체에는 포함하지 않음 — 데이터 계약은 그대로).
2. 새 모듈 `src/image.js`: `resolveHeroImagePath(articleFileNativePath, heroImageRelativePath)`(순수 문자열 처리로 폴더 경로를 계산해 합침), `assertImageFileAccessible(imageNativePath)`(`require("fs")`로 `"file:"` 스킴 경로 조회, InDesign 문서와 무관한 순수 파일시스템 확인), `placeHeroImage(rectangle, imageNativePath)`(`rectangle.place(nativePath)`만 호출, fit/resize 없음).
3. `src/text.js`의 `applyOpeningPageTextContent()`를 `applyOpeningPageContent()`로 다시 개명하고(D015에 이어 두 번째 확장 — 이제 텍스트 외 이미지도 다루므로), heroImage 파일 접근 확인(`assertImageFileAccessible`, 비동기)은 **doScript 밖에서** 먼저 수행한다. doScript 콜백 안에서는 지금까지처럼 완전히 동기 함수를 유지하고, HERO_IMAGE Rectangle 탐색까지만 추가한다. 쓰기 단계에서는 HERO_IMAGE place를 TITLE/POINT_TEXT/BODY보다 **먼저** 실행한다.

이유:
- **UXP Entry에는 부모 폴더를 얻는 API가 없다**(공식 `Entry` 클래스 레퍼런스에 `getParent()` 등이 명시적으로 없음 — `copyTo`/`moveTo`/`delete`/`getMetadata`/`toString`과 `nativePath`/`name`/`url`/`isFile`/`isFolder` 프로퍼티만 있음, Adobe 공식 문서 확인). 따라서 "JSON 파일이 있는 폴더"를 얻으려면 `nativePath` 문자열에서 마지막 경로 구분자를 잘라 폴더 경로를 직접 계산하는 수밖에 없다. 이 계산은 순수 JS 문자열 처리이므로 InDesign/UXP API 자체에 의존하지 않아 위험이 적다.
- **`localFileSystem`에는 임의의 네이티브 경로를 Entry로 변환하는 문서화된 방법이 없다**(공식 `localFileSystem` 모듈 레퍼런스에 `getFileForOpening`/`getFileForSaving`/`getFolder`/`getTemporaryFolder`/`getDataFolder`/`getPluginFolder`/세션·영구 토큰 관련 메서드만 있고, 임의 경로 → Entry 변환 메서드는 없음). 그래서 이미지 경로는 Entry로 변환하지 않고 **네이티브 경로 문자열 그대로** 다룬다.
- **`Rectangle.place()`는 File Entry가 아니라 네이티브 경로 문자열을 받는다** — 공개된 실제 InDesign UXP 스크립트 예제(Adobe 개발자 포럼, 커뮤니티 스니펫 저장소)에서 `imageFrame.place(imagePath)` 형태(경로 문자열)로 성공했고, 파일 내용을 미리 읽어 넘기는 방식은 실패 사례로 보고됨을 확인했다. 이는 위에서 Entry 변환이 필요 없다는 점과 맞아떨어진다.
- **파일 접근 확인은 `require("fs")`(UXP가 제공하는 Node 스타일 fs 모듈, `"file:"` 스킴 경로)로 한다** — 같은 공개 예제에서 `fs.writeFile("file:" + path, ...)` 형태로 실제 사용된 것을 확인했다.
- **파일시스템 확인을 doScript 밖에서 하는 이유**: `assertImageFileAccessible`는 비동기(`await`)이고, 지금까지 이 프로젝트의 모든 `app.doScript` 콜백은 완전히 동기 함수였다(D012 이후 일관). 콜백을 비동기로 바꿔 그 안에서 `await`하는 패턴은 InDesign UXP의 `doScript`가 지원하는지 확인된 적이 없어, 새로운 미검증 영역을 만들지 않기 위해 문서와 무관한 파일시스템 확인은 doScript 진입 전에 끝낸다(D006 "읽기 전용/문서와 무관한 확인은 doScript로 감쌀 필요 없다" 원칙의 연장).
- **쓰기 순서에서 HERO_IMAGE place를 가장 먼저 실행하는 이유**: `assertImageFileAccessible`의 사전 확인이 완벽하다는 보장이 없다(예: 확인 직후 파일이 삭제되거나, 파일은 있지만 이미지 형식이 손상되어 `place()` 자체가 실패하는 경우). place를 텍스트 필드보다 먼저 실행하면, 이런 뒤늦은 실패가 발생해도 TITLE/POINT_TEXT/BODY는 아직 전혀 쓰이지 않은 채로 남아 "검증 실패 시 문서를 수정하지 않는다"는 원칙이 유지된다 — D014/D015가 확립한 "탐색 전부 → 쓰기 전부"에 "가장 불확실한 쓰기를 먼저"라는 보강을 더한 것이다.

**정정(2026-09-28, 첫 실기 테스트에서 발견)**: 최초 구현은 `fs.stat()`을 썼으나, 실제 InDesign에서 "Generate 중단: heroImage 파일에 접근할 수 없습니다: ... (fs.stat is not a function)"으로 실패했다. 경로 계산 자체는 사용자가 직접 확인한 대로 정확했고(JSON 기준 상대 경로가 실제 파일 위치와 일치), 문제는 API 이름이었다. Adobe 공식 InDesign UXP `fs` 모듈 레퍼런스(`developer.adobe.com/indesign/uxp/reference/uxp-api/reference-js/modules/fs/`)를 다시 확인한 결과, 이 모듈은 `stat`/`access`를 제공하지 않고 **`lstat`(비동기)/`lstatSync`(동기)만 제공하며 Node.js의 `Stats` 클래스를 따르는 값을 반환한다**고 명시되어 있었다. 이에 따라 `assertImageFileAccessible`을 `fs.lstat()`로 교체했다(그 외 경로 계산 로직, `place()` 호출, doScript 구조는 전혀 바꾸지 않음). 이 실패 자체는 오히려 "try/catch로 감싸 실패 시 Generate를 중단시킨다"는 설계가 의도대로 동작했음을 보여준다 — TITLE/POINT_TEXT/BODY/HERO_IMAGE 무엇도 반영되지 않았다.

이번 결정이 없애지 못하는 위험(미검증, 추측하지 않음):
- `fs.lstat`이 없는/접근할 수 없는 경로에서 정확히 어떤 형태의 오류를 던지는지(Node의 `ENOENT`와 동일한 형태인지 등)는 이 프로젝트에서 아직 실기로 확인되지 않았다 — 다만 try/catch로 모든 오류를 실패로 처리하므로 안전성 자체는 이 세부 사항에 의존하지 않는다.
- `nativePath` 문자열의 경로 구분자(Windows `\` vs `/`)를 그대로 이어붙이는 것이 이 환경에서 항상 올바른지(예: `place()`가 특정 구분자만 받아들이는지)는 확인되지 않았다.
- `rectangle.place(nativePath)`가 이 프로젝트의 정확한 InDesign/UXP 버전에서 동일하게 동작하는지는 공개 예제로만 뒷받침했을 뿐, 이 환경에서 직접 실기로 확인된 적은 없다.
- `resolveHeroImagePath`는 `heroImage` 값에 `..`(상위 폴더 이동) 등이 들어와도 이를 특별히 막지 않는다 — 이 프로젝트는 신뢰할 수 있는 사용자가 자신의 로컬 파일을 다루는 내부 도구이므로 적대적 입력을 가정하지 않았다.

이 결정은 아직 실제 InDesign에서 정상 케이스가 검증되지 않았다 — 1차 실기 테스트는 `fs.stat` API 오류로 사전 검사 단계에서 중단됐다(2026-09-28).

변경 조건:
`fs.lstat`으로 교체한 뒤 재실기 테스트에서 (a) WITH_PHOTO 정상 케이스(이미지가 실제로 배치되고 프레임 위치/크기가 그대로임), (b) 이미지 누락/접근 불가 실패 케이스(TITLE/POINT_TEXT/BODY도 전혀 반영되지 않음), (c) WITHOUT_PHOTO가 기존과 동일하게 동작함이 모두 확인되면 이 기록을 실기 검증 완료로 갱신한다.
