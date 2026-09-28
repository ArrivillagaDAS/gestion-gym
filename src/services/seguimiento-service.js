import dayjs from "dayjs";
import { pool } from "../config/database.js";
import { Seguimiento } from "../models/seguimiento.js";
import { ContratoRepository } from "./contrato-repository.js";
import { SeguimientoRepository } from "./seguimiento-repository.js";

export class SeguimientoService {
  constructor() {
    this.seguimientos = new SeguimientoRepository();
    this.contratos = new ContratoRepository();
  }

  async registrar(datos) {
    const seguimiento = new Seguimiento(datos);
    const errores = [...seguimiento.errores];

    if (errores.length === 0) {
      const fecha = dayjs(seguimiento.fecha);
      if (fecha.format("YYYY-MM-DD") !== seguimiento.fecha) {
        errores.push("La fecha no existe en el calendario.");
      } else if (fecha.isAfter(dayjs(), "day")) {
        errores.push("La fecha no puede ser futura.");
      }

      const hayDatos = ["peso", "grasa_corporal", "medidas", "foto", "comentarios"].some(
        (campo) => seguimiento[campo] !== undefined
      );
      if (!hayDatos) {
        errores.push("Registra al menos un dato del avance (peso, grasa, medidas, foto o comentarios).");
      }
    }

    if (errores.length > 0) {
      return { exito: false, errores };
    }

    const conexion = await pool.getConnection();

    try {
      // accion critica: verificar el contrato y guardar el avance ocurren juntos o no ocurren
      await conexion.beginTransaction();

      // el bloqueo evita que el contrato se cancele o finalice mientras se registra el avance
      const contrato = await this.contratos.bloquearPorId(seguimiento.contrato_id, conexion);
      if (!contrato) {
        await conexion.rollback();
        return { exito: false, errores: ["El contrato no existe."] };
      }

      // regla de negocio: solo se registran avances en contratos activos
      if (contrato.estado !== "activo") {
        await conexion.rollback();
        return { exito: false, errores: [`El contrato está ${contrato.estado}, no admite nuevos avances.`] };
      }

      const repetido = await this.seguimientos.existeEnFecha(seguimiento.contrato_id, seguimiento.fecha, conexion);
      if (repetido) {
        await conexion.rollback();
        return { exito: false, errores: ["Ya existe un avance de este contrato en esa fecha."] };
      }

      const id = await this.seguimientos.crear(seguimiento, conexion);

      await conexion.commit();
      return { exito: true, id, seguimiento };
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