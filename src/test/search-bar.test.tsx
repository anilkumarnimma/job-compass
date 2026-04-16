import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SearchBar } from "@/components/SearchBar";

vi.mock("@/hooks/useSearchSuggestions", () => ({
  useSearchSuggestions: () => ({ suggestions: [], isLoading: false }),
}));

vi.mock("@/components/SearchSuggestions", () => ({
  SearchSuggestions: () => null,
}));

describe("SearchBar", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps typing instant while debouncing parent updates and flushing on Enter", () => {
    const onChange = vi.fn();
    const onSearch = vi.fn();

    const { getByPlaceholderText } = render(<SearchBar value="" onChange={onChange} onSearch={onSearch} />);

    const input = getByPlaceholderText("Search jobs by title, company, skills…") as HTMLInputElement;

    act(() => {
      input.value = "data analyst";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });

    expect(input.value).toBe("data analyst");
    expect(onChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(299);
    });

    expect(onChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(onChange).toHaveBeenCalledWith("data analyst");

    act(() => {
      input.value = "data engineer";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });

    expect(onChange).toHaveBeenLastCalledWith("data engineer");
    expect(onSearch).toHaveBeenCalledTimes(1);
  });
});
