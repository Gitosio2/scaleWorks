export type ProfitabilityInput = {
  priceCents: number | null;
  costCents: number;
  minutes: number;
};

export type Profitability = {
  profitCents: number | null;
  centsPerHour: number | null;
};

const perHour = (profitCents: number, minutes: number) =>
  minutes > 0 ? Math.round((profitCents * 60) / minutes) : null;

// Profit = price - cost (parts + consumables). The hourly rate needs tracked time;
// both are unknown without a price.
export function profitability({ priceCents, costCents, minutes }: ProfitabilityInput): Profitability {
  if (priceCents === null) return { profitCents: null, centsPerHour: null };
  const profitCents = priceCents - costCents;
  return { profitCents, centsPerHour: perHour(profitCents, minutes) };
}

// Totals over several models. Models without a price are skipped. The hourly rate is
// the profit of the models with tracked time over their total time, so a model with
// no time logged does not drag it up.
export function aggregateProfitability(models: ProfitabilityInput[]) {
  let count = 0;
  let profitCents = 0;
  let timedProfitCents = 0;
  let timedMinutes = 0;
  for (const m of models) {
    const p = profitability(m);
    if (p.profitCents === null) continue;
    count += 1;
    profitCents += p.profitCents;
    if (m.minutes > 0) {
      timedProfitCents += p.profitCents;
      timedMinutes += m.minutes;
    }
  }
  return {
    count,
    profitCents,
    avgProfitCents: count > 0 ? Math.round(profitCents / count) : null,
    centsPerHour: perHour(timedProfitCents, timedMinutes),
  };
}
