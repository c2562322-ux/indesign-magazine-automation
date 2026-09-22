# indesign-magazine-automation

Adobe InDesign용 UXP Plugin. 디자이너가 만든 InDesign 매거진 템플릿에 기사 데이터와 이미지를 자동으로 배치하는 것을 목표로 한다.

Vanilla JavaScript 기반이며 React 등 프레임워크는 사용하지 않는다.

## 현재 단계 (MVP 0단계)

`Generate` 버튼을 클릭하면 현재 활성화된 InDesign 문서 첫 페이지에 "Hello Magazine" 텍스트 프레임을 생성하는 최소 기능만 구현되어 있다. 실제 기사 데이터/템플릿 매핑 로직은 아직 구현되지 않았다.

## 폴더 구조

```text
indesign-magazine-automation/
├─ manifest.json      UXP Plugin 설정 및 InDesign 연결 정보
├─ index.html         UXP 패널 화면 (Load Article / Generate 버튼)
├─ styles.css         UXP 패널 스타일
├─ index.js           버튼 이벤트 바인딩, 프로그램 시작점
│
├─ src/
│  ├─ indesign.js     InDesign document/page/frame 접근 및 제어 (구현됨)
│  ├─ data.js         JSON 기사 데이터 읽기/파싱 (예정)
│  ├─ template.js     templateType별 템플릿 처리 (예정)
│  ├─ text.js         TITLE/BODY 등 텍스트 프레임 처리 (예정)
│  ├─ image.js         HERO_IMAGE/IMAGE_01 등 이미지 처리 (예정)
│  └─ validation.js   필수 데이터/이미지 누락, Overset 등 오류 검사 (예정)
│
├─ sample/
│  ├─ article.json    개발용 테스트 기사 데이터
│  └─ images/         개발용 테스트 이미지
│
└─ README.md
```

UI 로직(`index.js`, `index.html`)과 InDesign 제어 로직(`src/indesign.js`)을 분리해서, InDesign API 사용 방식이 바뀌어도 UI 코드를 건드리지 않도록 구성했다.

## UXP Developer Tool에서 실행하는 방법

1. Adobe InDesign(2022, v17 이상)과 UXP Developer Tool(UDT)을 설치한다.
2. UDT를 실행하고 `Add Plugin` → `Add existing plugin`을 선택한다.
3. 이 프로젝트 폴더 안의 `manifest.json` 파일을 선택한다.
4. 플러그인 목록에 `Magazine Automation`이 추가되면 InDesign을 실행한 상태에서 `Load`(또는 로드 아이콘)를 눌러 플러그인을 로드한다.
5. InDesign에서 문서를 하나 새로 만들거나 연다.
6. InDesign 메뉴 `Plugins`(또는 UDT에서 지정한 위치)에서 `Magazine Automation` 패널을 연다.
7. 패널에서 `Generate` 버튼을 클릭하면 현재 문서 첫 페이지에 "Hello Magazine" 텍스트 프레임이 생성되는지 확인한다.
8. 코드를 수정한 뒤에는 UDT에서 `Reload`를 눌러 변경 사항을 다시 로드한다. 콘솔 로그는 UDT의 `Inspect` 기능으로 확인할 수 있다.

`Load Article` 버튼은 아직 동작하지 않으며, 다음 단계에서 `sample/article.json`을 읽어오는 기능을 `src/data.js`에 구현할 예정이다.
