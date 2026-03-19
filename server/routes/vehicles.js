import express from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';

const router = express.Router();

// Get all vehicles (admin/staff only)
router.get('/', async (req, res) => {
  try {
    const [vehicles] = await pool.query(`
      SELECT v.*, u.username as owner_username, u.email as owner_email,
        (SELECT spot_number FROM parking_spots ps 
         JOIN parking_sessions psess ON ps.id = psess.spot_id 
         WHERE psess.vehicle_id = v.id AND psess.exit_time IS NULL 
         LIMIT 1) as current_spot
      FROM vehicles v
      LEFT JOIN users u ON v.user_id = u.id
      ORDER BY v.created_at DESC
    `);

    res.json({ success: true, data: { vehicles } });
  } catch (error) {
    console.error('Get vehicles error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch vehicles' });
  }
});

// Get user's vehicles
router.get('/my', async (req, res) => {
  try {
    const [vehicles] = await pool.query(`
      SELECT v.*,
        (SELECT spot_number FROM parking_spots ps 
         JOIN parking_sessions psess ON ps.id = psess.spot_id 
         WHERE psess.vehicle_id = v.id AND psess.exit_time IS NULL 
         LIMIT 1) as current_spot,
        (SELECT entry_time FROM parking_sessions psess 
         WHERE psess.vehicle_id = v.id AND psess.exit_time IS NULL 
         LIMIT 1) as entry_time
      FROM vehicles v
      WHERE v.user_id = ?
      ORDER BY v.created_at DESC
    `, [req.user.id]);

    res.json({ success: true, data: { vehicles } });
  } catch (error) {
    console.error('Get my vehicles error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch vehicles' });
  }
});

// Add vehicle
router.post('/', [
  body('license_plate').notEmpty().withMessage('License plate required'),
  body('vehicle_type').isIn(['car', 'motorcycle', 'electric', 'truck']).withMessage('Invalid vehicle type'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { license_plate, vehicle_type, make, model, color } = req.body;

    // Check if vehicle exists
    const [existing] = await pool.query('SELECT id FROM vehicles WHERE license_plate = ?', [license_plate]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Vehicle already registered' });
    }

    const [result] = await pool.query(
      'INSERT INTO vehicles (user_id, license_plate, vehicle_type, make, model, color) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, license_plate, vehicle_type, make || null, model || null, color || null]
    );

    res.status(201).json({
      success: true,
      message: 'Vehicle added successfully',
      data: { 
        vehicle: { 
          id: result.insertId, 
          license_plate, 
          vehicle_type, 
          make, 
          model, 
          color 
        } 
      }
    });
  } catch (error) {
    console.error('Add vehicle error:', error);
    res.status(500).json({ success: false, message: 'Failed to add vehicle' });
  }
});

// Check-in vehicle (start parking session)
router.post('/check-in', [
  body('license_plate').notEmpty().withMessage('License plate required'),
  body('spot_id').notEmpty().withMessage('Spot ID required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { license_plate, spot_id } = req.body;

    // Find or create vehicle
    let [vehicles] = await pool.query('SELECT * FROM vehicles WHERE license_plate = ?', [license_plate]);
    let vehicleId;

    if (vehicles.length === 0) {
      // Create new vehicle for walk-in
      const [result] = await pool.query(
        'INSERT INTO vehicles (license_plate, vehicle_type) VALUES (?, ?)',
        [license_plate, 'car']
      );
      vehicleId = result.insertId;
    } else {
      vehicleId = vehicles[0].id;
      
      // Check if already parked
      const [sessions] = await pool.query(
        'SELECT * FROM parking_sessions WHERE vehicle_id = ? AND exit_time IS NULL',
        [vehicleId]
      );
      if (sessions.length > 0) {
        return res.status(409).json({ success: false, message: 'Vehicle is already parked' });
      }
    }

    // Check spot availability
    const [spots] = await pool.query('SELECT * FROM parking_spots WHERE id = ?', [spot_id]);
    if (spots.length === 0) {
      return res.status(404).json({ success: false, message: 'Spot not found' });
    }

    const spot = spots[0];
    if (spot.is_occupied) {
      return res.status(409).json({ success: false, message: 'Spot is already occupied' });
    }

    // Create parking session
    const [sessionResult] = await pool.query(
      'INSERT INTO parking_sessions (vehicle_id, spot_id, user_id) VALUES (?, ?, ?)',
      [vehicleId, spot_id, req.user.id]
    );

    // Update spot status
    await pool.query('UPDATE parking_spots SET is_occupied = TRUE WHERE id = ?', [spot_id]);

    res.status(201).json({
      success: true,
      message: 'Check-in successful',
      data: {
        sessionId: sessionResult.insertId,
        entry_time: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ success: false, message: 'Check-in failed' });
  }
});

// Check-out vehicle (end parking session)
router.post('/check-out', [
  body('license_plate').notEmpty().withMessage('License plate required'),
], async (req, res) => {
  try {
    const { license_plate } = req.body;

    // Find vehicle
    const [vehicles] = await pool.query('SELECT * FROM vehicles WHERE license_plate = ?', [license_plate]);
    if (vehicles.length === 0) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    const vehicle = vehicles[0];

    // Find active session
    const [sessions] = await pool.query(`
      SELECT ps.*, ps2.entry_time, ps2.spot_id, ps3.hourly_rate
      FROM parking_sessions ps
      JOIN parking_sessions ps2 ON ps.vehicle_id = ps2.vehicle_id AND ps2.exit_time IS NULL
      JOIN parking_spots ps3 ON ps2.spot_id = ps3.id
      WHERE ps.vehicle_id = ?
      ORDER BY ps2.entry_time DESC
      LIMIT 1
    `, [vehicle.id]);

    if (sessions.length === 0) {
      return res.status(404).json({ success: false, message: 'No active parking session found' });
    }

    const session = sessions[0];
    const exitTime = new Date();
    const entryTime = new Date(session.entry_time);
    const durationMinutes = Math.floor((exitTime - entryTime) / 60000);
    const durationHours = Math.ceil(durationMinutes / 60);
    const totalAmount = durationHours * session.hourly_rate;

    // Update session
    await pool.query(
      `UPDATE parking_sessions 
       SET exit_time = ?, duration_minutes = ?, total_amount = ?, payment_status = 'pending'
       WHERE id = ?`,
      [exitTime, durationMinutes, totalAmount, session.id]
    );

    // Free up the spot
    await pool.query('UPDATE parking_spots SET is_occupied = FALSE WHERE id = ?', [session.spot_id]);

    res.json({
      success: true,
      message: 'Check-out successful',
      data: {
        duration_minutes: durationMinutes,
        duration_hours: durationHours,
        total_amount: totalAmount,
        entry_time: session.entry_time,
        exit_time: exitTime
      }
    });
  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({ success: false, message: 'Check-out failed' });
  }
});

// Get active parking sessions
router.get('/sessions/active', async (req, res) => {
  try {
    const [sessions] = await pool.query(`
      SELECT ps.*, v.license_plate, v.vehicle_type, ps2.spot_number, z.name as zone_name,
        TIMESTAMPDIFF(MINUTE, ps.entry_time, NOW()) as duration_minutes
      FROM parking_sessions ps
      JOIN vehicles v ON ps.vehicle_id = v.id
      JOIN parking_spots ps2 ON ps.spot_id = ps2.id
      JOIN zones z ON ps2.zone_id = z.id
      WHERE ps.exit_time IS NULL
      ORDER BY ps.entry_time DESC
    `);

    res.json({ success: true, data: { sessions } });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch sessions' });
  }
});

export default router;
