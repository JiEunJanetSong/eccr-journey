// Pure data checks. Run with Node's built-in test runner: node --test tests/model.test.mjs
const validId = value => typeof value === "string" && /^[a-z0-9][a-z0-9-]{0,59}$/.test(value);
const validText = (value, max) => typeof value === "string" && value.trim().length > 0 && value.length <= max;

export function validateBook(book) {
  if (!book || typeof book !== "object" || !validId(book.id)) throw new Error("Book id: use lowercase letters, numbers and hyphens.");
  if (!validText(book.title, 160)) throw new Error("A book title is required (up to 160 characters).");
  if (!validText(book.language, 30)) throw new Error("A language value is required.");
  if (!Array.isArray(book.pages) || !book.pages.length || book.pages.length > 30) throw new Error("Use 1–30 pages.");
  const pageIds = new Set();
  const sentenceIds = new Set();
  for (const page of book.pages) {
    if (!page || !validId(page.id) || pageIds.has(page.id)) throw new Error("Each page needs a unique lowercase id.");
    pageIds.add(page.id);
    if (!validText(page.title, 160)) throw new Error("Each page needs a title.");
    if (!Array.isArray(page.sentences) || !page.sentences.length || page.sentences.length > 20) throw new Error("Use 1–20 sentences per page.");
    for (const sentence of page.sentences) {
      if (!sentence || !validId(sentence.id) || sentenceIds.has(sentence.id)) throw new Error("Each sentence needs a unique lowercase id across the whole book.");
      if (!validText(sentence.text, 600)) throw new Error("Each sentence needs text (up to 600 characters).");
      sentenceIds.add(sentence.id);
    }
  }
  return book;
}

export function assetAllowed(key, dataUrl, book) {
  if (typeof dataUrl !== "string" || dataUrl.length > 14500000) return false;
  const audioMatch = /^data:(audio\/(?:mpeg|mp3|mp4|x-m4a|wav|x-wav|webm|ogg|aac|flac)(?:;codecs=[a-zA-Z0-9.,_-]+)?);base64,[A-Za-z0-9+/]*={0,2}$/.test(dataUrl);
  const imageMatch = /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]*={0,2}$/.test(dataUrl);
  if (key.startsWith("audio:")) return audioMatch && book.pages.some(page => page.sentences.some(sentence => "audio:" + sentence.id === key));
  if (key.startsWith("image:")) return imageMatch && book.pages.some(page => "image:" + page.id === key);
  return false;
}

export function pruneAssets(oldBook, nextBook, assets) {
  const oldTexts = new Map(oldBook.pages.flatMap(page => page.sentences.map(sentence => [sentence.id, sentence.text])));
  const nextTexts = new Map(nextBook.pages.flatMap(page => page.sentences.map(sentence => [sentence.id, sentence.text])));
  const nextPages = new Set(nextBook.pages.map(page => page.id));
  return Object.fromEntries(Object.entries(assets).filter(([key]) => {
    if (key.startsWith("image:")) return nextPages.has(key.slice(6));
    const id = key.slice(6);
    return key.startsWith("audio:") && oldTexts.has(id) && oldTexts.get(id) === nextTexts.get(id);
  }));
}

export function validateProject(project) {
  if (!project || project.format !== "eccr-reading-lab-v1") throw new Error("This is not an ECCR Reading Lab backup.");
  validateBook(project.book);
  if (!project.assets || typeof project.assets !== "object" || Array.isArray(project.assets)) throw new Error("Backup assets must be an object.");
  for (const [key, dataUrl] of Object.entries(project.assets)) {
    if (!assetAllowed(key, dataUrl, project.book)) throw new Error("Unsupported or mismatched backup asset: " + key);
  }
  return project;
}
