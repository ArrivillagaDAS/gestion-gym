// traduce HTTP <-> ClienteService, sin reglas de negocio ni SQL
import { formatearFecha } from "../../utils/fechas.js";
import { enviarJson, enviarResultado, leerJson, idDeRuta, ErrorHttp } from "../http.js";
import { texto } from "../datos.js";

// mysql2 devuelve las columnas DATE como objetos Date: se mandan como AAAA-MM-DD
function aRespuesta(cliente) {
  return {
    ...cliente,
    fecha_nacimiento: formatearFecha(cliente.fecha_nacimiento) || null,
    fecha_registro: formatearFecha(cliente.fecha_registro) || null,
  };
}

function datosDelFormulario(cuerpo) {
  return {
    nombre: texto(cuerpo.nombre),
    apellido: texto(cuerpo.apellido),
    email: texto(cuerpo.email),
    telefono: texto(cuerpo.telefono),
    fecha_nacimiento: texto(cuerpo.fecha_nacimiento),
  };
}

export function crearClienteController({ clienteService }) {
  return {
    async listar({ res }) {
      const clientes = await clienteService.listarTodos();
      enviarJson(res, 200, clientes.map(aRespuesta));
    },

    async obtener({ res, params }) {
      const cliente = await clienteService.buscarPorId(idDeRuta(params.id));
      if (!cliente) throw new ErrorHttp(404, "El cliente no existe.");
      enviarJson(res, 200, aRespuesta(cliente));
    },

    async crear({ req, res }) {
      const resultado = await clienteService.crear(datosDelFormulario(await leerJson(req)));
      enviarResultado(res, resultado, 201);
    },

    async actualizar({ req, res, params }) {
      const id = idDeRuta(params.id);
      const resultado = await clienteService.actualizar(id, datosDelFormulario(await leerJson(req)));
      enviarResultado(res, resultado);
    },

    async eliminar({ res, params }) {
      const resultado = await clienteService.eliminar(idDeRuta(params.id));
      enviarResultado(res, resultado);
    },
  };
}
