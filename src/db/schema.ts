import { sql } from "drizzle-orm";
import {
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

export const modelPhase = pgEnum("model_phase", [
  "not_started",
  "pending_decal_design",
  "pending_painting",
  "pending_decals",
  "pending_varnish",
  "pending_assembly",
  "finished",
]);

export const quoteStatus = pgEnum("quote_status", [
  "open",
  "accepted",
  "rejected",
]);

// Prices are stored as integer cents to avoid floating-point rounding errors.

export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  contact: text("contact").notNull(),
  company: text("company"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const models = pgTable(
  "models",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    clientId: uuid("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    // Company of the real-world subject (e.g. an airline or car brand).
    company: text("company"),
    priceCents: integer("price_cents"),
    phase: modelPhase("phase").notNull().default("not_started"),
    requestedDate: date("requested_date"),
    estimatedDate: date("estimated_date"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("models_user_idx").on(t.userId)],
);

export const quotes = pgTable(
  "quotes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    clientId: uuid("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    priceCents: integer("price_cents"),
    status: quoteStatus("status").notNull().default("open"),
    // Set when the quote is converted into a model.
    convertedModelId: uuid("converted_model_id").references(() => models.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("quotes_user_idx").on(t.userId)],
);

// A part belongs to exactly one model OR one quote. Converting a quote
// moves its parts to the new model.
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
  },
  (t) => [
    check(
      "parts_one_owner",
      sql`(${t.modelId} IS NOT NULL) <> (${t.quoteId} IS NOT NULL)`,
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
