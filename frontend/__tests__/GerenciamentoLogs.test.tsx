import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import GerenciamentoLogs from "@/components/GerenciamentoLogs";
import Toast from "@/components/Toast";

describe("GerenciamentoLogs Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem("sirius_token", "fake-token");

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/admin/docker-logs")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              container: "backend",
              container_name: "sirius_backend",
              tail: 100,
              command: "docker logs --tail 100 sirius_backend",
              lines: [
                '[03/10/2026 12:30:01] INFO:     192.168.80.1:38952 - "GET /admin/clients HTTP/1.1" 200 OK',
                '[03/10/2026 12:30:02] INFO:     192.168.80.1:38964 - "GET /admin/users HTTP/1.1" 200 OK',
                '[03/10/2026 12:30:05] [WARN] Uso de memória atingiu limiar de alerta',
                '[03/10/2026 12:30:10] [ERROR] Falha de conexão temporária simulada',
              ],
              total_lines: 4,
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  });

  it("renderiza o painel de gerenciamento de logs com título, subtítulo e seletores de contêineres", async () => {
    render(<GerenciamentoLogs />);

    expect(screen.getByTestId("gerenciamento-logs-panel")).toBeDefined();
    expect(screen.getByText("Gerenciamento de logs")).toBeDefined();
    expect(
      screen.getByText("Acompanhe e diagnostique logs por contêiner, data e horário de Brasília.")
    ).toBeDefined();

    expect(screen.getByTestId("container-tab-backend")).toBeDefined();
    expect(screen.getByTestId("container-tab-frontend")).toBeDefined();
  });

  it("carrega e renderiza as linhas de log com timestamps de Brasília e badges", async () => {
    render(<GerenciamentoLogs />);

    await waitFor(() => {
      expect(screen.getByText("docker logs --tail 100 sirius_backend")).toBeDefined();
    });

    // Valida exibição dos badges de HTTP e contadores
    await waitFor(() => {
      expect(screen.getAllByText("HTTP 200").length).toBeGreaterThan(0);
    });

    // Valida exibição do horário de Brasília
    expect(screen.getByText("[03/10/2026 12:30:01]")).toBeDefined();
    expect(screen.getByText("4 linha(s)")).toBeDefined();
  });

  it("permite filtrar logs por texto digitado no input de busca", async () => {
    render(<GerenciamentoLogs />);

    await waitFor(() => {
      expect(screen.getByText("docker logs --tail 100 sirius_backend")).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText("Filtrar por texto nos logs...");
    fireEvent.change(searchInput, { target: { value: "memória" } });

    await waitFor(() => {
      expect(screen.getByText(/Uso de memória atingiu/)).toBeDefined();
      expect(screen.queryByText(/GET \/admin\/clients/)).toBeNull();
    });
  });

  it("exibe notificação toast no topo direito ao clicar em copiar logs", async () => {
    // Mock navigator.clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
      },
    });

    render(
      <>
        <Toast />
        <GerenciamentoLogs />
      </>
    );

    await waitFor(() => {
      expect(screen.getByText("docker logs --tail 100 sirius_backend")).toBeDefined();
    });

    const btnCopiar = screen.getByTestId("btn-copiar-logs");
    fireEvent.click(btnCopiar);

    await waitFor(() => {
      expect(screen.getByTestId("toast-notification")).toBeDefined();
      expect(screen.getByText("Logs copiados com sucesso!")).toBeDefined();
    });
  });

  it("alterna para o contêiner frontend ao clicar na aba correspondente", async () => {
    render(<GerenciamentoLogs />);

    const frontendTab = screen.getByTestId("container-tab-frontend");
    fireEvent.click(frontendTab);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("container=frontend"),
        expect.anything()
      );
    });
  });
});
