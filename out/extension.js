"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const STORAGE_REL_PATH = ".vscode/quiz-questions.json";
let decorationType;
/**
 * Helpers: storage
 */
function getWorkspaceRoot() {
    const wf = vscode.workspace.workspaceFolders;
    if (!wf || wf.length === 0) {
        return undefined;
    }
    return wf[0].uri.fsPath;
}
function getStoragePath() {
    const root = getWorkspaceRoot();
    if (!root)
        return undefined;
    return path.join(root, STORAGE_REL_PATH);
}
function ensureStorageDir() {
    return __awaiter(this, void 0, void 0, function* () {
        const sp = getStoragePath();
        if (!sp)
            throw new Error("Open a workspace folder first.");
        const dir = path.dirname(sp);
        yield fs.promises.mkdir(dir, { recursive: true });
    });
}
function loadAll() {
    return __awaiter(this, void 0, void 0, function* () {
        const sp = getStoragePath();
        if (!sp)
            return [];
        try {
            const raw = yield fs.promises.readFile(sp, "utf8");
            const items = JSON.parse(raw);
            return Array.isArray(items) ? items : [];
        }
        catch (e) {
            return [];
        }
    });
}
function saveAll(items) {
    return __awaiter(this, void 0, void 0, function* () {
        const sp = getStoragePath();
        if (!sp)
            throw new Error("Open a workspace folder first.");
        yield ensureStorageDir();
        yield fs.promises.writeFile(sp, JSON.stringify(items, null, 2), "utf8");
    });
}
/**
 * Decorations
 */
function createDecorationType() {
    return vscode.window.createTextEditorDecorationType({
        backgroundColor: "rgba(102, 255, 102, 0.18)",
        isWholeLine: false,
        borderRadius: "2px"
    });
}
function applyDecorationsToEditor(editor) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        if (!editor)
            return;
        if (!decorationType)
            decorationType = createDecorationType();
        const docPath = vscode.workspace.asRelativePath(editor.document.uri);
        const all = yield loadAll();
        const decorations = [];
        for (const it of all) {
            // match by relative path
            if (it.filePath === docPath) {
                // guard positions
                const start = new vscode.Position(Math.max(0, it.range.start.line), Math.max(0, it.range.start.character));
                const end = new vscode.Position(Math.max(0, it.range.end.line), Math.max(0, it.range.end.character));
                const range = new vscode.Range(start, end);
                const hoverMessage = new vscode.MarkdownString(`**Question:** ${escapeMarkdown(it.question)}\n\n**Answer:** ${escapeMarkdown((_a = it.answer) !== null && _a !== void 0 ? _a : "(not answered)")}`);
                decorations.push({ range, hoverMessage });
            }
        }
        editor.setDecorations(decorationType, decorations);
    });
}
function refreshAllDecorations() {
    return __awaiter(this, void 0, void 0, function* () {
        for (const editor of vscode.window.visibleTextEditors) {
            yield applyDecorationsToEditor(editor);
        }
    });
}
function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeMarkdown(s) {
    // minimal
    return s.replace(/\*/g, "\\*").replace(/_/g, "\\_");
}
/**
 * Utility to open file at stored range
 */
function openFileAt(item) {
    return __awaiter(this, void 0, void 0, function* () {
        const root = getWorkspaceRoot();
        if (!root) {
            vscode.window.showErrorMessage("Open a workspace folder first.");
            return;
        }
        const fullPath = path.join(root, item.filePath);
        try {
            const doc = yield vscode.workspace.openTextDocument(fullPath);
            const editor = yield vscode.window.showTextDocument(doc, { preview: false });
            const posStart = new vscode.Position(item.range.start.line, item.range.start.character);
            const posEnd = new vscode.Position(item.range.end.line, item.range.end.character);
            editor.revealRange(new vscode.Range(posStart, posEnd), vscode.TextEditorRevealType.InCenter);
            editor.selection = new vscode.Selection(posStart, posEnd);
        }
        catch (e) {
            vscode.window.showErrorMessage("Could not open file: " + String(e));
        }
    });
}
/**
 * Create a unique id
 */
function makeId() {
    return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9);
}
// function getWebviewHtml(items: QAItem[], panel: vscode.WebviewPanel): string {
//   const nonce = makeId();
//   const itemsJson = JSON.stringify(items);
//   return `<!DOCTYPE html>
// <html lang="en">
// <head>
// <meta charset="utf-8" />
// <meta http-equiv="Content-Security-Policy"
//       content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}';">
// <meta name="viewport" content="width=device-width, initial-scale=1.0" />
// <title>Quiz: Questions & Answers</title>
// <style nonce="${nonce}">
//   body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto; padding:16px; }
//   .controls { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:12px; }
//   input[type="text"], select, button { padding:4px 6px; font-size:14px; }
//   table { width:100%; border-collapse:collapse; margin-top:8px; }
//   th, td { padding:8px; border:1px solid #ddd; vertical-align:top; }
//   th { background:#f5f5f5; }
//   pre { margin:0; white-space:pre-wrap; word-break:break-word; background:#f8f8f8; padding:6px; border-radius:4px; max-height:160px; overflow:auto; }
//   button { border-radius:6px; cursor:pointer; }
//   .small-btn { font-size:0.9em; }
//   .pagination { display:flex; justify-content:center; align-items:center; gap:8px; margin-top:12px; }
//   #studentSummary { margin-top:20px; border:1px solid #ccc; padding:10px; border-radius:6px; display:none; }
//   #studentSummary h3 { margin-top:0; }
//   #studentTable td { padding:6px 10px; }
//   .green { background:#c8f7c5; }
//   .yellow { background:#fff7b2; }
//   .red { background:#f7c5c5; }
// </style>
// </head>
// <body>
//   <div class="controls">
//     <input type="text" id="filterText" placeholder="Search text…">
//     <select id="statusFilter">
//       <option value="all">All</option>
//       <option value="answered">Answered</option>
//       <option value="unanswered">Unanswered</option>
//     </select>
//     <label>Page size:
//       <select id="pageSize"><option>5</option><option selected>10</option><option>15</option><option>20</option></select>
//     </label>
//     <button id="refresh">Refresh</button>
//     <button id="toggleStudents">Toggle Student Summary</button>
//   </div>
//  <div id="studentSummary">
//     <h3>Student Summary</h3>
//     <table id="studentTable">
//       <thead><tr><th>Student</th><th># Questions</th></tr></thead>
//       <tbody></tbody>
//     </table>
//   </div>
//   <table>
//     <thead>
//       <tr>
//         <th style="width:28%">Question</th>
//         <th style="width:30%">Code</th>
//         <th style="width:24%">Answer</th>
//         <th style="width:18%">Path & Actions</th>
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
//   const vscode = acquireVsCodeApi();
//   const allItems = ${itemsJson};
//   // ---------- Filtering & Paging ----------
//   let filterText = '';
//   let statusFilter = 'all';
//   let pageSize = 10;
//   let currentPage = 1;
//   function esc(s){return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
//   function applyFilters() {
//     const text = filterText.toLowerCase();
//     return allItems.filter(it => {
//       const matchText = !text || it.question.toLowerCase().includes(text) ||
//         (it.answer||'').toLowerCase().includes(text) ||
//         it.filePath.toLowerCase().includes(text);
//       const matchStatus = statusFilter==='all' ||
//         (statusFilter==='answered' && it.answer) ||
//         (statusFilter==='unanswered' && !it.answer);
//       return matchText && matchStatus;
//     });
//   }
//   function renderTable() {
//     const filtered = applyFilters();
//     const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
//     if (currentPage > totalPages) currentPage = totalPages;
//     const pageItems = filtered.slice((currentPage-1)*pageSize, currentPage*pageSize);
//     const rows = document.getElementById('rows');
//     rows.innerHTML = '';
//     if (!pageItems.length) {
//       rows.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;">No matching questions</td></tr>';
//     } else {
//       for (const it of pageItems) {
//         const tr = document.createElement('tr');
//         const qTd = document.createElement('td');
//         qTd.innerHTML = '<strong>'+esc(it.question)+'</strong><div style="color:#666;font-size:0.9em;">'+new Date(it.askedAt).toLocaleString()+'</div>';
//         tr.appendChild(qTd);
//         const cTd = document.createElement('td');
//         const pre = document.createElement('pre'); pre.textContent = it.snippet;
//         cTd.appendChild(pre); tr.appendChild(cTd);
//         const aTd = document.createElement('td');
//         aTd.innerHTML = it.answer ? esc(it.answer)+'<div style="color:#666;font-size:0.9em;">'+new Date(it.answeredAt).toLocaleString()+'</div>' : '<em>(not answered)</em>';
//         tr.appendChild(aTd);
//         const pTd = document.createElement('td');
//         const link = document.createElement('a'); link.href='#'; link.textContent=it.filePath;
//         link.addEventListener('click', e=>{e.preventDefault(); vscode.postMessage({command:'open',id:it.id});});
//         pTd.appendChild(link); pTd.appendChild(document.createElement('br'));
//         const eq = document.createElement('button'); eq.className='small-btn'; eq.textContent='Edit Q';
//         eq.addEventListener('click', ()=>vscode.postMessage({command:'runCommand', name:'extension.editQuestion', id:it.id}));
//         const ans = document.createElement('button'); ans.className='small-btn';
//         ans.textContent = it.answer ? 'Edit A' : 'Answer'; ans.style.marginLeft='6px';
//         ans.addEventListener('click', ()=>vscode.postMessage({command: it.answer?'editAnswer':'answerQuestion', id:it.id}));
//         const del = document.createElement('button'); del.className='small-btn'; del.textContent='Delete'; del.style.marginLeft='6px';
//         del.addEventListener('click', ()=>vscode.postMessage({command:'delete', id:it.id}));
//         const copyBtn = document.createElement('button');
//         copyBtn.className = 'small-btn';
//         copyBtn.textContent = 'Copy';
//         copyBtn.style.marginLeft = '6px';
//         copyBtn.addEventListener('click', () => {
//           navigator.clipboard.writeText(it.question)
//             .then(() => {
//               // optional feedback inside the webview
//               alert('Question copied to clipboard');
//             })x
//             .catch(err => {
//               console.error('Clipboard copy failed', err);
//             });
//         });
//         pTd.appendChild(eq); pTd.appendChild(ans); pTd.appendChild(del); pTd.appendChild(copyBtn);
//         tr.appendChild(pTd);
//         rows.appendChild(tr);
//       }
//     }
//     document.getElementById('pageInfo').textContent = \`Page \${currentPage} / \${totalPages}\`;
//   }
//   // ---------- Student Summary ----------
//   function extractStudent(filePath) {
//     // Take first folder of the path as "student name"
//     const parts = filePath.split(/[\\\\/]/);
//     return parts.length ? parts[0] : '';
//   }
//   function renderStudents() {
//     // All unique student names from workspace + counts
//     const counts = {};
//     for (const it of allItems) {
//       const s = extractStudent(it.filePath);
//       counts[s] = (counts[s] || 0) + 1;
//     }
//     // also include base folders even with 0 questions
//     // we'll ask the extension for them (below we pass them in)
//     const allStudentNames = vscode.workspaceFoldersNames || [];
//     for (const s of allStudentNames) {
//       if (!(s in counts)) counts[s] = 0;
//     }
//     const max = Math.max(0, ...Object.values(counts));
//     const tbody = document.querySelector('#studentTable tbody');
//     tbody.innerHTML = '';
//     for (const [name, num] of Object.entries(counts).sort()) {
//       const tr = document.createElement('tr');
//       tr.innerHTML = '<td>'+esc(name)+'</td><td>'+num+'</td>';
//       if (num === max && max > 0) tr.className = 'green';
//       else if (num === 0) tr.className = 'red';
//       else tr.className = 'yellow';
//       tbody.appendChild(tr);
//     }
//   }
//   // ---------- UI bindings ----------
//   document.getElementById('filterText').addEventListener('input', e => { filterText=e.target.value; currentPage=1; renderTable(); });
//   document.getElementById('statusFilter').addEventListener('change', e => { statusFilter=e.target.value; currentPage=1; renderTable(); });
//   document.getElementById('pageSize').addEventListener('change', e => { pageSize=parseInt(e.target.value,10); currentPage=1; renderTable(); });
//   document.getElementById('prevPage').addEventListener('click', ()=>{ if(currentPage>1){currentPage--; renderTable();} });
//   document.getElementById('nextPage').addEventListener('click', ()=>{ const maxP=Math.max(1,Math.ceil(applyFilters().length/pageSize)); if(currentPage<maxP){currentPage++; renderTable();} });
//   document.getElementById('refresh').addEventListener('click', ()=>vscode.postMessage({command:'refresh'}));
//   document.getElementById('toggleStudents').addEventListener('click', ()=>{
//     const div=document.getElementById('studentSummary');
//     div.style.display = div.style.display==='none' ? 'block' : 'none';
//     if (div.style.display==='block') renderStudents();
//   });
//   // Let extension inject folder names
//   window.addEventListener('message', event => {
//     if (event.data && event.data.studentFolders) {
//       vscode.workspaceFoldersNames = event.data.studentFolders;
//     }
//   });
//   renderTable();
// </script>
// </body>
// </html>`;
// }
function getWebviewHtml(items, panel) {
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
  :root { --muted:#666; --green:#c8f7c5; --yellow:#fff7b2; --red:#f7c5c5; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; padding: 12px; }
  .controls { display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin-bottom:12px; }
  input[type="text"], select { padding:6px 8px; font-size:13px; }
  button { padding:6px 8px; border-radius:6px; cursor:pointer; }
  .small-btn { padding:4px 6px; font-size:0.9em; margin-left:6px; }
  table { width:100%; border-collapse:collapse; margin-top:8px; }
  th, td { padding:8px; border:1px solid #ddd; vertical-align:top; text-align:left; }
  th { background:#f5f5f5; }
  pre { margin:0; white-space:pre-wrap; word-break:break-word; background:#f8f8f8; padding:8px; border-radius:4px; max-height:160px; overflow:auto; }
  .muted { color: var(--muted); font-size:0.9em; }
  .pagination { display:flex; justify-content:center; align-items:center; gap:8px; margin-top:12px; }
  #studentSummary { margin-top:16px; border:1px solid #ddd; padding:10px; border-radius:6px; display:none; }
  #studentSummary table { width:100%; border-collapse:collapse; }
  #studentTable th, #studentTable td { padding:6px 10px; border:1px solid #eee; }
  .student-row { cursor:pointer; }
  .student-selected { outline: 2px solid #0066cc; }
  .num-green { background: var(--green); font-weight:bold; text-align:center; }
  .num-yellow { background: var(--yellow); font-weight:bold; text-align:center; }
  .num-cell { width:6%; }
  a.path { color:#0066cc; text-decoration:none; display:inline-block; margin-bottom:6px; }
  .controls-right { margin-left:auto; display:flex; gap:8px; align-items:center; }
  .small-note { color:var(--muted); font-size:0.9em; margin-left:8px; }
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
/**
 * Commands
 */
function activate(context) {
    console.log("Quiz Annotator extension activated");
    // ensure decoration type
    decorationType = createDecorationType();
    context.subscriptions.push(decorationType);
    // Apply decorations when active editor changes or documents open
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(() => __awaiter(this, void 0, void 0, function* () {
        yield refreshAllDecorations();
    })));
    context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(() => __awaiter(this, void 0, void 0, function* () {
        yield refreshAllDecorations();
    })));
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(() => __awaiter(this, void 0, void 0, function* () {
        // After editing, re-apply decorations (they will follow ranges but could shift)
        yield refreshAllDecorations();
    })));
    // Add Question on selection (fancy webview)
    context.subscriptions.push(vscode.commands.registerCommand("extension.addQuestion", () => __awaiter(this, void 0, void 0, function* () {
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
        const panel = vscode.window.createWebviewPanel("quizAddQuestion", "Add Quiz Question", vscode.ViewColumn.Beside, { enableScripts: true } // must be true for messaging
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
        // Handle messages from the webview
        panel.webview.onDidReceiveMessage((msg) => __awaiter(this, void 0, void 0, function* () {
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
                const item = {
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
                const all = yield loadAll();
                all.push(item);
                yield saveAll(all);
                yield refreshAllDecorations();
                vscode.window.showInformationMessage("Question saved.");
                panel.dispose();
            }
        }), undefined, context.subscriptions);
    })));
    // Edit question command - accepts a QAItem or prompts if none
    context.subscriptions.push(vscode.commands.registerCommand("extension.editQuestion", (itemArg) => __awaiter(this, void 0, void 0, function* () {
        let item = itemArg;
        if (!item) {
            const all = yield loadAll();
            if (all.length === 0) {
                vscode.window.showInformationMessage("No questions found.");
                return;
            }
            const pick = yield vscode.window.showQuickPick(all.map((it) => ({ label: it.question, description: it.filePath, id: it.id })), { placeHolder: "Select a question to edit" });
            if (!pick)
                return;
            item = all.find((i) => i.id === pick.id);
        }
        // open webview to edit the question
        const panel = vscode.window.createWebviewPanel("quizEditQuestion", "Edit Question", vscode.ViewColumn.Beside, { enableScripts: true });
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
        panel.webview.onDidReceiveMessage((msg) => __awaiter(this, void 0, void 0, function* () {
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
                const all = yield loadAll();
                const idx = all.findIndex(x => x.id === item.id);
                if (idx >= 0) {
                    all[idx].question = q;
                    yield saveAll(all);
                    yield refreshAllDecorations();
                    vscode.window.showInformationMessage("Question updated.");
                }
                panel.dispose();
            }
        }), undefined, context.subscriptions);
    })));
    // Answer question (pick unanswered) - unchanged behavior when called directly
    context.subscriptions.push(vscode.commands.registerCommand("extension.answerQuestion", (itemArg) => __awaiter(this, void 0, void 0, function* () {
        let item = itemArg;
        const all = yield loadAll();
        if (!item) {
            const unanswered = all.filter((i) => !i.answer);
            if (unanswered.length === 0) {
                vscode.window.showInformationMessage("No unanswered questions found.");
                return;
            }
            const pick = yield vscode.window.showQuickPick(unanswered.map((it) => ({ label: it.question, description: it.filePath, id: it.id })), { placeHolder: "Pick a question to answer" });
            if (!pick)
                return;
            item = all.find((i) => i.id === pick.id);
        }
        // Offer to open file at range first
        const openNow = "Open file & highlight";
        const skipOpen = "Answer now";
        const choice = yield vscode.window.showInformationMessage("Open the file to review the snippet before answering?", openNow, skipOpen);
        if (choice === openNow) {
            yield openFileAt(item);
        }
        const ans = yield vscode.window.showInputBox({ prompt: "Enter your answer" });
        if (ans === undefined)
            return;
        // update item
        const allItems = yield loadAll();
        const idx = allItems.findIndex(x => x.id === item.id);
        if (idx >= 0) {
            allItems[idx].answer = ans;
            allItems[idx].answeredAt = Date.now();
            yield saveAll(allItems);
            vscode.window.showInformationMessage("Answer saved.");
            yield refreshAllDecorations();
        }
    })));
    // Edit answer - open webview to edit a specific answer (or prompt if none provided)
    context.subscriptions.push(vscode.commands.registerCommand("extension.editAnswer", (itemArg) => __awaiter(this, void 0, void 0, function* () {
        let item = itemArg;
        if (!item) {
            const all = yield loadAll();
            const answered = all.filter((i) => i.answer);
            if (answered.length === 0) {
                vscode.window.showInformationMessage("No answered questions found.");
                return;
            }
            const pick = yield vscode.window.showQuickPick(answered.map((it) => ({ label: it.question, description: it.filePath, id: it.id })), { placeHolder: "Select answered question to edit" });
            if (!pick)
                return;
            item = all.find((i) => i.id === pick.id);
        }
        // open webview to edit answer
        const panel = vscode.window.createWebviewPanel("quizEditAnswer", "Edit Answer", vscode.ViewColumn.Beside, { enableScripts: true });
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
        panel.webview.onDidReceiveMessage((msg) => __awaiter(this, void 0, void 0, function* () {
            if (msg.command === "cancel") {
                panel.dispose();
                return;
            }
            if (msg.command === "save") {
                const a = (msg.answer || "").trim();
                if (!a) {
                    vscode.window.showErrorMessage("Answer cannot be empty.");
                    return;
                }
                const all = yield loadAll();
                const idx = all.findIndex(x => x.id === item.id);
                if (idx >= 0) {
                    all[idx].answer = a;
                    all[idx].answeredAt = Date.now();
                    yield saveAll(all);
                    yield refreshAllDecorations();
                    vscode.window.showInformationMessage("Answer updated.");
                }
                panel.dispose();
            }
        }), undefined, context.subscriptions);
    })));
    // View Q&A in webview (table)
    context.subscriptions.push(vscode.commands.registerCommand("extension.viewQA", () => __awaiter(this, void 0, void 0, function* () {
        const panel = vscode.window.createWebviewPanel("quizView", "Quiz: Questions & Answers", vscode.ViewColumn.One, {
            enableScripts: true
        });
        const all = yield loadAll();
        panel.webview.html = getWebviewHtml(all, panel);
        // Send all top-level folder names to the webview for student summary
        const folders = (vscode.workspace.workspaceFolders || []).map(f => path.basename(f.uri.fsPath));
        panel.webview.postMessage({ studentFolders: folders });
        panel.webview.onDidReceiveMessage((msg) => __awaiter(this, void 0, void 0, function* () {
            // handle messages from webview
            if (!msg || !msg.command)
                return;
            const cmd = msg.command;
            const id = msg.id;
            // reload fresh items when needed
            let items = yield loadAll();
            if (cmd === "open" && id) {
                const it = items.find((x) => x.id === id);
                if (it)
                    yield openFileAt(it);
                return;
            }
            // Delete with VS Code confirmation
            if (cmd === "delete" && id) {
                const choice = yield vscode.window.showWarningMessage("Are you sure you want to delete this question?", { modal: true }, "Yes", "No");
                if (choice !== "Yes") {
                    return; // user cancelled
                }
                items = items.filter((x) => x.id !== id);
                yield saveAll(items);
                panel.webview.html = getWebviewHtml(yield loadAll(), panel);
                yield refreshAllDecorations();
                return;
            }
            // Run a named command and pass the found QAItem to it
            if (cmd === 'runCommand' && msg.name) {
                const allItems = yield loadAll();
                const target = allItems.find(x => x.id === msg.id);
                if (target) {
                    // this will call our registered commands and pass the QAItem object
                    yield vscode.commands.executeCommand(msg.name, target);
                }
                return;
            }
            if (cmd === "refresh") {
                panel.webview.html = getWebviewHtml(yield loadAll(), panel);
                yield refreshAllDecorations();
                return;
            }
        }), undefined, context.subscriptions);
    })));
    // When extension starts, ensure storage exists (no overwrite) and refresh decorations
    (() => __awaiter(this, void 0, void 0, function* () {
        yield ensureStorageDir().catch(() => { });
        yield refreshAllDecorations();
    }))();
}
exports.activate = activate;
function deactivate() {
    // nothing to clean-up
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map