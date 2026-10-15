"""
email_service.py — Bússola Astrológica
Envio de emails transacionais via Resend.
"""
import os
import logging
import resend
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

resend.api_key = os.getenv("RESEND_API_KEY", "")

_FROM = os.getenv("RESEND_FROM", "Crassus Gobbi <onboarding@resend.dev>")
_DASHBOARD_URL = os.getenv("DASHBOARD_URL", "https://bussolaastrologica.com.br/login")


def _html_boas_vindas(name: str, email: str, password: str, sun_sign: str) -> str:
    first = name.split()[0]
    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Sua Bússola Astrológica está pronta 🧭</title>
</head>
<body style="margin:0;padding:0;background-color:#09090b;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#09090b;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background-color:#18181b;border:1px solid rgba(255,255,255,0.1);border-radius:16px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background-color:#18181b;padding:36px 40px 24px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.08);">
              <p style="margin:0 0 6px;font-size:11px;letter-spacing:3px;color:#d4af37;text-transform:uppercase;font-weight:600;">Bússola Astrológica</p>
              <h1 style="margin:0;font-size:26px;color:#f4f4f5;font-weight:700;">Leitura & Navegação Tática</h1>
              <p style="margin:8px 0 0;font-size:13px;color:#71717a;">por Crassus Gobbi</p>
            </td>
          </tr>

          <!-- Corpo principal -->
          <tr>
            <td style="padding:32px 40px;">

              <p style="margin:0 0 20px;font-size:18px;color:#f4f4f5;">
                Olá, <strong style="color:#d4af37;">{first}</strong> 🧭
              </p>

              <p style="margin:0 0 16px;font-size:15px;color:#a1a1aa;line-height:1.7;">
                Sua <strong>Bússola Astrológica</strong> foi mapeada com sucesso.
                Sua leitura personalizada está disponível para consulta e navegação das forças ativas.
              </p>

              <!-- Signo Solar -->
              <div style="background:rgba(212,175,55,0.06);border:1px solid rgba(212,175,55,0.25);border-radius:12px;padding:16px 20px;margin:0 0 24px;text-align:center;">
                <p style="margin:0 0 4px;font-size:11px;letter-spacing:2px;color:#d4af37;text-transform:uppercase;font-weight:600;">Seu Signo Solar</p>
                <p style="margin:0;font-size:22px;font-weight:bold;color:#f4f4f5;">☀️ {sun_sign}</p>
              </div>

              <p style="margin:0 0 8px;font-size:14px;font-weight:bold;color:#f4f4f5;">
                🔐 Seus dados de acesso:
              </p>
              <p style="margin:0 0 16px;font-size:13px;color:#71717a;line-height:1.5;">
                Guarde essas informações para acessar sua plataforma:
              </p>

              <!-- Credenciais -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="background:#09090b;border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:16px 20px;">
                    <p style="margin:0 0 8px;font-size:12px;color:#71717a;">E-mail de acesso:</p>
                    <p style="margin:0 0 16px;font-size:15px;font-weight:bold;color:#f4f4f5;font-family:monospace;">{email}</p>
                    <p style="margin:0 0 8px;font-size:12px;color:#71717a;">Sua senha de acesso:</p>
                    <p style="margin:0;font-size:18px;font-weight:bold;color:#d4af37;font-family:monospace;letter-spacing:2px;">{password}</p>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <div style="text-align:center;margin:0 0 28px;">
                <a href="{_DASHBOARD_URL}"
                   style="display:inline-block;background:#d4af37;color:#09090b;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:14px;font-weight:bold;letter-spacing:0.5px;">
                  🧭 Acessar Minha Bússola
                </a>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#121215;padding:20px 40px;text-align:center;border-top:1px solid rgba(255,255,255,0.05);">
              <p style="margin:0 0 6px;font-size:11px;color:#71717a;">Bússola Astrológica · Crassus Gobbi</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>"""


def send_boas_vindas(
    to_email: str,
    name: str,
    password: str,
    sun_sign: str,
) -> bool:
    """
    Envia o email de boas-vindas com as credenciais de acesso.
    Retorna True se enviou com sucesso, False se falhou.
    """
    if not resend.api_key or resend.api_key == "cole_sua_api_key_aqui":
        logger.warning("RESEND_API_KEY não configurada — email de boas-vindas não enviado.")
        return False

    first = name.split()[0]
    try:
        params: resend.Emails.SendParams = {
            "from": _FROM,
            "to": [to_email],
            "subject": f"🧭 {first}, sua Bússola Astrológica está pronta!",
            "html": _html_boas_vindas(name, to_email, password, sun_sign),
        }
        response = resend.Emails.send(params)
        logger.info("Email de boas-vindas enviado para '%s' | id=%s", to_email, response.get("id"))
        return True
    except Exception:
        logger.exception("Falha ao enviar email de boas-vindas para '%s'", to_email)
        return False


def _html_reset_senha(name: str, email: str, new_password: str) -> str:
    first = name.split()[0] if name else "Cliente"
    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Recuperação de Senha 🧭</title>
</head>
<body style="margin:0;padding:0;background-color:#09090b;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#09090b;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background-color:#18181b;border:1px solid rgba(255,255,255,0.1);border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:36px 40px 24px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.08);">
              <p style="margin:0 0 6px;font-size:11px;letter-spacing:3px;color:#d4af37;text-transform:uppercase;font-weight:600;">Bússola Astrológica</p>
              <h1 style="margin:0;font-size:24px;color:#f4f4f5;font-weight:700;">Recuperação de Senha</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;">
              <p style="margin:0 0 20px;font-size:18px;color:#f4f4f5;">Olá, <strong style="color:#d4af37;">{first}</strong> 🧭</p>
              <p style="margin:0 0 16px;font-size:15px;color:#a1a1aa;line-height:1.7;">
                Recebemos uma solicitação de recuperação de senha para a sua conta na Bússola Astrológica.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="background:#09090b;border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:16px 20px;">
                    <p style="margin:0 0 8px;font-size:12px;color:#71717a;">Sua nova senha de acesso:</p>
                    <p style="margin:0;font-size:20px;font-weight:bold;color:#d4af37;font-family:monospace;letter-spacing:2px;">{new_password}</p>
                  </td>
                </tr>
              </table>
              <div style="text-align:center;margin:0 0 28px;">
                <a href="{_DASHBOARD_URL}" style="display:inline-block;background:#d4af37;color:#09090b;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:14px;font-weight:bold;">
                  🧭 Acessar Plataforma
                </a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def send_password_reset(to_email: str, name: str, new_password: str) -> bool:
    if not resend.api_key or resend.api_key == "cole_sua_api_key_aqui":
        logger.warning("RESEND_API_KEY não configurada — email de recuperação não enviado.")
        return False

    try:
        params: resend.Emails.SendParams = {
            "from": _FROM,
            "to": [to_email],
            "subject": "🔑 Sua nova senha de acesso — Bússola Astrológica",
            "html": _html_reset_senha(name, to_email, new_password),
        }
        response = resend.Emails.send(params)
        logger.info("Email de recuperação enviado para '%s' | id=%s", to_email, response.get("id"))
        return True
    except Exception:
        logger.exception("Falha ao enviar email de recuperação para '%s'", to_email)
        return False

