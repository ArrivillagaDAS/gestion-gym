import { fechaExiste } from "../utils/fechas.js";

import {
  MovimientoFinanciero,
  CATEGORIAS_INGRESO,
  CATEGORIAS_EGRESO,
} from "../models/movimiento-financiero.js";


function tieneMaximoDosDecimales(monto) {
  // monto * 100 puede dar 114.99999999999999 por punto flotante,
  // asi que se compara con tolerancia en vez de exigir un entero exacto
  const centavos = monto * 100;
  return Math.abs(centavos - Math.round(centavos)) < 1e-6;
}

// los montos salen de DECIMAL: se redondea a centavos para evitar 0.1 + 0.2 = 0.30000000000000004
function redondear(monto) {
  return Math.round(monto * 100) / 100;
}

function validarRango(desde, hasta) {
  const errores = [];

  if (!fechaExiste(desde)) {
    errores.push(
      "La fecha inicial no existe en el calendario."
    );
  }

  if (!fechaExiste(hasta)) {
    errores.push(
      "La fecha final no existe en el calendario."
    );
  }

  if (
    errores.length === 0 &&
    hasta < desde
  ) {
    errores.push(
      "La fecha final no puede ser anterior a la fecha inicial."
    );
  }

  return errores;
}

export class FinanzasService {
  constructor({ finanzas, contratos, clientes, ejecutarTransaccion }) {
    this.finanzas = finanzas;
    this.contratos = contratos;
    this.clientes = clientes;
    this.ejecutarTransaccion = ejecutarTransaccion;
  }

  async registrar(datos) {
    const movimiento =
      new MovimientoFinanciero(datos);

    const errores =
      [...movimiento.errores];

    if (errores.length === 0) {
      if (
        !tieneMaximoDosDecimales(
          movimiento.monto
        )
      ) {
        errores.push(
          "El monto debe tener como máximo dos decimales."
        );
      }

      if (
        movimiento.tipo === "ingreso" &&
        !CATEGORIAS_INGRESO.includes(
          movimiento.categoria
        )
      ) {
        errores.push(
          "La categoría seleccionada no corresponde a un ingreso."
        );
      }

      if (
        movimiento.tipo === "egreso" &&
        !CATEGORIAS_EGRESO.includes(
          movimiento.categoria
        )
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

    // el cliente debe existir, si no la clave foranea rompe el INSERT
    if (
      errores.length === 0 &&
      movimiento.cliente_id !== undefined
    ) {
      const cliente =
        await this.clientes.buscarPorId(
          movimiento.cliente_id
        );

      if (!cliente) {
        errores.push(
          "El cliente no existe."
        );
      }
    }

    if (errores.length > 0) {
      return {
        exito: false,
        errores,
      };
    }

    return this.ejecutarTransaccion(async (conexion) => {
      const id =
        await this.finanzas.crear(
          movimiento,
          conexion
        );

      return {
        exito: true,
        id,
        movimiento,
      };
    });
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

    if (
      !descripcion ||
      descripcion.trim() === ""
    ) {
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

    return this.ejecutarTransaccion(async (conexion) => {
      const contrato =
        await this.contratos.bloquearPorId(
          contratoId,
          conexion
        );

      if (!contrato) {

        return {
          exito: false,
          errores: [
            "El contrato no existe.",
          ],
        };
      }

      if (
        contrato.estado !== "activo"
      ) {

        return {
          exito: false,
          errores: [
            `El contrato está ${contrato.estado} y no admite un nuevo pago de mensualidad.`,
          ],
        };
      }

      if (
        Number(contrato.precio) <= 0
      ) {

        return {
          exito: false,
          errores: [
            "El contrato no tiene un precio válido para registrar la mensualidad.",
          ],
        };
      }

      const movimiento = {
        cliente_id:
          contrato.cliente_id,

        tipo: "ingreso",

        categoria:
          "mensualidad",

        descripcion:
          descripcion.trim(),

        monto:
          Number(contrato.precio),

        fecha,
      };

      const modelo =
        new MovimientoFinanciero(
          movimiento
        );

      if (modelo.errores.length > 0) {

        return {
          exito: false,
          errores:
            modelo.errores,
        };
      }

      const id =
        await this.finanzas.crear(
          movimiento,
          conexion
        );

      return {
        exito: true,
        id,
        movimiento,
        contrato,
      };
    });
  }

  async listarPorRango(
    desde,
    hasta,
    clienteId = null
  ) {
    const errores =
      validarRango(
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
    const errores =
      validarRango(
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

    const ingresos =
      Number(balance.ingresos);

    const egresos =
      Number(balance.egresos);

    return {
      exito: true,
      desde,
      hasta,
      ingresos,
      egresos,
      balance:
        redondear(ingresos - egresos),
    };
  }

  async balancePorCliente(
    clienteId,
    desde,
    hasta
  ) {
    const errores =
      validarRango(
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

    const ingresos =
      Number(balance.ingresos);

    const egresos =
      Number(balance.egresos);

    return {
      exito: true,
      clienteId,
      desde,
      hasta,
      ingresos,
      egresos,
      balance:
        redondear(ingresos - egresos),
    };
  }
}