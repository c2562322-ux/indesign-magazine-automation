# WORD_INPUT_SPEC.md

Word(.docx) 원고 파일을 읽어 기존 Article Data 구조로 변환하는 입력 형식을 정의하는 문서다. [docs/ARTICLE_DATA_SPEC.md](ARTICLE_DATA_SPEC.md)가 "JSON으로 표현한 Article Data 구조"를 다룬다면, 이 문서는 "그 구조를 만들어내는 또 다른 입력 방식(Word 마커 형식)"을 다룬다. 최종적으로 두 입력 방식 모두 **같은** Article Data 구조를 만든다(D016의 "공통 Article Data 구조" 원칙, [DECISIONS.md](../DECISIONS.md) D019).

## 현재 범위 (2026-09-28, D019)

- **OPENING_PAGE / WITH_PHOTO 1종만** 다룬다. WITHOUT_PHOTO, 다른 Template Type은 다루지 않는다.
- **DOCX만 지원한다.** HWP/HWPX, Excel은 이번 MVP에서 구현하지 않는다.
- **Template Selection(어떤 템플릿을 쓸지 자동 판단)은 다루지 않는다** — variant는 항상 `WITH_PHOTO`로 고정한다.
- Overset(본문이 넘칠 때 처리), 페이지 추가, InDesign 레이아웃 변경은 다루지 않는다(기존 원칙 그대로 유지).
- Word 문서의 서식(굵게/기울임/글꼴/색 등)은 무시하고 **텍스트 내용만** 추출한다.
- 아직 실제 InDesign에서 Word → Generate까지 end-to-end로 실행해 검증된 적이 없다 — [HANDOFF.md](../HANDOFF.md)를 확인해 실기 검증 상태를 먼저 확인한다.

## 마커 형식

DOCX 파일 안의 문단(Word에서 Enter로 구분한 각 줄)이 다음 네 마커로 구획되어야 한다. 마커는 대괄호 `[` `]` 안에 필드 이름만 있는 한 줄이며, 대괄호 안쪽 공백은 허용한다(`[TITLE]`과 `[ TITLE ]` 모두 인식).

```
[ TITLE ]
(제목 내용)

[POINT_TEXT]
(포인트 문구 내용)

[BODY]
(본문 내용 — 여러 문단 가능, 문단 사이 빈 줄로 구분)

[HERO_IMAGE]
(이미지 파일명 또는 상대 경로, 예: hero.png)
```

- 마커 이름은 대소문자를 구분하며 정확히 `TITLE`/`POINT_TEXT`/`BODY`/`HERO_IMAGE`여야 한다.
- 네 마커 모두 있어야 하고, 각 마커 아래 내용이 비어 있으면 안 된다 — 하나라도 없거나 비어 있으면 파싱 단계에서 오류로 처리되고, **InDesign 문서는 전혀 수정되지 않는다**(기존 JSON 경로와 동일한 "검증 실패 시 문서 미수정" 원칙).
- 마커 사이/앞뒤의 빈 줄은 무시된다(각 필드 내용의 맨 앞/뒤 빈 줄은 잘라낸다). `BODY` 안의 문단 사이 빈 줄은 그대로 유지되어 여러 문단으로 구분된다.
- 마커 순서는 예시와 같은 순서(TITLE → POINT_TEXT → BODY → HERO_IMAGE)를 권장하지만, 파서 자체는 순서에 의존하지 않는다(마커를 만날 때마다 그 다음 마커 전까지의 내용을 해당 필드로 취급).

## Article Data로의 변환

| 마커 | Article Data 필드 | 비고 |
|---|---|---|
| `[TITLE]` | `title` | |
| `[POINT_TEXT]` | `pointText` | |
| `[BODY]` | `body` | 문단 사이 줄바꿈(`\n`)이 그대로 유지된다. **`\n`이 InDesign TextFrame에서 실제로 별도 문단으로 나뉘어 보이는지는 아직 실기로 확인되지 않았다** — 실기 테스트에서 육안 확인 필요. |
| `[HERO_IMAGE]` | `heroImage` | 기존 JSON의 `heroImage`와 동일하게, **이 DOCX 파일이 있는 폴더 기준 상대 경로**로 해석된다([DECISIONS.md](../DECISIONS.md) D017/D019 — `src/image.js`의 `resolveHeroImagePath`를 그대로 재사용). |

변환 결과는 다음과 같은 형태가 된다(`templateType`/`variant`는 파서가 고정값으로 채워 넣는다 — DOCX 마커에는 없음):

```json
{
  "templateType": "OPENING_PAGE",
  "variant": "WITH_PHOTO",
  "title": "...",
  "pointText": "...",
  "body": "...",
  "heroImage": "..."
}
```

이 결과는 [src/validation.js](../src/validation.js)의 `validateArticleData()`로 **JSON과 완전히 동일하게** 검증되고, [src/text.js](../src/text.js)의 `applyOpeningPageContent()`로 **JSON과 완전히 동일하게** InDesign에 반영된다 — 이 두 모듈은 Word 지원을 추가하면서 전혀 수정하지 않았다.

## 예시 파일

- [sample/article-eye-clinic-with-photo.docx](../sample/article-eye-clinic-with-photo.docx) — 안과 병원 매거진 기사 예시(2026-09-28 생성). PowerShell + .NET `System.IO.Compression`으로 만든, 실제 DEFLATE 압축을 사용하는 유효한 .docx 파일이다.
- [sample/eye-clinic-hero.png](../sample/eye-clinic-hero.png) — 위 DOCX와 같은 폴더(`sample/`)에 위치한 테스트용 이미지(기존 `sample/hero.png`를 복사한 것 — 실제 안과 병원 사진이 아니라 자리 채움용 이미지).

## DOCX 읽기 방식 (기술적 배경)

UXP에는 zip 해제나 압축 해제(inflate) 내장 API가 없다([DECISIONS.md](../DECISIONS.md) D019에서 확인한 공식 문서 기준). 이 프로젝트는 서드파티 라이브러리를 번들하는 대신, RFC 1951(DEFLATE) 압축 해제와 최소 ZIP 리더를 [src/docxZip.js](../src/docxZip.js)에 직접 구현했다. [src/docxArticle.js](../src/docxArticle.js)가 이 ZIP 리더로 `.docx` 안의 `word/document.xml`을 꺼내 문단(`<w:p>`)/텍스트(`<w:t>`) 태그만 정규식으로 추출하고, 위 마커 형식에 따라 Article Data로 변환한다. 서식이 복잡한 문서(표, 각주, 하이퍼링크, 다단 등)는 다루지 않는다.

**이 ZIP/DEFLATE/XML 처리 코드는 이 프로젝트에서 직접 새로 작성했고, 이 세션에서는 실행 가능한 JavaScript 런타임(Node.js 등)이 없어 자체적으로 실행 검증조차 해보지 못했다.** 실제 InDesign UXP 환경에서의 첫 실행이 곧 이 코드의 첫 실행이다 — 실기 테스트가 매우 중요하다.

**1차 실기 테스트에서 플러그인 패널이 빈 화면으로 뜨는 문제가 발견됐다(2026-09-28)**: `src/docxZip.js`에서 이 코드베이스 최초로 쓴 객체 리터럴 getter/setter 접근자 프로퍼티(`get bytePos()`/`set bytePos()`)를 가장 유력한 원인으로 보고 일반 메서드(`getBytePos()`/`setBytePos()`)로 교체했다(기능 동일). 이 수정이 실제로 문제를 해결했는지는 아직 재테스트로 확인되지 않았다 — [HANDOFF.md](../HANDOFF.md)/[DECISIONS.md](../DECISIONS.md) D019 참고.

## 아직 정해지지 않은 것 / 미검증 사항

- `require("uxp").storage.formats.binary`로 `.docx` 파일을 ArrayBuffer로 읽는 것이 이 InDesign UXP 환경에서 실제로 동작하는지 미검증(공식 문서 기준으로는 지원되는 것으로 보임).
- 자체 구현한 raw DEFLATE 압축 해제(`src/docxZip.js`)가 실제 Microsoft Word로 저장한 `.docx` 파일(다양한 Word 버전, 복잡한 서식)에 대해 항상 올바르게 동작하는지 미검증 — 이번 MVP는 제공된 예시 파일 1개 기준으로만 확인 예정이다.
- `BODY`의 `\n`이 InDesign TextFrame에서 어떻게 렌더링되는지(문단 구분/줄바꿈 여부) 미검증.
- Word에서 줄바꿈(Shift+Enter, `<w:br/>`)으로 만든 문단 내부 줄바꿈은 현재 추출 로직이 인식하지 못한다 — Enter(새 문단, `<w:p>`)만 인식한다.
- 매우 큰 DOCX 파일이나 4GB 이상 ZIP64 포맷은 지원하지 않는다(Word 원고 문서 규모에서는 해당 사항 없음).

## 관련 문서

- [docs/ARTICLE_DATA_SPEC.md](ARTICLE_DATA_SPEC.md) — Article Data 구조 자체(JSON 기준)
- [HANDOFF.md](../HANDOFF.md) — 현재 프로젝트 상태, 실기 검증 여부
- [DECISIONS.md](../DECISIONS.md) D019 — 이번 결정과 근거

## 1.1 갱신 (2026-09-28)

위의 1.0 개발 당시 미검증 설명은 과거 기록이다. 최신 상태는 HANDOFF.md가 기준이다. 새 디자인 모드의 일반 원고/마커 입력은 README.md를 참고한다. `word-text.js`로 탭/수동 줄바꿈을 보존하도록 수정했고 Node 테스트로 확인했다. 중복 마커·표·각주·텍스트상자·변경 추적·필드·수식은 오류로 처리한다. 새 코드의 InDesign 실제 실행은 아직 검증하지 않았다.
