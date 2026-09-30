import mysql from "mysql2/promise";
import dotenv from "dotenv";

// quiet evita que dotenv escriba su mensaje informativo en la consola del menu
dotenv.config({ quiet: true });

export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});