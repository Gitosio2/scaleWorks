import { sql } from "drizzle-orm";
import { models, parts, stockComponents } from "./schema";

// Total cost of a model's parts, as a SQL scalar subselect (null-safe, cents).
// Twin of partCostCents in lib/part-cost.ts: a part linked to stock costs the
// component's unit price times its quantity, any other part its own price.
// Used by the models list and the dashboard; the unit price is widened before
// multiplying so it cannot overflow int4.
export const modelPartsCostSql = sql`coalesce((
  select sum(
    case when ${parts.quantity} is not null
      then coalesce(${stockComponents.priceCents}, 0)::bigint * ${parts.quantity}
      else ${parts.priceCents}
    end
  )
  from ${parts}
  left join ${stockComponents} on ${stockComponents.id} = ${parts.stockComponentId}
  where ${parts.modelId} = ${models.id}
), 0)`;
