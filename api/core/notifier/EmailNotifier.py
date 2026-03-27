from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from smtplib import SMTP_SSL

from pydantic import EmailStr

from app.config import config
from app.user.domain.entity import User


class EmailNotifier:
    def __init__(self) -> None:
        self.sender_email: EmailStr = config.email_sender_email
        self.sender_password: str = config.email_sender_password

    def notify(self, receiver: User, subject: str, body: str) -> None:
        sender_email: EmailStr = self.sender_email
        sender_password: str = self.sender_password

        message: MIMEMultipart = MIMEMultipart()
        message["From"] = sender_email
        message["To"] = receiver.email
        message["Subject"] = subject
        message.attach(MIMEText(body, "plain"))

        with SMTP_SSL(host="smtp.gmail.com", port=465) as server:
            server.login(user=sender_email, password=sender_password)
            server.send_message(msg=message)
