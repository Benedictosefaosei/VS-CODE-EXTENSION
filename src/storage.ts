import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { QAItem } from "./types";

export const STORAGE_REL_PATH = ".vscode/quiz-questions.json";

export function getWorkspaceRoot(): string | undefined {
  const wf = vscode.workspace.workspaceFolders;
  if (!wf || wf.length === 0) {
    return undefined;
  }
  return wf[0].uri.fsPath;
}

export function getStoragePath(): string | undefined {
  const root = getWorkspaceRoot();
  if (!root) return undefined;
  return path.join(root, STORAGE_REL_PATH);
}

export async function ensureStorageDir(): Promise<void> {
  const sp = getStoragePath();
  if (!sp) throw new Error("Open a workspace folder first.");
  const dir = path.dirname(sp);
  await fs.promises.mkdir(dir, { recursive: true });
}

export async function loadAll(): Promise<QAItem[]> {
  const sp = getStoragePath();
  if (!sp) return [];
  try {
    const raw = await fs.promises.readFile(sp, "utf8");
    const items = JSON.parse(raw) as QAItem[];
    return Array.isArray(items) ? items : [];
  } catch (e) {
    return [];
  }
}

export async function saveAll(items: QAItem[]): Promise<void> {
  const sp = getStoragePath();
  if (!sp) throw new Error("Open a workspace folder first.");
  await ensureStorageDir();
  await fs.promises.writeFile(sp, JSON.stringify(items, null, 2), "utf8");
}

export function makeId(): string {
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9);
}