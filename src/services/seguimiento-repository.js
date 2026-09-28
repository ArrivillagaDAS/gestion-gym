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
}