# WORKLOG.md

작업 이력을 시간순으로 누적 기록한다. 새 로그는 파일 맨 아래에 추가한다.

---

## 2026-09-21 - 초기 UXP 프로젝트 구조 생성

완료:
- `indesign-magazine-automation` 프로젝트 기본 폴더 구조 생성 (manifest.json, index.html, styles.css, index.js, src/, sample/)
- UXP manifest v5 작성 (host: InDesign, panel entrypoint 1개)
- `Magazine Automation` 패널 UI 작성 (Load Article 버튼, Generate 버튼, Status 표시)
- `src/indesign.js`에 `addHelloText()` 구현: `Generate` 클릭 시 활성 문서 첫 페이지에 "Hello Magazine" 텍스트 프레임 생성
- `src/data.js`, `src/template.js`, `src/text.js`, `src/image.js`, `src/validation.js` 스텁 파일 생성 (다음 단계용, 로직 없음)
- `sample/article.json` 샘플 기사 데이터 작성
- 루트 `README.md` 작성 (폴더 구조, UXP Developer Tool 실행 방법)

변경 파일:
- manifest.json
- index.html
- styles.css
- index.js
- src/indesign.js
- src/data.js
- src/template.js
- src/text.js
- src/image.js
- src/validation.js
- sample/article.json
- sample/images/README.md
- README.md

테스트:
- 없음. UXP Developer Tool 및 실제 InDesign에서 로드/실행해보지 않았다. 코드 작성만 완료된 상태.

남은 문제:
- `src/indesign.js`의 `app.doScript()` 호출 시그니처가 실제 InDesign UXP API와 맞는지 미검증.
- UDT에서 manifest.json 로드 자체가 되는지 미검증.

---

## 2026-09-22 - 문서화 체계 구축

완료:
- 새 개발자/새 Claude Code 세션이 이어서 작업할 수 있도록 문서화 체계 구축
- `CLAUDE.md` 작성: Claude Code가 이 프로젝트에서 지켜야 할 작업 규칙 정리
- `HANDOFF.md` 작성: 현재 프로젝트 상태(완료/테스트 여부/미구현/알려진 문제/다음 작업/디자이너 확인 사항) 정리
- `WORKLOG.md` 작성: 이전 작업(2026-09-21) 포함 작업 이력 기록 시작
- `DECISIONS.md` 작성: 지금까지 실제로 확인 가능한 기술 결정 기록
- `docs/TEMPLATE_SPEC.md` 작성: 디자이너 템플릿 규칙을 기록할 문서 구조 생성 ("템플릿 미수령" 상태 명시)
- `README.md` 내용을 실제 코드 상태와 대조 확인 (수정 불필요, 현재 구조와 일치함을 확인)

변경 파일:
- CLAUDE.md (신규)
- HANDOFF.md (신규)
- WORKLOG.md (신규)
- DECISIONS.md (신규)
- docs/TEMPLATE_SPEC.md (신규)

테스트:
- 해당 없음 (문서 작업만 진행, 기능 코드는 수정하지 않음)

남은 문제:
- 없음

---

## 2026-09-22 - 디자인 리소스 폴더(assets) 추가

완료:
- 디자이너로부터 실제 InDesign 원본 템플릿(.indd/.idml)과 폰트 파일을 전달받아 보관할 폴더 구조 생성: `assets/templates/original/`, `assets/templates/working/`, `assets/fonts/`
- 각 리소스 폴더에 `.gitkeep` 추가 (빈 폴더 구조를 clone 이후에도 유지하기 위함)
- `.gitignore` 신규 작성: `assets/templates/original/*`, `assets/templates/working/*`, `assets/fonts/*` 아래 실제 파일은 Git에 올리지 않고 `.gitkeep`만 추적하도록 설정
- `README.md`에 `assets` 폴더 구조/역할 설명 추가
- `HANDOFF.md`에 디자이너 템플릿·폰트 수령 상태 반영, "외부 대기 사항"/"다음 추천 작업" 갱신
- `DECISIONS.md`에 D005(assets 리소스 Git 추적 제외 방식) 기록
- `docs/TEMPLATE_SPEC.md` 상태를 "템플릿 미수령" → "템플릿 파일 수령, 분석 전"으로 갱신 (표 내용은 미확정 그대로 유지)

변경 파일:
- assets/templates/original/.gitkeep (신규)
- assets/templates/working/.gitkeep (신규)
- assets/fonts/.gitkeep (신규)
- .gitignore (신규)
- README.md
- HANDOFF.md
- DECISIONS.md
- docs/TEMPLATE_SPEC.md

테스트:
- 해당 없음 (폴더/문서/설정 변경만 진행, 기능 코드는 수정하지 않음)

남은 문제:
- 없음. 단, `assets/templates/original/`의 실제 원본 파일 분석 및 `docs/TEMPLATE_SPEC.md` 반영은 아직 진행되지 않았다 (다음 작업으로 HANDOFF.md에 기록).
