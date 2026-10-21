import {validateBook, validateProject, assetAllowed, pruneAssets} from "./model.mjs";

const byId = id => document.getElementById(id);
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_PROJECT_BYTES = 40 * 1024 * 1024;
const DB_NAME = "eccr-reading-lab:" + new URL("./", location.href).pathname;
let uiLanguage = "ko";
let book;
let originalBook;
let assets = {};
let pageIndex = 0;
let database;
let player = null;
let playingButton = null;
let recorder = null;
let recordingTimer = null;
let offlineChecked = false;
const text = (ko, en) => uiLanguage === "ko" ? ko : en;
const say = (ko, en = ko) => { byId("status").textContent = text(ko, en); };

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("projects");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function readSaved() {
  return new Promise((resolve, reject) => {
    const request = database.transaction("projects").objectStore("projects").get("draft");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function saveProject(nextBook = book, nextAssets = assets) {
  const project = {format: "eccr-reading-lab-v1", book: nextBook, assets: nextAssets};
  if (JSON.stringify(project).length > MAX_PROJECT_BYTES) {
    return Promise.reject(new Error(text("실습 백업은 총 40 MB 이내여야 합니다. 큰 녹음이나 그림을 줄이세요.", "Keep the project below 40 MB; shorten recordings or reduce image size.")));
  }
  return new Promise((resolve, reject) => {
    const transaction = database.transaction("projects", "readwrite");
    transaction.objectStore("projects").put(project, "draft");
    transaction.oncomplete = () => {
      book = nextBook;
      assets = nextAssets;
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error("Storage transaction aborted."));
  });
}

function makeElement(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
}

function stopAudio() {
  if (player) {
    player.pause();
    player.removeAttribute("src");
    player.load();
  }
  playingButton?.classList.remove("playing");
  player = null;
  playingButton = null;
}

async function playSentence(sentence, button) {
  stopAudio();
  const dataUrl = assets["audio:" + sentence.id];
  if (!dataUrl) {
    say("이 문장의 녹음이 없습니다. 작업대에서 문장을 선택하고 목소리를 연결하세요.",
      "No recording yet. Select this sentence in the teacher workspace and add your voice.");
    byId("sentence").value = sentence.id;
    return;
  }
  player = new Audio(dataUrl);
  const currentPlayer = player;
  playingButton = button;
  button.classList.add("playing");
  currentPlayer.addEventListener("ended", () => {
    if (player !== currentPlayer) return;
    stopAudio();
    say("재생 완료 · 글과 녹음이 일치했나요?", "Playback finished · did the recording match the text?");
  }, {once: true});
  try {
    await currentPlayer.play();
    if (player === currentPlayer) say("재생 중: " + sentence.text, "Playing: " + sentence.text);
  } catch {
    if (player !== currentPlayer) return;
    stopAudio();
    say("이 브라우저가 녹음을 재생하지 못했습니다. MP3 또는 WAV 파일로 다시 연결하세요.",
      "This browser could not play the recording. Try an MP3 or WAV file.");
  }
}

function renderPage(page, index) {
  const sheet = makeElement("article", "sheet");
  sheet.hidden = index !== pageIndex;
  sheet.lang = book.language;
  sheet.append(makeElement("p", "book-title", book.title));
  sheet.append(makeElement("h2", "", page.title));
  const art = makeElement("div", "art");
  const imageData = assets["image:" + page.id];
  if (imageData) {
    const image = makeElement("img");
    image.src = imageData;
    image.alt = text("교사가 추가한 그림: ", "Teacher-added illustration: ") + page.title;
    art.append(image);
  } else {
    art.append(makeElement("span", "", text("그림 자리 · 작업대에서 내 그림을 넣어보세요", "Illustration space · add your own picture in the workspace")));
  }
  sheet.append(art);
  const sentences = makeElement("div", "sentences");
  for (const sentence of page.sentences) {
    const button = makeElement("button", "sentence");
    button.type = "button";
    button.dataset.sentenceId = sentence.id;
    button.append(makeElement("span", "", sentence.text));
    button.append(makeElement("span", "audio-state", assets["audio:" + sentence.id]
      ? text("누르면 내 녹음 재생", "TAP TO PLAY YOUR RECORDING")
      : text("녹음 없음", "NO RECORDING YET")));
    button.addEventListener("click", () => playSentence(sentence, button));
    sentences.append(button);
  }
  sheet.append(sentences);
  const folio = makeElement("div", "folio");
  folio.append(makeElement("span", "", "ECCR · Produced by Team Kairos"));
  folio.append(makeElement("span", "", `${index + 1} / ${book.pages.length}`));
  sheet.append(folio);
  return sheet;
}

function render() {
  stopAudio();
  const previousSelection = byId("sentence").value;
  const page = book.pages[pageIndex];
  byId("reader").replaceChildren(...book.pages.map(renderPage));
  byId("page-count").textContent = text("페이지 ", "Page ") + `${pageIndex + 1} / ${book.pages.length}`;
  byId("previous").disabled = pageIndex === 0;
  byId("next").disabled = pageIndex === book.pages.length - 1;
  byId("sentence").replaceChildren(...page.sentences.map(sentence => {
    const option = makeElement("option", "", sentence.text);
    option.value = sentence.id;
    return option;
  }));
  if (page.sentences.some(sentence => sentence.id === previousSelection)) byId("sentence").value = previousSelection;
  byId("json-editor").value = JSON.stringify(book, null, 2);
  byId("record").disabled = !navigator.mediaDevices?.getUserMedia || !window.MediaRecorder;
}

function renderLanguage() {
  document.documentElement.lang = uiLanguage;
  document.querySelectorAll("[data-ko][data-en]").forEach(node => {
    node.textContent = node.dataset[uiLanguage];
  });
  byId("language").textContent = uiLanguage === "ko" ? "English" : "한국어";
  byId("language").setAttribute("aria-label", uiLanguage === "ko" ? "Switch language to English" : "한국어로 전환");
  if (book) render();
  renderOfflineStatus();
}

function readDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function attachAsset(key, file) {
  if (!file) return;
  if (file.size > MAX_FILE_BYTES) throw new Error(text("각 파일은 10 MB 이내여야 합니다.", "Each file must be 10 MB or smaller."));
  const dataUrl = await readDataUrl(file);
  if (!assetAllowed(key, dataUrl, book)) throw new Error(text("지원하지 않는 파일 형식입니다.", "This file format is not supported."));
  await saveProject(book, {...assets, [key]: dataUrl});
  render();
  say("이 브라우저에 저장했습니다. 문장을 눌러 녹음을 확인하세요.", "Saved in this browser. Tap the sentence to check its recording.");
}

function download(name, value) {
  const blob = new Blob([JSON.stringify(value, null, 2)], {type: "application/json"});
  const url = URL.createObjectURL(blob);
  const link = makeElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function setRecordingUi(active) {
  document.querySelectorAll("button,input,textarea,select").forEach(node => {
    node.disabled = active && node.id !== "stop-record";
  });
  byId("stop-record").hidden = !active;
  byId("record").hidden = active;
  if (!active) render();
}

async function startRecording() {
  stopAudio();
  const sentenceId = byId("sentence").value;
  const stream = await navigator.mediaDevices.getUserMedia({audio: true});
  const parts = [];
  try {
    const mimeType = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"]
      .find(type => MediaRecorder.isTypeSupported(type));
    recorder = new MediaRecorder(stream, mimeType ? {mimeType} : undefined);
    const currentRecorder = recorder;
    currentRecorder.addEventListener("dataavailable", event => {
      if (event.data.size) parts.push(event.data);
    });
    currentRecorder.addEventListener("stop", async () => {
      clearTimeout(recordingTimer);
      stream.getTracks().forEach(track => track.stop());
      recorder = null;
      setRecordingUi(false);
      try {
        const blob = new Blob(parts, {type: currentRecorder.mimeType});
        if (!blob.size) throw new Error(text("녹음 내용이 비어 있습니다.", "The recording is empty."));
        await attachAsset("audio:" + sentenceId, blob);
      } catch (error) { say(error.message); }
    }, {once: true});
    currentRecorder.addEventListener("error", () => {
      stream.getTracks().forEach(track => track.stop());
      say("녹음 오류가 발생했습니다. 파일 선택으로 연결할 수 있습니다.", "Recording failed. You can attach an audio file instead.");
    }, {once: true});
    currentRecorder.start();
    setRecordingUi(true);
    say("녹음 중 · 문장을 읽고 ‘녹음 마치고 저장’을 누르세요. 90초 후 자동 종료됩니다.",
      "Recording · read the selected sentence, then stop and save. Stops automatically after 90 seconds.");
    recordingTimer = setTimeout(() => {
      if (currentRecorder.state === "recording") currentRecorder.stop();
    }, 90000);
  } catch (error) {
    stream.getTracks().forEach(track => track.stop());
    recorder = null;
    setRecordingUi(false);
    throw error;
  }
}

function renderOfflineStatus() {
  byId("offline-status").textContent = offlineChecked
    ? text("앱 파일 캐시 확인 완료. 아직 실제 오프라인 재열기·음성 재생 검증은 하지 않았습니다.",
      "App files are confirmed in the cache. You still need to test reopening and audio playback offline.")
    : text("아직 이 페이지에서 오프라인 캐시를 확인하지 않았습니다.", "The offline cache has not been checked on this visit.");
}

async function waitForWorker(registration) {
  if (registration.active) return registration.active;
  const worker = registration.installing || registration.waiting;
  if (!worker) throw new Error("No service worker is installing.");
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Offline installation timed out. Please retry online.")), 20000);
    const check = () => {
      if (worker.state === "activated") { clearTimeout(timer); resolve(worker); }
      if (worker.state === "redundant") { clearTimeout(timer); reject(new Error("Could not cache every app file. Please retry online.")); }
    };
    worker.addEventListener("statechange", check);
    check();
  });
}

async function saveOffline() {
  if (!("serviceWorker" in navigator) || !window.isSecureContext) {
    throw new Error(text("HTTPS 또는 localhost 주소로 열어주세요. 파일을 더블클릭하면 오프라인 기능을 사용할 수 없습니다.",
      "Open this page on HTTPS or localhost. Double-clicking index.html does not enable offline support."));
  }
  byId("save-offline").disabled = true;
  try {
    say("앱 파일을 저장하고 있습니다…", "Saving the app files…");
    const registration = await navigator.serviceWorker.register("./sw.js", {scope: "./"});
    const worker = await waitForWorker(registration);
    const check = await new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      const timeout = setTimeout(() => { channel.port1.close(); reject(new Error("Cache check timed out.")); }, 5000);
      channel.port1.onmessage = event => { clearTimeout(timeout); channel.port1.close(); resolve(event.data); };
      worker.postMessage({type: "CHECK_CORE"}, [channel.port2]);
    });
    if (!check.ready) throw new Error(`Only ${check.count}/${check.total} files are cached. Retry while online.`);
    offlineChecked = true;
    renderOfflineStatus();
    say(`${check.count}개 앱 파일 저장 확인. 아래 단계로 실제 오프라인 사용을 검증하세요.`,
      `${check.count} app files verified in cache. Follow the steps to test real offline use.`);
  } finally { byId("save-offline").disabled = false; }
}

function bindAction(id, callback, eventName = "click") {
  byId(id).addEventListener(eventName, async event => {
    try { await callback(event); }
    catch (error) { say(error.message || String(error)); }
  });
}

function bindEvents() {
  bindAction("previous", () => { pageIndex--; render(); say(""); });
  bindAction("next", () => { pageIndex++; render(); say(""); });
  bindAction("print", () => { stopAudio(); window.print(); });
  bindAction("language", () => { uiLanguage = uiLanguage === "ko" ? "en" : "ko"; renderLanguage(); say(""); });
  bindAction("audio-file", async event => {
    await attachAsset("audio:" + byId("sentence").value, event.target.files[0]);
    event.target.value = "";
  }, "change");
  bindAction("image-file", async event => {
    await attachAsset("image:" + book.pages[pageIndex].id, event.target.files[0]);
    event.target.value = "";
  }, "change");
  for (const [control, key] of [["remove-audio", () => "audio:" + byId("sentence").value],
    ["remove-image", () => "image:" + book.pages[pageIndex].id]]) {
    bindAction(control, async () => {
      const remaining = {...assets};
      delete remaining[key()];
      await saveProject(book, remaining);
      render();
      say("선택한 자료를 삭제했습니다.", "The selected asset was removed.");
    });
  }
  bindAction("apply-json", async () => {
    const nextBook = validateBook(JSON.parse(byId("json-editor").value));
    const remaining = pruneAssets(book, nextBook, assets);
    await saveProject(nextBook, remaining);
    pageIndex = Math.min(pageIndex, book.pages.length - 1);
    render();
    say("원고를 적용했습니다. 변경된 문장의 녹음은 해제했습니다.", "Manuscript applied. Recordings for changed sentences were removed.");
  });
  bindAction("download-json", () => download("book.json", book));
  bindAction("record", startRecording);
  bindAction("stop-record", () => { if (recorder?.state === "recording") recorder.stop(); });
  bindAction("save-offline", saveOffline);
  bindAction("export-project", () => download("eccr-reading-lab-backup.json", {format: "eccr-reading-lab-v1", book, assets}));
  bindAction("import-project", async event => {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > MAX_PROJECT_BYTES) throw new Error("Backup files must be smaller than 40 MB.");
    const imported = validateProject(JSON.parse(await file.text()));
    if (!confirm(text("현재 실습의 원고·녹음·그림을 이 백업으로 교체할까요?", "Replace this lab's text, audio and pictures with this backup?"))) return;
    await saveProject(imported.book, imported.assets);
    pageIndex = 0;
    render();
    say("백업을 가져왔습니다.", "Backup restored.");
    event.target.value = "";
  }, "change");
  bindAction("reset", async () => {
    if (!confirm(text("이 실습의 편집·녹음·그림을 지우고 처음 원고로 돌아갈까요? 필요한 작업은 먼저 백업하세요.",
      "Remove this lab's edits, recordings and pictures and return to the sample manuscript? Back up your work first."))) return;
    await saveProject(structuredClone(originalBook), {});
    pageIndex = 0;
    render();
    say("처음 원고로 되돌렸습니다. 앱 파일의 오프라인 캐시는 유지됩니다.",
      "The sample manuscript is restored. The app-file offline cache is kept.");
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopAudio();
  });
}

async function main() {
  try {
    const response = await fetch("./book.json");
    if (!response.ok) throw new Error("book.json could not be loaded.");
    originalBook = validateBook(await response.json());
    database = await openDatabase();
    const saved = await readSaved();
    if (saved) {
      validateProject(saved);
      book = saved.book;
      assets = saved.assets;
    } else book = structuredClone(originalBook);
    byId("workspace").hidden = false;
    bindEvents();
    renderLanguage();
    say("문장을 눌러보세요. 아직 녹음은 연결되지 않았습니다.", "Tap a sentence. Add a recording in the workspace to hear it.");
    if (Object.keys(assets).some(key => key.startsWith("audio:"))) say("저장된 실습을 열었습니다.", "Your saved lab is ready.");
  } catch (error) {
    byId("error").hidden = false;
    byId("error").textContent = "실습을 열 수 없습니다 / Could not open the lab: " + error.message +
      " — readme.txt의 localhost 실행 방법을 확인하세요. / See the localhost setup in readme.txt.";
  }
}

main();
