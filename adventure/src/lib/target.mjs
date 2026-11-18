// Which book is being built. "gm" is the default and the only build that ships.
// "designer" adds source documents, designer notes, migration and production status.
export const BOOK_TARGET = process.env.BOOK_TARGET === 'designer' ? 'designer' : 'gm';
export const isDesigner = BOOK_TARGET === 'designer';
export const BASE = '/docs';
