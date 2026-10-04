import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PasswordInput } from "@/components/PasswordInput";

describe("PasswordInput Component", () => {
  it("renderiza como campo de senha oculto por padrão", () => {
    render(<PasswordInput value="minhaSenha123" onChange={() => {}} data-testid="pwd-test" />);
    const input = screen.getByTestId("pwd-test") as HTMLInputElement;
    expect(input.type).toBe("password");
    expect(input.value).toBe("minhaSenha123");
  });

  it("alterna a visibilidade ao clicar no ícone de olho", () => {
    render(<PasswordInput value="secreta" onChange={() => {}} data-testid="pwd-test" />);
    const input = screen.getByTestId("pwd-test") as HTMLInputElement;
    const toggleBtn = screen.getByTestId("pwd-test-toggle-visibility");

    expect(input.type).toBe("password");
    expect(toggleBtn.getAttribute("aria-label")).toBe("Ver senha");

    // Clica para mostrar senha
    fireEvent.click(toggleBtn);
    expect(input.type).toBe("text");
    expect(toggleBtn.getAttribute("aria-label")).toBe("Ocultar senha");

    // Clica para ocultar senha novamente
    fireEvent.click(toggleBtn);
    expect(input.type).toBe("password");
    expect(toggleBtn.getAttribute("aria-label")).toBe("Ver senha");
  });

  it("repassa eventos de digitação para o callback onChange", () => {
    const handleChange = vi.fn();
    render(<PasswordInput value="" onChange={handleChange} data-testid="pwd-test" />);
    const input = screen.getByTestId("pwd-test");

    fireEvent.change(input, { target: { value: "NovaSenha@2026" } });
    expect(handleChange).toHaveBeenCalled();
  });
});
