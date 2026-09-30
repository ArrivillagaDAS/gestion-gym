import { Modelo } from "./modelo.js";

const esquemaPlanAlimentacion = {
  contrato_id: { tipo: "number", requerido: true },
  nombre: { tipo: "string", requerido: true, maxLength: 100 },
  fecha_inicio: { tipo: "string", requerido: true, formato: /^\d{4}-\d{2}-\d{2}$/, fecha: true },
  fecha_fin: { tipo: "string", requerido: false, formato: /^\d{4}-\d{2}-\d{2}$/, fecha: true },
};

export class PlanAlimentacion extends Modelo {
  constructor(datos) {
    super(datos, esquemaPlanAlimentacion);
  }
}