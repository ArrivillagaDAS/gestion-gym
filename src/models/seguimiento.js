import { Modelo } from "./modelo.js";

const esquemaSeguimiento = {
  contrato_id: { tipo: "number", requerido: true },
  fecha: { tipo: "string", requerido: true, formato: /^\d{4}-\d{2}-\d{2}$/, fecha: true },
  peso: { tipo: "number", requerido: false, min: 1, max: 500 },
  grasa_corporal: { tipo: "number", requerido: false, min: 0, max: 100 },
  medidas: { tipo: "string", requerido: false, maxLength: 255 },
  foto: { tipo: "string", requerido: false, maxLength: 255 },
  comentarios: { tipo: "string", requerido: false },
};

export class Seguimiento extends Modelo {
  constructor(datos) {
    super(datos, esquemaSeguimiento);
  }
}