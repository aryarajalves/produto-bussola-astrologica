import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CityAutocomplete from "@/components/CityAutocomplete";
import { api } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
  },
}));

describe("CityAutocomplete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("abre o dropdown com sugestões ao digitar o nome da cidade", async () => {
    (api.get as any).mockResolvedValueOnce([
      {
        city: "Fortaleza",
        state: "Ceará",
        country: "Brasil",
        country_code: "BR",
        lat: -3.71722,
        lng: -38.54306,
        tz_str: "America/Fortaleza",
        flag: "🇧🇷",
      },
    ]);

    const onSelect = vi.fn();
    const onChange = vi.fn();

    render(
      <CityAutocomplete
        city=""
        coords={null}
        state="CE"
        country="Brasil"
        onSelectCity={onSelect}
        onChangeCity={onChange}
      />
    );

    const input = screen.getByPlaceholderText(/Ex: Fortaleza, Campinas/i);
    fireEvent.change(input, { target: { value: "Fort" } });

    expect(onChange).toHaveBeenCalledWith("Fort");

    await waitFor(() => {
      const dropdown = screen.getByTestId("city-dropdown");
      expect(dropdown).toBeDefined();
      expect(screen.getByText(/Fortaleza, Ceará/i)).toBeDefined();
    });
  });

  it("seleciona a cidade ao clicar no dropdown e exibe a latitude e longitude", async () => {
    const mockOption = {
      city: "Fortaleza",
      state: "Ceará",
      country: "Brasil",
      country_code: "BR",
      lat: -3.71722,
      lng: -38.54306,
      tz_str: "America/Fortaleza",
      flag: "🇧🇷",
      display: "Fortaleza, Ceará, Brasil",
    };

    (api.get as any).mockResolvedValueOnce([mockOption]);

    const onSelect = vi.fn();
    const onChange = vi.fn();

    const { rerender } = render(
      <CityAutocomplete
        city="Fort"
        coords={null}
        state="CE"
        country="Brasil"
        onSelectCity={onSelect}
        onChangeCity={onChange}
      />
    );

    const input = screen.getByPlaceholderText(/Ex: Fortaleza, Campinas/i);
    fireEvent.change(input, { target: { value: "Fortaleza" } });

    await waitFor(() => {
      expect(screen.getByText(/Fortaleza, Ceará/i)).toBeDefined();
    });

    const optionBtn = screen.getByText(/Fortaleza, Ceará/i).closest("button")!;
    fireEvent.click(optionBtn);

    expect(onSelect).toHaveBeenCalledWith(mockOption);

    // Re-render com coords definidas após seleção
    rerender(
      <CityAutocomplete
        city="Fortaleza"
        coords={{ lat: -3.71722, lng: -38.54306 }}
        state="CE"
        country="Brasil"
        onSelectCity={onSelect}
        onChangeCity={onChange}
      />
    );

    const coordsEl = screen.getByTestId("lead-coordinates");
    expect(coordsEl).toBeDefined();
    expect(coordsEl.textContent).toContain("-3.71722");
    expect(coordsEl.textContent).toContain("-38.54306");
  });
});
