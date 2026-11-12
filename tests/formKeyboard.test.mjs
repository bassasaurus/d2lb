import test from 'node:test';
import assert from 'node:assert/strict';
import { focusedFieldOffset } from '../app/components/formKeyboard.mjs';

const viewport = { y: 100, height: 500 };
test('scrolls a field above the keyboard with a reading gap', () => {
  assert.equal(focusedFieldOffset({ field: { y: 420, height: 48 }, viewport, keyboardTop: 450, offset: 100 }), 130);
});
test('uses the smaller viewport when a persistent Save footer occupies space', () => {
  assert.equal(focusedFieldOffset({ field: { y: 420, height: 48 }, viewport: { y: 100, height: 350 }, keyboardTop: 500, offset: 100 }), 130);
});
test('leaves an already visible field in place', () => {
  assert.equal(focusedFieldOffset({ field: { y: 200, height: 48 }, viewport, keyboardTop: 450, offset: 100 }), 100);
});
test('reveals a field above the scrolled viewport without negative offsets', () => {
  assert.equal(focusedFieldOffset({ field: { y: 80, height: 48 }, viewport, keyboardTop: 450, offset: 100 }), 68);
  assert.equal(focusedFieldOffset({ field: { y: 80, height: 48 }, viewport, offset: 0 }), 0);
});
test('keeps the top of a large remarks field visible', () => {
  assert.equal(focusedFieldOffset({ field: { y: 200, height: 500 }, viewport, keyboardTop: 450, offset: 100 }), 188);
});
test('does not scroll when keyboard animation temporarily leaves no viewport', () => {
  assert.equal(focusedFieldOffset({ field: { y: 200, height: 48 }, viewport, keyboardTop: 100, offset: 100 }), 100);
});
