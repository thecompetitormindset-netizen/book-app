// Notes are stored as a tiny subset of HTML (bold, lists, pen colours,
// highlighter colours). Everything else is stripped, which keeps pages small
// and safe to render.

const ALLOWED = new Set(["B", "STRONG", "I", "EM", "U", "BR", "DIV", "P", "UL", "OL", "LI", "SPAN", "H3", "FONT", "HR"]);
const ALLOWED_STYLE = ["color", "background-color", "font-weight", "text-decoration"];

function clean(node, doc) {
  for (const child of [...node.childNodes]) {
    if (child.nodeType === Node.TEXT_NODE) continue;
    if (child.nodeType !== Node.ELEMENT_NODE || !ALLOWED.has(child.tagName)) {
      // Keep the text of unknown elements, drop the element itself.
      if (child.nodeType === Node.ELEMENT_NODE && !["SCRIPT", "STYLE", "IFRAME", "OBJECT"].includes(child.tagName)) {
        clean(child, doc);
        child.replaceWith(...child.childNodes);
      } else {
        child.remove();
      }
      continue;
    }
    const style = ALLOWED_STYLE
      .map((p) => [p, child.style.getPropertyValue(p)])
      .filter(([, v]) => v && !/url|expression/i.test(v))
      .map(([p, v]) => `${p}: ${v}`)
      .join("; ");
    const color = child.tagName === "FONT" ? child.getAttribute("color") : null;
    for (const a of [...child.attributes]) child.removeAttribute(a.name);
    if (style) child.setAttribute("style", style);
    if (color && /^#?[\w]+$/.test(color)) child.setAttribute("color", color);
    clean(child, doc);
  }
}

export function sanitizeHtml(html) {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstChild;
  clean(root, doc);
  return root.innerHTML;
}

export const escapeHtml = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function htmlToText(html) {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(
    html.replace(/<br\s*\/?>/gi, "\n").replace(/<(div|p|li|h3|ul|ol)[\s>]/gi, "\n$&"), "text/html");
  return doc.body.textContent.replace(/\n{3,}/g, "\n\n").trim();
}

/** Light markdown → our HTML subset, for adding AI answers to a page. */
export function markdownToHtml(md, color) {
  const lines = escapeHtml(md.trim()).split("\n");
  const out = [];
  let inList = false;
  for (const raw of lines) {
    const line = raw.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/^#{1,4}\s*(.*)$/, "<b>$1</b>");
    const item = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (item) {
      if (!inList) { out.push("<ul>"); inList = true; }
      out.push(`<li>${item[1]}</li>`);
    } else {
      if (inList) { out.push("</ul>"); inList = false; }
      out.push(line ? `<div>${line}</div>` : "<div><br></div>");
    }
  }
  if (inList) out.push("</ul>");
  return `<div style="color: ${color}">${out.join("")}</div>`;
}

const toRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};

/** Text the student highlighted with a given highlighter colour. */
export function textHighlightedWith(html, hex) {
  if (!html) return [];
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const want = [hex.toLowerCase(), toRgb(hex)];
  return [...doc.querySelectorAll("[style]")]
    .filter((el) => want.includes(el.style.backgroundColor.toLowerCase()))
    .map((el) => el.textContent.trim())
    .filter(Boolean);
}
