#!/usr/bin/env node
// Writes JSON Schema for every entity type to schemas/, for YAML editor
// validation (add "# yaml-language-server: $schema=../../../schemas/<type>.schema.json")
// and as the basis of the Angular reference contract.
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'astro/zod';
import { schemas } from '../src/schemas.mjs';
import { ROOT } from '../src/lib/registry.mjs';

const out = path.join(ROOT, 'schemas');
fs.mkdirSync(out, { recursive: true });
for (const [type, schema] of Object.entries(schemas)) {
  const json = z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' });
  fs.writeFileSync(path.join(out, `${type}.schema.json`), `${JSON.stringify(json, null, 2)}\n`);
}
console.log(`✓ wrote ${Object.keys(schemas).length} schemas to ${path.relative(ROOT, out)}/`);
