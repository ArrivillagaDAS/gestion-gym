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

  async listarPorCliente(clienteId) {
    return this.contratos.listarPorCliente(clienteId);
  }

  async renovar(contratoId) {
    const conexion = await pool.getConnection();

    try {
      // accion critica: cerrar el contrato viejo y crear el nuevo ocurren juntos o no ocurren
      await conexion.beginTransaction();

      // el bloqueo evita que dos renovaciones del mismo contrato se crucen
      const actual = await this.contratos.bloquearPorId(contratoId, conexion);
      if (!actual) {
        await conexion.rollback();
        return { exito: false, errores: ["El contrato no existe."] };
      }

      // regla de negocio: solo se renueva un contrato activo
      if (actual.estado !== "activo") {
        await conexion.rollback();
        return { exito: false, errores: [`El contrato está ${actual.estado}, no se puede renovar.`] };
      }

      const plan = await this.planes.buscarPorId(actual.plan_id);
      if (!plan) {
        await conexion.rollback();
        return { exito: false, errores: ["El plan del contrato ya no existe."] };
      }

      // el contrato nuevo empieza donde termina el anterior
      const nuevo = ContratoFactory.crearDesdePlan(actual.cliente_id, plan, {
        fecha_inicio: actual.fecha_fin,
        condiciones: `Renovación del contrato #${actual.id} (plan "${plan.nombre}", ${plan.duracion_semanas} semanas).`,
      });
      if (!nuevo.esValido()) {
        await conexion.rollback();
        return { exito: false, errores: nuevo.errores };
      }

      // primero se cierra el viejo, para que no choque con la regla de contrato activo repetido
      const cerrado = await this.contratos.cambiarEstado(actual.id, "finalizado", "activo", conexion);
      if (!cerrado) {
        await conexion.rollback();
        return { exito: false, errores: ["El contrato cambió de estado, intenta de nuevo."] };
      }

      const id = await this.contratos.crear(nuevo, conexion);

      await conexion.commit();
      return { exito: true, id, contrato: nuevo };
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