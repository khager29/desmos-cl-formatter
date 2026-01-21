export function printProgram(
    program: any,
    options: { tabSize: number; insertSpaces: boolean; printWidth: number }
): string {
    const printedNode = printNode(program);
    return docToString(printedNode, options);
}

function docToString(
    printedNode: any,
    options: { tabSize: number; insertSpaces: boolean; printWidth: number }
): string {
    if (typeof printedNode === "string") {
        return printedNode;
    }
    if (Array.isArray(printedNode)) {
        return printedNode.map((item) => docToString(item, options)).join("");
    }
    if (printedNode?.type === "line" || printedNode?.type === "hardline") {
        return "\n";
    }
    if (printedNode?.type === "group") {
        return docToString(printedNode.contents, options);
    }
    if (printedNode?.type === "indent") {
        const indentStr = options.insertSpaces
            ? " ".repeat(options.tabSize)
            : "\t";
        const content = docToString(printedNode.contents, options);
        // Indent each line except the first
        return content
            .split("\n")
            .map((line, i) => (i === 0 ? line : indentStr + line))
            .join("\n");
    }
    return "";
}

function printNode(node: any): any {
    if (Array.isArray(node)) {
        return node.map((n) => printNode(n)).join("\n");
    }

    switch (node.type) {
        case "condition":
            return `  ${node.conditionalType} ${node.condition}`;
        case "assignment":
            return `${node.name}: ${node.value}`;
        case "initialization":
            return `${node.name}= ${node.value}`;
        case "raw":
            return node.value;
        default:
            return node.raw ?? "";
    }
}
