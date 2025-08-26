import smtplib
from email.mime.text import MIMEText
import os

def enviar_email(destinatario, assunto, mensagem):
    try:
        smtp_server = os.getenv("SMTP_SERVER")
        smtp_port = int(os.getenv("SMTP_PORT", 587))
        smtp_username = os.getenv("SMTP_USERNAME")
        smtp_password = os.getenv("SMTP_PASSWORD")
        email_from = os.getenv("EMAIL_FROM", smtp_username)

        if not all([smtp_server, smtp_port, smtp_username, smtp_password]):
            print("[ERRO] Configurações SMTP ausentes no .env")
            return False

        msg = MIMEText(mensagem, "plain", "utf-8")
        msg["Subject"] = assunto
        msg["From"] = email_from
        msg["To"] = destinatario

        # Conexão e envio
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(smtp_username, smtp_password)
            server.sendmail(email_from, [destinatario], msg.as_string())

        print(f"[EMAIL] Enviado para {destinatario}")
        return True
    except Exception as e:
        print(f"[ERRO] Falha ao enviar e-mail: {e}")
        return False
