const dgram = require("dgram");
const axios = require("axios");

class LMUSocketClient {
  constructor(port = 5000, host = "0.0.0.0") {
    this.port = port;
    this.host = host;
    this.server = null;
    this.lastRecordedLapTime = null;
    this.currentDriver = null;
    this.currentCar = null;
    this.currentTrack = null;
    this.hasLoggedStructure = false;
  }

  start() {
    this.server = dgram.createSocket("udp4");

    this.server.on("listening", () => {
      const address = this.server.address();
      console.log(
        `✓ Listening for UDP packets on ${address.address}:${address.port}`
      );
      console.log("Waiting for LMU to start broadcasting...\n");
    });

    this.server.on("message", (msg, rinfo) => {
      this.handleMessage(msg);
    });

    this.server.on("error", (err) => {
      console.error("❌ UDP Server error:", err.message);
    });

    this.server.bind(this.port, this.host);
  }

  async handleMessage(msg) {
    try {
      const messageStr = msg.toString();
      const data = JSON.parse(messageStr);

      // Log first message structure
      if (!this.hasLoggedStructure) {
        console.log("\n📥 First telemetry packet structure:");
        console.log("Available keys:", Object.keys(data));
        this.hasLoggedStructure = true;
      }

      await this.processTelemetry(data);
    } catch (err) {
      if (err.message.includes("JSON")) {
        console.log("Binary data or invalid JSON, skipping...");
      } else {
        console.error("Error processing message:", err.message);
      }
    }
  }

  async processTelemetry(data) {
    try {
      // rFactor 2 / LMU shared memory structure
      const scoring = data;
      if (!scoring || !scoring.mVehicles) return;

      // Find player vehicle
      const player = scoring.mVehicles.find((v) => v.mIsPlayer === true);
      if (!player) return;

      // Extract info
      const driverName = player.mDriverName?.trim() || "Unknown";
      const vehicleName = player.mVehicleName?.trim() || "Unknown";
      const trackName = scoring.mTrackName?.trim() || "Unknown";

      const lastLapTime = player.mLastLapTime; // In seconds
      const bestLapTime = player.mBestLapTime;
      const currentLap = player.mTotalLaps;

      // Update session info (only log once per session)
      if (driverName !== "Unknown" && !this.currentDriver) {
        console.log("\n🏁 Session Started");
        console.log(`   Driver: ${driverName}`);
        this.currentDriver = driverName;
      }
      if (vehicleName !== "Unknown" && !this.currentCar) {
        console.log(`   Car: ${vehicleName}`);
        this.currentCar = vehicleName;
      }
      if (trackName !== "Unknown" && !this.currentTrack) {
        console.log(`   Track: ${trackName}\n`);
        this.currentTrack = trackName;
      }

      // Detect new lap completion
      // lastLapTime is -1 when invalid, positive when lap is completed
      if (lastLapTime > 0 && lastLapTime !== this.lastRecordedLapTime) {
        this.lastRecordedLapTime = lastLapTime;

        const lapTimeFormatted = this.formatLapTime(lastLapTime);
        const bestLapFormatted =
          bestLapTime > 0 ? this.formatLapTime(bestLapTime) : "N/A";

        console.log(`\n🏁 Lap ${currentLap - 1} Completed!`);
        console.log(`   Time: ${lapTimeFormatted}`);
        console.log(`   Best (Session): ${bestLapFormatted}`);

        // Check if this is a personal best and save
        await this.checkAndSaveLapTime({
          driver_name: driverName,
          car: vehicleName,
          track: trackName,
          lap_time: lastLapTime,
          sim: "LMU",
        });
      }
    } catch (err) {
      console.error("Error in processTelemetry:", err.message);
    }
  }

  formatLapTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(3);
    return `${mins}:${secs.padStart(6, "0")}`;
  }

  async checkAndSaveLapTime(lapData) {
    try {
      // Get personal best from database
      const response = await axios.get(
        "http://localhost:3000/api/lap-times/personal-best",
        {
          params: {
            driver_name: lapData.driver_name,
            track: lapData.track,
            car: lapData.car,
          },
        }
      );

      const personalBest = response.data.personalBest;

      // If no personal best exists, or this lap is faster, save it
      if (!personalBest) {
        console.log("   🎉 First lap on this track/car combo!");
        await this.saveLapTime(lapData);
      } else if (lapData.lap_time < personalBest.lap_time) {
        const previousBest = this.formatLapTime(personalBest.lap_time);
        const improvement = (personalBest.lap_time - lapData.lap_time).toFixed(
          3
        );

        console.log(`   🏆 NEW PERSONAL BEST!`);
        console.log(`   Previous: ${previousBest}`);
        console.log(`   Improved by: ${improvement}s`);

        await this.saveLapTime(lapData);
      } else {
        const currentBest = this.formatLapTime(personalBest.lap_time);
        const difference = (lapData.lap_time - personalBest.lap_time).toFixed(
          3
        );

        console.log(`   ⏱️  Not a personal best`);
        console.log(`   Current PB: ${currentBest}`);
        console.log(`   Off by: +${difference}s\n`);
      }
    } catch (error) {
      console.error("❌ Error checking personal best:", error.message);
    }
  }

  async saveLapTime(lapData) {
    try {
      await axios.post("http://localhost:3000/api/lap-times", lapData);
      console.log("✅ Saved to database\n");
    } catch (error) {
      console.error("❌ Database error:", error.message);
    }
  }

  stop() {
    if (this.server) {
      this.server.close();
      console.log("LMU Socket client stopped");
    }
  }
}

module.exports = LMUSocketClient;
