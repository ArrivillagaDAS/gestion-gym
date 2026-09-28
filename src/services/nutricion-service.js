import dayjs from "dayjs";
import { pool } from "../config/database.js";
import { PlanAlimentacion } from "../models/plan-alimentacion.js";
import { AlimentoDia } from "../models/alimento-dia.js";
import { ContratoRepository } from "./contrato-repository.js";
import { NutricionRepository } from "./nutricion-repository.js";

// una fecha es real si al leerla y volver a escribirla queda igual (2026-02-31 no pasa)
function fechaExiste(texto) {
  return dayjs(texto).format("YYYY-MM-DD") === texto;
}

export class NutricionService {
  constructor() {
    this.nutricion = new NutricionRepository();
    this.contratos = new ContratoRepository();
  }

  async crearPlan(datos) {
    const plan = new PlanAlimentacion(datos);
    const errores = [...plan.errores];

    if (errores.length === 0) {
      if (plan.nombre.length > 100) {
        errores.push("El nombre del plan no puede superar 100 caracteres.");
      }

      const inicioValido = fechaExiste(plan.fecha_inicio);
      if (!inicioValido) {
        errores.push("La fecha de inicio no existe en el calendario.");
      }

      if (plan.fecha_fin !== undefined) {
        if (!fechaExiste(plan.fecha_fin)) {
          errores.push("La fecha de fin no existe en el calendario.");
        } else if (inicioValido && plan.fecha_fin < plan.fecha_inicio) {
          errores.push("La fecha de fin no puede ser anterior a la fecha de inicio.");
        }
      }
    }

    if (errores.length > 0) {
      return { exito: false, errores };
    }

    const conexion = await pool.getConnection();

    try {
      // accion critica: verificar el contrato y guardar el plan ocurren juntos o no ocurren
      await conexion.beginTransaction();

      // el bloqueo evita que el contrato se cancele o finalice mientras se crea el plan
      // y evita que dos creaciones simultaneas dejen dos planes vigentes
      const contrato = await this.contratos.bloquearPorId(plan.contrato_id, conexion);
      if (!contrato) {
        await conexion.rollback();
        return { exito: false, errores: ["El contrato no existe."] };
      }

      // regla de negocio: solo se crean planes de alimentacion en contratos activos
      if (contrato.estado !== "activo") {
        await conexion.rollback();
        return { exito: false, errores: [`El contrato está ${contrato.estado}, no admite nuevos planes de alimentación.`] };
      }

      // el plan de alimentacion debe caber dentro de la vigencia del contrato
      if (plan.fecha_inicio > contrato.fecha_fin || (plan.fecha_fin !== undefined && plan.fecha_fin > contrato.fecha_fin)) {
        await conexion.rollback();
        return {
          exito: false,
          errores: [`El plan de alimentación debe estar dentro de la vigencia del contrato (hasta ${contrato.fecha_fin}).`],
        };
      }

      // regla de negocio: un contrato no tiene dos planes de alimentacion vigentes a la vez
      const hoy = dayjs().format("YYYY-MM-DD");
      const vigente = await this.nutricion.buscarVigente(plan.contrato_id, hoy, conexion);
      if (vigente) {
        await conexion.rollback();
        return { exito: false, errores: ["El contrato ya tiene un plan de alimentación vigente."] };
      }

      const id = await this.nutricion.crearPlan(plan, conexion);

      await conexion.commit();
      return { exito: true, id, plan };
    } catch (error) {
      // cualquier falla deshace todo lo hecho dentro de la transaccion
      await conexion.rollback();
      throw error;
    } finally {
      // la conexion siempre se devuelve al pool
      conexion.release();
    }
  }

  // solo lee, no modifica nada: no necesita transaccion
  async listarPlanesPorCliente(clienteId) {
    return this.nutricion.listarPlanesPorCliente(clienteId);
  }

  async registrarAlimento(datos) {
    const alimento = new AlimentoDia(datos);
    const errores = [...alimento.errores];

    if (errores.length === 0) {
      if (!fechaExiste(alimento.fecha)) {
        errores.push("La fecha no existe en el calendario.");
      }
      if (!Number.isInteger(alimento.calorias)) {
        errores.push("Las calorías deben ser un número entero.");
      }
      if (alimento.alimento.length > 150) {
        errores.push("El nombre del alimento no puede superar 150 caracteres.");
      }
    }

    if (errores.length > 0) {
      return { exito: false, errores };
    }

    const conexion = await pool.getConnection();

    try {
      // accion critica: verificar el contrato y guardar el alimento ocurren juntos o no ocurren
      await conexion.beginTransaction();

      const plan = await this.nutricion.buscarPlanPorId(alimento.plan_alimentacion_id, conexion);
      if (!plan) {
        await conexion.rollback();
        return { exito: false, errores: ["El plan de alimentación no existe."] };
      }

      // el bloqueo evita que el contrato se cancele o finalice mientras se registra el alimento
      const contrato = await this.contratos.bloquearPorId(plan.contrato_id, conexion);

      // regla de negocio: solo se registran alimentos en planes de contratos activos
      if (!contrato || contrato.estado !== "activo") {
        await conexion.rollback();
        return {
          exito: false,
          errores: ["El plan pertenece a un contrato que no está activo: es historial y no admite nuevos alimentos."],
        };
      }

      // el dia debe caer dentro del plan de alimentacion y dentro del contrato
      const fueraDelPlan =
        alimento.fecha < plan.fecha_inicio ||
        (plan.fecha_fin !== null && alimento.fecha > plan.fecha_fin) ||
        alimento.fecha > contrato.fecha_fin;
      if (fueraDelPlan) {
        await conexion.rollback();
        const hasta = plan.fecha_fin !== null && plan.fecha_fin < contrato.fecha_fin ? plan.fecha_fin : contrato.fecha_fin;
        return {
          exito: false,
          errores: [`La fecha debe estar dentro del plan de alimentación (${plan.fecha_inicio} a ${hasta}).`],
        };
      }

      const id = await this.nutricion.crearAlimento(alimento, conexion);

      await conexion.commit();
      return { exito: true, id, alimento };
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