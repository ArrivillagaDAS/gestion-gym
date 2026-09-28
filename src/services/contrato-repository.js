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
}