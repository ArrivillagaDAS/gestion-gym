// traduce HTTP <-> PlanService, sin reglas de negocio ni SQL
import { enviarJson, enviarResultado, leerJson, idDeRuta, ErrorHttp } from "../http.js";
import { texto, numero } from "../datos.js";

// DECIMAL llega como texto desde mysql2: el precio se manda como numero
function aRespuesta(plan) {
  return { ...plan, precio: Number(plan.precio) };
}

export function crearPlanController({ planService }) {
  return {
    async listar({ res }) {
      const planes = await planService.listarTodos();
      enviarJson(res, 200, planes.map(aRespuesta));
    },

    async obtener({ res, params }) {
      const plan = await planService.buscarPorId(idDeRuta(params.id));
      if (!plan) throw new ErrorHttp(404, "El plan no existe.");
      enviarJson(res, 200, aRespuesta(plan));
    },

    async crear({ req, res }) {
      const cuerpo = await leerJson(req);
      const resultado = await planService.crear({
        nombre: texto(cuerpo.nombre),
        duracion_semanas: numero(cuerpo.duracion_semanas),
        metas_fisicas: texto(cuerpo.metas_fisicas),
        nivel: texto(cuerpo.nivel),
        precio: numero(cuerpo.precio),
      });
      enviarResultado(res, resultado, 201);
    },
  };
}
