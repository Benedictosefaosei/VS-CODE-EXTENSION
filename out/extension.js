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
            return items;
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
                const start = new vscode.Position(it.range.start.line, it.range.start.character);
                const end = new vscode.Position(it.range.end.line, it.range.end.character);
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
            vscode.window.showErrorMessage("Could not open file: " + e);
        }
    });
}
/**
 * Create a unique id
 */
function makeId() {
    return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9);
}
/**
 * Webview HTML generator
 */
function getWebviewHtml(items, panel) {
    // We'll pass items as JSON into the webview script
    const nonce = makeId();
    const itemsJson = JSON.stringify(items);
    // build HTML
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}';">
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Quiz: Questions & Answers</title>
<style nonce="${nonce}">
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; padding: 12px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 8px; border: 1px solid #ddd; vertical-align: top; }
  th { background: #f5f5f5; text-align: left; }
  pre { margin: 0; white-space: pre-wrap; word-break: break-word; max-height: 180px; overflow: auto; background:#f8f8f8; padding:8px; border-radius:4px; }
  .controls { margin-bottom: 12px; display:flex; gap:8px; }
  button { padding:6px 8px; border-radius:6px; cursor:pointer; }
  .small-btn { padding:4px 6px; font-size:0.9em; }
  .muted { color:#666; font-size:0.9em; }
</style>
</head>
<body>
  <div class="controls">
    <button id="refresh">Refresh</button>
    <div class="muted">Click file path to open the file & highlight range</div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:28%;">Question</th>
        <th style="width:30%;">Code (highlighted selection)</th>
        <th style="width:24%;">Answer</th>
        <th style="width:18%;">Path & actions</th>
      </tr>
    </thead>
    <tbody id="rows"></tbody>
  </table>

<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  const items = ${itemsJson};
  function render() {
    const tbody = document.getElementById('rows');
    tbody.innerHTML = '';
    if (!items || items.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">No questions yet</td></tr>';
      return;
    }
    for (const it of items) {
      const tr = document.createElement('tr');

      const qTd = document.createElement('td');
      qTd.innerHTML = '<strong>' + escapeHtml(it.question) + '</strong><div class="muted">Added: ' + new Date(it.askedAt).toLocaleString() + '</div>';
      tr.appendChild(qTd);

      const codeTd = document.createElement('td');
      const pre = document.createElement('pre');
      pre.textContent = it.snippet;
      codeTd.appendChild(pre);
      tr.appendChild(codeTd);

      const aTd = document.createElement('td');
      aTd.innerHTML = it.answer ? escapeHtml(it.answer) + '<div class="muted">Answered: ' + new Date(it.answeredAt).toLocaleString() + '</div>' : '<em>(not answered)</em>';
      tr.appendChild(aTd);

      const pTd = document.createElement('td');
      const pathLink = document.createElement('a');
      pathLink.href = '#';
      pathLink.textContent = it.filePath;
      pathLink.addEventListener('click', (e) => {
        e.preventDefault();
        vscode.postMessage({ command: 'open', id: it.id });
      });
      pTd.appendChild(pathLink);
      pTd.appendChild(document.createElement('br'));

      const editQ = document.createElement('button');
      editQ.className = 'small-btn';
      editQ.textContent = 'Edit Question';
      editQ.addEventListener('click', () => vscode.postMessage({ command: 'editQuestion', id: it.id }));

      const answerBtn = document.createElement('button');
      answerBtn.className = 'small-btn';
      answerBtn.textContent = it.answer ? 'Edit Answer' : 'Answer';
      answerBtn.style.marginLeft = '6px';
      answerBtn.addEventListener('click', () => vscode.postMessage({ command: it.answer ? 'editAnswer' : 'answerQuestion', id: it.id }));

      const delBtn = document.createElement('button');
      delBtn.className = 'small-btn';
      delBtn.textContent = 'Delete';
      delBtn.style.marginLeft = '6px';
      delBtn.addEventListener('click', () => {
        if (confirm('Delete this Q/A?')) vscode.postMessage({ command: 'delete', id: it.id });
      });

      pTd.appendChild(editQ);
      pTd.appendChild(answerBtn);
      pTd.appendChild(delBtn);

      tr.appendChild(pTd);

      tbody.appendChild(tr);
    }
  }

  function escapeHtml(s) {
    if (!s) return '';
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  document.getElementById('refresh').addEventListener('click', () => vscode.postMessage({ command: 'refresh' }));

  render();
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
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor((e) => __awaiter(this, void 0, void 0, function* () {
        yield refreshAllDecorations();
    })));
    context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(() => __awaiter(this, void 0, void 0, function* () {
        yield refreshAllDecorations();
    })));
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(() => __awaiter(this, void 0, void 0, function* () {
        // After editing, re-apply decorations (they will follow ranges but could shift)
        yield refreshAllDecorations();
    })));
    // Add Question on selection
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
        const question = yield vscode.window.showInputBox({ prompt: "Write the question about the selected code" });
        if (!question) {
            vscode.window.showInformationMessage("Question creation cancelled.");
            return;
        }
        const root = getWorkspaceRoot();
        if (!root) {
            vscode.window.showErrorMessage("Open a workspace folder first.");
            return;
        }
        const relPath = vscode.workspace.asRelativePath(editor.document.uri);
        const item = {
            id: makeId(),
            filePath: relPath,
            range: {
                start: { line: sel.start.line, character: sel.start.character },
                end: { line: sel.end.line, character: sel.end.character }
            },
            snippet,
            question,
            askedAt: Date.now()
        };
        const all = yield loadAll();
        all.push(item);
        yield saveAll(all);
        vscode.window.showInformationMessage("Question added.");
        yield refreshAllDecorations();
    })));
    // Edit question
    context.subscriptions.push(vscode.commands.registerCommand("extension.editQuestion", () => __awaiter(this, void 0, void 0, function* () {
        const all = yield loadAll();
        if (all.length === 0) {
            vscode.window.showInformationMessage("No questions found.");
            return;
        }
        const pick = yield vscode.window.showQuickPick(all.map((it) => ({ label: it.question, description: it.filePath, id: it.id })), { placeHolder: "Select a question to edit" });
        if (!pick)
            return;
        const item = all.find((i) => i.id === pick.id);
        const newQ = yield vscode.window.showInputBox({ prompt: "Edit question", value: item.question });
        if (newQ === undefined)
            return;
        item.question = newQ;
        yield saveAll(all);
        vscode.window.showInformationMessage("Question updated.");
        yield refreshAllDecorations();
    })));
    // Answer question (pick unanswered)
    context.subscriptions.push(vscode.commands.registerCommand("extension.answerQuestion", () => __awaiter(this, void 0, void 0, function* () {
        const all = yield loadAll();
        const unanswered = all.filter((i) => !i.answer);
        if (unanswered.length === 0) {
            vscode.window.showInformationMessage("No unanswered questions found.");
            return;
        }
        const pick = yield vscode.window.showQuickPick(unanswered.map((it) => ({ label: it.question, description: it.filePath, id: it.id })), { placeHolder: "Pick a question to answer" });
        if (!pick)
            return;
        const item = all.find((i) => i.id === pick.id);
        // Offer to open file at range first
        const openNow = "Open file & highlight";
        const skipOpen = "Answer now";
        const choice = yield vscode.window.showInformationMessage("Open the file to review the snippet before answering?", openNow, skipOpen);
        if (choice === openNow) {
            yield openFileAt(item);
            // then prompt for answer
        }
        const ans = yield vscode.window.showInputBox({ prompt: "Enter your answer" });
        if (ans === undefined)
            return;
        item.answer = ans;
        item.answeredAt = Date.now();
        yield saveAll(all);
        vscode.window.showInformationMessage("Answer saved.");
        yield refreshAllDecorations();
    })));
    // Edit answer
    context.subscriptions.push(vscode.commands.registerCommand("extension.editAnswer", () => __awaiter(this, void 0, void 0, function* () {
        const all = yield loadAll();
        const answered = all.filter((i) => i.answer);
        if (answered.length === 0) {
            vscode.window.showInformationMessage("No answered questions found.");
            return;
        }
        const pick = yield vscode.window.showQuickPick(answered.map((it) => ({ label: it.question, description: it.filePath, id: it.id })), { placeHolder: "Select answered question to edit" });
        if (!pick)
            return;
        const item = all.find((i) => i.id === pick.id);
        const newA = yield vscode.window.showInputBox({ prompt: "Edit answer", value: item.answer });
        if (newA === undefined)
            return;
        item.answer = newA;
        item.answeredAt = Date.now();
        yield saveAll(all);
        vscode.window.showInformationMessage("Answer updated.");
        yield refreshAllDecorations();
    })));
    // View Q&A in webview (table)
    context.subscriptions.push(vscode.commands.registerCommand("extension.viewQA", () => __awaiter(this, void 0, void 0, function* () {
        const panel = vscode.window.createWebviewPanel("quizView", "Quiz: Questions & Answers", vscode.ViewColumn.One, {
            enableScripts: true
        });
        const all = yield loadAll();
        panel.webview.html = getWebviewHtml(all, panel);
        panel.webview.onDidReceiveMessage((msg) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            // handle messages from webview
            if (!msg || !msg.command)
                return;
            const cmd = msg.command;
            const id = msg.id;
            let items = yield loadAll();
            if (cmd === "open" && id) {
                const it = items.find((x) => x.id === id);
                if (it)
                    yield openFileAt(it);
                return;
            }
            if (cmd === "editQuestion" && id) {
                const it = items.find((x) => x.id === id);
                if (!it)
                    return;
                const newQ = yield vscode.window.showInputBox({ prompt: "Edit question", value: it.question });
                if (newQ === undefined)
                    return;
                it.question = newQ;
                yield saveAll(items);
                panel.webview.html = getWebviewHtml(yield loadAll(), panel);
                yield refreshAllDecorations();
                return;
            }
            if (cmd === "answerQuestion" && id) {
                const it = items.find((x) => x.id === id);
                if (!it)
                    return;
                yield openFileAt(it);
                const ans = yield vscode.window.showInputBox({ prompt: "Enter your answer" });
                if (ans === undefined)
                    return;
                it.answer = ans;
                it.answeredAt = Date.now();
                yield saveAll(items);
                panel.webview.html = getWebviewHtml(yield loadAll(), panel);
                yield refreshAllDecorations();
                return;
            }
            if (cmd === "editAnswer" && id) {
                const it = items.find((x) => x.id === id);
                if (!it)
                    return;
                const newA = yield vscode.window.showInputBox({ prompt: "Edit answer", value: (_a = it.answer) !== null && _a !== void 0 ? _a : "" });
                if (newA === undefined)
                    return;
                it.answer = newA;
                it.answeredAt = Date.now();
                yield saveAll(items);
                panel.webview.html = getWebviewHtml(yield loadAll(), panel);
                yield refreshAllDecorations();
                return;
            }
            if (cmd === "delete" && id) {
                items = items.filter((x) => x.id !== id);
                yield saveAll(items);
                panel.webview.html = getWebviewHtml(yield loadAll(), panel);
                yield refreshAllDecorations();
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