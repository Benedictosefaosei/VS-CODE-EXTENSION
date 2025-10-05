"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWebviewHtml = getWebviewHtml;
const storage_1 = require("./storage");
function getWebviewHtml(items, panel) {
    const nonce = (0, storage_1.makeId)();
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
    const allItems = ${itemsJson}; 

   
    let filterText = '';
    let statusFilter = 'all';
    let pageSize = 10;
    let currentPage = 1;
    let studentFolders = []; 
    let selectedStudent = null; 


    function esc(s) { return (s||'').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
    function extractStudent(filePath) {
      const parts = filePath.split(/[\\\\/]/);
      return parts.length ? parts[0] : '';
    }

    const groups = {};
    for (const it of allItems) {
      const s = extractStudent(it.filePath);
      if (!groups[s]) groups[s] = [];
      groups[s].push(it);
    }
    const studentNames = Object.keys(groups).sort();
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

          const numTd = document.createElement('td');
          numTd.className = idToNumClass[it.id] || 'num-yellow';
          numTd.textContent = idToNumber[it.id] || '';
          numTd.style.textAlign = 'center';
          tr.appendChild(numTd);

          const qTd = document.createElement('td');
          qTd.innerHTML = '<strong>' + esc(it.question) + '</strong><div class="muted">' + new Date(it.askedAt).toLocaleString() + '</div>';
          tr.appendChild(qTd);

          const cTd = document.createElement('td');
          const pre = document.createElement('pre');
          pre.textContent = it.snippet;
          cTd.appendChild(pre);
          tr.appendChild(cTd);

          const aTd = document.createElement('td');
          aTd.innerHTML = it.answer ? esc(it.answer) + '<div class="muted">' + (it.answeredAt ? new Date(it.answeredAt).toLocaleString() : '') + '</div>' : '<em>(not answered)</em>';
          tr.appendChild(aTd);

          const pTd = document.createElement('td');
          const pathLink = document.createElement('a');
          pathLink.href = '#';
          pathLink.className = 'path';
          pathLink.textContent = it.filePath;
          pathLink.addEventListener('click', (e) => { e.preventDefault(); vscode.postMessage({ command: 'open', id: it.id }); });
          pTd.appendChild(pathLink);
          pTd.appendChild(document.createElement('br'));

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
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(it.question).then(() => {
                vscode.postMessage({ command: 'notify', text: 'Question copied to clipboard' });
              }).catch(() => {
                vscode.postMessage({ command: 'notify', text: 'Failed to copy to clipboard' });
              });
            } else {
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

    function renderStudents() {
      const counts = {};
      for (const it of allItems) {
        const s = extractStudent(it.filePath);
        counts[s] = (counts[s] || 0) + 1;
      }
      (studentFolders || []).forEach(s => { if (!(s in counts)) counts[s] = 0; });

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

        if ((counts[s] || 0) === max && max > 0) tr.classList.add('green');
        else if ((counts[s] || 0) === 0) tr.classList.add('red');
        else tr.classList.add('yellow');

        tr.addEventListener('click', () => {
          if (selectedStudent === s) {
            selectedStudent = null;
          } else {
            selectedStudent = s;
          }
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

    document.getElementById('filterText').addEventListener('input', function(e) { filterText = e.target.value; currentPage = 1; renderTable(); });
    document.getElementById('statusFilter').addEventListener('change', function(e) { statusFilter = e.target.value; currentPage = 1; renderTable(); });
    document.getElementById('pageSize').addEventListener('change', function(e) { pageSize = parseInt(e.target.value, 10); currentPage = 1; renderTable(); });
    document.getElementById('prevPage').addEventListener('click', function(){ if (currentPage > 1) { currentPage--; renderTable(); }});
    document.getElementById('nextPage').addEventListener('click', function(){ const maxP = Math.max(1, Math.ceil(applyFilters().length / pageSize)); if (currentPage < maxP) { currentPage++; renderTable(); }});
    document.getElementById('refresh').addEventListener('click', function(){ vscode.postMessage({ command: 'refresh' }); });
    document.getElementById('toggleStudents').addEventListener('click', function(){ const el = document.getElementById('studentSummary'); el.style.display = (el.style.display === 'block') ? 'none' : 'block'; if (el.style.display === 'block') renderStudents(); });

    window.addEventListener('message', (event) => {
      if (event.data && event.data.studentFolders) {
        studentFolders = event.data.studentFolders || [];
        const el = document.getElementById('studentSummary');
        if (el && el.style.display === 'block') renderStudents();
      }
      if (event.data && event.data.items) {
        // pass
      }
    });

    renderTable();
  }());
</script>
</body>
</html>`;
}
//# sourceMappingURL=webview.js.map