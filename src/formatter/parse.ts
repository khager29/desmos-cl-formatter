export function parseProgram(input: string): any[] {
    const lines = input.trim().split(/\r?\n/);
    let result: any[] = [];

    lines.forEach((line) => {
        const trimmedLine = line.trim();
        const assignmentMatch = trimmedLine.match(/(.*):\s*(.*)/);
        const initializationMatch = trimmedLine.match(/^(.*?)=\s*(.*)/);

        if (assignmentMatch) {
            const sink = assignmentMatch[1].trim();
            const value = assignmentMatch[2].trim();
            // find when, and, or, otherwise
            const whenChunks = value.split(/(\bwhen\b|\botherwise\b)/g);
            result.push({
                type: "assignment",
                name: sink,
                value: whenChunks.length === 1 ? value : "",
            });
            findChunks(whenChunks);
        } else if (initializationMatch) {
            const variableName = initializationMatch[1].trim();
            const value = initializationMatch[2].trim();
            const whenChunks = value.split(/(\bwhen\b|\botherwise\b)/g);
            result.push({
                type: "initialization",
                name: variableName,
                value: whenChunks.length === 1 ? value : "",
            });
            findChunks(whenChunks);
        } else if (trimmedLine) {
            result.push({
                type: "raw",
                value: trimmedLine,
            });
        }
    });
    function findChunks(whenChunks: string[]) {
        for (let i = 0, L = whenChunks.length; i < L; i++) {
            const chunk = whenChunks[i].trim();
            if (chunk === "when" || chunk === "otherwise") {
                result.push({
                    type: "condition",
                    conditionalType: chunk,
                    condition: whenChunks[i + 1].trim(),
                });
            }
        }
    }
    return result.length === 1 ? result[0] : result;
}
