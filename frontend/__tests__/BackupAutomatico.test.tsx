import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import BackupAutomatico from "@/components/backup/BackupAutomatico";
import BackupCards from "@/components/backup/BackupCards";
import TabelaBackups from "@/components/backup/TabelaBackups";
import AgendamentoBackup from "@/components/backup/AgendamentoBackup";
import ImportarBackup from "@/components/backup/ImportarBackup";

// Mock do Toast nativo do projeto
vi.mock("@/components/Toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
  default: () => null,
}));

describe("Módulo de Backup Automático (PostgreSQL / Backblaze B2)", () => {
  const mockStatus = {
    b2_connected: true,
    b2_bucket: "zap-voice",
    b2_endpoint: "https://s3.us-west-004.backblazeb2.com",
    last_backup_at: "2026-03-30T10:00:00Z",
    last_backup_status: "success",
    next_backup_at: "2026-03-30T16:00:00Z",
    is_auto_active: true,
    frequency_hours: 6,
    retention_current: 5,
    retention_max: 30,
    b2_folder: "AreaDeMembros/backups/",
  };

  const mockBackups = [
    {
      key: "AreaDeMembros/backups/backup-manual-2026-03-30.dump.gz",
      filename: "backup-manual-2026-03-30.dump.gz",
      size_bytes: 14889779,
      size_formatted: "14.2 MB",
      type: "Manual" as const,
      created_at: "2026-03-30T10:00:00Z",
    },
    {
      key: "AreaDeMembros/backups/backup-auto-2026-03-29.dump.gz",
      filename: "backup-auto-2026-03-29.dump.gz",
      size_bytes: 14500000,
      size_formatted: "13.8 MB",
      type: "Automático" as const,
      created_at: "2026-03-29T16:00:00Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/admin/backups/status")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockStatus),
        });
      }
      if (url.includes("/admin/backups/config")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockStatus),
        });
      }
      if (url.includes("/admin/backups")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ total: 2, backups: mockBackups }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  it("deve renderizar os 4 cards de status de backup corretamente", () => {
    render(<BackupCards status={mockStatus} loading={false} />);

    expect(screen.getByText("Último Backup")).toBeDefined();
    expect(screen.getByText("Próximo Backup")).toBeDefined();
    expect(screen.getByText("Retenção S3/B2")).toBeDefined();
    expect(screen.getByText("Status Backblaze B2")).toBeDefined();
    expect(screen.getByText("5 Dumps mantidos")).toBeDefined();
    expect(screen.getByText("Conectado")).toBeDefined();
    expect(screen.getByText("zap-voice")).toBeDefined();
  });

  it("deve renderizar a tabela de backups com as informações e botões de ação", () => {
    render(<TabelaBackups backups={mockBackups} loading={false} onRefresh={vi.fn()} />);

    expect(screen.getByText("backup-manual-2026-03-30.dump.gz")).toBeDefined();
    expect(screen.getByText("14.2 MB")).toBeDefined();
    expect(screen.getAllByText("Manual").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Automático").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Fazer Backup Agora")).toBeDefined();
  });

  it("deve abrir o modal de confirmação ao clicar em deletar e permitir cancelar", async () => {
    render(<TabelaBackups backups={mockBackups} loading={false} onRefresh={vi.fn()} />);

    const deleteButtons = screen.getAllByTitle("Excluir Backup");
    fireEvent.click(deleteButtons[0]);

    // Modal com backdrop e texto de confirmação
    expect(screen.getByText("Confirmar Exclusão")).toBeDefined();
    expect(screen.getByText("Esta ação é irreversível.")).toBeDefined();

    // Clicar em cancelar
    const cancelBtn = screen.getByText("Cancelar");
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByText("Confirmar Exclusão")).toBeNull();
    });
  });

  it("deve abrir o modal de restauração e permitir cancelar", async () => {
    render(<TabelaBackups backups={mockBackups} loading={false} onRefresh={vi.fn()} />);

    const restoreButtons = screen.getAllByTitle("Restaurar Banco de Dados");
    fireEvent.click(restoreButtons[0]);

    expect(screen.getByText("Restaurar Banco de Dados")).toBeDefined();
    expect(screen.getByText("Atenção: Ação Crítica")).toBeDefined();

    const cancelBtn = screen.getByText("Cancelar");
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByText("Restaurar Banco de Dados")).toBeNull();
    });
  });

  it("deve alternar abas no componente principal BackupAutomatico", async () => {
    render(<BackupAutomatico />);

    await waitFor(() => {
      expect(screen.getByText(/Backup Automático/)).toBeDefined();
    });

    // Clicar na aba Agendamento Automático
    const tabAgendamento = screen.getByText("Agendamento Automático");
    fireEvent.click(tabAgendamento);

    await waitFor(() => {
      expect(screen.getByText("Parâmetros do Agendador Automático")).toBeDefined();
    });

    // Clicar na aba Importar Backup Externo
    const tabImportar = screen.getByText("Importar Backup Externo");
    fireEvent.click(tabImportar);

    await waitFor(() => {
      expect(screen.getByText("Upload de Arquivo de Backup")).toBeDefined();
      expect(screen.getByText(/Arraste e solte o arquivo de backup aqui/i)).toBeDefined();
    });
  });

  it("deve permitir alterar e salvar as configurações na aba AgendamentoBackup", async () => {
    const onSavedMock = vi.fn();
    render(<AgendamentoBackup onSaved={onSavedMock} />);

    await waitFor(() => {
      expect(screen.getByText("Ativar Backup Automático")).toBeDefined();
    });

    const submitBtn = screen.getByText("Salvar Configurações");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/admin/backups/config"),
        expect.objectContaining({ method: "PUT" })
      );
    });
  });

  it("deve validar extensão na aba ImportarBackup", () => {
    const onUploadedMock = vi.fn();
    render(<ImportarBackup onUploaded={onUploadedMock} />);

    expect(screen.getByText("Upload de Arquivo de Backup")).toBeDefined();
    expect(screen.getByText("Enviar e Salvar no B2")).toBeDefined();
  });
});
