# Design fidelity — 비교 범위와 증거

2026-09-30, Phase 1. **자동 property 검증과 실제 Adobe 시각 재현은 별개**이다.

## 비교 기준

- 동일성의 기준은 원본 IDML이다. 기존 JSON 3종의 수치를 정답으로 사용하지 않는다.
- v2 canonical 길이 pt. 중간 mm 왕복 변환 없음.
- `design-model.compare`는 숫자 허용 오차 기본 **0.01** (길이는 pt, tracking/scale 등은 해당 속성 단위). 문자열/enum/ref는 정확 일치. missing/extra 값도 차이로 검출한다. 더 엄격한 비교에는 tolerance=0.
- `design-model-host.verify`는 새 문서에서 page size/bounds/columns/gap/insets/frame paint/stroke와 각 run의 family/style/size/leading/tracking/문단값 등을 다시 읽는다. plan을 되돌려 반환하는 검사가 아니다.
- 색 swatch 이름은 생성 문서 충돌 방지를 위해 새 이름이므로 비교에서 제외하지만, 색 공간/모델/수치는 비교한다.
- z-order/image/thread는 **모델 보존 비교만** 테스트한다. 이를 Host 재생성 round-trip으로 보고하지 않는다.
- JSON→parse→stringify만 성공하는 것으로 fidelity를 판정하지 않는다. 실제 Host API mock에 적용하고 readback 값을 일부 변경해 오류 검출도 확인한다.

## 실제 원본 오프라인 확인

동일 원본 IDML SHA256:
`A620C934DF5347FB222124D3F26863E47AEC8CA2E9665E6AA3332AE64D0BED4A`.

- 10 spreads (일반/Parent 포함), 일반 페이지 14, Parent 페이지 2.
- 객체 217: TextFrame 139, Rectangle 14, Group 21, GraphicLine 43.
- story 140, font resource 43. 이는 설치 폰트 개수가 아니다.
- style/content/group/Parent/opacity 및 graphics 하위 XML 보존.
- `u1e4`: 원본에서 `프리젠테이션 / 7 Bold`, 45pt, leading 39pt, tracking -20.000000000000007. 같은 story에 4 Regular/3 Light도 존재.
- proof 좌표: `[44.41140681159095, 56.20401323072355, 86.24734431159095, 493.626840379161]` pt. 변환은 Page 역행렬+local origin이며 임의 여백 보정 없음.
- 해당 text proof를 브라우저에서 열어 원문/색상/위치 표시를 확인했다. **InDesign 원본과 눈으로 비교한 결과가 아니다.**
- 처음 제공한 다른 INDD는 IDML/DOM 추출이 아직 필요하다. 두 디자인 모두 재현 검증했다고 주장하지 않는다.

## 자동 테스트

기존 Node 132개 유지. 신규 Node 11개 중 1개는 Python extractor 12개 검사를 실행하는 통합 진입점이다. 총 Node 143개 + 그 안에서 실행한 Python 12개 통과. 중복 계산해 155개의 독립 UI/Host 테스트라고 표현하지 않는다.

검증 항목: source geometry/affine inverse, font identity·상속·local override, 51/54/-20 및 문단 간격, color CMYK, insets/columns, group matrix/image fitting raw, style cycle/missing refs/broken thread, unsupported 보고, ZIP/XML 방어, source 무변경, 명시적 proof opt-in, 누락 폰트 무대체, globals 원복, 기존 v1 호환, original/runtime 분리, 실제 readback mock 차이 검출.

## 알려진 차이와 미지원

Preview proof는 기본 글꼴 family, size/leading/tracking, frame/insets/columns/solid color를 시각화한다. 폰트 스타일, alignment, paragraph spacing, baseline/조판, CMYK 프로파일, LAB는 정확히 렌더하지 않는다. 화면 상단과 omitted 목록에 알린다. 생산용 Studio Preview는 이번에 변경하지 않았다.

Host proof도 원본 전체를 복제하지 않는다. 한 장/한 text frame 범위에서 비교한다. 임의 효과/Parent/그룹/전체 thread/이미지/graphic/자동 페이지 번호/한국어 composer/keep/tabs/문단 장식/수동 kerning은 보존과 재현을 구분한다. Auto sizing은 proof에서 OFF. 원본 모델 값은 그대로 남는다. 새 문서의 해당 기본값이 레이아웃 결과에 영향을 줄 수 있다.

## PC 실기 절차

1. 기존 Studio Reload 후 예시 원고 → 무료/기존 JSON 시안 → 생성 → 검사 흐름이 유지되는지 확인.
2. 원본 INDD를 수정하지 않고 IDML을 별도로 내보낸다. 현재 제공 IDML이 최신 저장 내용인지 확인.
3. DESIGN_EXTRACTION의 명령으로 모델/한 프레임 proof를 만든다. unsupported/omitted 목록을 먼저 본다.
4. 해당 family/style들이 설치되어 있는 상태에서 개발자용 `create`를 실행. 새 문서만 생겨야 한다.
5. `verify` 결과를 확인. `equal:true`면 **비교한 속성만** 일치. 원본 전체 복제 성공은 아님.
6. 원본과 새 proof의 글자/문단 패널 및 transform 패널 값을 비교. 실제 줄바꿈·넘침·폰트 face도 확인한다.
7. 실패하면 단계 메시지와 `differences`, 원본/새 프레임 패널 스크린샷을 전달. 원본 내용/전체경로가 포함된 sourceXml은 공개하지 않는다.

## 공식 API 근거

- [Text / 범위와 typography](https://developer.adobe.com/indesign/uxp/dom/api/t/text/)
- [Paragraph / 문단 속성](https://developer.adobe.com/indesign/uxp/dom/api/p/paragraph/)
- [TextFramePreference / columns, inset, baseline](https://developer.adobe.com/indesign/uxp/dom/api/t/text-frame-preference/)
- [FirstBaseline enums](https://developer.adobe.com/indesign/uxp/dom/api/f/first-baseline/)
- [ScriptPreference / 측정 단위](https://developer.adobe.com/indesign/uxp/dom/api/s/script-preference/)

API 문서 확인은 이 PC의 InDesign/UXP 버전에서 실기 성공했다는 증거가 아니다.


## 후속 실물 2종 검증

신규 2센트럴-눈길.idml을 추가로 읽었다. tests/verify-real-idml.py로 두 원본의 XML 기반 속성을 검증하고 tests/verify-real-profiles.js로 서로 다른 수용량/이미지 특성을 검증했다. 신규 원본의 variable-font axis/GraphicBounds를 보존하고 기본 style 참조 오탐을 수정했다. 상세 counts/limitations는 DESIGN_MATCHING.md 참고. 이것은 Host 재생성/시각 round-trip 성공을 뜻하지 않는다. 현재 전체 Node160, Python15 통과.
