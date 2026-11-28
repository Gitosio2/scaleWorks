// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import messages from "../../../messages/en.json";
import { LoadMoreList } from "./load-more-list";

type Batch = { items: React.ReactNode; count: number };

const rows = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => <li key={from + i}>Item {from + i}</li>);

const batch = (from: number, to: number): Batch => ({ items: rows(from, to), count: to - from + 1 });

// A promise the test settles by hand, to look at the list while a load is running.
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

type Props = {
  initialCount: number;
  total: number;
  refreshKey?: string;
  // Text of the first batch, to tell a re-rendered page from the old one.
  label?: string;
  loadMore: (offset: number, limit?: number) => Promise<Batch>;
};

const ui = ({ initialCount, total, refreshKey, label = "Item", loadMore }: Props) => (
  <NextIntlClientProvider locale="en" messages={messages}>
    <LoadMoreList
      initialCount={initialCount}
      total={total}
      refreshKey={refreshKey}
      listClassName="grid"
      loadMore={loadMore}
    >
      {Array.from({ length: initialCount }, (_, i) => (
        <li key={i + 1}>
          {label} {i + 1}
        </li>
      ))}
    </LoadMoreList>
  </NextIntlClientProvider>
);

function renderList(props: Props) {
  const view = render(ui(props));
  return { ...view, rerenderWith: (next: Props) => view.rerender(ui(next)) };
}

const itemTexts = () => screen.getAllByRole("listitem").map((li) => li.textContent);
const showMore = () => screen.queryByRole("button", { name: "Show more" });

describe("LoadMoreList", () => {
  it("renders the first batch in the list and how many are shown", () => {
    renderList({ initialCount: 2, total: 5, loadMore: vi.fn() });

    expect(screen.getByRole("list")).toHaveProperty("className", "grid");
    expect(itemTexts()).toEqual(["Item 1", "Item 2"]);
    expect(screen.getByText("Showing 2 of 5")).toBeTruthy();
    expect(showMore()).toBeTruthy();
  });

  it("appends the next batch, keeping the previous items", async () => {
    const loadMore = vi.fn(async (offset: number) => batch(offset + 1, offset + 2));
    renderList({ initialCount: 2, total: 6, loadMore });

    await userEvent.click(showMore()!);
    expect(loadMore).toHaveBeenLastCalledWith(2);
    expect(itemTexts()).toEqual(["Item 1", "Item 2", "Item 3", "Item 4"]);
    expect(screen.getByText("Showing 4 of 6")).toBeTruthy();

    await userEvent.click(showMore()!);
    expect(loadMore).toHaveBeenLastCalledWith(4);
    expect(itemTexts()).toEqual(["Item 1", "Item 2", "Item 3", "Item 4", "Item 5", "Item 6"]);
  });

  it("hides the button once every item is shown", async () => {
    const loadMore = vi.fn(async () => batch(3, 4));
    renderList({ initialCount: 2, total: 4, loadMore });

    await userEvent.click(showMore()!);
    expect(itemTexts()).toHaveLength(4);
    expect(showMore()).toBeNull();
    expect(screen.getByText("Showing 4 of 4")).toBeTruthy();
  });

  it("has no button when the first batch already holds every item", () => {
    renderList({ initialCount: 3, total: 3, loadMore: vi.fn() });

    expect(showMore()).toBeNull();
    expect(screen.queryByText(/Showing/)).toBeNull();
  });

  it("stops offering more when a load comes back empty", async () => {
    const loadMore = vi.fn(async () => ({ items: [], count: 0 }));
    renderList({ initialCount: 2, total: 5, loadMore });

    await userEvent.click(showMore()!);
    expect(showMore()).toBeNull();
    expect(itemTexts()).toEqual(["Item 1", "Item 2"]);
  });

  it("is marked busy while loading, keeps focus and does not start a second load", async () => {
    const pending = deferred<Batch>();
    const loadMore = vi.fn(() => pending.promise);
    renderList({ initialCount: 2, total: 6, loadMore });

    const button = showMore()!;
    await userEvent.click(button);
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(button.getAttribute("aria-busy")).toBe("true");
    // Not `disabled`: a disabled button would drop the keyboard focus.
    expect(button).toHaveProperty("disabled", false);
    expect(document.activeElement).toBe(button);

    await userEvent.click(button);
    await userEvent.keyboard("{Enter}");
    expect(loadMore).toHaveBeenCalledTimes(1);

    pending.resolve(batch(3, 4));
    await screen.findByText("Item 4");
    expect(showMore()!.getAttribute("aria-disabled")).toBe("false");
    expect(showMore()!.getAttribute("aria-busy")).toBe("false");
    expect(document.activeElement).toBe(showMore());
  });

  it("moves the focus to the count when the last batch removes the button", async () => {
    const loadMore = vi.fn(async () => batch(3, 4));
    renderList({ initialCount: 2, total: 4, loadMore });

    await userEvent.click(showMore()!);
    expect(showMore()).toBeNull();
    expect(document.activeElement).toBe(screen.getByText("Showing 4 of 4"));
  });

  it("keeps the items and offers a retry when a load fails", async () => {
    const loadMore = vi
      .fn<(offset: number) => Promise<Batch>>()
      .mockRejectedValueOnce(new Error("network"))
      .mockImplementation(async (offset) => batch(offset + 1, offset + 2));
    renderList({ initialCount: 2, total: 6, loadMore });

    await userEvent.click(showMore()!);
    expect(await screen.findByText("Could not load more items. Try again.")).toBeTruthy();
    expect(itemTexts()).toEqual(["Item 1", "Item 2"]);
    expect(screen.getByText("Showing 2 of 6")).toBeTruthy();

    await userEvent.click(showMore()!);
    expect(loadMore).toHaveBeenLastCalledWith(2);
    expect(itemTexts()).toEqual(["Item 1", "Item 2", "Item 3", "Item 4"]);
    expect(screen.queryByText("Could not load more items. Try again.")).toBeNull();
  });

  it("announces the count and errors politely", () => {
    renderList({ initialCount: 2, total: 5, loadMore: vi.fn() });

    expect(screen.getByText("Showing 2 of 5").closest("[aria-live]")?.getAttribute("aria-live")).toBe("polite");
  });

  describe("when the page data changes (refreshKey)", () => {
    it("re-fetches every appended row in one call and replaces them", async () => {
      const loadMore = vi.fn(async (offset: number, limit = 2) => batch(offset + 1, offset + limit));
      const { rerenderWith } = renderList({ initialCount: 2, total: 8, refreshKey: "a", loadMore });
      await userEvent.click(showMore()!);
      await userEvent.click(showMore()!);
      expect(itemTexts()).toHaveLength(6);

      const fresh = deferred<Batch>();
      loadMore.mockImplementationOnce(() => fresh.promise);
      rerenderWith({ initialCount: 2, total: 8, refreshKey: "b", label: "New", loadMore });

      expect(loadMore).toHaveBeenLastCalledWith(2, 4);
      // The rows on screen stay until the fresh ones arrive.
      expect(itemTexts()).toEqual(["New 1", "New 2", "Item 3", "Item 4", "Item 5", "Item 6"]);

      fresh.resolve({ items: [3, 4, 5, 6].map((n) => <li key={n}>Fresh {n}</li>), count: 4 });
      await screen.findByText("Fresh 6");
      expect(itemTexts()).toEqual(["New 1", "New 2", "Fresh 3", "Fresh 4", "Fresh 5", "Fresh 6"]);
      expect(screen.getByText("Showing 6 of 8")).toBeTruthy();

      await userEvent.click(showMore()!);
      expect(loadMore).toHaveBeenLastCalledWith(6);
    });

    it("does not fetch when nothing was appended", () => {
      const loadMore = vi.fn();
      const { rerenderWith } = renderList({ initialCount: 2, total: 8, refreshKey: "a", loadMore });

      rerenderWith({ initialCount: 2, total: 9, refreshKey: "b", label: "New", loadMore });

      expect(loadMore).not.toHaveBeenCalled();
      expect(itemTexts()).toEqual(["New 1", "New 2"]);
      expect(screen.getByText("Showing 2 of 9")).toBeTruthy();
    });

    it("falls back to the first batch when the refresh fails", async () => {
      const loadMore = vi.fn(async (offset: number) => batch(offset + 1, offset + 2));
      const { rerenderWith } = renderList({ initialCount: 2, total: 8, refreshKey: "a", loadMore });
      await userEvent.click(showMore()!);
      expect(itemTexts()).toHaveLength(4);

      loadMore.mockRejectedValueOnce(new Error("network"));
      rerenderWith({ initialCount: 2, total: 8, refreshKey: "b", label: "New", loadMore });

      await waitFor(() => expect(itemTexts()).toEqual(["New 1", "New 2"]));
      expect(screen.getByText("Showing 2 of 8")).toBeTruthy();
      await userEvent.click(showMore()!);
      expect(loadMore).toHaveBeenLastCalledWith(2);
    });

    it("ignores a refresh that a newer one replaced", async () => {
      const loadMore = vi.fn(async (offset: number) => batch(offset + 1, offset + 2));
      const { rerenderWith } = renderList({ initialCount: 2, total: 8, refreshKey: "a", loadMore });
      await userEvent.click(showMore()!);

      const first = deferred<Batch>();
      const second = deferred<Batch>();
      loadMore.mockImplementationOnce(() => first.promise).mockImplementationOnce(() => second.promise);
      rerenderWith({ initialCount: 2, total: 8, refreshKey: "b", loadMore });
      rerenderWith({ initialCount: 2, total: 8, refreshKey: "c", loadMore });

      second.resolve({ items: [<li key={3}>Second 3</li>, <li key={4}>Second 4</li>], count: 2 });
      await screen.findByText("Second 4");
      first.resolve({ items: [<li key={3}>First 3</li>, <li key={4}>First 4</li>], count: 2 });
      await first.promise;

      expect(itemTexts()).toEqual(["Item 1", "Item 2", "Second 3", "Second 4"]);
    });
  });
});
