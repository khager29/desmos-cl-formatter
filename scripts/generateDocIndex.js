const fs = require("fs");
const path = require("path");

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

function isSimpleIdentifier(line) {
    return /^[A-Za-z_][A-Za-z0-9_]*$/.test(line);
}

function nextNonEmpty(lines, startIndex) {
    for (let i = startIndex; i < lines.length; i += 1) {
        const trimmed = lines[i].trim();
        if (trimmed) {
            return trimmed;
        }
    }
    return "";
}

function isTypeDescription(line) {
    return (
        line.startsWith("Represents ") ||
        line.startsWith("Contains ") ||
        line.startsWith("The ") ||
        line.startsWith("Represents the ")
    );
}

function isFunctionDescription(line) {
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

function addUnique(list, value) {
    if (!list.includes(value)) {
        list.push(value);
    }
}

function extractIdentifiersFromCode(text) {
    const functions = [];
    const attributes = [];

    const functionCallRegex = /\b([A-Za-z_][A-Za-z0-9_]*)\s*\(/g;
    const memberCallRegex = /\.([A-Za-z_][A-Za-z0-9_]*)\s*\(/g;
    const memberPropertyRegex = /\.([A-Za-z_][A-Za-z0-9_]*)\b(?!\s*\()/g;
    const sinkRegex = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:\s*/gm;

    let match;
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

function generateDocIndex() {
    const docPath = path.join(
        __dirname,
        "..",
        "src",
        "resources",
        "documentation.txt",
    );

    if (!fs.existsSync(docPath)) {
        console.error("documentation.txt not found at", docPath);
        process.exit(1);
    }

    const text = fs.readFileSync(docPath, "utf8");
    const lines = text.split(/\r?\n/);

    const index = {
        functions: [],
        attributes: [],
        types: [],
    };

    let section = "none";

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

    const outputPath = path.join(
        __dirname,
        "..",
        "src",
        "intellisense",
        "docIndex.json",
    );
    fs.writeFileSync(outputPath, JSON.stringify(index, null, 2));
    console.log("Generated docIndex.json with:");
    console.log(`  ${index.functions.length} functions`);
    console.log(`  ${index.attributes.length} attributes`);
    console.log(`  ${index.types.length} types`);
}

generateDocIndex();
