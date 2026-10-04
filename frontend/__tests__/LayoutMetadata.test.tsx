import { describe, it, expect } from "vitest";
import { metadata } from "@/app/layout";

describe("RootLayout Metadata", () => {
  it("possui o título da aba configurado exatamente como 'Bussola Astrologica'", () => {
    expect(metadata.title).toBe("Bussola Astrologica");
  });
});
