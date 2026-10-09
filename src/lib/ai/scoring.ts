/**
 * Only quotes at or above this engagementScore (0-100, set by the model in
 * quotes.ts) get social posts generated for them. Every flagged quote is
 * still saved and shown regardless of score — this threshold only controls
 * how many auto-generated posts a reporter has to wade through, not what
 * they can see. Tune this if testers find results too sparse or too noisy.
 */
export const SOCIAL_POST_SCORE_THRESHOLD = 70;

/**
 * Quotes at or above this score earn the "Writes like butter" tag — a wink
 * for reporters, after Randy Quaid's line in The Paper. Set from real data
 * (2026-10-09): of 124 scored quotes the highest was 85 and none reached 90,
 * so a bar of 90+ would never fire; 82 is cleared by about 5% of quotes.
 * Raise it if the tag shows up too often, lower it if it never does.
 */
export const BUTTER_SCORE_THRESHOLD = 82;
