import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// Get dashboard statistics
router.get('/dashboard', async (req, res) => {
  try {
    // Total spots
    const [totalSpotsResult] = await pool.query('SELECT COUNT(*) as total FROM parking_spots');
    const totalSpots = totalSpotsResult[0].total;

    // Occupied spots
    const [occupiedResult] = await pool.query('SELECT COUNT(*) as occupied FROM parking_spots WHERE is_occupied = TRUE');
    const occupiedSpots = occupiedResult[0].occupied;

    // Available spots
    const [availableResult] = await pool.query(
      'SELECT COUNT(*) as available FROM parking_spots WHERE is_occupied = FALSE AND is_reserved = FALSE'
    );
    const availableSpots = availableResult[0].available;

    // Reserved spots
    const [reservedResult] = await pool.query('SELECT COUNT(*) as reserved FROM parking_spots WHERE is_reserved = TRUE');
    const reservedSpots = reservedResult[0].reserved;

    // Today's revenue
    const [revenueResult] = await pool.query(`
      SELECT COALESCE(SUM(total_amount), 0) as revenue 
      FROM parking_sessions 
      WHERE DATE(exit_time) = CURDATE() AND payment_status = 'paid'
    `);
    const todayRevenue = parseFloat(revenueResult[0].revenue);

    // Today's vehicles
    const [vehiclesResult] = await pool.query(`
      SELECT COUNT(DISTINCT vehicle_id) as count 
      FROM parking_sessions 
      WHERE DATE(entry_time) = CURDATE()
    `);
    const todayVehicles = vehiclesResult[0].count;

    // Occupancy rate
    const occupancyRate = totalSpots > 0 ? Math.round((occupiedSpots / totalSpots) * 100) : 0;

    res.json({
      success: true,
      data: {
        stats: {
          totalSpots,
          occupiedSpots,
          availableSpots,
          reservedSpots,
          todayRevenue,
          todayVehicles,
          occupancyRate
        }
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats' });
  }
});

// Get weekly revenue
router.get('/revenue/weekly', async (req, res) => {
  try {
    const [revenue] = await pool.query(`
      SELECT 
        DATE_FORMAT(exit_time, '%Y-%m-%d') as date,
        DAYNAME(exit_time) as day_name,
        COALESCE(SUM(total_amount), 0) as revenue,
        COUNT(*) as transactions
      FROM parking_sessions
      WHERE exit_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        AND payment_status = 'paid'
      GROUP BY DATE(exit_time), DAYNAME(exit_time)
      ORDER BY date ASC
    `);

    res.json({ success: true, data: { revenue } });
  } catch (error) {
    console.error('Weekly revenue error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch weekly revenue' });
  }
});

// Get vehicle type distribution
router.get('/vehicles/distribution', async (req, res) => {
  try {
    const [distribution] = await pool.query(`
      SELECT 
        vehicle_type,
        COUNT(*) as count
      FROM vehicles
      GROUP BY vehicle_type
    `);

    res.json({ success: true, data: { distribution } });
  } catch (error) {
    console.error('Vehicle distribution error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch vehicle distribution' });
  }
});

// Get peak hours analysis
router.get('/peak-hours', async (req, res) => {
  try {
    const [peakHours] = await pool.query(`
      SELECT 
        HOUR(entry_time) as hour,
        COUNT(*) as entry_count,
        AVG(TIMESTAMPDIFF(MINUTE, entry_time, exit_time)) as avg_duration
      FROM parking_sessions
      WHERE entry_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY HOUR(entry_time)
      ORDER BY entry_count DESC
      LIMIT 10
    `);

    res.json({ success: true, data: { peakHours } });
  } catch (error) {
    console.error('Peak hours error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch peak hours' });
  }
});

// Get zone-wise occupancy
router.get('/zones/occupancy', async (req, res) => {
  try {
    const [occupancy] = await pool.query(`
      SELECT 
        z.id,
        z.name as zone_name,
        z.description,
        COUNT(ps.id) as total_spots,
        SUM(CASE WHEN ps.is_occupied = TRUE THEN 1 ELSE 0 END) as occupied,
        SUM(CASE WHEN ps.is_occupied = FALSE AND ps.is_reserved = FALSE THEN 1 ELSE 0 END) as available,
        ROUND(SUM(CASE WHEN ps.is_occupied = TRUE THEN 1 ELSE 0 END) * 100.0 / COUNT(ps.id), 2) as occupancy_rate
      FROM zones z
      LEFT JOIN parking_spots ps ON z.id = ps.zone_id
      WHERE z.is_active = TRUE
      GROUP BY z.id, z.name, z.description
    `);

    res.json({ success: true, data: { occupancy } });
  } catch (error) {
    console.error('Zone occupancy error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch zone occupancy' });
  }
});

// Get AI predictions (simulated for demo)
router.get('/predictions', async (req, res) => {
  try {
    const { zone_id } = req.query;
    
    // Simulate AI predictions based on historical data
    const currentHour = new Date().getHours();
    const predictions = [];
    
    for (let i = 0; i < 24; i++) {
      const hour = (currentHour + i) % 24;
      // Simulate occupancy pattern
      let predictedOccupancy = 30;
      if (hour >= 8 && hour <= 10) predictedOccupancy = 85 + Math.random() * 15;
      else if (hour >= 12 && hour <= 14) predictedOccupancy = 70 + Math.random() * 20;
      else if (hour >= 17 && hour <= 19) predictedOccupancy = 80 + Math.random() * 15;
      else if (hour >= 20 || hour <= 6) predictedOccupancy = 20 + Math.random() * 20;
      else predictedOccupancy = 40 + Math.random() * 30;

      predictions.push({
        hour,
        predicted_occupancy: Math.round(predictedOccupancy * 100) / 100,
        confidence_score: Math.round(75 + Math.random() * 20)
      });
    }

    res.json({ 
      success: true, 
      data: { 
        predictions,
        generated_at: new Date().toISOString()
      } 
    });
  } catch (error) {
    console.error('Predictions error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch predictions' });
  }
});

// Get recent activity
router.get('/activity', async (req, res) => {
  try {
    const [activity] = await pool.query(`
      (SELECT 
        'check-in' as action,
        v.license_plate,
        ps.spot_number,
        z.name as zone_name,
        psess.entry_time as timestamp
      FROM parking_sessions psess
      JOIN vehicles v ON psess.vehicle_id = v.id
      JOIN parking_spots ps ON psess.spot_id = ps.id
      JOIN zones z ON ps.zone_id = z.id
      ORDER BY psess.entry_time DESC
      LIMIT 20)
      
      UNION ALL
      
      (SELECT 
        'check-out' as action,
        v.license_plate,
        ps.spot_number,
        z.name as zone_name,
        psess.exit_time as timestamp
      FROM parking_sessions psess
      JOIN vehicles v ON psess.vehicle_id = v.id
      JOIN parking_spots ps ON psess.spot_id = ps.id
      JOIN zones z ON ps.zone_id = z.id
      WHERE psess.exit_time IS NOT NULL
      ORDER BY psess.exit_time DESC
      LIMIT 20)
      
      ORDER BY timestamp DESC
      LIMIT 20
    `);

    res.json({ success: true, data: { activity } });
  } catch (error) {
    console.error('Activity error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch activity' });
  }
});

export default router;
