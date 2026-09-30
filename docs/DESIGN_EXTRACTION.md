# 디자인 추출 — Phase 1 사용법

현재 구현: **IDML 오프라인 추출 → v2 JSON → 선택 프레임 text proof → Preview/새 InDesign 문서 속성 비교**.
아직 없음: 패널의 가져오기 버튼, 자동 라이브러리 등록, 원본 전체 지면 복제, INDD 바이너리 파서.

## 추출 원본 선택

| 경로 | 얻을 수 있는 정보 | 제약 / 이번 상태 |
|---|---|---|
| 열린 INDD → UXP DOM | resolved 스타일, live overflows/visibleBounds, 실제 폰트/페이지 객체 | InDesign 필요, API/버전별 검증 필요. 전체 추출기는 다음 단계 |
| INDD → IDML 내보내기 → XML | geometry, story/style/font/resource 참조, transforms, 문서 구조 | 실제 조판 결과·line breaks·live overset 미포함. **이번에 구현** |

원본은 저장/변경하지 않는다. 다른 이름으로 IDML을 내보내 사용한다. 첫 번째 제공 `2매거진자동화템플릿.indd`는 이번에 대응 IDML을 확인하지 못했으므로 분석 완료로 취급하지 않았다. 두 번째 INDD 폴더의 IDML과 프로젝트 ignored original IDML은 동일 SHA256였다. INDD와 IDML의 저장 시점까지 동일하다는 것은 확인하지 못했다.

## 비개발자 작업 순서

1. InDesign에서 디자인 원본을 연다.
2. 원본 INDD는 보존하고 별도 IDML 파일로 내보낸다.
3. 아래 명령을 개발자에게 실행하도록 요청하거나 PowerShell에서 실행한다.
4. 모델의 `issues`와 `capabilities`를 확인한다. 경고가 많다고 추출 실패는 아니지만, 전체 재현 가능을 뜻하지도 않는다.
5. 이번 단계에서는 자동으로 Studio 디자인 카드가 추가되지 않는다. 원본 모델을 검토·보관한 뒤 다음 단계의 importer에 연결한다.

## 실행 환경과 명령

Python 3.10+ 표준 라이브러리만 사용한다. Python은 **오프라인 개발 도구에만** 필요하며 UXP 플러그인의 런타임 의존성이 아니다. Node 20+는 proof 파일 작성에 사용한다. `python`이 PATH에 없으면 설치된 실행 파일 절대경로로 바꾼다.

프로젝트 루트에서:

```powershell
python tools/extract_design.py "원본.idml" "assets/templates/working/my-design-v2.json"
node tools/design-proof.js "assets/templates/working/my-design-v2.json" "프레임Self값" "assets/templates/working/my-text-proof"
```

두 명령은 **이미 있는 출력 파일을 덮어쓰지 않는다**. 새 이름을 사용한다. 변환 결과에는 원본 글과 이미지 경로가 포함될 수 있다. 결과는 ignored `assets/templates/working/`에 보관하고 GitHub에 올리지 않는다. 입력 INDD/IDML/폰트를 Git에 추가하지 않는다.

`my-text-proof.html`은 브라우저용이고 `my-text-proof.json`은 **같은 속성 plan**이다. 아직 전체 디자인 미리보기가 아니며 미재현 항목이 표시된다. 특정 frame만 선택하는 것은 속성 비교를 위한 명시적 부분 검증이다.

## 실제 자료에서 이번에 만든 로컬 결과

- `assets/templates/working/design-model-v2.local.json`: 최초 추출 실험 (Git 제외).
- 최종 재추출/검증본은 `design-model-v2.verified.json`.
- `text-proof-verified.json` / `.html`: 원본 `u1e4` 프레임의 부분 검증용 plan과 화면.
- 이 프레임은 실제 IDML에서 45pt, 39pt leading, 약 -20 tracking이며 여러 font style이 섞인다. 요청문의 51/54/-20은 예시이므로 원본 값으로 강제 변경하지 않는다. 그 예시 수치는 별도 합성 fixture에서 검증한다.

## InDesign 속성 검증 (개발자용)

이 경로는 기존 Studio `latest`/저장/PDF와 연결하지 않는다. 원본을 수정하지 않고 **새 proof 문서 한 장**을 만든다. 실패한 proof 문서가 남으면 확인 후 저장하지 않고 닫을 수 있다.

UDT의 해당 플러그인 디버거에서, 프로젝트 루트 기준 `require` 가능한 문맥으로 실행한다. 실제 UXP 콘솔의 module 상대경로 해석은 환경에 따라 확인이 필요하다.

```js
var DMHost = require('./src/design-model-host.js');
var IDHost = require('indesign');
var proofPlan = JSON.parse(require('fs').readFileSync(
    'C:/프로젝트경로/assets/templates/working/text-proof-verified.json', 'utf8'));
var proofHandle = DMHost.create(proofPlan, IDHost);
console.log(DMHost.verify(proofHandle, IDHost));
```

`verify`는 생성 문서 값을 실제 다시 읽는다. `equal:true`는 적용 대상 속성만 허용 오차 내 같다는 뜻이며, 원본 전체 디자인이 같다는 뜻이 아니다. `omitted`는 그대로 남는다. 생성 실패 시 `[design-proof.단계]` 메시지를 전달한다. 폰트 누락은 문서를 만들기 전에 중단하며 임의 대체하지 않는다.

실기에서 정확한 font family/style/PS 이름, 범위 반환, 문자 인덱스와 MeasurementUnits 동작을 확인해야 한다. 비 BMP 문자, 그룹, 회전/크기 변환, complex token, 연결된 story는 proof가 명시적으로 거부한다.

## 내부 동작 / 검증

- Python zipfile + ElementTree로 XML 파싱. regex XML 파서는 없다.
- designmap src 참조를 따라 package를 읽는다. 없는 파일, 잘못된 XML, DTD/entity, 경로 탈출, 중복 ZIP 멤버, 크기 제한 위반은 중단한다.
- style BasedOn cycle, missing style/story, 깨진 next/previous는 issue. 원문 XML 속성/트리/텍스트 순서는 sourceXml에 남긴다. XML 주석, namespace 접두어의 문자 표현, 압축 바이너리까지 동일하게 보존하는 archiver는 아니다.
- 그룹 matrix 합성, page inverse transform, 고유 Self 참조를 사용한다. 미참조 XML도 보존하고 보고한다.
- sourceOrder는 원본 XML 순서다. InDesign stacking direction/레이어/Parent를 완전히 합친 z-order로 오해하면 안 된다.
- extraction API `extract(path)`는 한 파일 단위 실패한다. Studio 초기화에서 호출하지 않으므로 실패가 Studio를 중단시키지 않는다. 미래 multi-file importer는 파일별 결과를 격리해야 한다.

## 다음 단계

Phase 2: Object Style enable/inheritance 전체 해석, 실제 readback extractor, rich typography/한국어 조판, thread·graphics·fitting·group·Parent renderer와 비교.

Phase 3: role mapping 확인 UI, library importer, 전체 문서 Preview/Host 공통 renderer, 시각 round-trip 및 원문 보호 워크플로.
