import fs from 'node:fs';
import { recognizeRegistrationImage } from '../app/ocr/recognizeImage.mjs';
import { registrationScanReview, registrationReview, normalizeRegistration } from '../app/ocr/registrationCandidates.mjs';

const input = process.argv[2];
if (!input) {
  console.error('Usage: node scripts/ocr-benchmark.mjs <native-results.json>');
  process.exit(2);
}
const cases = JSON.parse(fs.readFileSync(input, 'utf8'));
if (!Array.isArray(cases) || !cases.length || cases.some(row => typeof row.expected !== 'string' || !Array.isArray(row.passes)))
  throw new Error('Expected nonempty cases with expected registration and native OCR passes.');
const rows = await Promise.all(cases.map(async row => {
  const primary = { passes: row.passes, lowConfidence: row.lowConfidence };
  let usedFallback = false;
  const result = Array.isArray(row.legacyLines) ? await recognizeRegistrationImage({
    enhanced: async () => primary,
    legacy: async () => { usedFallback = true; return row.legacyLines; },
  }) : primary;
  const review = registrationScanReview(result.passes);
  const displayed = registrationReview(review.candidates);
  return {
    case: row.case, source: row.source, expected: row.expected, displayed,
    correct: normalizeRegistration(displayed) === normalizeRegistration(row.expected),
    interpretedDigits: review.needsVerification,
    lowConfidence: Boolean(result.lowConfidence), usedFallback,
    candidates: review.candidates,
  };
}));
const correct = rows.filter(row => row.correct).length;
console.log(JSON.stringify({
  description: 'Direct-image displayed-result accuracy; not physical-camera first-scan accuracy or a holdout estimate.',
  total: rows.length, correct, accuracyPercent: Math.round(correct / rows.length * 1000) / 10,
  blank: rows.filter(row => !row.displayed).length,
  incorrect: rows.filter(row => row.displayed && !row.correct).length,
  correctWithDigitInterpretation: rows.filter(row => row.correct && row.interpretedDigits).length,
  rows,
}, null, 2));
