type Clause = {
    type: "when" | "otherwise";
    text: string;
    depth: number;
};

function hasConditional(value: string): boolean {
    return /\bwhen\b|\botherwise\b/.test(value);
}

function parseClauses(value: string): Clause[] {
    const parts = value.split(/(\bwhen\b|\botherwise\b)/g);
    const clauses: Clause[] = [];
    let depth = 0;

    for (let i = 0; i < parts.length; i += 1) {
        const token = parts[i].trim();
        if (token !== "when" && token !== "otherwise") {
            continue;
        }
        const text = (parts[i + 1] ?? "").trim();
        const clauseDepth = depth;
        clauses.push({
            type: token,
            text,
            depth: clauseDepth,
        });

        if (token === "when") {
            // Heuristic: only increase nesting depth when another "when" follows
            // and this clause does not clearly contain a terminal result (like a string).
            let nextKeyword: string | null = null;
            for (let j = i + 2; j < parts.length; j += 1) {
                const candidate = parts[j].trim();
                if (candidate === "when" || candidate === "otherwise") {
                    nextKeyword = candidate;
                    break;
                }
            }
            const hasTerminalString = text.includes('"');
            if (nextKeyword === "when" && !hasTerminalString) {
                depth += 1;
            }
        } else {
            depth = Math.max(depth - 1, 0);
        }
    }

    return clauses;
}

function parseLine(line: string): any {
    const trimmedLine = line.trim();

    if (!trimmedLine) {
        return { type: "blank" };
    }

    const assignmentMatch = trimmedLine.match(/^(.*?):\s*(.*)$/);
    if (assignmentMatch) {
        const name = assignmentMatch[1].trim();
        const value = assignmentMatch[2].trim();
        if (hasConditional(value)) {
            return {
                type: "assignment",
                operator: ":",
                name,
                value: "",
                clauses: parseClauses(value),
            };
        }
        return {
            type: "assignment",
            operator: ":",
            name,
            value,
        };
    }

    const initializationMatch = trimmedLine.match(/^(.*?)=\s*(.*)$/);
    if (initializationMatch) {
        const name = initializationMatch[1].trim();
        const value = initializationMatch[2].trim();
        if (hasConditional(value)) {
            return {
                type: "initialization",
                operator: "=",
                name,
                value: "",
                clauses: parseClauses(value),
            };
        }
        return {
            type: "initialization",
            operator: "=",
            name,
            value,
        };
    }

    return {
        type: "raw",
        value: trimmedLine,
    };
}

export function parseProgram(input: string): any[] {
    // Preserve intentional blank lines inside the document.
    const lines = input.split(/\r?\n/);
    const result = lines.map((line) => parseLine(line));
    return result.length === 1 ? result[0] : result;
}
