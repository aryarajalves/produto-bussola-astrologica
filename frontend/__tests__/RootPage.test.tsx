import { describe, it, expect, vi } from "vitest";
import RootPage from "@/app/page";
import { redirect } from "next/navigation";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

describe("RootPage (app/page.tsx)", () => {
  it("redireciona a URL principal para a tela de login administrativo (/admin/login)", () => {
    RootPage();
    expect(redirect).toHaveBeenCalledWith("/admin/login");
  });
});
