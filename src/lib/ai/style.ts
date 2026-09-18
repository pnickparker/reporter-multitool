/**
 * Single source of truth for style guidance across all generation prompts.
 * Local-market style rules (decided to defer per-newsroom settings until
 * a UI exists for reporters to manage them) will get appended here later
 * without touching the prompts that reference this constant.
 */
export const AP_STYLE_INSTRUCTION =
  "Follow Associated Press (AP) Style conventions: AP abbreviation rules, numerals, punctuation, capitalization, and title usage.";
