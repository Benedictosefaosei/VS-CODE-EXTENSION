"use strict";
/**
 * Webview HTML generator
 */
// function getWebviewHtml(items: QAItem[], panel: vscode.WebviewPanel): string {
//   // We'll pass items as JSON into the webview script
//   const nonce = makeId();
//   const itemsJson = JSON.stringify(items || []);
//   // build HTML
//   return `<!DOCTYPE html>
// <html lang="en">
// <head>
// <meta charset="utf-8" />
// <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}';">
// <meta name="viewport" content="width=device-width, initial-scale=1.0" />
// <title>Quiz: Questions & Answers</title>
// <style nonce="${nonce}">
//   body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; padding: 12px; }
//   table { width: 100%; border-collapse: collapse; }
//   th, td { padding: 8px; border: 1px solid #ddd; vertical-align: top; }
//   th { background: #f5f5f5; text-align: left; }
//   pre { margin: 0; white-space: pre-wrap; word-break: break-word; max-height: 180px; overflow: auto; background:#f8f8f8; padding:8px; border-radius:4px; }
//   .controls { margin-bottom: 12px; display:flex; gap:8px; align-items:center; }
//   button { padding:6px 8px; border-radius:6px; cursor:pointer; }
//   .small-btn { padding:4px 6px; font-size:0.9em; }
//   .muted { color:#666; font-size:0.9em; }
//   a.path { display:inline-block; margin-bottom:6px; color: #0066cc; text-decoration: none; }
// </style>
// </head>
// <body>
//   <div class="controls">
//     <button id="refresh">Refresh</button>
//     <div class="muted">Click file path to open the file & highlight range</div>
//   </div>
//   <table>
//     <thead>
//       <tr>
//         <th style="width:28%;">Question</th>
//         <th style="width:30%;">Code (highlighted selection)</th>
//         <th style="width:24%;">Answer</th>
//         <th style="width:18%;">Path & actions</th>
//       </tr>
//     </thead>
//     <tbody id="rows"></tbody>
//   </table>
// <script nonce="${nonce}">
//   (function() {
//     const vscode = acquireVsCodeApi();
//     const items = ${itemsJson};
//     function escapeHtml(s) {
//       if (!s) return '';
//       return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
//     }
//     function render() {
//       const tbody = document.getElementById('rows');
//       tbody.innerHTML = '';
//       if (!items || items.length === 0) {
//         tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">No questions yet</td></tr>';
//         return;
//       }
//       for (const it of items) {
//         const tr = document.createElement('tr');
//         const qTd = document.createElement('td');
//         qTd.innerHTML = '<strong>' + escapeHtml(it.question) + '</strong><div class="muted">Added: ' + new Date(it.askedAt).toLocaleString() + '</div>';
//         tr.appendChild(qTd);
//         const codeTd = document.createElement('td');
//         const pre = document.createElement('pre');
//         pre.textContent = it.snippet;
//         codeTd.appendChild(pre);
//         tr.appendChild(codeTd);
//         const aTd = document.createElement('td');
//         if (it.answer) {
//           const answeredAt = it.answeredAt ? new Date(it.answeredAt).toLocaleString() : '';
//           aTd.innerHTML = escapeHtml(it.answer) + '<div class="muted">Answered: ' + answeredAt + '</div>';
//         } else {
//           aTd.innerHTML = '<em>(not answered)</em>';
//         }
//         tr.appendChild(aTd);
//         const pTd = document.createElement('td');
//         const pathLink = document.createElement('a');
//         pathLink.href = '#';
//         pathLink.className = 'path';
//         pathLink.textContent = it.filePath;
//         pathLink.addEventListener('click', (e) => {
//           e.preventDefault();
//           vscode.postMessage({ command: 'open', id: it.id });
//         });
//         pTd.appendChild(pathLink);
//         pTd.appendChild(document.createElement('br'));
//         // Edit Question button -> tell extension to run the edit command with the item
//         const editQBtn = document.createElement('button');
//         editQBtn.className = 'small-btn';
//         editQBtn.textContent = 'Edit Question';
//         editQBtn.addEventListener('click', () => {
//           vscode.postMessage({ command: 'runCommand', name: 'extension.editQuestion', id: it.id });
//         });
//         // Answer / Edit Answer button -> run answer or editAnswer command
//         const answerBtn = document.createElement('button');
//         answerBtn.className = 'small-btn';
//         answerBtn.textContent = it.answer ? 'Edit Answer' : 'Answer';
//         answerBtn.style.marginLeft = '6px';
//         answerBtn.addEventListener('click', () => {
//           const cmd = it.answer ? 'extension.editAnswer' : 'extension.answerQuestion';
//           vscode.postMessage({ command: 'runCommand', name: cmd, id: it.id });
//         });
//         const delBtn = document.createElement('button');
//         delBtn.className = 'small-btn';
//         delBtn.textContent = 'Delete';
//         delBtn.style.marginLeft = '6px';
//         delBtn.addEventListener('click', () => {
//           // notify the extension host; confirmation handled there
//           vscode.postMessage({ command: 'delete', id: it.id });
//         });
//         pTd.appendChild(editQBtn);
//         pTd.appendChild(answerBtn);
//         pTd.appendChild(delBtn);
//         tr.appendChild(pTd);
//         tbody.appendChild(tr);
//       }
//     }
//     document.getElementById('refresh').addEventListener('click', () => vscode.postMessage({ command: 'refresh' }));
//     render();
//   }());
// </script>
// </body>
// </html>`;
// }
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
//   input[type="text"], select { padding:4px 6px; font-size:14px; }
//   table { width:100%; border-collapse:collapse; margin-top:8px; }
//   th, td { padding:8px; border:1px solid #ddd; vertical-align:top; }
//   th { background:#f5f5f5; }
//   pre { margin:0; white-space:pre-wrap; word-break:break-word; background:#f8f8f8; padding:6px; border-radius:4px; max-height:160px; overflow:auto; }
//   button { padding:4px 8px; border-radius:6px; cursor:pointer; }
//   .small-btn { font-size:0.9em; }
//   .pagination { display:flex; justify-content:center; align-items:center; gap:8px; margin-top:12px; }
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
//     <label>
//       Page size:
//       <select id="pageSize">
//         <option>5</option>
//         <option selected>10</option>
//         <option>15</option>
//         <option>20</option>
//       </select>
//     </label>
//     <button id="refresh">Refresh</button>
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
//   let filterText = '';
//   let statusFilter = 'all';
//   let pageSize = 10;
//   let currentPage = 1;
//   const rows = document.getElementById('rows');
//   const pageInfo = document.getElementById('pageInfo');
//   function applyFilters() {
//     const text = filterText.toLowerCase();
//     return allItems.filter(it => {
//       const matchText = !text || (
//         it.question.toLowerCase().includes(text) ||
//         (it.answer || '').toLowerCase().includes(text) ||
//         it.filePath.toLowerCase().includes(text)
//       );
//       const matchStatus = statusFilter === 'all' ||
//         (statusFilter === 'answered' && it.answer) ||
//         (statusFilter === 'unanswered' && !it.answer);
//       return matchText && matchStatus;
//     });
//   }
//   function render() {
//     const filtered = applyFilters();
//     const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
//     if (currentPage > totalPages) currentPage = totalPages;
//     const start = (currentPage - 1) * pageSize;
//     const end = start + pageSize;
//     const pageItems = filtered.slice(start, end);
//     rows.innerHTML = '';
//     if (pageItems.length === 0) {
//       rows.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;">No matching questions</td></tr>';
//     } else {
//       for (const it of pageItems) {
//         const tr = document.createElement('tr');
//         const qTd = document.createElement('td');
//         qTd.innerHTML = '<strong>' + esc(it.question) + '</strong><div style="color:#666;font-size:0.9em;">' + new Date(it.askedAt).toLocaleString() + '</div>';
//         tr.appendChild(qTd);
//         const cTd = document.createElement('td');
//         const pre = document.createElement('pre');
//         pre.textContent = it.snippet;
//         cTd.appendChild(pre);
//         tr.appendChild(cTd);
//         const aTd = document.createElement('td');
//         aTd.innerHTML = it.answer ? esc(it.answer) + '<div style="color:#666;font-size:0.9em;">' + new Date(it.answeredAt).toLocaleString() + '</div>' : '<em>(not answered)</em>';
//         tr.appendChild(aTd);
//         const pTd = document.createElement('td');
//         const link = document.createElement('a');
//         link.href = '#';
//         link.textContent = it.filePath;
//         link.addEventListener('click', e => { e.preventDefault(); vscode.postMessage({ command:'open', id:it.id }); });
//         pTd.appendChild(link);
//         pTd.appendChild(document.createElement('br'));
//         const eq = document.createElement('button');
//         eq.className = 'small-btn';
//         eq.textContent = 'Edit Q';
//         eq.addEventListener('click', () => vscode.postMessage({ command:'runCommand', name:'extension.editQuestion', id:it.id }));
//         const ans = document.createElement('button');
//         ans.className = 'small-btn';
//         ans.textContent = it.answer ? 'Edit A' : 'Answer';
//         ans.style.marginLeft = '6px';
//         ans.addEventListener('click', () => vscode.postMessage({ command: it.answer ? 'editAnswer' : 'answerQuestion', id: it.id }));
//         const del = document.createElement('button');
//         del.className = 'small-btn';
//         del.textContent = 'Delete';
//         del.style.marginLeft = '6px';
//         del.addEventListener('click', () => vscode.postMessage({ command:'delete', id:it.id }));
//         pTd.appendChild(eq); pTd.appendChild(ans); pTd.appendChild(del);
//         tr.appendChild(pTd);
//         rows.appendChild(tr);
//       }
//     }
//     pageInfo.textContent = \`Page \${currentPage} / \${totalPages}\`;
//   }
//   function esc(s) {
//     return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
//   }
//   document.getElementById('filterText').addEventListener('input', e => {
//     filterText = e.target.value;
//     currentPage = 1;
//     render();
//   });
//   document.getElementById('statusFilter').addEventListener('change', e => {
//     statusFilter = e.target.value;
//     currentPage = 1;
//     render();
//   });
//   document.getElementById('pageSize').addEventListener('change', e => {
//     pageSize = parseInt(e.target.value, 10);
//     currentPage = 1;
//     render();
//   });
//   document.getElementById('prevPage').addEventListener('click', () => {
//     if (currentPage > 1) { currentPage--; render(); }
//   });
//   document.getElementById('nextPage').addEventListener('click', () => {
//     const maxPage = Math.max(1, Math.ceil(applyFilters().length / pageSize));
//     if (currentPage < maxPage) { currentPage++; render(); }
//   });
//   document.getElementById('refresh').addEventListener('click', () => vscode.postMessage({ command:'refresh' }));
//   render();
// </script>
// </body>
// </html>`;
// }
//# sourceMappingURL=raw.js.map