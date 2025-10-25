<template>
  <div class="home">
    <h1>Lap Time Tracker</h1>

    <div class="stats-grid">
      <div class="stat-card">
        <h3>Total Laps</h3>
        <p class="stat-value">{{ stats.totalLaps }}</p>
      </div>
      <div class="stat-card">
        <h3>Best Lap Time</h3>
        <p class="stat-value">{{ stats.bestLap ? formatLapTime(stats.bestLap.lap_time) : '-' }}</p>
      </div>
      <div class="stat-card">
        <h3>Unique Tracks</h3>
        <p class="stat-value">{{ stats.uniqueTracks }}</p>
      </div>
      <div class="stat-card">
        <h3>Unique Cars</h3>
        <p class="stat-value">{{ stats.uniqueCars }}</p>
      </div>
    </div>

    <div class="add-lap-section">
      <h2>Add Lap Time</h2>
      <form @submit.prevent="addLapTime" class="add-lap-form">
        <input v-model="newLap.driver_name" placeholder="Driver Name" required />
        <input v-model="newLap.car" placeholder="Car" required />
        <input v-model="newLap.track" placeholder="Track" required />
        <input
          v-model="newLap.lap_time"
          type="number"
          step="0.001"
          placeholder="Lap Time (seconds)"
          required
        />
        <button type="submit">Add Lap</button>
      </form>
    </div>

    <div class="filters">
      <input v-model="filterTrack" placeholder="Filter by track" />
      <input v-model="filterCar" placeholder="Filter by car" />
      <input v-model="filterDriver" placeholder="Filter by driver" />
      <button @click="fetchLapTimes">Refresh</button>
    </div>

    <div class="table-container">
      <table class="lap-table">
        <thead>
          <tr>
            <th>Driver</th>
            <th>Car</th>
            <th>Track</th>
            <th>Lap Time</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="lap in filteredLapTimes" :key="lap.id">
            <td>{{ lap.driver_name }}</td>
            <td>{{ lap.car }}</td>
            <td>{{ lap.track }}</td>
            <td class="lap-time">{{ formatLapTime(lap.lap_time) }}</td>
            <td>{{ formatDate(lap.recorded_at) }}</td>
            <td>
              <button @click="deleteLap(lap.id)" class="delete-btn">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

const API_URL = 'http://localhost:3000/api'

export default {
  name: 'HomeView',
  setup() {
    const lapTimes = ref([])
    const stats = ref({
      totalLaps: 0,
      bestLap: null,
      uniqueTracks: 0,
      uniqueCars: 0,
    })
    const filterTrack = ref('')
    const filterCar = ref('')
    const filterDriver = ref('')
    const newLap = ref({
      driver_name: '',
      car: '',
      track: '',
      lap_time: '',
    })

    const fetchLapTimes = async () => {
      try {
        const response = await axios.get(`${API_URL}/lap-times`)
        lapTimes.value = response.data
      } catch (error) {
        console.error('Error fetching lap times:', error)
        alert('Failed to fetch lap times')
      }
    }

    const fetchStats = async () => {
      try {
        const response = await axios.get(`${API_URL}/stats`)
        stats.value = response.data
      } catch (error) {
        console.error('Error fetching stats:', error)
      }
    }

    const addLapTime = async () => {
      try {
        await axios.post(`${API_URL}/lap-times`, newLap.value)
        newLap.value = {
          driver_name: '',
          car: '',
          track: '',
          lap_time: '',
        }
        fetchLapTimes()
        fetchStats()
        alert('Lap time added successfully!')
      } catch (error) {
        console.error('Error adding lap time:', error)
        alert('Failed to add lap time')
      }
    }

    const deleteLap = async (id) => {
      if (!confirm('Are you sure you want to delete this lap?')) return

      try {
        await axios.delete(`${API_URL}/lap-times/${id}`)
        fetchLapTimes()
        fetchStats()
      } catch (error) {
        console.error('Error deleting lap:', error)
        alert('Failed to delete lap')
      }
    }

    const filteredLapTimes = computed(() => {
      return lapTimes.value.filter((lap) => {
        const trackMatch =
          !filterTrack.value || lap.track.toLowerCase().includes(filterTrack.value.toLowerCase())
        const carMatch =
          !filterCar.value || lap.car.toLowerCase().includes(filterCar.value.toLowerCase())
        const driverMatch =
          !filterDriver.value ||
          lap.driver_name.toLowerCase().includes(filterDriver.value.toLowerCase())
        return trackMatch && carMatch && driverMatch
      })
    })

    const formatLapTime = (seconds) => {
      const mins = Math.floor(seconds / 60)
      const secs = (seconds % 60).toFixed(3)
      return `${mins}:${secs.padStart(6, '0')}`
    }

    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleString()
    }

    onMounted(() => {
      fetchLapTimes()
      fetchStats()
      // Auto-refresh every 10 seconds
      //   setInterval(() => {
      //     fetchLapTimes()
      //     fetchStats()
      //   }, 10000)
    })

    return {
      lapTimes,
      stats,
      filterTrack,
      filterCar,
      filterDriver,
      newLap,
      filteredLapTimes,
      fetchLapTimes,
      addLapTime,
      deleteLap,
      formatLapTime,
      formatDate,
    }
  },
}
</script>

<style scoped>
.home {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  text-align: center;
  color: #2c3e50;
  margin-bottom: 30px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.stat-card h3 {
  margin: 0 0 10px 0;
  font-size: 14px;
  opacity: 0.9;
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  margin: 0;
}

.add-lap-section {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 10px;
  margin-bottom: 30px;
}

.add-lap-section h2 {
  margin-top: 0;
}

.add-lap-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
}

.add-lap-form input {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 14px;
}

.add-lap-form button {
  padding: 10px 20px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
}

.add-lap-form button:hover {
  background: #764ba2;
}

.filters {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.filters input {
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
}

.filters button {
  padding: 10px 20px;
  background: #42b983;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-weight: bold;
}

.filters button:hover {
  background: #359268;
}

.table-container {
  overflow-x: auto;
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.lap-table {
  width: 100%;
  border-collapse: collapse;
}

.lap-table th,
.lap-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.lap-table th {
  background: #f8f9fa;
  font-weight: bold;
  color: #2c3e50;
}

.lap-table tbody tr:hover {
  background: #f8f9fa;
}

.lap-time {
  font-family: 'Courier New', monospace;
  font-weight: bold;
  color: #667eea;
}

.delete-btn {
  padding: 5px 10px;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.delete-btn:hover {
  background: #c82333;
}
</style>
