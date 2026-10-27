import { customAlphabet } from 'nanoid';

export type IdPrefix = 'pst' | 'cat' | 'tag' | 'aut' | 'cmt' | 'rh' | 'sub' | 'log' | 'bkm' | 'eml';

const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

export const generateRandom = customAlphabet(BASE62, 32);

export function generateId(prefix: IdPrefix): string {
	return `${prefix}_${generateRandom()}`;
}
