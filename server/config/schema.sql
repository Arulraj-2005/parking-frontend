-- Smart Parking Database Schema

CREATE DATABASE IF NOT EXISTS smart_parking;
USE smart_parking;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  role ENUM('admin', 'staff', 'customer') DEFAULT 'customer',
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

-- Parking zones table
CREATE TABLE IF NOT EXISTS zones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(10) UNIQUE NOT NULL,
  description VARCHAR(255),
  total_spots INT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Parking spots table
CREATE TABLE IF NOT EXISTS parking_spots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  spot_number VARCHAR(10) UNIQUE NOT NULL,
  zone_id INT NOT NULL,
  spot_type ENUM('regular', 'electric', 'handicapped', 'motorcycle') DEFAULT 'regular',
  is_occupied BOOLEAN DEFAULT FALSE,
  is_reserved BOOLEAN DEFAULT FALSE,
  hourly_rate DECIMAL(10, 2) DEFAULT 5.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE CASCADE
);

-- Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  license_plate VARCHAR(20) UNIQUE NOT NULL,
  vehicle_type ENUM('car', 'motorcycle', 'electric', 'truck') DEFAULT 'car',
  make VARCHAR(50),
  model VARCHAR(50),
  color VARCHAR(30),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Parking sessions table
CREATE TABLE IF NOT EXISTS parking_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vehicle_id INT NOT NULL,
  spot_id INT NOT NULL,
  user_id INT,
  entry_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  exit_time TIMESTAMP NULL,
  duration_minutes INT,
  total_amount DECIMAL(10, 2),
  payment_status ENUM('pending', 'paid', 'cancelled') DEFAULT 'pending',
  payment_method ENUM('cash', 'card', 'online', 'subscription') DEFAULT 'cash',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
  FOREIGN KEY (spot_id) REFERENCES parking_spots(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Reservations table
CREATE TABLE IF NOT EXISTS reservations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  spot_id INT NOT NULL,
  vehicle_id INT,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  status ENUM('active', 'completed', 'cancelled', 'expired') DEFAULT 'active',
  total_amount DECIMAL(10, 2),
  payment_status ENUM('pending', 'paid', 'refunded') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (spot_id) REFERENCES parking_spots(id) ON DELETE CASCADE,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL
);

-- AI Predictions table (for ML-based occupancy prediction)
CREATE TABLE IF NOT EXISTS ai_predictions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  zone_id INT,
  prediction_date DATE NOT NULL,
  hour INT NOT NULL,
  predicted_occupancy DECIMAL(5, 2),
  actual_occupancy DECIMAL(5, 2),
  confidence_score DECIMAL(5, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE CASCADE
);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id INT,
  details JSON,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Insert default zones
INSERT INTO zones (name, description, total_spots) VALUES
('A', 'Main Entrance Zone', 12),
('B', 'North Wing Zone', 12),
('C', 'South Wing Zone', 12),
('D', 'EV Charging Zone', 12);

-- Insert sample parking spots
INSERT INTO parking_spots (spot_number, zone_id, spot_type, hourly_rate) 
SELECT 
  CONCAT(z.name, '-', LPAD(n.n, 2, '0')),
  z.id,
  CASE 
    WHEN z.name = 'D' THEN 'electric'
    WHEN n.n <= 2 THEN 'electric'
    ELSE 'regular'
  END,
  CASE 
    WHEN z.name = 'D' THEN 7.00
    ELSE 5.00
  END
FROM zones z
CROSS JOIN (
  SELECT 1 AS n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION 
  SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION 
  SELECT 9 UNION SELECT 10 UNION SELECT 11 UNION SELECT 12
) n;

-- Insert default admin user (password: admin123)
INSERT INTO users (username, email, password_hash, full_name, role, phone) 
VALUES ('admin', 'admin@smartpark.com', '$2a$10$rQZ9vXJxL8K5qN3mH7pO2eYwZ8xK4jL6mN9oP1qR3sT5uV7wX9yZ', 'System Administrator', 'admin', '555-0000');
