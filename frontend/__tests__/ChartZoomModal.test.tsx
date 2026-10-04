import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ChartZoomModal from "@/components/ChartZoomModal";

describe("ChartZoomModal Component", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    title: "Mandala Astrológica - Teste",
    svgContent: '<svg data-testid="mock-svg"><circle cx="50" cy="50" r="40" /></svg>',
  };

  it("não renderiza nada quando isOpen é false", () => {
    const { container } = render(
      <ChartZoomModal {...defaultProps} isOpen={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renderiza modal com título, botões de zoom e conteúdo SVG quando isOpen é true", () => {
    render(<ChartZoomModal {...defaultProps} />);

    expect(screen.getByTestId("chart-zoom-modal-backdrop")).toBeDefined();
    expect(screen.getByTestId("chart-zoom-modal-panel")).toBeDefined();
    expect(screen.getByText("Mandala Astrológica - Teste")).toBeDefined();
    expect(screen.getByTestId("zoom-in-btn")).toBeDefined();
    expect(screen.getByTestId("zoom-out-btn")).toBeDefined();
    expect(screen.getByTestId("reset-zoom-btn")).toBeDefined();
    expect(screen.getByTestId("reset-zoom-btn").textContent).toBe("100%");
    expect(screen.getByTestId("mock-svg")).toBeDefined();
  });

  it("executa zoom in ao clicar no botão correspondente", () => {
    render(<ChartZoomModal {...defaultProps} />);

    const zoomInBtn = screen.getByTestId("zoom-in-btn");
    const resetBtn = screen.getByTestId("reset-zoom-btn");

    expect(resetBtn.textContent).toBe("100%");
    fireEvent.click(zoomInBtn);
    expect(resetBtn.textContent).toBe("125%");
    fireEvent.click(zoomInBtn);
    expect(resetBtn.textContent).toBe("150%");
  });

  it("executa zoom out e reset de zoom", () => {
    render(<ChartZoomModal {...defaultProps} />);

    const zoomInBtn = screen.getByTestId("zoom-in-btn");
    const zoomOutBtn = screen.getByTestId("zoom-out-btn");
    const resetBtn = screen.getByTestId("reset-zoom-btn");

    // Aumenta para 150%
    fireEvent.click(zoomInBtn);
    fireEvent.click(zoomInBtn);
    expect(resetBtn.textContent).toBe("150%");

    // Diminui para 125%
    fireEvent.click(zoomOutBtn);
    expect(resetBtn.textContent).toBe("125%");

    // Reseta para 100%
    fireEvent.click(resetBtn);
    expect(resetBtn.textContent).toBe("100%");
  });

  it("chama onClose apenas ao clicar no botão de fechar (respeitando regra de popups)", () => {
    const onCloseMock = vi.fn();
    render(<ChartZoomModal {...defaultProps} onClose={onCloseMock} />);

    const closeBtn = screen.getByTestId("close-chart-zoom-btn");
    fireEvent.click(closeBtn);

    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it("permite dar zoom in e zoom out através do scroll da roda do mouse (wheel)", () => {
    render(<ChartZoomModal {...defaultProps} />);

    const viewport = screen.getByTestId("zoom-viewport");
    const resetBtn = screen.getByTestId("reset-zoom-btn");

    expect(resetBtn.textContent).toBe("100%");

    // Scroll para cima (deltaY negativo) -> Zoom In
    fireEvent.wheel(viewport, { deltaY: -100 });
    expect(resetBtn.textContent).toBe("115%");

    fireEvent.wheel(viewport, { deltaY: -100 });
    expect(resetBtn.textContent).toBe("130%");

    // Scroll para baixo (deltaY positivo) -> Zoom Out
    fireEvent.wheel(viewport, { deltaY: 100 });
    expect(resetBtn.textContent).toBe("115%");
  });
});
