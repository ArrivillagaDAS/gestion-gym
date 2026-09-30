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
    maxLength: 100,
  },

  // tope del monto segun la columna DECIMAL(10,2)
  monto: {
    tipo: "number",
    requerido: true,
    min: 0.01,
    max: 99999999.99,
  },

  fecha: {
    tipo: "string",
    requerido: true,
    formato: /^\d{4}-\d{2}-\d{2}$/,
    fecha: true,
  },

  descripcion: {
    tipo: "string",
    requerido: true,
    maxLength: 500,
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