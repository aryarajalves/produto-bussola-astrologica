import { describe, it, expect, vi, beforeEach } from "vitest";
import { api } from "@/lib/api";

describe("api helper", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("api.delete envia requisição DELETE com body serializado quando fornecido", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      json: vi.fn().mockResolvedValue({ success: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await api.delete("/admin/invites/batch", { ids: ["inv-1", "inv-2"] });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/admin/invites/batch"),
      expect.objectContaining({
        method: "DELETE",
        body: JSON.stringify({ ids: ["inv-1", "inv-2"] }),
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      })
    );
  });

  it("api.delete suporta objeto com propriedade data (estilo Axios)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      json: vi.fn().mockResolvedValue({ success: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await api.delete("/admin/users/batch", { data: { ids: ["u1"] } });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/admin/users/batch"),
      expect.objectContaining({
        method: "DELETE",
        body: JSON.stringify({ ids: ["u1"] }),
      })
    );
  });

  it("api.delete funciona sem body para rotas convencionais", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      headers: { get: () => null },
    });
    vi.stubGlobal("fetch", fetchMock);

    await api.delete("/admin/users/123");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/admin/users/123"),
      expect.objectContaining({
        method: "DELETE",
      })
    );
    expect(fetchMock.mock.calls[0][1].body).toBeUndefined();
  });

  it("api.put envia requisição PUT com corpo serializado e headers corretos", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      json: vi.fn().mockResolvedValue({ success: true, updated: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const payload = { name: "Usuário Atualizado", role: "admin", is_active: true };
    const res = await api.put("/admin/users/123", payload);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/admin/users/123"),
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify(payload),
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      })
    );
    expect(res).toEqual({ success: true, updated: true });
  });
});
