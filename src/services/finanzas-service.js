import dayjs from "dayjs";
import { pool } from "../config/database.js";

import {
  MovimientoFinanciero,
  CATEGORIAS_INGRESO,
  CATEGORIAS_EGRESO,
} from "../models/movimiento-financiero.js";

import { FinanzasRepository } from "./finanzas-repository.js";
import { ContratoRepository } from "./contrato-repository.js";

function fechaExiste(texto) {
  return dayjs(texto).format("YYYY-MM-DD") === texto;
}

function validarRango(desde, hasta) {
  const errores = [];

  if (!/^\d{4}-\d{2}-\d{2}$/.test(desde) || !fechaExiste(desde)) {
    errores.push("La fecha inicial no existe en el calendario.");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(hasta) || !fechaExiste(hasta)) {
    errores.push("La fecha final no existe en el calendario.");
  }

  if (errores.length === 0 && hasta < desde) {
    errores.push(
      "La fecha final no puede ser anterior a la fecha inicial."
    );
  }

  return errores;
}

export class FinanzasService {
  constructor() {
    this.finanzas = new FinanzasRepository();
    this.contratos = new ContratoRepository();
  }

  async registrar(datos) {
    const movimiento = new MovimientoFinanciero(datos);
    const errores = [...movimiento.errores];

    if (errores.length === 0) {
      if (movimiento.descripcion.length > 500) {
        errores.push(
          "La descripción no puede superar 500 caracteres."
        );
      }

      if (!Number.isInteger(movimiento.monto * 100)) {
        errores.push(
          "El monto debe tener como máximo dos decimales."
        );
      }

      if (!fechaExiste(movimiento.fecha)) {
        errores.push(
          "La fecha no existe en el calendario."
        );
      }

      if (
        movimiento.tipo === "ingreso" &&
        !CATEGORIAS_INGRESO.includes(movimiento.categoria)
      ) {
        errores.push(
          "La categoría seleccionada no corresponde a un ingreso."
        );
      }

      if (
        movimiento.tipo === "egreso" &&
        !CATEGORIAS_EGRESO.includes(movimiento.categoria)
      ) {
        errores.push(
          "La categoría seleccionada no corresponde a un egreso."
        );
      }

      if (
        movimiento.tipo === "ingreso" &&
        !movimiento.cliente_id
      ) {
        errores.push(
          "Los ingresos deben estar asociados a un cliente."
        );
      }
    }

    if (errores.length > 0) {
      return {
        exito: false,
        errores,
      };
    }

    const conexion = await pool.getConnection();

    try {
      await conexion.beginTransaction();

      const id = await this.finanzas.crear(
        movimiento,
        conexion
      );

      await conexion.commit();

      return {
        exito: true,
        id,
        movimiento,
      };
    } catch (error) {
      await conexion.rollback();
      throw error;
    } finally {
      conexion.release();
    }
  }

  async registrarPagoMensualidad(
    contratoId,
    fecha,
    descripcion
  ) {
    const errores = [];

    if (!fechaExiste(fecha)) {
      errores.push(
        "La fecha del pago no existe en el calendario."
      );
    }

    if (!descripcion || descripcion.trim() === "") {
      errores.push(
        "La descripción del pago es obligatoria."
      );
    }

    if (errores.length > 0) {
      return {
        exito: false,
        errores,
      };
    }

    const conexion = await pool.getConnection();

    try {
      // Operacion critica:
      // contrato y pago se verifican y registran dentro
      // de una unica transaccion.
      await conexion.beginTransaction();

      // FOR UPDATE evita que el contrato cambie mientras
      // se registra el pago.
      const contrato =
        await this.contratos.bloquearPorId(
          contratoId,
          conexion
        );

      if (!contrato) {
        await conexion.rollback();

        return {
          exito: false,
          errores: ["El contrato no existe."],
        };
      }

      if (contrato.estado !== "activo") {
        await conexion.rollback();

        return {
          exito: false,
          errores: [
            `El contrato está ${contrato.estado} y no admite un nuevo pago de mensualidad.`,
          ],
        };
      }

      if (Number(contrato.precio) <= 0) {
        await conexion.rollback();

        return {
          exito: false,
          errores: [
            "El contrato no tiene un precio válido para registrar la mensualidad.",
          ],
        };
      }

      const movimiento = {
        cliente_id: contrato.cliente_id,
        tipo: "ingreso",
        categoria: "mensualidad",
        descripcion: descripcion.trim(),
        monto: Number(contrato.precio),
        fecha,
      };

      const modelo =
        new MovimientoFinanciero(movimiento);

      if (modelo.errores.length > 0) {
        await conexion.rollback();

        return {
          exito: false,
          errores: modelo.errores,
        };
      }

      const id = await this.finanzas.crear(
        movimiento,
        conexion
      );

      await conexion.commit();

      return {
        exito: true,
        id,
        movimiento,
        contrato,
      };
    } catch (error) {
      await conexion.rollback();
      throw error;
    } finally {
      conexion.release();
    }
  }

  async listarPorRango(
    desde,
    hasta,
    clienteId = null
  ) {
    const errores = validarRango(
      desde,
      hasta
    );

    if (errores.length > 0) {
      return {
        exito: false,
        errores,
      };
    }

    const movimientos =
      await this.finanzas.listarPorRango(
        desde,
        hasta,
        clienteId
      );

    return {
      exito: true,
      movimientos,
    };
  }

  async balancePorRango(
    desde,
    hasta
  ) {
    const errores = validarRango(
      desde,
      hasta
    );

    if (errores.length > 0) {
      return {
        exito: false,
        errores,
      };
    }

    const balance =
      await this.finanzas.balancePorRango(
        desde,
        hasta
      );

    const ingresos = Number(balance.ingresos);
    const egresos = Number(balance.egresos);

    return {
      exito: true,
      desde,
      hasta,
      ingresos,
      egresos,
      balance: ingresos - egresos,
    };
  }

  async balancePorCliente(
    clienteId,
    desde,
    hasta
  ) {
    const errores = validarRango(
      desde,
      hasta
    );

    if (errores.length > 0) {
      return {
        exito: false,
        errores,
      };
    }

    const balance =
      await this.finanzas.balancePorCliente(
        clienteId,
        desde,
        hasta
      );

    const ingresos = Number(balance.ingresos);
    const egresos = Number(balance.egresos);

    return {
      exito: true,
      clienteId,
      desde,
      hasta,
      ingresos,
      egresos,
      balance: ingresos - egresos,
    };
  }
}