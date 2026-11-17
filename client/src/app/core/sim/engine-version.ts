// Identifies the calculation semantics of the simulation engine (BOARD-GAME-REVIEW §14.8).
// Recorded in every RulesVersion and Colony Turn. While no campaign is Live, the engine is a development
// version ('-dev') and may change; once a campaign activates against a version, that version is frozen and
// later changes ship as a new version (core/sim/vN), each with its own golden fixtures.
export const ENGINE_VERSION = 'v1-dev';
