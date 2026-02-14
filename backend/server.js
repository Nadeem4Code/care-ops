import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./config/database.js";

// Routes
import authRoutes from "./routes/auth.js";
import workspaceRoutes from "./routes/workspace.js";
import integrationRoutes from "./routes/integration.js";
import teamRoutes from "./routes/team.js";
import serviceTypeRoutes from "./routes/serviceType.js";
import availabilityRoutes from "./routes/availability.js";
import bookingRoutes from "./routes/booking.js";
import contactRoutes from "./routes/contact.js";
import inboxRoutes from "./routes/inbox.js";
import formRoutes from "./routes/form.js";
import inventoryRoutes from "./routes/inventory.js";
import dashboardRoutes from "./routes/dashboard.js";
import googleRoutes from "./routes/google.js";
import opsLogRoutes from "./routes/opsLog.js";
import { startAutomationScheduler } from "./services/automationService.js";

// Load env vars from project root .env regardless of current working directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });


// Connect to database
connectDB();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
);


app.use(morgan("dev"));

app.use("/api/auth", authRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/integrations", integrationRoutes);
app.use("/api/team", teamRoutes);
app.use("/api/service-types", serviceTypeRoutes);
app.use("/api/availability", availabilityRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/inbox", inboxRoutes);
app.use("/api/forms", formRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/google", googleRoutes);
app.use("/api/ops-logs", opsLogRoutes);

// // Health check
// app.get("/health", (req, res) => {
//   res.status(200).json({ status: "OK", message: "Server is running" });
// });
/* ================= PRODUCTION ================= */
if (process.env.NODE_ENV === 'production') {
  // Serve uploaded files (Render persistent disk)
  app.use('/uploads', express.static('/var/data/uploads'));

  // Serve Vite build
  app.use(express.static(path.join(__dirname, '../client/dist')));

  // Express 5 SPA fallback (NO "*" route)
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
} else {
  // Local uploads folder
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

  app.get('/', (req, res) => {
    res.send('API is running...');
  });
}


// Catch 404 and forward to error handler
app.use((req, res, next) => {
  // ← Added 'next'
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
  });
});

// Error handler (must have 4 parameters)
app.use((err, req, res, next) => {
  // ← Added 'next'
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  startAutomationScheduler();
});
