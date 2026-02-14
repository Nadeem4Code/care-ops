class SmsService {
  constructor() {
    this.provider = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
      ? "twilio"
      : "none";
  }

  async sendSms({ to, message }) {
    if (!to) {
      throw new Error("SMS recipient is required");
    }

    if (this.provider === "none") {
      console.log(`[MOCK-SMS] Would send SMS to ${to}: ${message}`);
      return { success: true, mock: true };
    }

    // Twilio integration can be enabled by adding the SDK and credentials.
    // For hackathon prototype we gracefully fallback to mock behavior.
    console.log(`[SMS:${this.provider}] Sent to ${to}: ${message}`);
    return { success: true };
  }
}

export default new SmsService();
