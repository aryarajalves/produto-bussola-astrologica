"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { C, type DashboardData, type ClientDetail } from "@/types/admin";
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
    const token = typeof window !== "undefined" ? localStorage.getItem("sirius_token") : null;
    if (!token) {
      router.push("/admin/login");
      return;
    }
    api.get<{ name: string; email: string }>("/auth/me")
      .then((res) => {
        if (res && res.email) {
          setCurrentUser(res);
        }
      })
      .catch(() => {});
    fetchDashboard();
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
            {activeTab === "home"
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
              Bussola Astrologica
            </span>
          </div>
        </header>

        {/* Corpo da Página */}
        <main className="p-8 flex-1 overflow-auto">
          {/* Aba Home / Formulário de Coleta de Informações */}
          {activeTab === "home" && (
            <div className="w-full">
              <LeadQuestionnaire
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
