import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
import { schemas, partMeta } from './schemas.mjs';
import { ENTITY_TYPES } from './lib/registry.mjs';
import { SOURCE_DOCS_DIR, sourceDocId } from './lib/source-docs.mjs';
import { isDesigner } from './lib/target.mjs';

// One collection per entity type that has files. The collection entry ID is the
// canonical ID from frontmatter, never the filename.
const entityCollections = Object.fromEntries(
  Object.entries(ENTITY_TYPES)
    .filter(([, spec]) => fs.existsSync(`./src/content/${spec.dir}`))
    .map(([type, spec]) => [
      spec.collection,
      defineCollection({
        loader: glob({
          pattern: '**/[^_]*.{md,yaml,yml}',
          base: `./src/content/${spec.dir}`,
          generateId: ({ data }) => String(data.id),
        }),
        schema: schemas[type as keyof typeof schemas],
      }),
    ]),
);

// Original exports, read in place for migration review. Campaign Synopsis is retired;
// the current set has twelve documents. See COLONY_SOURCE_DOCS_DIR in source-docs.mjs.
// Designer build only; the GM book does not load these files.
const sourceDocs = isDesigner
  ? {
      sourceDocs: defineCollection({
        loader: glob({ pattern: '*.md', base: pathToFileURL(SOURCE_DOCS_DIR), generateId: ({ entry }) => sourceDocId(entry) }),
      }),
    }
  : {};

export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema({ extend: partMeta }) }),
  ...entityCollections,
  ...sourceDocs,
};
