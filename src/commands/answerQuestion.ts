import * as vscode from "vscode";
import { loadAll, saveAll } from "../storage";
import { refreshAllDecorations } from "../decorations";
import { QAItem } from "../types";
import { openFileAt } from "./viewQA";

export async function answerQuestion(itemArg?: QAItem) {
  let item = itemArg;
  const all = await loadAll();
  if (!item) {
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
    item = all.find((i) => i.id === (pick as any).id)!;
  }

  const openNow = "Open file & highlight";
  const skipOpen = "Answer now";
  const choice = await vscode.window.showInformationMessage("Open the file to review the snippet before answering?", openNow, skipOpen);
  if (choice === openNow) {
    await openFileAt(item!);
  }
  const ans = await vscode.window.showInputBox({ prompt: "Enter your answer" });
  if (ans === undefined) return;
  const allItems = await loadAll();
  const idx = allItems.findIndex(x => x.id === item!.id);
  if (idx >= 0) {
    allItems[idx].answer = ans;
    allItems[idx].answeredAt = Date.now();
    await saveAll(allItems);
    vscode.window.showInformationMessage("Answer saved.");
    await refreshAllDecorations();
  }
}