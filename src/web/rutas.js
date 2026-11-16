// une las rutas de la API con sus controladores
// los servicios salen de container.js, igual que en los comandos de consola
import { pool } from "../config/database.js";
import { clienteService, planService } from "../container.js";
import { Enrutador } from "./enrutador.js";
import { enviarJson } from "./http.js";
import { crearClienteController } from "./controladores/cliente-controller.js";
import { crearPlanController } from "./controladores/plan-controller.js";

export function crearRutas() {
  const rutas = new Enrutador();

  const clientes = crearClienteController({ clienteService });
  const planes = crearPlanController({ planService });

  // permite saber desde el navegador si el servidor y la base de datos responden
  rutas.get("/api/salud", async ({ res }) => {
    await pool.query("SELECT 1");
    enviarJson(res, 200, { exito: true, baseDeDatos: "conectada" });
  });

  rutas
    .get("/api/clientes", clientes.listar)
    .post("/api/clientes", clientes.crear)
    .get("/api/clientes/:id", clientes.obtener)
    .put("/api/clientes/:id", clientes.actualizar)
    .delete("/api/clientes/:id", clientes.eliminar);

  rutas
    .get("/api/planes", planes.listar)
    .post("/api/planes", planes.crear)
    .get("/api/planes/:id", planes.obtener);


  return rutas;
}
