import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

type Pos = { line: number; character: number };

type RangeSerializable = {
  start: Pos;
  end: Pos;
};

type QAItem = {
  id: string;
  filePath: string; // relative to workspace root
  range: RangeSerializable;
  snippet: string;
  question: string;
  answer?: string;
  askedAt: number;
  answeredAt?: number;
};

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
    return items;
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
      const start = new vscode.Position(it.range.start.line, it.range.start.character);
      const end = new vscode.Position(it.range.end.line, it.range.end.character);
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
    vscode.window.showErrorMessage("Could not open file: " + e);
  }
}

/**
 * Create a unique id
 */
function makeId(): string {
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9);
}

/**
 * Webview HTML generator
 */
function getWebviewHtml(items: QAItem[], panel: vscode.WebviewPanel): string {
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
export function activate(context: vscode.ExtensionContext) {
  console.log("Quiz Annotator extension activated");

  // ensure decoration type
  decorationType = createDecorationType();
  context.subscriptions.push(decorationType);

  // Apply decorations when active editor changes or documents open
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(async (e) => {
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
      // After editing, re-apply decorations (they will follow ranges but could shift)
      await refreshAllDecorations();
    })
  );

  // Add Question on selection
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
      const question = await vscode.window.showInputBox({ prompt: "Write the question about the selected code" });
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
      const item: QAItem = {
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

      const all = await loadAll();
      all.push(item);
      await saveAll(all);
      vscode.window.showInformationMessage("Question added.");
      await refreshAllDecorations();
    })
  );

  // Edit question
  context.subscriptions.push(
    vscode.commands.registerCommand("extension.editQuestion", async () => {
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
      const item = all.find((i) => i.id === pick.id)!;
      const newQ = await vscode.window.showInputBox({ prompt: "Edit question", value: item.question });
      if (newQ === undefined) return;
      item.question = newQ;
      await saveAll(all);
      vscode.window.showInformationMessage("Question updated.");
      await refreshAllDecorations();
    })
  );

  // Answer question (pick unanswered)
  context.subscriptions.push(
    vscode.commands.registerCommand("extension.answerQuestion", async () => {
      const all = await loadAll();
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
      const item = all.find((i) => i.id === pick.id)!;
      // Offer to open file at range first
      const openNow = "Open file & highlight";
      const skipOpen = "Answer now";
      const choice = await vscode.window.showInformationMessage("Open the file to review the snippet before answering?", openNow, skipOpen);
      if (choice === openNow) {
        await openFileAt(item);
        // then prompt for answer
      }
      const ans = await vscode.window.showInputBox({ prompt: "Enter your answer" });
      if (ans === undefined) return;
      item.answer = ans;
      item.answeredAt = Date.now();
      await saveAll(all);
      vscode.window.showInformationMessage("Answer saved.");
      await refreshAllDecorations();
    })
  );

  // Edit answer
  context.subscriptions.push(
    vscode.commands.registerCommand("extension.editAnswer", async () => {
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
      const item = all.find((i) => i.id === pick.id)!;
      const newA = await vscode.window.showInputBox({ prompt: "Edit answer", value: item.answer });
      if (newA === undefined) return;
      item.answer = newA;
      item.answeredAt = Date.now();
      await saveAll(all);
      vscode.window.showInformationMessage("Answer updated.");
      await refreshAllDecorations();
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

      panel.webview.onDidReceiveMessage(
        async (msg) => {
          // handle messages from webview
          if (!msg || !msg.command) return;
          const cmd = msg.command as string;
          const id = msg.id as string | undefined;
          let items = await loadAll();

          if (cmd === "open" && id) {
            const it = items.find((x) => x.id === id);
            if (it) await openFileAt(it);
            return;
          }
          if (cmd === "editQuestion" && id) {
            const it = items.find((x) => x.id === id);
            if (!it) return;
            const newQ = await vscode.window.showInputBox({ prompt: "Edit question", value: it.question });
            if (newQ === undefined) return;
            it.question = newQ;
            await saveAll(items);
            panel.webview.html = getWebviewHtml(await loadAll(), panel);
            await refreshAllDecorations();
            return;
          }
          if (cmd === "answerQuestion" && id) {
            const it = items.find((x) => x.id === id);
            if (!it) return;
            await openFileAt(it);
            const ans = await vscode.window.showInputBox({ prompt: "Enter your answer" });
            if (ans === undefined) return;
            it.answer = ans;
            it.answeredAt = Date.now();
            await saveAll(items);
            panel.webview.html = getWebviewHtml(await loadAll(), panel);
            await refreshAllDecorations();
            return;
          }
          if (cmd === "editAnswer" && id) {
            const it = items.find((x) => x.id === id);
            if (!it) return;
            const newA = await vscode.window.showInputBox({ prompt: "Edit answer", value: it.answer ?? "" });
            if (newA === undefined) return;
            it.answer = newA;
            it.answeredAt = Date.now();
            await saveAll(items);
            panel.webview.html = getWebviewHtml(await loadAll(), panel);
            await refreshAllDecorations();
            return;
          }
          if (cmd === "delete" && id) {
            items = items.filter((x) => x.id !== id);
            await saveAll(items);
            panel.webview.html = getWebviewHtml(await loadAll(), panel);
            await refreshAllDecorations();
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

  // When extension starts, ensure storage exists (no overwrite) and refresh decorations
  (async () => {
    await ensureStorageDir().catch(() => {});
    await refreshAllDecorations();
  })();
}

export function deactivate() {
  // nothing to clean-up
}
