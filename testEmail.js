import dotenv from "dotenv";
import sgMail from "@sendgrid/mail";

dotenv.config();

console.log("🔍 Configuration Check:");
console.log(
  "- API Key:",
  process.env.SENDGRID_API_KEY ? "✅ Loaded" : "❌ Missing",
);
console.log("- Sender Email:", process.env.SMTP_USER);
console.log("");

if (!process.env.SENDGRID_API_KEY || !process.env.SMTP_USER) {
  console.error("❌ Missing configuration!");
  process.exit(1);
}

const testEmail = async () => {
  try {
    console.log("🧪 Testing SendGrid email...\n");

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const msg = {
      to: "nadeem6code@gmail.com", // Send to yourself
      from: process.env.SMTP_USER, // Must match verified sender
      subject: "CareOps Test Email - " + new Date().toLocaleTimeString(),
      text: "Success! Your SendGrid is working.",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background: #f0fdf4; border-radius: 8px;">
          <h1 style="color: #10B981;">✅ Success!</h1>
          <p style="font-size: 16px;">Your SendGrid configuration is working correctly.</p>
          <p style="color: #6b7280;">Sender: ${process.env.SMTP_USER}</p>
          <p style="color: #6b7280;">Time: ${new Date().toLocaleString()}</p>
        </div>
      `,
    };

    console.log("📧 Attempting to send email:");
    console.log("   To:", msg.to);
    console.log("   From:", msg.from);
    console.log("");

    const response = await sgMail.send(msg);

    console.log("✅ EMAIL SENT SUCCESSFULLY!");
    console.log(
      "📬 Status:",
      response[0].statusCode,
      response[0].statusMessage,
    );
    console.log("📬 Check your inbox at", msg.to);
    console.log("📬 Also check SPAM/JUNK folder if not in inbox\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ EMAIL FAILED!\n");

    if (error.response) {
      const errorMsg =
        error.response.body.errors?.[0]?.message || error.message;
      console.error("Error Message:", errorMsg);
      console.error("Status Code:", error.response.statusCode);

      if (errorMsg.includes("does not match a verified Sender Identity")) {
        console.error("\n🔧 FIX:");
        console.error(
          "Your SMTP_USER must match a verified sender in SendGrid.",
        );
        console.error("Current SMTP_USER:", process.env.SMTP_USER);
        console.error("\nEither:");
        console.error("1. Change SMTP_USER in .env to: nadeem5code@gmail.com");
        console.error(
          "2. OR verify",
          process.env.SMTP_USER,
          "in SendGrid dashboard",
        );
      }

      console.error(
        "\nFull error:",
        JSON.stringify(error.response.body, null, 2),
      );
    } else {
      console.error("Error:", error.message);
    }

    console.error("\n🔧 Troubleshooting:");
    console.error("1. Make sure SMTP_USER matches verified sender in SendGrid");
    console.error(
      "2. Verify sender at: https://app.sendgrid.com/settings/sender_auth",
    );
    console.error("3. Check API key has Mail Send permission\n");

    process.exit(1);
  }
};

testEmail();
