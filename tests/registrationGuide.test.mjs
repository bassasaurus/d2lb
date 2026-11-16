import test from 'node:test';
import assert from 'node:assert/strict';
import { guidePhotoCrop } from '../app/ocr/guideCrop.mjs';

test('maps the on-screen guide to a matching photo aspect ratio', () => {
  assert.deepEqual(guidePhotoCrop({ width: 1000, height: 1000 }, { width: 1000, height: 1000 }), { originX: 80, originY: 360, width: 840, height: 280 });
  assert.deepEqual(guidePhotoCrop({ width: 3000, height: 4000 }, { width: 300, height: 400 }), { originX: 240, originY: 1440, width: 2520, height: 1120 });
});
test('accounts for horizontal image cropping in a portrait aspect-fill preview', () => {
  assert.deepEqual(guidePhotoCrop({ width: 4000, height: 3000 }, { width: 300, height: 400 }), { originX: 1055, originY: 1080, width: 1890, height: 840 });
});
test('accounts for vertical image cropping in a landscape aspect-fill preview', () => {
  assert.deepEqual(guidePhotoCrop({ width: 3000, height: 4000 }, { width: 400, height: 300 }), { originX: 240, originY: 1685, width: 2520, height: 630 });
});
test('fractional layout sizes produce integer crops wholly inside the image', () => {
  const image = { width: 3024, height: 4032 };
  const crop = guidePhotoCrop(image, { width: 303.4, height: 419.8 });
  assert.ok(Object.values(crop).every(Number.isInteger));
  assert.ok(crop.originX >= 0 && crop.originY >= 0);
  assert.ok(crop.width > 0 && crop.height > 0);
  assert.ok(crop.originX + crop.width <= image.width && crop.originY + crop.height <= image.height);
});
test('missing or invalid layout dimensions stop scanning instead of using the entire image', () => {
  for (const preview of [null, { width: 0, height: 400 }, { width: NaN, height: 400 }])
    assert.throws(() => guidePhotoCrop({ width: 3000, height: 4000 }, preview), /dimensions/);
});
