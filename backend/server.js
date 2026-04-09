// server.js
const http = require("http");
const dotenv = require("dotenv");

dotenv.config();

require("./jobs/waybill.job");
require("./jobs/pickup.job");
require("./jobs/refund.jobs");

const { startRefundProcessor } = require("./workers/refundProcessor");
startRefundProcessor();

const app = require("./app");

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Handle server errors gracefully
server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
        console.error(`❌ Port ${PORT} is already in use.`);
        console.error(`💡 Try one of these solutions:`);
        console.error(`   1. Kill the process using port ${PORT}:`);
        console.error(`      Windows: netstat -ano | findstr :${PORT}`);
        console.error(`      Then: taskkill /PID <PID> /F`);
        console.error(`   2. Change the PORT in your .env file`);
        console.error(`   3. Wait a few seconds and try again`);
        process.exit(1);
    } else {
        console.error("❌ Server error:", err);
        process.exit(1);
    }
});

server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

// Graceful shutdown handlers
process.on("SIGTERM", () => {
    console.log("SIGTERM received. Shutting down...");
    server.close(() => {
        process.exit(0);
    });
});

process.on("SIGINT", () => {
    console.log("\nSIGINT received. Shutting down gracefully...");
    server.close(() => {
        // console.log("Server closed.");
        process.exit(0);
    });
});
