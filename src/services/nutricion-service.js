import dayjs from "dayjs";
import { pool } from "../config/database.js";
import { fechaExiste } from "../utils/fechas.js";
import { PlanAlimentacion } from "../models/plan-alimentacion.js";
import { AlimentoDia } from "../models/alimento-dia.js";
import { ContratoRepository } from "./contrato-repository.js";
import { NutricionRepository } from "./nutricion-repository.js";

export class NutricionService {
  constructor() {
    this.nutricion = new NutricionRepository();
    this.contratos = new ContratoRepository();
  }

  async crearPlan(datos) {
    const plan = new PlanAlimentacion(datos);
    const errores = [...plan.errores];

    // el modelo ya comprobo que las fechas existen y tienen formato AAAA-MM-DD
    if (errores.length === 0 && plan.fecha_fin !== undefined && plan.fecha_fin < plan.fecha_inicio) {
      errores.push("La fecha de fin no puede ser anterior a la fecha de inicio.");
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
    // el modelo valida la fecha, las calorias enteras y el largo del nombre del alimento
    const alimento = new AlimentoDia(datos);

    if (!alimento.esValido()) {
      return { exito: false, errores: alimento.errores };
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

  // solo lee, no modifica nada: no necesita transaccion
  // el promedio se calcula sobre los dias que tienen alimentos registrados
  async reporteSemanal(clienteId, inicio) {
    if (!fechaExiste(inicio)) {
      return { exito: false, errores: ["La fecha de inicio de semana no es válida (usa AAAA-MM-DD)."] };
    }

    const fin = dayjs(inicio).add(6, "day").format("YYYY-MM-DD");
    const filas = await this.nutricion.listarAlimentosPorRango(clienteId, inicio, fin);

    const dias = [];
    for (let i = 0; i < 7; i++) {
      const fecha = dayjs(inicio).add(i, "day").format("YYYY-MM-DD");
      const alimentos = filas
        .filter((fila) => fila.fecha === fecha)
        .map((fila) => ({ ...fila, calorias: Number(fila.calorias) }));
      const calorias = alimentos.reduce((suma, a) => suma + a.calorias, 0);
      dias.push({ fecha, alimentos, calorias });
    }

    const total = dias.reduce((suma, d) => suma + d.calorias, 0);
    const diasConRegistros = dias.filter((d) => d.alimentos.length > 0).length;
    const promedio = diasConRegistros > 0 ? total / diasConRegistros : 0;

    return { exito: true, inicio, fin, dias, total, diasConRegistros, promedio };
  }
}