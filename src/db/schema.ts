import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// Every table has a `userId` so each user only sees their own data.
// It will reference the auth provider's user id once auth is set up.

export const supplyStatus = pgEnum("supply_status", [
  "to_order",
  "ordered",
  "in_hand",
]);

// Stable keys only; labels live in messages/*.json under "consumableCategory".
export const consumableCategory = pgEnum("consumable_category", [
  "paint",
  "tools",
  "glue",
  "other",
]);

// What kind of vehicle or machine a model depicts. Stable keys only; labels live
// in messages/*.json under "modelType". Optional: existing models have none.
export const modelType = pgEnum("model_type", ["truck", "crane", "machine"]);

export const modelPhase = pgEnum("model_phase", [
  "not_started",
  "pending_decal_design",
  "pending_painting",
  "pending_decals",
  "pending_varnish",
  "pending_assembly",
  "finished",
]);

// Only one deposit is tracked per model; "paid" means settled in full.
export const paymentStatus = pgEnum("payment_status", [
  "none",
  "deposit_paid",
  "paid",
]);

// An accepted quote is converted into a model and deleted, so there is no
// "accepted" state.
export const quoteStatus = pgEnum("quote_status", ["open", "rejected"]);

// Prices are stored as integer cents to avoid floating-point rounding errors.

export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  // Free text (email or phone); only the name is required.
  contact: text("contact"),
  company: text("company"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const models = pgTable(
  "models",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    // RESTRICT: a client with models cannot be deleted, even by a concurrent
    // request that slips past the application-level check.
    clientId: uuid("client_id").references(() => clients.id, {
      onDelete: "restrict",
    }),
    // Manufacturer of the scale model (e.g. "Renault"). Optional: models created
    // before this column kept the brand inside `name`. Show them together with
    // modelTitle(brand, name).
    brand: text("brand"),
    name: text("name").notNull(),
    type: modelType("type"),
    // Company of the real-world subject (e.g. an airline or car brand).
    company: text("company"),
    priceCents: integer("price_cents"),
    phase: modelPhase("phase").notNull().default("not_started"),
    requestedDate: date("requested_date"),
    estimatedDate: date("estimated_date"),
    paymentStatus: paymentStatus("payment_status").notNull().default("none"),
    // Only set while paymentStatus is "deposit_paid". The remaining amount is
    // never stored: it is priceCents - depositCents.
    depositCents: integer("deposit_cents"),
    // Shown on the public gallery once finished. Off by default: nothing about a
    // model is public until the owner opts in.
    published: boolean("published").notNull().default(false),
    // Free-text private notes about the build. Never shown on the public gallery.
    notes: text("notes"),
    // Set by hand when the client has not paid and work is paused; null otherwise.
    // Independent of the phase, which keeps showing how far the build got.
    paymentHoldAt: timestamp("payment_hold_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("models_user_idx").on(t.userId),
    check(
      "models_deposit_consistent",
      sql`(${t.paymentStatus} = 'deposit_paid' AND ${t.depositCents} IS NOT NULL AND ${t.depositCents} > 0) OR (${t.paymentStatus} <> 'deposit_paid' AND ${t.depositCents} IS NULL)`,
    ),
  ],
);

// Photos of a model. Only storage keys live here (never URLs), so the storage
// provider can change without rewriting data; see lib/storage.ts.
export const modelImages = pgTable(
  "model_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    modelId: uuid("model_id")
      .notNull()
      .references(() => models.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    // Full-size and thumbnail objects.
    key: text("key").notNull(),
    thumbKey: text("thumb_key").notNull(),
    // The lowest position is the cover (setting a cover may go below zero).
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("model_images_model_idx").on(t.modelId, t.position)],
);

export const quotes = pgTable(
  "quotes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    clientId: uuid("client_id").references(() => clients.id, {
      onDelete: "restrict",
    }),
    title: text("title").notNull(),
    priceCents: integer("price_cents"),
    status: quoteStatus("status").notNull().default("open"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("quotes_user_idx").on(t.userId)],
);

// Parts kept in the warehouse, counted by unit. Separate from `parts` (which
// has no quantity and ties a purchase to a model or quote).
export const stockComponents = pgTable(
  "stock_components",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    brand: text("brand"),
    reference: text("reference"),
    description: text("description").notNull(),
    store: text("store"),
    url: text("url"),
    // Price of one unit, in cents.
    priceCents: integer("price_cents"),
    quantity: integer("quantity").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("stock_components_user_idx").on(t.userId),
    check("stock_components_quantity_non_negative", sql`${t.quantity} >= 0`),
  ],
);

// A part belongs to one model OR one quote, or to neither (a loose purchase added
// from Pending expenses). Converting a quote moves its parts to the new model.
export const parts = pgTable(
  "parts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    modelId: uuid("model_id").references(() => models.id, {
      onDelete: "cascade",
    }),
    quoteId: uuid("quote_id").references(() => quotes.id, {
      onDelete: "cascade",
    }),
    brand: text("brand"),
    reference: text("reference"),
    description: text("description").notNull(),
    priceCents: integer("price_cents"),
    store: text("store"),
    url: text("url"),
    status: supplyStatus("status").notNull().default("to_order"),
    // Payment is separate from supply: a part can be ordered or in hand and still
    // unpaid. Unpaid parts of models that were bought feed "Pending expenses".
    paid: boolean("paid").notNull().default(false),
    // Set when the part was taken from the warehouse. Its cost is then derived
    // live (component unit price x quantity), never stored in priceCents.
    // RESTRICT: a component used by a part cannot be deleted.
    stockComponentId: uuid("stock_component_id").references(
      () => stockComponents.id,
      { onDelete: "restrict" },
    ),
    // Units taken from stock; set exactly when stockComponentId is.
    quantity: integer("quantity"),
  },
  (t) => [
    // At most one owner. A part with neither is a "loose" purchase added from
    // Pending expenses, not tied to any model or quote.
    check(
      "parts_at_most_one_owner",
      sql`NOT (${t.modelId} IS NOT NULL AND ${t.quoteId} IS NOT NULL)`,
    ),
    // Stock parts only exist on models (never on quotes or loose), with a
    // positive quantity; plain parts carry no quantity.
    check(
      "parts_stock_link_consistent",
      sql`(${t.stockComponentId} IS NULL AND ${t.quantity} IS NULL) OR (${t.stockComponentId} IS NOT NULL AND ${t.quantity} > 0 AND ${t.modelId} IS NOT NULL)`,
    ),
  ],
);

// General supplies (thinner, primer, some paints) reused across models.
export const consumables = pgTable("consumables", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  store: text("store"),
  description: text("description").notNull(),
  priceCents: integer("price_cents"),
  reference: text("reference"),
  status: supplyStatus("status").notNull().default("to_order"),
  category: consumableCategory("category").notNull().default("other"),
  // Manual color as "#rrggbb"; when null the swatch falls back to a RAL code in `reference`.
  colorHex: text("color_hex"),
  // Inactive = used up or broken. The row is kept so price and store stay
  // consultable, and it can still be linked from models it was used on.
  active: boolean("active").notNull().default(true),
});

// Many-to-many: which consumables were used on which model.
export const modelConsumables = pgTable(
  "model_consumables",
  {
    modelId: uuid("model_id")
      .notNull()
      .references(() => models.id, { onDelete: "cascade" }),
    consumableId: uuid("consumable_id")
      .notNull()
      .references(() => consumables.id, { onDelete: "cascade" }),
    // Optional amount used, as a fraction of one unit (0.5 = half a pot).
    quantity: numeric("quantity", { precision: 8, scale: 5 }),
  },
  (t) => [primaryKey({ columns: [t.modelId, t.consumableId] })],
);

// One row per work session; total hours = SUM(hours) for a model.
export const timeEntries = pgTable("time_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  modelId: uuid("model_id")
    .notNull()
    .references(() => models.id, { onDelete: "cascade" }),
  workedOn: date("worked_on").notNull(),
  minutes: integer("minutes").notNull(),
});

export * from "./auth-schema";
