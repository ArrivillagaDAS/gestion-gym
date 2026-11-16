import { Modelo } from "./modelo.js";

// tope del precio segun la columna DECIMAL(10,2)
const PRECIO_MAXIMO = 99999999.99;

// niveles permitidos: el modelo los valida y la web los muestra como opciones
export const NIVELES = ["principiante", "intermedio", "avanzado"];

const esquemaPlan = {
  nombre: { tipo: "string", requerido: true, maxLength: 100 },
  // 520 semanas (10 años): tope tecnico para que las fechas del contrato sigan siendo validas
  duracion_semanas: { tipo: "number", requerido: true, entero: true, min: 1, max: 520 },
  metas_fisicas: { tipo: "string", requerido: false, maxLength: 255 },
  nivel: {
    tipo: "string",
    requerido: true,
    valores: NIVELES,
  },
  precio: { tipo: "number", requerido: true, min: 0, max: PRECIO_MAXIMO },
};

export class Plan extends Modelo {
  constructor(datos) {
    super(datos, esquemaPlan);
  }
}