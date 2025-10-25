const mysql = require("mysql2");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Create table if it doesn't exist
const createTableQuery = `
  CREATE TABLE IF NOT EXISTS lap_times (
    id INT AUTO_INCREMENT PRIMARY KEY,
    driver_name VARCHAR(255) NOT NULL,
    car VARCHAR(255) NOT NULL,
    track VARCHAR(255) NOT NULL,
    lap_time DECIMAL(8, 3) NOT NULL,
    sim VARCHAR(50) DEFAULT 'LMU',
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_driver_track_car (driver_name, track, car)
  )
`;

pool.query(createTableQuery, (err) => {
  if (err) {
    console.error("Error creating table:", err);
  } else {
    console.log("Database table ready");
  }
});

module.exports = pool.promise();
