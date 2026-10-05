import dayjs from "dayjs";
import { Seguimiento } from "../models/seguimiento.js";

export class SeguimientoService {
  constructor({ seguimientos, contratos, ejecutarTransaccion }) {
    this.seguimientos = seguimientos;
    this.contratos = contratos;
    this.ejecutarTransaccion = ejecutarTransaccion;
  }

  async registrar(datos) {
    const seguimiento = new Seguimiento(datos);
    const errores = [...seguimiento.errores];

    if (errores.length === 0) {
      // el modelo ya comprobo que la fecha existe en el calendario
      if (dayjs(seguimiento.fecha).isAfter(dayjs(), "day")) {
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

    return this.ejecutarTransaccion(async (conexion) => {
      // accion critica: verificar el contrato y guardar el avance ocurren juntos o no ocurren
      // el bloqueo evita que el contrato se cancele o finalice mientras se registra el avance
      const contrato = await this.contratos.bloquearPorId(seguimiento.contrato_id, conexion);
      if (!contrato) {
        return { exito: false, errores: ["El contrato no existe."] };
      }

      // regla de negocio: solo se registran avances en contratos activos
      if (contrato.estado !== "activo") {
        return { exito: false, errores: [`El contrato está ${contrato.estado}, no admite nuevos avances.`] };
      }

      const repetido = await this.seguimientos.existeEnFecha(seguimiento.contrato_id, seguimiento.fecha, conexion);
      if (repetido) {
        return { exito: false, errores: ["Ya existe un avance de este contrato en esa fecha."] };
      }

      const id = await this.seguimientos.crear(seguimiento, conexion);

      return { exito: true, id, seguimiento };
    });
  }

  // solo lee, no modifica nada: no necesita transaccion
  async progresoPorCliente(clienteId) {
    const filas = await this.seguimientos.listarPorCliente(clienteId);
    let pesoAnterior = null;

    return filas.map((fila) => {
      const peso = fila.peso === null ? null : Number(fila.peso);
      const grasa = fila.grasa_corporal === null ? null : Number(fila.grasa_corporal);

      // variacion respecto al registro anterior que tenga peso
      let variacion = null;
      if (peso !== null && pesoAnterior !== null) {
        variacion = peso - pesoAnterior;
      }
      if (peso !== null) {
        pesoAnterior = peso;
      }

      return { ...fila, peso, grasa_corporal: grasa, variacion_peso: variacion };
    });
  }

  async eliminar(seguimientoId) {
    return this.ejecutarTransaccion(async (conexion) => {
      // accion critica: verificar el estado del contrato y borrar el avance ocurren juntos o no ocurren
      const registro = await this.seguimientos.buscarPorId(seguimientoId, conexion);
      if (!registro) {
        return { exito: false, errores: ["El registro de avance no existe."] };
      }

      // el bloqueo evita que el contrato se cancele o finalice mientras se borra el avance
      const contrato = await this.contratos.bloquearPorId(registro.contrato_id, conexion);

      // regla de consistencia: el seguimiento de un contrato cerrado es historial y no se toca
      if (!contrato || contrato.estado !== "activo") {
        return {
          exito: false,
          errores: ["El registro pertenece a un contrato que no está activo: es historial y no se puede eliminar."],
        };
      }

      const eliminado = await this.seguimientos.eliminar(seguimientoId, conexion);
      if (!eliminado) {
        return { exito: false, errores: ["El registro ya no existe."] };
      }

      return { exito: true };
    });
  }
}