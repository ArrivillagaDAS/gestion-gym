import { pool } from "../config/database.js";

export class FinanzasRepository {
  async crear(movimiento, conexion = pool) {
    const [resultado] = await conexion.query(
      `INSERT INTO movimientos
       (tipo, categoria, monto, fecha, descripcion, cliente_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        movimiento.tipo,
        movimiento.categoria,
        movimiento.monto,
        movimiento.fecha,
        movimiento.descripcion,
        movimiento.cliente_id ?? null,
      ]
    );

    return resultado.insertId;
  }

  async listarPorRango(desde, hasta, clienteId = null, conexion = pool) {
    let sql = `
      SELECT
        id,
        tipo,
        categoria,
        monto,
        DATE_FORMAT(fecha, '%Y-%m-%d') AS fecha,
        descripcion,
        cliente_id
      FROM movimientos
      WHERE fecha BETWEEN ? AND ?
    `;

    const parametros = [desde, hasta];

    if (clienteId !== null) {
      sql += " AND cliente_id = ?";
      parametros.push(clienteId);
    }

    sql += " ORDER BY fecha ASC, id ASC";

    const [filas] = await conexion.query(sql, parametros);

    return filas;
  }

  async balancePorRango(desde, hasta, conexion = pool) {
    const [filas] = await conexion.query(
      `SELECT
         COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END), 0) AS ingresos,
         COALESCE(SUM(CASE WHEN tipo = 'egreso' THEN monto ELSE 0 END), 0) AS egresos
       FROM movimientos
       WHERE fecha BETWEEN ? AND ?`,
      [desde, hasta]
    );

    return filas[0];
  }

  async balancePorCliente(clienteId, desde, hasta, conexion = pool) {
    const [filas] = await conexion.query(
      `SELECT
         COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END), 0) AS ingresos,
         COALESCE(SUM(CASE WHEN tipo = 'egreso' THEN monto ELSE 0 END), 0) AS egresos
       FROM movimientos
       WHERE cliente_id = ?
         AND fecha BETWEEN ? AND ?`,
      [clienteId, desde, hasta]
    );

    return filas[0];
  }
}