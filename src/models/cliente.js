import { Modelo } from "./modelo.js";

const esquemaCliente = {
  nombre: { tipo: "string", requerido: true, maxLength: 100 },
  apellido: { tipo: "string", requerido: true, maxLength: 100 },
  email: {
    tipo: "string",
    requerido: false,
    formato: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    maxLength: 150,
  },
  telefono: { tipo: "string", requerido: false, maxLength: 20 },
  fecha_nacimiento: { tipo: "string", requerido: false, formato: /^\d{4}-\d{2}-\d{2}$/, fecha: true },
};

export class Cliente extends Modelo {
  constructor(datos) {
    super(datos, esquemaCliente);
  }
}