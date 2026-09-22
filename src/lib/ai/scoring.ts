/**
 * Only quotes at or above this engagementScore (0-100, set by the model in
 * quotes.ts) get social posts generated for them. Every flagged quote is
 * still saved and shown regardless of score — this threshold only controls
 * how many auto-generated posts a reporter has to wade through, not what
 * they can see. Tune this if testers find results too sparse or too noisy.
 */
export const SOCIAL_POST_SCORE_THRESHOLD = 70;
