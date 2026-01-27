export function printProgram(
    program: any,
    options: { tabSize: number; insertSpaces: boolean; printWidth: number }
): string {
    const printedNode = printNode(program, options);
    return docToString(printedNode, options)
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trimEnd();
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
        return content
            .split("\n")
            .map((line, i) => (i === 0 ? line : indentStr + line))
            .join("\n");
    }
    return "";
}

function indentUnit(options: { tabSize: number; insertSpaces: boolean }): string {
    return options.insertSpaces ? " ".repeat(options.tabSize) : "\t";
}

function indent(level: number, options: { tabSize: number; insertSpaces: boolean }): string {
    return indentUnit(options).repeat(Math.max(level, 0));
}

function isWordChar(ch: string | undefined): boolean {
    return !!ch && /[A-Za-z0-9_]/.test(ch);
}

function splitTopLevelLogical(text: string): { segments: string[]; connectors: string[] } {
    const segments: string[] = [];
    const connectors: string[] = [];

    let buffer = "";
    let parenDepth = 0;
    let bracketDepth = 0;
    let braceDepth = 0;
    let inString = false;

    for (let i = 0; i < text.length; i += 1) {
        const ch = text[i];
        const prev = text[i - 1];

        if (ch === '"' && prev !== "\\") {
            inString = !inString;
            buffer += ch;
            continue;
        }

        if (!inString) {
            if (ch === "(") parenDepth += 1;
            if (ch === ")") parenDepth = Math.max(parenDepth - 1, 0);
            if (ch === "[") bracketDepth += 1;
            if (ch === "]") bracketDepth = Math.max(bracketDepth - 1, 0);
            if (ch === "{") braceDepth += 1;
            if (ch === "}") braceDepth = Math.max(braceDepth - 1, 0);
        }

        const atTopLevel =
            !inString && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0;
        if (atTopLevel) {
            const andMatch =
                text.slice(i, i + 3) === "and" &&
                !isWordChar(prev) &&
                !isWordChar(text[i + 3]);
            const orMatch =
                text.slice(i, i + 2) === "or" &&
                !isWordChar(prev) &&
                !isWordChar(text[i + 2]);

            if (andMatch || orMatch) {
                const connector = andMatch ? "and" : "or";
                const before = buffer.trim();
                if (before) {
                    segments.push(before);
                }
                connectors.push(connector);
                buffer = "";
                i += connector.length - 1;
                continue;
            }
        }

        buffer += ch;
    }

    const last = buffer.trim();
    if (last) {
        segments.push(last);
    }

    return { segments, connectors };
}

function splitTopLevelCommas(text: string): string[] {
    const items: string[] = [];
    let buffer = "";
    let parenDepth = 0;
    let bracketDepth = 0;
    let braceDepth = 0;
    let inString = false;

    for (let i = 0; i < text.length; i += 1) {
        const ch = text[i];
        const prev = text[i - 1];

        if (ch === '"' && prev !== "\\") {
            inString = !inString;
            buffer += ch;
            continue;
        }

        if (!inString) {
            if (ch === "(") parenDepth += 1;
            if (ch === ")") parenDepth = Math.max(parenDepth - 1, 0);
            if (ch === "[") bracketDepth += 1;
            if (ch === "]") bracketDepth = Math.max(bracketDepth - 1, 0);
            if (ch === "{") braceDepth += 1;
            if (ch === "}") braceDepth = Math.max(braceDepth - 1, 0);
        }

        const atTopLevel =
            !inString && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0;
        if (atTopLevel && ch === ",") {
            const item = buffer.trim();
            if (item) {
                items.push(item);
            }
            buffer = "";
            continue;
        }

        buffer += ch;
    }

    const last = buffer.trim();
    if (last) {
        items.push(last);
    }

    return items;
}

function findMatchingBracket(text: string, startIndex: number, open: string, close: string): number {
    let depth = 0;
    let inString = false;

    for (let i = startIndex; i < text.length; i += 1) {
        const ch = text[i];
        const prev = text[i - 1];

        if (ch === '"' && prev !== "\\") {
            inString = !inString;
        }
        if (inString) {
            continue;
        }
        if (ch === open) depth += 1;
        if (ch === close) {
            depth -= 1;
            if (depth === 0) {
                return i;
            }
        }
    }

    return -1;
}

function formatArrayIfNeeded(
    value: string,
    options: { tabSize: number; insertSpaces: boolean }
): string | null {
    const openIndex = value.indexOf("[");
    if (openIndex === -1) {
        return null;
    }
    const closeIndex = findMatchingBracket(value, openIndex, "[", "]");
    if (closeIndex === -1) {
        return null;
    }

    const before = value.slice(0, openIndex).trim();
    if (before) {
        return null;
    }

    const inside = value.slice(openIndex + 1, closeIndex);
    const suffix = value.slice(closeIndex + 1).trim();
    const items = splitTopLevelCommas(inside);

    if (items.length <= 1) {
        return null;
    }

    const itemIndent = indent(1, options);
    const lines = items.map((item, index) => {
        const comma = index < items.length - 1 ? "," : "";
        return `${itemIndent}${item}${comma}`;
    });

    const closing = `]${suffix ? suffix : ""}`;
    return ["[", ...lines, closing].join("\n");
}

function isWrappedInParens(text: string): boolean {
    const trimmed = text.trim();
    if (!trimmed.startsWith("(") || !trimmed.endsWith(")")) {
        return false;
    }

    let depth = 0;
    let inString = false;

    for (let i = 0; i < trimmed.length; i += 1) {
        const ch = trimmed[i];
        const prev = trimmed[i - 1];

        if (ch === '"' && prev !== "\\") {
            inString = !inString;
        }
        if (inString) {
            continue;
        }

        if (ch === "(") depth += 1;
        if (ch === ")") depth -= 1;

        if (depth === 0 && i < trimmed.length - 1) {
            return false;
        }
    }

    return depth === 0;
}

function formatLogicalExpression(
    value: string,
    options: { tabSize: number; insertSpaces: boolean },
    baseIndentLevel = 0
): string {
    const trimmed = value.trim();

    const arrayFormatted = formatArrayIfNeeded(trimmed, options);
    if (arrayFormatted) {
        return arrayFormatted;
    }

    if (isWrappedInParens(trimmed)) {
        const inner = trimmed.slice(1, -1);
        const innerIndentLevel = baseIndentLevel + 1;
        const innerIndent = indent(innerIndentLevel, options);
        const closeIndent = indent(baseIndentLevel, options);
        const formattedInner = formatLogicalExpression(inner, options, 0);
        const indentedInner = formattedInner
            .split("\n")
            .map((line) => `${innerIndent}${line}`)
            .join("\n");
        return ["(", indentedInner, `${closeIndent})`].join("\n");
    }

    const { segments, connectors } = splitTopLevelLogical(trimmed);
    if (segments.length === 0 || connectors.length === 0) {
        return trimmed;
    }

    const continuationIndent = indent(baseIndentLevel + 1, options);
    const lines: string[] = [];

    for (let i = 0; i < segments.length; i += 1) {
        const connector = connectors[i];
        const formattedSegment = formatLogicalExpression(
            segments[i],
            options,
            baseIndentLevel
        );
        const prefix = i > 0 ? continuationIndent : "";
        const suffix = connector ? ` ${connector}` : "";
        lines.push(`${prefix}${formattedSegment}${suffix}`.trimEnd());
    }

    return lines.join("\n");
}

function formatClauseText(
    text: string,
    options: { tabSize: number; insertSpaces: boolean },
    clauseIndentLevel: number
): string {
    const trimmed = text.trim();

    if (trimmed.includes('"')) {
        return trimmed;
    }

    const { segments, connectors } = splitTopLevelLogical(trimmed);
    if (segments.length === 0 || connectors.length < 2) {
        return trimmed;
    }

    const continuationIndent = indent(1, options);
    const lines: string[] = [];

    for (let i = 0; i < segments.length; i += 1) {
        if (i === 0) {
            lines.push(segments[i].trim());
            continue;
        }
        const connector = connectors[i - 1];
        const connectorText = connector ? `${connector} ` : "";
        lines.push(`${continuationIndent}${connectorText}${segments[i].trim()}`);
    }

    return lines.join("\n");
}

function formatClauses(
    clauses: Array<{ type: "when" | "otherwise"; text: string; depth: number }>,
    options: { tabSize: number; insertSpaces: boolean },
    inlineFirst: boolean
): string {
    if (!clauses.length) {
        return "";
    }

    const baseIndentLevel = 1;
    const lines: string[] = [];

    clauses.forEach((clause, index) => {
        const clauseIndentLevel = baseIndentLevel + clause.depth;
        const clauseIndent = indent(clauseIndentLevel, options);
        const clauseText = formatClauseText(clause.text, options, clauseIndentLevel);
        const clauseLine = `${clause.type} ${clauseText}`.trimEnd();

        if (index === 0 && inlineFirst) {
            lines.push(clauseLine);
            return;
        }

        const indented = clauseLine
            .split("\n")
            .map((line) => `${clauseIndent}${line}`)
            .join("\n");
        lines.push(indented);
    });

    return lines.join("\n");
}

function formatValue(
    value: string,
    options: { tabSize: number; insertSpaces: boolean }
): string {
    const trimmed = value.trim();

    const arrayFormatted = formatArrayIfNeeded(trimmed, options);
    if (arrayFormatted) {
        return arrayFormatted;
    }

    return formatLogicalExpression(trimmed, options);
}

function printNode(
    node: any,
    options: { tabSize: number; insertSpaces: boolean; printWidth: number }
): any {
    if (Array.isArray(node)) {
        return node.map((n) => printNode(n, options)).join("\n");
    }

    switch (node.type) {
        case "assignment": {
            if (node.clauses?.length) {
                return `${node.name}: \n${formatClauses(node.clauses, options, false)}`;
            }
            return `${node.name}: ${formatValue(node.value, options)}`;
        }
        case "initialization": {
            if (node.clauses?.length) {
                const printedClauses = formatClauses(node.clauses, options, true);
                const clauseLines = printedClauses.split("\n");
                if (clauseLines.length === 1) {
                    return `${node.name} = ${clauseLines[0]}`;
                }
                const rest = clauseLines.slice(1).join("\n");
                return `${node.name} = ${clauseLines[0]}\n${rest}`;
            }
            const formattedValue = formatValue(node.value, options);
            if (formattedValue.includes("\n")) {
                if (formattedValue.trimStart().startsWith("[")) {
                    return `${node.name} = ${formattedValue}`;
                }
                const indented = formattedValue
                    .split("\n")
                    .map((line, index) => (index === 0 ? line : `${indent(1, options)}${line}`))
                    .join("\n");
                return `${node.name} = \n${indented}`;
            }
            return `${node.name} = ${formattedValue}`;
        }
        case "blank":
            return "";
        case "raw":
            return node.value;
        default:
            return node.raw ?? "";
    }
}
