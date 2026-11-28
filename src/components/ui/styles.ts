// Shared class strings so every form control and action looks the same.
export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export const cardClass =
  "flex flex-col gap-4 rounded-[12px] border border-line bg-surface p-5";

export const inputClass =
  "min-h-11 rounded-[8px] border border-input-border bg-input px-3 text-ink placeholder:text-muted";

// Small monospace uppercase caption: field labels, stat labels, meta lines.
export const captionClass =
  "font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-muted";

// A field caption wrapped in its own element (a <label for>, a <legend>).
export const labelTextClass = captionClass;

// A caption with its control inside. `field-label` (globals.css) puts the
// control and anything else nested back on the body font, so only the caption
// text is monospace. A caption wrapped in its own element takes labelTextClass.
export const labelClass = `field-label flex flex-col gap-1.5 ${labelTextClass}`;

// Accent call to action: safety-yellow fill under ink text. Used for the main
// action of a view and for the "Show more" button of long lists.
export const primaryButtonClass =
  "inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[8px] border-2 border-ink bg-accent px-[18px] font-display text-[17px] font-bold uppercase tracking-wide text-accent-fg hover:bg-accent-hover disabled:opacity-50";

export const dangerButtonClass =
  "inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[8px] bg-danger px-[18px] font-semibold text-white hover:opacity-90 disabled:opacity-50";

export const secondaryButtonClass =
  "inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[8px] border-2 border-ink bg-transparent px-[18px] font-semibold text-ink hover:bg-canvas";

// Links are ink like the text around them, so a soft underline marks them at
// rest and turns solid on hover.
export const linkUnderlineClass = "underline decoration-ink/35 underline-offset-4 hover:decoration-ink";

// A link inside running text or standing on its own line.
export const inlineLinkClass = `font-semibold text-brand ${linkUnderlineClass}`;

export const linkActionClass = `inline-flex min-h-11 cursor-pointer items-center px-1 text-sm ${inlineLinkClass}`;

export const dangerActionClass =
  "inline-flex min-h-11 cursor-pointer items-center px-1 text-sm font-semibold text-danger hover:underline";

export const listItemClass = "border-t border-line-soft py-4 first:border-t-0";
