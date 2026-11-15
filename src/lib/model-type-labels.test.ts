import { describe, expect, it } from "vitest";
import { modelTag, modelType } from "@/db/schema";
import en from "../../messages/en.json";
import es from "../../messages/es.json";

const EXPECTED_TYPES = [
  "truck",
  "crane",
  "excavator",
  "backhoe_loader",
  "dumper",
  "loader",
  "bulldozer",
  "paver",
  "compactor",
  "motor_grader",
  "semi_trailer",
  "trailer",
  "cargo",
  "attachment",
];

const EXPECTED_TAGS = [
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
  "lattice",
  "telescopic",
  "tower",
  "all_terrain",
  "carry_deck",
  "rough_terrain",
  "heavy_lift",
  "tracked",
  "wheeled",
  "front_shovel",
  "backhoe",
  "mining",
  "civil_works",
  "site",
  "forestry",
];

// Exact labels per language. Pinned so a language swap between the two message
// files (every key present, wrong language) cannot slip through.
const EXPECTED_LABELS = {
  modelType: {
    es: {
      truck: "Camión", crane: "Grúa", excavator: "Excavadora",
      backhoe_loader: "Retroexcavadora", dumper: "Dumper", loader: "Cargadora",
      bulldozer: "Bulldozer", paver: "Asfaltadora", compactor: "Compactador",
      motor_grader: "Motoniveladora", semi_trailer: "Semirremolque", trailer: "Remolque",
      cargo: "Carga", attachment: "Accesorio",
    },
    en: {
      truck: "Truck", crane: "Crane", excavator: "Excavator",
      backhoe_loader: "Backhoe loader", dumper: "Dumper", loader: "Loader",
      bulldozer: "Bulldozer", paver: "Asphalt paver", compactor: "Compactor",
      motor_grader: "Motor grader", semi_trailer: "Semi-trailer", trailer: "Trailer",
      cargo: "Cargo", attachment: "Attachment",
    },
  },
  modelTag: {
    es: {
      rigid: "Rígido", articulated: "Articulado", tipper: "Volquete", tanker: "Cisterna",
      tractor_unit: "Tractora", lowboy: "Góndola", tautliner: "Tautliner",
      refrigerated: "Frigorífico", flatbed: "Plataforma", special: "Especial",
      crane_mounted: "Grúa", lattice: "Celosía", telescopic: "Telescópica", tower: "Torre",
      all_terrain: "Todoterreno", carry_deck: "Carry deck", rough_terrain: "Rough terrain",
      heavy_lift: "Gran tonelaje (>250 t)", tracked: "Orugas", wheeled: "Ruedas",
      front_shovel: "Frontal", backhoe: "Retro", mining: "Minería", civil_works: "Obra civil",
      site: "Obra", forestry: "Forestal",
    },
    en: {
      rigid: "Rigid", articulated: "Articulated", tipper: "Tipper", tanker: "Tanker",
      tractor_unit: "Tractor unit", lowboy: "Lowboy", tautliner: "Tautliner",
      refrigerated: "Refrigerated", flatbed: "Flatbed", special: "Special",
      crane_mounted: "Crane-mounted", lattice: "Lattice", telescopic: "Telescopic", tower: "Tower",
      all_terrain: "All-terrain", carry_deck: "Carry deck", rough_terrain: "Rough terrain",
      heavy_lift: "Heavy lift (>250 t)", tracked: "Tracked", wheeled: "Wheeled",
      front_shovel: "Front shovel", backhoe: "Backhoe", mining: "Mining", civil_works: "Civil works",
      site: "Site", forestry: "Forestry",
    },
  },
} as const;

describe("label languages", () => {
  for (const namespace of ["modelType", "modelTag"] as const) {
    for (const [name, messages] of [["en", en], ["es", es]] as const) {
      it(`${namespace} labels are in ${name}`, () => {
        const labels = (messages as unknown as Record<string, Record<string, string>>)[namespace];
        expect(labels).toEqual(EXPECTED_LABELS[namespace][name]);
      });
    }
  }
});

const cases = [
  { namespace: "modelType", values: modelType.enumValues, expected: EXPECTED_TYPES },
  { namespace: "modelTag", values: modelTag.enumValues, expected: EXPECTED_TAGS },
] as const;

for (const { namespace, values, expected } of cases) {
  describe(`${namespace} enum and labels`, () => {
    it("holds the expected values in order", () => {
      expect([...values]).toEqual(expected);
    });

    for (const [name, messages] of [["en", en], ["es", es]] as const) {
      it(`labels every value in ${name}`, () => {
        const labels = (messages as unknown as Record<string, Record<string, string>>)[namespace] ?? {};
        for (const value of values) {
          expect(labels[value]?.trim(), `${name}.${namespace}.${value}`).toBeTruthy();
        }
      });
    }

    it("has the same keys in both languages, and none beyond the enum", () => {
      const keys = (messages: unknown) =>
        Object.keys((messages as unknown as Record<string, Record<string, string>>)[namespace] ?? {}).sort();
      expect(keys(es)).toEqual(keys(en));
      expect(keys(en)).toEqual([...values].sort());
    });
  });
}
