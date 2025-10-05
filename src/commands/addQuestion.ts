import * as vscode from "vscode";
import { loadAll, saveAll, makeId } from "../storage";
import { refreshAllDecorations, escapeHtml } from "../decorations";
import { QAItem } from "../types";

export async function addQuestion() {
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
    undefined
  );
}