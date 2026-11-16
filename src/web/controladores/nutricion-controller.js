// traduce HTTP <-> NutricionService, sin reglas de negocio ni SQL
import { enviarJson, enviarResultado, leerJson, idDeRuta, ErrorHttp } from "../http.js";
import { texto, numero } from "../datos.js";

// quita la lista de errores vacia del modelo que devuelve el servicio
function sinErrores(resultado, clave) {
  if (!resultado.exito || !resultado[clave]) return resultado;
  const { errores, ...modelo } = resultado[clave];
  return { ...resultado, [clave]: modelo };
}

export function crearNutricionController({ nutricionService }) {
  return {
    async crearPlan({ req, res }) {
      const cuerpo = await leerJson(req);
      const resultado = await nutricionService.crearPlan({
        contrato_id: numero(cuerpo.contrato_id),
        nombre: texto(cuerpo.nombre),
        fecha_inicio: texto(cuerpo.fecha_inicio),
        fecha_fin: texto(cuerpo.fecha_fin),
      });
      enviarResultado(res, sinErrores(resultado, "plan"), 201);
    },

    async listarPlanesPorCliente({ res, params }) {
      const planes = await nutricionService.listarPlanesPorCliente(idDeRuta(params.id, "id del cliente"));
      enviarJson(res, 200, planes);
    },

    async registrarAlimento({ req, res }) {
      const cuerpo = await leerJson(req);
      const resultado = await nutricionService.registrarAlimento({
        plan_alimentacion_id: numero(cuerpo.plan_alimentacion_id),
        fecha: texto(cuerpo.fecha),
        comida: texto(cuerpo.comida),
        alimento: texto(cuerpo.alimento),
        calorias: numero(cuerpo.calorias),
      });
      enviarResultado(res, sinErrores(resultado, "alimento"), 201);
    },

    // /api/clientes/:id/reporte-nutricional?inicio=AAAA-MM-DD
    async reporteSemanal({ res, params, query }) {
      const inicio = texto(query.get("inicio"));
      if (!inicio) throw new ErrorHttp(400, "Indica la fecha de inicio de la semana (inicio=AAAA-MM-DD).");

      const reporte = await nutricionService.reporteSemanal(idDeRuta(params.id, "id del cliente"), inicio);
      enviarResultado(res, reporte);
    },
  };
}
