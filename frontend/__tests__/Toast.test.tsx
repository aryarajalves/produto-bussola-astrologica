import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Toast from "@/components/Toast";

describe("Toast Component", () => {
  it("não renderiza nada se toast for null", () => {
    const { container } = render(<Toast toast={null} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it("renderiza o toast com a mensagem de sucesso e ícone", () => {
    const onClose = vi.fn();
    render(
      <Toast
        toast={{ type: "success", message: "Salvo com sucesso!" }}
        onClose={onClose}
      />
    );

    const toastEl = screen.getByTestId("toast-notification");
    expect(toastEl).toBeDefined();
    expect(screen.getByText("Salvo com sucesso!")).toBeDefined();
    expect(screen.getByText("✅")).toBeDefined();
  });

  it("renderiza o toast de erro na posição superior direita", () => {
    const onClose = vi.fn();
    render(
      <Toast
        toast={{ type: "error", message: "Erro ao processar" }}
        onClose={onClose}
      />
    );

    const toastEl = screen.getByTestId("toast-notification");
    expect(toastEl.className).toContain("top-5");
    expect(toastEl.className).toContain("right-5");
    expect(toastEl.className).toContain("fixed");
    expect(screen.getByText("Erro ao processar")).toBeDefined();
    expect(screen.getByText("⚠️")).toBeDefined();
  });

  it("chama onClose ao clicar no botão fechar", () => {
    const onClose = vi.fn();
    render(
      <Toast
        toast={{ type: "success", message: "Operação realizada!" }}
        onClose={onClose}
      />
    );

    const closeBtn = screen.getByLabelText(/Fechar notificação/i);
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
