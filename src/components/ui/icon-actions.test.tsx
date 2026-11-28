// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DuplicateIconButton } from "./icon-actions";

describe("DuplicateIconButton", () => {
  it("is a named submit button with its label as tooltip", () => {
    render(
      <form>
        <DuplicateIconButton label="Duplicate model" />
      </form>,
    );

    const button = screen.getByRole("button", { name: "Duplicate model" });
    expect(button).toHaveProperty("type", "submit");
    expect(button.getAttribute("title")).toBe("Duplicate model");
  });

  it("submits the form it sits in", async () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <DuplicateIconButton label="Duplicate model" />
      </form>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Duplicate model" }));
    expect(onSubmit).toHaveBeenCalledOnce();
  });
});
