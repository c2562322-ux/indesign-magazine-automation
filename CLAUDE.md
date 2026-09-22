# CLAUDE.md

이 문서는 Claude Code가 `indesign-magazine-automation` 프로젝트에서 작업할 때 항상 지켜야 하는 규칙이다.

## 작업 시작 전

- [README.md](README.md), [HANDOFF.md](HANDOFF.md), [DECISIONS.md](DECISIONS.md)를 먼저 읽는다.
- 세 문서와 실제 코드 상태가 다르면, 코드를 기준으로 삼고 문서 쪽을 의심한다.

## 작업 진행 방식

- 한 번에 하나의 명확한 작업 단위로 진행한다. 여러 기능을 한 번에 섞어서 진행하지 않는다.
- 의미 있는 작업이 끝날 때마다 [WORKLOG.md](WORKLOG.md)를 업데이트한다.
- 작업 완료 후에는 [HANDOFF.md](HANDOFF.md)의 "현재 상태" 관련 항목(완료된 기능, 테스트 여부, 진행 중인 작업, 다음 추천 작업 등)을 반드시 업데이트한다.
- 기술적인 결정이 생기면 [DECISIONS.md](DECISIONS.md)에 결정 내용과 이유를 기록한다.
- 프로젝트 구조나 실행 방법이 바뀌면 [README.md](README.md)를 업데이트한다.
- InDesign 템플릿 규칙(프레임 이름, 데이터 매핑, 스타일 이름 등)이 생기거나 바뀌면 [docs/TEMPLATE_SPEC.md](docs/TEMPLATE_SPEC.md)를 업데이트한다.

## 정확성 원칙

- 실제로 UXP Developer Tool / InDesign에서 테스트하지 않은 기능을 "테스트 완료"라고 기록하지 않는다.
- 문서 내용과 실제 코드 상태를 항상 일치시킨다. 코드를 수정했다면 관련 문서도 같은 작업 안에서 함께 수정한다.
- Adobe InDesign UXP API의 정확한 동작(함수 시그니처, 인자 순서, 반환값 등)이 불확실하면 추측해서 단정적으로 기록하지 않는다. 확인이 필요하다는 점을 코드 주석이나 문서에 명시하고, 가능하면 사용자에게 실제 InDesign에서 검증해달라고 요청한다.

## 범위 원칙

- 요청받은 작업 범위를 벗어나는 불필요한 대규모 리팩터링을 하지 않는다.
- 현재 Vanilla JavaScript 기반 구조를 유지한다. React 등 프레임워크를 임의로 도입하지 않는다.
- 사용자 승인 없이 대규모 삭제(파일/폴더 일괄 삭제)를 하지 않는다. Git 관련 위험한 명령은 아래 "Git 작업 규칙" 8번을 따른다.

## Git 작업 규칙

의미 있는 작업 하나가 완료될 때마다 아래 절차대로 Git 작업까지 자동으로 수행한다.

1. 작업 완료 후 먼저 `git status`와 `git diff`로 변경 내용을 확인한다.
2. 이번 작업과 직접 관련된 파일만 `git add` 한다. 관련 없는 변경 파일은 임의로 포함하지 않는다.
3. 테스트 가능한 작업이라면 테스트 결과를 확인한 뒤에 commit 한다.
4. commit 메시지는 작업 내용을 이해할 수 있도록 영어로 작성한다.
   예: `Add project documentation workflow`, `Add article JSON loader`, `Implement InDesign title frame mapping`, `Add overset text validation`
5. 이번 작업에서 함께 변경해야 하는 문서(`WORKLOG.md`, `HANDOFF.md` 등)도 코드와 같은 commit에 포함한다.
6. 작업이 실패했거나 구현이 미완성인 상태에서는 자동으로 commit하지 않는다.
7. `git push`는 자동으로 하지 않는다. push는 사용자가 명시적으로 요청했을 때만 수행한다.
8. force push, `reset --hard`, rebase, commit history 수정(amend 등) 등 위험한 Git 명령은 사용자 승인 없이 실행하지 않는다.
9. commit 완료 후 아래 내용을 짧게 보고한다.
   - commit hash
   - commit message
   - 포함된 주요 변경사항
   - 아직 push되지 않았는지 여부
