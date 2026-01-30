import docIndexData from "./docIndex.json";

export type DocIndex = {
    functions: string[];
    attributes: string[];
    types: string[];
};

export function getDocumentationIndex(): DocIndex {
    return docIndexData as DocIndex;
}
