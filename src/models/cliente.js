import { Modelo } from "./modelo.js";

const esquemaCliente = {
  nombre: { tipo: "string", requerido: true },
  apellido: { tipo: "string", requerido: true },
  email: {
    tipo: "string",
    requerido: false,
    formato: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  telefono: { tipo: "string", requerido: false },
  fecha_nacimiento: { tipo: "string", requerido: false, formato: /^\d{4}-\d{2}-\d{2}$/ },
};

export class Cliente extends Modelo {
  constructor(datos) {
    super(datos, esquemaCliente);
  }
}