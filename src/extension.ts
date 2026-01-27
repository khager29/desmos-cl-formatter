// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { formatText } from "./formatter/formatText";
import { loadDocumentationIndex } from "./intellisense/docIndex";

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

    const keywordCompletions = [
        "when",
        "otherwise",
        "and",
        "or",
        "not",
        "true",
        "false",
    ].map((label) => {
        const item = new vscode.CompletionItem(
            label,
            vscode.CompletionItemKind.Keyword
        );
        item.insertText = label;
        return item;
    });

    const docIndex = loadDocumentationIndex(context.extensionPath);

    const attributeNames = new Set(docIndex.attributes);
    const functionCompletions = docIndex.functions.map((name) => {
        const item = new vscode.CompletionItem(
            name,
            vscode.CompletionItemKind.Function
        );
        item.insertText = new vscode.SnippetString(`${name}($1)`);
        return item;
    });

    const attributeCompletions = docIndex.attributes.map((name) => {
        const item = new vscode.CompletionItem(
            name,
            vscode.CompletionItemKind.Property
        );
        item.insertText = name;
        return item;
    });

    const typeCompletions = docIndex.types.map((name) => {
        const item = new vscode.CompletionItem(
            name,
            vscode.CompletionItemKind.Class
        );
        item.insertText = name;
        return item;
    });

    const snippetCompletions: vscode.CompletionItem[] = [
        (() => {
            const item = new vscode.CompletionItem(
                "when … otherwise",
                vscode.CompletionItemKind.Snippet
            );
            item.insertText = new vscode.SnippetString(
                "when ${1:condition} ${2:value}\notherwise ${3:value}"
            );
            item.detail = "Conditional block";
            return item;
        })(),
        (() => {
            const item = new vscode.CompletionItem(
                "when … when … otherwise",
                vscode.CompletionItemKind.Snippet
            );
            item.insertText = new vscode.SnippetString(
                "when ${1:condition} ${2:value}\nwhen ${3:condition} ${4:value}\notherwise ${5:value}"
            );
            item.detail = "Multi-branch conditional block";
            return item;
        })(),
    ];

    const completionProvider: vscode.CompletionItemProvider = {
        provideCompletionItems(document, position) {
            const linePrefix = document
                .lineAt(position)
                .text.slice(0, position.character);
            const match = linePrefix.match(/([A-Za-z0-9_]+)?$/);
            const currentWord = match ? match[0] : "";

            // Don't auto-suggest on empty/whitespace-only lines. This avoids
            // accidental insertion when you're adding blank lines.
            if (!linePrefix.trim()) {
                return [];
            }

            // Avoid noisy suggestions immediately after a dot; we'll add
            // member completions later once we have a symbol table.
            if (/\.\s*$/.test(linePrefix)) {
                const attributeOnlyFunctions = functionCompletions.filter(
                    (item) => !attributeNames.has(String(item.label))
                );
                return [...attributeCompletions, ...attributeOnlyFunctions].map(
                    (item) => {
                        const label =
                            typeof item.label === "string"
                                ? item.label
                                : item.label.label;
                        if (currentWord && label.startsWith(currentWord)) {
                            const priority = attributeNames.has(label) ? "0" : "1";
                            item.sortText = `${priority}_${label}`;
                        }
                        return item;
                    }
                );
            }

            return [
                ...keywordCompletions,
                ...snippetCompletions,
                ...typeCompletions,
                ...functionCompletions,
            ];
        },
    };

    context.subscriptions.push(disposable);
    context.subscriptions.push(
        vscode.languages.registerDocumentFormattingEditProvider(
            selector,
            provider
        )
    );
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            selector,
            completionProvider,
            "." // keep behavior predictable around members
        )
    );
}

// This method is called when your extension is deactivated
export function deactivate() {}
