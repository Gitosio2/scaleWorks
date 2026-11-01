/**
 * How a model is called on screen: "brand name". Models created before the
 * brand column existed have no brand and keep their full title in `name`, so
 * this returns it unchanged for them.
 */
export function modelTitle(brand: string | null | undefined, name: string) {
  const b = brand?.trim();
  return b ? `${b} ${name}` : name;
}
