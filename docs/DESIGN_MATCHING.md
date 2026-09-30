# Design Library / 수용량 / 원고 프로필 / 후보 평가 (Phase B·C 코어)

현재 구현은 **오프라인 분석 코어**다. 기존 Studio 제작 코드는 변경하지 않았다. 기존 v2 전체 지면 renderer가 미구현이므로 추천 후보를 생성 버튼에 연결하지 않는다. 임의로 v1 기본값에 맞춰 디자인을 단순화하는 방식도 사용하지 않는다.

## 실제 원본 확인 상태

- 기존 IDML: 일반 14쪽, Parent 2쪽, Spread 10개(Parent 포함), Layer 2개, 객체 217개.
- TextFrame 139, Rectangle 14, Group 21, GraphicLine 43. Story 140, next-frame 연결 0개.
- Paragraph Style 2, Character Style 1, Object Style 4, 색/Swatch resource 381, Font resource 43.
- 기존 실물의 run 정보는 196개로 집계된다. 한 프레임의 단일 글자 크기로 합치지 않는다.
- 원본의 확정된 role 라벨은 없었다. style/name/layer/글자 크기/단 수를 통한 후보는 **후보로만** 반환한다.
- 이후 사용자가 실제 `2센트럴-눈길.idml`을 제공하여 직접 분석했다. SHA256 `4013e55f3c14d8651f5737c375f75f24792877b6e4e542b7d4d43f6d844bf8d2`.
- 신규: 일반11/Parent2쪽, Spread8, Layer3, 객체280(TextFrame161/Rectangle72/GraphicLine41/Group4/Polygon2), Story161, 연결 edge0, paragraph/character/object styles 2/1/4, swatch441, font50.
- 배치 Image가 있는 프레임은 기존0/신규14. 빈 GraphicType 프레임도 있으며, 이들을 모두 기사 사진 슬롯으로 확정하지 않는다. 신규 첫 페이지에는 페이지 면적의 80% 이상을 차지하는 배치 이미지가 있어 전체 지면 artwork일 수 있다.
- 신규 variable font DesignAxesRange 중첩 목록, 이미지 GraphicBounds, Link/ClippingPath/metadata와 30%·50% opacity를 확인했다. 기존에는 47% opacity도 있었다. sourceOrder는 보존하지만 실제 최종 z-order 재현은 아직 아니다.
- 원본 INDD/IDML 수정 없음. 개인 원본·원문·링크가 포함된 모델/분석 결과는 ignored working 폴더에만 보관한다.

## 모델 보완

v2 schema를 교체하지 않고 optional `elements[].details`를 추가했다. FrameFittingOption, TransparencySetting, TextWrapPreference, AnchoredObjectSetting의 직접 속성/하위 트리를 보존한다. `image[].details`에 link/clipping 등의 하위 속성도 보관한다. 기존 sourceXml 전체 보존은 유지된다. 기존 v2 모델에 details가 없어도 읽을 수 있고, 없는 fitting은 null로 취급한다.

초기 기존 원본 재추출 비교는 차이가 없었으며, 신규 원본 분석으로 이전부터 존재하던 추출 오류 3가지를 찾아 고쳤다: 기본 스타일 `$ID/…` 축약 BasedOn 참조, GraphicBounds처럼 text 대신 attributes로 저장된 값, variable font 중첩 list. 이는 원본을 수정한 것이 아니라 구조화된 모델의 해석을 바로잡은 것이다. sourceXml 보존은 유지한다.

두 실제 IDML의 원시 XML을 별도로 읽어 검증했다: 기존 페이지16/객체217/run197/직접 typography751개, 신규 페이지13/객체280/run206/직접 typography784개/이미지 bounds14개 일치. 기존의 미배치 Story까지 세면 run197개이며 페이지 프레임에 연결된 run 합계는196개다. 기본 스타일의 잘못된 MISSING_STYLE 보고(기존326/신규395건)도 없어졌다. 실제 InDesign 생성 fidelity 검증은 별도다.

## Library 등록

원본과 역할 확인 metadata를 분리한다. 예시 계약:

```json
{
  "schema": "magazine-design-library/v1",
  "designs": [{
    "id": "my-design",
    "name": "내 디자인",
    "model": "my-model.json",
    "sourceSha256": "실제 추출 모델의 sourceSha256",
    "pageIds": ["실제 일반 Page의 Self"],
    "roles": {
      "실제 제목 프레임 Self": {"role": "title", "confirmed": true},
      "실제 본문 프레임 Self": {"role": "body", "confirmed": true},
      "실제 사진 프레임 Self": {"role": "image1", "confirmed": true}
    },
    "images": {"실제 사진 프레임 Self": "required"},
    "preserveElementIds": ["교체하지 않을 장식/고정 문구의 Self"]
  }]
}
```

예시 ID는 실제 ID로 바꿔야 한다. `confirmed:true`는 사용자 확인 후에만 지정한다. 원본 해시가 달라지면 기존 역할 매핑을 재검토하도록 거부한다. 전체 잡지 여러 기사를 한 디자인 수용량으로 합산하지 않도록 `pageIds`를 명시한다. 페이지 범위 밖 역할, 타입이 맞지 않는 역할, 중복 사진 역할, Story가 범위/역할 밖으로 이어짐은 확인 대상이다.

Script Label로 이미 확정된 역할은 사용할 수 있다. 추론 후보의 confidence는 model role을 바꾸지 않는다. 여러 독립 body Story의 원고 분할 규칙은 아직 없으므로 자동 확정하지 않는다. 미지정 콘텐츠 영역은 사용자가 고정 유지 대상으로 확인해야 한다.

`loadLibrary`는 잘못된 모델 하나를 errors로 격리한다. 동일 폴더의 안전한 JSON basename만 읽고 경로 탈출을 거부한다. 원본 모델은 복사 후 deep freeze한다. 기본 파일 목록에 개인 디자인을 자동 업로드하지 않는다.

## Design Capability Profile

| 값 | 계산/한계 |
|---|---|
| pageCount/orientations | 명시된 일반 페이지 범위 |
| supportedRoles | 라벨 또는 사용자 확정 역할만 |
| requiredFonts | 선택 페이지 Story run의 실제 family/style 조합 |
| textFrames | role, frame 단위 수용량, 직접/상속 preference 구분 |
| roleCapacities | 확정 title/subtitle/body의 추정 합계와 단 수 |
| imageSlots | 역할 순서, bounds 크기/비율/방향, 페이지 대비 면적, 직접 fitting |
| required/optional | 사용자 metadata로 명시; 사진이 놓여 있다고 필수라고 추정하지 않음 |
| continuation | 존재하는 thread 수만 집계; 새 페이지 추가는 false |
| readyForMatching | 역할·참조 검토 완료 여부; 제작 가능과 다름 |
| productionReady | 현재 항상 false, 전체 renderer 연동 전 |

## 수용량 공식과 불확실성

단순 면적 계산이 아니다. **pt** 기준 frame 폭/높이에서 insets, column gap을 빼고 단 폭을 계산한다. 실제 run의 font size, leading(또는 AutoLeading 비율), tracking, horizontal/vertical scale, baseline shift를 사용한다. 첫 줄 glyph 높이를 0.7~1.1em 범위로 추정해 60pt 글자/15pt 행간 같은 원본을 여러 줄 들어가는 것으로 과대평가하지 않는다. 혼합 run에서는 보수적인 행간과 글자 폭을 사용하며 문단 간격·들여쓰기를 차감한다.

글꼴 파일의 실제 glyph advance를 측정하지 않았다. 한글/CJK 비중과 Latin 폭의 범위(0.4~0.7em)를 가정하고, 계산 결과에 하한 -25%/상한 +15% 범위를 붙인다. 이는 보장된 신뢰구간이 아니다. confidence는 low다. 음수 tracking을 무제한으로 수용량 증가에 쓰지 않으며 유효 폭이 없으면 unknown이다.

원고를 넣은 평가에서는 실제 문단 수와 CJK 비중으로 다시 계산한다. 여러 body frame의 문단 수는 균등 배분해 보수적으로 추정한다. keep, composer, first baseline, wrap, 실제 폰트 metric은 여전히 오차 요인이다. 회전/변형/곡선 프레임, 복합 token, 필수 속성 미해결은 unknown이다.

`estimatedCharacters.low/high`는 **수용량 추정 범위**이며 디자인에 필요한 최소 원고량/최대 허용 원고량의 확정값이 아니다. 제목 practicalLines도 추정이다. 모델을 바꾸거나 글자 크기를 자동 조정하지 않는다.

`calibration`은 실제 문자 수·overflows·documentEvidence가 있는 관측을 별도 기록한다. 단일 성공/실패 관측으로 최대 수용량이나 보정 계수를 확정하지 않는다.

## Article / Image Profile

현재 DOCX/TXT/JSON parser를 재사용한다. 제목/부제/본문의 Unicode codepoint 수(줄바꿈 제외, 공백 포함), 공백 기준 word count, 비어 있지 않은 문단 수, 평균 문단 길이, CJK 비율, 별도 사진 수를 기록한다. category는 직접 제공된 경우만 사용하고 기본 kicker `ARTICLE`에서 추측하지 않는다. DOCX 내부 이미지를 추출하지 않는다. 기존 기사 입력의 별도 사진 최대 2장 제한을 유지한다.

Image Profile은 제공된 실제 width/height가 유효할 때만 비율/방향을 계산한다. 없으면 unknown이다. 현재 `studio.js` 네이티브 선택기는 path/name/preview만 반환하고, browser preview는 naturalWidth/naturalHeight를 얻는다. **이번에 UXP 선택기 동작은 변경하지 않았다.**

안전한 후속 수집 방법: 선택 직후 binary metadata를 한 번 읽고 PNG/JPEG+EXIF 방향 처리를 검증해 캐시하거나, InDesign에 실제 배치한 이미지의 변환/원본 크기를 검증한다. CSS 표시 크기를 pixel dimension으로 사용하면 안 된다. Adobe [InDesign UXP storage](https://developer.adobe.com/indesign/uxp/reference/uxp-api/reference-js/modules/uxp/persistent-file-storage/storage)는 binary 읽기를 제공하지만 image decoder나 EXIF 보정을 자동 제공한다는 뜻은 아니다.

## Matching 규칙

- AI/API 호출 없음. `rank`는 후보/검토 필요/제외 목록을 반환하고 selectedId는 null이다.
- Hard: 확정된 디자인에서 필수 사진 없음, 사진 초과, 지원하지 않는 부제/캡션, 실제 설치 목록에 필수 face 없음, 수용량 추정 상한의 1.5배 초과. 심각 초과도 계산 기반 판단임을 메시지에 표시한다.
- Review: 역할 미확정, font catalog 미제공, image dimension 미확인, unknown capacity, 상한 초과이지만 극단적이지 않은 분량.
- Soft: 추정 하한~상한 분량(8점), 이미지 비율 차이(크롭/여백 비율에 따라 최대 15점), 승인된 title Auto Fit 범위 내 추정(20점).
- 점수는 규칙 우선순위이며 미적 점수/성공확률이 아니다. 최종 선택은 항상 사용자 몫이다.
- 역할 미확정 때문에 부제 영역을 모르는 경우는 “부제 지원 불가”로 확정하지 않고 review로 남긴다.
- Auto Fit은 metadata에 사용자 확인된 minFontSize가 있고 기존 `auto-fit.POLICY` 축소 한계 안일 때만 soft 판단한다. 충돌·폰트·실제 overflow 검사는 여전히 필요하다. Frame growth 여유를 추측해 수용량에 추가하지 않는다.

## 실제 원고 실행 결과

프로젝트의 Word 샘플을 직접 파싱했다: 제목19자, 부제38자, 본문453자, 7문단. 별도 사진 미제공(0장).

기존14+신규11페이지를 각각 **역할 미확정 분석 항목**으로 읽은 결과: load error0, 추천 확정0, 검토 필요25. 원본 라벨·폰트 상태가 확인되지 않았으므로 그럴듯한 추천 순위를 만들지 않았다. 실제 두 원본에서 계산 가능한 text frame은 각각133/155개, 단일 프레임 최대 추정 상한은765/332자로 달랐다(기본 CJK/문단 가정, 본문 역할 미확정이므로 디자인 전체 body capacity는 아님). 실제 두 모델의 프로필 차이와 원본 불변을 검사했다. 확정 역할/폰트가 주어진 상태의 ranking·Auto Fix penalty는 합성 fixture로 검증했다. 신규 실제 디자인을 자동 확정 추천한 것은 아니다.

## 콘텐츠 적용 경계

`bindContent`는 original + story/frame별 content overlay + runtimeAdjustments만 만든다. source typography/style/runs/geometry를 수정하지 않는다. Hard 위반은 거부한다. **실제 텍스트 교체·혼합 run 재분배·InDesign 생성은 아직 하지 않는다.** 따라서 “콘텐츠 교체 후 Adobe typography 동일”은 실기 검증 전이다.

Phase D에서는 별도 제작기를 만들지 않고 기존 제작 adapter가 v2 renderer를 소비하도록 연결해야 한다. 그 전에 전체 지면 fidelity, 역할 확인, 이미지 metadata, 실제 font validation이 필요하다. PDF 검사 우회는 없다.

## 실행

```powershell
python tools/extract_design.py "디자인.idml" "assets/templates/working/my-model.json"
node tools/analyze-design.js "assets/templates/working/my-model.json" "assets/templates/working/my-analysis.json"
node tools/match-designs.js "assets/templates/working/library.local.json" "sample/article-eye-clinic-with-photo.docx" "assets/templates/working/report.json"
```

출력은 기존 파일을 덮어쓰지 않는다. CLI는 PC font catalog를 읽지 않으므로 “설치 폰트 확인 필요”를 유지한다. 프로그램 API는 실제 설치 family/style 목록을 `rank(...,{installedFonts})`로 받을 수 있다. source 파일/개인 경로가 있는 모델은 GitHub에 올리지 않는다.

## 다음 단계

두 실제 샘플 분석/추출 테스트 완료 → 역할 매핑 확인 → 실제 조판으로 추정 오차 측정 → 기존 제작 경로의 v2 지원 → 최소 후보/선택 UI 순서다. 이번 단계에는 새로운 AI, 샘플 디자인 변경, 배치 제작 또는 기존 UI 재설계가 없다.


## 검증 결과 / 재실행

전체 Node160 통과(기존143+신규17), Node 진입점이 실행하는 Python15 통과(기존12+신규3). 개인 자료는 Git에 넣지 않고 아래 opt-in 검사에 직접 전달했다.

```powershell
python tests/verify-real-idml.py "기존.idml" "신규.idml"
node tests/verify-real-profiles.js "기존-model.json" "신규-model.json"
```

IDML 검사는 원본 page bounds/path/transform/thread와 직접 run typography를 원시 XML과 비교하고 입력 hash 불변도 확인한다. Profile 검사는 서로 다른 이미지/수용량 및 role 미확정 처리와 원본 불변을 검증한다. 실제 Host 조판/시각/PDF 검사는 아니다.
