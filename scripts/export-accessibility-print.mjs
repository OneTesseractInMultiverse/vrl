import { readFileSync } from "node:fs";
const profile=process.argv[2] ?? "minimum";
if(!["minimum","current"].includes(profile)) throw new Error("Choose a prepared minimum or current consumer profile.");
const {chromium}=await import(new URL(`../.consumers/${profile}/node_modules/playwright/index.mjs`,import.meta.url));
const svg=readFileSync(new URL("../docs/assets/accessibility/monochrome-736.svg",import.meta.url),"utf8");
const browser=await chromium.launch({headless:true});
try {
  const page=await browser.newPage();
  await page.route("**/*",/**
   * Reject all network requests; the print fixture contains only local generated markup.
   * @responsibility coordinator
   * @param {Object} request - Playwright intercepted request.
   * @returns {Promise<void>} Resolves after the request is blocked.
   */ request => request.abort());
  await page.setContent(`<html><style>body{margin:24px;background:white}svg>rect,.vrl-row-wash{fill:none!important}</style>${svg}</html>`);
  const size=await page.locator("svg").evaluate(/**
   * Read actual SVG extent so the long-sheet export preserves intrinsic text size without fit-to-page shrinkage.
   * @responsibility computation
   * @param {SVGElement} element - The generated monochrome document.
   * @returns {Object} Complete intrinsic SVG width and height in CSS pixels.
   */ element => ({width:element.getBoundingClientRect().width,height:element.getBoundingClientRect().height}));
  const path=new URL(`../.consumers/${profile}/monochrome-print.pdf`,import.meta.url).pathname;
  await page.pdf({path,width:`${size.width+48}px`,height:`${size.height+48}px`,printBackground:false});
  console.log(path);
} finally { await browser.close(); }
