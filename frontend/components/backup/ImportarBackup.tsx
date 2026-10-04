"use client";

import React, { useState, useRef } from "react";
import {
  IconUploadCloud,
  IconFileUp,
  IconInfo,
  IconRefresh,
  IconFileArchive,
} from "./BackupIcons";
import { toast } from "@/components/Toast";

interface ImportarBackupProps {
  onUploaded: () => void;
}

export default function ImportarBackup({ onUploaded }: ImportarBackupProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8005";

  const allowedExtensions = [".dump", ".dump.gz", ".sql", ".sql.gz"];

  const validateAndSetFile = (selectedFile: File) => {
    const name = selectedFile.name.toLowerCase();
    const isValid = allowedExtensions.some((ext) => name.endsWith(ext));
    if (!isValid) {
      toast.error("Formato inválido! Envie um arquivo .dump, .dump.gz, .sql ou .sql.gz");
      return;
    }
    setFile(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Selecione um arquivo de backup para enviar.");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${apiUrl}/admin/backups/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Erro ao importar backup externo.");
      }

      toast.success("Backup importado e armazenado no Backblaze B2 com sucesso!");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onUploaded();
    } catch (e: any) {
      toast.error(e.message || "Falha no envio do arquivo.");
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div
        className="rounded-2xl p-6 sm:p-8 shadow-xl space-y-6"
        style={{
          background: "#1a1535",
          border: "1px solid rgba(127, 119, 221, 0.25)",
        }}
      >
        <div>
          <h3 className="text-base font-bold flex items-center gap-2" style={{ color: "#f0eeff" }}>
            <span className="p-2 rounded-xl bg-[#7F77DD]/20 text-[#AFA9EC] border border-[#7F77DD]/30">
              <IconUploadCloud className="w-4 h-4" />
            </span>
            Upload de Arquivo de Backup
          </h3>
          <p className="text-xs mt-1.5 leading-relaxed" style={{ color: "#8b87b8" }}>
            Envie arquivos externos para serem armazenados com segurança no Backblaze B2.
          </p>
        </div>

        {/* Zona Drag & Drop */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
            isDragging
              ? "border-[#7F77DD] bg-[#7F77DD]/20 shadow-[0_0_25px_rgba(127,119,221,0.4)]"
              : "border-[#7F77DD]/35 hover:border-[#7F77DD] bg-white/[0.02] hover:bg-[#7F77DD]/10"
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".dump,.dump.gz,.sql,.sql.gz"
            className="hidden"
          />

          <div className="p-4 rounded-2xl bg-[#7F77DD]/20 border border-[#7F77DD]/35 text-[#AFA9EC] shadow-md">
            <IconFileUp className="w-8 h-8" />
          </div>

          <div>
            <p className="text-sm font-semibold" style={{ color: "#f0eeff" }}>
              Arraste e solte o arquivo de backup aqui ou clique para selecionar
            </p>
            <p className="text-xs mt-1.5" style={{ color: "#8b87b8" }}>
              Formatos aceitos: <span className="text-[#AFA9EC] font-bold">.dump, .dump.gz, .sql, .sql.gz</span> (Tamanho máximo recomendado: 500 MB)
            </p>
          </div>

          {file && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="mt-3 px-4 py-2.5 rounded-xl flex items-center gap-2.5 text-xs font-semibold shadow-md"
              style={{
                background: "rgba(127, 119, 221, 0.25)",
                border: "1px solid rgba(127, 119, 221, 0.4)",
                color: "#f0eeff",
              }}
            >
              <IconFileArchive className="w-4 h-4 text-[#AFA9EC]" />
              <span className="font-mono">{file.name}</span>
              <span style={{ color: "#AFA9EC" }}>({formatFileSize(file.size)})</span>
            </div>
          )}
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {file && (
            <button
              type="button"
              onClick={() => {
                setFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer"
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#8b87b8",
              }}
            >
              Remover
            </button>
          )}

          <button
            type="button"
            onClick={handleUpload}
            disabled={!file || uploading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 cursor-pointer shadow-lg"
            style={{
              background: "linear-gradient(135deg, #7F77DD, #534ab3)",
              color: "#ffffff",
              boxShadow: "0 0 20px rgba(127, 119, 221, 0.4)",
            }}
          >
            {uploading ? (
              <>
                <IconRefresh className="w-4 h-4 animate-spin" />
                <span>Enviando para o Backblaze B2...</span>
              </>
            ) : (
              <>
                <IconUploadCloud className="w-4 h-4" />
                <span>Enviar e Salvar no B2</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Orientações */}
      <div
        className="p-5 rounded-2xl border space-y-3"
        style={{
          background: "#1a1535",
          borderColor: "rgba(127, 119, 221, 0.2)",
        }}
      >
        <div className="flex items-center gap-2 text-xs font-bold" style={{ color: "#f0eeff" }}>
          <span className="text-blue-400">
            <IconInfo className="w-4 h-4" />
          </span>
          <span>Orientações de Importação</span>
        </div>
        <ul className="text-xs space-y-2 list-disc pl-5 leading-relaxed" style={{ color: "#8b87b8" }}>
          <li>
            Arquivos <strong style={{ color: "#f0eeff" }}>.dump</strong> ou <strong style={{ color: "#f0eeff" }}>.dump.gz</strong> devem ter sido gerados preferencialmente com o utilitário nativo <code className="text-[#AFA9EC] font-bold">pg_dump -Fc</code>.
          </li>
          <li>
            Ao finalizar o envio, o dump aparecerá automaticamente na aba <strong style={{ color: "#f0eeff" }}>Backups no S3</strong> marcado com a etiqueta <span className="font-bold text-[#EF9F27]">Externo</span>.
          </li>
          <li>
            Para aplicar o arquivo restaurando a base de dados, utilize o botão de restauração na tabela de listagem.
          </li>
        </ul>
      </div>
    </div>
  );
}
