import { modelTag, modelType } from "@/db/schema";
import type { ActionT } from "./labels";

export type ModelType = (typeof modelType.enumValues)[number];
export type ModelTag = (typeof modelTag.enumValues)[number];

// Which tags each type allows. Types not listed (and no type at all) allow none.
export const TAGS_BY_TYPE: Partial<Record<ModelType, readonly ModelTag[]>> = {
  truck: [
    "rigid",
    "articulated",
    "tipper",
    "tanker",
    "tractor_unit",
    "lowboy",
    "tautliner",
    "refrigerated",
    "flatbed",
    "special",
    "crane_mounted",
  ],
  crane: ["lattice", "telescopic", "tower", "all_terrain", "carry_deck", "rough_terrain", "heavy_lift"],
  excavator: ["tracked", "wheeled", "front_shovel", "backhoe", "mining", "civil_works"],
  dumper: ["articulated", "rigid", "site"],
  loader: ["wheeled", "tracked", "forestry", "mining"],
  bulldozer: ["mining", "civil_works"],
  motor_grader: ["mining", "civil_works"],
};

export function tagsForType(type: ModelType | null): readonly ModelTag[] {
  return (type && TAGS_BY_TYPE[type]) || [];
}

// Submitted tags -> unique values in the enum's order. Anything unknown or not
// allowed for the type (any tag at all without a type) throws.
export function parseTags(values: readonly string[], type: ModelType | null, t: ActionT): ModelTag[] {
  const allowed = new Set<string>(tagsForType(type));
  const chosen = new Set<string>();
  for (const value of values) {
    if (!allowed.has(value)) throw new Error(t("invalidTag"));
    chosen.add(value);
  }
  return modelTag.enumValues.filter((tag) => chosen.has(tag));
}

// Tags the list filter offers: every tag, or only those of the filtered type.
export function filterTagOptions(type: ModelType | null): readonly ModelTag[] {
  return type ? tagsForType(type) : modelTag.enumValues;
}
