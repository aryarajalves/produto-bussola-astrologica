"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { C, type DashboardData, type ClientDetail } from "@/types/admin";
import PainelAluno, { type AreaAluno } from "@/components/PainelAluno";
import Tutorial, { tutorialPendente } from "@/components/Tutorial";
import AdminSidebar from "@/components/AdminSidebar";
import PesquisaClientes from "@/components/PesquisaClientes";
import ClientDrawer from "@/components/ClientDrawer";
import LeadQuestionnaire from "@/components/LeadQuestionnaire";
import HistoricoPesquisas from "@/components/HistoricoPesquisas";
import GestaoUsuarios from "@/components/GestaoUsuarios";
import BackupAutomatico from "@/components/backup/BackupAutomatico";
import GerenciamentoLogs from "@/components/GerenciamentoLogs";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("home");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientDetail | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ name?: string; email?: string } | null>(null);
  // null = ainda nao sabemos. Nada de gestao e desenhado antes de saber.
  const [papel, setPapel] = useState<string | null>(null);
  const [tutorialAberto, setTutorialAberto] = useState(false);
  const router = useRouter();

  const fetchDashboard = useCallback(async () => {
    try {
      const data = await api.get<DashboardData>("/admin/dashboard");
      setDashboard(data);
    } catch {
      // Falha tratada silenciosamente
    }
  }, []);

  useEffect(() => {
    const token = typeof window !== "undefined" ? (localStorage.getItem("bussola_token") || localStorage.getItem("sirius_token")) : null;
    if (!token) {
      router.push("/admin/login");
      return;
    }
    api.get<{ name: string; email: string; role?: string }>("/auth/me")
      .then((res) => {
        if (res && res.email) {
          setCurrentUser(res);
          setPapel(res.role || "client");
          // O tour e do aluno: admin nao precisa que expliquem o painel dele.
          if (res.role !== "admin" && tutorialPendente()) setTutorialAberto(true);
          // O painel de gestao so e montado para quem e admin de verdade.
          // Antes disto bastava ter token: um cliente logado via a tela toda
          // e so tomava o erro depois, vindo do backend.
          if (res.role === "admin") fetchDashboard();
        }
      })
      .catch(() => router.push("/admin/login"));
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab) {
        if (tab === "dados" || tab === "coleta") setActiveTab("dados");
        else if (tab === "leitura" || tab === "analise") setActiveTab(papel === "admin" ? "leitura" : "pesquisa");
        else if (tab === "diario") setActiveTab(papel === "admin" ? "diario" : "historico");
        else if (tab === "bussola") setActiveTab(papel === "admin" ? "bussola" : "home");
        else setActiveTab(tab);
      }
    }
  }, []);

  const openClient = async (id: string) => {
    try {
      const c = await api.get<ClientDetail>(`/admin/clients/${id}`);
      setSelectedClient(c);
    } catch {
      alert("Erro ao carregar detalhes do cliente.");
    }
  };

  const changeStatus = async (id: string, newStatus: string) => {
    try {
      await api.patch(`/admin/clients/${id}/status`, { status: newStatus });
      if (selectedClient && selectedClient.id === id) {
        setSelectedClient({
          ...selectedClient,
          chart: selectedClient.chart
            ? { ...selectedClient.chart, status: newStatus }
            : null,
        });
      }
      fetchDashboard();
    } catch {
      alert("Erro ao alterar status.");
    }
  };

  const removeClient = (id: string) => {
    if (selectedClient && selectedClient.id === id) {
      setSelectedClient(null);
    }
    fetchDashboard();
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    localStorage.removeItem("bussola_token");
    localStorage.removeItem("sirius_token");
    router.push("/admin/login");
  };

  return (
    <div
      className="min-h-screen flex"
      style={{ background: C.bg, color: C.text }}
    >
      {/* Barra Lateral com Categorias, Usuário Logado e Sair */}
      <AdminSidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onLogout={() => setShowLogoutModal(true)}
        currentUser={currentUser}
        papel={papel || "client"}
      />

      <Tutorial
        aberto={tutorialAberto}
        onFechar={() => setTutorialAberto(false)}
        nome={currentUser?.name}
      />

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header Superior */}
        <header
          className="px-8 py-4 flex items-center justify-between"
          style={{
            borderBottom: `1px solid ${C.border}`,
            background: "#130f2c",
          }}
        >
          <h1 className="text-xl font-bold" style={{ color: C.light }}>
            {papel !== "admin"
              ? activeTab === "home"
                ? "Minha Bússola"
                : activeTab === "pesquisa"
                ? "A leitura do dia"
                : "Diário de bordo"
              : activeTab === "home"
              ? "Visão Geral (Home)"
              : activeTab === "pesquisa"
              ? "Pesquisa"
              : activeTab === "historico"
              ? "Histórico de Pesquisas"
              : activeTab === "backup_automatico"
              ? "Backup Automático"
              : activeTab === "sistema_logs"
              ? "Sistema de Logs"
              : "Gestão de Usuários"}
          </h1>
          <div className="flex items-center gap-4">
            <span
              className="text-sm font-semibold tracking-wide"
              style={{ color: C.muted }}
            >
              {papel !== "admin" ? "Bússola Astrológica" : "Bussola Astrologica"}
            </span>
          </div>
        </header>

        {/* Corpo da Página */}
        <main className="p-8 flex-1 overflow-auto">
          {/* Enquanto o papel nao chega, nada e desenhado: o que vazava antes
              era justamente a tela de gestao aparecendo durante esse vao. */}
          {papel === null && (
            <p className="text-sm" style={{ color: C.muted }}>Carregando...</p>
          )}

          {/* Visão do Aluno / Bússola Pessoal */}
          {papel !== null && (papel !== "admin" || ["leitura", "bussola", "diario", "dados"].includes(activeTab)) && (
            <PainelAluno
              area={(
                activeTab === "pesquisa" || activeTab === "leitura"
                  ? "leitura"
                  : activeTab === "historico" || activeTab === "diario"
                  ? "diario"
                  : activeTab === "dados"
                  ? "dados"
                  : "bussola"
              ) as AreaAluno}
              usuario={currentUser}
              onIrPara={(a) => {
                if (papel === "admin") {
                  setActiveTab(a);
                } else {
                  setActiveTab(
                    a === "leitura"
                      ? "pesquisa"
                      : a === "diario"
                      ? "historico"
                      : a === "dados"
                      ? "dados"
                      : "home"
                  );
                }
              }}
            />
          )}

          {/* Ferramentas Exclusivas de Gestão para Administradores */}
          {papel === "admin" && !["leitura", "bussola", "diario", "dados"].includes(activeTab) && (<>
          {/* Aba Home / Cadastrar Mapa */}
          {activeTab === "home" && (
            <div className="w-full">
              <LeadQuestionnaire
                papel={papel || "client"}
                onClientCreated={() => {
                  fetchDashboard();
                }}
                onNavigateToSearch={() => setActiveTab("pesquisa")}
              />
            </div>
          )}

          {/* Aba Pesquisa de Clientes */}
          {activeTab === "pesquisa" && (
            <PesquisaClientes
              onOpenClient={openClient}
              onGoToHome={() => setActiveTab("home")}
            />
          )}

          {/* Aba Histórico de Pesquisas */}
          {activeTab === "historico" && (
            <HistoricoPesquisas onOpenClient={openClient} />
          )}

          {/* Aba Backup Automático */}
          {activeTab === "backup_automatico" && <BackupAutomatico />}

          {/* Aba Sistema de Logs */}
          {activeTab === "sistema_logs" && <GerenciamentoLogs />}

          {/* Aba Gestão de Usuários */}
          {activeTab === "gestao_usuarios" && <GestaoUsuarios />}
          </>)}
        </main>
      </div>

      {/* Drawer de Detalhes do Cliente */}
      {selectedClient && (
        <ClientDrawer
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
          onStatusChange={changeStatus}
          onDelete={removeClient}
        />
      )}

      {/* Popup de Confirmação de Logout */}
      {showLogoutModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-modal-title"
        >
          <div
            className="w-full max-w-md rounded-2xl p-6 shadow-2xl relative select-none"
            style={{
              background: "#161233",
              border: "1px solid rgba(127, 119, 221, 0.3)",
              boxShadow:
                "0 20px 40px -15px rgba(0, 0, 0, 0.8), 0 0 30px rgba(127, 119, 221, 0.15)",
            }}
          >
            <div className="flex items-center gap-3.5 mb-4">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                }}
              >
                <svg
                  className="w-6 h-6 text-red-400 rotate-180"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </div>
              <div>
                <h3
                  id="logout-modal-title"
                  className="text-lg font-bold text-white tracking-wide"
                >
                  Encerrar Sessão
                </h3>
                <p className="text-xs text-indigo-200/60 mt-0.5">
                  Bussola Astrologica
                </p>
              </div>
            </div>

            <p className="text-sm text-indigo-100/80 mb-6 leading-relaxed">
              Tem certeza de que deseja sair do painel administrativo? Você precisará realizar o login novamente para acessar o sistema.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-indigo-200/80 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                style={{ border: "1px solid rgba(127, 119, 221, 0.2)" }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmLogout}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-500 shadow-lg shadow-red-900/30 transition-all cursor-pointer flex items-center gap-2"
              >
                Confirmar Saída
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
