import * as vscode from "vscode";
import { setExtensionContext } from "./types";
import { ensureStorageDir, refreshAllDecorations, createDecorationType } from "./decorations";
import { addQuestion } from "./commands/addQuestion";
import { editQuestion } from "./commands/editQuestion";
import { answerQuestion } from "./commands/answerQuestion";
import { editAnswer } from "./commands/editAnswer";
import { viewQA } from "./commands/viewQA";
import { createConfigFile } from "./commands/createConfigFile";
import { generateQA } from "./commands/generateQA";

let decorationType: vscode.TextEditorDecorationType | undefined;

export function activate(context: vscode.ExtensionContext) {
  console.log("Quiz Annotator extension activated");

  setExtensionContext(context);

  decorationType = createDecorationType();
  context.subscriptions.push(decorationType);

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(async () => {
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
      await refreshAllDecorations();
    })
  );

  // Register all commands
  context.subscriptions.push(
    vscode.commands.registerCommand("extension.addQuestion", addQuestion)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("quiz.createConfigFile", createConfigFile)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("extension.editQuestion", editQuestion)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("extension.answerQuestion", answerQuestion)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("extension.editAnswer", editAnswer)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("extension.viewQA", viewQA)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("extension.generateQA", generateQA)
  );

  (async () => {
    await ensureStorageDir().catch(() => {});
    await refreshAllDecorations();
  })();
}

export function deactivate() {}