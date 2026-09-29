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

**실기 검증 완료(2026-09-28, `fs.lstat` 교체 후)**: 사용자가 재실기 테스트해 WITH_PHOTO 정상 케이스를 확인했다 — `opening-page-with-photo.json` Load 성공, TITLE·POINT_TEXT·BODY 정상 반영, `hero.png`가 기존 Script Label=HERO_IMAGE Rectangle에 정상 place됨, HERO_IMAGE Rectangle의 위치/크기는 변경되지 않음, Status에도 HERO_IMAGE 배치 완료 표시됨. 이미지 누락/접근 불가 실패 케이스와 WITHOUT_PHOTO 회귀 확인은 이 테스트에서 별도로 수행되지 않았다.

변경 조건:
이미지 누락/접근 불가 실패 케이스(TITLE/POINT_TEXT/BODY도 전혀 반영되지 않는지)와 WITHOUT_PHOTO가 기존과 동일하게 동작하는지가 별도로 확인되면 이 기록을 갱신한다.

---

## D018 - "대표이미지" 템플릿 안내 문구(HERO_IMAGE_GUIDE) 자동 비우기

결정:
WITH_PHOTO의 HERO_IMAGE Rectangle 위에 디자이너가 넣어둔 "대표이미지" 템플릿 제작 안내 문구(기사 데이터 필드가 아닌, 이미지 위치를 표시하기 위한 텍스트)를 위한 별도 Script Label `HERO_IMAGE_GUIDE`를 도입한다. HERO_IMAGE 이미지 배치가 성공한 뒤에만 이 TextFrame의 `contents`를 빈 문자열로 비운다 — **프레임 자체는 삭제하지 않는다.** 구체적으로:

1. `src/validation.js`의 `OPENING_WITH_PHOTO.requiredFrames`에 `{ label: "HERO_IMAGE_GUIDE", expectedType: "TextFrame" }`을 추가한다(WITHOUT_PHOTO 프로필은 변경하지 않음).
2. `src/text.js`에 `findHeroImageGuideFrameForVariant(doc, variant)`(기존 `findLabeledFrameForVariant` 재사용, 기존 패턴과 동일) 추가.
3. `applyOpeningPageContent()`의 WITH_PHOTO 탐색 분기에서 `heroImageGuideFrame`도 함께 찾고, 쓰기 단계에서 `placeHeroImage(...)` 바로 다음 줄에 `heroImageGuideFrame.contents = "";`를 실행한다. WITHOUT_PHOTO 분기와 나머지 doScript 구조(탐색 전부 → 쓰기 전부, HERO_IMAGE를 텍스트 필드보다 먼저 쓰는 순서)는 전혀 바꾸지 않았다.

이유:
- `requiredFrames`에 추가하는 것만으로 기존 "대상 페이지는 variant에 필요한 Script Label을 모두 가진 페이지" 판별 로직(D012)이 그대로 적용된다 — HERO_IMAGE_GUIDE Label이 없거나 중복되거나 타입이 다르면 TITLE 탐색 단계에서부터 이미 실패하므로, "이미지 파일 검증이나 HERO_IMAGE/HERO_IMAGE_GUIDE 검증이 실패하면 TITLE/POINT_TEXT/BODY/안내문구 모두 변경하지 않는다"는 요구사항을 새 검사 로직 없이 만족한다.
- 안내 문구 비우기를 `placeHeroImage(...)` 바로 다음 줄에 둔 것은, place()가 예외를 던지면 그 다음 줄(안내 문구 비우기)에 도달하지 않는다는 JS의 기본적인 순차 실행 보장만으로 "이미지 place가 성공한 뒤에만 안내 문구를 비운다"는 요구사항을 만족하기 위함이다 — 별도의 성공 플래그나 조건문이 필요 없다.
- `HERO_IMAGE_GUIDE.contents = ""`는 TITLE/POINT_TEXT/BODY와 완전히 같은 패턴(TextFrame.contents 대입)이라 새로운 미검증 API가 추가되지 않는다. 프레임을 삭제하는 API(`item.remove()` 등)는 검토하지 않았다 — 사용자가 명시적으로 "TextFrame 자체는 삭제하지 않음"을 요구했고, 삭제는 되돌리기 어려운 구조 변경에 더 가까워 범위 밖으로 뒀다.
- **명명 검토**: `HERO_IMAGE_GUIDE`는 기존 Script Label 명명 규칙(대문자 스네이크케이스)과 형식은 일치하지만, 다른 Label들과 달리 "콘텐츠가 들어가는 프레임"이 아니라 "관련 프레임(HERO_IMAGE)에 딸린 메타 프레임"이라는 점에서 성격이 다르다. `HERO_IMAGE_` 접두어로 연관성을 드러내고, `docs/TEMPLATE_SPEC.md`에 이미 기록돼 있던 "템플릿 제작 안내 문구"라는 표현과도 부합해 그대로 채택했다.

이번 결정이 범위에 포함하지 않은 것: 안내 문구 프레임을 삭제하는 것, 프레임 위치/크기/스타일 변경, WITHOUT_PHOTO에 대한 처리(이 프레임이 없음).

**실기 검증 완료(2026-09-28)**: 사용자가 working .indd의 "대표이미지" 안내 문구 TextFrame에 `HERO_IMAGE_GUIDE` Script Label을 직접 부여한 뒤 정상 케이스를 테스트해 확인했다 — `opening-page-with-photo.json` Load 후 Generate 실행 → TITLE·POINT_TEXT·BODY 정상 반영, `hero.png`가 기존 HERO_IMAGE Rectangle에 정상 place, 이미지 place 성공 후 "대표이미지" 안내 문구가 화면에서 사라짐(HERO_IMAGE_GUIDE TextFrame의 `contents`가 빈 문자열로 바뀜), HERO_IMAGE_GUIDE TextFrame 자체는 삭제되지 않고 유지됨, 그 프레임의 위치/크기/스타일 변화 없음, HERO_IMAGE Rectangle의 위치/크기도 변화 없음, WITHOUT_PHOTO 페이지는 변화 없음. 이로써 D018이 목표한 대로 동작함이 실기로 확인됐다. 실패 케이스(HERO_IMAGE_GUIDE Label이 없을 때 TITLE/POINT_TEXT/BODY/HERO_IMAGE 모두 반영되지 않는지)는 이번 테스트에서 별도로 수행되지 않았다.

변경 조건:
실패 케이스(HERO_IMAGE_GUIDE Label이 없거나 중복되거나 타입이 다를 때 TITLE/POINT_TEXT/BODY/HERO_IMAGE 모두 반영되지 않는지)가 별도로 확인되면 이 기록을 갱신한다.

---

## D019 - Word(.docx) 입력 MVP: 직접 구현한 ZIP/DEFLATE 파서 + 마커 기반 Article Data 변환

결정:
Opening Page WITH_PHOTO 템플릿 1종을 대상으로, Word(.docx) 원고 파일을 읽어 기존 Article Data 구조로 변환하고 기존 `applyOpeningPageContent()` Generate 로직을 그대로 재사용하는 MVP를 구현한다. 구체적으로:

1. `src/docxZip.js`(신규): UXP에 없는 zip 압축 해제 기능을 서드파티 라이브러리 없이 **직접 구현**한다 — RFC 1951(DEFLATE) raw inflate와 최소 ZIP 리더(End of Central Directory/Central Directory/Local File Header 파싱). `readZipEntry(docxArrayBuffer, entryName)`으로 `.docx` 안의 특정 항목(`word/document.xml`)을 압축 해제된 바이트로 꺼낸다.
2. `src/docxArticle.js`(신규): `word/document.xml`의 `<w:p>`/`<w:t>` 태그만 정규식으로 뽑아 문단 단위 일반 텍스트로 만들고(`extractTextFromDocumentXml`), `[TITLE]`/`[POINT_TEXT]`/`[BODY]`/`[HERO_IMAGE]` 마커로 구획된 텍스트를 파싱해(`parseArticleFromMarkedText`) 기존 JSON과 동일한 `{templateType: "OPENING_PAGE", variant: "WITH_PHOTO", title, pointText, body, heroImage}` Article Data를 만든다(`parseDocxToArticleData`). InDesign API는 전혀 호출하지 않는다.
3. `src/data.js`의 `loadArticleFile()`을 확장: 선택한 파일의 확장자가 `.docx`면 위 경로로, 아니면 **기존 JSON 경로(코드 변경 없음)**로 분기한다. 두 경로 모두 같은 `{status, fileName, fileNativePath, data}` 형태로 반환되므로 `index.js`/`src/validation.js`/`src/text.js`/`src/image.js`는 전혀 수정하지 않았다 — DOCX로 만든 Article Data도 기존 `validateArticleData()`/`applyOpeningPageContent()`를 그대로 통과한다.
4. `heroImage` 상대 경로는 기존 `src/image.js`의 `resolveHeroImagePath(articleFileNativePath, heroImageRelativePath)`를 그대로 재사용한다 — DOCX 파일의 `nativePath`도 JSON 파일의 `nativePath`와 똑같이 다뤄지므로 별도 처리가 필요 없었다.
5. 마커 형식/변환 규칙은 [docs/WORD_INPUT_SPEC.md](docs/WORD_INPUT_SPEC.md)에 정리했다.

분석 결과(구현 전에 먼저 확인한 것):
- **UXP에는 zip/inflate 내장 API가 없다**(공식 InDesign UXP file-operation 레시피, fs 모듈 레퍼런스 어디에도 없음).
- DOCX는 ZIP(Deflate 압축) + XML 구조라 직접 파싱 자체는 가능하지만, DEFLATE 압축 해제는 알고리즘이 있어야 한다.
- **서드파티 라이브러리(JSZip 등)를 UXP에 번들하는 것은 Adobe 공식 샘플에서도 확인되지만, 그 샘플은 npm+webpack 빌드 파이프라인을 전제로 한다** — 이 프로젝트는 지금까지 빌드 도구 없이 Vanilla JS 파일을 그대로 UXP가 불러오는 구조였다(D001/D004). 빌드 파이프라인을 새로 들이는 것은 이번 MVP 범위를 크게 벗어나는 아키텍처 변경이다. 단일 파일로 배포되는 서드파티 라이브러리를 빌드 없이 그대로 vendoring하는 방법도 있지만, 그러려면 인터넷에서 파일을 내려받아 리포지토리에 포함시켜야 하는데(안전 규칙상 "파일 다운로드"는 매번 사용자에게 명시적 허가를 구해야 함), 그 라이브러리가 이 UXP 자바스크립트 엔진에서 그대로 동작하는지도 검증된 바 없다.
- 위 두 대안(빌드 도구 도입, 서드파티 라이브러리 vendoring) 대신, **RFC 1951은 특허 없는 공개 표준 알고리즘**이고 Mark Adler의 참고 구현(`puff.c`)으로 정확한 테이블/알고리즘 구조를 확인할 수 있어, 이 프로젝트에 직접 구현하기로 했다 — 새 의존성이나 빌드 단계 없이 기존 Vanilla JS 구조(D001/D004) 그대로 유지된다.

이번 결정이 범위에 포함하지 않은 것(사용자 명시 지시): HWP/HWPX 지원, Excel 지원, Template Selection 자동화, WITHOUT_PHOTO DOCX 지원, Overset/페이지 추가, InDesign 레이아웃 변경, 기존 JSON 입력 경로 삭제/변경(그대로 유지함).

이번 결정이 없애지 못하는 위험(미검증, 추측하지 않음) — **이번 세션에는 실행 가능한 JavaScript 런타임(Node.js 등)이 전혀 없어, 아래 코드는 이 프로젝트 안에서도 한 번도 실행해본 적이 없다**:
- 직접 구현한 raw DEFLATE 압축 해제(`src/docxZip.js`)가 실제 Microsoft Word가 만든 다양한 `.docx` 파일에 대해 항상 올바르게 동작하는지 — RFC 1951 표준 자체는 확인했지만 구현 버그 가능성은 실기 테스트로만 배제할 수 있다.
- `require("uxp").storage.formats.binary`로 `.docx`를 ArrayBuffer로 읽는 것이 이 InDesign UXP 환경에서 실제로 동작하는지(공식 문서 근거는 있으나 이 프로젝트에서 처음 사용).
- UXP 전역에 `TextDecoder`가 있는지 확인하지 않고 직접 UTF-8 디코더(`utf8BytesToString`)를 작성해 의존성을 피했다 — 이 디코더 자체의 정확성도 미검증.
- `BODY` 필드의 문단 사이 `\n`이 InDesign `TextFrame.contents`에서 실제로 별도 문단으로 나뉘어 보이는지(D010 이후에도 여전히 열려 있던 질문의 연장).
- 실기 테스트를 돕기 위해 실제 DEFLATE 압축을 사용하는 진짜 `.docx` 샘플(`sample/article-eye-clinic-with-photo.docx`)을 PowerShell + .NET `System.IO.Compression`으로 만들었고, .NET의 (검증된) 압축 해제로 내용이 의도대로 들어있음은 확인했다 — 하지만 이는 파일 자체의 유효성만 확인한 것이지, 이 프로젝트가 직접 구현한 JS 파서가 그 파일을 올바르게 읽는지는 검증한 것이 아니다.

이 결정은 아직 실제 InDesign에서 실행해 검증되지 않았다 — 코드만 작성된 상태다.

**정정(2026-09-28, 패널 로드 실패 발견)**: 1차 실기 테스트에서 `Load Article`이 "파일 선택 중..."에서 멈추는 문제가 보고됐고, 이어서 플러그인 재시작 후 **패널 전체가 빈 화면(버튼이 하나도 렌더링되지 않음)** 으로 뜨는 더 심각한 문제가 확인됐다. 코드 리뷰 결과, `src/docxZip.js`의 `makeBitReader()`가 반환하는 객체에 **객체 리터럴 getter/setter 접근자 프로퍼티**(`get bytePos() {...}`/`set bytePos(value) {...}`)를 썼는데, 이 문법을 이 프로젝트에서 쓴 것은 이번이 처음이라 InDesign UXP의 JS 엔진이 지원하는지 검증된 적이 없었다. `index.js`가 `require("./src/data.js")` → `require("./src/docxArticle.js")` → `require("./src/docxZip.js")`로 이어지는 require 체인 중 이 파일 파싱 단계에서 문제가 생기면, 그 위 모든 require가 실패해 `index.js`의 버튼 이벤트 바인딩 코드까지 전혀 실행되지 않고 패널이 빈 화면이 되는 증상과 부합한다. 이를 가장 유력한 원인으로 보고, 이 접근자 프로퍼티를 이 코드베이스 다른 곳에서 이미 안전하게 쓰이는 "일반 메서드" 형태(`getBytePos()`/`setBytePos(value)`)로 교체했다(기능은 동일, 호출부 4곳만 변경). 부수적으로 `for (;;)` 무한 루프 2곳도 더 널리 쓰이는 `while (true)`로 바꿨다(기능 변화 없음, 추가적인 안전 조치). **이 수정 자체가 실제 원인을 고쳤는지는 아직 재테스트로 확인되지 않았다** — 여전히 "성공"으로 기록하지 않는다.

변경 조건:
재테스트에서 (0) 플러그인이 정상적으로 UI를 렌더링하는지(빈 패널 문제 해소), (a) `sample/article-eye-clinic-with-photo.docx`를 Load Article로 불러왔을 때 TITLE/POINT_TEXT/BODY/HERO_IMAGE 값이 정확히 추출되는지, (b) Generate까지 실행했을 때 기존 JSON 경로와 동일하게 정상 반영되는지, (c) 기존 JSON 샘플 파일들이 이번 변경 이후에도 문제없이 동작하는지(회귀 확인)가 모두 확인되면 이 기록을 실기 검증 완료로 갱신한다. 파서 버그가 발견되면 `src/docxZip.js`/`src/docxArticle.js`만 수정하고 InDesign 배치 로직(`src/text.js`/`src/image.js`)은 건드리지 않는다.

## D020: 최종 배포 대비 cleanup — 진단 로그 제거, 저장소 샘플 정리, 배포 패키지 제외 목록 확정

날짜: 2026-09-28

배경: D019 이후 HERO_IMAGE가 기존 그래픽이 있는 프레임에서 교체되지 않는 문제를 조사하기 위해 `src/text.js`/`index.js`에 진단용 `console.log`와 Status 노출 코드를 두 차례(1회는 이미 커밋 `c7421d5`, 1회는 uncommitted)에 걸쳐 추가했다. 이 조사가 아직 결론 나지 않은 상태에서, 사용자가 "현재까지 커밋된 내용은 origin/main에 push 완료했으니 최종 배포 cleanup을 진행하자"고 요청했다. 먼저 (1) uncommitted 진단 변경 중 배포에 불필요한 부분, (2) `sample/`의 각 파일이 런타임에 필요한지, (3~5) 저장소 보관/완전 삭제/배포 패키지에서만 제외 대상 분류, (6) `sample/eye-clinic-hero.png`의 "modified" 상태가 무엇인지, (7) 최종 배포에 실제 필요한 파일 목록을 **삭제/수정/commit 없이 분석만** 보고한 뒤, 그 분석을 사용자가 검토하고 방향을 확정해 이 cleanup을 진행했다.

결정 및 실행 내용:
1. **진단 로그 완전 제거, 동작 변경 없음**: `src/text.js`의 `applyOpeningPageContent()`와 `index.js`의 `Generate` 핸들러에서 `[HERO_IMAGE 진단]` `console.log` 전량(이미 커밋된 `c7421d5`분 포함)과, `src/text.js`가 반환하던 진단용 `{ heroImageNativePath }`, `index.js`의 Status 문자열에 실제 파일 절대경로를 노출하던 `heroImageNote`를 제거했다. `rectangle.place()` 호출, 탐색-후-쓰기 doScript 구조, Script Label 계약, HERO_IMAGE/HERO_IMAGE_GUIDE 처리 순서 등 실제 동작은 한 줄도 바꾸지 않았다 — Status는 다시 진단 이전과 동일하게 TITLE/POINT_TEXT/BODY(+variant) 완료 메시지만 표시한다. **HERO_IMAGE가 기존 그래픽이 있는 프레임에서 교체되지 않는 문제 자체는 이 cleanup으로 해결되지 않았고 원인도 미확정이다** — 재조사 시 로그를 다시 추가해야 한다.
2. **저장소에서 완전 삭제**: `sample/article.json`, `sample/images/`(README.md 포함) — 둘 다 현재 자동조판 코드(OPENING_PAGE 등)와 무관한 예전 FEATURE 샘플이라고 이미 `README.md`/`docs/TEMPLATE_SPEC.md`/`sample/images/README.md` 자체에 명시돼 있었고, 어떤 회귀 테스트에도 참조되지 않았다.
3. **저장소에는 회귀 테스트용으로 유지, 배포 패키지에서는 제외**: `sample/opening-page-with-photo.json`, `sample/opening-page-without-photo.json`, `sample/opening-page-without-photo-long-test.json`, `sample/article-eye-clinic-with-photo.docx`, `sample/eye-clinic-hero.png`. `sample/eye-clinic-hero.png`는 커밋된 버전(2,208,367바이트, 당시 `hero.png` 복사본)과 working tree 버전(1,791,391바이트)의 바이트 내용이 달랐는데, 사용자가 이 working tree 버전이 실제 안과 병원 실기 테스트에 사용한 이미지가 맞다고 확인해 그 내용 그대로 commit한다 — 애초에 바이트가 달라진 원인(코드가 이 파일에 쓴 적은 없음, Word/동기화 도구 등 외부 요인 추정되나 미확정)은 여전히 불명이지만, 파일 내용 자체는 사용자가 실물로 확인한 유효한 기준 이미지다.
4. **untracked 임시 파일 정리**: `sample/hero.png`(예전 JSON 테스트용 임시 이미지, 더 이상 어떤 문서/코드에서도 참조되지 않음을 확인)와 Word 잠금 파일 `sample/~$ticle-eye-clinic-with-photo.docx`를 로컬에서 삭제했다. `.gitignore`에 `~$*` 패턴을 추가해 앞으로 Word/Office 잠금 파일이 `git status`에 나타나지 않도록 했다 — 이 패턴은 Office가 만드는 임시 파일 이름 규칙에만 해당하므로 프로젝트 코드/데이터에 영향이 없다.
5. **죽은 코드(`src/indesign.js`, `src/template.js`)는 삭제하지 않음**: 사용자가 이번 cleanup 범위에서 명시적으로 제외했다 — 기능 코드 정리와 성격이 다른 별도 판단 대상. 다만 어디서도 `require`되지 않는다는 사실은 문서화하고, 최종 배포 패키지에는 포함하지 않는 것으로 README.md에 기록했다.
6. **최종 사용자 배포 패키지 기준을 README.md에 명문화**: `manifest.json`, `index.html`, `styles.css`, `index.js`, `src/inspector.js`, `src/validation.js`, `src/data.js`, `src/docxArticle.js`, `src/docxZip.js`, `src/text.js`, `src/image.js`만 포함. `sample/`, `docs/`, `assets/`, `CLAUDE.md`/`README.md`/`HANDOFF.md`/`WORKLOG.md`/`DECISIONS.md`, `src/indesign.js`, `src/template.js`는 제외.

이번 결정이 바꾸지 않은 것(사용자 명시 지시): Word(.docx)/JSON 입력 기능, TITLE/POINT_TEXT/BODY/HERO_IMAGE/HERO_IMAGE_GUIDE 동작, Script Label 계약, InDesign 레이아웃 관련 코드 — 전부 이번 cleanup 전후로 동일하다. 새 기능은 추가하지 않았다.

## D021: Inspector에 Group 등 컨테이너 내부 pageItems 읽기 전용 재귀 탐색 추가

날짜: 2026-09-28

배경: 사용자가 실제 "목차" 페이지에서 `Inspect Template`을 실행했더니, 화면에는 제목/부제/페이지번호 등 여러 텍스트가 보이는데 `Inspection Log`에는 `Page Item 수: 22`인데도 `Text Frame: 1개`만 나왔다. 코드를 분석해 달라고 먼저 요청받아, [src/inspector.js](src/inspector.js)의 `inspectPage()`가 `page.textFrames`/`page.rectangles`라는 **타입별·페이지 직계 전용** 컬렉션만 순회한다는 것을 확인했다 — classic InDesign DOM 레퍼런스(`Page.textFrames`)에도 "The text frames on this page"라고만 되어 있고 Group 내부까지 포함한다는 언급이 없다. Group도 `page.pageItems`(타입 무관 전체 컬렉션)에는 최상위 항목 1개로만 잡히고, 그 안의 TextFrame은 `page.textFrames`에 애초에 나타나지 않는다 — `formatReport()`의 기존 안내 문구에도 이미 알려진 한계로 적혀 있었다. 22개 pageItems 중 1개만 순수 TextFrame이고 나머지는 Group 등 다른 타입으로 추정되지만, 정확한 구성은 코드로 실제로 순회해 보기 전에는 단정할 수 없었다.

결정: 기존 `page.textFrames`/`page.rectangles` 기반 로직과 `formatReport()`의 해당 출력 줄은 전혀 건드리지 않고, **완전히 별도의 읽기 전용 재귀 탐색을 추가만 한다.**

1. `detectPageItemType(item)`: pageItem의 타입 이름을 추정한다. 1차로 `item.constructor.name`을 시도하되(classic ExtendScript에서 흔한 패턴이지만 이 UXP 환경에서 검증된 적 없음), 실패하거나 빈 문자열/`"Object"`처럼 의미 없는 값이면 존재하는 속성 기반 휴리스틱으로 대체한다: `pageItems` 보유 → `"Group"`, `contents`가 문자열 → `"TextFrame"`, `images` 컬렉션 보유 → `"Rectangle"`. 그래도 판별하지 못하면 예외를 던지지 않고 `"UNKNOWN"`을 반환한다 — 타입 하나를 못 알아낸다고 전체 탐색이 중단되면 안 된다는 사용자 명시 요구사항을 반영했다.
2. `hasNestedPageItems(item)`: `item.pageItems`가 존재하고 `.length`가 숫자인지로 컨테이너 여부를 판단한다. `detectPageItemType`과 분리한 이유는, 타입 이름 판별에 실패(`"UNKNOWN"`)하더라도 실제로 `pageItems`를 순회할 수 있는 객체라면 재귀 자체는 계속 시도할 수 있게 하기 위함이다.
3. `buildPageItemNode(item, depth, parentType, maxDepth)`/`buildPageItemForest(page, maxDepth)`: `page.pageItems`를 depth 0 루트로 삼아 재귀적으로 트리를 만든다. 각 노드의 `name`/`label`/`bounds`는 기존 `getLabelText()`/`getBoundsText()`를 재사용해 그대로 가져오고, `text`는 `contents`가 문자열인 항목에서만 기존 `getTextPreview()`로 채운다. 모든 속성 접근은 개별 `try/catch`로 감싸 한 항목의 읽기 실패가 전체 탐색을 중단시키지 않는다. 순환 참조나 예상 밖의 깊은 중첩에 대한 방어적 안전장치로 depth 상한 20(`MAX_NESTED_ITEM_DEPTH`)을 뒀다 — 실제 템플릿이 이 정도로 깊다고 가정하는 것은 아니다.
4. `formatPageItemNodeLine`/`formatPageItemForest`: 위 트리를 `type`/`depth`/`parent`/`name`/`label`/`text`/`bounds`/`childCount`를 한 줄에 담아, `├─`/`└─` 연결선으로 들여쓰기한 텍스트로 만든다.
5. `inspectPage()`가 `buildPageItemForest(page, MAX_NESTED_ITEM_DEPTH)` 결과를 새 필드 `pageItemTree`에 담아 반환하고, `formatReport()`가 각 페이지의 기존 Text Frame/Rectangle 목록 **아래에 추가로** "중첩 Page Item 트리" 섹션을 출력한다. 기존 필드/출력 줄은 전혀 바뀌지 않아, `src/validation.js`(report의 `page.textFrames`/`page.rectangles`만 읽음)도 영향받지 않는다.

읽기 전용 보장: 모든 접근이 `item.pageItems`/`.name`/`.label`/`.contents`/`.geometricBounds`/`.images` 등 값 읽기뿐이며 어떤 속성에도 대입하지 않는다. `app.doScript`로도 감싸지 않는다(D006과 동일 원칙 — 문서를 수정하지 않는 조회는 doScript로 감쌀 필요가 없다). Script Label을 새로 쓰거나, "목차" 자동입력 로직이나 데이터 계약을 만드는 작업은 이번 범위에 포함하지 않았다(사용자 명시 지시).

이번 결정이 없애지 못하는 위험(미검증, 추측하지 않음): `item.constructor.name`이 이 InDesign UXP 환경에서 실제로 `"TextFrame"`/`"Group"`/`"Rectangle"` 같은 의미 있는 문자열을 주는지, Group이 아닌 다른 컨테이너성 타입(MultiStateObject, Button 등)이 목차 페이지에 있고 그것도 `pageItems`로 재귀 진입되는지, 실제 중첩 깊이가 2단계 이상인지 — 전부 이번 세션에는 실행 가능한 JavaScript 런타임이 없어 코드 리뷰로만 확인했고 실기 테스트로만 검증할 수 있다.

## D022: "PageItem" 오판별 수정 + "Inspect Current Page"(현재 페이지만 보기) 추가

날짜: 2026-09-28

배경: D021을 실제 목차 페이지에서 실기 테스트한 결과 "중첩 Page Item 트리"는 정상 출력됐지만, (1) 대부분의 `type`이 `TextFrame`/`Group`이 아니라 `"PageItem"`으로만 나왔고, (2) `Inspect Template`이 문서 14페이지 전체를 출력해 목차 페이지 하나만 확인하기 어려웠다.

**"PageItem" 원인 분석 — UXP 내부 동작이 아니라 D021 자체의 로직 버그로 확인됨**: `detectPageItemType()`은 `item.constructor.name`이 빈 문자열이 아니고 정확히 `"Object"`만 아니면 무조건 그 값을 최종 타입으로 신뢰하도록 되어 있었다. `"PageItem"`(모든 pageItem의 공통 상위 클래스로 보이는, 너무 일반적인 이름)도 이 조건을 그대로 통과해 버려서, 그 아래의 더 구체적인 휴리스틱(Group/TextFrame/Rectangle 판별)까지 코드가 내려가지 못하고 있었다. 이는 실제 코드를 다시 읽어 확인한 사실이며, UXP 엔진의 동작을 추측한 것이 아니다.

수정: `GENERIC_CONSTRUCTOR_NAMES = ["PageItem", "Item", "Object", ""]` 거부 목록을 추가해, `constructor.name`이 이 값들 중 하나면 신뢰하지 않고 항상 기존 휴리스틱(Group/TextFrame/Rectangle 판별, 실패 시 `"UNKNOWN"`)까지 계속 진행하도록 `detectPageItemType()`의 조건 하나만 고쳤다. GraphicLine 등 장식 객체를 이름으로 특정하는 판별은 사용자 명시 지시에 따라 이번에 추가하지 않았다 — 식별되지 않으면 `"UNKNOWN"`으로 남는 것으로 충분하다는 게 이번 범위의 최소 기준이다. `text`(TextFrame contents 미리보기)는 원래도 `type` 판별과 무관하게 `typeof item.contents === "string"`으로 독립적으로 채워지도록 D021에서 이미 만들어 뒀으므로, 이번에는 건드리지 않았다 — 사용자가 이 부분은 1번 수정 결과를 실기로 먼저 확인한 뒤 필요 여부를 판단하기로 함(id/타입 전용 컬렉션 교차 매칭 등 2차 보완은 이번에 넣지 않음).

**"Inspect Current Page" 추가**: `src/inspector.js`에 `inspectActivePage()`/`formatActivePageReport()`를 신규 추가하고, `index.html`에 `btnInspectCurrentPage` 버튼, `index.js`에 그 클릭 핸들러를 추가했다. 기존 `inspectDocument()`/`formatReport()`(전체 문서 Inspect, `btnInspect`)는 시그니처와 동작을 전혀 바꾸지 않았다 — 완전히 별도의 함수/버튼으로 구현해 회귀 위험을 최소화하는, 지난 분석 보고에서 제안했던 "더 안전한 방식"을 그대로 택했다.

- 현재 페이지 판별은 `app.activeWindow.activePage`를 시도한다 — classic InDesign Scripting DOM의 표준 속성이지만, 이 프로젝트에서 `activeWindow`/`activePage`를 읽어보는 것은 이번이 처음이라 이 UXP 환경에서 동일하게 노출되는지 미검증이다.
- **사용자가 명시적으로 요구한 안전장치: 읽기 실패 시 index=0 등 다른 페이지로 임의 대체(fallback)하지 않는다.** 실패하면 `{ ok: false, message }`를 반환하고, 호출자는 그 메시지를 그대로 Status/로그에 보여줄 뿐 어떤 페이지도 대신 표시하지 않는다 — 잘못된 페이지를 "현재 페이지"로 오인시키는 것을 막기 위함이다.
- 성공 시 `doc.pages`를 순회해 activePage의 index를 찾는다(1차: 참조 동등성 `===`, 실패 시 2차: `page.name` 일치로 대체 — 둘 다 이 UXP 환경에서 실제로 통하는지 미검증). index를 끝내 못 찾아도 조회 자체를 막지 않고 `"(확인 불가)"`로 표시한다(index 확인 실패는 activePage 확인 실패와 별개로 취급 — index는 표시용 부가 정보일 뿐이라 이것까지 못 찾는다고 전체 기능을 막을 필요는 없다는 판단).
- `inspectPage()`/`formatPageItemForest()`를 그대로 재사용해, 실제로 분석한 `page index`/`name`을 로그 맨 위에 명시한 뒤 그 페이지의 트리만 출력한다.

읽기 전용 보장: 이번 변경도 `.constructor`/`.pageItems`/`.name`(비교용) 읽기와 기존 재사용 함수(모두 값 읽기만 수행)뿐이며, 어떤 속성에도 대입하지 않는다. Script Label 쓰기, 텍스트 수정, 위치/크기 변경, 목차 Generate, Word/JSON 파서 수정, 기존 Opening Page 코드 수정, Template Selection 자동화 — 전부 이번 범위에 포함하지 않았다(사용자 명시 지시).

이번 결정이 없애지 못하는 위험(미검증): `app.activeWindow.activePage`가 이 UXP 환경에서 실제로 노출되는지, 두 페이지 참조 간 `===` 비교가 이 환경에서 유효한지, `GENERIC_CONSTRUCTOR_NAMES` 거부 후에도 여전히 `"PageItem"`류의 다른 일반적인 이름이 더 있는지, TextFrame의 `text`가 실기에서 실제로 채워지는지 — 전부 다음 실기 테스트로만 확인 가능하다.

## D023: "Inspect Current Page" 페이지 판별을 selection 우선으로 변경

날짜: 2026-09-28

배경: D022의 `inspectActivePage()`(`app.activeWindow.activePage` 단독 사용)를 사용자가 실제 목차 페이지에서 실기 테스트했다. 목차 페이지("목차샘플1")를 직접 클릭/선택한 뒤 `Inspect Current Page`를 실행했는데도 **매번 `index=0, name=1, Page Item 수=61`**만 반환됐다 — 이미 전체 문서 Inspect로 실제 목차 페이지가 `index=1, name=2, Page Item 수=22`임이 확인된 상태였으므로 명백히 다른 페이지였다.

**결론(관찰된 사실, 추측 아님): 이 UXP 환경에서 `app.activeWindow.activePage`는 사용자가 실제로 보고 있는/선택한 페이지를 전혀 반영하지 않고, 항상 문서의 첫 페이지를 반환한다.** D022 시점에는 "classic DOM 표준 속성이니 시도해볼 가치가 있다"는 수준의 미검증 가정이었지만, 이번 실기 결과로 이 속성 단독으로는 신뢰할 수 없다는 것이 확정됐다.

사용자가 대안으로 `app.activeDocument.selection`(현재 선택된 객체) → 선택된 객체의 `parentPage`(classic ExtendScript `PageItem`의 표준 속성)로 페이지를 역추적하는 방식을 제안했고, 우선순위를 다음과 같이 재구성하도록 명시적으로 지시했다:

1. **1순위 — `getPageFromSelection()`(신규)**: `app.activeDocument.selection`을 조회하고(비어 있으면 classic ExtendScript에 더 흔히 문서화된 `app.selection`도 방어적으로 한 번 더 시도), 첫 번째 선택 객체의 `parentPage`를 읽는다. 성공하면 그 Page를 사용한다.
2. **2순위 — `app.activeWindow.activePage`(기존 D022 코드)**: 1순위가 실패했을 때만(선택된 객체가 없거나, `parentPage`를 읽을 수 없거나 없을 때) 대체 수단으로 시도한다. 실기로 신뢰도가 낮음이 확인됐지만, 선택된 객체가 전혀 없는 상황(예: 방금 문서를 열어 아직 아무것도 클릭하지 않은 상태)을 위한 최후 수단으로는 남겨뒀다.
3. **둘 다 실패하면 index=0 등으로 절대 대체하지 않는다**(사용자 명시 재확인) — `{ ok: false, message }`를 반환하고 실패 사유를 그대로 보여준다.
4. 어떤 방법으로 페이지를 얻었는지 `source`(`"selection.parentPage"` 또는 `"activeWindow.activePage"`)를 함께 반환해, `formatActivePageReport()`가 `Current Page source: ...`를 로그 맨 위에 표시한다.
5. Page 객체가 `doc.pages` 안에서 몇 번째인지(index) 찾는 로직은 D022에서 이미 만든 것(참조 동등성 → `name` 일치 대체)을 `findPageIndex(doc, page)`라는 공용 함수로 추출했을 뿐, 동작은 바뀌지 않았다 — 1순위/2순위 어느 쪽으로 페이지를 얻었든 같은 함수로 index를 찾는다.

변경 범위는 `src/inspector.js`의 `inspectActivePage()`와 그 주변 헬퍼(`getPageFromSelection`, `findPageIndex`)로 한정했다 — `index.html`/`index.js`(버튼/핸들러는 이미 범용적으로 `inspectActivePage()`/`formatActivePageReport()`를 호출하고 있어 수정 불필요), 전체 문서 Inspect(`inspectDocument()`/`formatReport()`), D021/D022에서 고친 `detectPageItemType()`, 기존 Opening Page 코드(`src/text.js`/`src/image.js`/`src/validation.js`) — 전부 이번에 건드리지 않았다.

읽기 전용 보장: `app.activeDocument.selection`/`app.selection`/`firstItem.parentPage`/`doc.pages.item(i)` 전부 값 읽기이며 어떤 속성에도 대입하지 않는다. `app.doScript` 미사용. Script Label 쓰기, 텍스트/위치/크기 변경, 목차 Generate, 기존 Opening Page 코드 수정 — 전부 이번 범위 밖(사용자 명시 지시).

이번 결정이 없애지 못하는 위험(미검증, 다음 실기 테스트로만 확인 가능): `app.activeDocument.selection`(또는 `app.selection`)이 이 UXP 환경에서 실제로 선택된 객체를 반영하는지, `firstItem.parentPage`가 이 환경에서 지원되는지, 선택된 객체가 여러 개일 때 첫 번째 객체만 보는 것으로 충분한지(이번 범위에서는 다루지 않음), `app.activeWindow.activePage`가 여전히 index=0을 반환하는지(2순위 fallback 경로 자체의 재확인).

**정정(2026-09-28, 실기 검증 완료)**: 사용자가 목차샘플1 페이지 안의 객체를 직접 선택한 뒤 `Inspect Current Page`를 실기 테스트해 `Current Page source: selection.parentPage`, `Current Page: index=1, name=2`, `Page Item 수: 22`가 정확히 나옴을 확인했다 — 이는 전체 문서 Inspect로 이미 확인된 실제 목차 페이지 값과 정확히 일치한다. 이로써 위 "없애지 못하는 위험" 중 `app.activeDocument.selection`/`firstItem.parentPage`가 이 UXP 환경에서 실제로 동작한다는 점은 해소됐다. D023은 더 이상 "실기 검증 전" 상태가 아니다.

## D024: 목차샘플1 실제 구조 확정 + Script Label 계약 확정 (읽기 전용 분석, 실기 검증 완료)

날짜: 2026-09-28

배경: D021~D023으로 갖춰진 재귀 Inspector(`Inspect Current Page`, "중첩 Page Item 트리")를 이용해, 사용자가 목차샘플1 페이지(`index=1`, `name=2`)를 실제 InDesign에서 직접 분석했다.

**확정된 실제 구조**:
- `Page Item 수` = 22 (전체 최상위 pageItem 개수)
- 그중 20개가 목차 슬롯(반복 항목), 나머지 2개는 상단 고정 디자인 요소("매거진 / 목차샘플1" 영역)
- 상단 고정 요소 2개는 **이번 자동화 대상이 아니며, Script Label을 붙이지 않는다** — 매 호마다 바뀌지 않는 고정 디자인이라는 전제(사용자 확인).

**확정된 Script Label 계약 (목차 슬롯 20개 전부에 사용자가 직접 부여, `Inspect Current Page`로 전수 확인 완료)**:

```
TOC_ITEM_01 (Group, childCount=3)
 ├─ TOC_TEXT   (TextFrame — 제목 + 부제가 같은 TextFrame 안에 함께 들어 있음, 별도 SUBTITLE 프레임 없음)
 ├─ (label 없음: 점선/구분선 — 데이터 필드 아님, 자동화 대상 아님)
 └─ TOC_PAGE   (TextFrame — 페이지 번호)

... (TOC_ITEM_02 ~ TOC_ITEM_20까지 동일 구조 반복)
```

- Group 자체에 `TOC_ITEM_01`~`TOC_ITEM_20` Script Label 부여(슬롯 단위 식별, [목차 슬롯 식별] 절 참고).
- Group 내부에는 `TOC_TEXT`(TextFrame, 제목+부제 통합 — 원래 설계 초안에서는 TITLE/SUBTITLE 분리를 검토했지만 실제 템플릿은 하나의 TextFrame에 둘 다 들어있는 구조로 확정됨)와 `TOC_PAGE`(TextFrame, 페이지 번호)만 Script Label을 부여한다.
- 점선/장식 객체는 Script Label을 붙이지 않는다 — 데이터 입력 대상이 아니므로 코드가 찾을 필요가 없다.
- 사용자가 `TOC_ITEM_01`~`TOC_ITEM_20` 전부와 그 내부 `TOC_TEXT`/`TOC_PAGE`를 InDesign에서 직접 부여한 뒤, `Inspect Current Page`로 20개 슬롯 전부 확인했다: 각 `TOC_ITEM_NN`의 `childCount=3`(Group/TOC_TEXT/점선/TOC_PAGE 중 Script Label이 있는 2개 + 무라벨 점선 1개), `TOC_TEXT`/`TOC_PAGE` 존재, 점선은 무라벨로 확인됨.

**[목차 슬롯 식별] 결정**: 화면 좌표나 `page.pageItems`의 등록 순서(index)로 목차 슬롯을 찾지 않는다 — 레이아웃 편집으로 순서가 바뀔 위험이 있기 때문이다(D008 원칙의 연장). `TOC_ITEM_01`~`TOC_ITEM_20` Script Label만으로 슬롯을 명시적으로 식별한다.

범위: 이번 결정은 **읽기 전용 분석과 Script Label 부여/검증까지만**이다. `TABLE_OF_CONTENTS` Generate 코드, Word 반복 TOC 파서, 가변 슬롯 검증 로직은 이번에 구현하지 않았다(설계는 D025 참고). 기존 Opening Page 코드(`src/text.js`/`src/image.js`/`src/validation.js`)와 Word/JSON 파서는 이번에도 전혀 수정하지 않았다.

## D025: 목차(TABLE_OF_CONTENTS) 가변 슬롯 검증 정책 (설계 확정, 구현 예정 — 아직 코드 없음)

날짜: 2026-09-28

**이 결정은 정책 설계이며, 아직 어떤 코드로도 구현되지 않았다.** `TABLE_OF_CONTENTS` Generate를 실제로 만들 때 이 정책을 그대로 따른다.

배경: 목차 항목 수는 원고마다 달라진다. D024에서 확정한 템플릿은 슬롯을 최대 20개(`TOC_ITEM_01`~`TOC_ITEM_20`) 제공하지만, 실제 원고 데이터는 그보다 적은 경우가 대부분일 것으로 예상된다. `OPENING_PAGE`의 `OPENING_PROFILES_BY_VARIANT`처럼 "정의된 Label이 항상 전부 있어야 통과"하는 고정 검증 방식을 그대로 쓰면, 데이터가 8개뿐인데 `TOC_ITEM_09`~`TOC_ITEM_20`에 대응하는 데이터가 없다는 이유로 Generate 전체가 실패하게 된다 — 이는 목차의 실제 사용 패턴과 맞지 않는다.

**확정된 정책**:
1. Article Data의 `items.length`로 실제 데이터 개수 N을 구한다.
2. 템플릿이 제공하는 최대 슬롯 수(현재 20, `TOC_ITEM_01`~`TOC_ITEM_20`)를 초과하면(N > 20) **쓰기 시작 전에 Generate 전체를 중단**한다.
3. `TOC_ITEM_01`~`TOC_ITEM_0N`(실제로 쓰일 슬롯만)에 대해서만 `TOC_TEXT`/`TOC_PAGE` Script Label이 모두 존재하고 타입이 맞는지 검증한다. `TOC_ITEM_0(N+1)`~`TOC_ITEM_20`은 이 검증에서 완전히 제외한다 — 존재 여부/Label 누락 여부를 따지지 않는다.
4. 3번 검증에서 사용되는 슬롯(1~N) 중 하나라도 필요한 객체(`TOC_TEXT` 또는 `TOC_PAGE`)가 없으면, 기존 `applyOpeningPageContent()`가 지켜온 "탐색 전부 → 쓰기 전부, 하나라도 실패하면 아무것도 안 씀" 원칙(D014)을 그대로 따라 **부분 입력 없이 Generate 전체를 중단**한다.
5. N이 20보다 작은 것(예: N=8)은 정상 케이스다 — `TOC_ITEM_09`~`TOC_ITEM_20`가 사용되지 않는다는 이유로 검증 오류를 내지 않는다.
6. 사용되지 않는 나머지 슬롯(`TOC_ITEM_0(N+1)`~`TOC_ITEM_20`)은 **손대지 않는다** — 텍스트도, 프레임도, Script Label도 그대로 둔다(디자이너가 넣어둔 placeholder 문구가 남아 있는 채로 유지). 이 MVP에서는 "안 쓰는 슬롯의 placeholder를 비우는" 것도 하지 않기로 잠정 결정했다 — 실제 목차 구조(특히 빈 텍스트 프레임이 점선/장식과 함께 시각적으로 어떻게 보이는지)를 실기로 확인하기 전까지는 "그대로 유지"가 가장 안전한 기본값이라고 판단했기 때문이다. 필요하면 Generate 구현 이후 별도로 재검토한다.

**데이터 배열 순서 ↔ Script Label 슬롯 매핑**: `items[0]`~`items[N-1]`을 정렬된 슬롯 목록(Label 문자열의 번호 `01`~`0N` 기준으로 정렬 — 화면상 위치나 등록 순서가 아니다)에 순서대로 대응시킨다. InDesign 객체 자체를 순서만으로 찾지 않는다는 원칙(D024 [목차 슬롯 식별])은 그대로 유지된다.

이 정책은 아직 코드로 구현되지 않았다 — 다음 개발 단계에서 `TABLE_OF_CONTENTS` 데이터 계약 확정 → 이 정책을 반영한 validation 함수 구현 → JSON 기반 목차 입력 구현 → 실제 Generate 함수 구현 순서로 진행한다.

## D026 — 사용자 요청에 따른 새 디자인 모드 추가 (2026-09-28)

사용자가 기존 양식 없이 기사에서 디자인을 만들 수 있는지 질문한 뒤 “제작해줘”라고 요청했다. 기존 D016은 **기존 양식 모드**에 계속 적용한다. 새 디자인 모드는 별도 새 문서에만 프레임을 생성·배치하고 AUTO_ 라벨을 부여한다. 원본 템플릿과 활성 사용자 문서는 입력 대상으로 사용하지 않는다. 프레임 위치는 기사/설정/설계안으로 계산하며 기존 템플릿의 좌표·프레임 목록을 읽지 않는다.

## D027 — 로컬 디자인과 선택형 AI를 명확히 구분

무료 3안은 기사 길이·사진 유무에 따른 규칙 계산이다. AI 모드는 사용자 키로 Responses API에 단일 첫 페이지 geometry를 요청한다. 입력 원문은 프로그램이 보관하며 AI는 역할·좌표만 제안한다. 사진/키를 저장 결과에 포함하지 않고 파일 경로는 AI에 보내지 않는다. 기존 모드의 외부 API 의존성은 없다. 무효 AI 결과는 중단하고 유료 자동 재시도를 하지 않는다.

## D028 — 새 문서에서의 실제 넘침 기반 페이지 추가와 출력 검사

첫 페이지와 예상 후속 페이지를 만든 뒤 본문을 하나의 Story로 연결하고 한 번 입력한다. 실제 overflows가 남으면 최대 40장까지 추가한다. 제목·부제는 자동 축소하지 않고 검사 결과로 알린다. 기본 오류가 있으면 패널 PDF 출력을 차단한다. 실패 복구는 새 미완성 문서 닫기로 구현한다. ENTIRE_SCRIPT를 자동 rollback 보장으로 해석하지 않는다.

## D029 — 일반 원고 입력과 검증 범위

새 디자인 모드: 일반 DOCX/TXT 첫 내용 문단=제목, 나머지=본문. Word 탭/줄바꿈을 보존하고 중복 마커를 거부한다. 표·각주 등 미지원 요소는 누락시키지 않고 거부한다. ZIP 출력 크기/경계 검사를 보강했다. 기존 모드의 데이터 타입 계약은 유지했다. Node와 모의 Host/DOM 테스트는 실제 Adobe 실행을 대체하지 않는다.


## D030 — 새 디자인 제작 대상·출력 상태와 실기 진단 (2026-09-29)

새 모드의 FontStatus/LinkStatus는 Adobe UXP 지침에 따라 equals()로 비교하고, 숫자형 모의 값도 허용한다. 새 생성 시 이전 latest/UI 연결을 먼저 해제하며 기존 문서 자체는 닫지 않는다. 생성과 첫 검사가 반환된 뒤에만 새 문서를 추적한다. Document.save가 유효한 Document를 반환하면 그 문서로 latest를 갱신한다. 검사 오류/예외는 PDF 버튼을 차단하며 검사 및 수정용 INDD 저장으로 복구할 수 있다. 출력 직전 Host 검사도 유지한다.

PDF exportFile의 반환값으로 성공/취소를 추측하지 않는다. afterExport를 수신하면 성공, 받지 못하면 완료 미확인, 예외는 단계별 실패로 표시한다. UXP 파일 선택창 취소는 명확히 취소로 표시한다. 이벤트 지원과 PDF 옵션 취소의 실제 형태는 PC에서 확인할 항목이다. 기존 경로 전달 방식과 doScript 언어/콜백은 임의 변경하지 않았다. 로그는 상태/제작 결과 영역에 표시하며 원본 Error/스택·키·개인 경로를 출력하지 않는다. 기존 시작 페이지·Inspector·목차 코드는 변경하지 않는다. 공식 근거와 호출 흐름은 docs/PRODUCTION_TESTS.md 참고.


## D031 — 새 디자인 렌더러의 공통 속성과 프레임 선 제거 (2026-09-29)

geometry plan v1을 유지하면서 typography/furniture/RENDER 기본값을 layout-engine에서 두 렌더러에 제공한다. 편집 프레임은 strokeColor=None 및 fill=None을 명시하고, 의도된 AUTO_RULE은 독립 role과 accent fill로 보존한다. 새 문서의 문단/문자 override만 제거한다. 기존 양식 객체에는 적용하지 않는다. CSS/InDesign 조판 차이로 픽셀 일치나 페이지 수 일치를 보장하지 않는다. 상세 비교: docs/RENDER_PARITY.md.


## D032 — 실제 설치 face 선택과 명시적 대체 (2026-09-29)

새 모드는 app.fonts의 INSTALLED face를 name/family/style/fullName/PostScript로 조회한다. 저장 식별자는 Font.name, 적용은 실제 Font 객체 후 실제 fontStyleName 순서다. 없는 스타일명을 합성하지 않으며 모호한 family나 없는 face는 오류로 안내하고 사용자가 실제 목록에서 대체한다. 기본 Freesentation은 예시 설정일 뿐 자동 fallback이 아니다. 파일 이동 시 누락 폰트를 경고한다. UI catalog와 생성 시 검증을 분리하여 마지막 순간 폰트 비활성화도 차단한다. 큰 템플릿 시스템은 구현하지 않고 geometry/template 두 renderer의 공존 설계만 기록했다.
