import type { ParamMatcher } from '@sveltejs/kit';

/** IndexNow keys are 8 to 128 letters, numbers or dashes. */
export const match: ParamMatcher = (param) => /^[A-Za-z0-9-]{8,128}$/.test(param);
