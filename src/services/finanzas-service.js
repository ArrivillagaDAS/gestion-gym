import dayjs from "dayjs";
import { pool } from "../config/database.js";
import {
  MovimientoFinanciero,
  CATEGORIAS_INGRESO,
  CATEGORIAS_EGRESO,
} from "../models/movimiento-financiero.js";
import { FinanzasRepository } from "./finanzas-repository.js";

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

  async listarPorRango(desde, hasta, clienteId = null) {
    const errores = validarRango(desde, hasta);

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

  async balancePorRango(desde, hasta) {
    const errores = validarRango(desde, hasta);

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
    const errores = validarRango(desde, hasta);

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