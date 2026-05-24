
const registry = new Map();

export const registerPromptVersion = (version, generatorFn) => {
    registry.set(version, generatorFn);
};

export const getPromptByVersion = (version) => {
    if (!registry.has(version)) {
        throw new Error(`Prompt version ${version} not found`);
    }
    return registry.get(version);
};

export const getLatestVersion = () => {
    const keys = Array.from(registry.keys());
    if (keys.length === 0) throw new Error('No prompt versions registered');

    // Proper semver sort: parse each "major.minor.patch" into numbers and compare.
    // This ensures registration ORDER does not determine the active version.
    return keys.sort((a, b) => {
        const [aMaj, aMin, aPatch] = a.split('.').map(Number);
        const [bMaj, bMin, bPatch] = b.split('.').map(Number);
        if (aMaj !== bMaj) return bMaj - aMaj;
        if (aMin !== bMin) return bMin - aMin;
        return bPatch - aPatch;
    })[0]; // First element after descending sort = highest version
};

export const listVersions = () => Array.from(registry.keys());
