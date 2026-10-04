"""
brevo_service.py — Sirius Academy
Envio de e-mails transacionais e códigos OTP via API REST do Brevo (Sendinblue).
"""
import os
import logging
import requests

logger = logging.getLogger(__name__)

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"


def _html_verification_code(name: str, code: str) -> str:
    first_name = name.split()[0] if name else "Aluno(a)"
    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Código de Verificação ✨</title>
</head>
<body style="margin:0;padding:0;background-color:#0f0b1e;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f0eeff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f0b1e;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background-color:#1a1535;border:1px solid rgba(127,119,221,0.25);border-radius:24px;overflow:hidden;box-shadow:0 25px 60px -15px rgba(0,0,0,0.8);">
          <!-- Cabeçalho Cósmico -->
          <tr>
            <td style="padding:36px 40px 24px;text-align:center;border-bottom:1px solid rgba(127,119,221,0.2);">
              <div style="font-size:32px;margin-bottom:8px;">🧭</div>
              <p style="margin:0 0 6px;font-size:11px;letter-spacing:3px;color:#8b87b8;text-transform:uppercase;">Sirius Academy</p>
              <h1 style="margin:0;font-size:24px;color:#f0eeff;font-weight:700;">Confirmação de Cadastro</h1>
            </td>
          </tr>

          <!-- Conteúdo -->
          <tr>
            <td style="padding:32px 40px;">
              <p style="margin:0 0 16px;font-size:16px;color:#f0eeff;">
                Olá, <strong style="color:#AFA9EC;">{first_name}</strong> ✨
              </p>
              <p style="margin:0 0 24px;font-size:14px;color:#cdc9ef;line-height:1.6;">
                Você iniciou a criação da sua conta na <strong>Sirius Academy</strong>. Para garantir a segurança e validar que seu endereço de e-mail está correto, utilize o código de verificação abaixo:
              </p>

              <!-- Bloco do Código OTP -->
              <div style="text-align:center;margin:32px 0;">
                <div style="display:inline-block;padding:18px 36px;background:rgba(127,119,221,0.12);border:2px dashed #7F77DD;border-radius:16px;">
                  <span style="font-family:'Courier New',Courier,monospace;font-size:36px;font-weight:bold;letter-spacing:10px;color:#EF9F27;">{code}</span>
                </div>
                <p style="margin:12px 0 0;font-size:12px;color:#8b87b8;">
                  ⏱️ Este código é válido por <strong>15 minutos</strong>.
                </p>
              </div>

              <div style="padding:14px 18px;background:rgba(239,159,39,0.08);border:1px solid rgba(239,159,39,0.25);border-radius:12px;margin-bottom:24px;">
                <p style="margin:0;font-size:12px;color:#FBBF24;line-height:1.5;">
                  🔒 <strong>Dica de Segurança:</strong> Nunca compartilhe este código com terceiros. A equipe da Sirius nunca solicitará sua senha ou código fora da plataforma.
                </p>
              </div>

              <p style="margin:0;font-size:12px;color:#8b87b8;line-height:1.5;">
                Se você não solicitou este cadastro, por favor desconsidere este e-mail.
              </p>
            </td>
          </tr>

          <!-- Rodapé -->
          <tr>
            <td style="background-color:#130f26;padding:20px 40px;text-align:center;border-top:1px solid rgba(127,119,221,0.15);">
              <p style="margin:0;font-size:11px;color:#8b87b8;">
                Sirius Academy · Plataforma Cósmica de Autoconhecimento
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def send_brevo_verification_code(to_email: str, name: str, code: str) -> bool:
    """
    Envia o código de verificação de cadastro para o usuário utilizando a API REST do Brevo.
    """
    api_key = os.getenv("BREVO_API_KEY", "").strip()
    sender_name = os.getenv("BREVO_SENDER_NAME", "Sirius Academy").strip().strip('"')
    sender_email = os.getenv("BREVO_SENDER_EMAIL", "contato@academysirius.online").strip()

    if not api_key:
        logger.warning(
            f"[Brevo] BREVO_API_KEY não configurada. Código de verificação para {to_email}: {code} (Modo Simulação/Dev)"
        )
        return False

    headers = {
        "accept": "application/json",
        "api-key": api_key,
        "content-type": "application/json",
    }

    payload = {
        "sender": {
            "name": sender_name,
            "email": sender_email,
        },
        "to": [
            {
                "email": to_email,
                "name": name,
            }
        ],
        "subject": f"✨ Seu Código de Verificação Sirius: {code}",
        "htmlContent": _html_verification_code(name, code),
    }

    try:
        response = requests.post(BREVO_API_URL, headers=headers, json=payload, timeout=10)
        if response.status_code in [200, 201, 202]:
            logger.info(f"[Brevo] Código de verificação enviado com sucesso para {to_email}.")
            return True
        else:
            logger.error(
                f"[Brevo] Falha ao enviar e-mail para {to_email}. Status HTTP {response.status_code}: {response.text}"
            )
            return False
    except Exception as exc:
        logger.error(f"[Brevo] Exceção ao conectar na API do Brevo para {to_email}: {exc}")
        return False
