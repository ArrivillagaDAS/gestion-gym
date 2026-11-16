// une las rutas de la API con sus controladores
// los servicios salen de container.js, igual que en los comandos de consola
import { pool } from "../config/database.js";
import { clienteService, planService, contratoService } from "../container.js";
import { Enrutador } from "./enrutador.js";
import { enviarJson } from "./http.js";
import { crearCatalogoController } from "./controladores/catalogo-controller.js";
import { crearClienteController } from "./controladores/cliente-controller.js";
import { crearPlanController } from "./controladores/plan-controller.js";
import { crearContratoController } from "./controladores/contrato-controller.js";

export function crearRutas() {
  const rutas = new Enrutador();

  const catalogo = crearCatalogoController();
  const clientes = crearClienteController({ clienteService });
  const planes = crearPlanController({ planService });
  const contratos = crearContratoController({ contratoService });

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

  rutas
    .get("/api/clientes/:id/contratos", contratos.listarPorCliente)
    .post("/api/contratos", contratos.asignar)
    .get("/api/contratos/:id/seguimientos/total", contratos.contarSeguimientos)
    .post("/api/contratos/:id/renovar", contratos.renovar)
    .post("/api/contratos/:id/cancelar", contratos.cancelar)
    .post("/api/contratos/:id/finalizar", contratos.finalizar);

  rutas.get("/api/catalogos", catalogo.obtener);

  return rutas;
}
