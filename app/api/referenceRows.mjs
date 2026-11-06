// Older Django reference endpoints returned every row but inherited a spurious
// next-page link. Verify completeness from count before treating it as truncated.
export function completeReferenceRows(data) {
  if (!Array.isArray(data?.results) || data.results.some(row => !Number.isInteger(row.id))) {
    throw new Error('Invalid reference response; saved records were preserved.');
  }
  if (new Set(data.results.map(row => row.id)).size !== data.results.length) {
    throw new Error('Duplicate reference IDs; saved records were preserved.');
  }
  if (data.count !== undefined && (!Number.isInteger(data.count) || data.count !== data.results.length)) {
    throw new Error('Reference response was incomplete; saved records were preserved.');
  }
  if (data.next && data.count === undefined) {
    throw new Error('Reference response was incomplete; saved records were preserved.');
  }
  return data.results;
}
