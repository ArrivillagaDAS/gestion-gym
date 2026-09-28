import { Modelo } from "./modelo.js";

// comidas permitidas: el modelo las valida y los comandos las muestran como opciones
export const COMIDAS = ["desayuno", "almuerzo", "merienda", "cena"];

const esquemaAlimentoDia = {
  plan_alimentacion_id: { tipo: "number", requerido: true },
  fecha: { tipo: "string", requerido: true, formato: /^\d{4}-\d{2}-\d{2}$/ },
  comida: { tipo: "string", requerido: true, valores: COMIDAS },
  alimento: { tipo: "string", requerido: true },
  calorias: { tipo: "number", requerido: true, min: 1, max: 10000 },
};

export class AlimentoDia extends Modelo {
  constructor(datos) {
    super(datos, esquemaAlimentoDia);
  }
}