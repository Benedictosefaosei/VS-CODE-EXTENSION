import * as vscode from "vscode";
import * as path from "path";
import { loadAll, saveAll } from "../storage";
import { refreshAllDecorations } from "../decorations";
import { getWebviewHtml } from "../webview";
import { QAItem } from "../types";

export async function openFileAt(item: QAItem) {
  const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
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

export async function viewQA() {
  const panel = vscode.window.createWebviewPanel("quizView", "Quiz: Questions & Answers", vscode.ViewColumn.One, {
    enableScripts: true
  });
  const all = await loadAll();
  panel.webview.html = getWebviewHtml(all, panel);

  const folders = (vscode.workspace.workspaceFolders || []).map(f => path.basename(f.uri.fsPath));
  panel.webview.postMessage({ studentFolders: folders });

  panel.webview.onDidReceiveMessage(
    async (msg) => {
      if (!msg || !msg.command) return;
      const cmd = msg.command as string;
      const id = msg.id as string | undefined;

      let items = await loadAll();

      if (cmd === "open" && id) {
        const it = items.find((x) => x.id === id);
        if (it) await openFileAt(it);
        return;
      }

      if (cmd === "toggleExclude" && id) {
        const allItems = await loadAll();
        const idx = allItems.findIndex(x => x.id === id);
        if (idx >= 0) {
          allItems[idx].exclude = msg.exclude;
          await saveAll(allItems);
          panel.webview.html = getWebviewHtml(await loadAll(), panel);
        }
        return;
      }

      if (cmd === "delete" && id) {
        const choice = await vscode.window.showWarningMessage(
          "Are you sure you want to delete this question?",
          { modal: true },
          "Yes",
          "No"
        );
        if (choice !== "Yes") {
          return; 
        }
        items = items.filter((x) => x.id !== id);
        await saveAll(items);
        panel.webview.html = getWebviewHtml(await loadAll(), panel);
        await refreshAllDecorations();
        return;
      }

      if (cmd === 'runCommand' && msg.name) {
        const allItems = await loadAll();
        const target = allItems.find(x => x.id === msg.id);
        if (target) {
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
    undefined
  );
}