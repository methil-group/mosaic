import smtplib
import sqlite3
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

class Mailer:
    def __init__(self, smtp_host, smtp_port, db_name):
        self.smtp_host = smtp_host
        self.smtp_port = smtp_port
        self.db_name = db_name

    def envoyer_newsletter(self, titre, contenu_brut):
        # 1. Connexion DB pour récupérer les abonnés
        conn = sqlite3.connect(self.db_name)
        cursor = conn.cursor()
        cursor.execute("SELECT email, nom FROM abonnes WHERE actif = 1")
        destinataires = cursor.fetchall()

        # 2. Logique de construction HTML (mélangée)
        for email, nom in destinataires:
            html = f"""
            <html>
                <body>
                    <h1>Bonjour {nom}</h1>
                    <p>{contenu_brut}</p>
                    <hr>
                    <a href="https://monsite.com/unsubscribe?email={email}">Se désabonner</a>
                </body>
            </html>
            """
            
            # 3. Envoi via SMTP
            msg = MIMEMultipart()
            msg['From'] = "news@monsite.com"
            msg['To'] = email
            msg['Subject'] = titre
            msg.attach(MIMEText(html, 'html'))

            try:
                server = smtplib.SMTP(self.smtp_host, self.smtp_port)
                server.send_message(msg)
                server.quit()
                
                # 4. Enregistrement dans les logs (Encore de la DB !)
                cursor.execute("INSERT INTO logs_email (email, date, status) VALUES (?, '2024-01-01', 'succes')", (email,))
            except Exception as e:
                print(f"Erreur pour {email}: {e}")
                cursor.execute("INSERT INTO logs_email (email, date, status) VALUES (?, '2024-01-01', 'echec')", (email,))

        conn.commit()
        conn.close()

    def gerer_desabonnement(self, email):
        # Responsabilité différente : Gestion de compte
        conn = sqlite3.connect(self.db_name)
        cursor = conn.cursor()
        cursor.execute("UPDATE abonnes SET actif = 0 WHERE email = ?", (email,))
        conn.commit()
        conn.close()
        return "Désabonné avec succès"
