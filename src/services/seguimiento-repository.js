import { pool } from "../config/database.js";

export class SeguimientoRepository {
  async existeEnFecha(contratoId, fecha, conexion = pool) {
    const [filas] = await conexion.query(
      "SELECT id FROM seguimientos WHERE contrato_id = ? AND fecha = ?",
      [contratoId, fecha]
    );
    return filas.length > 0;
  }

  async crear(seguimiento, conexion = pool) {
    const [resultado] = await conexion.query(
      `INSERT INTO seguimientos (contrato_id, fecha, peso, grasa_corporal, medidas, foto, comentarios)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        seguimiento.contrato_id,
        seguimiento.fecha,
        seguimiento.peso ?? null,
        seguimiento.grasa_corporal ?? null,
        seguimiento.medidas ?? null,
        seguimiento.foto ?? null,
        seguimiento.comentarios ?? null,
      ]
    );
    return resultado.insertId;
  }

  // todos los avances de un cliente, del mas antiguo al mas reciente
  // la fecha sale como texto YYYY-MM-DD para evitar problemas de zona horaria
  async listarPorCliente(clienteId, conexion = pool) {
    const [filas] = await conexion.query(
      `SELECT s.id, s.contrato_id, DATE_FORMAT(s.fecha, '%Y-%m-%d') AS fecha,
              s.peso, s.grasa_corporal, s.medidas, s.foto, s.comentarios,
              c.estado AS contrato_estado, p.nombre AS plan_nombre
       FROM seguimientos s
       JOIN contratos c ON c.id = s.contrato_id
       JOIN planes p ON p.id = c.plan_id
       WHERE c.cliente_id = ?
       ORDER BY s.fecha ASC, s.id ASC`,
      [clienteId]
    );
    return filas;
  }
}