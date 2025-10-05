import * as vscode from "vscode";
import { loadAll } from "./storage";
import { QAItem } from "./types";
import * as path from "path";


export let decorationType: vscode.TextEditorDecorationType | undefined;

export function createDecorationType(): vscode.TextEditorDecorationType {
  return vscode.window.createTextEditorDecorationType({
    backgroundColor: "rgba(102, 255, 102, 0.18)", 
    isWholeLine: false,
    borderRadius: "2px"
  });
}

export async function applyDecorationsToEditor(editor: vscode.TextEditor | undefined) {
  if (!editor) return;
  if (!decorationType) decorationType = createDecorationType();
  const docPath = vscode.workspace.asRelativePath(editor.document.uri);
  const all = await loadAll();
  const decorations: vscode.DecorationOptions[] = [];

  for (const it of all) {
    if (it.filePath === docPath) {
      const start = new vscode.Position(Math.max(0, it.range.start.line), Math.max(0, it.range.start.character));
      const end = new vscode.Position(Math.max(0, it.range.end.line), Math.max(0, it.range.end.character));
      const range = new vscode.Range(start, end);
      const hoverMessage = new vscode.MarkdownString(`**Question:** ${escapeMarkdown(it.question)}\n\n**Answer:** ${escapeMarkdown(it.answer ?? "(not answered)")}`);
      decorations.push({ range, hoverMessage });
    }
  }

  editor.setDecorations(decorationType, decorations);
}

export async function refreshAllDecorations() {
  for (const editor of vscode.window.visibleTextEditors) {
    await applyDecorationsToEditor(editor);
  }
}

export function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function escapeMarkdown(s: string) {
  return s.replace(/\*/g, "\\*").replace(/_/g, "\\_");
}

// Separate function for storage directory creation without circular dependency
export async function ensureStorageDir(): Promise<void> {
  const { getStoragePath } = await import("./storage");
  const sp = getStoragePath();
  if (!sp) throw new Error("Open a workspace folder first.");
  const dir = path.dirname(sp);
  const fs = await import("fs");
  await fs.promises.mkdir(dir, { recursive: true });
}