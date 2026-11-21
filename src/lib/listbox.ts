// Pure logic of the filter listbox (src/components/ui/filter-listbox.tsx): which
// option a key press moves to, what typing a few letters selects, and the option
// list shown. Kept free of React and the DOM so it can be unit tested.

export type ListboxKey = "ArrowDown" | "ArrowUp" | "Home" | "End";

// Index the active option moves to; -1 when there are no options. Does not wrap, as
// native selects do not. With nothing active yet (-1) both arrows land on the first option.
export function moveIndex(current: number, count: number, key: ListboxKey) {
  if (count === 0) return -1;
  switch (key) {
    case "ArrowDown":
      return Math.min(current + 1, count - 1);
    case "ArrowUp":
      return Math.max(current - 1, 0);
    case "Home":
      return 0;
    case "End":
      return count - 1;
  }
}

export const TYPEAHEAD_RESET_MS = 700;

// The letters typed so far: a new character extends the previous ones when it comes
// soon enough after them, otherwise it starts a new search.
export function typeaheadQuery(
  previous: string,
  previousAt: number,
  char: string,
  now: number,
  resetMs = TYPEAHEAD_RESET_MS,
) {
  return now - previousAt <= resetMs ? previous + char : char;
}

const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

// Index of the option whose label starts with what was typed, searching from the one
// after the active option (a repeated single letter cycles through its matches) or,
// for a longer prefix, from the active option itself; wraps around. -1 when none.
export function typeaheadIndex(labels: readonly string[], current: number, query: string) {
  const q = fold(query);
  if (!q || labels.length === 0) return -1;
  const first = q[0];
  const cycling = [...q].every((c) => c === first);
  const needle = cycling ? first : q;
  const start = cycling ? current + 1 : Math.max(current, 0);
  for (let i = 0; i < labels.length; i++) {
    const index = (start + i) % labels.length;
    if (fold(labels[index]).startsWith(needle)) return index;
  }
  return -1;
}

// The options to show: the empty ("all") option first unless `allLabel` is null, then
// the given ones, then the selected value as a plain option when it is not among them
// (a bookmarked value the data no longer has must still show as selected).
export function listboxOptions<T extends { value: string; label: string }>(
  options: readonly T[],
  allLabel: string | null,
  selected: string,
): Array<T | { value: string; label: string }> {
  const shown: Array<T | { value: string; label: string }> = [];
  if (allLabel !== null) shown.push({ value: "", label: allLabel });
  shown.push(...options);
  if (selected && !options.some((o) => o.value === selected)) {
    shown.push({ value: selected, label: selected });
  }
  return shown;
}
