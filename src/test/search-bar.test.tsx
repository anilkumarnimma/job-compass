import { act, fireEvent, render, screen } from "@testing-library/react";
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

    render(<SearchBar value="" onChange={onChange} onSearch={onSearch} />);

    const input = screen.getByPlaceholderText("Search jobs by title, company, skills…") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "data analyst" } });

    expect(input.value).toBe("data analyst");
    expect(onChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(199);
    });

    expect(onChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(onChange).toHaveBeenCalledWith("data analyst");

    fireEvent.change(input, { target: { value: "data engineer" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onChange).toHaveBeenLastCalledWith("data engineer");
    expect(onSearch).toHaveBeenCalledTimes(1);
  });
});