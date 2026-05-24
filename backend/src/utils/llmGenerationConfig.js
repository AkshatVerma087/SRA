export const TEMPERATURES = Object.freeze({
    productOwner: 0.7, // Discovery benefits from mild expansion, still constrained by traceability rules.
    architect: 0.4, // Architecture should be deterministic while allowing domain modeling judgment.
    developer: 0.4, // SRS prose needs consistency more than creativity.
    developerRequirements: 0.5, // NFR/interface generation sometimes needs a little broader coverage.
    critic: 0.3, // Audits should be strict and repeatable.
    evaluator: 0.2, // Scoring tasks should be highly deterministic.
    logic: 0.0,
});

export const OUTPUT_TOKEN_LIMITS = Object.freeze({
    smallJson: 2048,
    mediumJson: 4096,
    architectSection: 6144,
    srsShell: 8192,
    srsFeatures: 16384,
    srsRequirements: 20000,
    srsAppendices: 12000,
    srsRefinement: 18000,
});
