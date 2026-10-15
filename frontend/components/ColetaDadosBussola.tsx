"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import CityAutocomplete from "@/components/CityAutocomplete";
import { CityOption, BRAZIL_STATES, COUNTRIES } from "@/lib/locationConstants";

interface ColetaDadosBussolaProps {
  onSuccess?: (userData: any) => void;
  onCancel?: () => void;
  title?: string;
  subtitle?: string;
}

const FOCUS_OPTIONS = [
  { id: "geral", rotulo: "Panorama Geral", desc: "Clareza ampla sobre forças ativas e momento de vida" },
  { id: "carreira", rotulo: "Carreira & Negócios", desc: "Timing profissional, projetos, autoridade e liderança" },
  { id: "financas", rotulo: "Finanças & Recursos", desc: "Fluxo material, investimentos e segurança patrimonial" },
  { id: "relacionamentos", rotulo: "Relacionamentos", desc: "Parcerias estratégicas, vínculos afetivos e acordos" },
  { id: "autoconhecimento", rotulo: "Autoconhecimento", desc: "Alinhamento interno, vitalidade e autodomínio" },
];

export default function ColetaDadosBussola({
  onSuccess,
  onCancel,
  title = "Calibrar Minha Bússola",
  subtitle = "Informe seus dados de nascimento exatos para desenhar sua mandala astronômica e desbloquear as leituras do dia.",
}: ColetaDadosBussolaProps) {
  const [nome, setNome] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [horaNascimento, setHoraNascimento] = useState("12:00");
  const [horaDesconhecida, setHoraDesconhecida] = useState(false);
  const [pais, setPais] = useState("Brasil");
  const [estado, setEstado] = useState("");
  const [cidade, setCidade] = useState("");
  const [coords, setCoords] = useState<{ lat?: number | null; lng?: number | null } | null>(null);
  const [foco, setFoco] = useState("geral");

  const [loading, setLoading] = useState(false);
  const [carregandoDados, setCarregandoDados] = useState(true);
  const [etapaStatus, setEtapaStatus] = useState("");
  const [erro, setErro] = useState("");
  const [sucessoMsg, setSucessoMsg] = useState("");

  // Carrega dados existentes do usuário caso já possua
  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const dados = await api.get<any>("/members/birth-data");
        if (ativo && dados) {
          if (dados.name) setNome(dados.name);
          if (dados.birth_date) setDataNascimento(dados.birth_date);
          if (dados.birth_time) {
            setHoraNascimento(dados.birth_time);
            if (dados.birth_time === "12:00" && !dados.has_data) {
              setHoraDesconhecida(true);
            }
          }
          if (dados.birth_city) setCidade(dados.birth_city);
          if (dados.birth_state) setEstado(dados.birth_state);
          if (dados.birth_country) setPais(dados.birth_country);
          if (dados.focus_areas && dados.focus_areas.length > 0) {
            setFoco(dados.focus_areas[0]);
          }
        }
      } catch {
        // Silencioso se não houver dados prévios
      } finally {
        if (ativo) setCarregandoDados(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, []);

  const handleSelectCity = (opt: CityOption) => {
    setCidade(opt.city);
    setEstado(opt.state || "");
    if (opt.country) setPais(opt.country);
    setCoords({ lat: opt.lat, lng: opt.lng });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    setSucessoMsg("");

    if (!dataNascimento) {
      setErro("Por favor, informe sua data de nascimento.");
      return;
    }
    if (!cidade.trim()) {
      setErro("Por favor, informe a cidade onde você nasceu.");
      return;
    }

    setLoading(true);
    setEtapaStatus("Mapeando coordenadas e fuso horário...");

    try {
      const timer1 = setTimeout(() => {
        setEtapaStatus("Calculando posições planetárias (Swiss Ephemeris)...");
      }, 1200);

      const timer2 = setTimeout(() => {
        setEtapaStatus("Desenhando mandala e gerando cúspides natais...");
      }, 2500);

      const payload = {
        name: nome.trim() || undefined,
        birth_date: dataNascimento,
        birth_time: horaDesconhecida ? "12:00" : horaNascimento || "12:00",
        birth_city: cidade.trim(),
        birth_state: estado.trim() || undefined,
        birth_country: pais || "Brasil",
        lat: coords?.lat ?? undefined,
        lng: coords?.lng ?? undefined,
        focus_areas: foco ? [foco] : ["geral"],
      };

      const res = await api.post<any>("/members/birth-data", payload);

      clearTimeout(timer1);
      clearTimeout(timer2);

      setSucessoMsg("Bússola calibrada com sucesso!");
      setEtapaStatus("");

      if (onSuccess) {
        setTimeout(() => {
          onSuccess(res.user);
        }, 800);
      }
    } catch (err: any) {
      setErro(err?.message || "Erro ao salvar dados de nascimento. Verifique as informações.");
    } finally {
      setLoading(false);
    }
  };

  const isBrazil = pais === "Brasil";

  if (carregandoDados) {
    return (
      <div className="p-8 text-center bg-[#121215] border border-white/5 rounded-2xl animate-pulse">
        <p className="text-xs uppercase tracking-widest text-[#d4af37] font-mono">
          Carregando informações da bússola...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto bg-[#121215] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
      {/* Detalhe de iluminação no topo */}
      <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-[#d4af37]/40 to-transparent" />

      {/* Cabeçalho */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-sm text-[#d4af37]">🧭</span>
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#d4af37]">
              Coleta de Informações
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight">
            {title}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1 leading-relaxed">
            {subtitle}
          </p>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-zinc-500 hover:text-zinc-300 text-xs px-2.5 py-1.5 rounded-lg border border-white/5 hover:border-white/10 transition-colors"
          >
            Fechar
          </button>
        )}
      </div>

      {erro && (
        <div className="mb-5 p-3.5 bg-red-950/40 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-center gap-2">
          <span>⚠️</span>
          <span>{erro}</span>
        </div>
      )}

      {sucessoMsg && (
        <div className="mb-5 p-3.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
          <span>✓</span>
          <span>{sucessoMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Campo 1: Nome Completo */}
        <div>
          <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
            1. Nome Completo
          </label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Como você prefere ser chamado(a)"
            className="w-full bg-[#18181b] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-[#d4af37]/60 transition-colors"
          />
        </div>

        {/* Linha 2: Data e Hora de Nascimento */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
              2. Data de Nascimento <span className="text-[#d4af37]">*</span>
            </label>
            <input
              type="date"
              value={dataNascimento}
              onChange={(e) => setDataNascimento(e.target.value)}
              required
              className="w-full bg-[#18181b] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-[#d4af37]/60 transition-colors [color-scheme:dark]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                3. Hora de Nascimento
              </label>
              <label className="flex items-center gap-1.5 text-[10px] text-zinc-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={horaDesconhecida}
                  onChange={(e) => {
                    setHoraDesconhecida(e.target.checked);
                    if (e.target.checked) setHoraNascimento("12:00");
                  }}
                  className="rounded border-zinc-700 bg-zinc-800 text-[#d4af37] focus:ring-0"
                />
                Não sei a hora exata
              </label>
            </div>
            <input
              type="time"
              value={horaNascimento}
              onChange={(e) => setHoraNascimento(e.target.value)}
              disabled={horaDesconhecida}
              className={`w-full bg-[#18181b] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-[#d4af37]/60 transition-colors [color-scheme:dark] ${
                horaDesconhecida ? "opacity-50 cursor-not-allowed" : ""
              }`}
            />
            {horaDesconhecida && (
              <p className="text-[10px] text-zinc-500 mt-1">
                Usaremos o meio-dia (12:00) como referência solar.
              </p>
            )}
          </div>
        </div>

        {/* Linha 3: Local de Nascimento */}
        <div className="space-y-3 pt-1">
          <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400">
            4. Local de Nascimento <span className="text-[#d4af37]">*</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* País */}
            <div>
              <label className="block text-[10px] text-zinc-500 mb-1">País</label>
              <select
                value={pais}
                onChange={(e) => {
                  setPais(e.target.value);
                  setEstado("");
                  setCidade("");
                  setCoords(null);
                }}
                className="w-full bg-[#18181b] border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-[#d4af37]/60"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.name} className="bg-zinc-900 text-zinc-200">
                    {c.flag} {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Estado (se Brasil) */}
            {isBrazil && (
              <div>
                <label className="block text-[10px] text-zinc-500 mb-1">Estado</label>
                <select
                  value={estado}
                  onChange={(e) => {
                    setEstado(e.target.value);
                    setCidade("");
                    setCoords(null);
                  }}
                  className="w-full bg-[#18181b] border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-[#d4af37]/60"
                >
                  <option value="">Selecione o estado</option>
                  {BRAZIL_STATES.map((st) => (
                    <option key={st.uf} value={st.uf} className="bg-zinc-900 text-zinc-200">
                      {st.uf} - {st.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Cidade com Autocomplete */}
            <div className={isBrazil ? "sm:col-span-1" : "sm:col-span-2"}>
              <label className="block text-[10px] text-zinc-500 mb-1">Cidade</label>
              <CityAutocomplete
                city={cidade}
                coords={coords}
                state={estado}
                country={pais}
                onSelectCity={handleSelectCity}
                onChangeCity={(val) => {
                  setCidade(val);
                  setCoords(null);
                }}
                inputStyle={{
                  backgroundColor: "#18181b",
                  borderColor: "rgba(255,255,255,0.1)",
                  borderRadius: "0.75rem",
                  padding: "0.5rem 0.75rem",
                  fontSize: "0.75rem",
                  color: "#f4f4f5",
                }}
              />
            </div>
          </div>

          {coords && coords.lat && coords.lng && (
            <div className="flex items-center gap-2 text-[10px] font-mono text-[#d4af37]/80 bg-[#d4af37]/5 px-3 py-1.5 rounded-lg border border-[#d4af37]/20">
              <span>✓</span>
              <span>
                Coordenadas validadas: {Number(coords.lat).toFixed(4)}°, {Number(coords.lng).toFixed(4)}°
              </span>
            </div>
          )}
        </div>

        {/* Linha 4: Área de Foco */}
        <div className="pt-2">
          <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-2">
            5. Qual o seu foco principal no momento? (Opcional)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {FOCUS_OPTIONS.map((opt) => {
              const selected = foco === opt.id;
              return (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => setFoco(opt.id)}
                  className={`text-left p-3 rounded-xl border transition-all ${
                    selected
                      ? "bg-[#d4af37]/10 border-[#d4af37] text-zinc-100"
                      : "bg-[#18181b]/60 border-white/5 text-zinc-400 hover:border-white/10 hover:text-zinc-200"
                  }`}
                >
                  <p className="text-xs font-semibold">{opt.rotulo}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-1">{opt.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Loading ou Botão de Envio */}
        <div className="pt-4">
          {loading ? (
            <div className="w-full py-3.5 px-4 bg-[#18181b] border border-[#d4af37]/30 rounded-xl text-center space-y-2">
              <div className="inline-block animate-spin text-base text-[#d4af37]">🧭</div>
              <p className="text-xs font-mono text-[#d4af37]">{etapaStatus || "Processando cálculo..."}</p>
              <p className="text-[10px] text-zinc-500">Isto leva apenas alguns instantes.</p>
            </div>
          ) : (
            <button
              type="submit"
              className="w-full py-3.5 px-6 rounded-xl font-semibold text-xs tracking-wide uppercase transition-all bg-[#d4af37] hover:bg-[#e4d18c] text-[#09090b] shadow-lg shadow-[#d4af37]/10 active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
            >
              <span>🧭</span>
              <span>Calibrar Minha Bússola & Gerar Mapa</span>
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
