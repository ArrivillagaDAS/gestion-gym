import { pool } from "../config/database.js";

export class FinanzasRepository {
  async crear(movimiento, conexion = pool) {
    const [resultado] = await conexion.query(
      `INSERT INTO movimientos_financieros
        (cliente_id, tipo, categoria, descripcion, monto, fecha)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        movimiento.cliente_id ?? null,
        movimiento.tipo,
        movimiento.categoria,
        movimiento.descripcion,
        movimiento.monto,
        movimiento.fecha,
      ]
    );

    return resultado.insertId;
  }

  async listarPorRango(
    desde,
    hasta,
    clienteId = null,
    conexion = pool
  ) {
    let sql = `
      SELECT
        mf.id,
        mf.cliente_id,
        mf.tipo,
        mf.categoria,
        mf.descripcion,
        mf.monto,
        DATE_FORMAT(mf.fecha, '%Y-%m-%d') AS fecha,
        CONCAT(c.nombre, ' ', c.apellido) AS cliente_nombre
      FROM movimientos_financieros mf
      LEFT JOIN clientes c ON c.id = mf.cliente_id
      WHERE mf.fecha BETWEEN ? AND ?
    `;

    const parametros = [desde, hasta];

    if (clienteId !== null) {
      sql += ` AND mf.cliente_id = ?`;
      parametros.push(clienteId);
    }

    sql += `
      ORDER BY mf.fecha ASC, mf.id ASC
    `;

    const [filas] = await conexion.query(sql, parametros);

    return filas;
  }

  async balancePorRango(desde, hasta, conexion = pool) {
    const [filas] = await conexion.query(
      `
      SELECT
        COALESCE(
          SUM(
            CASE
              WHEN tipo = 'ingreso' THEN monto
              ELSE 0
            END
          ),
          0
        ) AS ingresos,

        COALESCE(
          SUM(
            CASE
              WHEN tipo = 'egreso' THEN monto
              ELSE 0
            END
          ),
          0
        ) AS egresos
      FROM movimientos_financieros
      WHERE fecha BETWEEN ? AND ?
      `,
      [desde, hasta]
    );

    return filas[0];
  }

  async balancePorCliente(
    clienteId,
    desde,
    hasta,
    conexion = pool
  ) {
    const [filas] = await conexion.query(
      `
      SELECT
        COALESCE(
          SUM(
            CASE
              WHEN tipo = 'ingreso' THEN monto
              ELSE 0
            END
          ),
          0
        ) AS ingresos,

        COALESCE(
          SUM(
            CASE
              WHEN tipo = 'egreso' THEN monto
              ELSE 0
            END
          ),
          0
        ) AS egresos
      FROM movimientos_financieros
      WHERE cliente_id = ?
        AND fecha BETWEEN ? AND ?
      `,
      [clienteId, desde, hasta]
    );

    return filas[0];
  }
}