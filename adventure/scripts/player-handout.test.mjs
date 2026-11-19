import test from 'node:test';
import assert from 'node:assert/strict';
import { playerHandout } from '../src/lib/player-handout.mjs';

test('exports only the selected audience, preserving record code and tables', () => {
  const body = 'GM solution\n\n:::player-facing\nA record.\n\n```text\nX: DOC.217\n```\n\n| Field | Value |\n|---|---|\n| I | 02 |\n:::\n\n:::secret\nHidden answer\n:::';
  const output = playerHandout(body, 'Records');
  assert.match(output, /```text\nX: DOC\.217\n```/);
  assert.match(output, /\| I \| 02 \|/);
  assert.doesNotMatch(output, /GM solution|Hidden answer|secret|player-facing/);
});

test('fails closed for nested private blocks or reference expansion', () => {
  assert.throws(() => playerHandout('::::player-facing\n:::secret\nAnswer\n:::\n::::', 'Bad'), /Nested directives/);
  assert.throws(() => playerHandout(':::player-facing\n::embed{#npc.secret}\n:::', 'Bad'), /Nested directives/);
  assert.throws(() => playerHandout('No marked player text', 'Bad'), /explicit/);
});
