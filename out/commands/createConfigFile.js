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
exports.createConfigFile = createConfigFile;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
async function createConfigFile() {
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
    }
    catch (err) {
        vscode.window.showErrorMessage(`Failed to create config file: ${err.message}`);
    }
}
//# sourceMappingURL=createConfigFile.js.map