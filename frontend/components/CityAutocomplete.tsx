"use client";

import { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api";
import { BRAZIL_STATES, COUNTRIES, CityOption } from "@/lib/locationConstants";

interface CityAutocompleteProps {
  city: string;
  coords: { lat?: number | null; lng?: number | null } | null;
  state: string;
  country: string;
  onSelectCity: (option: CityOption) => void;
  onChangeCity: (text: string) => void;
  onAutoCoordsResolved?: (lat: number, lng: number) => void;
  inputStyle?: React.CSSProperties;
}

export default function CityAutocomplete({
  city,
  coords,
  state,
  country,
  onSelectCity,
  onChangeCity,
  onAutoCoordsResolved,
  inputStyle,
}: CityAutocompleteProps) {
  const [cityResults, setCityResults] = useState<CityOption[]>([]);
  const [cityDropdown, setCityDropdown] = useState(false);
  const [cityLoading, setCityLoading] = useState(false);
  const cityDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleInputChange = (val: string) => {
    onChangeCity(val);
    if (cityDebounceRef.current) clearTimeout(cityDebounceRef.current);
    if (val.trim().length < 2) {
      setCityResults([]);
      setCityDropdown(false);
      return;
    }
    cityDebounceRef.current = setTimeout(async () => {
      setCityLoading(true);
      try {
        const results = await api.get<CityOption[]>(`/geocoding/search?q=${encodeURIComponent(val.trim())}`);
        setCityResults(results || []);
        setCityDropdown((results || []).length > 0);
      } catch {
        setCityResults([]);
      } finally {
        setCityLoading(false);
      }
    }, 300);
  };

  // Auto-resolve coordenadas se já houver cidade mas coords nulas
  useEffect(() => {
    let cancel = false;
    if (!coords && city && city.trim().length >= 2 && onAutoCoordsResolved) {
      (async () => {
        try {
          const res = await api.get<CityOption[]>(`/geocoding/search?q=${encodeURIComponent(city.trim())}`);
          if (!cancel && res && Array.isArray(res) && res.length > 0) {
            const m = res.find(r => !state || (r.state && r.state.toLowerCase().includes(state.toLowerCase()))) || res[0];
            if (m && m.lat != null && m.lng != null) {
              onAutoCoordsResolved(m.lat, m.lng);
            }
          }
        } catch {}
      })();
    }
    return () => { cancel = true; };
  }, [city, state, coords, onAutoCoordsResolved]);

  return (
    <div className="pt-2 relative">
      <label className="text-xs font-medium block mb-1" style={{ color: "#8b87b8" }}>
        Cidade de Nascimento <span className="text-[10px] text-zinc-400">(Digite para escolher no dropdown e definir coordenadas)</span>
      </label>
      <div className="relative">
        <input
          type="text"
          placeholder="Ex: Fortaleza, Campinas, etc."
          value={city}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => { if (cityResults.length > 0) setCityDropdown(true); }}
          autoComplete="off"
          style={inputStyle}
        />
        {cityLoading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: "#8b87b8" }}>
            buscando...
          </span>
        )}
      </div>

      {/* Dropdown de opções de cidades encontradas */}
      {cityDropdown && cityResults.length > 0 && (
        <div
          data-testid="city-dropdown"
          className="absolute left-0 right-0 z-50 mt-1 max-h-52 overflow-y-auto rounded-xl"
          style={{
            background: "#1a1535",
            border: "1px solid rgba(127, 119, 221, 0.4)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.7)",
          }}
        >
          {cityResults.map((item, idx) => (
            <button
              key={`${item.city}-${item.lat}-${idx}`}
              type="button"
              onClick={() => {
                onSelectCity(item);
                setCityDropdown(false);
                setCityResults([]);
              }}
              className="w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-white/10 transition-all cursor-pointer"
              style={{ borderBottom: idx < cityResults.length - 1 ? "1px solid rgba(127, 119, 221, 0.15)" : "none" }}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{item.flag || "📍"}</span>
                <div>
                  <p className="text-xs sm:text-sm font-medium" style={{ color: "#f0eeff" }}>
                    {item.city}{item.state ? `, ${item.state}` : ""}
                  </p>
                  <p className="text-[10px]" style={{ color: "#8b87b8" }}>
                    {item.country} {item.tz_str ? `• 🕐 ${item.tz_str}` : ""}
                  </p>
                </div>
              </div>
              <div className="text-right text-[11px] font-mono shrink-0" style={{ color: "#EF9F27" }}>
                {item.lat?.toFixed(2)}°, {item.lng?.toFixed(2)}°
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Badge de Latitude e Longitude */}
      {coords && coords.lat != null && coords.lng != null && (
        <div
          data-testid="lead-coordinates"
          className="mt-2.5 px-3.5 py-2 rounded-xl text-xs flex items-center justify-between gap-2"
          style={{
            background: "rgba(127, 119, 221, 0.15)",
            border: "1px solid rgba(127, 119, 221, 0.35)",
            color: "#c4b5fd",
          }}
        >
          <div className="flex items-center gap-2">
            <span>📍</span>
            <span>
              <strong>Latitude:</strong> {coords.lat} &nbsp;|&nbsp; <strong>Longitude:</strong> {coords.lng}
            </span>
          </div>
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded"
            style={{ background: "rgba(52, 211, 153, 0.15)", color: "#34d399", border: "1px solid rgba(52, 211, 153, 0.3)" }}
          >
            ✓ Definidas
          </span>
        </div>
      )}
    </div>
  );
}
