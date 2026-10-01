# 세 번째 실제 Adobe batch — 2026-10-01 01:30Z

- 실제 결과는 통과5 / 실패4 / 미지원16으로 동일. KinsokuSet readback 오류는 없어졌고 전체 문자 비교까지 진행. 실패4페이지의 baseline 차이2423개는 두 locale 의미 유형뿐: Composer2239 / Roman-only kerning184(일반92+direct92).
- 페이지별 Composer/일반Kerning/directKerning: original/u577b750/42/42, u577c1292/18/18, u853e148/12/12, central/u1cf49/20/20.
- HL Composer J ↔ Adobe CJK 단락 컴포저, Metrics - Roman Only ↔ 메트릭 - 로마자 전용을 속성별 공통 canonical layer에서 비교. 정확한 관측 alias 및 Host findKeyStrings/translateKeyString 사용. 일반 Metrics/Optical/숫자 커닝과 로마자 전용은 별개; 다른 컴포저와 미지 문자열도 별개. 생성/원본 디자인/검사 tolerance/Auto Fix 정책 불변.
- 실제JSON2423쌍을 수정 comparator로 오프라인 재비교: 잔여0. 이는 Adobe 재실행/전체 Fidelity 통과가 아님. 실제 실패가0이 아니므로 미지원16 지원 확대 조건은 아직 충족되지 않음.
- Node276/Python16 통과. 최초 proof와 original recheck 통합에도 한글 composer/roman-only 적용, 실제 pointSize 변경 차단 유지.
- NEXT STEP: Reload → 기존 DOCX/25페이지 Library → 전체 등록 디자인 일괄 검증 → 전체 페이지 검증 결과 저장. 다음 실기에서 실패0인지 확인 후 미지원16의 공유객체/효과/고정이미지 지원 범위 확대.

---

# 두 번째 실제 Adobe batch — 2026-10-01 01:14Z

- 실제 결과25: 통과5 / 실패4 / 미지원16. 신규 통과 original/u3356, original/u3d6. 기존 u1ba/u335e/u3d5 통과 유지. 이전 path120/특수문자12/색상2 차이는 새 결과에서 없음.
- 남은 baseline21건은 KinsokuSet readback 미지원 한 유형: original/u577b8, u577c8, u853e2, central/u1cf3. 원본은 모두 KoreanKinsoku. 문단 origin 검사를 통과한 후 다음 direct override에서 드러난 오류.
- 공통 directCompare에 기본 KinsokuSet enum/string canonical 비교 추가. Korean/Hard/Soft/None/중국어 금칙 구분 유지. 사용자 정의 KinsokuTable은 이름만으로 동등 처리하지 않고 차단. Adobe DOM은 enum/table/string 반환 가능: https://developer.adobe.com/indesign/uxp/dom/api/p/paragraph-style/ ; https://developer.adobe.com/indesign/uxp/dom/api/k/kinsoku-set/ . 실제 JSON에는 반환값의 raw type이 없어 enum 반환이라는 원인은 API/원본/기존 비교 코드에 근거한 해석이며 재실기 필요.
- 전체 모델 direct string 속성을 조사하여 FillColor/StrokeColor의 다음 object readback 위험도 기존 colorExpected/colorActual 비교로 연결. 원본 ref 문자열과 Swatch object를 직접 비교하지 않으며 색상 변화는 계속 차단. 다른 미지 값/커스텀 금칙은 통과시키지 않음.
- 신규 금칙 동등/비동등/custom 차단, 직접 색상 override 변화 테스트 및 proof→original recheck 통합 유지. Node275/Python16 전체 통과. 생성기/원본/추천/콘텐츠 치환 정책 변경 없음.
- NEXT STEP: Reload → 동일 DOCX/25페이지 Library → 전체 등록 디자인 일괄 검증 → 전체 페이지 검증 결과 저장. 개별 페이지 테스트 불필요. 수정4페이지는 Adobe 재검증 필요, 미지원16 제한 유지.

---

# 실제 Adobe 25페이지 batch 분석 — 2026-10-01

사용자가 전달한 actual Adobe run(00:56:48Z–00:58:37Z)을 분석했다. 개인정보/원고/원본 파일은 저장소에 포함하지 않는다.

- 전체25: PASSED3 / FIDELITY_FAILED6 / UNSUPPORTED16 / NOT_RUN0. ROLE_MAPPING_REQUIRED15는 결과와 중복되는 역할 상태다. Production Ready0은 이 proof batch의 값이며 u335e의 기존 사용자 제작 성공을 취소하지 않는다.
- 통과: original/u1ba(빈 지면, 역할 미확정), original/u335e, original/u3d5. 수정 후 신규 Adobe 통과를 의미하지 않는다.
- baseline records의 differences155개를 분류. original recheck에서 같은 readback이 반복 보고되는 것은 중복 집계하지 않는다. JSON groups99개는 path/객체별 그룹이며 독립 원인99개를 의미하지 않는다.
- 이전 u3d6 Group.fillColor 혼합값 오류는 historicalIssues에만 있고 현재 결과에는 없다.

## 공통 원인과 수정

|유형|차이 수|발생 페이지(괄호는 차이 수)|원인/처리|
|---|---:|---|---|
|path 좌표|120|original/u3356(20), u3d6(36), u577c(32); central/u1cf(32)|모든 X 차이가612.283465pt. bounds는 page-relative인데 path는 ruler 좌표였다. 실제 page.bounds 원점을 모든 anchor/Bezier control point에서 빼 비교. 원점/페이지폭 상수 하드코딩 없음. 실제 경로 변경은 계속 차단.|
|direct enum|21|original/u577b(8), u577c(8), u853e(2); central/u1cf(3)|TextFrame ParagraphShadingTopOrigin readback은 native enum인데 string/string만 지원. 원본 EmBoxTopOrigin을 native member 또는 정확한 symbolic member와 대조. 음영 및 테두리 Top/Bottom origin 모두 공통 지원. 다른 origin/미지 값은 계속 실패.|
|특수 Character.contents|12|original/u853e(6); central/u1cf(6)|U+2028 대 FORCED_LINE_BREAK6, 왼쪽/오른쪽 따옴표 대 DOUBLE_LEFT/RIGHT_QUOTE 각3. SpecialCharacters identity를 Unicode로 변환. 문자열 자체를 이름으로 치환하지 않음. 최초 비교와 원본 재검사가 같은 diagnostics 경로 사용.|
|색상 공간|2|central/u1cf(2): GraphicLine u893d/u893f|원본 RGB183.6/183.6/183.6, Color/u893e의 ConvertToHsb=true. HSB readback 지원 누락은 확인했으나 report에 실제 space/channels가 없어 두 오류의 HSB 원인은 추론. HSB enum을 읽고 수학적으로 동등한 RGB로 변환. 알 수 없는 공간은 값 포함 UNSUPPORTED로 차단.|

생성 IDML/원본 디자인은 변경하지 않았다. snapshot/comparison 표현을 정규화하며 tolerance(0.01), 필수 속성, 콘텐츠/원본 오류 구분, Auto Fix 차단 정책을 유지한다. 재현 실패를 NOT_APPLICABLE로 바꾸지 않았다.

문단 enum readback 실패는 해당 객체의 나머지 검사를 중단하므로 그 뒤에 아직 드러나지 않은 실제 차이가 있을 수 있다. 실제 snapshot 원점/HSB/native enum 동작은 다음 Adobe batch 재검증 필요. 원본/생성 값 전체가 없는 실패 기록만으로 155개 모두 해결됐다고 인증하지 않는다.

## 25페이지 상태 (수정 전 실제 결과)

|원본|Page ID|실제 결과|역할 상태|미지원 사유|
|---|---|---|---|---|
|original|u1ba|PASSED|ROLE_MAPPING_REQUIRED|—|
|original|u1ce|UNSUPPORTED|ROLE_MAPPING_REQUIRED|graphic effect readback 미지원|
|original|u1cf|UNSUPPORTED|ROLE_MAPPING_REQUIRED|graphic effect readback 미지원|
|original|u335e|PASSED|MAPPED|—|
|original|u3356|FIDELITY_FAILED|MAPPED|—|
|original|u3d5|PASSED|MAPPED|—|
|original|u3d6|FIDELITY_FAILED|MAPPED|—|
|original|u735|UNSUPPORTED|ROLE_MAPPING_REQUIRED|UNSUPPORTED 페이지 귀속/공유 객체: u7eac|
|original|uad7|UNSUPPORTED|ROLE_MAPPING_REQUIRED|UNSUPPORTED 페이지 귀속/공유 객체: u7eac|
|original|u576c|UNSUPPORTED|MAPPED|UNSUPPORTED 페이지 귀속/공유 객체: u7fad|
|original|u5764|UNSUPPORTED|ROLE_MAPPING_REQUIRED|UNSUPPORTED 페이지 귀속/공유 객체: u7fad|
|original|u577b|FIDELITY_FAILED|MAPPED|—|
|original|u577c|FIDELITY_FAILED|MAPPED|—|
|original|u853e|FIDELITY_FAILED|MAPPED|—|
|central|u1ba|UNSUPPORTED|ROLE_MAPPING_REQUIRED|고정 graphic source transform/color readback 미지원|
|central|u1ce|UNSUPPORTED|ROLE_MAPPING_REQUIRED|graphic effect readback 미지원|
|central|u1cf|FIDELITY_FAILED|MAPPED|—|
|central|u335e|UNSUPPORTED|ROLE_MAPPING_REQUIRED|고정 graphic source transform/color readback 미지원|
|central|u3356|UNSUPPORTED|ROLE_MAPPING_REQUIRED|고정 graphic source transform/color readback 미지원|
|central|u3d5|UNSUPPORTED|ROLE_MAPPING_REQUIRED|고정 graphic source transform/color readback 미지원|
|central|u3d6|UNSUPPORTED|ROLE_MAPPING_REQUIRED|고정 graphic source transform/color readback 미지원; graphic effect readback 미지원|
|central|u735|UNSUPPORTED|ROLE_MAPPING_REQUIRED|UNSUPPORTED 페이지 귀속/공유 객체: u83ad; 고정 graphic source transform/color readback 미지원; graphic effect readback 미지원|
|central|uad7|UNSUPPORTED|ROLE_MAPPING_REQUIRED|UNSUPPORTED 페이지 귀속/공유 객체: u83ad; 고정 graphic source transform/color readback 미지원; graphic effect readback 미지원|
|central|u576c|UNSUPPORTED|ROLE_MAPPING_REQUIRED|UNSUPPORTED 페이지 귀속/공유 객체: u83b9; graphic effect readback 미지원; 고정 graphic source transform/color readback 미지원|
|central|u5764|UNSUPPORTED|MAPPED|UNSUPPORTED 페이지 귀속/공유 객체: u83b9; graphic effect readback 미지원|

미지원16페이지의 원인(중복): 공유/귀속 미확정 객체8페이지, graphic effect8페이지, 고정 graphic source transform/color8페이지. 이는 현재 비교 지원 범위의 제한이며 실제 디자인 손상이나 locale 오판으로 확정된 문제가 아니다. 지원 근거 없이 제한을 해제하지 않는다. 원본의 공유 구조/효과/고정 이미지 검증 구현은 이번 네 readback 공통 수정으로 해결됐다고 주장하지 않는다.

## 자동 검증 및 실기

신규 회귀: 페이지 원점 이동/Bezier 실제 변형; CJK shading/border top/bottom enum 동등/비동등/unknown; 특수문자와 문자 그대로의 enum 이름 구분; HSB/RGB 동등 및 실제 채널/공간 차이; native proof→original recheck 통합과 pointSize 실제 변형 차단. 기존 Group/IMAGE1..N/추천/콘텐츠 교체 테스트 유지.

Node273 / Python16 통과. 모두 자동/Mock이며 새 Adobe 결과 아님.

UDT Reload → 기존 DOCX와 동일25페이지 Library 불러오기 → 개발자/템플릿 등록·검증에서 **전체 등록 디자인 일괄 검증** → 완료까지 대기 → **전체 페이지 검증 결과 저장** → 새 JSON 하나 전달. 개별 페이지를 다시 선택할 필요 없다. 저장 전에 Reload하지 않는다. 미지원16페이지는 계속 사유를 기록하고 건너뛰며 지원9페이지를 새로 검사한다.

근거: [Adobe SpecialCharacters](https://developer.adobe.com/indesign/uxp/dom/api/s/special-characters/), [ColorSpace HSB](https://developer.adobe.com/indesign/uxp/dom/api/c/color-space/), [ParagraphShadingTopOriginEnum](https://developer.adobe.com/indesign/uxp/dom/api/p/paragraph-shading-top-origin-enum/). 공개 top-origin 목록은 CJK em-box를 생략하고 있어 숫자 enum을 추측하지 않고 Host member/symbol을 조건부 사용한다. 해당 값을 읽지 못하면 차단한다.
