-- Fix corrupted Chinese data
-- Data was stored as UTF-8 bytes but interpreted as latin1

USE salary_system;

-- Fix users table
UPDATE users SET 
  name = CONVERT(BINARY CONVERT(name USING latin1) USING utf8mb4),
  department = CONVERT(BINARY CONVERT(department USING latin1) USING utf8mb4)
WHERE name != CONVERT(BINARY CONVERT(name USING latin1) USING utf8mb4);

-- Fix operation_logs table
UPDATE operation_logs SET 
  operation_content = CONVERT(BINARY CONVERT(operation_content USING latin1) USING utf8mb4)
WHERE operation_content IS NOT NULL 
  AND operation_content != CONVERT(BINARY CONVERT(operation_content USING latin1) USING utf8mb4);

-- Verify the fix
SELECT employee_no, name, department FROM users LIMIT 5;
