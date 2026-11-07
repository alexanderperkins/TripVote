export function isEndBeforeStart(start, end) {
  return Boolean(start && end && end < start);
}
