import { describe, it, expect } from "vitest";
import { isLocationValid, type LocationValue } from "@/lib/location";

const v = (country: string, state = "", city = ""): LocationValue => ({ country, state, city });

describe("isLocationValid", () => {
  it("requires a country", () => {
    expect(isLocationValid(v(""), false, false)).toBe(false);
    expect(isLocationValid(v(""), true, true)).toBe(false);
  });

  it("country alone is enough when the country has no states", () => {
    expect(isLocationValid(v("Vatican City"), false, false)).toBe(true);
  });

  it("requires a state when the country has states", () => {
    expect(isLocationValid(v("Colombia"), true, false)).toBe(false);
    expect(isLocationValid(v("Colombia", "Antioquia"), true, false)).toBe(true);
  });

  it("requires a city when the state has cities", () => {
    expect(isLocationValid(v("Colombia", "Antioquia"), true, true)).toBe(false);
    expect(isLocationValid(v("Colombia", "Antioquia", "Medellín"), true, true)).toBe(true);
  });

  it("does not require a city when the state has no cities", () => {
    expect(isLocationValid(v("Colombia", "Amazonas"), true, false)).toBe(true);
  });

  it("a full selection is always valid", () => {
    expect(isLocationValid(v("Colombia", "Antioquia", "Medellín"), true, true)).toBe(true);
  });
});
