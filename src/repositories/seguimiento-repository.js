export class SeguimientoRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async existeEnFecha(contratoId, fecha, conexion = this.pool) {
    const [filas] = await conexion.query(
      "SELECT id FROM seguimientos WHERE contrato_id = ? AND fecha = ?",
      [contratoId, fecha]
    );
    return filas.length > 0;
  }

  async crear(seguimiento, conexion = this.pool) {
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
  async listarPorCliente(clienteId, conexion = this.pool) {
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

  async buscarPorId(id, conexion = this.pool) {
    const [filas] = await conexion.query(
      "SELECT id, contrato_id FROM seguimientos WHERE id = ?",
      [id]
    );
    return filas[0] || null;
  }

  // devuelve true si realmente se borro una fila
  async eliminar(id, conexion = this.pool) {
    const [resultado] = await conexion.query(
      "DELETE FROM seguimientos WHERE id = ?",
      [id]
    );
    return resultado.affectedRows > 0;
  }

  async contarPorContrato(contratoId, conexion = this.pool) {
    const [filas] = await conexion.query(
      "SELECT COUNT(*) AS total FROM seguimientos WHERE contrato_id = ?",
      [contratoId]
    );
    return Number(filas[0].total);
  }

  // devuelve cuantos registros de seguimiento se borraron
  async eliminarPorContrato(contratoId, conexion = this.pool) {
    const [resultado] = await conexion.query(
      "DELETE FROM seguimientos WHERE contrato_id = ?",
      [contratoId]
    );
    return resultado.affectedRows;
  }
}