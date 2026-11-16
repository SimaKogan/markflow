import './style.css';
import 'katex/dist/katex.min.css';
import { EditorView, basicSetup } from 'codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js/lib/common';
import katex from 'katex';

const $ = (s) => document.querySelector(s);
const STORE = { doc: 'markflow:doc', theme: 'markflow:theme' };
const WELCOME = `# Welcome to Markflow ✨

A fast, minimal Markdown editor with **live preview**.

## Features
- GitHub-flavoured Markdown, tables and task lists
- Syntax highlighting and KaTeX math
- Light / dark theme, autosave, PDF export

| Shortcut | Action |
|----------|--------|
| Ctrl+O   | Open   |
| Ctrl+S   | Save   |
| Ctrl+P   | PDF    |

- [x] Write something
- [ ] Share it

Inline math $E = mc^2$ and a block:

$$\\int_0^1 x^2\\,dx = \\tfrac{1}{3}$$

\`\`\`js
const greet = (name) => \`Hello, \${name}!\`;
\`\`\`
`;

/* ---------- Markdown rendering ---------- */
marked.use({
  gfm: true,
  renderer: {
    code({ text, lang }) {
      const l = lang && hljs.getLanguage(lang) ? lang : null;
      const html = l ? hljs.highlight(text, { language: l }).value : hljs.highlightAuto(text).value;
      return `<pre><code class="hljs">${html}</code></pre>`;
    }
  }
});

function renderMath(src) {
  const maths = [];
  const put = (tex, display) => {
    try {
      maths.push(katex.renderToString(tex, { displayMode: display, throwOnError: false }));
    } catch { maths.push(tex); }
    return `@@MATH${maths.length - 1}@@`;
  };
  // Leave fenced code untouched: odd chunks of a split on ``` are code.
  const out = src.split(/(```[\s\S]*?```)/g).map((chunk, i) => i % 2 ? chunk : chunk
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, t) => put(t, true))
    .replace(/(?<![\\$])\$(?!\s)([^$\n]+?)(?<!\s)\$(?!\d)/g, (_, t) => put(t, false))
  ).join('');
  return { out, maths };
}

function render(src) {
  const { out, maths } = renderMath(src);
  let html = DOMPurify.sanitize(marked.parse(out, { async: false }));
  html = html.replace(/@@MATH(\d+)@@/g, (_, n) => maths[+n]);
  return html;
}

/* ---------- Editor ---------- */
const preview = $('#preview');
const wrap = $('#preview-wrap');
let filePath = null;
let dirty = false;
let timer;

const view = new EditorView({
  doc: localStorage.getItem(STORE.doc) ?? WELCOME,
  parent: $('#editor'),
  extensions: [
    basicSetup,
    markdown({ codeLanguages: languages }),
    EditorView.lineWrapping,
    EditorView.updateListener.of((u) => { if (u.docChanged) onChange(); })
  ]
});

const text = () => view.state.doc.toString();

function update() {
  const src = text();
  preview.innerHTML = render(src);
  const words = (src.trim().match(/\S+/g) || []).length;
  $('#stats').textContent = `${words} words · ${src.length} chars`;
}

function onChange() {
  dirty = true;
  $('#saved').textContent = 'Editing…';
  clearTimeout(timer);
  timer = setTimeout(() => {
    update();
    localStorage.setItem(STORE.doc, text());
    $('#saved').textContent = filePath ? 'Unsaved changes' : 'Draft saved';
  }, 150);
}

/* ---------- Synchronised scrolling ---------- */
view.scrollDOM.addEventListener('scroll', () => {
  const s = view.scrollDOM;
  const ratio = s.scrollTop / Math.max(1, s.scrollHeight - s.clientHeight);
  wrap.scrollTop = ratio * (wrap.scrollHeight - wrap.clientHeight);
});

/* ---------- Formatting toolbar ---------- */
function wrapSel(before, after = before, placeholder = 'text') {
  const { from, to } = view.state.selection.main;
  const sel = view.state.sliceDoc(from, to) || placeholder;
  view.dispatch({
    changes: { from, to, insert: before + sel + after },
    selection: { anchor: from + before.length, head: from + before.length + sel.length }
  });
  view.focus();
}
function prefixLine(prefix) {
  const line = view.state.doc.lineAt(view.state.selection.main.from);
  view.dispatch({ changes: { from: line.from, insert: prefix } });
  view.focus();
}
const ACTIONS = {
  bold: () => wrapSel('**'),
  italic: () => wrapSel('*'),
  code: () => wrapSel('`'),
  link: () => wrapSel('[', '](https://)', 'link'),
  h: () => prefixLine('## '),
  quote: () => prefixLine('> '),
  list: () => prefixLine('- ')
};
$('#tools').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (b) ACTIONS[b.dataset.act]?.();
});

/* ---------- Files ---------- */
function setName() {
  $('#file-name').textContent = filePath ? filePath.split(/[\\/]/).pop() : 'untitled.md';
}
function setText(s) {
  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: s } });
}

async function openFile() {
  if (window.markflow) {
    const r = await window.markflow.openFile();
    if (!r) return;
    filePath = r.path;
    setText(r.content);
  } else {
    const input = Object.assign(document.createElement('input'), { type: 'file', accept: '.md,.markdown,.txt' });
    input.onchange = async () => {
      const f = input.files[0];
      if (!f) return;
      filePath = null;
      $('#file-name').textContent = f.name;
      setText(await f.text());
    };
    input.click();
    return;
  }
  setName();
  dirty = false;
  $('#saved').textContent = 'Opened';
}

async function saveFile() {
  if (window.markflow) {
    const r = await window.markflow.saveFile(text(), filePath);
    if (!r) return;
    filePath = r.path;
    setName();
  } else {
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([text()], { type: 'text/markdown' })),
      download: $('#file-name').textContent
    });
    a.click();
    URL.revokeObjectURL(a.href);
  }
  dirty = false;
  $('#saved').textContent = 'Saved';
}

$('#btn-open').onclick = openFile;
$('#btn-save').onclick = saveFile;
$('#btn-pdf').onclick = () => window.print();

/* ---------- Theme ---------- */
function setTheme(t) {
  document.documentElement.dataset.theme = t;
  localStorage.setItem(STORE.theme, t);
}
setTheme(localStorage.getItem(STORE.theme) || 'dark');
$('#btn-theme').onclick = () =>
  setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');

/* ---------- Shortcuts ---------- */
window.addEventListener('keydown', (e) => {
  if (!(e.ctrlKey || e.metaKey)) return;
  const k = e.key.toLowerCase();
  const map = { s: saveFile, o: openFile, p: () => window.print(), b: ACTIONS.bold, i: ACTIONS.italic, k: ACTIONS.link };
  if (map[k]) { e.preventDefault(); map[k](); }
});

window.addEventListener('beforeunload', (e) => { if (dirty && filePath) e.preventDefault(); });

update();
setName();
