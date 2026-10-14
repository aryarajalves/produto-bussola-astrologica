import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { BRAZIL_STATES, COUNTRIES, CityOption } from "@/lib/locationConstants";
import CityAutocomplete from "./CityAutocomplete";
import Toast, { ToastMessage } from "./Toast";

interface LeadQuestionnaireProps {
  /** "admin" cadastra outra pessoa; qualquer outro valor é a pessoa cadastrando a si mesma. */
  papel?: string;
  onClientCreated?: (clientId: string) => void;
  onOpenClient?: (clientId: string) => void;
  onNavigateToSearch?: () => void;
}

interface CreatedLeadResult {
  id: string;
  name: string;
  email: string;
  sun_sign: string;
  moon_sign: string;
  rising_sign: string;
  lat?: number | null;
  lng?: number | null;
  tz_str?: string | null;
}

function getCachedLead() {
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem("sirius_saved_lead");
      if (cached) return JSON.parse(cached);
    } catch {}
  }
  return null;
}

export default function LeadQuestionnaire({
  papel = "client", onClientCreated, onOpenClient, onNavigateToSearch }: LeadQuestionnaireProps) {
  // A mesma tela serve o aluno (dados dele) e o Crassus (dados de um cliente).
  const proprio = papel !== "admin";

  const [mounted, setMounted] = useState(false);
  const [existingClientId, setExistingClientId] = useState<string | null>(null);
  const [name, setName] = useState<string>("");
  const [birthDate, setBirthDate] = useState<string>("");
  const [birthTime, setBirthTime] = useState<string>("");
  const [country, setCountry] = useState<string>("Brasil");
  const [state, setState] = useState<string>("SP");
  const [city, setCity] = useState<string>("");
  const [coords, setCoords] = useState<{ lat?: number | null; lng?: number | null } | null>(null);

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const isBrazil = country === "Brasil";

  useEffect(() => {
    setMounted(true);
    let active = true;

    // Carrega cache local apenas se contiver dados completos com data de nascimento
    const cached = getCachedLead();
    if (cached && cached.birthDate) {
      if (cached.id) setExistingClientId(cached.id);
      if (cached.name) setName(cached.name);
      setBirthDate(cached.birthDate);
      if (cached.birthTime) setBirthTime(cached.birthTime);
      if (cached.country) setCountry(cached.country);
      if (cached.state) setState(cached.state);
      if (cached.city) setCity(cached.city);
      if (cached.lat != null && cached.lng != null) {
        setCoords({ lat: cached.lat, lng: cached.lng });
      }
    }

    const fetchSavedLead = async () => {
      try {
        const res = await api.get<{
          items: Array<{
            id: string;
            name: string;
            birth_date?: string;
            birth_time?: string;
            birth_country?: string;
            birth_state?: string;
            birth_city?: string;
            lat?: number | null;
            lng?: number | null;
          }>;
        }>("/admin/clients?limit=10");

        // Prioriza o lead cadastrado que tenha os dados de nascimento preenchidos
        const validLead = res.items?.find((l) => !!l.birth_date);

        if (active && validLead) {
          const loaded = {
            id: validLead.id,
            name: validLead.name || "",
            birthDate: validLead.birth_date ? validLead.birth_date.substring(0, 10) : "",
            birthTime: validLead.birth_time ? validLead.birth_time.substring(0, 5) : "",
            country: validLead.birth_country || "Brasil",
            state: validLead.birth_state || "SP",
            city: validLead.birth_city || "",
            lat: validLead.lat ?? null,
            lng: validLead.lng ?? null,
          };
          setExistingClientId(loaded.id);
          setName(loaded.name);
          setBirthDate(loaded.birthDate);
          setBirthTime(loaded.birthTime);
          setCountry(loaded.country);
          setState(loaded.state);
          setCity(loaded.city);
          if (loaded.lat != null && loaded.lng != null) {
            setCoords({ lat: loaded.lat, lng: loaded.lng });
          }
          if (typeof window !== "undefined") {
            localStorage.setItem("sirius_saved_lead", JSON.stringify(loaded));
          }
        } else if (active && (!res.items || res.items.length === 0)) {
          // Se não há nenhum cliente cadastrado no banco, limpa qualquer resquício do cache
          setExistingClientId(null);
          setName("");
          setBirthDate("");
          setBirthTime("");
          setCity("");
          setCoords(null);
          if (typeof window !== "undefined") {
            localStorage.removeItem("sirius_saved_lead");
          }
        }
      } catch {
        // Mantém cache local se houver falha de rede
      }
    };
    fetchSavedLead();
    return () => {
      active = false;
    };
  }, []);

  const handleSelectCity = (item: CityOption) => {
    setCity(item.city);
    setCoords({ lat: item.lat, lng: item.lng });
    if (item.country_code === "BR" || item.country === "Brasil") {
      setCountry("Brasil");
      if (item.state) {
        const found = BRAZIL_STATES.find(s => s.name.toLowerCase() === item.state.toLowerCase() || s.uf.toLowerCase() === item.state.toLowerCase());
        if (found) setState(found.uf);
      }
    } else if (item.country) {
      const found = COUNTRIES.find(c => c.name.toLowerCase() === item.country.toLowerCase() || c.code.toLowerCase() === item.country_code?.toLowerCase());
      if (found) setCountry(found.name);
      if (item.state) setState(item.state);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setToast(null);

    if (!name.trim()) {
      setToast({ type: "error", message: "Preencha o nome completo antes de salvar." });
      return;
    }
    if (!birthDate) {
      setToast({ type: "error", message: "Por favor, selecione a data de nascimento." });
      return;
    }
    if (!birthTime) {
      setToast({ type: "error", message: "Por favor, informe o horário de nascimento." });
      return;
    }
    if (!country) {
      setToast({ type: "error", message: "Por favor, selecione o país de nascimento." });
      return;
    }
    if (isBrazil && !state) {
      setToast({ type: "error", message: "Por favor, selecione o estado de nascimento." });
      return;
    }

    setLoading(true);

    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        birth_date: birthDate,
        birth_time: birthTime,
        birth_country: country,
        birth_state: state,
        birth_city: city.trim() || undefined,
        client_id: existingClientId || undefined,
        lat: coords?.lat ?? undefined,
        lng: coords?.lng ?? undefined,
        save_only: true,
      };

      const result = await api.post<CreatedLeadResult>("/admin/generate-manual", payload);
      if (result.id) {
        setExistingClientId(result.id);
      }
      if (result.lat != null && result.lng != null) {
        setCoords({ lat: result.lat, lng: result.lng });
      }
      const savedData = {
        id: result.id || existingClientId,
        name: name.trim(),
        birthDate,
        birthTime,
        country,
        state,
        city: city.trim(),
        lat: result.lat ?? coords?.lat ?? null,
        lng: result.lng ?? coords?.lng ?? null,
      };
      if (typeof window !== "undefined") {
        localStorage.setItem("sirius_saved_lead", JSON.stringify(savedData));
      }
      setToast({
        type: "success",
        message: `Informações de ${name.trim()} salvas com sucesso para uso futuro!`,
      });
      if (onClientCreated && result.id) {
        onClientCreated(result.id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Ocorreu um erro ao salvar as informações do lead.";
      setToast({ type: "error", message: msg });
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    background: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(127, 119, 221, 0.3)",
    color: "#f0eeff",
    borderRadius: "12px",
    padding: "10px 14px",
    width: "100%",
    outline: "none",
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg"
          style={{
            background: "linear-gradient(135deg, rgba(127, 119, 221, 0.4), rgba(60, 52, 137, 0.6))",
            border: "1px solid rgba(127, 119, 221, 0.4)",
            color: "#EF9F27",
          }}
        >
          ✦
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-wide" style={{ color: "#f0eeff" }}>
            {proprio ? "Os seus dados de nascimento" : "Dados de nascimento do cliente"}
          </h2>
          <p className="text-xs sm:text-sm" style={{ color: "#8b87b8" }}>
            {proprio
              ? "Três dados e a sua bússola fica pronta. A hora é a que mais importa: ela move as áreas da vida quinze vezes mais rápido que a data."
              : "Data, hora e cidade de nascimento. A hora é o dado que mais muda o resultado."}
          </p>
        </div>
      </div>

      {/* Notificação Toast na parte superior direita */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      <form onSubmit={handleSubmit} className="space-y-5">
        {mounted && existingClientId && (
          <div
            className="p-3.5 rounded-2xl text-xs sm:text-sm flex items-center justify-between gap-2"
            style={{
              background: "rgba(127, 119, 221, 0.12)",
              border: "1px solid rgba(127, 119, 221, 0.3)",
              color: "#c4b5fd",
            }}
          >
            <div className="flex items-center gap-2">
              <span>✨</span>
              <span>
                {proprio
                  ? "Seus dados já estão salvos. Se algo estiver errado, corrija aqui e salve de novo."
                  : "Informações carregadas do cadastro salvo. Você pode alterá-las e salvar novamente."}
              </span>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(52, 211, 153, 0.2)", color: "#34d399" }}>
              {proprio ? "Pronto" : "Cadastrado"}
            </span>
          </div>
        )}

          {/* Campo 1: Nome Completo */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: "#AFA9EC" }}>
              1. {proprio ? "Seu nome completo" : "Nome completo do cliente"} <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder="Ex: Gabriel Moreira Silva"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
              required
            />
          </div>

          {/* Campos 2 e 3: Data e Horário de Nascimento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: "#AFA9EC" }}>
                2. {proprio ? "Sua data de nascimento" : "Data de nascimento"} <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                style={inputStyle}
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: "#AFA9EC" }}>
                3. {proprio ? "A hora em que você nasceu" : "Horário de nascimento"} <span className="text-red-400">*</span>
              </label>
              <input
                type="time"
                value={birthTime}
                onChange={(e) => setBirthTime(e.target.value)}
                style={inputStyle}
                required
              />
            </div>
          </div>

          {/* Campos 4 e 5: País e Estado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: "#AFA9EC" }}>
                4. País de Nascimento <span className="text-red-400">*</span>
              </label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                style={{ ...inputStyle, cursor: "pointer" }}
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.name} style={{ background: "#1a1535", color: "#f0eeff" }}>
                    {c.flag} {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: "#AFA9EC" }}>
                5. Estado <span className="text-red-400">*</span>
              </label>
              {isBrazil ? (
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  style={{ ...inputStyle, cursor: "pointer" }}
                >
                  {BRAZIL_STATES.map((s) => (
                    <option key={s.uf} value={s.uf} style={{ background: "#1a1535", color: "#f0eeff" }}>
                      {s.uf} — {s.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="Nome do estado / província"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  style={inputStyle}
                />
              )}
            </div>
          </div>

          {/* Cidade de Nascimento com Dropdown Autocomplete e Coordenadas */}
          <CityAutocomplete
            city={city}
            coords={coords}
            state={state}
            country={country}
            onChangeCity={(c) => setCity(c)}
            onSelectCity={handleSelectCity}
            onAutoCoordsResolved={(lat, lng) => setCoords({ lat, lng })}
            inputStyle={inputStyle}
          />

          {/* Botão de Disparo / Envio */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-2xl font-bold tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:brightness-110 active:scale-[0.99]"
              style={{
                background: "linear-gradient(135deg, #7F77DD 0%, #3C3489 100%)",
                color: "#ffffff",
                boxShadow: "0 0 20px rgba(127, 119, 221, 0.4)",
                opacity: loading ? 0.7 : 1,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Salvando Informações do Lead...</span>
                </>
              ) : (
                <>
                  <span>{proprio ? "Salvar e desenhar minha bússola" : "Salvar dados do cliente"}</span>
                </>
              )}
            </button>
          </div>
        </form>
    </div>
  );
}
