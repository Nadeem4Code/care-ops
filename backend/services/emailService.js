import sgMail from "@sendgrid/mail";

class EmailService {
  constructor() {
    this.provider = null;
    this.initialized = false;
  }

  initializeProvider() {
    if (this.initialized) return;

    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      this.provider = "sendgrid";
      console.log("Email provider: SendGrid");
    } else {
      this.provider = "none";
      console.warn("No email provider configured. Email will run in mock mode.");
    }

    this.initialized = true;
  }

  async sendEmail({ to, subject, html, text }) {
    this.initializeProvider();
    if (this.provider === "none") {
      console.log("📧 [MOCK] Email would be sent to:", to);
      return { success: true, mock: true };
    }

    try {
      const normalizedText =
        typeof text === "string" ? text.trim() : "";
      const normalizedHtml =
        typeof html === "string" ? html.trim() : "";
      const fallbackText = normalizedHtml
        ? normalizedHtml.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
        : "";

      if (!normalizedText && !normalizedHtml) {
        throw new Error("Email content is empty");
      }

      const msg = {
        to,
        from: {
          email: process.env.SMTP_USER,
          name: "CareOps",
        },
        subject,
        ...(normalizedText || fallbackText
          ? { text: normalizedText || fallbackText }
          : {}),
        ...(normalizedHtml ? { html: normalizedHtml } : {}),
      };

      await sgMail.send(msg);
      console.log(`✅ Email sent via SendGrid to ${to}`);
      return { success: true };
    } catch (error) {
      console.error("❌ Email sending failed:", error.response?.body || error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  // Your existing email templates...
  async sendWelcomeEmail(contact, workspace) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { padding: 30px; background: #f9fafb; border-radius: 0 0 8px 8px; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${workspace.businessName}</h1>
            </div>
            <div class="content">
              <h2>Welcome, ${contact.name}! 👋</h2>
              <p>Thank you for reaching out to us. We've received your inquiry and will get back to you shortly.</p>
              <p>In the meantime, if you have any questions, feel free to reply to this email.</p>
            </div>
            <div class="footer">
              <p>${workspace.businessName}</p>
              <p>${workspace.contactEmail}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return await this.sendEmail({
      to: contact.email,
      subject: `Welcome to ${workspace.businessName}!`,
      html,
      text: `Welcome, ${contact.name}! Thank you for reaching out to ${workspace.businessName}.`,
    });
  }

  async sendBookingConfirmation(booking, contact, workspace, service) {
    const bookingDate = new Date(booking.bookingDate).toLocaleDateString(
      "en-US",
      {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      },
    );

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10B981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { padding: 30px; background: #f9fafb; }
            .booking-details { 
              background: white; 
              padding: 20px; 
              margin: 20px 0; 
              border-left: 4px solid #10B981;
              border-radius: 4px;
            }
            .detail-row { 
              display: flex; 
              padding: 8px 0; 
              border-bottom: 1px solid #e5e7eb;
            }
            .detail-label { 
              font-weight: bold; 
              min-width: 120px;
              color: #6b7280;
            }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✓ Booking Confirmed!</h1>
            </div>
            <div class="content">
              <h2>Hi ${contact.name},</h2>
              <p>Your appointment has been successfully confirmed. We look forward to seeing you!</p>
              
              <div class="booking-details">
                <h3>Booking Details:</h3>
                <div class="detail-row">
                  <span class="detail-label">Service:</span>
                  <span>${service.name}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Date:</span>
                  <span>${bookingDate}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Time:</span>
                  <span>${booking.startTime}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Duration:</span>
                  <span>${service.durationMinutes} minutes</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Location:</span>
                  <span>
                    ${workspace.address?.street || ""}<br>
                    ${workspace.address?.city || ""}, ${workspace.address?.state || ""} ${workspace.address?.zipCode || ""}
                  </span>
                </div>
              </div>
              
              <p><strong>Important:</strong> Please arrive 10 minutes early. If you need to reschedule or cancel, please contact us as soon as possible.</p>
              
              <p>If you have any questions, feel free to reply to this email or call us.</p>
            </div>
            <div class="footer">
              <p><strong>${workspace.businessName}</strong></p>
              <p>${workspace.contactEmail} ${workspace.phone ? "| " + workspace.phone : ""}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return await this.sendEmail({
      to: contact.email,
      subject: `Booking Confirmed - ${workspace.businessName}`,
      html,
      text: `Hi ${contact.name}, your booking is confirmed for ${bookingDate} at ${booking.startTime}.`,
    });
  }

  async sendBookingReminder(booking, contact, workspace, service) {
    const bookingDate = new Date(booking.bookingDate).toLocaleDateString(
      "en-US",
      {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      },
    );

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #F59E0B; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { padding: 30px; background: #f9fafb; }
            .reminder { 
              background: #FEF3C7; 
              padding: 20px; 
              margin: 20px 0; 
              border-left: 4px solid #F59E0B;
              border-radius: 4px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔔 Appointment Reminder</h1>
            </div>
            <div class="content">
              <h2>Hi ${contact.name},</h2>
              <p>This is a friendly reminder about your upcoming appointment tomorrow.</p>
              
              <div class="reminder">
                <h3>Tomorrow's Appointment:</h3>
                <p><strong>Service:</strong> ${service.name}</p>
                <p><strong>Date:</strong> ${bookingDate}</p>
                <p><strong>Time:</strong> ${booking.startTime}</p>
                <p><strong>Location:</strong> ${workspace.address?.street || ""}, ${workspace.address?.city || ""}</p>
              </div>
              
              <p>See you tomorrow! If you need to cancel or reschedule, please let us know as soon as possible.</p>
            </div>
            <div class="footer">
              <p>${workspace.businessName}</p>
              <p>${workspace.contactEmail}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return await this.sendEmail({
      to: contact.email,
      subject: `Reminder: Appointment Tomorrow - ${workspace.businessName}`,
      html,
    });
  }

  async sendFormRequest(contact, workspace, formLink) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #6366F1; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { padding: 30px; background: #f9fafb; }
            .button { 
              display: inline-block; 
              padding: 14px 28px; 
              background: #6366F1; 
              color: white; 
              text-decoration: none; 
              border-radius: 6px; 
              margin: 20px 0;
              font-weight: bold;
            }
            .button:hover { background: #4F46E5; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📋 Action Required</h1>
            </div>
            <div class="content">
              <h2>Hi ${contact.name},</h2>
              <p>To complete your booking, please fill out the required intake form.</p>
              
              <a href="${formLink}" class="button">Complete Form Now</a>
              
              <p>This will only take a few minutes and helps us prepare for your visit.</p>
              
              <p>If you have any questions, feel free to reply to this email.</p>
            </div>
            <div class="footer">
              <p>${workspace.businessName}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return await this.sendEmail({
      to: contact.email,
      subject: `Please Complete Your Intake Form - ${workspace.businessName}`,
      html,
    });
  }
}

export default new EmailService();

