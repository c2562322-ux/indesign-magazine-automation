# Design Model v2 — Phase 1

2026-09-30. **추출·보존 모델과 제한된 텍스트 속성 검증 경로**를 구현했다. 전체 지면 importer가 아니다. 기존 `designs/*.json` v1, Studio 제작/검사/Auto Fix/PDF 코드는 변경하지 않는다.

## 기존 경로 감사 (수정 전 코드 기준)

`json-design.js → layout-engine.fromDesign → studio-ui / auto-indesign.createJSONPages`는 동일 plan을 사용하지만, 그 plan 자체에 없는 원본 정보는 보존할 수 없다.

| 원본 속성 | 기존 JSON v1 | 기존 Preview | 기존 InDesign 생성 |
|---|---|---|---|
| page size / x,y,w,h | mm, 첫 페이지 | 공통 mm→축척 | mm bounds |
| 여러 Spread / Parent / 회전 / affine transform | 없음 | 없음 | 없음 |
| font family / style | 있음 | CSS 근사, 실제 face 동일 보장 안 됨 | 설치된 face 검증 후 적용 |
| size / leading / tracking | pt / pt / 1/1000em | 변환해 적용 | 적용 |
| auto leading | null은 120% 계산 | 계산된 값 | 계산된 값; 원본 Auto 상태 손실 |
| kerning / scales / baselineShift / mixed style ranges | 없음 | 없음 | 원본 재현 없음 |
| alignment | 4종 | CSS | justification |
| spaceBefore/After | mm, body만 비영(非零) 허용 | 제한적 조판 근사 | 적용 |
| indents / keep / hyphenation / composer / 한국어 조판 | 없음 | 없음 | 일부 고정 기본값; 원본값 아님 |
| paragraph/character/object style 정의 | 없음 | 없음 | 역할별 새 style 생성 |
| column count / gutter / inset | 있음 | 근사 컬럼/비대칭 inset | 적용 |
| first baseline / vertical justification / auto sizing | 없음 | CSS 기본 | ascent/top/off 고정 |
| RGB / CMYK 색 | 제한된 color ref 지원 | RGB 변환 근사 | 색 값 적용 |
| tint / spot / gradient / opacity / corner 전체 | 제한/없음 | 제한 | 제한 |
| image frame / fit | cover/contain, 단순 사각형 | object-fit | fit 적용 |
| 원본 crop / content transform / clipping | 없음 | 없음 | 없음 |
| 장식 | 수평 headerRule | 수평선 | 수평선 |
| 임의 도형 / group / layer / stack | 없음 | 없음 | 없음 |
| thread | body flowOrder | 텍스트 분량 추정 | body 연결/후속 페이지 |
| 원본 Story/previous/next / special characters | 없음 | 없음 | 원본 관계 손실 |

## 최상위 계약

```text
schema: "magazine-studio-design/v2"
schemaVersion: 2
unit: "pt"
metadata: sourceFormat, sourceSha256, domVersion, extractorVersion, packageInventory
pages[] / spreads[] / elements[] / stories[] / threads[]
styles: paragraph[] / character[] / object[]
fonts[] / colors[] / layers[]
issues[] / capabilities / sourceXml
```

이 모델은 IDML의 속성 이름을 그대로 유지한다. 미래 UXP 추출기는 DOM 속성명을 동일 IDML 명칭으로 매핑하거나 별도 source adapter를 통해 동일 구조를 만들어야 한다. 현재 UXP 전체 문서 추출기는 구현하지 않았다.

## 단위와 geometry

- 수치 좌표/길이의 canonical 단위는 **pt**. 기존 v1 mm plan에 억지로 끼워 넣지 않는다.
- IDML `Tracking`은 1/1000em, `HorizontalScale`/`VerticalScale`/`AutoLeading`은 %, transform은 affine 행렬이다. 모두 pt라고 해석하지 않는다.
- bounds는 `[top,left,bottom,right]`, transform은 `[a,b,c,d,tx,ty]`, 좌표는 `x'=a*x+c*y+tx`, `y'=b*x+d*y+ty`.
- `pages[].bounds`는 원본 Page 좌표, width/height는 차이. `transform`은 Page→Spread. `spreads[].transform`은 Spread→pasteboard이며 보존한다.
- `pages[].index`는 Parent 포함 추출 순서, `documentIndex`는 일반 페이지의 0 기반 순서. 페이지 이름은 중복될 수 있으므로 식별자는 `Self`를 쓴다.
- element의 `transform`은 원본 local→parent, `spreadTransform`은 그룹 행렬을 합성한 local→Spread.
- `paths[].points`는 Anchor/LeftDirection/RightDirection을 모두 보존한다. `anchorBounds`는 anchor의 범위이지 곡선 extrema나 stroke 포함 visibleBounds가 아니다.
- `visibleBounds: null`: IDML에서 live visible bounds를 확인하지 못했음. 숫자를 만들어 넣지 않는다.
- `pageBounds[pageId]`는 inverse Page transform 후 페이지 원점 기준 anchor bounds. `pageCandidates`는 겹침으로 얻은 **후보**이다. `pageAssignment=derived-overlap`; parentPage 확정으로 취급하지 않는다.

## 텍스트와 스타일

`elements[].textFrame`에는 직접 frame preference, storyRef, previousRef, nextRef. 실제 내용은 별도 `stories[].paragraphs[].runs[].tokens`에 둔다. 원문을 제목/본문으로 자동 교체하지 않는다.

각 paragraph/run은 `styleRef`, 직접 `properties`, 단순 style cascade의 `resolvedProperties`를 보존한다. Base style → paragraph style/local → character style/local 순서다. nested/GREP/line style, composer의 문맥 계산은 해결하지 않는다. 모든 XML은 `sourceXml`에도 있다.

| Typography/문단 | v2 추출 | Phase 1 Host text proof | Preview proof |
|---|---|---|---|
| Family/Style/PS/full name | 원본 + Font resource | 실제 family/style/PS 정확 일치만 | family만; style 근사도 보장 안 함 |
| size / leading / AutoLeading / tracking | 원값 | 명시값/Auto 적용 | pt/letter-spacing; Auto 근사 |
| kerningMethod | 보존 | 적용 | 미재현 |
| 수동 kerning pair | XML에 있을 때 raw 보존 | 미재현 | 미재현 |
| horizontal/vertical scale, baselineShift, rotation | 보존 | 전달 | 미재현 |
| ligature / underline / strikeThru | 보존 | 전달 | 미재현 |
| capitalization / language / OTF / tsume / mojikumi / kinsoku | 보존 | 미재현 | 미재현 |
| justification | 보존 | 명시 enum 적용 | 현재 proof 미재현 |
| indents / spaceBefore / spaceAfter | 보존 | 전달 | 현재 proof 미재현 |
| hyphenation | 보존 | 전달 | 미재현 |
| keep / dropCap / rules / shading / border / tabs / baseline grid / composer | 직접/상속 정의 + raw | 미재현 | 미재현 |
| 글자 fill | color ref 보존 | solid RGB/CMYK/LAB/Spot | RGB, CMYK 근사; LAB 검정으로 표시 |
| 글자 stroke/tint/효과 | 보존 | 미재현 | 미재현 |

`styles.*[].properties`에는 정의, `resolvedProperties`에는 BasedOn 추적 결과, `children`에는 text frame 설정 등 하위 정의가 있다. cycle/missing reference는 issue로 남긴다. Object Style의 활성화 플래그 전체를 해석했다고 주장하지 않는다. Text proof는 명시적으로 활성화된 fill/stroke/general/baseline 설정만 제한적으로 상속한다.

## 프레임·그래픽

| 항목 | 추출 | Phase 1 재생성 |
|---|---|---|
| 사각 text bounds, column/gap/insets | 보존 | proof 지원 |
| vertical justification / first baseline / minimum baseline | 보존 | 알려진 enum/명시값 지원 |
| auto sizing / flexible/fixed columns | 보존 | proof는 off/resizable; 원본 재현 아님, omitted 표시 |
| text threads | story/previous/next 참조 보존, 상호 참조 검사 | single-frame proof는 thread 거부 |
| frame fill/stroke | 원본 ref/weight 보존 | solid/None 적용; tint/opacity 미재현 |
| image fitting/crop/content matrix/clipping | 원본 하위 XML 보존 | Phase 2 |
| rectangle/oval/polygon/line/curves | path와 속성 보존 | Phase 2 |
| layer/group/stack | layerRef/groupId/sourceOrder | Phase 2; sourceOrder는 최종 z-order와 동일하다고 보장 안 함 |
| Parent/master/override | 별도 kind/ref/raw | Phase 2 |

색은 `colors[].properties`에 Name/Model/Space/ColorValue 등을 원형대로 남긴다. HEX로 덮어쓰지 않는다. 이미지 파일은 복사/업로드하지 않는다. 이미지 link, fitting, crop, effects의 상세 하위 트리는 `sourceXml`에서 source Self로 찾는다.

## 역할과 손실 보고

- TITLE/SUBTITLE/BODY/HERO_IMAGE/IMAGE_1/IMAGE_2/HEADER/FOOTER/PAGE_NUMBER/CAPTION 등 인식된 Script Label만 confirmed.
- 라벨 원문은 보존. 나머지는 confirmed=null, needsConfirmation=true. 위치/글자 크기를 근거로 title이라고 확정하지 않는다. heuristic 후보 추천 및 mapping UI는 다음 단계다.
- `capabilities`는 추출/Preview/Host의 범위를 구분한다. `issues`는 미참조 style/story/thread, Parent, graphics, live composition 미확인 등을 남긴다.
- raw 보존은 Host 재현 완료가 아니다. JSON 속성을 Host에 일괄 `Object.assign`하지 않는다. proof의 `omitted`를 반드시 읽어야 한다.

## Original / Runtime

원본 JSON과 `runtimeSession(model).original`은 분리된 복사본이다. 자동 조정은 `adjustments[]`에 elementId/before/after/reason/result로 기록한다. `recordAdjustment`는 원본에 쓰지 않는다. 이번 v2 proof에는 Auto Fix 자체를 실행하지 않는다. 기존 v1 Auto Fix 경로와 상태에는 변경이 없다.

## 호환성

v1은 `json-design.js`, v2는 `design-model.js`가 검증한다. v2를 v1 manifest에 넣어 바로 생성하는 것은 지원하지 않는다. 기존 3종·무료 3안은 그대로다. 정보 손실이 큰 자동 v2→v1 다운그레이드는 만들지 않았다.


## 후속: 두 실제 원본과 Capability Profile

신규 IDML 분석으로 optional element/image details(투명도/fitting/link/clipping), attribute-only GraphicBounds, nested variable-font axes를 보존하도록 보강했다. `$ID/…` 기본 BasedOn 참조는 해당 style 종류의 실제 Self를 찾아 해석한다. 임의 font style을 생성하지 않는다. Profile/Library/후보 평가 계약과 실제 비교 결과는 [DESIGN_MATCHING](DESIGN_MATCHING.md) 참고. 기존 Studio 제작 renderer와 v1 호환 경로에는 변경이 없다.
