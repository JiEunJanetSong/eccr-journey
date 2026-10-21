import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {validateBook, validateProject, pruneAssets, assetAllowed} from "../model.mjs";

const book = JSON.parse(await readFile(new URL("../book.json", import.meta.url), "utf8"));
const wav = "data:audio/wav;base64,UklGRg==";
const png = "data:image/png;base64,aGVsbG8=";

test("three-page excerpt retains all 11 sentences verbatim from the source", async () => {
  assert.equal(validateBook(book), book);
  assert.equal(book.pages.length, 3);
  const sentences = book.pages.flatMap(page => page.sentences);
  assert.equal(sentences.length, 11);
  const source = await readFile(new URL("../source-manuscript.txt", import.meta.url), "utf8");
  for (const sentence of sentences) assert.ok(source.split("\n").includes(sentence.text), sentence.text);
});

test("duplicate sentence ids anywhere in the book are rejected", () => {
  const duplicate = structuredClone(book);
  duplicate.pages[1].sentences[0].id = duplicate.pages[0].sentences[0].id;
  assert.throws(() => validateBook(duplicate), /unique lowercase id/);
});

test("invalid structures and blank text are rejected", () => {
  for (const invalid of [null, {}, {...book, pages: []}, {...book, pages: [null]}]) {
    assert.throws(() => validateBook(invalid));
  }
  const blank = structuredClone(book);
  blank.pages[0].sentences[0].text = " ";
  assert.throws(() => validateBook(blank), /needs text/);
});

test("changed text or removed ids lose audio; unchanged text keeps it", () => {
  const changed = structuredClone(book);
  changed.pages[0].sentences[0].text = "A new teacher-written sentence.";
  changed.pages[0].sentences.splice(1, 1);
  const assets = {
    "audio:simple-1": wav, "audio:simple-2": wav,
    "audio:simple-3": wav, "image:simple": png, "image:deleted-page": png
  };
  assert.deepEqual(pruneAssets(book, changed, assets), {
    "audio:simple-3": wav, "image:simple": png
  });
});

test("only bounded supported media for known ids may be restored", () => {
  assert.equal(assetAllowed("audio:simple-1", wav, book), true);
  assert.equal(assetAllowed("image:simple", png, book), true);
  assert.equal(assetAllowed("audio:simple-1", "data:audio/webm;codecs=opus;base64,aGVsbG8=", book), true);
  for (const [key, url] of [
    ["audio:unknown", wav],
    ["image:simple", "data:image/svg+xml;base64,aGVsbG8="],
    ["image:simple", "https://external.example/image.png"],
    ["audio:simple-1", png],
    ["__proto__", wav],
    ["audio:simple-1", "data:audio/wav;base64," + "A".repeat(14500001)]
  ]) assert.equal(assetAllowed(key, url, book), false, key);
});

test("backup schema refuses incompatible formats and mismatched assets", () => {
  const project = {format: "eccr-reading-lab-v1", book, assets: {"audio:simple-1": wav}};
  assert.equal(validateProject(project), project);
  assert.throws(() => validateProject({...project, format: "other"}), /not an ECCR/);
  assert.throws(() => validateProject({...project, assets: {"audio:missing": wav}}), /mismatched/);
});

test("all local HTML runtime references exist", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const paths = [...html.matchAll(/(?:src|href)="\.\/([^"]+)"/g)].map(match => match[1]);
  for (const path of paths) await readFile(new URL("../" + path, import.meta.url));
});
