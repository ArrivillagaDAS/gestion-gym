import dayjs from "dayjs";
import { pool } from "../config/database.js";
import {
  MovimientoFinanciero,
  CATEGORIAS_INGRESO,
  CATEGORIAS_EGRESO,
} from "../models/movimiento-financiero.js";
import { ClienteService } from "./cliente-service.js";
import { ContratoRepository } from "./contrato-repository.js";
import { FinanzasRepository } from "./finanzas-repository.js";

function fechaExiste(texto) {
  return dayjs(texto).format("YYYY-MM-DD") === texto;
}

export class FinanzasService {
  constructor() {
    this.finanzas = new FinanzasRepository();
    this.clientes = new ClienteService();
    this.contratos = new ContratoRepository();
  }

  validarMovimiento(datos) {
    const movimiento = new MovimientoFinanciero(datos);
    const errores = [...movimiento.errores];

    if (errores.length === 0) {
      if (!fechaExiste(movimiento.fecha)) {
        errores.push("La fecha no existe en el calendario.");
      }

      if (movimiento.descripcion.length > 255) {
        errores.push("La descripción no puede superar 255 caracteres.");
      }

      if (movimiento.tipo === "ingreso") {
        if (!CATEGORIAS_INGRESO.includes(movimiento.categoria)) {
          errores.push("La categoría de ingreso no es válida.");
        }
      }

      if (movimiento.tipo === "egreso") {
        if (!CATEGORIAS_EGRESO.includes(movimiento.categoria)) {
          errores.push("La categoría de egreso no es válida.");
        }
      }
    }

    return { movimiento, errores };
  }

  async registrar(datos) {
    const { movimiento, errores } = this.validarMovimiento(datos);

    if (errores.length > 0) {
      return { exito: false, errores };
    }

    const conexion = await pool.getConnection();

    try {
      await conexion.beginTransaction();

      if (movimiento.cliente_id !== undefined) {
        const cliente = await this.clientes.buscarPorId(
          movimiento.cliente_id
        );

        if (!cliente) {
          await conexion.rollback();

          return {
            exito: false,
            errores: ["El cliente no existe."],
          };
        }
      }

      const id = await this.finanzas.crear(movimiento, conexion);

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

  async listarPorRango(desde, hasta) {
    return this.finanzas.listarPorRango(desde, hasta);
  }

  async balancePorRango(desde, hasta) {
    const datos = await this.finanzas.balancePorRango(desde, hasta);

    const ingresos = Number(datos.ingresos);
    const egresos = Number(datos.egresos);

    return {
      desde,
      hasta,
      ingresos,
      egresos,
      balance: ingresos - egresos,
    };
  }

  async balancePorCliente(clienteId, desde, hasta) {
    const datos = await this.finanzas.balancePorCliente(
      clienteId,
      desde,
      hasta
    );

    const ingresos = Number(datos.ingresos);
    const egresos = Number(datos.egresos);

    return {
      clienteId,
      desde,
      hasta,
      ingresos,
      egresos,
      balance: ingresos - egresos,
    };
  }
}