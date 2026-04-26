CREATE DATABASE EVCS;
GO

USE EVCS;
GO

-- Xóa bảng nếu đã tồn tại (để chạy lại script dễ hơn)
IF OBJECT_ID('status_logs', 'U') IS NOT NULL DROP TABLE status_logs;
IF OBJECT_ID('alerts', 'U') IS NOT NULL DROP TABLE alerts;
IF OBJECT_ID('charging_sessions', 'U') IS NOT NULL DROP TABLE charging_sessions;
IF OBJECT_ID('poles', 'U') IS NOT NULL DROP TABLE poles;
IF OBJECT_ID('stations', 'U') IS NOT NULL DROP TABLE stations;
GO

-- 1. Bảng trạm sạc
CREATE TABLE stations (
    station_id INT IDENTITY(1,1) PRIMARY KEY,
    station_code VARCHAR(50) NOT NULL UNIQUE,
    station_name VARCHAR(100) NOT NULL,
    address VARCHAR(255) NOT NULL,
    area VARCHAR(100),
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    operating_hours VARCHAR(100),
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME NOT NULL DEFAULT GETDATE(),

    CONSTRAINT chk_stations_status
        CHECK (status IN ('active', 'inactive', 'maintenance', 'error'))
);
GO

-- 2. Bảng trụ sạc
CREATE TABLE poles (
    pole_id INT IDENTITY(1,1) PRIMARY KEY,
    station_id INT NOT NULL,
    pole_code VARCHAR(50) NOT NULL UNIQUE,
    pole_name VARCHAR(100) NOT NULL,
    model VARCHAR(100),
    manufacturer VARCHAR(100),
    install_date DATE,
    number_of_ports INT NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'available',
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME NOT NULL DEFAULT GETDATE(),

    CONSTRAINT fk_poles_station
        FOREIGN KEY (station_id) REFERENCES stations(station_id),

    CONSTRAINT chk_poles_number_of_ports
        CHECK (number_of_ports > 0),

    CONSTRAINT chk_poles_status
        CHECK (status IN ('available', 'in_use', 'fault', 'inactive'))
);
GO

-- 3. Bảng lịch sử sử dụng / phiên sạc
CREATE TABLE charging_sessions (
    session_id INT IDENTITY(1,1) PRIMARY KEY,
    station_id INT NOT NULL,
    pole_id INT NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NULL,
    energy_kwh DECIMAL(10,2) NOT NULL DEFAULT 0,
    duration_minutes INT NOT NULL DEFAULT 0,
    cost DECIMAL(12,2) NOT NULL DEFAULT 0,
    session_status VARCHAR(20) NOT NULL DEFAULT 'ongoing',
    created_at DATETIME NOT NULL DEFAULT GETDATE(),

    CONSTRAINT fk_sessions_station
        FOREIGN KEY (station_id) REFERENCES stations(station_id),

    CONSTRAINT fk_sessions_pole
        FOREIGN KEY (pole_id) REFERENCES poles(pole_id),

    CONSTRAINT chk_sessions_energy
        CHECK (energy_kwh >= 0),

    CONSTRAINT chk_sessions_duration
        CHECK (duration_minutes >= 0),

    CONSTRAINT chk_sessions_cost
        CHECK (cost >= 0),

    CONSTRAINT chk_sessions_status
        CHECK (session_status IN ('ongoing', 'completed', 'cancelled', 'failed')),

    CONSTRAINT chk_sessions_time
        CHECK (end_time IS NULL OR end_time >= start_time)
);
GO

-- 4. Bảng cảnh báo lỗi
CREATE TABLE alerts (
    alert_id INT IDENTITY(1,1) PRIMARY KEY,
    station_id INT NOT NULL,
    pole_id INT NULL,
    alert_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'medium',
    message NVARCHAR(500) NOT NULL,
    occurred_at DATETIME NOT NULL DEFAULT GETDATE(),
    alert_status VARCHAR(20) NOT NULL DEFAULT 'new',
    note NVARCHAR(500) NULL,

    CONSTRAINT fk_alerts_station
        FOREIGN KEY (station_id) REFERENCES stations(station_id),

    CONSTRAINT fk_alerts_pole
        FOREIGN KEY (pole_id) REFERENCES poles(pole_id),

    CONSTRAINT chk_alerts_severity
        CHECK (severity IN ('low', 'medium', 'high', 'critical')),

    CONSTRAINT chk_alerts_status
        CHECK (alert_status IN ('new', 'acknowledged', 'resolved'))
);
GO

-- 5. Bảng theo dõi tình trạng / log trạng thái
CREATE TABLE status_logs (
    status_id INT IDENTITY(1,1) PRIMARY KEY,
    station_id INT NOT NULL,
    pole_id INT NULL,
    station_status VARCHAR(20) NOT NULL,
    pole_status VARCHAR(20) NULL,
    recorded_at DATETIME NOT NULL DEFAULT GETDATE(),
    note NVARCHAR(500) NULL,

    CONSTRAINT fk_status_logs_station
        FOREIGN KEY (station_id) REFERENCES stations(station_id),

    CONSTRAINT fk_status_logs_pole
        FOREIGN KEY (pole_id) REFERENCES poles(pole_id),

    CONSTRAINT chk_status_logs_station_status
        CHECK (station_status IN ('active', 'inactive', 'maintenance', 'error')),

    CONSTRAINT chk_status_logs_pole_status
        CHECK (pole_status IS NULL OR pole_status IN ('available', 'in_use', 'fault', 'inactive'))
);
GO

USE EVCS;
GO

/* =========================================================
   XOA DU LIEU CU
========================================================= */
DELETE FROM status_logs;
DELETE FROM alerts;
DELETE FROM charging_sessions;
DELETE FROM poles;
DELETE FROM stations;
GO

/* =========================================================
   1. STATIONS: 10 TRAM
========================================================= */
INSERT INTO stations
(station_code, station_name, address, area, latitude, longitude, status, operating_hours)
VALUES
('ST001', 'Station 1', '101 Nguyen Hue, District 1, HCMC', 'District 1', 10.7765300, 106.7009810, 'active', '24/7'),
('ST002', 'Station 2', '202 Nguyen Thi Minh Khai, District 3, HCMC', 'District 3', 10.7797830, 106.6878860, 'active', '24/7'),
('ST003', 'Station 3', '303 Vo Van Kiet, District 5, HCMC', 'District 5', 10.7540270, 106.6633740, 'inactive', '06:00 - 22:00'),
('ST004', 'Station 4', '404 Phan Xich Long, Phu Nhuan, HCMC', 'Phu Nhuan', 10.8019020, 106.6771540, 'maintenance', '24/7'),
('ST005', 'Station 5', '505 Cong Hoa, Tan Binh, HCMC', 'Tan Binh', 10.8015120, 106.6521070, 'error', '24/7'),
('ST006', 'Station 6', '606 Kha Van Can, Thu Duc, HCMC', 'Thu Duc', 10.8504300, 106.7561300, 'active', '06:00 - 22:00'),
('ST007', 'Station 7', '707 Nguyen Van Linh, District 7, HCMC', 'District 7', 10.7291760, 106.7188460, 'active', '24/7'),
('ST008', 'Station 8', '808 Le Van Viet, District 9, HCMC', 'District 9', 10.8411270, 106.8098830, 'inactive', '06:00 - 22:00'),
('ST009', 'Station 9', '909 Quang Trung, Go Vap, HCMC', 'Go Vap', 10.8386770, 106.6652900, 'active', '24/7'),
('ST010', 'Station 10', '1001 Tran Hung Dao, District 1, HCMC', 'District 1', 10.7695120, 106.6923140, 'maintenance', '24/7');
GO

/* =========================================================
   2. POLES: 30 TRU
   Phan bo:
   ST001 = 4
   ST002 = 3
   ST003 = 2
   ST004 = 4
   ST005 = 3
   ST006 = 2
   ST007 = 4
   ST008 = 3
   ST009 = 2
   ST010 = 3
========================================================= */
INSERT INTO poles
(station_id, pole_code, pole_name, model, manufacturer, install_date, number_of_ports, status)
VALUES
-- ST001
((SELECT station_id FROM stations WHERE station_code = 'ST001'), 'PL001', 'Pole 1', 'ABB Terra AC', 'ABB', '2026-01-01', 2, 'available'),
((SELECT station_id FROM stations WHERE station_code = 'ST001'), 'PL002', 'Pole 2', 'ABB Terra DC', 'ABB', '2026-01-03', 2, 'in_use'),
((SELECT station_id FROM stations WHERE station_code = 'ST001'), 'PL003', 'Pole 3', 'Siemens VersiCharge', 'Siemens', '2026-01-05', 1, 'available'),
((SELECT station_id FROM stations WHERE station_code = 'ST001'), 'PL004', 'Pole 4', 'Schneider EVlink', 'Schneider', '2026-01-07', 2, 'fault'),

-- ST002
((SELECT station_id FROM stations WHERE station_code = 'ST002'), 'PL005', 'Pole 5', 'ABB Terra AC', 'ABB', '2026-01-10', 2, 'available'),
((SELECT station_id FROM stations WHERE station_code = 'ST002'), 'PL006', 'Pole 6', 'Siemens VersiCharge', 'Siemens', '2026-01-12', 1, 'inactive'),
((SELECT station_id FROM stations WHERE station_code = 'ST002'), 'PL007', 'Pole 7', 'Schneider EVlink', 'Schneider', '2026-01-15', 2, 'in_use'),

-- ST003
((SELECT station_id FROM stations WHERE station_code = 'ST003'), 'PL008', 'Pole 8', 'ABB Terra DC', 'ABB', '2026-01-18', 2, 'inactive'),
((SELECT station_id FROM stations WHERE station_code = 'ST003'), 'PL009', 'Pole 9', 'Siemens VersiCharge', 'Siemens', '2026-01-20', 1, 'fault'),

-- ST004
((SELECT station_id FROM stations WHERE station_code = 'ST004'), 'PL010', 'Pole 10', 'Schneider EVlink', 'Schneider', '2026-01-22', 2, 'available'),
((SELECT station_id FROM stations WHERE station_code = 'ST004'), 'PL011', 'Pole 11', 'ABB Terra AC', 'ABB', '2026-01-24', 1, 'inactive'),
((SELECT station_id FROM stations WHERE station_code = 'ST004'), 'PL012', 'Pole 12', 'ABB Terra DC', 'ABB', '2026-01-26', 2, 'fault'),
((SELECT station_id FROM stations WHERE station_code = 'ST004'), 'PL013', 'Pole 13', 'Siemens VersiCharge', 'Siemens', '2026-01-28', 2, 'available'),

-- ST005
((SELECT station_id FROM stations WHERE station_code = 'ST005'), 'PL014', 'Pole 14', 'ABB Terra AC', 'ABB', '2026-02-01', 2, 'fault'),
((SELECT station_id FROM stations WHERE station_code = 'ST005'), 'PL015', 'Pole 15', 'Schneider EVlink', 'Schneider', '2026-02-03', 2, 'inactive'),
((SELECT station_id FROM stations WHERE station_code = 'ST005'), 'PL016', 'Pole 16', 'Siemens VersiCharge', 'Siemens', '2026-02-05', 1, 'available'),

-- ST006
((SELECT station_id FROM stations WHERE station_code = 'ST006'), 'PL017', 'Pole 17', 'ABB Terra DC', 'ABB', '2026-02-07', 2, 'available'),
((SELECT station_id FROM stations WHERE station_code = 'ST006'), 'PL018', 'Pole 18', 'Schneider EVlink', 'Schneider', '2026-02-09', 1, 'in_use'),

-- ST007
((SELECT station_id FROM stations WHERE station_code = 'ST007'), 'PL019', 'Pole 19', 'ABB Terra AC', 'ABB', '2026-02-11', 2, 'available'),
((SELECT station_id FROM stations WHERE station_code = 'ST007'), 'PL020', 'Pole 20', 'ABB Terra DC', 'ABB', '2026-02-13', 2, 'in_use'),
((SELECT station_id FROM stations WHERE station_code = 'ST007'), 'PL021', 'Pole 21', 'Siemens VersiCharge', 'Siemens', '2026-02-15', 1, 'available'),
((SELECT station_id FROM stations WHERE station_code = 'ST007'), 'PL022', 'Pole 22', 'Schneider EVlink', 'Schneider', '2026-02-17', 2, 'fault'),

-- ST008
((SELECT station_id FROM stations WHERE station_code = 'ST008'), 'PL023', 'Pole 23', 'ABB Terra AC', 'ABB', '2026-02-20', 2, 'inactive'),
((SELECT station_id FROM stations WHERE station_code = 'ST008'), 'PL024', 'Pole 24', 'Siemens VersiCharge', 'Siemens', '2026-02-22', 1, 'fault'),
((SELECT station_id FROM stations WHERE station_code = 'ST008'), 'PL025', 'Pole 25', 'Schneider EVlink', 'Schneider', '2026-02-24', 2, 'available'),

-- ST009
((SELECT station_id FROM stations WHERE station_code = 'ST009'), 'PL026', 'Pole 26', 'ABB Terra DC', 'ABB', '2026-02-26', 2, 'available'),
((SELECT station_id FROM stations WHERE station_code = 'ST009'), 'PL027', 'Pole 27', 'Siemens VersiCharge', 'Siemens', '2026-02-28', 1, 'in_use'),

-- ST010
((SELECT station_id FROM stations WHERE station_code = 'ST010'), 'PL028', 'Pole 28', 'Schneider EVlink', 'Schneider', '2026-03-01', 2, 'inactive'),
((SELECT station_id FROM stations WHERE station_code = 'ST010'), 'PL029', 'Pole 29', 'ABB Terra AC', 'ABB', '2026-03-03', 2, 'available'),
((SELECT station_id FROM stations WHERE station_code = 'ST010'), 'PL030', 'Pole 30', 'ABB Terra DC', 'ABB', '2026-03-05', 1, 'fault');
GO

/* =========================================================
   3. CHARGING_SESSIONS: 30 PHIEN SAC
========================================================= */
INSERT INTO charging_sessions
(station_id, pole_id, start_time, end_time, energy_kwh, duration_minutes, cost, session_status)
VALUES
((SELECT station_id FROM stations WHERE station_code='ST001'), (SELECT pole_id FROM poles WHERE pole_code='PL001'), '2026-04-01 08:00:00', '2026-04-01 09:00:00', 25.50, 60, 120000, 'completed'),
((SELECT station_id FROM stations WHERE station_code='ST001'), (SELECT pole_id FROM poles WHERE pole_code='PL002'), '2026-04-01 10:00:00', NULL, 12.10, 25, 58000, 'ongoing'),
((SELECT station_id FROM stations WHERE station_code='ST001'), (SELECT pole_id FROM poles WHERE pole_code='PL002'), '2026-04-02 14:00:00', '2026-04-02 14:45:00', 18.40, 45, 88000, 'completed'),
((SELECT station_id FROM stations WHERE station_code='ST001'), (SELECT pole_id FROM poles WHERE pole_code='PL004'), '2026-04-03 09:10:00', '2026-04-03 09:20:00', 1.90, 10, 9000, 'failed'),

((SELECT station_id FROM stations WHERE station_code='ST002'), (SELECT pole_id FROM poles WHERE pole_code='PL005'), '2026-04-01 07:30:00', '2026-04-01 08:25:00', 23.20, 55, 110000, 'completed'),
((SELECT station_id FROM stations WHERE station_code='ST002'), (SELECT pole_id FROM poles WHERE pole_code='PL007'), '2026-04-02 18:00:00', NULL, 9.50, 18, 45000, 'ongoing'),
((SELECT station_id FROM stations WHERE station_code='ST002'), (SELECT pole_id FROM poles WHERE pole_code='PL005'), '2026-04-04 11:00:00', '2026-04-04 11:35:00', 14.60, 35, 69000, 'completed'),

((SELECT station_id FROM stations WHERE station_code='ST003'), (SELECT pole_id FROM poles WHERE pole_code='PL008'), '2026-04-01 13:00:00', '2026-04-01 13:12:00', 2.50, 12, 12000, 'cancelled'),
((SELECT station_id FROM stations WHERE station_code='ST003'), (SELECT pole_id FROM poles WHERE pole_code='PL009'), '2026-04-03 15:15:00', '2026-04-03 15:23:00', 1.20, 8, 6000, 'failed'),

((SELECT station_id FROM stations WHERE station_code='ST004'), (SELECT pole_id FROM poles WHERE pole_code='PL010'), '2026-04-01 08:45:00', '2026-04-01 09:35:00', 20.00, 50, 95000, 'completed'),
((SELECT station_id FROM stations WHERE station_code='ST004'), (SELECT pole_id FROM poles WHERE pole_code='PL013'), '2026-04-02 10:20:00', '2026-04-02 11:05:00', 17.70, 45, 84000, 'completed'),
((SELECT station_id FROM stations WHERE station_code='ST004'), (SELECT pole_id FROM poles WHERE pole_code='PL012'), '2026-04-04 16:00:00', '2026-04-04 16:09:00', 0.90, 9, 4000, 'failed'),

((SELECT station_id FROM stations WHERE station_code='ST005'), (SELECT pole_id FROM poles WHERE pole_code='PL016'), '2026-04-01 06:30:00', '2026-04-01 07:20:00', 21.60, 50, 102000, 'completed'),
((SELECT station_id FROM stations WHERE station_code='ST005'), (SELECT pole_id FROM poles WHERE pole_code='PL014'), '2026-04-03 12:00:00', '2026-04-03 12:08:00', 1.10, 8, 5000, 'failed'),
((SELECT station_id FROM stations WHERE station_code='ST005'), (SELECT pole_id FROM poles WHERE pole_code='PL016'), '2026-04-05 17:30:00', NULL, 7.30, 15, 34000, 'ongoing'),

((SELECT station_id FROM stations WHERE station_code='ST006'), (SELECT pole_id FROM poles WHERE pole_code='PL017'), '2026-04-02 07:00:00', '2026-04-02 08:02:00', 27.40, 62, 129000, 'completed'),
((SELECT station_id FROM stations WHERE station_code='ST006'), (SELECT pole_id FROM poles WHERE pole_code='PL018'), '2026-04-04 09:30:00', NULL, 8.60, 20, 41000, 'ongoing'),

((SELECT station_id FROM stations WHERE station_code='ST007'), (SELECT pole_id FROM poles WHERE pole_code='PL019'), '2026-04-01 09:15:00', '2026-04-01 10:05:00', 19.80, 50, 94000, 'completed'),
((SELECT station_id FROM stations WHERE station_code='ST007'), (SELECT pole_id FROM poles WHERE pole_code='PL020'), '2026-04-01 14:10:00', NULL, 10.90, 22, 52000, 'ongoing'),
((SELECT station_id FROM stations WHERE station_code='ST007'), (SELECT pole_id FROM poles WHERE pole_code='PL021'), '2026-04-03 08:40:00', '2026-04-03 09:18:00', 15.10, 38, 71000, 'completed'),
((SELECT station_id FROM stations WHERE station_code='ST007'), (SELECT pole_id FROM poles WHERE pole_code='PL022'), '2026-04-05 13:50:00', '2026-04-05 13:58:00', 1.00, 8, 5000, 'failed'),

((SELECT station_id FROM stations WHERE station_code='ST008'), (SELECT pole_id FROM poles WHERE pole_code='PL023'), '2026-04-02 11:10:00', '2026-04-02 11:22:00', 2.70, 12, 12000, 'cancelled'),
((SELECT station_id FROM stations WHERE station_code='ST008'), (SELECT pole_id FROM poles WHERE pole_code='PL025'), '2026-04-04 15:00:00', '2026-04-04 15:48:00', 18.90, 48, 90000, 'completed'),
((SELECT station_id FROM stations WHERE station_code='ST008'), (SELECT pole_id FROM poles WHERE pole_code='PL024'), '2026-04-05 10:25:00', '2026-04-05 10:33:00', 1.30, 8, 6000, 'failed'),

((SELECT station_id FROM stations WHERE station_code='ST009'), (SELECT pole_id FROM poles WHERE pole_code='PL026'), '2026-04-01 07:45:00', '2026-04-01 08:35:00', 20.50, 50, 97000, 'completed'),
((SELECT station_id FROM stations WHERE station_code='ST009'), (SELECT pole_id FROM poles WHERE pole_code='PL027'), '2026-04-03 17:10:00', NULL, 11.20, 24, 53000, 'ongoing'),
((SELECT station_id FROM stations WHERE station_code='ST009'), (SELECT pole_id FROM poles WHERE pole_code='PL026'), '2026-04-05 19:00:00', '2026-04-05 19:42:00', 16.20, 42, 76000, 'completed'),

((SELECT station_id FROM stations WHERE station_code='ST010'), (SELECT pole_id FROM poles WHERE pole_code='PL028'), '2026-04-02 06:50:00', '2026-04-02 07:05:00', 3.10, 15, 14000, 'cancelled'),
((SELECT station_id FROM stations WHERE station_code='ST010'), (SELECT pole_id FROM poles WHERE pole_code='PL029'), '2026-04-03 09:00:00', '2026-04-03 09:55:00', 24.60, 55, 116000, 'completed'),
((SELECT station_id FROM stations WHERE station_code='ST010'), (SELECT pole_id FROM poles WHERE pole_code='PL030'), '2026-04-05 11:40:00', '2026-04-05 11:48:00', 1.40, 8, 6000, 'failed');
GO

/* =========================================================
   4. ALERTS: 30 CANH BAO
   Co canh bao muc tram (pole_id = NULL)
   va canh bao muc tru (pole_id co gia tri)
========================================================= */
INSERT INTO alerts
(station_id, pole_id, alert_type, severity, message, occurred_at, alert_status, note)
VALUES
-- ST001 (4)
((SELECT station_id FROM stations WHERE station_code='ST001'), NULL, 'Connection Lost', 'critical', N'Station heartbeat lost for over 5 minutes.', '2026-04-06 08:10:00', 'new', N'Check gateway connection.'),
((SELECT station_id FROM stations WHERE station_code='ST001'), (SELECT pole_id FROM poles WHERE pole_code='PL004'), 'Overheating', 'high', N'Pole temperature exceeded threshold.', '2026-04-06 09:00:00', 'acknowledged', N'Inspect cooling system.'),
((SELECT station_id FROM stations WHERE station_code='ST001'), (SELECT pole_id FROM poles WHERE pole_code='PL002'), 'Charging Port Error', 'medium', N'Charging interrupted unexpectedly.', '2026-04-06 10:20:00', 'resolved', N'Port reset completed.'),
((SELECT station_id FROM stations WHERE station_code='ST001'), NULL, 'Power Fluctuation', 'medium', N'Input voltage unstable.', '2026-04-06 11:30:00', 'new', N'Monitor incoming power.'),

-- ST002 (3)
((SELECT station_id FROM stations WHERE station_code='ST002'), NULL, 'Maintenance Reminder', 'low', N'Scheduled maintenance due soon.', '2026-04-06 08:45:00', 'resolved', N'Planned for next week.'),
((SELECT station_id FROM stations WHERE station_code='ST002'), (SELECT pole_id FROM poles WHERE pole_code='PL006'), 'Offline Charger', 'high', N'Pole not responding to ping.', '2026-04-06 12:00:00', 'new', N'Check network module.'),
((SELECT station_id FROM stations WHERE station_code='ST002'), (SELECT pole_id FROM poles WHERE pole_code='PL007'), 'Session Interrupted', 'medium', N'Charging session stopped unexpectedly.', '2026-04-06 13:10:00', 'acknowledged', N'Review session logs.'),

-- ST003 (2)
((SELECT station_id FROM stations WHERE station_code='ST003'), NULL, 'Station Inactive', 'medium', N'Station is currently inactive.', '2026-04-06 07:20:00', 'resolved', N'Intentional shutdown.'),
((SELECT station_id FROM stations WHERE station_code='ST003'), (SELECT pole_id FROM poles WHERE pole_code='PL009'), 'Hardware Fault', 'critical', N'Pole reported internal hardware error.', '2026-04-06 14:00:00', 'new', N'Requires on-site inspection.'),

-- ST004 (4)
((SELECT station_id FROM stations WHERE station_code='ST004'), NULL, 'Scheduled Maintenance', 'low', N'Station under planned maintenance.', '2026-04-06 06:00:00', 'resolved', N'Expected completion this evening.'),
((SELECT station_id FROM stations WHERE station_code='ST004'), (SELECT pole_id FROM poles WHERE pole_code='PL012'), 'Cooling Fan Failure', 'high', N'Cooling fan not operating normally.', '2026-04-06 09:50:00', 'acknowledged', N'Prepare spare parts.'),
((SELECT station_id FROM stations WHERE station_code='ST004'), (SELECT pole_id FROM poles WHERE pole_code='PL011'), 'Offline Charger', 'medium', N'Pole is inactive and disconnected.', '2026-04-06 10:35:00', 'new', N'Verify communication board.'),
((SELECT station_id FROM stations WHERE station_code='ST004'), NULL, 'Voltage Drop', 'medium', N'Short voltage drop detected.', '2026-04-06 15:30:00', 'resolved', N'No further action.'),

-- ST005 (4)
((SELECT station_id FROM stations WHERE station_code='ST005'), NULL, 'Critical Station Error', 'critical', N'Station entered error state.', '2026-04-06 05:40:00', 'new', N'Escalate to supervisor.'),
((SELECT station_id FROM stations WHERE station_code='ST005'), (SELECT pole_id FROM poles WHERE pole_code='PL014'), 'Overcurrent', 'critical', N'Current exceeded safe threshold.', '2026-04-06 08:25:00', 'acknowledged', N'Stop using pole immediately.'),
((SELECT station_id FROM stations WHERE station_code='ST005'), (SELECT pole_id FROM poles WHERE pole_code='PL015'), 'Inactive Pole', 'low', N'Pole intentionally disabled.', '2026-04-06 09:40:00', 'resolved', N'No issue.'),
((SELECT station_id FROM stations WHERE station_code='ST005'), (SELECT pole_id FROM poles WHERE pole_code='PL016'), 'Connector Warning', 'medium', N'Connector wear detected.', '2026-04-06 16:10:00', 'new', N'Schedule replacement.'),

-- ST006 (2)
((SELECT station_id FROM stations WHERE station_code='ST006'), (SELECT pole_id FROM poles WHERE pole_code='PL018'), 'Active Session Delay', 'low', N'Ongoing session longer than average.', '2026-04-06 11:15:00', 'new', N'Observe charging progress.'),
((SELECT station_id FROM stations WHERE station_code='ST006'), NULL, 'Network Latency', 'medium', N'Communication delay with central server.', '2026-04-06 17:25:00', 'acknowledged', N'Investigate ISP stability.'),

-- ST007 (4)
((SELECT station_id FROM stations WHERE station_code='ST007'), (SELECT pole_id FROM poles WHERE pole_code='PL020'), 'Session Ongoing', 'low', N'Pole currently in heavy usage.', '2026-04-06 07:50:00', 'resolved', N'Informational event.'),
((SELECT station_id FROM stations WHERE station_code='ST007'), (SELECT pole_id FROM poles WHERE pole_code='PL022'), 'Pole Fault', 'high', N'Pole fault flag active.', '2026-04-06 08:55:00', 'new', N'Check diagnostics.'),
((SELECT station_id FROM stations WHERE station_code='ST007'), NULL, 'Traffic Spike', 'low', N'Station usage spike detected.', '2026-04-06 12:40:00', 'acknowledged', N'Capacity still acceptable.'),
((SELECT station_id FROM stations WHERE station_code='ST007'), (SELECT pole_id FROM poles WHERE pole_code='PL021'), 'Communication Warning', 'medium', N'Intermittent packet loss.', '2026-04-06 18:05:00', 'new', N'Observe if recurring.'),

-- ST008 (2)
((SELECT station_id FROM stations WHERE station_code='ST008'), NULL, 'Station Inactive', 'medium', N'Station closed outside operating hours.', '2026-04-06 06:10:00', 'resolved', N'Normal schedule behavior.'),
((SELECT station_id FROM stations WHERE station_code='ST008'), (SELECT pole_id FROM poles WHERE pole_code='PL024'), 'Hardware Fault', 'high', N'Pole hardware self-test failed.', '2026-04-06 13:45:00', 'new', N'Replace faulty module.'),

-- ST009 (3)
((SELECT station_id FROM stations WHERE station_code='ST009'), (SELECT pole_id FROM poles WHERE pole_code='PL027'), 'Ongoing Session', 'low', N'Pole currently charging vehicle.', '2026-04-06 10:00:00', 'resolved', N'Informational.'),
((SELECT station_id FROM stations WHERE station_code='ST009'), NULL, 'Station Alert', 'medium', N'Unexpected restart detected.', '2026-04-06 11:50:00', 'acknowledged', N'Review restart cause.'),
((SELECT station_id FROM stations WHERE station_code='ST009'), (SELECT pole_id FROM poles WHERE pole_code='PL026'), 'Connector Check', 'low', N'Routine connector inspection recommended.', '2026-04-06 19:20:00', 'new', N'Add to maintenance list.'),

-- ST010 (2)
((SELECT station_id FROM stations WHERE station_code='ST010'), NULL, 'Maintenance Mode', 'low', N'Station in maintenance mode.', '2026-04-06 07:00:00', 'resolved', N'Planned action.'),
((SELECT station_id FROM stations WHERE station_code='ST010'), (SELECT pole_id FROM poles WHERE pole_code='PL030'), 'Pole Fault', 'critical', N'Pole fault after failed session.', '2026-04-06 14:25:00', 'new', N'Inspect immediately.');
GO

/* =========================================================
   5. STATUS_LOGS: 30 LOG
========================================================= */
INSERT INTO status_logs
(station_id, pole_id, station_status, pole_status, recorded_at, note)
VALUES
((SELECT station_id FROM stations WHERE station_code='ST001'), (SELECT pole_id FROM poles WHERE pole_code='PL001'), 'active', 'available', '2026-04-06 08:00:00', N'Pole 1 normal.'),
((SELECT station_id FROM stations WHERE station_code='ST001'), (SELECT pole_id FROM poles WHERE pole_code='PL002'), 'active', 'in_use', '2026-04-06 08:05:00', N'Pole 2 serving vehicle.'),
((SELECT station_id FROM stations WHERE station_code='ST001'), (SELECT pole_id FROM poles WHERE pole_code='PL003'), 'active', 'available', '2026-04-06 08:10:00', N'Pole 3 idle.'),
((SELECT station_id FROM stations WHERE station_code='ST001'), (SELECT pole_id FROM poles WHERE pole_code='PL004'), 'active', 'fault', '2026-04-06 08:15:00', N'Pole 4 fault detected.'),

((SELECT station_id FROM stations WHERE station_code='ST002'), (SELECT pole_id FROM poles WHERE pole_code='PL005'), 'active', 'available', '2026-04-06 08:20:00', N'Pole 5 ready.'),
((SELECT station_id FROM stations WHERE station_code='ST002'), (SELECT pole_id FROM poles WHERE pole_code='PL006'), 'active', 'inactive', '2026-04-06 08:25:00', N'Pole 6 offline.'),
((SELECT station_id FROM stations WHERE station_code='ST002'), (SELECT pole_id FROM poles WHERE pole_code='PL007'), 'active', 'in_use', '2026-04-06 08:30:00', N'Pole 7 charging.'),

((SELECT station_id FROM stations WHERE station_code='ST003'), (SELECT pole_id FROM poles WHERE pole_code='PL008'), 'inactive', 'inactive', '2026-04-06 08:35:00', N'Station inactive.'),
((SELECT station_id FROM stations WHERE station_code='ST003'), (SELECT pole_id FROM poles WHERE pole_code='PL009'), 'inactive', 'fault', '2026-04-06 08:40:00', N'Pole 9 hardware issue.'),

((SELECT station_id FROM stations WHERE station_code='ST004'), (SELECT pole_id FROM poles WHERE pole_code='PL010'), 'maintenance', 'available', '2026-04-06 08:45:00', N'Pole 10 ready after maintenance check.'),
((SELECT station_id FROM stations WHERE station_code='ST004'), (SELECT pole_id FROM poles WHERE pole_code='PL011'), 'maintenance', 'inactive', '2026-04-06 08:50:00', N'Pole 11 disabled.'),
((SELECT station_id FROM stations WHERE station_code='ST004'), (SELECT pole_id FROM poles WHERE pole_code='PL012'), 'maintenance', 'fault', '2026-04-06 08:55:00', N'Pole 12 cooling issue.'),
((SELECT station_id FROM stations WHERE station_code='ST004'), (SELECT pole_id FROM poles WHERE pole_code='PL013'), 'maintenance', 'available', '2026-04-06 09:00:00', N'Pole 13 standby.'),

((SELECT station_id FROM stations WHERE station_code='ST005'), (SELECT pole_id FROM poles WHERE pole_code='PL014'), 'error', 'fault', '2026-04-06 09:05:00', N'Pole 14 overcurrent.'),
((SELECT station_id FROM stations WHERE station_code='ST005'), (SELECT pole_id FROM poles WHERE pole_code='PL015'), 'error', 'inactive', '2026-04-06 09:10:00', N'Pole 15 disabled.'),
((SELECT station_id FROM stations WHERE station_code='ST005'), (SELECT pole_id FROM poles WHERE pole_code='PL016'), 'error', 'available', '2026-04-06 09:15:00', N'Pole 16 still usable.'),

((SELECT station_id FROM stations WHERE station_code='ST006'), (SELECT pole_id FROM poles WHERE pole_code='PL017'), 'active', 'available', '2026-04-06 09:20:00', N'Pole 17 normal.'),
((SELECT station_id FROM stations WHERE station_code='ST006'), (SELECT pole_id FROM poles WHERE pole_code='PL018'), 'active', 'in_use', '2026-04-06 09:25:00', N'Pole 18 charging.'),

((SELECT station_id FROM stations WHERE station_code='ST007'), (SELECT pole_id FROM poles WHERE pole_code='PL019'), 'active', 'available', '2026-04-06 09:30:00', N'Pole 19 ready.'),
((SELECT station_id FROM stations WHERE station_code='ST007'), (SELECT pole_id FROM poles WHERE pole_code='PL020'), 'active', 'in_use', '2026-04-06 09:35:00', N'Pole 20 busy.'),
((SELECT station_id FROM stations WHERE station_code='ST007'), (SELECT pole_id FROM poles WHERE pole_code='PL021'), 'active', 'available', '2026-04-06 09:40:00', N'Pole 21 ready.'),
((SELECT station_id FROM stations WHERE station_code='ST007'), (SELECT pole_id FROM poles WHERE pole_code='PL022'), 'active', 'fault', '2026-04-06 09:45:00', N'Pole 22 reported fault.'),

((SELECT station_id FROM stations WHERE station_code='ST008'), (SELECT pole_id FROM poles WHERE pole_code='PL023'), 'inactive', 'inactive', '2026-04-06 09:50:00', N'Pole 23 inactive.'),
((SELECT station_id FROM stations WHERE station_code='ST008'), (SELECT pole_id FROM poles WHERE pole_code='PL024'), 'inactive', 'fault', '2026-04-06 09:55:00', N'Pole 24 failed self-test.'),
((SELECT station_id FROM stations WHERE station_code='ST008'), (SELECT pole_id FROM poles WHERE pole_code='PL025'), 'inactive', 'available', '2026-04-06 10:00:00', N'Pole 25 ready but station closed.'),

((SELECT station_id FROM stations WHERE station_code='ST009'), (SELECT pole_id FROM poles WHERE pole_code='PL026'), 'active', 'available', '2026-04-06 10:05:00', N'Pole 26 normal.'),
((SELECT station_id FROM stations WHERE station_code='ST009'), (SELECT pole_id FROM poles WHERE pole_code='PL027'), 'active', 'in_use', '2026-04-06 10:10:00', N'Pole 27 charging session active.'),

((SELECT station_id FROM stations WHERE station_code='ST010'), (SELECT pole_id FROM poles WHERE pole_code='PL028'), 'maintenance', 'inactive', '2026-04-06 10:15:00', N'Pole 28 disabled for maintenance.'),
((SELECT station_id FROM stations WHERE station_code='ST010'), (SELECT pole_id FROM poles WHERE pole_code='PL029'), 'maintenance', 'available', '2026-04-06 10:20:00', N'Pole 29 available.'),
((SELECT station_id FROM stations WHERE station_code='ST010'), (SELECT pole_id FROM poles WHERE pole_code='PL030'), 'maintenance', 'fault', '2026-04-06 10:25:00', N'Pole 30 fault after failed session.');
GO