"use client";

/**
 * Redirecionamento da rota antiga de membros para o portal unificado da Bússola Astrológica (/admin).
 * O papel do usuário (cliente ou admin) decide a casca no /admin.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const search = window.location.search;
      router.replace(`/admin${search}`);
    } else {
      router.replace("/admin");
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#08090c] text-white">
      <div className="text-center">
        <span className="text-2xl text-[#E2B857] block mb-2">✦</span>
        <p className="text-xs font-mono uppercase tracking-widest text-[#E2B857] animate-pulse">
          Carregando Bússola Astrológica...
        </p>
      </div>
    </div>
  );
}
