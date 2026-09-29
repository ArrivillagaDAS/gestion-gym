import { Modelo } from "./modelo.js";

export const TIPOS_MOVIMIENTO = ["ingreso", "egreso"];

export const CATEGORIAS_INGRESO = [
  "mensualidad",
  "sesion_individual",
];

export const CATEGORIAS_EGRESO = [
  "servicio",
  "suplemento",
  "gasto_operativo",
];

const esquemaMovimientoFinanciero = {
  tipo: {
    tipo: "string",
    requerido: true,
    valores: TIPOS_MOVIMIENTO,
  },

  categoria: {
    tipo: "string",
    requerido: true,
  },

  monto: {
    tipo: "number",
    requerido: true,
    min: 0.01,
  },

  fecha: {
    tipo: "string",
    requerido: true,
    formato: /^\d{4}-\d{2}-\d{2}$/,
  },

  descripcion: {
    tipo: "string",
    requerido: true,
  },

  cliente_id: {
    tipo: "number",
    requerido: false,
  },
};

export class MovimientoFinanciero extends Modelo {
  constructor(datos) {
    super(datos, esquemaMovimientoFinanciero);
  }
}