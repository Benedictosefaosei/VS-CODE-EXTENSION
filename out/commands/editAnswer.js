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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.editAnswer = editAnswer;
const vscode = __importStar(require("vscode"));
const storage_1 = require("../storage");
const decorations_1 = require("../decorations");
async function editAnswer(itemArg) {
    let item = itemArg;
    if (!item) {
        const all = await (0, storage_1.loadAll)();
        const answered = all.filter((i) => i.answer);
        if (answered.length === 0) {
            vscode.window.showInformationMessage("No answered questions found.");
            return;
        }
        const pick = await vscode.window.showQuickPick(answered.map((it) => ({ label: it.question, description: it.filePath, id: it.id })), { placeHolder: "Select answered question to edit" });
        if (!pick)
            return;
        item = all.find((i) => i.id === pick.id);
    }
    const panel = vscode.window.createWebviewPanel("quizEditAnswer", "Edit Answer", vscode.ViewColumn.Beside, { enableScripts: true });
    const nonce = (0, storage_1.makeId)();
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
      <p><strong>File:</strong> ${(0, decorations_1.escapeHtml)(item.filePath)}</p>
      <label for="answer">Answer:</label>
      <textarea id="answer">${(0, decorations_1.escapeHtml)(item.answer || "")}</textarea>
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
    panel.webview.onDidReceiveMessage(async (msg) => {
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
            const all = await (0, storage_1.loadAll)();
            const idx = all.findIndex(x => x.id === item.id);
            if (idx >= 0) {
                all[idx].answer = a;
                all[idx].answeredAt = Date.now();
                await (0, storage_1.saveAll)(all);
                await (0, decorations_1.refreshAllDecorations)();
                vscode.window.showInformationMessage("Answer updated.");
            }
            panel.dispose();
        }
    }, undefined);
}
//# sourceMappingURL=editAnswer.js.map