import * as fs from "fs";
import * as path from "path";

type DocIndex = {
    functions: string[];
    attributes: string[];
    types: string[];
};

const DEFAULT_INDEX: DocIndex = {
    functions: [],
    attributes: [],
    types: [],
};

const STOP_WORDS = new Set([
    "No",
    "Search",
    "Join",
    "Welcome",
    "Getting",
    "Components",
    "Advanced",
    "Index",
    "Logic",
    "Types",
    "Other",
    "Deprecated",
    "Logical",
    "Defined",
    "Comparing",
    "Basic",
    "Complex",
    "Utility",
    "when",
    "otherwise",
    "and",
    "or",
    "not",
]);

function isSimpleIdentifier(line: string): boolean {
    return /^[A-Za-z_][A-Za-z0-9_]*$/.test(line);
}

function nextNonEmpty(lines: string[], startIndex: number): string {
    for (let i = startIndex; i < lines.length; i += 1) {
        const trimmed = lines[i].trim();
        if (trimmed) {
            return trimmed;
        }
    }
    return "";
}

function isTypeDescription(line: string): boolean {
    return (
        line.startsWith("Represents ") ||
        line.startsWith("Contains ") ||
        line.startsWith("The ") ||
        line.startsWith("Represents the ")
    );
}

function isFunctionDescription(line: string): boolean {
    return (
        line.startsWith("Takes ") ||
        line.startsWith("Create ") ||
        line.startsWith("Creates ") ||
        line.startsWith("Turns ") ||
        line.startsWith("Force ") ||
        line.startsWith("Show ") ||
        line.startsWith("Get ") ||
        line.startsWith("Set ")
    );
}

function addUnique(list: string[], value: string) {
    if (!list.includes(value)) {
        list.push(value);
    }
}

function extractIdentifiersFromCode(
    text: string
): { functions: string[]; attributes: string[] } {
    const functions: string[] = [];
    const attributes: string[] = [];

    const functionCallRegex = /\b([A-Za-z_][A-Za-z0-9_]*)\s*\(/g;
    const memberCallRegex = /\.([A-Za-z_][A-Za-z0-9_]*)\s*\(/g;
    const memberPropertyRegex = /\.([A-Za-z_][A-Za-z0-9_]*)\b(?!\s*\()/g;
    const sinkRegex = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:\s*/gm;

    let match: RegExpExecArray | null;
    while ((match = functionCallRegex.exec(text)) !== null) {
        const name = match[1];
        if (!STOP_WORDS.has(name)) {
            addUnique(functions, name);
        }
    }

    while ((match = memberCallRegex.exec(text)) !== null) {
        const name = match[1];
        if (!STOP_WORDS.has(name)) {
            addUnique(attributes, name);
            addUnique(functions, name);
        }
    }

    while ((match = memberPropertyRegex.exec(text)) !== null) {
        const name = match[1];
        if (!STOP_WORDS.has(name)) {
            addUnique(attributes, name);
        }
    }

    while ((match = sinkRegex.exec(text)) !== null) {
        const name = match[1];
        if (!STOP_WORDS.has(name)) {
            addUnique(functions, name);
        }
    }

    return { functions, attributes };
}

export function loadDocumentationIndex(extensionPath: string): DocIndex {
    const docPath = path.join(extensionPath, "documentation.txt");
    if (!fs.existsSync(docPath)) {
        return DEFAULT_INDEX;
    }

    const text = fs.readFileSync(docPath, "utf8");
    const lines = text.split(/\r?\n/);

    const index: DocIndex = {
        functions: [],
        attributes: [],
        types: [],
    };

    let section: "none" | "creating" | "attributes" = "none";

    for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i].trim();
        if (!line) {
            continue;
        }

        if (line === "Creating:") {
            section = "creating";
            continue;
        }
        if (line === "Attributes:") {
            section = "attributes";
            continue;
        }
        if (line.endsWith(":")) {
            section = "none";
            continue;
        }

        if (!isSimpleIdentifier(line)) {
            continue;
        }
        if (STOP_WORDS.has(line)) {
            continue;
        }

        if (section === "creating") {
            addUnique(index.functions, line);
            continue;
        }

        if (section === "attributes") {
            addUnique(index.attributes, line);
            continue;
        }

        const nextLine = nextNonEmpty(lines, i + 1);
        if (isTypeDescription(nextLine)) {
            addUnique(index.types, line);
            continue;
        }
        if (isFunctionDescription(nextLine)) {
            addUnique(index.functions, line);
            continue;
        }
    }

    const extracted = extractIdentifiersFromCode(text);
    extracted.functions.forEach((name) => addUnique(index.functions, name));
    extracted.attributes.forEach((name) => addUnique(index.attributes, name));

    return index;
}
