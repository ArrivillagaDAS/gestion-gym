import inquirer from "inquirer";
import chalk from "chalk";
import { ClienteService } from "../services/cliente-service.js";
import { PlanService } from "../services/plan-service.js";
import { ContratoService } from "../services/contrato-service.js";

const clientes = new ClienteService();
const planes = new PlanService();
const contratos = new ContratoService();

async function asignarPlan() {
  const listaClientes = await clientes.listarTodos();
  const listaPlanes = await planes.listarTodos();

  if (listaClientes.length === 0 || listaPlanes.length === 0) {
    console.log(chalk.yellow("Se necesita al menos un cliente y un plan registrados."));
    return;
  }

  const { clienteId, planId, condiciones } = await inquirer.prompt([
    {
      type: "select",
      name: "clienteId",
      message: "Cliente:",
      choices: listaClientes.map((c) => ({
        name: `${c.id} - ${c.nombre} ${c.apellido}`,
        value: c.id,
      })),
    },
    {
      type: "select",
      name: "planId",
      message: "Plan:",
      choices: listaPlanes.map((p) => ({
        name: `${p.id} - ${p.nombre} (${p.duracion_semanas} semanas, ${Number(p.precio).toFixed(2)})`,
        value: p.id,
      })),
    },
    { type: "input", name: "condiciones", message: "Condiciones adicionales (opcional):" },
  ]);

  const opciones = condiciones.trim() ? { condiciones: condiciones.trim() } : {};

  try {
    const resultado = await contratos.asignarPlan(clienteId, planId, opciones);

    if (resultado.exito) {
      const c = resultado.contrato;
      console.log(chalk.green(`Contrato creado con éxito (id: ${resultado.id}).`));
      console.log(`Vigencia: ${c.fecha_inicio} a ${c.fecha_fin}`);
      console.log(`Precio: ${c.precio.toFixed(2)}`);
    } else {
      console.log(chalk.red("No se pudo asignar el plan:"));
      resultado.errores.forEach((e) => console.log(chalk.red(" - " + e)));
    }
  } catch (error) {
    console.log(chalk.red("Ocurrió un error inesperado al asignar el plan."));
    console.log(chalk.gray(error.message));
  }
}

export async function menuContratos() {
  let volver = false;

  while (!volver) {
    const { opcion } = await inquirer.prompt([
      {
        type: "select",
        name: "opcion",
        message: chalk.cyan("Menú de Contratos"),
        choices: [
          { name: "Asignar plan a cliente", value: "asignar" },
          new inquirer.Separator(),
          { name: "Volver", value: "volver" },
        ],
      },
    ]);

    if (opcion === "asignar") await asignarPlan();
    if (opcion === "volver") volver = true;
  }
}