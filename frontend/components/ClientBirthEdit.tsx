"use client";

import { useState, useRef } from "react";
import { api } from "@/lib/api";
import { C, type CityOption, type ClientDetail } from "@/types/admin";

interface ClientBirthEditProps {
  client: ClientDetail;
}

export default function ClientBirthEdit({ client }: ClientBirthEditProps) {
  const [editingBirth, setEditingBirth] = useState(false);
  const [birthForm, setBirthForm] = useState({
    birth_date: client.birth_date ? client.birth_date.split("T")[0] : "",
    birth_time: client.birth_time ? client.birth_time.slice(0, 5) : "",
    birth_city: client.birth_city || "",
    birth_state: client.birth_state || "",
    city_query: client.birth_city || "",
  });
  const [birthCityResults, setBirthCityResults] = useState<CityOption[]>([]);
  const [birthCityDropdown, setBirthCityDropdown] = useState(false);
  const [birthCityLoading, setBirthCityLoading] = useState(false);
  const birthDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [birthSaveLoading, setBirthSaveLoading] = useState(false);
  const [regenLoading, setRegenLoading] = useState(false);
  const [regenResult, setRegenResult] = useState<string | null>(null);

  const onBirthCityInput = (q: string) => {
    setBirthForm(f => ({ ...f, city_query: q, birth_city: q, birth_state: "" }));
    if (birthDebounceRef.current) clearTimeout(birthDebounceRef.current);
    if (q.trim().length < 2) { setBirthCityResults([]); setBirthCityDropdown(false); return; }
    birthDebounceRef.current = setTimeout(async () => {
      setBirthCityLoading(true);
      try {
        const results = await api.get<CityOption[]>(`/geocoding/search?q=${encodeURIComponent(q.trim())}`);
        setBirthCityResults(results);
        setBirthCityDropdown(results.length > 0);
      } catch { setBirthCityResults([]); }
      finally { setBirthCityLoading(false); }
    }, 400);
  };

  const selectBirthCity = (city: CityOption) => {
    setBirthForm(f => ({
      ...f,
      city_query: city.display,
      birth_city: city.city,
      birth_state: city.state,
    }));
    setBirthCityDropdown(false);
    setBirthCityResults([]);
  };

  const saveBirthData = async () => {
    setBirthSaveLoading(true);
    try {
      await api.patch(`/admin/clients/${client.id}/birth-data`, birthForm);
      setEditingBirth(false);
      alert("✅ Dados de nascimento salvos!");
    } catch (e: unknown) {
      alert(`Erro: ${e instanceof Error ? e.message : "Tente novamente."}`);
    } finally {
      setBirthSaveLoading(false);
    }
  };

  const regenerateChart = async () => {
    if (!confirm("Isso vai apagar o mapa atual e gerar um novo com os dados de nascimento atuais. Confirmar?")) return;
    setRegenLoading(true);
    setRegenResult(null);
    try {
      const res = await api.post<{ message: string; sun_sign: string; moon_sign: string; rising_sign: string }>(
        `/admin/clients/${client.id}/regenerate`, {}
      );
      setRegenResult(`✅ ${res.message} Sol: ${res.sun_sign} · Lua: ${res.moon_sign} · Asc: ${res.rising_sign}`);
    } catch (e: unknown) {
      setRegenResult(`❌ Erro: ${e instanceof Error ? e.message : "Tente novamente."}`);
    } finally {
      setRegenLoading(false);
    }
  };

  return (
    <div className="rounded-xl p-4" style={{ background: C.bg, border: `1px solid ${C.border}` }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold" style={{ color: C.light }}>Dados de nascimento</h3>
        {!editingBirth ? (
          <button
            onClick={() => setEditingBirth(true)}
            className="text-xs px-3 py-1 rounded-full"
            style={{ background: C.card, color: C.light, border: `1px solid ${C.border}` }}
          >
            ✏️ Editar
          </button>
        ) : (
          <button
            onClick={() => setEditingBirth(false)}
            className="text-xs px-3 py-1 rounded-full"
            style={{ background: C.card, color: C.muted, border: `1px solid ${C.border}` }}
          >
            Cancelar
          </button>
        )}
      </div>

      {!editingBirth ? (
        <div className="space-y-1 text-sm" style={{ color: C.muted }}>
          <p>📅 {client.birth_date?.split("T")[0] || "—"} às {client.birth_time?.slice(0, 5) || "—"}</p>
          <p>📍 {client.birth_city || "—"}, {client.birth_state || "—"}</p>
          <p>📱 {client.whatsapp || "—"}</p>
          <p>🎯 {client.focus_areas?.join(", ") || "—"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs mb-1 block" style={{ color: C.muted }}>Data de nascimento</label>
              <input
                type="date"
                value={birthForm.birth_date}
                onChange={e => setBirthForm(f => ({ ...f, birth_date: e.target.value }))}
                style={{ background: C.card, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", width: "100%", outline: "none" }}
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: C.muted }}>Hora de nascimento</label>
              <input
                type="time"
                value={birthForm.birth_time}
                onChange={e => setBirthForm(f => ({ ...f, birth_time: e.target.value }))}
                style={{ background: C.card, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", width: "100%", outline: "none" }}
              />
            </div>
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: C.muted }}>Cidade de nascimento</label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                value={birthForm.city_query}
                onChange={e => onBirthCityInput(e.target.value)}
                placeholder="Digite a cidade..."
                style={{ background: C.card, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", width: "100%", outline: "none" }}
              />
              {birthCityLoading && (
                <span style={{ position: "absolute", right: 10, top: 10, fontSize: 11, color: C.muted }}>buscando...</span>
              )}
              {birthCityDropdown && birthCityResults.length > 0 && (
                <div style={{
                  position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
                  background: C.card, border: `1px solid ${C.border}`, borderRadius: 8,
                  maxHeight: 180, overflowY: "auto", marginTop: 4,
                }}>
                  {birthCityResults.map((city, i) => (
                    <button key={i} onClick={() => selectBirthCity(city)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-opacity-50"
                      style={{ color: C.text, borderBottom: i < birthCityResults.length - 1 ? `1px solid ${C.border}` : "none" }}
                    >
                      <span>{city.flag} {city.display}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: C.muted }}>Estado (preenchido automaticamente)</label>
            <input
              type="text"
              value={birthForm.birth_state}
              readOnly
              placeholder="Selecione a cidade acima"
              style={{ background: "rgba(127,119,221,0.05)", color: birthForm.birth_state ? C.light : C.muted, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", width: "100%", outline: "none", cursor: "default" }}
            />
          </div>
          <button
            onClick={saveBirthData}
            disabled={birthSaveLoading}
            className="w-full py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: C.primary, color: "#fff" }}
          >
            {birthSaveLoading ? "⏳ Salvando..." : "💾 Salvar Dados"}
          </button>
        </div>
      )}

      <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${C.border}` }}>
        <button
          onClick={regenerateChart}
          disabled={regenLoading}
          className="w-full py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #7F77DD, #EF9F27)", color: "#fff" }}
        >
          {regenLoading ? "⏳ Regenerando mapa (~2 min)..." : "🔄 Regenerar Mapa da Alma"}
        </button>
        {regenResult && (
          <p className="text-xs mt-2 text-center" style={{ color: regenResult.startsWith("✅") ? "#34d399" : "#f87171" }}>
            {regenResult}
          </p>
        )}
      </div>
    </div>
  );
}
