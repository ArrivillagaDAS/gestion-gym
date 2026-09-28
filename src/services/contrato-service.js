import { pool } from "../config/database.js";
import { ContratoFactory } from "./contrato-factory.js";
import { ContratoRepository } from "./contrato-repository.js";
import { PlanRepository } from "./plan-repository.js";

export class ContratoService {
  constructor() {
    this.contratos = new ContratoRepository();
    this.planes = new PlanRepository();
  }

  async asignarPlan(clienteId, planId, opciones = {}) {
    const plan = await this.planes.buscarPorId(planId);
    if (!plan) {
      return { exito: false, errores: ["El plan no existe."] };
    }

    // el contrato se genera automaticamente con la factory
    const contrato = ContratoFactory.crearDesdePlan(clienteId, plan, opciones);
    if (!contrato.esValido()) {
      return { exito: false, errores: contrato.errores };
    }

    const conexion = await pool.getConnection();

    try {
      // accion critica: verificar y crear el contrato ocurren juntos o no ocurren
      await conexion.beginTransaction();

      // el bloqueo evita que dos asignaciones del mismo cliente se crucen
      const existe = await this.contratos.bloquearCliente(clienteId, conexion);
      if (!existe) {
        await conexion.rollback();
        return { exito: false, errores: ["El cliente no existe."] };
      }

      const activo = await this.contratos.buscarActivo(clienteId, planId, conexion);
      if (activo) {
        await conexion.rollback();
        return {
          exito: false,
          errores: ["El cliente ya tiene un contrato activo con este plan."],
        };
      }

      const id = await this.contratos.crear(contrato, conexion);

      await conexion.commit();
      return { exito: true, id, contrato };
    } catch (error) {
      // cualquier falla deshace todo lo hecho dentro de la transaccion
      await conexion.rollback();
      throw error;
    } finally {
      // la conexion siempre se devuelve al pool
      conexion.release();
    }
  }
}