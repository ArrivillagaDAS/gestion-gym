import { pool } from "../config/database.js";

export class PlanRepository {
  async crear(plan) {
    const [resultado] = await pool.query(
      `INSERT INTO planes (nombre, duracion_semanas, metas_fisicas, nivel, precio)
       VALUES (?, ?, ?, ?, ?)`,
      [plan.nombre, plan.duracion_semanas, plan.metas_fisicas, plan.nivel, plan.precio]
    );
    return resultado.insertId;
  }

  async listarTodos() {
    const [filas] = await pool.query("SELECT * FROM planes");
    return filas;
  }

  async buscarPorId(id) {
    const [filas] = await pool.query("SELECT * FROM planes WHERE id = ?", [id]);
    return filas[0] || null;
  }
}