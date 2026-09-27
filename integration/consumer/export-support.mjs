/**
 * Observe mounted standalone or inline SVGs through browser layout and actual document-wide reference resolution.
 * @responsibility computation
 * @returns {Object} Visible text bounds, row overlap/size problems, duplicate identities and missing/foreign references.
 */
export function observeExports() {
  const clipped = [], hidden = [], overlaps = [], references = [], duplicates = [], small = [], ids = new Set();
  for (const element of document.querySelectorAll("[id]")) {
    if (ids.has(element.id)) duplicates.push(element.id);
    ids.add(element.id);
  }
  for (const svg of document.querySelectorAll("svg")) {
    const outer = svg.getBoundingClientRect(), rowText = [];
    for (const attribute of ["aria-labelledby", "aria-describedby"]) {
      const target = document.getElementById(svg.getAttribute(attribute));
      if (target === null || target.closest("svg") !== svg) references.push(attribute);
    }
    for (const path of svg.querySelectorAll("[marker-end]")) {
      const id = path.getAttribute("marker-end").slice(5,-1), target = document.getElementById(id);
      if (target === null || target.closest("svg") !== svg) references.push("marker-end");
    }
    for (const text of svg.querySelectorAll("text")) {
      const box = text.getBoundingClientRect(), style = getComputedStyle(text);
      if (box.left < outer.left - 0.75 || box.right > outer.right + 0.75 || box.top < outer.top - 0.75 || box.bottom > outer.bottom + 0.75) clipped.push(text.textContent);
      if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) hidden.push(text.textContent);
      if (svg.getAttribute("data-vrl-flow") === "rows") {
        if (parseFloat(style.fontSize) < 14) small.push(text.textContent);
        if (box.width > 0 && box.height > 0) rowText.push({box,text:text.textContent});
      }
    }
    for (let first = 0; first < rowText.length; first++) for (let second = first + 1; second < rowText.length; second++) {
      const a = rowText[first], b = rowText[second];
      if (Math.min(a.box.right,b.box.right) - Math.max(a.box.left,b.box.left) > 0.75 && Math.min(a.box.bottom,b.box.bottom) - Math.max(a.box.top,b.box.top) > 0.75) overlaps.push([a.text,b.text]);
    }
  }
  return {clipped,hidden,overlaps,references,duplicates,small};
}
