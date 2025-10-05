import * as vscode from "vscode";
import { loadAll, saveAll, makeId } from "../storage";
import { refreshAllDecorations, escapeHtml } from "../decorations";
import { QAItem } from "../types";

export async function editAnswer(itemArg?: QAItem) {
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
    item = all.find((i) => i.id === (pick as any).id)!;
  }

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
    undefined
  );
}