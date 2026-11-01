// A model is "stalled" when it is still in the initial phase this many months
// after it was created. The dashboard card and the models list filter share it.
export const STALLED_MONTHS = 7;

/** Models created before this instant and still not started are stalled. */
export function stalledCutoff(now: Date) {
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - STALLED_MONTHS);
  return cutoff;
}
