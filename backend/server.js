const express = require("express");
const cors = require("cors");
const db = require("./database");
const LMUSocketClient = require("./services/lmu-socket-client");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes

// Get all lap times
app.get("/api/lap-times", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM lap_times ORDER BY recorded_at DESC LIMIT 100"
    );
    res.json(rows);
  } catch (error) {
    console.error("Error fetching lap times:", error);
    res.status(500).json({ error: "Failed to fetch lap times" });
  }
});

// Add new lap time
app.post("/api/lap-times", async (req, res) => {
  try {
    const { driver_name, car, track, lap_time, sim = "LMU" } = req.body;

    if (!driver_name || !car || !track || !lap_time) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const [result] = await db.query(
      "INSERT INTO lap_times (driver_name, car, track, lap_time, sim) VALUES (?, ?, ?, ?, ?)",
      [driver_name, car, track, lap_time, sim]
    );

    const [newLap] = await db.query("SELECT * FROM lap_times WHERE id = ?", [
      result.insertId,
    ]);

    res.status(201).json(newLap[0]);
  } catch (error) {
    console.error("Error adding lap time:", error);
    res.status(500).json({ error: "Failed to add lap time" });
  }
});

// Get best laps
app.get("/api/lap-times/best", async (req, res) => {
  try {
    const { track, car } = req.query;
    let query = "SELECT * FROM lap_times WHERE 1=1";
    const params = [];

    if (track) {
      query += " AND track = ?";
      params.push(track);
    }

    if (car) {
      query += " AND car = ?";
      params.push(car);
    }

    query += " ORDER BY lap_time ASC LIMIT 10";

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching best laps:", error);
    res.status(500).json({ error: "Failed to fetch best laps" });
  }
});

// Get best lap time for a specific driver/track/car combination
app.get("/api/lap-times/personal-best", async (req, res) => {
  try {
    const { driver_name, track, car } = req.query;

    if (!driver_name || !track || !car) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    const [rows] = await db.query(
      "SELECT * FROM lap_times WHERE driver_name = ? AND track = ? AND car = ? ORDER BY lap_time ASC LIMIT 1",
      [driver_name, track, car]
    );

    if (rows.length === 0) {
      return res.json({ personalBest: null });
    }

    res.json({ personalBest: rows[0] });
  } catch (error) {
    console.error("Error fetching personal best:", error);
    res.status(500).json({ error: "Failed to fetch personal best" });
  }
});

// Get statistics
app.get("/api/stats", async (req, res) => {
  try {
    const [totalLaps] = await db.query(
      "SELECT COUNT(*) as count FROM lap_times"
    );
    const [bestLap] = await db.query(
      "SELECT * FROM lap_times ORDER BY lap_time ASC LIMIT 1"
    );
    const [uniqueTracks] = await db.query(
      "SELECT COUNT(DISTINCT track) as count FROM lap_times"
    );
    const [uniqueCars] = await db.query(
      "SELECT COUNT(DISTINCT car) as count FROM lap_times"
    );

    res.json({
      totalLaps: totalLaps[0].count,
      bestLap: bestLap[0] || null,
      uniqueTracks: uniqueTracks[0].count,
      uniqueCars: uniqueCars[0].count,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
});

// Delete lap time
app.delete("/api/lap-times/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM lap_times WHERE id = ?", [id]);
    res.json({ message: "Lap time deleted successfully" });
  } catch (error) {
    console.error("Error deleting lap time:", error);
    res.status(500).json({ error: "Failed to delete lap time" });
  }
});

// Initialize LMU Socket client
const lmuClient = new LMUSocketClient();

app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log("📊 Starting LMU telemetry listener...\n");
  lmuClient.start();
  console.log("💡 Start LMU and begin driving to see lap times!\n");
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n👋 Shutting down gracefully...");
  lmuClient.stop();
  process.exit(0);
});
