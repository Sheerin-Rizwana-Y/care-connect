import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from config import settings
import logging

logger = logging.getLogger(__name__)

async def send_match_notification_email(email: str, name: str, lost_item: str, found_item: str):
    """Send email when a potential lost/found match is detected"""
    subject = "CARE Connect+ - Potential Match Found!"
    html_body = f"""
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(99,102,241,0.1);">
        <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">🎉 Match Found!</h1>
        </div>
        <div style="padding: 30px;">
            <p>Hello {name},</p>
            <p>Great news! We found a potential match for your lost item.</p>
            <p><strong>Your lost item:</strong> {lost_item}</p>
            <p><strong>Matched with found item:</strong> {found_item}</p>
            <p>Please log in to CARE Connect+ to review the match and contact the finder.</p>
            <a href="http://localhost:3000/lost-found" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 10px;">View Match</a>
        </div>
    </div>
    """
    await _send_email(email, subject, html_body)

async def send_listing_approval_email(email: str, name: str, item_title: str, approved: bool, reason: str = None):
    """Send email when a marketplace listing is approved or rejected"""
    status_text = "Approved" if approved else "Rejected"
    subject = f"CARE Connect+ - Listing {status_text}: {item_title}"
    color = "#10b981" if approved else "#ef4444"
    html_body = f"""
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; padding: 30px;">
        <h2 style="color: {color};">Listing {status_text}</h2>
        <p>Hello {name},</p>
        <p>Your marketplace listing <strong>"{item_title}"</strong> has been <strong style="color: {color};">{status_text.lower()}</strong>.</p>
        {f'<p><strong>Reason:</strong> {reason}</p>' if reason else ''}
        <p>Log in to CARE Connect+ to view your listings.</p>
    </div>
    """
    await _send_email(email, subject, html_body)

async def _send_email(to_email: str, subject: str, html_body: str):
    """Internal email sender"""
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.SMTP_USER
        msg["To"] = to_email

        html_part = MIMEText(html_body, "html")
        msg.attach(html_part)

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_USER, to_email, msg.as_string())

        logger.info(f"Email sent to {to_email}: {subject}")
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        # In development, just log the email body
        print(f"\n📧 EMAIL TO: {to_email}\nSUBJECT: {subject}\nBODY (simplified): {html_body[:200]}...\n")