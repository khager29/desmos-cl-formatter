// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { formatText } from "./formatter/formatText";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your "desmos-cl-formatter" is now active!');

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    const disposable = vscode.commands.registerCommand(
        "desmos-cl-formatter.formatCode",
        () => {
            // The code you place here will be executed every time your command is executed
            // Display a message box to the user
            vscode.window.showInformationMessage(
                "Your code has been formatted!"
            );
        }
    );

    const selector: vscode.DocumentSelector = [
        {
            language: "desmosCL",
            scheme: "file",
        },
        { language: "desmosCL", scheme: "untitled" },
    ];

    const provider: vscode.DocumentFormattingEditProvider = {
        provideDocumentFormattingEdits(document, options, token) {
            const fullRange = new vscode.Range(
                document.positionAt(0),
                document.positionAt(document.getText().length)
            );

            const originalText = document.getText();
            const formattedText = formatText(originalText, {
                tabSize: options.tabSize,
                insertSpaces: options.insertSpaces,
                printWidth: 80,
            });
            console.log(formattedText);
            return [vscode.TextEdit.replace(fullRange, formattedText)];
        },
    };

    context.subscriptions.push(disposable);
    context.subscriptions.push(
        vscode.languages.registerDocumentFormattingEditProvider(
            selector,
            provider
        )
    );
}

// This method is called when your extension is deactivated
export function deactivate() {}
