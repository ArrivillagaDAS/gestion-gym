import { pool } from "../config/database.js";

export class NutricionRepository {
  // un plan esta vigente si no tiene fecha de fin o si esa fecha todavia no paso
  async buscarVigente(contratoId, hoy, conexion = pool) {
    const [filas] = await conexion.query(
      `SELECT id FROM planes_alimentacion
       WHERE contrato_id = ? AND (fecha_fin IS NULL OR fecha_fin >= ?)`,
      [contratoId, hoy]
    );
    return filas[0] || null;
  }

  async crearPlan(plan, conexion = pool) {
    const [resultado] = await conexion.query(
      `INSERT INTO planes_alimentacion (contrato_id, nombre, fecha_inicio, fecha_fin)
       VALUES (?, ?, ?, ?)`,
      [plan.contrato_id, plan.nombre, plan.fecha_inicio, plan.fecha_fin ?? null]
    );
    return resultado.insertId;
  }
}