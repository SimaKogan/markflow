// Math handling kept free of DOM/KaTeX imports so it can be unit-tested with plain Node.

const OPEN = '';
const CLOSE = '';
// Splitting with a capture group puts code chunks at odd indexes.
const CODE = /(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]+`)/g;

const escapeHtml = (s) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/**
 * Replace $inline$ and $$display$$ math with private-use placeholders so that
 * the Markdown parser never touches it. Fenced code and `inline code` are skipped.
 * `renderTex(tex, displayMode)` must return HTML.
 */
export function protectMath(src, renderTex) {
  const maths = [];
  const put = (tex, display) => {
    let html;
    try {
      html = renderTex(tex, display);
    } catch {
      html = escapeHtml(tex); // never insert raw text into HTML
    }
    maths.push(html);
    return `${OPEN}${maths.length - 1}${CLOSE}`;
  };

  const clean = src.replace(/[]/g, '');
  const out = clean
    .split(CODE)
    .map((chunk, i) =>
      i % 2
        ? chunk
        : chunk
            .replace(/\$\$([\s\S]+?)\$\$/g, (_, t) => put(t, true))
            .replace(/(?<![\\$])\$(?!\s)([^$\n]+?)(?<!\s)\$(?!\d)/g, (_, t) => put(t, false))
    )
    .join('');
  return { out, maths };
}

/** Put the rendered math back into the (already sanitised) HTML. */
export function restoreMath(html, maths) {
  return html.replace(new RegExp(`${OPEN}(\\d+)${CLOSE}`, 'g'), (_, n) => maths[+n] ?? '');
}
