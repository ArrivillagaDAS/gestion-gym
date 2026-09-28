import { pool } from "../config/database.js";

export class ContratoRepository {
  async bloquearCliente(clienteId, conexion) {
    const [filas] = await conexion.query(
      "SELECT id FROM clientes WHERE id = ? FOR UPDATE",
      [clienteId]
    );
    return filas.length > 0;
  }

  async buscarActivo(clienteId, planId, conexion) {
    const [filas] = await conexion.query(
      "SELECT id FROM contratos WHERE cliente_id = ? AND plan_id = ? AND estado = 'activo'",
      [clienteId, planId]
    );
    return filas[0] || null;
  }

  async crear(contrato, conexion) {
    const [resultado] = await conexion.query(
      `INSERT INTO contratos (cliente_id, plan_id, condiciones, precio, fecha_inicio, fecha_fin, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        contrato.cliente_id,
        contrato.plan_id,
        contrato.condiciones,
        contrato.precio,
        contrato.fecha_inicio,
        contrato.fecha_fin,
        contrato.estado,
      ]
    );
    return resultado.insertId;
  }

  async listarPorCliente(clienteId, conexion = pool) {
    const [filas] = await conexion.query(
      `SELECT c.id, c.condiciones, c.precio, c.fecha_inicio, c.fecha_fin, c.estado,
              p.nombre AS plan_nombre
       FROM contratos c
       JOIN planes p ON p.id = c.plan_id
       WHERE c.cliente_id = ?
       ORDER BY c.fecha_inicio DESC, c.id DESC`,
      [clienteId]
    );
    return filas;
  }

  // bloquea la fila del contrato hasta que termine la transaccion
  // las fechas salen ya como texto YYYY-MM-DD para evitar problemas de zona horaria
  async bloquearPorId(id, conexion) {
    const [filas] = await conexion.query(
      `SELECT id, cliente_id, plan_id, estado,
              DATE_FORMAT(fecha_fin, '%Y-%m-%d') AS fecha_fin
       FROM contratos WHERE id = ? FOR UPDATE`,
      [id]
    );
    return filas[0] || null;
  }

  // cambia el estado solo si el contrato todavia esta en el estado esperado
  async cambiarEstado(id, estadoNuevo, estadoEsperado, conexion = pool) {
    const [resultado] = await conexion.query(
      "UPDATE contratos SET estado = ? WHERE id = ? AND estado = ?",
      [estadoNuevo, id, estadoEsperado]
    );
    return resultado.affectedRows > 0;
  }
}