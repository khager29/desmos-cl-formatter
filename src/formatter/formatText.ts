import { parseProgram } from "./parse";
import { printProgram } from "./print";

export const formatText = (
    text: string,
    options: { tabSize: number; insertSpaces: boolean; printWidth: number }
) => {
    console.log("formatting...");
    const ast = parseProgram(text);
    return printProgram(ast, options);
};
