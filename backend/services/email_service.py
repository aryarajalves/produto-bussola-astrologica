"""
email_service.py — Sirius Academy
Envio de emails transacionais via Resend.
"""
import os
import logging
import resend
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

resend.api_key = os.getenv("RESEND_API_KEY", "")

_FROM = os.getenv("RESEND_FROM", "Andrieli Oliver <onboarding@resend.dev>")
_DASHBOARD_URL = os.getenv("DASHBOARD_URL", "https://academysirius.online/login")


def _html_boas_vindas(name: str, email: str, password: str, sun_sign: str) -> str:
    first = name.split()[0]
    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Seu Mapa da Alma está pronto ✨</title>
</head>
<body style="margin:0;padding:0;background-color:#0f0b1e;font-family:'Georgia',serif;">

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f0b1e;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background-color:#1a1535;border-radius:16px 16px 0 0;padding:36px 40px 24px;text-align:center;border-bottom:1px solid rgba(127,119,221,0.25);">
              <p style="margin:0 0 6px;font-size:11px;letter-spacing:3px;color:#8b87b8;text-transform:uppercase;">Sirius Academy</p>
              <h1 style="margin:0;font-size:28px;color:#EF9F27;font-style:italic;">Mapa da Alma</h1>
              <p style="margin:8px 0 0;font-size:13px;color:#8b87b8;">por Andrieli Oliver</p>
            </td>
          </tr>

          <!-- Corpo principal -->
          <tr>
            <td style="background-color:#1a1535;padding:32px 40px;">

              <p style="margin:0 0 20px;font-size:18px;color:#f0eeff;">
                Olá, <strong style="color:#AFA9EC;">{first}</strong> ✨
              </p>

              <p style="margin:0 0 16px;font-size:15px;color:#cdc9ef;line-height:1.7;">
                Seu <strong>Mapa da Alma</strong> foi gerado com sucesso e já está esperando por você.
                Este é um momento especial — sua carta natal foi lida e traduzida com cuidado para te revelar quem você verdadeiramente é.
              </p>

              <!-- Signo Solar -->
              <div style="background:rgba(127,119,221,0.08);border:1px solid rgba(127,119,221,0.25);border-radius:12px;padding:16px 20px;margin:0 0 24px;text-align:center;">
                <p style="margin:0 0 4px;font-size:11px;letter-spacing:2px;color:#8b87b8;text-transform:uppercase;">Seu Signo Solar</p>
                <p style="margin:0;font-size:22px;font-weight:bold;color:#EF9F27;">☀️ {sun_sign}</p>
              </div>

              <p style="margin:0 0 8px;font-size:14px;font-weight:bold;color:#f0eeff;">
                🔐 Seus dados de acesso:
              </p>
              <p style="margin:0 0 16px;font-size:13px;color:#8b87b8;line-height:1.5;">
                Guarde essas informações — você vai precisar delas para entrar na área de membros:
              </p>

              <!-- Credenciais -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="background:#0f0b1e;border:1px solid rgba(127,119,221,0.3);border-radius:10px;padding:16px 20px;">
                    <p style="margin:0 0 12px;font-size:12px;color:#8b87b8;">E-mail de acesso:</p>
                    <p style="margin:0 0 16px;font-size:15px;font-weight:bold;color:#f0eeff;font-family:monospace;">{email}</p>
                    <p style="margin:0 0 8px;font-size:12px;color:#8b87b8;">Sua senha de acesso:</p>
                    <p style="margin:0;font-size:18px;font-weight:bold;color:#EF9F27;font-family:monospace;letter-spacing:2px;">{password}</p>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <div style="text-align:center;margin:0 0 28px;">
                <a href="{_DASHBOARD_URL}"
                   style="display:inline-block;background:linear-gradient(135deg,#7F77DD,#3C3489);color:#f0eeff;text-decoration:none;padding:14px 36px;border-radius:50px;font-size:15px;font-weight:bold;letter-spacing:0.5px;">
                  ✨ Acessar Meu Mapa da Alma
                </a>
              </div>

              <p style="margin:0;font-size:13px;color:#8b87b8;line-height:1.6;font-style:italic;">
                "Você não chegou até aqui por acaso. O céu guardou o seu código desde o momento em que você nasceu."
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#0f0b1e;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;border-top:1px solid rgba(127,119,221,0.15);">
              <p style="margin:0 0 6px;font-size:11px;color:#3C3489;">Sirius Academy · por Andrieli Oliver</p>
              <p style="margin:0;font-size:10px;color:#3C3489;">Este email foi enviado porque você preencheu o formulário do Mapa da Alma.</p>
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
    Retorna True se enviou com sucesso, False se falhou
    (falha não interrompe o fluxo do funil).
    """
    if not resend.api_key or resend.api_key == "cole_sua_api_key_aqui":
        logger.warning("RESEND_API_KEY não configurada — email de boas-vindas não enviado.")
        return False

    first = name.split()[0]
    try:
        params: resend.Emails.SendParams = {
            "from": _FROM,
            "to": [to_email],
            "subject": f"✨ {first}, seu Mapa da Alma está pronto!",
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
<title>Recuperação de Senha ✨</title>
</head>
<body style="margin:0;padding:0;background-color:#0f0b1e;font-family:'Georgia',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f0b1e;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          <tr>
            <td style="background-color:#1a1535;border-radius:16px 16px 0 0;padding:36px 40px 24px;text-align:center;border-bottom:1px solid rgba(127,119,221,0.25);">
              <p style="margin:0 0 6px;font-size:11px;letter-spacing:3px;color:#8b87b8;text-transform:uppercase;">Sirius Academy</p>
              <h1 style="margin:0;font-size:28px;color:#EF9F27;font-style:italic;">Recuperação de Senha</h1>
            </td>
          </tr>
          <tr>
            <td style="background-color:#1a1535;padding:32px 40px;">
              <p style="margin:0 0 20px;font-size:18px;color:#f0eeff;">Olá, <strong style="color:#AFA9EC;">{first}</strong> ✨</p>
              <p style="margin:0 0 16px;font-size:15px;color:#cdc9ef;line-height:1.7;">
                Recebemos uma solicitação de recuperação de senha para a sua conta na Sirius Academy.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="background:#0f0b1e;border:1px solid rgba(127,119,221,0.3);border-radius:10px;padding:16px 20px;">
                    <p style="margin:0 0 8px;font-size:12px;color:#8b87b8;">Sua nova senha de acesso:</p>
                    <p style="margin:0;font-size:20px;font-weight:bold;color:#EF9F27;font-family:monospace;letter-spacing:2px;">{new_password}</p>
                  </td>
                </tr>
              </table>
              <div style="text-align:center;margin:0 0 28px;">
                <a href="{_DASHBOARD_URL}" style="display:inline-block;background:linear-gradient(135deg,#7F77DD,#3C3489);color:#f0eeff;text-decoration:none;padding:14px 36px;border-radius:50px;font-size:15px;font-weight:bold;">
                  ✨ Fazer Login Agora
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
            "subject": "🔑 Sua nova senha de acesso — Sirius Academy",
            "html": _html_reset_senha(name, to_email, new_password),
        }
        response = resend.Emails.send(params)
        logger.info("Email de recuperação enviado para '%s' | id=%s", to_email, response.get("id"))
        return True
    except Exception:
        logger.exception("Falha ao enviar email de recuperação para '%s'", to_email)
        return False
