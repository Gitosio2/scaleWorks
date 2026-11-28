// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FilterText } from "./list-filters";

describe("FilterText", () => {
  it("limits what can be typed when given a maximum length", () => {
    render(<FilterText name="q" label="Search" defaultValue="" maxLength={100} />);

    expect(screen.getByRole("searchbox", { name: "Search" }).getAttribute("maxlength")).toBe("100");
  });

  it("has no limit by default", () => {
    render(<FilterText name="q" label="Search" defaultValue="" />);

    expect(screen.getByRole("searchbox", { name: "Search" }).hasAttribute("maxlength")).toBe(false);
  });
});
