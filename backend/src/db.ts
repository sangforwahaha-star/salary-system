import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'salary2024',
  database: process.env.DB_NAME || 'salary_system',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  timezone: '+08:00'
});

export default pool;
