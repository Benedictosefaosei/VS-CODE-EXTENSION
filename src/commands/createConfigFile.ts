import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

export async function createConfigFile() {
  if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
    vscode.window.showErrorMessage("Open a workspace folder first.");
    return;
  }

  const root = vscode.workspace.workspaceFolders[0].uri.fsPath;
  const target = path.join(root, "cqlc.config.json");

  const configContent = {
    title: " Brother",
    topic: "Variable",
    folder: "Brother",
    pl_root: "/Users/benedictoseisefa/Desktop/pl-gvsu-cis500dev-master",
    pl_question_root: "PersonalQuiz",
    pl_assessment_root: "courseInstances/TemplateCourseInstance/assessments",
    set: "Custom Quiz",
    number: "2",
    quiz_directory_name: "cis371_server",
    points_per_question: 10,
    startDate: "2025-03-22T10:30:00",
    endDate: "2025-03-22T16:30:40",
    timeLimitMin: 30,
    daysForGrading: 7,
    reviewEndDate: "2025-04-21T23:59:59",
    password: "letMeIn",
    language: "python",
    studentNameMapping: {
      benedictosefaosei: "oseisefb@mail.gvsu.edu",
      william_williams: "williamsw@mail.gvsu.edu",
      sam: "sam.test@mail.gvsu.edu",
      antonio: "anto.test@ug.edu.gh",
      caleb: "caleb.test@ug.edu.gh"
    }
  };

  try {
    await fs.promises.writeFile(target, JSON.stringify(configContent, null, 2), "utf8");
    vscode.window.showInformationMessage(`Created ${path.basename(target)} at workspace root.`);
    const doc = await vscode.workspace.openTextDocument(target);
    vscode.window.showTextDocument(doc);
  } catch (err: any) {
    vscode.window.showErrorMessage(`Failed to create config file: ${err.message}`);
  }
}