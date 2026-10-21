ECCR Reading Lab — a small from-scratch reproduction kit
========================================================

한국어 안내
----------
이 실습은 ECCR의 핵심 제작 과정을 익히는 새 소형 구현입니다.
Book 7 "Sam and the Cat" 원고에서 발췌한 3쪽·11문장을 사용합니다.
기존 12쪽 책의 정확한 조판, 전체 교재, 그림 위 좌표 핫스폿, 전체 PWA의
MP3 Range 처리, 배포된 앱 전체를 그대로 재현한 결과물은 아닙니다.
화면의 실제 텍스트 버튼에 녹음을 연결하는 것부터 시작합니다.
별도 계정, AI API, 프레임워크, npm 설치가 필요하지 않습니다.

바로 실행
---------
온라인 설명서의 'Reading Lab' 링크를 열면 바로 실습할 수 있습니다.
ZIP을 받은 경우 압축을 풀고 eccr-starter-kit 폴더에서 터미널을 여세요.
Python 3가 설치되어 있다면 명령 하나로 실행됩니다.

    python3 -m http.server 8877 --bind 127.0.0.1

브라우저에서 아래 주소를 여세요. index.html을 더블클릭하지 마세요.

    http://127.0.0.1:8877/

Python이 없다면 이 폴더를 HTTPS 정적 호스팅에 올려도 됩니다.
실습은 서버에 녹음이나 그림을 업로드하지 않습니다.
호스팅에 원본 키트만 올리면 모든 방문자는 빈 녹음 상태로 시작합니다.

만들어보는 순서
---------------
1. 원고 읽기
   source-manuscript.txt가 가져온 원고 원문입니다.
   book.json의 source.file은 원래 작업 폴더의 위치를 기록한 출처이며
   웹사이트가 그 경로에 접속하지는 않습니다.
   현재 실습의 페이지 번호는 원래 PDF 페이지 번호와 다릅니다.

2. 원고를 데이터로 나누기
   '3. 코드 펼쳐보기'에서 text 한 문장을 바꾸고 적용하세요.
   제목, 페이지, 문장은 각각 구조화된 데이터입니다.
   id는 전체 책에서 고유해야 하며 음성 연결의 이름표 역할을 합니다.
   text가 변경되거나 id가 제거되면 연결된 이전 녹음도 해제됩니다.
   잘못된 JSON을 적용하면 오류가 나오고 마지막 정상 원고는 유지됩니다.
   book.json 다운로드는 원고만 저장합니다.
   원본 파일을 직접 바꾸었다면 작업대 초기화 후 새 원고를 확인하세요.

3. 그림·레이아웃 확인
   현재 페이지에 사용 권한이 있는 PNG/JPEG/WebP를 추가하세요.
   그림 슬롯은 object-fit: contain으로 전체 그림을 유지합니다.
   '인쇄 / PDF'에서 모든 페이지가 인쇄되는지, 글·그림이 잘리지 않는지
   확인하세요. A4와 배율 100% 또는 기본값으로 시작하세요.
   문장을 많이 늘렸다면 인쇄 전 페이지 넘침을 직접 점검해야 합니다.
   이 예제에는 기존 교재의 삽화가 포함되어 있지 않습니다.

4. 교사 목소리 연결
   페이지의 문장을 선택한 뒤 그 문장 하나의 녹음 파일을 선택하거나
   마이크 녹음을 시작하고 문장을 읽은 뒤 종료하세요.
   브라우저의 마이크 권한은 교사가 허용해야 합니다.
   한 번에 최대 90초, 파일 하나당 최대 10 MB입니다.
   마이크 기능이 지원되지 않으면 파일 선택을 이용하세요.
   문장을 눌러 녹음과 글이 정확히 같은지 듣고 판단하세요.
   음성 파일 이름이 아니라 문장의 고유 id로 연결합니다.
   음성이 없는 항목은 '녹음 없음'을 표시하며 TTS로 대체하지 않습니다.
   페이지를 넘기거나 다른 문장을 누르면 현재 재생이 중단됩니다.

5. 오프라인 검증
   '이 실습을 오프라인에 저장'을 누르세요.
   '8개 앱 파일 저장 확인'은 Cache Storage에 파일이 있는지 확인한
   결과입니다. 실제 단절 상태의 성공을 자동으로 주장하지 않습니다.
   HTTPS 사이트: 인터넷을 끄고 같은 주소를 새로고침하세요.
   다운로드 키트: 인터넷만 끄면 localhost 서버는 계속 작동합니다.
   캐시 자체를 검증하려면 터미널에서 Ctrl+C로 서버까지 종료한 뒤
   같은 주소를 새로고침하고 3쪽·그림·연결한 녹음을 확인하세요.
   데이터가 저장된 같은 기기·브라우저·주소에서 테스트해야 합니다.
   다시 개발하려면 위 명령으로 서버를 실행하세요.

6. 백업·복원
   편집 내용, 그림, 녹음은 현재 브라우저의 IndexedDB에 저장됩니다.
   '원고·음성·그림을 한 파일로 백업'하면 모두 포함된 JSON을 받습니다.
   다른 기기/브라우저에서는 그 파일을 가져와야 작업이 이어집니다.
   백업 전체는 40 MB 이내입니다. 복원 시 기존 실습을 교체하기 전
   확인창이 나옵니다. 공유 전에 녹음과 그림의 내용을 확인하세요.
   브라우저가 저장 공간을 비울 수 있으므로 중요한 작업은 백업하세요.
   작업대 초기화는 이 실습의 원고·녹음·그림만 초기화합니다.
   앱 파일의 오프라인 캐시는 그대로 둡니다.

코드에서 찾아볼 기법
--------------------
book.json     원고와 화면 구현 분리, 고유 id
model.mjs     입력 검증, 변경된 문장의 오래된 음성 제거
app.js        DOM textContent로 안전하게 렌더링, audio.play(), IndexedDB,
              FileReader, MediaRecorder, 데이터 내보내기/가져오기
style.css     반응형 레이아웃, 그림 잘림 방지, @media print
sw.js         이 폴더만 담당하는 service worker, 명시적 파일 목록 캐시,
              실제 캐시 검사에 대한 메시지 응답

프로덕션과의 연결
-----------------
실제 ECCR 앱은 PDF의 페이지 이미지를 사용하며 텍스트가 있는 좌표를
퍼센트로 저장한 투명 버튼(핫스폿)에 교사 녹음을 연결합니다.
이 예제는 읽기 원고를 HTML 텍스트로 렌더링합니다.
프로덕션 방식으로 확장하려면 페이지 이미지, 검증된 좌표, 녹음 파일
경로, 브라우저의 MP3 Range 요청 처리 등 추가 작업이 필요합니다.
이 작업은 전체 기술문서에서 별도로 다룹니다.
기존 구현의 참조 문서:
기술인계문서-ECCR/TECHNICAL_HANDOFF_EN.md
기술인계문서-ECCR/ECCR_BOOK_PRODUCTION_TECHNICAL_GUIDE_EN.md

수정 후 캐시 주의
-----------------
배포 코드를 바꿀 때 sw.js의 CACHE_NAME 버전(v1)을 올리세요.
온라인으로 다시 열어 오프라인 저장을 누르고 새 버전 설치가 끝난 뒤
새로고침하세요. 현재 구현은 캐시 우선이므로 기존 캐시가 유지되는
동안 이전 파일을 보여줄 수 있습니다.
서비스 워커는 이 폴더 밖의 요청이나 다른 앱 캐시를 처리하지 않습니다.
공개 웹사이트에 기존 개인 음성·백업 파일을 추가하지 않습니다.

English quick guide
-------------------
This is a new learning implementation, not a full production clone. It uses
3 teaching pages and 11 verbatim sentences selected from the Book 7 manuscript.
Original manuscript: book/v.0/결과물Yaw_Janet/book 7.md
A portable copy is included as source-manuscript.txt.
The three new pages regroup its Simple Sentences, More Reading Practice and
Short Paragraph sections. They do not correspond to the original PDF pages.
The original Book 7 is a 12-page print book.

Run the hosted Reading Lab directly, or unzip this kit and run in this folder:

    python3 -m http.server 8877 --bind 127.0.0.1

Then open http://127.0.0.1:8877/ (Python 3 required for this local command).
There is no npm install, build step, proprietary API or server-side storage.
The files also run on HTTPS static hosting. Double-clicking the HTML is not
supported because JSON loading and service workers need HTTP(S).

Switch the interface to English. Edit a text value in the JSON panel and
apply it. Add artwork you have permission to use. Select a sentence and add
one matching recording, either from a file or with microphone permission.
Tap the sentence to check it. Changing its text removes the previous audio.
The lab never invents an audio recording or falls back to synthetic speech.
The audio player stops when you select a different sentence or change pages.

Print / PDF shows every page. This print layout is an educational example;
check page overflow, font size and artwork before printing. It does not
recreate the full canonical PDF design, binding, covers or page-image hotspots.

Save offline and wait for all 8 app files to be verified in the cache.
For HTTPS hosting, disconnect the internet, reload the same URL and test.
For localhost, stop the Python server with Ctrl+C as well: disconnecting
internet alone does not stop a local server. Reload and test the text,
pictures and audio. This is a real service-worker test, not a simulation.

Recordings and images stay in IndexedDB in this browser at this address.
Use Back up to export them together with the manuscript; restore that file
on another device. A book.json download contains text only, not recordings.
Maximum attachment: 10 MB. Maximum project backup: 40 MB.
Browsers may evict local storage. Keep a backup of important work.
Reset removes only this lab's draft and assets; the app-file cache is kept.

To publish edits, change the v1 suffix in sw.js, reopen while online, save
offline again, wait for installation and reload. This lab caches only its own
known files and removes only its own older caches.

Optional developer checks (Node.js 20+)
--------------------------------------
Node is not required to run the app. It is used only for these tests:

    node --test tests/model.test.mjs tests/sw.test.mjs
    node --input-type=module --check < app.js
    node --check sw.js

Tests cover manuscript structure, unique ids, rejection of unsafe/mismatched
assets, removal of stale recordings, verbatim source fidelity, scoped cache
installation and offline response routing. They do not prove microphone
quality, print layout or real offline operation on a particular device.

Manual acceptance checks
------------------------
[ ] 3 pages and 11 source sentences render; next/previous boundaries work.
[ ] A missing recording reports its absence and does not synthesize speech.
[ ] Upload a short matching recording; tap it; reload; it still plays.
[ ] During playback, change page; the old recording stops.
[ ] Change the sentence text; its old recording becomes unavailable.
[ ] Enter invalid JSON; the last valid reader remains unchanged.
[ ] Add a picture, print all pages, and inspect clipping/overflow.
[ ] Export, reset, then restore; the text, picture and recording return.
[ ] Save offline, stop the network/server, reload and play an attached file.
[ ] Test mobile width, English/Korean controls and keyboard navigation.

Credits
-------
Source teaching material: Yaw and Janet / ECCR.
Produced by Team Kairos.
This kit contains no personal voice recordings, original PDF files or API keys.
