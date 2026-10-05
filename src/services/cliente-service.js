import dayjs from "dayjs";
import { Cliente } from "../models/cliente.js";

// reglas que el modelo no puede revisar solo con el esquema
function validarReglasDeNegocio(cliente) {
  const errores = [];

  if (cliente.fecha_nacimiento !== undefined && dayjs(cliente.fecha_nacimiento).isAfter(dayjs(), "day")) {
    errores.push("La fecha de nacimiento no puede ser futura.");
  }

  return errores;
}

export class ClienteService {
  constructor({ clientes }) {
    this.repositorio = clientes;
  }

  async crear(datos) {
    const cliente = new Cliente(datos);
    const errores = [...cliente.errores];

    if (errores.length === 0) {
      errores.push(...validarReglasDeNegocio(cliente));
    }

    if (errores.length > 0) {
      return { exito: false, errores };
    }

    const id = await this.repositorio.crear(cliente);
    return { exito: true, id };
  }

  async listarTodos() {
    return this.repositorio.listarTodos();
  }

  async buscarPorId(id) {
    return this.repositorio.buscarPorId(id);
  }

  async actualizar(id, datos) {
    const cliente = new Cliente(datos);
    const errores = [...cliente.errores];

    if (errores.length === 0) {
      errores.push(...validarReglasDeNegocio(cliente));
    }

    if (errores.length > 0) {
      return { exito: false, errores };
    }

    // sin esta revision, actualizar un cliente inexistente parecia un exito
    const existente = await this.repositorio.buscarPorId(id);

    if (!existente) {
      return { exito: false, errores: ["El cliente no existe."] };
    }

    await this.repositorio.actualizar(id, cliente);
    return { exito: true };
  }

  async eliminar(id) {
    const existente = await this.repositorio.buscarPorId(id);

    if (!existente) {
      return { exito: false, errores: ["El cliente no existe."] };
    }

    try {
      await this.repositorio.eliminar(id);
    } catch (error) {
      // las claves foraneas de contratos y movimientos impiden borrar al cliente
      if (error.code === "ER_ROW_IS_REFERENCED_2") {
        return {
          exito: false,
          errores: ["El cliente tiene contratos o movimientos financieros asociados y no se puede eliminar."],
        };
      }
      throw error;
    }

    return { exito: true };
  }
}