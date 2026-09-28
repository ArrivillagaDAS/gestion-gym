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

  // todos los planes de alimentacion de un cliente, del mas reciente al mas antiguo
  // trae el estado del contrato para saber en cuales se pueden registrar alimentos
  // las fechas salen como texto YYYY-MM-DD para evitar problemas de zona horaria
  async listarPlanesPorCliente(clienteId, conexion = pool) {
    const [filas] = await conexion.query(
      `SELECT pa.id, pa.contrato_id, pa.nombre,
              DATE_FORMAT(pa.fecha_inicio, '%Y-%m-%d') AS fecha_inicio,
              DATE_FORMAT(pa.fecha_fin, '%Y-%m-%d') AS fecha_fin,
              c.estado AS contrato_estado, p.nombre AS plan_nombre
       FROM planes_alimentacion pa
       JOIN contratos c ON c.id = pa.contrato_id
       JOIN planes p ON p.id = c.plan_id
       WHERE c.cliente_id = ?
       ORDER BY pa.fecha_inicio DESC, pa.id DESC`,
      [clienteId]
    );
    return filas;
  }

  async buscarPlanPorId(id, conexion = pool) {
    const [filas] = await conexion.query(
      `SELECT id, contrato_id,
              DATE_FORMAT(fecha_inicio, '%Y-%m-%d') AS fecha_inicio,
              DATE_FORMAT(fecha_fin, '%Y-%m-%d') AS fecha_fin
       FROM planes_alimentacion WHERE id = ?`,
      [id]
    );
    return filas[0] || null;
  }

  async crearAlimento(alimento, conexion = pool) {
    const [resultado] = await conexion.query(
      `INSERT INTO alimentos_dia (plan_alimentacion_id, fecha, comida, alimento, calorias)
       VALUES (?, ?, ?, ?, ?)`,
      [alimento.plan_alimentacion_id, alimento.fecha, alimento.comida, alimento.alimento, alimento.calorias]
    );
    return resultado.insertId;
  }

  // todos los alimentos de un cliente entre dos fechas (incluidas), en orden cronologico
  // suma los planes de alimentacion de todos sus contratos, activos o no: es una consulta de lectura
  async listarAlimentosPorRango(clienteId, desde, hasta, conexion = pool) {
    const [filas] = await conexion.query(
      `SELECT a.id, DATE_FORMAT(a.fecha, '%Y-%m-%d') AS fecha, a.comida, a.alimento, a.calorias
       FROM alimentos_dia a
       JOIN planes_alimentacion pa ON pa.id = a.plan_alimentacion_id
       JOIN contratos c ON c.id = pa.contrato_id
       WHERE c.cliente_id = ? AND a.fecha BETWEEN ? AND ?
       ORDER BY a.fecha ASC, a.id ASC`,
      [clienteId, desde, hasta]
    );
    return filas;
  }
}