import * as vscode from "vscode";

export type Pos = { line: number; character: number };

export type RangeSerializable = {
  start: Pos;
  end: Pos;
};

export type QAItem = {
  id: string;
  filePath: string; 
  range: RangeSerializable;
  snippet: string;
  question: string;
  answer?: string;
  askedAt: number;
  answeredAt?: number;
  exclude?: boolean;
};

export let extensionContext: vscode.ExtensionContext;

export function setExtensionContext(context: vscode.ExtensionContext) {
  extensionContext = context;
}