-- =========================================================
-- EVCS Database - PostgreSQL (Supabase)
-- =========================================================

-- Drop tables if exist
DROP TABLE IF EXISTS status_logs CASCADE;
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS charging_sessions CASCADE;
DROP TABLE IF EXISTS poles CASCADE;
DROP TABLE IF EXISTS stations CASCADE;

-- 1. stations
CREATE TABLE stations (
    station_id SERIAL PRIMARY KEY,
    station_code VARCHAR(50) NOT NULL UNIQUE,
    station_name VARCHAR(100) NOT NULL,
    address VARCHAR(255) NOT NULL,
    area VARCHAR(100),
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','maintenance','error')),
    operating_hours VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 2. poles
CREATE TABLE poles (
    pole_id SERIAL PRIMARY KEY,
    station_id INT NOT NULL REFERENCES stations(station_id),
    pole_code VARCHAR(50) NOT NULL UNIQUE,
    pole_name VARCHAR(100) NOT NULL,
    model VARCHAR(100),
    manufacturer VARCHAR(100),
    install_date DATE,
    number_of_ports INT NOT NULL DEFAULT 1 CHECK (number_of_ports > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available','in_use','fault','inactive')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 3. charging_sessions
CREATE TABLE charging_sessions (
    session_id SERIAL PRIMARY KEY,
    station_id INT NOT NULL REFERENCES stations(station_id),
    pole_id INT NOT NULL REFERENCES poles(pole_id),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NULL,
    energy_kwh DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (energy_kwh >= 0),
    duration_minutes INT NOT NULL DEFAULT 0 CHECK (duration_minutes >= 0),
    cost DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (cost >= 0),
    session_status VARCHAR(20) NOT NULL DEFAULT 'ongoing' CHECK (session_status IN ('ongoing','completed','cancelled','failed')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CHECK (end_time IS NULL OR end_time >= start_time)
);

-- 4. alerts
CREATE TABLE alerts (
    alert_id SERIAL PRIMARY KEY,
    station_id INT NOT NULL REFERENCES stations(station_id),
    pole_id INT NULL REFERENCES poles(pole_id),
    alert_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
    message TEXT NOT NULL,
    occurred_at TIMESTAMP NOT NULL DEFAULT NOW(),
    alert_status VARCHAR(20) NOT NULL DEFAULT 'new' CHECK (alert_status IN ('new','acknowledged','resolved')),
    note TEXT NULL
);

-- 5. status_logs
CREATE TABLE status_logs (
    status_id SERIAL PRIMARY KEY,
    station_id INT NOT NULL REFERENCES stations(station_id),
    pole_id INT NULL REFERENCES poles(pole_id),
    station_status VARCHAR(20) NOT NULL CHECK (station_status IN ('active','inactive','maintenance','error')),
    pole_status VARCHAR(20) NULL CHECK (pole_status IS NULL OR pole_status IN ('available','in_use','fault','inactive')),
    recorded_at TIMESTAMP NOT NULL DEFAULT NOW(),
    note TEXT NULL
);

-- =========================================================
-- SEED DATA
-- =========================================================

INSERT INTO stations (station_code,station_name,address,area,latitude,longitude,status,operating_hours) VALUES
('ST001','Station 1','101 Nguyen Hue, District 1, HCMC','District 1',10.7765300,106.7009810,'active','24/7'),
('ST002','Station 2','202 Nguyen Thi Minh Khai, District 3, HCMC','District 3',10.7797830,106.6878860,'active','24/7'),
('ST003','Station 3','303 Vo Van Kiet, District 5, HCMC','District 5',10.7540270,106.6633740,'inactive','06:00 - 22:00'),
('ST004','Station 4','404 Phan Xich Long, Phu Nhuan, HCMC','Phu Nhuan',10.8019020,106.6771540,'maintenance','24/7'),
('ST005','Station 5','505 Cong Hoa, Tan Binh, HCMC','Tan Binh',10.8015120,106.6521070,'error','24/7'),
('ST006','Station 6','606 Kha Van Can, Thu Duc, HCMC','Thu Duc',10.8504300,106.7561300,'active','06:00 - 22:00'),
('ST007','Station 7','707 Nguyen Van Linh, District 7, HCMC','District 7',10.7291760,106.7188460,'active','24/7'),
('ST008','Station 8','808 Le Van Viet, District 9, HCMC','District 9',10.8411270,106.8098830,'inactive','06:00 - 22:00'),
('ST009','Station 9','909 Quang Trung, Go Vap, HCMC','Go Vap',10.8386770,106.6652900,'active','24/7'),
('ST010','Station 10','1001 Tran Hung Dao, District 1, HCMC','District 1',10.7695120,106.6923140,'maintenance','24/7');

INSERT INTO poles (station_id,pole_code,pole_name,model,manufacturer,install_date,number_of_ports,status) VALUES
((SELECT station_id FROM stations WHERE station_code='ST001'),'PL001','Pole 1','ABB Terra AC','ABB','2026-01-01',2,'available'),
((SELECT station_id FROM stations WHERE station_code='ST001'),'PL002','Pole 2','ABB Terra DC','ABB','2026-01-03',2,'in_use'),
((SELECT station_id FROM stations WHERE station_code='ST001'),'PL003','Pole 3','Siemens VersiCharge','Siemens','2026-01-05',1,'available'),
((SELECT station_id FROM stations WHERE station_code='ST001'),'PL004','Pole 4','Schneider EVlink','Schneider','2026-01-07',2,'fault'),
((SELECT station_id FROM stations WHERE station_code='ST002'),'PL005','Pole 5','ABB Terra AC','ABB','2026-01-10',2,'available'),
((SELECT station_id FROM stations WHERE station_code='ST002'),'PL006','Pole 6','Siemens VersiCharge','Siemens','2026-01-12',1,'inactive'),
((SELECT station_id FROM stations WHERE station_code='ST002'),'PL007','Pole 7','Schneider EVlink','Schneider','2026-01-15',2,'in_use'),
((SELECT station_id FROM stations WHERE station_code='ST003'),'PL008','Pole 8','ABB Terra DC','ABB','2026-01-18',2,'inactive'),
((SELECT station_id FROM stations WHERE station_code='ST003'),'PL009','Pole 9','Siemens VersiCharge','Siemens','2026-01-20',1,'fault'),
((SELECT station_id FROM stations WHERE station_code='ST004'),'PL010','Pole 10','Schneider EVlink','Schneider','2026-01-22',2,'available'),
((SELECT station_id FROM stations WHERE station_code='ST004'),'PL011','Pole 11','ABB Terra AC','ABB','2026-01-24',1,'inactive'),
((SELECT station_id FROM stations WHERE station_code='ST004'),'PL012','Pole 12','ABB Terra DC','ABB','2026-01-26',2,'fault'),
((SELECT station_id FROM stations WHERE station_code='ST004'),'PL013','Pole 13','Siemens VersiCharge','Siemens','2026-01-28',2,'available'),
((SELECT station_id FROM stations WHERE station_code='ST005'),'PL014','Pole 14','ABB Terra AC','ABB','2026-02-01',2,'fault'),
((SELECT station_id FROM stations WHERE station_code='ST005'),'PL015','Pole 15','Schneider EVlink','Schneider','2026-02-03',2,'inactive'),
((SELECT station_id FROM stations WHERE station_code='ST005'),'PL016','Pole 16','Siemens VersiCharge','Siemens','2026-02-05',1,'available'),
((SELECT station_id FROM stations WHERE station_code='ST006'),'PL017','Pole 17','ABB Terra DC','ABB','2026-02-07',2,'available'),
((SELECT station_id FROM stations WHERE station_code='ST006'),'PL018','Pole 18','Schneider EVlink','Schneider','2026-02-09',1,'in_use'),
((SELECT station_id FROM stations WHERE station_code='ST007'),'PL019','Pole 19','ABB Terra AC','ABB','2026-02-11',2,'available'),
((SELECT station_id FROM stations WHERE station_code='ST007'),'PL020','Pole 20','ABB Terra DC','ABB','2026-02-13',2,'in_use'),
((SELECT station_id FROM stations WHERE station_code='ST007'),'PL021','Pole 21','Siemens VersiCharge','Siemens','2026-02-15',1,'available'),
((SELECT station_id FROM stations WHERE station_code='ST007'),'PL022','Pole 22','Schneider EVlink','Schneider','2026-02-17',2,'fault'),
((SELECT station_id FROM stations WHERE station_code='ST008'),'PL023','Pole 23','ABB Terra AC','ABB','2026-02-20',2,'inactive'),
((SELECT station_id FROM stations WHERE station_code='ST008'),'PL024','Pole 24','Siemens VersiCharge','Siemens','2026-02-22',1,'fault'),
((SELECT station_id FROM stations WHERE station_code='ST008'),'PL025','Pole 25','Schneider EVlink','Schneider','2026-02-24',2,'available'),
((SELECT station_id FROM stations WHERE station_code='ST009'),'PL026','Pole 26','ABB Terra DC','ABB','2026-02-26',2,'available'),
((SELECT station_id FROM stations WHERE station_code='ST009'),'PL027','Pole 27','Siemens VersiCharge','Siemens','2026-02-28',1,'in_use'),
((SELECT station_id FROM stations WHERE station_code='ST010'),'PL028','Pole 28','Schneider EVlink','Schneider','2026-03-01',2,'inactive'),
((SELECT station_id FROM stations WHERE station_code='ST010'),'PL029','Pole 29','ABB Terra AC','ABB','2026-03-03',2,'available'),
((SELECT station_id FROM stations WHERE station_code='ST010'),'PL030','Pole 30','ABB Terra DC','ABB','2026-03-05',1,'fault');

INSERT INTO charging_sessions (station_id,pole_id,start_time,end_time,energy_kwh,duration_minutes,cost,session_status) VALUES
((SELECT station_id FROM stations WHERE station_code='ST001'),(SELECT pole_id FROM poles WHERE pole_code='PL001'),'2026-04-01 08:00:00','2026-04-01 09:00:00',25.50,60,120000,'completed'),
((SELECT station_id FROM stations WHERE station_code='ST001'),(SELECT pole_id FROM poles WHERE pole_code='PL002'),'2026-04-01 10:00:00',NULL,12.10,25,58000,'ongoing'),
((SELECT station_id FROM stations WHERE station_code='ST001'),(SELECT pole_id FROM poles WHERE pole_code='PL002'),'2026-04-02 14:00:00','2026-04-02 14:45:00',18.40,45,88000,'completed'),
((SELECT station_id FROM stations WHERE station_code='ST001'),(SELECT pole_id FROM poles WHERE pole_code='PL004'),'2026-04-03 09:10:00','2026-04-03 09:20:00',1.90,10,9000,'failed'),
((SELECT station_id FROM stations WHERE station_code='ST002'),(SELECT pole_id FROM poles WHERE pole_code='PL005'),'2026-04-01 07:30:00','2026-04-01 08:25:00',23.20,55,110000,'completed'),
((SELECT station_id FROM stations WHERE station_code='ST002'),(SELECT pole_id FROM poles WHERE pole_code='PL007'),'2026-04-02 18:00:00',NULL,9.50,18,45000,'ongoing'),
((SELECT station_id FROM stations WHERE station_code='ST002'),(SELECT pole_id FROM poles WHERE pole_code='PL005'),'2026-04-04 11:00:00','2026-04-04 11:35:00',14.60,35,69000,'completed'),
((SELECT station_id FROM stations WHERE station_code='ST003'),(SELECT pole_id FROM poles WHERE pole_code='PL008'),'2026-04-01 13:00:00','2026-04-01 13:12:00',2.50,12,12000,'cancelled'),
((SELECT station_id FROM stations WHERE station_code='ST003'),(SELECT pole_id FROM poles WHERE pole_code='PL009'),'2026-04-03 15:15:00','2026-04-03 15:23:00',1.20,8,6000,'failed'),
((SELECT station_id FROM stations WHERE station_code='ST004'),(SELECT pole_id FROM poles WHERE pole_code='PL010'),'2026-04-01 08:45:00','2026-04-01 09:35:00',20.00,50,95000,'completed'),
((SELECT station_id FROM stations WHERE station_code='ST004'),(SELECT pole_id FROM poles WHERE pole_code='PL013'),'2026-04-02 10:20:00','2026-04-02 11:05:00',17.70,45,84000,'completed'),
((SELECT station_id FROM stations WHERE station_code='ST004'),(SELECT pole_id FROM poles WHERE pole_code='PL012'),'2026-04-04 16:00:00','2026-04-04 16:09:00',0.90,9,4000,'failed'),
((SELECT station_id FROM stations WHERE station_code='ST005'),(SELECT pole_id FROM poles WHERE pole_code='PL016'),'2026-04-01 06:30:00','2026-04-01 07:20:00',21.60,50,102000,'completed'),
((SELECT station_id FROM stations WHERE station_code='ST005'),(SELECT pole_id FROM poles WHERE pole_code='PL014'),'2026-04-03 12:00:00','2026-04-03 12:08:00',1.10,8,5000,'failed'),
((SELECT station_id FROM stations WHERE station_code='ST005'),(SELECT pole_id FROM poles WHERE pole_code='PL016'),'2026-04-05 17:30:00',NULL,7.30,15,34000,'ongoing'),
((SELECT station_id FROM stations WHERE station_code='ST006'),(SELECT pole_id FROM poles WHERE pole_code='PL017'),'2026-04-02 07:00:00','2026-04-02 08:02:00',27.40,62,129000,'completed'),
((SELECT station_id FROM stations WHERE station_code='ST006'),(SELECT pole_id FROM poles WHERE pole_code='PL018'),'2026-04-04 09:30:00',NULL,8.60,20,41000,'ongoing'),
((SELECT station_id FROM stations WHERE station_code='ST007'),(SELECT pole_id FROM poles WHERE pole_code='PL019'),'2026-04-01 09:15:00','2026-04-01 10:05:00',19.80,50,94000,'completed'),
((SELECT station_id FROM stations WHERE station_code='ST007'),(SELECT pole_id FROM poles WHERE pole_code='PL020'),'2026-04-01 14:10:00',NULL,10.90,22,52000,'ongoing'),
((SELECT station_id FROM stations WHERE station_code='ST007'),(SELECT pole_id FROM poles WHERE pole_code='PL021'),'2026-04-03 08:40:00','2026-04-03 09:18:00',15.10,38,71000,'completed'),
((SELECT station_id FROM stations WHERE station_code='ST007'),(SELECT pole_id FROM poles WHERE pole_code='PL022'),'2026-04-05 13:50:00','2026-04-05 13:58:00',1.00,8,5000,'failed'),
((SELECT station_id FROM stations WHERE station_code='ST008'),(SELECT pole_id FROM poles WHERE pole_code='PL023'),'2026-04-02 11:10:00','2026-04-02 11:22:00',2.70,12,12000,'cancelled'),
((SELECT station_id FROM stations WHERE station_code='ST008'),(SELECT pole_id FROM poles WHERE pole_code='PL025'),'2026-04-04 15:00:00','2026-04-04 15:48:00',18.90,48,90000,'completed'),
((SELECT station_id FROM stations WHERE station_code='ST008'),(SELECT pole_id FROM poles WHERE pole_code='PL024'),'2026-04-05 10:25:00','2026-04-05 10:33:00',1.30,8,6000,'failed'),
((SELECT station_id FROM stations WHERE station_code='ST009'),(SELECT pole_id FROM poles WHERE pole_code='PL026'),'2026-04-01 07:45:00','2026-04-01 08:35:00',20.50,50,97000,'completed'),
((SELECT station_id FROM stations WHERE station_code='ST009'),(SELECT pole_id FROM poles WHERE pole_code='PL027'),'2026-04-03 17:10:00',NULL,11.20,24,53000,'ongoing'),
((SELECT station_id FROM stations WHERE station_code='ST009'),(SELECT pole_id FROM poles WHERE pole_code='PL026'),'2026-04-05 19:00:00','2026-04-05 19:42:00',16.20,42,76000,'completed'),
((SELECT station_id FROM stations WHERE station_code='ST010'),(SELECT pole_id FROM poles WHERE pole_code='PL028'),'2026-04-02 06:50:00','2026-04-02 07:05:00',3.10,15,14000,'cancelled'),
((SELECT station_id FROM stations WHERE station_code='ST010'),(SELECT pole_id FROM poles WHERE pole_code='PL029'),'2026-04-03 09:00:00','2026-04-03 09:55:00',24.60,55,116000,'completed'),
((SELECT station_id FROM stations WHERE station_code='ST010'),(SELECT pole_id FROM poles WHERE pole_code='PL030'),'2026-04-05 11:40:00','2026-04-05 11:48:00',1.40,8,6000,'failed');

INSERT INTO alerts (station_id,pole_id,alert_type,severity,message,occurred_at,alert_status,note) VALUES
((SELECT station_id FROM stations WHERE station_code='ST001'),NULL,'Connection Lost','critical','Station heartbeat lost for over 5 minutes.','2026-04-06 08:10:00','new','Check gateway connection.'),
((SELECT station_id FROM stations WHERE station_code='ST001'),(SELECT pole_id FROM poles WHERE pole_code='PL004'),'Overheating','high','Pole temperature exceeded threshold.','2026-04-06 09:00:00','acknowledged','Inspect cooling system.'),
((SELECT station_id FROM stations WHERE station_code='ST001'),(SELECT pole_id FROM poles WHERE pole_code='PL002'),'Charging Port Error','medium','Charging interrupted unexpectedly.','2026-04-06 10:20:00','resolved','Port reset completed.'),
((SELECT station_id FROM stations WHERE station_code='ST001'),NULL,'Power Fluctuation','medium','Input voltage unstable.','2026-04-06 11:30:00','new','Monitor incoming power.'),
((SELECT station_id FROM stations WHERE station_code='ST002'),NULL,'Maintenance Reminder','low','Scheduled maintenance due soon.','2026-04-06 08:45:00','resolved','Planned for next week.'),
((SELECT station_id FROM stations WHERE station_code='ST002'),(SELECT pole_id FROM poles WHERE pole_code='PL006'),'Offline Charger','high','Pole not responding to ping.','2026-04-06 12:00:00','new','Check network module.'),
((SELECT station_id FROM stations WHERE station_code='ST002'),(SELECT pole_id FROM poles WHERE pole_code='PL007'),'Session Interrupted','medium','Charging session stopped unexpectedly.','2026-04-06 13:10:00','acknowledged','Review session logs.'),
((SELECT station_id FROM stations WHERE station_code='ST003'),NULL,'Station Inactive','medium','Station is currently inactive.','2026-04-06 07:20:00','resolved','Intentional shutdown.'),
((SELECT station_id FROM stations WHERE station_code='ST003'),(SELECT pole_id FROM poles WHERE pole_code='PL009'),'Hardware Fault','critical','Pole reported internal hardware error.','2026-04-06 14:00:00','new','Requires on-site inspection.'),
((SELECT station_id FROM stations WHERE station_code='ST004'),NULL,'Scheduled Maintenance','low','Station under planned maintenance.','2026-04-06 06:00:00','resolved','Expected completion this evening.'),
((SELECT station_id FROM stations WHERE station_code='ST004'),(SELECT pole_id FROM poles WHERE pole_code='PL012'),'Cooling Fan Failure','high','Cooling fan not operating normally.','2026-04-06 09:50:00','acknowledged','Prepare spare parts.'),
((SELECT station_id FROM stations WHERE station_code='ST004'),(SELECT pole_id FROM poles WHERE pole_code='PL011'),'Offline Charger','medium','Pole is inactive and disconnected.','2026-04-06 10:35:00','new','Verify communication board.'),
((SELECT station_id FROM stations WHERE station_code='ST004'),NULL,'Voltage Drop','medium','Short voltage drop detected.','2026-04-06 15:30:00','resolved','No further action.'),
((SELECT station_id FROM stations WHERE station_code='ST005'),NULL,'Critical Station Error','critical','Station entered error state.','2026-04-06 05:40:00','new','Escalate to supervisor.'),
((SELECT station_id FROM stations WHERE station_code='ST005'),(SELECT pole_id FROM poles WHERE pole_code='PL014'),'Overcurrent','critical','Current exceeded safe threshold.','2026-04-06 08:25:00','acknowledged','Stop using pole immediately.'),
((SELECT station_id FROM stations WHERE station_code='ST005'),(SELECT pole_id FROM poles WHERE pole_code='PL015'),'Inactive Pole','low','Pole intentionally disabled.','2026-04-06 09:40:00','resolved','No issue.'),
((SELECT station_id FROM stations WHERE station_code='ST005'),(SELECT pole_id FROM poles WHERE pole_code='PL016'),'Connector Warning','medium','Connector wear detected.','2026-04-06 16:10:00','new','Schedule replacement.'),
((SELECT station_id FROM stations WHERE station_code='ST006'),(SELECT pole_id FROM poles WHERE pole_code='PL018'),'Active Session Delay','low','Ongoing session longer than average.','2026-04-06 11:15:00','new','Observe charging progress.'),
((SELECT station_id FROM stations WHERE station_code='ST006'),NULL,'Network Latency','medium','Communication delay with central server.','2026-04-06 17:25:00','acknowledged','Investigate ISP stability.'),
((SELECT station_id FROM stations WHERE station_code='ST007'),(SELECT pole_id FROM poles WHERE pole_code='PL020'),'Session Ongoing','low','Pole currently in heavy usage.','2026-04-06 07:50:00','resolved','Informational event.'),
((SELECT station_id FROM stations WHERE station_code='ST007'),(SELECT pole_id FROM poles WHERE pole_code='PL022'),'Pole Fault','high','Pole fault flag active.','2026-04-06 08:55:00','new','Check diagnostics.'),
((SELECT station_id FROM stations WHERE station_code='ST007'),NULL,'Traffic Spike','low','Station usage spike detected.','2026-04-06 12:40:00','acknowledged','Capacity still acceptable.'),
((SELECT station_id FROM stations WHERE station_code='ST007'),(SELECT pole_id FROM poles WHERE pole_code='PL021'),'Communication Warning','medium','Intermittent packet loss.','2026-04-06 18:05:00','new','Observe if recurring.'),
((SELECT station_id FROM stations WHERE station_code='ST008'),NULL,'Station Inactive','medium','Station closed outside operating hours.','2026-04-06 06:10:00','resolved','Normal schedule behavior.'),
((SELECT station_id FROM stations WHERE station_code='ST008'),(SELECT pole_id FROM poles WHERE pole_code='PL024'),'Hardware Fault','high','Pole hardware self-test failed.','2026-04-06 13:45:00','new','Replace faulty module.'),
((SELECT station_id FROM stations WHERE station_code='ST009'),(SELECT pole_id FROM poles WHERE pole_code='PL027'),'Ongoing Session','low','Pole currently charging vehicle.','2026-04-06 10:00:00','resolved','Informational.'),
((SELECT station_id FROM stations WHERE station_code='ST009'),NULL,'Station Alert','medium','Unexpected restart detected.','2026-04-06 11:50:00','acknowledged','Review restart cause.'),
((SELECT station_id FROM stations WHERE station_code='ST009'),(SELECT pole_id FROM poles WHERE pole_code='PL026'),'Connector Check','low','Routine connector inspection recommended.','2026-04-06 19:20:00','new','Add to maintenance list.'),
((SELECT station_id FROM stations WHERE station_code='ST010'),NULL,'Maintenance Mode','low','Station in maintenance mode.','2026-04-06 07:00:00','resolved','Planned action.'),
((SELECT station_id FROM stations WHERE station_code='ST010'),(SELECT pole_id FROM poles WHERE pole_code='PL030'),'Pole Fault','critical','Pole fault after failed session.','2026-04-06 14:25:00','new','Inspect immediately.');
