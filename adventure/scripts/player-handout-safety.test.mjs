// The player export refuses anything that could leak GM material (src/lib/player-handout.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { playerHandout, hasPlayerBlocks } from '../src/lib/player-handout.mjs';

const refuses = (body, msg) => assert.throws(() => playerHandout(body, 'T'), msg);
test('an unclosed block is refused, not exported to the end of the file', () => refuses(':::player-facing\nVisible\n\nHIDDEN GM TEXT\n', /not closed/));
test('raw HTML is refused', () => {
  refuses(':::player-facing\nA\n\n<!-- GM comment -->\n:::\n', /raw HTML/);
  refuses(':::player-facing\nA <span hidden>key</span>\n:::\n', /raw HTML/);
});
test('links and images are refused', () => {
  refuses(':::player-facing\nSee [x](/docs/running/gm-truths/).\n:::\n', /a link/);
  refuses(':::player-facing\n![map](/docs/maps/secret.png)\n:::\n', /an image/);
});
test('nested directives are refused', () => refuses(':::player-facing\n:::gm-note\nx\n:::\n:::\n', /Nested directives/));
test('a block label is left out; bare word:word prose is kept', () => {
  const out = playerHandout(':::player-facing[GM label]\nRecord C01:A and Note:secret.\n:::\n\n:::gm-note\nhidden\n:::\n', 'T');
  assert.equal(out, '# T\n\nRecord C01:A and Note:secret.\n');
});
test('hasPlayerBlocks', () => {
  assert.equal(hasPlayerBlocks(''), false);
  assert.equal(hasPlayerBlocks('Just GM prose.'), false);
  assert.equal(hasPlayerBlocks(':::player-facing\nx\n:::\n'), true);
});
