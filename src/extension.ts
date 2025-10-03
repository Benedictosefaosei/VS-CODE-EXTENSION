import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from 'uuid';

type Pos = { line: number; character: number };

type RangeSerializable = {
  start: Pos;
  end: Pos;
};

type QAItem = {
  id: string;
  filePath: string; 
  range: RangeSerializable;
  snippet: string;
  question: string;
  answer?: string;
  askedAt: number;
  answeredAt?: number;
  exclude?: boolean;
};

// UUID generation function 
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const STORAGE_REL_PATH = ".vscode/quiz-questions.json";
let decorationType: vscode.TextEditorDecorationType | undefined;

/**
 * Helpers: storage
 */
function getWorkspaceRoot(): string | undefined {
  const wf = vscode.workspace.workspaceFolders;
  if (!wf || wf.length === 0) {
    return undefined;
  }
  return wf[0].uri.fsPath;
}

function getStoragePath(): string | undefined {
  const root = getWorkspaceRoot();
  if (!root) return undefined;
  return path.join(root, STORAGE_REL_PATH);
}

async function ensureStorageDir(): Promise<void> {
  const sp = getStoragePath();
  if (!sp) throw new Error("Open a workspace folder first.");
  const dir = path.dirname(sp);
  await fs.promises.mkdir(dir, { recursive: true });
}

async function loadAll(): Promise<QAItem[]> {
  const sp = getStoragePath();
  if (!sp) return [];
  try {
    const raw = await fs.promises.readFile(sp, "utf8");
    const items = JSON.parse(raw) as QAItem[];
    return Array.isArray(items) ? items : [];
  } catch (e) {
    return [];
  }
}

async function saveAll(items: QAItem[]): Promise<void> {
  const sp = getStoragePath();
  if (!sp) throw new Error("Open a workspace folder first.");
  await ensureStorageDir();
  await fs.promises.writeFile(sp, JSON.stringify(items, null, 2), "utf8");
}

/**
 * Decorations
 */
function createDecorationType(): vscode.TextEditorDecorationType {
  return vscode.window.createTextEditorDecorationType({
    backgroundColor: "rgba(102, 255, 102, 0.18)", // soft green
    isWholeLine: false,
    borderRadius: "2px"
  });
}

async function applyDecorationsToEditor(editor: vscode.TextEditor | undefined) {
  if (!editor) return;
  if (!decorationType) decorationType = createDecorationType();
  const docPath = vscode.workspace.asRelativePath(editor.document.uri);
  const all = await loadAll();
  const decorations: vscode.DecorationOptions[] = [];

  for (const it of all) {
    // match by relative path
    if (it.filePath === docPath) {
      // guard positions
      const start = new vscode.Position(Math.max(0, it.range.start.line), Math.max(0, it.range.start.character));
      const end = new vscode.Position(Math.max(0, it.range.end.line), Math.max(0, it.range.end.character));
      const range = new vscode.Range(start, end);
      const hoverMessage = new vscode.MarkdownString(`**Question:** ${escapeMarkdown(it.question)}\n\n**Answer:** ${escapeMarkdown(it.answer ?? "(not answered)")}`);
      decorations.push({ range, hoverMessage });
    }
  }

  editor.setDecorations(decorationType, decorations);
}

async function refreshAllDecorations() {
  for (const editor of vscode.window.visibleTextEditors) {
    await applyDecorationsToEditor(editor);
  }
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeMarkdown(s: string) {
  // minimal
  return s.replace(/\*/g, "\\*").replace(/_/g, "\\_");
}

/**
 * Utility to open file at stored range
 */
async function openFileAt(item: QAItem) {
  const root = getWorkspaceRoot();
  if (!root) {
    vscode.window.showErrorMessage("Open a workspace folder first.");
    return;
  }
  const fullPath = path.join(root, item.filePath);
  try {
    const doc = await vscode.workspace.openTextDocument(fullPath);
    const editor = await vscode.window.showTextDocument(doc, { preview: false });
    const posStart = new vscode.Position(item.range.start.line, item.range.start.character);
    const posEnd = new vscode.Position(item.range.end.line, item.range.end.character);
    editor.revealRange(new vscode.Range(posStart, posEnd), vscode.TextEditorRevealType.InCenter);
    editor.selection = new vscode.Selection(posStart, posEnd);
  } catch (e) {
    vscode.window.showErrorMessage("Could not open file: " + String(e));
  }
}

/**
 * Create a unique id
 */
function makeId(): string {
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9);
}


// function getWebviewHtml(items: QAItem[], panel: vscode.WebviewPanel): string {
//   const nonce = makeId();
//   const itemsJson = JSON.stringify(items || []);

//   return `<!DOCTYPE html>
// <html lang="en">
// <head>
// <meta charset="utf-8" />
// <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}';">
// <meta name="viewport" content="width=device-width, initial-scale=1.0" />
// <title>Quiz: Questions & Answers</title>
// <style nonce="${nonce}">
//   :root { --muted:#666; --green:rgb(11, 163, 0); --yellow:rgb(255, 230, 2); --red:rgb(255, 0, 0); }
//   body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; padding: 12px; }
//   .controls { display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin-bottom:12px; }
//   input[type="text"], select { padding:6px 8px; font-size:13px; }
//   button { padding:6px 8px; border-radius:6px; cursor:pointer; }
//   .small-btn { padding:4px 6px; font-size:0.9em; margin-left:6px; }
//   table { width:100%; border-collapse:collapse; margin-top:8px; border: 1px solid black;}
//   th, td { padding:8px; border:1px solid #ddd; vertical-align:top; text-align:left; color:black; background: white; border: 1px solid black;}
//   th { background:#f5f5f5; }
//   pre { margin:0; white-space:pre-wrap; word-break:break-word; background:#f8f8f8; padding:8px; border-radius:4px; max-height:160px; overflow:auto; }
//   .muted { color: var(--muted); font-size:0.9em; }
//   .pagination { display:flex; justify-content:center; align-items:center; gap:8px; margin-top:12px; }
//   #studentSummary { margin-top:16px; border:1px solid #ddd; padding:10px; border-radius:6px; display:none; }
//   #studentSummary table { width:100%; border-collapse:collapse; }
//   #studentTable th, #studentTable td { padding:6px 10px; border:1px solid #eee; }
//   .student-row { cursor:pointer; }
//   .student-selected { outline: 2px solid #0066cc;}
//   .num-green { background: var(--green); font-weight:bold; text-align:center; }
//   .num-yellow { background: var(--yellow); font-weight:bold; text-align:center; }
//   .num-cell { width:6%; }
//   a.path { color:#0066cc; text-decoration:none; display:inline-block; margin-bottom:6px; }
//   .controls-right { margin-left:auto; display:flex; gap:8px; align-items:center; }
//   .small-note { color:var(--muted); font-size:0.9em; margin-left:8px; }
// </style>
// </head>
// <body>
//   <div class="controls">
//     <input type="text" id="filterText" placeholder="Search question, answer or path…" style="min-width:240px;">
//     <select id="statusFilter">
//       <option value="all">All</option>
//       <option value="answered">Answered</option>
//       <option value="unanswered">Unanswered</option>
//     </select>

//     <label style="display:flex; align-items:center; gap:6px;">
//       Page size
//       <select id="pageSize">
//         <option>5</option>
//         <option selected>10</option>
//         <option>15</option>
//         <option>20</option>
//       </select>
//     </label>

//     <div class="controls-right">
//       <button id="refresh">Refresh</button>
//       <button id="toggleStudents">Toggle Student Summary</button>
//       <div class="small-note">Click student row to filter table</div>
//     </div>
//   </div>

//   <div id="studentSummary">
//     <h3>Student Summary</h3>
//     <table id="studentTable">
//       <thead><tr><th>Student</th><th style="width:120px"># Questions</th></tr></thead>
//       <tbody></tbody>
//     </table>
//   </div>

//   <table>
//     <thead>
//       <tr>
//         <th class="num-cell">#</th>
//         <th style="width:28%;">Question</th>
//         <th style="width:30%;">Code (highlight)</th>
//         <th style="width:24%;">Answer</th>
//         <th style="width:18%;">Path & actions</th>
//       </tr>
//     </thead>
//     <tbody id="rows"></tbody>
//   </table>

//   <div class="pagination">
//     <button id="prevPage">Prev</button>
//     <span id="pageInfo"></span>
//     <button id="nextPage">Next</button>
//   </div>

// <script nonce="${nonce}">
//   (function() {
//     const vscode = acquireVsCodeApi();
//     const allItems = ${itemsJson}; // QAItem[] from extension

//     // client state
//     let filterText = '';
//     let statusFilter = 'all';
//     let pageSize = 10;
//     let currentPage = 1;
//     let studentFolders = []; // injected by extension via postMessage
//     let selectedStudent = null; // when user clicks a student in summary

//     // helpers
//     function esc(s) { return (s||'').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
//     function extractStudent(filePath) {
//       const parts = filePath.split(/[\\\\/]/);
//       return parts.length ? parts[0] : '';
//     }

//     // --- numbering computation (global, independent of filters/paging) ---
//     // group questions by student (student = first path segment)
//     const groups = {};
//     for (const it of allItems) {
//       const s = extractStudent(it.filePath);
//       if (!groups[s]) groups[s] = [];
//       groups[s].push(it);
//     }
//     // determine ordered student list (alphabetical)
//     const studentNames = Object.keys(groups).sort();
//     // create mapping id -> number string & id -> numClass
//     const idToNumber = {};
//     const idToNumClass = {};
//     const letterBase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
//     const counts = {};
//     let maxCount = 0;
//     studentNames.forEach((s, si) => {
//       const list = groups[s];
//       counts[s] = list.length;
//       if (list.length > maxCount) maxCount = list.length;
//     });
//     studentNames.forEach((s, si) => {
//       const list = groups[s];
//       list.forEach((q, qi) => {
//         const letter = letterBase[qi] || ('(' + (qi+1) + ')');
//         const num = (si + 1) + '' + letter;
//         idToNumber[q.id] = num;
//         idToNumClass[q.id] = (counts[s] === maxCount && maxCount > 0) ? 'num-green' : 'num-yellow';
//       });
//     });

//     // --- filtering & pagination ---
//     function applyFilters() {
//       const text = (filterText || '').toLowerCase();
//       return allItems.filter(it => {
//         if (selectedStudent && extractStudent(it.filePath) !== selectedStudent) return false;
//         const matchText = !text || it.question.toLowerCase().includes(text) ||
//           (it.answer || '').toLowerCase().includes(text) ||
//           it.filePath.toLowerCase().includes(text);
//         const matchStatus = statusFilter === 'all' ||
//           (statusFilter === 'answered' && it.answer) ||
//           (statusFilter === 'unanswered' && !it.answer);
//         return matchText && matchStatus;
//       });
//     }

//     function renderTable() {
//       const filtered = applyFilters();
//       const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
//       if (currentPage > totalPages) currentPage = totalPages;
//       const start = (currentPage - 1) * pageSize;
//       const pageItems = filtered.slice(start, start + pageSize);

//       const tbody = document.getElementById('rows');
//       tbody.innerHTML = '';
//       if (!pageItems.length) {
//         tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">No matching questions</td></tr>';
//       } else {
//         for (const it of pageItems) {
//           const tr = document.createElement('tr');

//           // Number column
//           const numTd = document.createElement('td');
//           numTd.className = idToNumClass[it.id] || 'num-yellow';
//           numTd.textContent = idToNumber[it.id] || '';
//           numTd.style.textAlign = 'center';
//           tr.appendChild(numTd);

//           // Question
//           const qTd = document.createElement('td');
//           qTd.innerHTML = '<strong>' + esc(it.question) + '</strong><div class="muted">' + new Date(it.askedAt).toLocaleString() + '</div>';
//           tr.appendChild(qTd);

//           // Code snippet
//           const cTd = document.createElement('td');
//           const pre = document.createElement('pre');
//           pre.textContent = it.snippet;
//           cTd.appendChild(pre);
//           tr.appendChild(cTd);

//           // Answer
//           const aTd = document.createElement('td');
//           aTd.innerHTML = it.answer ? esc(it.answer) + '<div class="muted">' + (it.answeredAt ? new Date(it.answeredAt).toLocaleString() : '') + '</div>' : '<em>(not answered)</em>';
//           tr.appendChild(aTd);

//           // Path & actions
//           const pTd = document.createElement('td');
//           const pathLink = document.createElement('a');
//           pathLink.href = '#';
//           pathLink.className = 'path';
//           pathLink.textContent = it.filePath;
//           pathLink.addEventListener('click', (e) => { e.preventDefault(); vscode.postMessage({ command: 'open', id: it.id }); });
//           pTd.appendChild(pathLink);
//           pTd.appendChild(document.createElement('br'));

//           const editQ = document.createElement('button');
//           editQ.className = 'small-btn';
//           editQ.textContent = 'Edit Q';
//           editQ.addEventListener('click', () => vscode.postMessage({ command: 'runCommand', name: 'extension.editQuestion', id: it.id }));
//           pTd.appendChild(editQ);

//           const answerBtn = document.createElement('button');
//           answerBtn.className = 'small-btn';
//           answerBtn.textContent = it.answer ? 'Edit A' : 'Answer';
//           answerBtn.addEventListener('click', () => {
//             const cmd = it.answer ? 'extension.editAnswer' : 'extension.answerQuestion';
//             vscode.postMessage({ command: 'runCommand', name: cmd, id: it.id });
//           });
//           pTd.appendChild(answerBtn);

//           const delBtn = document.createElement('button');
//           delBtn.className = 'small-btn';
//           delBtn.textContent = 'Delete';
//           delBtn.addEventListener('click', () => vscode.postMessage({ command: 'delete', id: it.id }));
//           pTd.appendChild(delBtn);

//           const copyBtn = document.createElement('button');
//           copyBtn.className = 'small-btn';
//           copyBtn.textContent = 'Copy';
//           copyBtn.addEventListener('click', () => {
//             // try navigator clipboard; fallback to message if not available
//             if (navigator.clipboard && navigator.clipboard.writeText) {
//               navigator.clipboard.writeText(it.question).then(() => {
//                 // quick feedback
//                 vscode.postMessage({ command: 'notify', text: 'Question copied to clipboard' });
//               }).catch(() => {
//                 vscode.postMessage({ command: 'notify', text: 'Failed to copy to clipboard' });
//               });
//             } else {
//               // last resort - ask extension to copy
//               vscode.postMessage({ command: 'copyToClipboard', text: it.question });
//             }
//           });
//           pTd.appendChild(copyBtn);

//           tr.appendChild(pTd);
//           tbody.appendChild(tr);
//         }
//       }

//       document.getElementById('pageInfo').textContent = 'Page ' + currentPage + ' / ' + totalPages;
//     }

//     // --- student summary rendering ---
//     function renderStudents() {
//       // build counts of questions per student
//       const counts = {};
//       for (const it of allItems) {
//         const s = extractStudent(it.filePath);
//         counts[s] = (counts[s] || 0) + 1;
//       }
//       // include workspace folders as student names (zero counts)
//       (studentFolders || []).forEach(s => { if (!(s in counts)) counts[s] = 0; });

//       // prepare ordered list: studentFolders first (if present), then remaining sorted
//       const seen = new Set();
//       const ordered = [];
//       (studentFolders || []).forEach(s => { if (!seen.has(s)) { ordered.push(s); seen.add(s); } });
//       Object.keys(counts).sort().forEach(s => { if (!seen.has(s)) { ordered.push(s); seen.add(s); } });

//       const max = Math.max(0, ...Object.values(counts));
//       const tbody = document.querySelector('#studentTable tbody');
//       tbody.innerHTML = '';
//       ordered.forEach(s => {
//         const tr = document.createElement('tr');
//         tr.className = 'student-row';
//         tr.title = 'Click to filter table for ' + s;
//         const tdName = document.createElement('td');
//         tdName.textContent = s || '(root)';
//         const tdCount = document.createElement('td');
//         tdCount.textContent = (counts[s] || 0).toString();

//         // styling
//         if ((counts[s] || 0) === max && max > 0) tr.classList.add('green');
//         else if ((counts[s] || 0) === 0) tr.classList.add('red');
//         else tr.classList.add('yellow');

//         tr.addEventListener('click', () => {
//           // toggle selection
//           if (selectedStudent === s) {
//             selectedStudent = null;
//           } else {
//             selectedStudent = s;
//           }
//           // highlight the selected row visually
//           Array.from(tbody.querySelectorAll('tr')).forEach(r => r.classList.remove('student-selected'));
//           if (selectedStudent) {
//             const rows = Array.from(tbody.querySelectorAll('tr'));
//             const match = rows.find(r => r.firstChild && r.firstChild.textContent === selectedStudent);
//             if (match) match.classList.add('student-selected');
//           }
//           currentPage = 1;
//           renderTable();
//         });

//         tr.appendChild(tdName);
//         tr.appendChild(tdCount);
//         tbody.appendChild(tr);
//       });
//     }

//     // --- event bindings ---
//     document.getElementById('filterText').addEventListener('input', function(e) { filterText = e.target.value; currentPage = 1; renderTable(); });
//     document.getElementById('statusFilter').addEventListener('change', function(e) { statusFilter = e.target.value; currentPage = 1; renderTable(); });
//     document.getElementById('pageSize').addEventListener('change', function(e) { pageSize = parseInt(e.target.value, 10); currentPage = 1; renderTable(); });
//     document.getElementById('prevPage').addEventListener('click', function(){ if (currentPage > 1) { currentPage--; renderTable(); }});
//     document.getElementById('nextPage').addEventListener('click', function(){ const maxP = Math.max(1, Math.ceil(applyFilters().length / pageSize)); if (currentPage < maxP) { currentPage++; renderTable(); }});
//     document.getElementById('refresh').addEventListener('click', function(){ vscode.postMessage({ command: 'refresh' }); });
//     document.getElementById('toggleStudents').addEventListener('click', function(){ const el = document.getElementById('studentSummary'); el.style.display = (el.style.display === 'block') ? 'none' : 'block'; if (el.style.display === 'block') renderStudents(); });

//     // receive workspace folder names from extension
//     window.addEventListener('message', (event) => {
//       if (event.data && event.data.studentFolders) {
//         studentFolders = event.data.studentFolders || [];
//         // if summary visible, update it
//         const el = document.getElementById('studentSummary');
//         if (el && el.style.display === 'block') renderStudents();
//       }
//       // allow extension to update items too (if it ever posts newer items)
//       if (event.data && event.data.items) {
//         // not used now - extension currently recreates webview on refresh
//       }
//     });

//     // initial render
//     renderTable();
//   }());
// </script>
// </body>
// </html>`;
// }



function getWebviewHtml(items: QAItem[], panel: vscode.WebviewPanel): string {
  const nonce = makeId();
  const itemsJson = JSON.stringify(items || []);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}';">
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Quiz: Questions & Answers</title>
<style nonce="${nonce}">
  :root { --muted:#666; --green:rgb(11, 163, 0); --yellow:rgb(255, 230, 2); --red:rgb(255, 0, 0); }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; padding: 12px; }
  .controls { display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin-bottom:12px; }
  input[type="text"], select { padding:6px 8px; font-size:13px; }
  button { padding:6px 8px; border-radius:6px; cursor:pointer; }
  .small-btn { padding:4px 6px; font-size:0.9em; margin-left:6px; }
  table { width:100%; border-collapse:collapse; margin-top:8px; border: 1px solid black;}
  th, td { padding:8px; border:1px solid #ddd; vertical-align:top; text-align:left; color:black; background: white; border: 1px solid black;}
  th { background:#f5f5f5; }
  pre { margin:0; white-space:pre-wrap; word-break:break-word; background:#f8f8f8; padding:8px; border-radius:4px; max-height:160px; overflow:auto; }
  .muted { color: var(--muted); font-size:0.9em; }
  .pagination { display:flex; justify-content:center; align-items:center; gap:8px; margin-top:12px; }
  #studentSummary { margin-top:16px; border:1px solid #ddd; padding:10px; border-radius:6px; display:none; }
  #studentSummary table { width:100%; border-collapse:collapse; }
  #studentTable th, #studentTable td { padding:6px 10px; border:1px solid #eee; }
  .student-row { cursor:pointer; }
  .student-selected { outline: 2px solid #0066cc;}
  .num-green { background: var(--green); font-weight:bold; text-align:center; }
  .num-yellow { background: var(--yellow); font-weight:bold; text-align:center; }
  .num-cell { width:6%; }
  a.path { color:#0066cc; text-decoration:none; display:inline-block; margin-bottom:6px; }
  .controls-right { margin-left:auto; display:flex; gap:8px; align-items:center; }
  .small-note { color:var(--muted); font-size:0.9em; margin-left:8px; }
  .exclude-checkbox { margin: 4px 0; }
  .exclude-label { font-size: 0.85em; color: #666; display: flex; align-items: center; gap: 4px; margin-top: 4px; }
</style>
</head>
<body>
  <div class="controls">
    <input type="text" id="filterText" placeholder="Search question, answer or path…" style="min-width:240px;">
    <select id="statusFilter">
      <option value="all">All</option>
      <option value="answered">Answered</option>
      <option value="unanswered">Unanswered</option>
    </select>

    <label style="display:flex; align-items:center; gap:6px;">
      Page size
      <select id="pageSize">
        <option>5</option>
        <option selected>10</option>
        <option>15</option>
        <option>20</option>
      </select>
    </label>

    <div class="controls-right">
      <button id="refresh">Refresh</button>
      <button id="toggleStudents">Toggle Student Summary</button>
      <div class="small-note">Click student row to filter table</div>
    </div>
  </div>

  <div id="studentSummary">
    <h3>Student Summary</h3>
    <table id="studentTable">
      <thead><tr><th>Student</th><th style="width:120px"># Questions</th></tr></thead>
      <tbody></tbody>
    </table>
  </div>

  <table>
    <thead>
      <tr>
        <th class="num-cell">#</th>
        <th style="width:28%;">Question</th>
        <th style="width:30%;">Code (highlight)</th>
        <th style="width:24%;">Answer</th>
        <th style="width:18%;">Path & actions</th>
      </tr>
    </thead>
    <tbody id="rows"></tbody>
  </table>

  <div class="pagination">
    <button id="prevPage">Prev</button>
    <span id="pageInfo"></span>
    <button id="nextPage">Next</button>
  </div>

<script nonce="${nonce}">
  (function() {
    const vscode = acquireVsCodeApi();
    const allItems = ${itemsJson}; // QAItem[] from extension

    // client state
    let filterText = '';
    let statusFilter = 'all';
    let pageSize = 10;
    let currentPage = 1;
    let studentFolders = []; // injected by extension via postMessage
    let selectedStudent = null; // when user clicks a student in summary

    // helpers
    function esc(s) { return (s||'').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
    function extractStudent(filePath) {
      const parts = filePath.split(/[\\\\/]/);
      return parts.length ? parts[0] : '';
    }

    // --- numbering computation (global, independent of filters/paging) ---
    // group questions by student (student = first path segment)
    const groups = {};
    for (const it of allItems) {
      const s = extractStudent(it.filePath);
      if (!groups[s]) groups[s] = [];
      groups[s].push(it);
    }
    // determine ordered student list (alphabetical)
    const studentNames = Object.keys(groups).sort();
    // create mapping id -> number string & id -> numClass
    const idToNumber = {};
    const idToNumClass = {};
    const letterBase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const counts = {};
    let maxCount = 0;
    studentNames.forEach((s, si) => {
      const list = groups[s];
      counts[s] = list.length;
      if (list.length > maxCount) maxCount = list.length;
    });
    studentNames.forEach((s, si) => {
      const list = groups[s];
      list.forEach((q, qi) => {
        const letter = letterBase[qi] || ('(' + (qi+1) + ')');
        const num = (si + 1) + '' + letter;
        idToNumber[q.id] = num;
        idToNumClass[q.id] = (counts[s] === maxCount && maxCount > 0) ? 'num-green' : 'num-yellow';
      });
    });

    // --- filtering & pagination ---
    function applyFilters() {
      const text = (filterText || '').toLowerCase();
      return allItems.filter(it => {
        if (selectedStudent && extractStudent(it.filePath) !== selectedStudent) return false;
        const matchText = !text || it.question.toLowerCase().includes(text) ||
          (it.answer || '').toLowerCase().includes(text) ||
          it.filePath.toLowerCase().includes(text);
        const matchStatus = statusFilter === 'all' ||
          (statusFilter === 'answered' && it.answer) ||
          (statusFilter === 'unanswered' && !it.answer);
        return matchText && matchStatus;
      });
    }

    function renderTable() {
      const filtered = applyFilters();
      const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
      if (currentPage > totalPages) currentPage = totalPages;
      const start = (currentPage - 1) * pageSize;
      const pageItems = filtered.slice(start, start + pageSize);

      const tbody = document.getElementById('rows');
      tbody.innerHTML = '';
      if (!pageItems.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">No matching questions</td></tr>';
      } else {
        for (const it of pageItems) {
          const tr = document.createElement('tr');

          // Number column
          const numTd = document.createElement('td');
          numTd.className = idToNumClass[it.id] || 'num-yellow';
          numTd.textContent = idToNumber[it.id] || '';
          numTd.style.textAlign = 'center';
          tr.appendChild(numTd);

          // Question
          const qTd = document.createElement('td');
          qTd.innerHTML = '<strong>' + esc(it.question) + '</strong><div class="muted">' + new Date(it.askedAt).toLocaleString() + '</div>';
          tr.appendChild(qTd);

          // Code snippet
          const cTd = document.createElement('td');
          const pre = document.createElement('pre');
          pre.textContent = it.snippet;
          cTd.appendChild(pre);
          tr.appendChild(cTd);

          // Answer
          const aTd = document.createElement('td');
          aTd.innerHTML = it.answer ? esc(it.answer) + '<div class="muted">' + (it.answeredAt ? new Date(it.answeredAt).toLocaleString() : '') + '</div>' : '<em>(not answered)</em>';
          tr.appendChild(aTd);

          // Path & actions
          const pTd = document.createElement('td');
          const pathLink = document.createElement('a');
          pathLink.href = '#';
          pathLink.className = 'path';
          pathLink.textContent = it.filePath;
          pathLink.addEventListener('click', (e) => { e.preventDefault(); vscode.postMessage({ command: 'open', id: it.id }); });
          pTd.appendChild(pathLink);
          pTd.appendChild(document.createElement('br'));

          // Exclude checkbox
          const excludeContainer = document.createElement('div');
          excludeContainer.className = 'exclude-label';
          const excludeCheckbox = document.createElement('input');
          excludeCheckbox.type = 'checkbox';
          excludeCheckbox.className = 'exclude-checkbox';
          excludeCheckbox.checked = !!it.exclude;
          excludeCheckbox.addEventListener('change', () => {
            vscode.postMessage({ 
              command: 'toggleExclude', 
              id: it.id, 
              exclude: excludeCheckbox.checked 
            });
          });
          const excludeLabel = document.createElement('span');
          excludeLabel.textContent = 'Exclude from generation';
          excludeContainer.appendChild(excludeCheckbox);
          excludeContainer.appendChild(excludeLabel);
          pTd.appendChild(excludeContainer);
          pTd.appendChild(document.createElement('br'));

          const editQ = document.createElement('button');
          editQ.className = 'small-btn';
          editQ.textContent = 'Edit Q';
          editQ.addEventListener('click', () => vscode.postMessage({ command: 'runCommand', name: 'extension.editQuestion', id: it.id }));
          pTd.appendChild(editQ);

          const answerBtn = document.createElement('button');
          answerBtn.className = 'small-btn';
          answerBtn.textContent = it.answer ? 'Edit A' : 'Answer';
          answerBtn.addEventListener('click', () => {
            const cmd = it.answer ? 'extension.editAnswer' : 'extension.answerQuestion';
            vscode.postMessage({ command: 'runCommand', name: cmd, id: it.id });
          });
          pTd.appendChild(answerBtn);

          const delBtn = document.createElement('button');
          delBtn.className = 'small-btn';
          delBtn.textContent = 'Delete';
          delBtn.addEventListener('click', () => vscode.postMessage({ command: 'delete', id: it.id }));
          pTd.appendChild(delBtn);

          const copyBtn = document.createElement('button');
          copyBtn.className = 'small-btn';
          copyBtn.textContent = 'Copy';
          copyBtn.addEventListener('click', () => {
            // try navigator clipboard; fallback to message if not available
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(it.question).then(() => {
                // quick feedback
                vscode.postMessage({ command: 'notify', text: 'Question copied to clipboard' });
              }).catch(() => {
                vscode.postMessage({ command: 'notify', text: 'Failed to copy to clipboard' });
              });
            } else {
              // last resort - ask extension to copy
              vscode.postMessage({ command: 'copyToClipboard', text: it.question });
            }
          });
          pTd.appendChild(copyBtn);

          tr.appendChild(pTd);
          tbody.appendChild(tr);
        }
      }

      document.getElementById('pageInfo').textContent = 'Page ' + currentPage + ' / ' + totalPages;
    }

    // --- student summary rendering ---
    function renderStudents() {
      // build counts of questions per student
      const counts = {};
      for (const it of allItems) {
        const s = extractStudent(it.filePath);
        counts[s] = (counts[s] || 0) + 1;
      }
      // include workspace folders as student names (zero counts)
      (studentFolders || []).forEach(s => { if (!(s in counts)) counts[s] = 0; });

      // prepare ordered list: studentFolders first (if present), then remaining sorted
      const seen = new Set();
      const ordered = [];
      (studentFolders || []).forEach(s => { if (!seen.has(s)) { ordered.push(s); seen.add(s); } });
      Object.keys(counts).sort().forEach(s => { if (!seen.has(s)) { ordered.push(s); seen.add(s); } });

      const max = Math.max(0, ...Object.values(counts));
      const tbody = document.querySelector('#studentTable tbody');
      tbody.innerHTML = '';
      ordered.forEach(s => {
        const tr = document.createElement('tr');
        tr.className = 'student-row';
        tr.title = 'Click to filter table for ' + s;
        const tdName = document.createElement('td');
        tdName.textContent = s || '(root)';
        const tdCount = document.createElement('td');
        tdCount.textContent = (counts[s] || 0).toString();

        // styling
        if ((counts[s] || 0) === max && max > 0) tr.classList.add('green');
        else if ((counts[s] || 0) === 0) tr.classList.add('red');
        else tr.classList.add('yellow');

        tr.addEventListener('click', () => {
          // toggle selection
          if (selectedStudent === s) {
            selectedStudent = null;
          } else {
            selectedStudent = s;
          }
          // highlight the selected row visually
          Array.from(tbody.querySelectorAll('tr')).forEach(r => r.classList.remove('student-selected'));
          if (selectedStudent) {
            const rows = Array.from(tbody.querySelectorAll('tr'));
            const match = rows.find(r => r.firstChild && r.firstChild.textContent === selectedStudent);
            if (match) match.classList.add('student-selected');
          }
          currentPage = 1;
          renderTable();
        });

        tr.appendChild(tdName);
        tr.appendChild(tdCount);
        tbody.appendChild(tr);
      });
    }

    // --- event bindings ---
    document.getElementById('filterText').addEventListener('input', function(e) { filterText = e.target.value; currentPage = 1; renderTable(); });
    document.getElementById('statusFilter').addEventListener('change', function(e) { statusFilter = e.target.value; currentPage = 1; renderTable(); });
    document.getElementById('pageSize').addEventListener('change', function(e) { pageSize = parseInt(e.target.value, 10); currentPage = 1; renderTable(); });
    document.getElementById('prevPage').addEventListener('click', function(){ if (currentPage > 1) { currentPage--; renderTable(); }});
    document.getElementById('nextPage').addEventListener('click', function(){ const maxP = Math.max(1, Math.ceil(applyFilters().length / pageSize)); if (currentPage < maxP) { currentPage++; renderTable(); }});
    document.getElementById('refresh').addEventListener('click', function(){ vscode.postMessage({ command: 'refresh' }); });
    document.getElementById('toggleStudents').addEventListener('click', function(){ const el = document.getElementById('studentSummary'); el.style.display = (el.style.display === 'block') ? 'none' : 'block'; if (el.style.display === 'block') renderStudents(); });

    // receive workspace folder names from extension
    window.addEventListener('message', (event) => {
      if (event.data && event.data.studentFolders) {
        studentFolders = event.data.studentFolders || [];
        // if summary visible, update it
        const el = document.getElementById('studentSummary');
        if (el && el.style.display === 'block') renderStudents();
      }
      // allow extension to update items too (if it ever posts newer items)
      if (event.data && event.data.items) {
        // not used now - extension currently recreates webview on refresh
      }
    });

    // initial render
    renderTable();
  }());
</script>
</body>
</html>`;
}







export function getExtensionContext(): vscode.ExtensionContext | undefined {
    return extensionContext;
}

// Make sure to store the context
let extensionContext: vscode.ExtensionContext;





/**
 * Commands
 */
export function activate(context: vscode.ExtensionContext) {
  console.log("Quiz Annotator extension activated");

  extensionContext = context;

  // ensure decoration type
  decorationType = createDecorationType();
  context.subscriptions.push(decorationType);

  // Apply decorations when active editor changes or documents open
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(async () => {
      await refreshAllDecorations();
    })
  );
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(async () => {
      await refreshAllDecorations();
    })
  );
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(async () => {
      await refreshAllDecorations();
    })
  );


  context.subscriptions.push(
  vscode.commands.registerCommand("extension.addQuestion", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage("Open a file and select a portion of code first.");
      return;
    }

    const sel = editor.selection;
    if (sel.isEmpty) {
      vscode.window.showErrorMessage("Please select the code you want to ask about.");
      return;
    }

    const snippet = editor.document.getText(sel);
    const relPath = vscode.workspace.asRelativePath(editor.document.uri);

    const panel = vscode.window.createWebviewPanel(
      "quizAddQuestion",
      "Add Quiz Question",
      vscode.ViewColumn.Beside,
      { enableScripts: true }
    );

    const nonce = makeId();

    // Build HTML with plain JS (no TS type assertions)
    panel.webview.html = `<!DOCTYPE html>
      <html lang="en">
      <head>
      <meta charset="utf-8">
      <meta http-equiv="Content-Security-Policy"
            content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Add Question</title>
      <style nonce="${nonce}">
        body { font-family: sans-serif; padding: 16px; }
        pre  { background:#f8f8f8; padding:8px; border-radius:4px; max-height:200px; overflow:auto; }
        textarea { width:100%; min-height:120px; margin-top:8px; padding:8px; font-family:inherit; font-size:14px; }
        .buttons { margin-top:12px; display:flex; gap:8px; }
        button { padding:6px 12px; border-radius:6px; cursor:pointer; border:none; }
        .save { background:#4caf50; color:white; }
        .cancel { background:#ccc; }
      </style>
      </head>
      <body>
        <h2>Add Question</h2>
        <p><strong>File:</strong> ${escapeHtml(relPath)}</p>
        <p><strong>Selected Code:</strong></p>
        <pre>${escapeHtml(snippet)}</pre>

        <label for="question">Your question:</label>
        <textarea id="question" placeholder="Type your question here"></textarea>

        <div class="buttons">
          <button class="save" id="save">Save</button>
          <button class="cancel" id="cancel">Cancel</button>
        </div>

      <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        document.getElementById('save').addEventListener('click', () => {
          const q = document.getElementById('question').value.trim();
          vscode.postMessage({ command: 'save', question: q });
        });
        document.getElementById('cancel').addEventListener('click', () => {
          vscode.postMessage({ command: 'cancel' });
        });
      </script>
      </body>
      </html>`;

    // Handle messages from the webview - THIS WAS COMMENTED OUT!
    panel.webview.onDidReceiveMessage(
      async (msg) => {
        if (msg.command === "cancel") {
          panel.dispose();
          return;
        }

        if (msg.command === "save") {
          const q = (msg.question || "").trim();
          if (!q) {
            vscode.window.showErrorMessage("Question cannot be empty.");
            return;
          }

          const item: QAItem = {
            id: makeId(),
            filePath: relPath,
            range: {
              start: { line: sel.start.line, character: sel.start.character },
              end: { line: sel.end.line, character: sel.end.character }
            },
            snippet,
            question: q,
            askedAt: Date.now()
          };

          const all = await loadAll();
          all.push(item);
          await saveAll(all);
          await refreshAllDecorations();
          vscode.window.showInformationMessage("Question saved.");
          panel.dispose();
        }
      },
      undefined,
      context.subscriptions
    );
  })
);


  context.subscriptions.push(
  vscode.commands.registerCommand("quiz.createConfigFile", async () => {
    if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
      vscode.window.showErrorMessage("Open a workspace folder first.");
      return;
    }

    const root = vscode.workspace.workspaceFolders[0].uri.fsPath;
    const target = path.join(root, "cqlc.config.json");

    // The default content
    const configContent = {
      title: " Brother",
      topic: "Variable",
      folder: "Brother",
      pl_root: "/Users/benedictoseisefa/Desktop/pl-gvsu-cis500dev-master",
      pl_question_root: "PersonalQuiz",
      pl_assessment_root: "courseInstances/TemplateCourseInstance/assessments",
      set: "Custom Quiz",
      number: "2",
      quiz_directory_name: "cis371_server",
      points_per_question: 10,
      startDate: "2025-03-22T10:30:00",
      endDate: "2025-03-22T16:30:40",
      timeLimitMin: 30,
      daysForGrading: 7,
      reviewEndDate: "2025-04-21T23:59:59",
      password: "letMeIn",
      language: "python",
      studentNameMapping: {
        benedictosefaosei: "oseisefb@mail.gvsu.edu",
        william_williams: "williamsw@mail.gvsu.edu",
        sam: "sam.test@mail.gvsu.edu",
        antonio: "anto.test@ug.edu.gh",
        caleb: "caleb.test@ug.edu.gh"
      }
    };

    try {
      // Create or overwrite
      await fs.promises.writeFile(target, JSON.stringify(configContent, null, 2), "utf8");
      vscode.window.showInformationMessage(`Created ${path.basename(target)} at workspace root.`);
      // Optionally open it in an editor
      const doc = await vscode.workspace.openTextDocument(target);
      vscode.window.showTextDocument(doc);
    } catch (err: any) {
      vscode.window.showErrorMessage(`Failed to create config file: ${err.message}`);
    }
    })
  );

  // Edit question command - accepts a QAItem or prompts if none
  context.subscriptions.push(
    vscode.commands.registerCommand("extension.editQuestion", async (itemArg?: QAItem) => {
      let item = itemArg;
      if (!item) {
        const all = await loadAll();
        if (all.length === 0) {
          vscode.window.showInformationMessage("No questions found.");
          return;
        }
        const pick = await vscode.window.showQuickPick(
          all.map((it) => ({ label: it.question, description: it.filePath, id: it.id })),
          { placeHolder: "Select a question to edit" }
        );
        if (!pick) return;
        item = all.find((i) => i.id === pick!.id)!;
      }

      // open webview to edit the question
      const panel = vscode.window.createWebviewPanel(
        "quizEditQuestion",
        "Edit Question",
        vscode.ViewColumn.Beside,
        { enableScripts: true }
      );

      const nonce = makeId();
      panel.webview.html = `<!DOCTYPE html>
        <html>
        <head>
        <meta charset="utf-8">
        <meta http-equiv="Content-Security-Policy"
              content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Edit Question</title>
        <style nonce="${nonce}">
          body { font-family:sans-serif; padding:16px; }
          textarea { width:100%; min-height:120px; margin-top:8px; padding:8px; font-family:inherit; font-size:14px; }
          .buttons { margin-top:12px; display:flex; gap:8px; }
          button { padding:6px 12px; border-radius:6px; cursor:pointer; border:none; }
          .save { background:#4caf50; color:white; }
          .cancel { background:#ccc; }
        </style>
        </head>
        <body>
          <h2>Edit Question</h2>
          <p><strong>File:</strong> ${escapeHtml(item.filePath)}</p>
          <label for="question">Question:</label>
          <textarea id="question">${escapeHtml(item.question)}</textarea>
          <div class="buttons">
            <button class="save" id="save">Save</button>
            <button class="cancel" id="cancel">Cancel</button>
          </div>
        <script nonce="${nonce}">
          const vscode = acquireVsCodeApi();
          document.getElementById('save').addEventListener('click', () => {
            const q = document.getElementById('question').value.trim();
            vscode.postMessage({ command: 'save', question: q });
          });
          document.getElementById('cancel').addEventListener('click', () => {
            vscode.postMessage({ command: 'cancel' });
          });
        </script>
        </body>
        </html>`;

      panel.webview.onDidReceiveMessage(
        async (msg) => {
          if (msg.command === "cancel") {
            panel.dispose();
            return;
          }
          if (msg.command === "save") {
            const q = (msg.question || "").trim();
            if (!q) { vscode.window.showErrorMessage("Question cannot be empty."); return; }
            const all = await loadAll();
            const idx = all.findIndex(x => x.id === item!.id);
            if (idx >= 0) {
              all[idx].question = q;
              await saveAll(all);
              await refreshAllDecorations();
              vscode.window.showInformationMessage("Question updated.");
            }
            panel.dispose();
          }
        },
        undefined,
        context.subscriptions
      );
    })
  );

  // Answer question (pick unanswered) - unchanged behavior when called directly
  context.subscriptions.push(
    vscode.commands.registerCommand("extension.answerQuestion", async (itemArg?: QAItem) => {
      let item = itemArg;
      const all = await loadAll();
      if (!item) {
        const unanswered = all.filter((i) => !i.answer);
        if (unanswered.length === 0) {
          vscode.window.showInformationMessage("No unanswered questions found.");
          return;
        }
        const pick = await vscode.window.showQuickPick(
          unanswered.map((it) => ({ label: it.question, description: it.filePath, id: it.id })),
          { placeHolder: "Pick a question to answer" }
        );
        if (!pick) return;
        item = all.find((i) => i.id === pick.id)!;
      }

      // Offer to open file at range first
      const openNow = "Open file & highlight";
      const skipOpen = "Answer now";
      const choice = await vscode.window.showInformationMessage("Open the file to review the snippet before answering?", openNow, skipOpen);
      if (choice === openNow) {
        await openFileAt(item!);
      }
      const ans = await vscode.window.showInputBox({ prompt: "Enter your answer" });
      if (ans === undefined) return;
      // update item
      const allItems = await loadAll();
      const idx = allItems.findIndex(x => x.id === item!.id);
      if (idx >= 0) {
        allItems[idx].answer = ans;
        allItems[idx].answeredAt = Date.now();
        await saveAll(allItems);
        vscode.window.showInformationMessage("Answer saved.");
        await refreshAllDecorations();
      }
    })
  );

  // Edit answer - open webview to edit a specific answer (or prompt if none provided)
  context.subscriptions.push(
    vscode.commands.registerCommand("extension.editAnswer", async (itemArg?: QAItem) => {
      let item = itemArg;
      if (!item) {
        const all = await loadAll();
        const answered = all.filter((i) => i.answer);
        if (answered.length === 0) {
          vscode.window.showInformationMessage("No answered questions found.");
          return;
        }
        const pick = await vscode.window.showQuickPick(
          answered.map((it) => ({ label: it.question, description: it.filePath, id: it.id })),
          { placeHolder: "Select answered question to edit" }
        );
        if (!pick) return;
        item = all.find((i) => i.id === pick.id)!;
      }

      // open webview to edit answer
      const panel = vscode.window.createWebviewPanel(
        "quizEditAnswer",
        "Edit Answer",
        vscode.ViewColumn.Beside,
        { enableScripts: true }
      );

      const nonce = makeId();
      panel.webview.html = `<!DOCTYPE html>
        <html>
        <head>
        <meta charset="utf-8">
        <meta http-equiv="Content-Security-Policy"
              content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Edit Answer</title>
        <style nonce="${nonce}">
          body { font-family:sans-serif; padding:16px; }
          textarea { width:100%; min-height:120px; margin-top:8px; padding:8px; font-family:inherit; font-size:14px; }
          .buttons { margin-top:12px; display:flex; gap:8px; }
          button { padding:6px 12px; border-radius:6px; cursor:pointer; border:none; }
          .save { background:#4caf50; color:white; }
          .cancel { background:#ccc; }
        </style>
        </head>
        <body>
          <h2>Edit Answer</h2>
          <p><strong>File:</strong> ${escapeHtml(item.filePath)}</p>
          <label for="answer">Answer:</label>
          <textarea id="answer">${escapeHtml(item.answer || "")}</textarea>
          <div class="buttons">
            <button class="save" id="save">Save</button>
            <button class="cancel" id="cancel">Cancel</button>
          </div>
        <script nonce="${nonce}">
          const vscode = acquireVsCodeApi();
          document.getElementById('save').addEventListener('click', () => {
            const a = document.getElementById('answer').value.trim();
            vscode.postMessage({ command: 'save', answer: a });
          });
          document.getElementById('cancel').addEventListener('click', () => {
            vscode.postMessage({ command: 'cancel' });
          });
        </script>
        </body>
        </html>`;

      panel.webview.onDidReceiveMessage(
        async (msg) => {
          if (msg.command === "cancel") {
            panel.dispose();
            return;
          }
          if (msg.command === "save") {
            const a = (msg.answer || "").trim();
            if (!a) { vscode.window.showErrorMessage("Answer cannot be empty."); return; }
            const all = await loadAll();
            const idx = all.findIndex(x => x.id === item!.id);
            if (idx >= 0) {
              all[idx].answer = a;
              all[idx].answeredAt = Date.now();
              await saveAll(all);
              await refreshAllDecorations();
              vscode.window.showInformationMessage("Answer updated.");
            }
            panel.dispose();
          }
        },
        undefined,
        context.subscriptions
      );
    })
  );



  // View Q&A in webview (table)
  context.subscriptions.push(
    vscode.commands.registerCommand("extension.viewQA", async () => {
      const panel = vscode.window.createWebviewPanel("quizView", "Quiz: Questions & Answers", vscode.ViewColumn.One, {
        enableScripts: true
      });
      const all = await loadAll();
      panel.webview.html = getWebviewHtml(all, panel);

      // Send all top-level folder names to the webview for student summary
      const folders = (vscode.workspace.workspaceFolders || []).map(f => path.basename(f.uri.fsPath));
      panel.webview.postMessage({ studentFolders: folders });


      // panel.webview.onDidReceiveMessage(
      //   async (msg) => {
      //     // handle messages from webview
      //     if (!msg || !msg.command) return;
      //     const cmd = msg.command as string;
      //     const id = msg.id as string | undefined;

      //     // reload fresh items when needed
      //     let items = await loadAll();

      //     if (cmd === "open" && id) {
      //       const it = items.find((x) => x.id === id);
      //       if (it) await openFileAt(it);
      //       return;
      //     }

      //     // Delete with VS Code confirmation
      //     if (cmd === "delete" && id) {
      //       const choice = await vscode.window.showWarningMessage(
      //         "Are you sure you want to delete this question?",
      //         { modal: true },
      //         "Yes",
      //         "No"
      //       );
      //       if (choice !== "Yes") {
      //         return; // user cancelled
      //       }
      //       items = items.filter((x) => x.id !== id);
      //       await saveAll(items);
      //       panel.webview.html = getWebviewHtml(await loadAll(), panel);
      //       await refreshAllDecorations();
      //       return;
      //     }

      //     // Run a named command and pass the found QAItem to it
      //     if (cmd === 'runCommand' && msg.name) {
      //       const allItems = await loadAll();
      //       const target = allItems.find(x => x.id === msg.id);
      //       if (target) {
      //         // this will call our registered commands and pass the QAItem object
      //         await vscode.commands.executeCommand(msg.name, target);
      //       }
      //       return;
      //     }

      //     if (cmd === "refresh") {
      //       panel.webview.html = getWebviewHtml(await loadAll(), panel);
      //       await refreshAllDecorations();
      //       return;
      //     }
      //   },
      //   undefined,
      //   context.subscriptions
      // );

      panel.webview.onDidReceiveMessage(
  async (msg) => {
    // handle messages from webview
    if (!msg || !msg.command) return;
    const cmd = msg.command as string;
    const id = msg.id as string | undefined;

    // reload fresh items when needed
    let items = await loadAll();

    if (cmd === "open" && id) {
      const it = items.find((x) => x.id === id);
      if (it) await openFileAt(it);
      return;
    }

    // Toggle exclude flag
    if (cmd === "toggleExclude" && id) {
      const allItems = await loadAll();
      const idx = allItems.findIndex(x => x.id === id);
      if (idx >= 0) {
        allItems[idx].exclude = msg.exclude;
        await saveAll(allItems);
        // Update the webview to reflect the change
        panel.webview.html = getWebviewHtml(await loadAll(), panel);
      }
      return;
    }

    // Delete with VS Code confirmation
    if (cmd === "delete" && id) {
      const choice = await vscode.window.showWarningMessage(
        "Are you sure you want to delete this question?",
        { modal: true },
        "Yes",
        "No"
      );
      if (choice !== "Yes") {
        return; // user cancelled
      }
      items = items.filter((x) => x.id !== id);
      await saveAll(items);
      panel.webview.html = getWebviewHtml(await loadAll(), panel);
      await refreshAllDecorations();
      return;
    }

    // Run a named command and pass the found QAItem to it
    if (cmd === 'runCommand' && msg.name) {
      const allItems = await loadAll();
      const target = allItems.find(x => x.id === msg.id);
      if (target) {
        // this will call our registered commands and pass the QAItem object
        await vscode.commands.executeCommand(msg.name, target);
      }
      return;
    }

    if (cmd === "refresh") {
      panel.webview.html = getWebviewHtml(await loadAll(), panel);
      await refreshAllDecorations();
      return;
    }
  },
  undefined,
  context.subscriptions
);

    })
  );
  

//   context.subscriptions.push(
//   vscode.commands.registerCommand("extension.generateQA", async () => {
//     const ws = vscode.workspace.workspaceFolders?.[0];
//     if (!ws) {
//       vscode.window.showErrorMessage("No workspace folder is open.");
//       return;
//     }
//     const rootPath = ws.uri.fsPath;
//     const quizFile = path.join(rootPath, ".vscode", "quiz-questions.json");
//     if (!fs.existsSync(quizFile)) {
//       vscode.window.showErrorMessage("No quiz-questions.json found in .vscode folder.");
//       return;
//     }

//     // load questions
//     let questionsData: any[];
//     try {
//       questionsData = JSON.parse(fs.readFileSync(quizFile, "utf8"));
//       if (!questionsData.length) {
//         vscode.window.showErrorMessage("quiz-questions.json exists but contains no questions.");
//         return;
//       }
//     } catch (err: any) {
//       vscode.window.showErrorMessage(`Error reading quiz-questions.json: ${err.message}`);
//       return;
//     }



//     // load config
//     const configPath = path.join(rootPath, "cqlc.config.json");
//     if (!fs.existsSync(configPath)) {
//       vscode.window.showErrorMessage("Config file cqlc.config.json not found in the workspace root.");
//       return;
//     }

//     let config: any;
//     try {
//       config = JSON.parse(fs.readFileSync(configPath, "utf8"));
//     } catch (err: any) {
//       vscode.window.showErrorMessage(`Error reading config file: ${err.message}`);
//       return;
//     }

//     const requiredFields = [
//       "title", "topic", "folder", "pl_root", "pl_question_root", "pl_assessment_root",
//       "set", "number", "points_per_question", "startDate", "endDate",
//       "timeLimitMin", "daysForGrading", "reviewEndDate", "language"
//     ];
//     for (const field of requiredFields) {
//       if (!config[field]) {
//         vscode.window.showErrorMessage(`Missing required field in config: ${field}`);
//         return;
//       }
//     }

//     // build base output paths
//     const questionsRoot = path.join(config.pl_root, "questions", config.pl_question_root, config.folder);
//     const assessmentsRoot = path.join(config.pl_root, config.pl_assessment_root, config.folder);
//     const instructorRoot = path.join(questionsRoot, "instructor");
//     const instructorAssessRoot = path.join(assessmentsRoot, "instructor");

//     [questionsRoot, assessmentsRoot, instructorRoot, instructorAssessRoot].forEach(p => {
//       if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
//     });

//     // group questions by student folder (first segment of filePath)
//     const questionsByStudent: Record<string, any[]> = {};
//     for (const q of questionsData) {
//       const studentName = (q.filePath || "").split(/[\\/]/)[0] || "unknown_student";
//       if (!questionsByStudent[studentName]) questionsByStudent[studentName] = [];
//       questionsByStudent[studentName].push(q);
//     }

//     // generate student-specific files
//     for (const [student, qs] of Object.entries(questionsByStudent)) {
//       const studentQPath = path.join(questionsRoot, student);
//       const studentAssessPath = path.join(assessmentsRoot, student);
//       if (!fs.existsSync(studentQPath)) fs.mkdirSync(studentQPath, { recursive: true });
//       if (!fs.existsSync(studentAssessPath)) fs.mkdirSync(studentAssessPath, { recursive: true });

//       // create subfolder for each question
//       qs.forEach((question, index) => {
//         const questionFolder = path.join(studentQPath, `question${index + 1}`);
//         if (!fs.existsSync(questionFolder)) fs.mkdirSync(questionFolder, { recursive: true });

//         // Create question.html file
//         const questionText = question.question || question.text || question.content || "No question content available.";
//         const codeSnippet = question.code || question.highlightedCode || question.snippet || "// No code highlighted";

//         const questionHtmlContent = `
// <pl-question-panel>
// <markdown>
// ${questionText}
// </markdown>
//     <pl-code language="${config.language || 'python'}">
// ${codeSnippet}
// </pl-code>
// </pl-question-panel>
// `.trim();

//         const questionHtmlFile = path.join(questionFolder, "question.html");
//         fs.writeFileSync(questionHtmlFile, questionHtmlContent, "utf8");

//         // Create info.json file
//         const questionInfo = {
//           uuid: generateUUID(),
//           type: "v3",
//           gradingMethod: "Manual",
//           title: config.title,
//           topic: config.topic
//         };

//         const infoJsonFile = path.join(questionFolder, "info.json");
//         fs.writeFileSync(infoJsonFile, JSON.stringify(questionInfo, null, 2), "utf8");
//       });

//       // Generate infoAssessment.json for this student
//       const infoAssessment = {
//         uuid: generateUUID(),
//         type: "Exam",
//         title: config.title,
//         set: config.set,
//         number: config.number,
//         allowAccess: [
//           {
//             mode: "Public",
//             uids: [student],
//             credit: 100,
//             timeLimitMin: config.timeLimitMin,
//             startDate: config.startDate,
//             endDate: config.endDate,
//             password: "letMeIn"
//           },
//           {
//             mode: "Public",
//             credit: 0,
//             startDate: config.reviewEndDate ? new Date(new Date(config.reviewEndDate).getTime() + 24 * 60 * 60 * 1000).toISOString() : new Date(new Date(config.endDate).getTime() + 24 * 60 * 60 * 1000).toISOString(),
//             endDate: new Date(new Date(config.endDate).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
//             active: false
//           }
//         ],
//         zones: [
//           {
//             questions: qs.map((_, index) => ({
//               id: `${config.pl_question_root}/${config.folder}/${student}/question${index + 1}`,
//               points: config.points_per_question
//             }))
//           }
//         ]
//       };

//       const assessmentFile = path.join(studentAssessPath, "infoAssessment.json");
//       fs.writeFileSync(assessmentFile, JSON.stringify(infoAssessment, null, 2), "utf8");
//     }

//     // Create combined instructor files
//     const combinedQuestionsFolder = path.join(instructorRoot, "combined-questions");
//     if (!fs.existsSync(combinedQuestionsFolder)) {
//       fs.mkdirSync(combinedQuestionsFolder, { recursive: true });
//     }

//     // Build combined question.html content
//     let combinedHtmlContent = `
// <pl-question-panel>
// <markdown>
// # ${config.title} - All Student Questions
// <hr><br>
// </markdown>
// </pl-question-panel>
// `.trim();

//     // Add all questions from all students
//     for (const [student, qs] of Object.entries(questionsByStudent)) {
//       combinedHtmlContent += `
// <pl-question-panel>
// <markdown>
// ## Student: ${student}
// </markdown>
// </pl-question-panel>
// `;

//       qs.forEach((question, index) => {
//         const questionText = question.question || question.text || question.content || "No question content available.";
//         const codeSnippet = question.code || question.highlightedCode || question.snippet || "// No code highlighted";

//         combinedHtmlContent += `
// <pl-question-panel>
// <markdown>
// ### Question ${index + 1}
// ${questionText}
// </markdown>
//     <pl-code language="${config.language || 'python'}">
// ${codeSnippet}
// </pl-code>
// </pl-question-panel>
// <br><hr><br>
// `;
//       });
//     }

//     // Write combined question.html
//     const combinedQuestionHtmlFile = path.join(combinedQuestionsFolder, "question.html");
//     fs.writeFileSync(combinedQuestionHtmlFile, combinedHtmlContent, "utf8");

//     // Create combined info.json
//     const combinedInfo = {
//       uuid: generateUUID(),
//       gradingMethod: "Manual",
//       type: "v3",
//       title: `${config.title} - All Questions`,
//       topic: config.topic
//     };

//     const combinedInfoJsonFile = path.join(combinedQuestionsFolder, "info.json");
//     fs.writeFileSync(combinedInfoJsonFile, JSON.stringify(combinedInfo, null, 2), "utf8");

//     // Create combined infoAssessment.json for instructor
//     const combinedAssessment = {
//       uuid: generateUUID(),
//       type: "Exam",
//       title: `${config.title} - Instructor View`,
//       set: config.set,
//       number: config.number,
//       allowAccess: [
//         {
//           mode: "Public",
//           uids: ["instructor"],
//           credit: 100,
//           timeLimitMin: 0,
//           startDate: config.startDate,
//           endDate: new Date(new Date(config.endDate).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year later
//           password: "instructorAccess"
//         }
//       ],
//       zones: [
//         {
//           questions: [
//             {
//               id: `${config.pl_question_root}/${config.folder}/instructor/combined-questions`,
//               points: 1
//             }
//           ]
//         }
//       ]
//     };

//     const combinedAssessmentFile = path.join(instructorAssessRoot, "infoAssessment.json");
//     fs.writeFileSync(combinedAssessmentFile, JSON.stringify(combinedAssessment, null, 2), "utf8");

//     vscode.window.showInformationMessage("Generated QA files with student questions, combined instructor view, and all assessment files.");
//   })
// );

  
  
//   context.subscriptions.push(
//   vscode.commands.registerCommand("extension.generateQA", async () => {
//     const ws = vscode.workspace.workspaceFolders?.[0];
//     if (!ws) {
//       vscode.window.showErrorMessage("No workspace folder is open.");
//       return;
//     }
//     const rootPath = ws.uri.fsPath;
//     const quizFile = path.join(rootPath, ".vscode", "quiz-questions.json");
//     if (!fs.existsSync(quizFile)) {
//       vscode.window.showErrorMessage("No quiz-questions.json found in .vscode folder.");
//       return;
//     }

//     // load questions
//     let questionsData: any[];
//     try {
//       questionsData = JSON.parse(fs.readFileSync(quizFile, "utf8"));
//       if (!questionsData.length) {
//         vscode.window.showErrorMessage("quiz-questions.json exists but contains no questions.");
//         return;
//       }
      
//       // Filter out excluded questions BEFORE any processing
//       const originalCount = questionsData.length;
//       questionsData = questionsData.filter(q => !q.exclude);
//       const excludedCount = originalCount - questionsData.length;
      
//       if (questionsData.length === 0) {
//         vscode.window.showErrorMessage("All questions are excluded. No questions to generate.");
//         return;
//       }
      
//       if (excludedCount > 0) {
//         vscode.window.showInformationMessage(`Excluded ${excludedCount} question(s) from generation.`);
//       }
//     } catch (err: any) {
//       vscode.window.showErrorMessage(`Error reading quiz-questions.json: ${err.message}`);
//       return;
//     }

//     // load config
//     const configPath = path.join(rootPath, "cqlc.config.json");
//     if (!fs.existsSync(configPath)) {
//       vscode.window.showErrorMessage("Config file cqlc.config.json not found in the workspace root.");
//       return;
//     }

//     let config: any;
//     try {
//       config = JSON.parse(fs.readFileSync(configPath, "utf8"));
//     } catch (err: any) {
//       vscode.window.showErrorMessage(`Error reading config file: ${err.message}`);
//       return;
//     }

//     const requiredFields = [
//       "title", "topic", "folder", "pl_root", "pl_question_root", "pl_assessment_root",
//       "set", "number", "points_per_question", "startDate", "endDate",
//       "timeLimitMin", "daysForGrading", "reviewEndDate", "language"
//     ];
//     for (const field of requiredFields) {
//       if (!config[field]) {
//         vscode.window.showErrorMessage(`Missing required field in config: ${field}`);
//         return;
//       }
//     }

//     // build base output paths
//     const questionsRoot = path.join(config.pl_root, "questions", config.pl_question_root, config.folder);
//     const assessmentsRoot = path.join(config.pl_root, config.pl_assessment_root, config.folder);
//     const instructorRoot = path.join(questionsRoot, "instructor");
//     const instructorAssessRoot = path.join(assessmentsRoot, "instructor");

//     [questionsRoot, assessmentsRoot, instructorRoot, instructorAssessRoot].forEach(p => {
//       if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
//     });

//     // group questions by student folder (first segment of filePath)
//     const questionsByStudent: Record<string, any[]> = {};
//     for (const q of questionsData) {
//       const studentName = (q.filePath || "").split(/[\\/]/)[0] || "unknown_student";
//       if (!questionsByStudent[studentName]) questionsByStudent[studentName] = [];
//       questionsByStudent[studentName].push(q);
//     }

//     // generate student-specific files - ONLY for non-excluded questions
//     for (const [student, qs] of Object.entries(questionsByStudent)) {
//       const studentQPath = path.join(questionsRoot, student);
//       const studentAssessPath = path.join(assessmentsRoot, student);
//       if (!fs.existsSync(studentQPath)) fs.mkdirSync(studentQPath, { recursive: true });
//       if (!fs.existsSync(studentAssessPath)) fs.mkdirSync(studentAssessPath, { recursive: true });

//       // Filter out excluded questions for this student (should already be filtered, but double-check)
//       const validQuestions = qs.filter(q => !q.exclude);
      
//       if (validQuestions.length === 0) {
//         vscode.window.showInformationMessage(`No valid questions for student ${student}, skipping generation.`);
//         continue;
//       }

//       // create subfolder for each valid question
//       validQuestions.forEach((question, index) => {
//         const questionFolder = path.join(studentQPath, `question${index + 1}`);
//         if (!fs.existsSync(questionFolder)) fs.mkdirSync(questionFolder, { recursive: true });

//         // Create question.html file
//         const questionText = question.question || question.text || question.content || "No question content available.";
//         const codeSnippet = question.code || question.highlightedCode || question.snippet || "// No code highlighted";

//         const questionHtmlContent = `
// <pl-question-panel>
// <markdown>
// ${questionText}
// </markdown>
//     <pl-code language="${config.language || 'python'}">
// ${codeSnippet}
// </pl-code>
// </pl-question-panel>
// `.trim();

//         const questionHtmlFile = path.join(questionFolder, "question.html");
//         fs.writeFileSync(questionHtmlFile, questionHtmlContent, "utf8");

//         // Create info.json file
//         const questionInfo = {
//           uuid: generateUUID(),
//           type: "v3",
//           gradingMethod: "Manual",
//           title: config.title,
//           topic: config.topic
//         };

//         const infoJsonFile = path.join(questionFolder, "info.json");
//         fs.writeFileSync(infoJsonFile, JSON.stringify(questionInfo, null, 2), "utf8");
//       });

//       // Generate infoAssessment.json for this student - ONLY include valid questions
//       const infoAssessment = {
//         uuid: generateUUID(),
//         type: "Exam",
//         title: config.title,
//         set: config.set,
//         number: config.number,
//         allowAccess: [
//           {
//             mode: "Public",
//             uids: [student],
//             credit: 100,
//             timeLimitMin: config.timeLimitMin,
//             startDate: config.startDate,
//             endDate: config.endDate,
//             password: "letMeIn"
//           },
//           {
//             mode: "Public",
//             credit: 0,
//             startDate: config.reviewEndDate ? new Date(new Date(config.reviewEndDate).getTime() + 24 * 60 * 60 * 1000).toISOString() : new Date(new Date(config.endDate).getTime() + 24 * 60 * 60 * 1000).toISOString(),
//             endDate: new Date(new Date(config.endDate).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
//             active: false
//           }
//         ],
//         zones: [
//           {
//             questions: validQuestions.map((_, index) => ({
//               id: `${config.pl_question_root}/${config.folder}/${student}/question${index + 1}`,
//               points: config.points_per_question
//             }))
//           }
//         ]
//       };

//       const assessmentFile = path.join(studentAssessPath, "infoAssessment.json");
//       fs.writeFileSync(assessmentFile, JSON.stringify(infoAssessment, null, 2), "utf8");
//     }

//     // Create combined instructor files - ONLY include valid questions
//     const combinedQuestionsFolder = path.join(instructorRoot, "combined-questions");
//     if (!fs.existsSync(combinedQuestionsFolder)) {
//       fs.mkdirSync(combinedQuestionsFolder, { recursive: true });
//     }

//     // Build combined question.html content - ONLY include valid questions
//     let combinedHtmlContent = `
// <pl-question-panel>
// <markdown>
// # ${config.title} - All Student Questions
// <hr><br>
// </markdown>
// </pl-question-panel>
// `.trim();

//     // Add all valid questions from all students
//     for (const [student, qs] of Object.entries(questionsByStudent)) {
//       const validQuestions = qs.filter(q => !q.exclude);
      
//       if (validQuestions.length === 0) {
//         continue; // Skip students with no valid questions
//       }

//       combinedHtmlContent += `
// <pl-question-panel>
// <markdown>
// ## Student: ${student}
// </markdown>
// </pl-question-panel>
// `;

//       validQuestions.forEach((question, index) => {
//         const questionText = question.question || question.text || question.content || "No question content available.";
//         const codeSnippet = question.code || question.highlightedCode || question.snippet || "// No code highlighted";

//         combinedHtmlContent += `
// <pl-question-panel>
// <markdown>
// ### Question ${index + 1}
// ${questionText}
// </markdown>
//     <pl-code language="${config.language || 'python'}">
// ${codeSnippet}
// </pl-code>
// </pl-question-panel>
// <br><hr><br>
// `;
//       });
//     }

//     // Write combined question.html
//     const combinedQuestionHtmlFile = path.join(combinedQuestionsFolder, "question.html");
//     fs.writeFileSync(combinedQuestionHtmlFile, combinedHtmlContent, "utf8");

//     // Create combined info.json
//     const combinedInfo = {
//       uuid: generateUUID(),
//       gradingMethod: "Manual",
//       type: "v3",
//       title: `${config.title} - All Questions`,
//       topic: config.topic
//     };

//     const combinedInfoJsonFile = path.join(combinedQuestionsFolder, "info.json");
//     fs.writeFileSync(combinedInfoJsonFile, JSON.stringify(combinedInfo, null, 2), "utf8");

//     // Create combined infoAssessment.json for instructor - ONLY include valid questions
//     const combinedAssessment = {
//       uuid: generateUUID(),
//       type: "Exam",
//       title: `${config.title} - Instructor View`,
//       set: config.set,
//       number: config.number,
//       allowAccess: [
//         {
//           mode: "Public",
//           uids: ["instructor"],
//           credit: 100,
//           timeLimitMin: 0,
//           startDate: config.startDate,
//           endDate: new Date(new Date(config.endDate).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year later
//           password: "instructorAccess"
//         }
//       ],
//       zones: [
//         {
//           questions: [
//             {
//               id: `${config.pl_question_root}/${config.folder}/instructor/combined-questions`,
//               points: 1
//             }
//           ]
//         }
//       ]
//     };

//     const combinedAssessmentFile = path.join(instructorAssessRoot, "infoAssessment.json");
//     fs.writeFileSync(combinedAssessmentFile, JSON.stringify(combinedAssessment, null, 2), "utf8");

//     vscode.window.showInformationMessage("Generated QA files with student questions, combined instructor view, and all assessment files.");
//   })
//   );
  























  context.subscriptions.push(
  vscode.commands.registerCommand("extension.generateQA", async () => {
    const ws = vscode.workspace.workspaceFolders?.[0];
    if (!ws) {
      vscode.window.showErrorMessage("No workspace folder is open.");
      return;
    }
    const rootPath = ws.uri.fsPath;
    const quizFile = path.join(rootPath, ".vscode", "quiz-questions.json");
    if (!fs.existsSync(quizFile)) {
      vscode.window.showErrorMessage("No quiz-questions.json found in .vscode folder.");
      return;
    }

    // load questions
    let questionsData: any[];
    try {
      questionsData = JSON.parse(fs.readFileSync(quizFile, "utf8"));
      if (!questionsData.length) {
        vscode.window.showErrorMessage("quiz-questions.json exists but contains no questions.");
        return;
      }
      
      // Filter out excluded questions BEFORE any processing
      const originalCount = questionsData.length;
      questionsData = questionsData.filter(q => !q.exclude);
      const excludedCount = originalCount - questionsData.length;
      
      if (questionsData.length === 0) {
        vscode.window.showErrorMessage("All questions are excluded. No questions to generate.");
        return;
      }
      
      if (excludedCount > 0) {
        vscode.window.showInformationMessage(`Excluded ${excludedCount} question(s) from generation.`);
      }
    } catch (err: any) {
      vscode.window.showErrorMessage(`Error reading quiz-questions.json: ${err.message}`);
      return;
    }

    // load config - create default if not exists
    const configPath = path.join(rootPath, "cqlc.config.json");
    let config: any;

    if (!fs.existsSync(configPath)) {
      
      // Create default config file
      const defaultConfig = {
        "title": " Quiz_Title",
        "topic": "Quiz_Topic",
        "folder": "Quiz_Folder",
        "pl_root": "/Users/benedictoseisefa/Desktop/pl-gvsu-cis500dev-master",
        "pl_question_root": "PersonalQuiz",
        "pl_assessment_root": "courseInstances/TemplateCourseInstance/assessments",
        "set": "Custom Quiz",
        "number": "2",
        "quiz_directory_name": "cis163_p1",
        "points_per_question": 10,
        "startDate": new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] + "T10:00:00", 
        "endDate": new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] + "T23:59:59",
        "timeLimitMin": 30,
        "daysForGrading": 7,
        "reviewEndDate": new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] + "T23:59:59",
        "password": "letMeIn",
        "language": "python",
        "studentNameMapping": {
          "benedictosefaosei": "oseisefb@mail.gvsu.edu",
          "william_williams": "williamsw@mail.gvsu.edu",
          "sam": "sam.test@mail.gvsu.edu",
          "antonio": "anto.test@ug.edu.gh",
          "caleb": "caleb.test@ug.edu.gh"
        }
      };

      try {
        await fs.promises.writeFile(configPath, JSON.stringify(defaultConfig, null, 2), "utf8");
        vscode.window.showInformationMessage(
          "Config file 'cqlc.config.json' was not found. A default config file has been created. Please modify it with your specific paths and settings, then run the generate command again.",
          { modal: true }
        );
        
        // Open the config file for editing
        const doc = await vscode.workspace.openTextDocument(configPath);
        await vscode.window.showTextDocument(doc);
        return; // Stop execution so user can modify the config
      } catch (err: any) {
        vscode.window.showErrorMessage(`Failed to create config file: ${err.message}`);
        return;
      }
    }

    // If config file exists, load it
    try {
      config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    } catch (err: any) {
      vscode.window.showErrorMessage(`Error reading config file: ${err.message}`);
      return;
    }

    const requiredFields = [
      "title", "topic", "folder", "pl_root", "pl_question_root", "pl_assessment_root",
      "set", "number", "points_per_question", "startDate", "endDate",
      "timeLimitMin", "daysForGrading", "reviewEndDate", "language"
    ];
    
    // Check for required fields and provide helpful messages
    const missingFields = requiredFields.filter(field => !config[field]);
    if (missingFields.length > 0) {
      const openConfig = "Open Config File";
      const response = await vscode.window.showErrorMessage(
        `Config file is missing required fields: ${missingFields.join(', ')}. Please update the config file and try again.`,
        openConfig
      );
      
      if (response === openConfig) {
        const doc = await vscode.workspace.openTextDocument(configPath);
        await vscode.window.showTextDocument(doc);
      }
      return;
    }

    // build base output paths
    const questionsRoot = path.join(config.pl_root, "questions", config.pl_question_root, config.folder);
    const assessmentsRoot = path.join(config.pl_root, config.pl_assessment_root, config.folder);
    const instructorRoot = path.join(questionsRoot, "instructor");
    const instructorAssessRoot = path.join(assessmentsRoot, "instructor");

    [questionsRoot, assessmentsRoot, instructorRoot, instructorAssessRoot].forEach(p => {
      if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
    });

    // group questions by student folder (first segment of filePath)
    const questionsByStudent: Record<string, any[]> = {};
    for (const q of questionsData) {
      const studentName = (q.filePath || "").split(/[\\/]/)[0] || "unknown_student";
      if (!questionsByStudent[studentName]) questionsByStudent[studentName] = [];
      questionsByStudent[studentName].push(q);
    }

    // generate student-specific files - ONLY for non-excluded questions
    for (const [student, qs] of Object.entries(questionsByStudent)) {
      const studentQPath = path.join(questionsRoot, student);
      const studentAssessPath = path.join(assessmentsRoot, student);
      if (!fs.existsSync(studentQPath)) fs.mkdirSync(studentQPath, { recursive: true });
      if (!fs.existsSync(studentAssessPath)) fs.mkdirSync(studentAssessPath, { recursive: true });

      // Filter out excluded questions for this student (should already be filtered, but double-check)
      const validQuestions = qs.filter(q => !q.exclude);
      
      if (validQuestions.length === 0) {
        vscode.window.showInformationMessage(`No valid questions for student ${student}, skipping generation.`);
        continue;
      }

      // create subfolder for each valid question
      validQuestions.forEach((question, index) => {
        const questionFolder = path.join(studentQPath, `question${index + 1}`);
        if (!fs.existsSync(questionFolder)) fs.mkdirSync(questionFolder, { recursive: true });

        // Create question.html file
        const questionText = question.question || question.text || question.content || "No question content available.";
        const codeSnippet = question.code || question.highlightedCode || question.snippet || "// No code highlighted";

        const questionHtmlContent = `
<pl-question-panel>
<markdown>
${questionText}
</markdown>
    <pl-code language="${config.language || 'python'}">
${codeSnippet}
</pl-code>
</pl-question-panel>
`.trim();

        const questionHtmlFile = path.join(questionFolder, "question.html");
        fs.writeFileSync(questionHtmlFile, questionHtmlContent, "utf8");

        // Create info.json file
        const questionInfo = {
          uuid: generateUUID(),
          type: "v3",
          gradingMethod: "Manual",
          title: config.title,
          topic: config.topic
        };

        const infoJsonFile = path.join(questionFolder, "info.json");
        fs.writeFileSync(infoJsonFile, JSON.stringify(questionInfo, null, 2), "utf8");
      });

      // Generate infoAssessment.json for this student - ONLY include valid questions
      const infoAssessment = {
        uuid: generateUUID(),
        type: "Exam",
        title: config.title,
        set: config.set,
        number: config.number,
        allowAccess: [
          {
            mode: "Public",
            uids: [student],
            credit: 100,
            timeLimitMin: config.timeLimitMin,
            startDate: config.startDate,
            endDate: config.endDate,
            password: config.password || "letMeIn"
          },
          {
            mode: "Public",
            credit: 0,
            startDate: config.reviewEndDate ? new Date(new Date(config.reviewEndDate).getTime() + 24 * 60 * 60 * 1000).toISOString() : new Date(new Date(config.endDate).getTime() + 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date(new Date(config.endDate).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            active: false
          }
        ],
        zones: [
          {
            questions: validQuestions.map((_, index) => ({
              id: `${config.pl_question_root}/${config.folder}/${student}/question${index + 1}`,
              points: config.points_per_question
            }))
          }
        ]
      };

      const assessmentFile = path.join(studentAssessPath, "infoAssessment.json");
      fs.writeFileSync(assessmentFile, JSON.stringify(infoAssessment, null, 2), "utf8");
    }

    // Create combined instructor files - ONLY include valid questions
    const combinedQuestionsFolder = path.join(instructorRoot, "combined-questions");
    if (!fs.existsSync(combinedQuestionsFolder)) {
      fs.mkdirSync(combinedQuestionsFolder, { recursive: true });
    }

    // Build combined question.html content - ONLY include valid questions
    let combinedHtmlContent = `
<pl-question-panel>
<markdown>
# ${config.title} - All Student Questions
<hr><br>
</markdown>
</pl-question-panel>
`.trim();

    // Add all valid questions from all students
    for (const [student, qs] of Object.entries(questionsByStudent)) {
      const validQuestions = qs.filter(q => !q.exclude);
      
      if (validQuestions.length === 0) {
        continue; // Skip students with no valid questions
      }

      combinedHtmlContent += `
<pl-question-panel>
<markdown>
## Student: ${student}
</markdown>
</pl-question-panel>
`;

      validQuestions.forEach((question, index) => {
        const questionText = question.question || question.text || question.content || "No question content available.";
        const codeSnippet = question.code || question.highlightedCode || question.snippet || "// No code highlighted";

        combinedHtmlContent += `
<pl-question-panel>
<markdown>
### Question ${index + 1}
${questionText}
</markdown>
    <pl-code language="${config.language || 'python'}">
${codeSnippet}
</pl-code>
</pl-question-panel>
<br><hr><br>
`;
      });
    }

    // Write combined question.html
    const combinedQuestionHtmlFile = path.join(combinedQuestionsFolder, "question.html");
    fs.writeFileSync(combinedQuestionHtmlFile, combinedHtmlContent, "utf8");

    // Create combined info.json
    const combinedInfo = {
      uuid: generateUUID(),
      gradingMethod: "Manual",
      type: "v3",
      title: `${config.title} - All Questions`,
      topic: config.topic
    };

    const combinedInfoJsonFile = path.join(combinedQuestionsFolder, "info.json");
    fs.writeFileSync(combinedInfoJsonFile, JSON.stringify(combinedInfo, null, 2), "utf8");

    // Create combined infoAssessment.json for instructor - ONLY include valid questions
    const combinedAssessment = {
      uuid: generateUUID(),
      type: "Exam",
      title: `${config.title} - Instructor View`,
      set: config.set,
      number: config.number,
      allowAccess: [
        {
          mode: "Public",
          uids: ["instructor"],
          credit: 100,
          timeLimitMin: 0,
          startDate: config.startDate,
          endDate: new Date(new Date(config.endDate).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year later
          password: "instructorAccess"
        }
      ],
      zones: [
        {
          questions: [
            {
              id: `${config.pl_question_root}/${config.folder}/instructor/combined-questions`,
              points: 1
            }
          ]
        }
      ]
    };

    const combinedAssessmentFile = path.join(instructorAssessRoot, "infoAssessment.json");
    fs.writeFileSync(combinedAssessmentFile, JSON.stringify(combinedAssessment, null, 2), "utf8");

    vscode.window.showInformationMessage("Generated QA files with student questions, combined instructor view, and all assessment files.");
  })
);


  


  
  (async () => {
    await ensureStorageDir().catch(() => {});
    await refreshAllDecorations();
  })();
}

export function deactivate() {
  // nothing to clean-up
}































