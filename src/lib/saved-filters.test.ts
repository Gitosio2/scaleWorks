import { NextRequest, NextResponse } from "next/server";
import { describe, expect, it } from "vitest";
import { RESET_PARAM } from "./filter-reset";
import { restoreFilters, saveFilters } from "./saved-filters";

const request = (
  path: string,
  init: { method?: string; cookie?: string } = {},
) =>
  new NextRequest(`http://localhost:3000${path}`, {
    method: init.method ?? "GET",
    headers: init.cookie ? { cookie: init.cookie } : undefined,
  });

const location = (response: NextResponse | null) =>
  response ? new URL(response.headers.get("location")!) : null;

describe("restoreFilters", () => {
  it("ignores pages that are not filterable lists", () => {
    const req = request("/settings", { cookie: "filters_settings=a%3D1" });
    expect(restoreFilters(req)).toBeNull();
  });

  it("ignores non-GET requests such as server actions", () => {
    const req = request("/models", { method: "POST", cookie: "filters_models=q%3Da" });
    expect(restoreFilters(req)).toBeNull();
  });

  it("leaves a request that already has filters alone", () => {
    const req = request("/models?q=fiat", { cookie: "filters_models=q%3Dother" });
    expect(restoreFilters(req)).toBeNull();
  });

  it("does nothing without a saved cookie", () => {
    expect(restoreFilters(request("/models"))).toBeNull();
  });

  it("redirects to the saved filters", () => {
    const res = restoreFilters(
      request("/models", { cookie: "filters_models=q%3Dfiat%26phase%3Dfinished" }),
    );
    expect(res?.status).toBe(307);
    expect(location(res)?.pathname).toBe("/models");
    expect(location(res)?.search).toBe("?q=fiat&phase=finished");
  });

  it("uses one cookie per page", () => {
    const req = request("/clients", { cookie: "filters_models=q%3Dfiat" });
    expect(restoreFilters(req)).toBeNull();
  });

  it("ignores an oversized cookie", () => {
    const req = request("/models", { cookie: `filters_models=${"a".repeat(501)}` });
    expect(restoreFilters(req)).toBeNull();
  });

  it("does not restore a cookie that holds only a page", () => {
    const req = request("/models", { cookie: "filters_models=page%3D4" });
    expect(restoreFilters(req)).toBeNull();
  });

  it("treats the Next RSC param as no filter", () => {
    const req = request("/models?_rsc=abc", { cookie: "filters_models=q%3Dfiat" });
    expect(location(restoreFilters(req))?.search).toBe("?q=fiat");
  });

  it("does not bring a page back from the cookie", () => {
    const req = request("/models", { cookie: "filters_models=q%3Dfiat%26page%3D4" });
    expect(location(restoreFilters(req))?.search).toBe("?q=fiat");
  });

  it("restores the saved filters when only a page is requested", () => {
    const req = request("/models?page=2", { cookie: "filters_models=q%3Dfiat" });
    expect(location(restoreFilters(req))?.search).toBe("?q=fiat");
  });

  it("clears the cookie and the query on reset", () => {
    const req = request(`/models?${RESET_PARAM}=1&q=fiat`, {
      cookie: "filters_models=q%3Dold",
    });
    const res = restoreFilters(req);
    expect(location(res)?.search).toBe("");
    expect(res?.cookies.get("filters_models")?.value).toBe("");
  });
});

describe("saveFilters", () => {
  const save = (req: NextRequest) => {
    const res = NextResponse.next();
    saveFilters(req, res);
    return res.cookies.get(`filters_${req.nextUrl.pathname.slice(1)}`);
  };

  it("stores the query string of a list page", () => {
    const cookie = save(request("/models?q=fiat&phase=finished"));
    expect(cookie?.value).toBe("q=fiat&phase=finished");
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe("lax");
    expect(cookie?.path).toBe("/");
  });

  it("does not store the RSC param", () => {
    expect(save(request("/models?_rsc=abc&q=fiat"))?.value).toBe("q=fiat");
    expect(save(request("/models?_rsc=abc"))).toBeUndefined();
  });

  it("does not store the page", () => {
    expect(save(request("/models?q=fiat&page=3"))?.value).toBe("q=fiat");
    expect(save(request("/models?page=3"))).toBeUndefined();
  });

  it("does not store an empty query", () => {
    expect(save(request("/models"))).toBeUndefined();
  });

  it("does not store an oversized query", () => {
    expect(save(request(`/models?q=${"a".repeat(501)}`))).toBeUndefined();
  });

  it("does not rewrite an unchanged cookie", () => {
    const req = request("/models?q=fiat", { cookie: "filters_models=q=fiat" });
    expect(save(req)).toBeUndefined();
  });

  it("ignores other pages and non-GET requests", () => {
    expect(save(request("/settings?q=fiat"))).toBeUndefined();
    expect(save(request("/models?q=fiat", { method: "POST" }))).toBeUndefined();
  });
});
