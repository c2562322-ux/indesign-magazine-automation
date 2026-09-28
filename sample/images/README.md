# sample/images

`sample/article.json`(예전 FEATURE 예시, 현재 자동조판 코드와 무관)의 `heroImage`, `image01` 값과 파일명을 맞추기 위한 개발용 테스트 이미지 폴더다.

**주의**: 현재 OPENING_PAGE 자동조판(`sample/opening-page-with-photo.json` 등)의 `heroImage`는 이 폴더가 아니라 **그 JSON 파일이 있는 폴더**(즉 `sample/` 바로 아래) 기준 상대 경로로 해석한다([DECISIONS.md](../../DECISIONS.md) D017, [docs/ARTICLE_DATA_SPEC.md](../../docs/ARTICLE_DATA_SPEC.md) 참고). `opening-page-with-photo.json`을 테스트하려면 `hero.jpg`를 `sample/images/`가 아니라 `sample/`에 직접 넣어야 한다.

예:

```text
hero.jpg
image01.jpg
```
