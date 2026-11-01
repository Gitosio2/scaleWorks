"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { expenses, expenseStatus } from "@/db/schema";
import { parseEuros, type ActionT } from "@/lib/labels";
import { requireUser } from "@/lib/session";

type ExpenseStatus = (typeof expenseStatus.enumValues)[number];

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim() || null;
}

function parseStatus(value: string, t: ActionT): ExpenseStatus {
  if (!(expenseStatus.enumValues as readonly string[]).includes(value)) {
    throw new Error(t("invalidStatus"));
  }
  return value as ExpenseStatus;
}

async function parseExpense(formData: FormData) {
  const t = await getTranslations("actionErrors");
  const description = text(formData, "description");
  if (!description) throw new Error(t("descriptionRequired"));
  return {
    description,
    store: text(formData, "store"),
    priceCents: parseEuros(String(formData.get("price") ?? ""), t),
    status: parseStatus(String(formData.get("status")), t),
  };
}

export async function createExpense(formData: FormData) {
  const user = await requireUser();
  await db
    .insert(expenses)
    .values({ ...(await parseExpense(formData)), userId: user.id });
  revalidatePath("/expenses");
}

export async function updateExpense(id: string, formData: FormData) {
  const user = await requireUser();
  await db
    .update(expenses)
    .set(await parseExpense(formData))
    .where(and(eq(expenses.id, id), eq(expenses.userId, user.id)));
  revalidatePath("/expenses");
}

export async function updateExpenseStatus(id: string, status: string) {
  const user = await requireUser();
  const t = await getTranslations("actionErrors");
  await db
    .update(expenses)
    .set({ status: parseStatus(status, t) })
    .where(and(eq(expenses.id, id), eq(expenses.userId, user.id)));
  revalidatePath("/expenses");
}

export async function deleteExpense(id: string) {
  const user = await requireUser();
  await db
    .delete(expenses)
    .where(and(eq(expenses.id, id), eq(expenses.userId, user.id)));
  revalidatePath("/expenses");
}
