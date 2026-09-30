import { Modelo } from "./modelo.js";

const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

const esquemaContrato = {
  cliente_id: { tipo: "number", requerido: true },
  plan_id: { tipo: "number", requerido: true },
  condiciones: { tipo: "string", requerido: false },
  precio: { tipo: "number", requerido: true, min: 0, max: 99999999.99 },
  fecha_inicio: { tipo: "string", requerido: true, formato: FORMATO_FECHA, fecha: true },
  fecha_fin: { tipo: "string", requerido: true, formato: FORMATO_FECHA, fecha: true },
  estado: {
    tipo: "string",
    requerido: false,
    valores: ["activo", "cancelado", "finalizado"],
  },
};

export class Contrato extends Modelo {
  constructor(datos) {
    super(datos, esquemaContrato);
  }
}