import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PaginationControls from "@/components/PaginationControls";

describe("PaginationControls Component", () => {
  it("não renderiza nada se o total de itens for 0", () => {
    const onPageChange = vi.fn();
    const { container } = render(
      <PaginationControls
        currentPage={1}
        totalItems={0}
        pageSize={20}
        onPageChange={onPageChange}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renderiza a contagem correta e botões de navegação para 45 itens", () => {
    const onPageChange = vi.fn();
    const { container } = render(
      <PaginationControls
        currentPage={1}
        totalPages={3}
        totalItems={45}
        pageSize={20}
        onPageChange={onPageChange}
      />
    );

    // Deve exibir texto de paginação
    expect(container.textContent).toContain("Exibindo 1 a 20 de 45");
    expect(container.textContent).toContain("(20 por página)");

    // Botão anterior deve estar desativado na pág 1
    const prevBtn = screen.getByTestId("prev-page-btn") as HTMLButtonElement;
    expect(prevBtn.disabled).toBe(true);

    // Botão próximo deve estar habilitado
    const nextBtn = screen.getByTestId("next-page-btn") as HTMLButtonElement;
    expect(nextBtn.disabled).toBe(false);

    // Clicar no botão próximo
    fireEvent.click(nextBtn);
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("desativa o botão próximo na última página", () => {
    const onPageChange = vi.fn();
    const { container } = render(
      <PaginationControls
        currentPage={3}
        totalPages={3}
        totalItems={45}
        pageSize={20}
        onPageChange={onPageChange}
      />
    );

    expect(container.textContent).toContain("Exibindo 41 a 45 de 45");

    const prevBtn = screen.getByTestId("prev-page-btn") as HTMLButtonElement;
    expect(prevBtn.disabled).toBe(false);

    const nextBtn = screen.getByTestId("next-page-btn") as HTMLButtonElement;
    expect(nextBtn.disabled).toBe(true);

    fireEvent.click(prevBtn);
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
