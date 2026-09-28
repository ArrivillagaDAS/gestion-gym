import inquirer from "inquirer";
import chalk from "chalk";
import dayjs from "dayjs";
import { ClienteService } from "../services/cliente-service.js";
import { ContratoService } from "../services/contrato-service.js";
import { NutricionService } from "../services/nutricion-service.js";

const clientes = new ClienteService();
const contratos = new ContratoService();
const nutricion = new NutricionService();

function formatearFecha(fecha) {
  if (fecha instanceof Date) {
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");
    return `${fecha.getFullYear()}-${mes}-${dia}`;
  }
  return String(fecha);
}

// texto vacio se convierte en undefined para que el modelo lo trate como no enviado
function textoOpcional(texto) {
  const limpio = texto.trim();
  return limpio === "" ? undefined : limpio;
}

async function elegirCliente() {
  const listaClientes = await clientes.listarTodos();

  if (listaClientes.length === 0) {
    console.log(chalk.yellow("No hay clientes registrados."));
    return null;
  }

  const { clienteId } = await inquirer.prompt([
    {
      type: "select",
      name: "clienteId",
      message: "Cliente:",
      choices: listaClientes.map((c) => ({
        name: `${c.id} - ${c.nombre} ${c.apellido}`,
        value: c.id,
      })),
    },
  ]);

  return clienteId;
}

async function crearPlanAlimentacion() {
  const clienteId = await elegirCliente();
  if (clienteId === null) return;

  try {
    const lista = await contratos.listarPorCliente(clienteId);
    const activos = lista.filter((c) => c.estado === "activo");

    if (activos.length === 0) {
      console.log(chalk.yellow("Este cliente no tiene contratos activos. Los planes de alimentación se crean sobre un contrato activo."));
      return;
    }

    const datos = await inquirer.prompt([
      {
        type: "select",
        name: "contratoId",
        message: "Contrato (cliente y plan de entrenamiento):",
        choices: activos.map((c) => ({
          name: `#${c.id} | ${c.plan_nombre} | vence ${formatearFecha(c.fecha_fin)}`,
          value: c.id,
        })),
      },
      { type: "input", name: "nombre", message: "Nombre del plan de alimentación:" },
      { type: "input", name: "fecha_inicio", message: "Fecha de inicio (AAAA-MM-DD):", default: dayjs().format("YYYY-MM-DD") },
      { type: "input", name: "fecha_fin", message: "Fecha de fin (AAAA-MM-DD, opcional):" },
    ]);

    const resultado = await nutricion.crearPlan({
      contrato_id: datos.contratoId,
      nombre: datos.nombre.trim(),
      fecha_inicio: datos.fecha_inicio.trim(),
      fecha_fin: textoOpcional(datos.fecha_fin),
    });

    if (resultado.exito) {
      const p = resultado.plan;
      console.log(chalk.green(`Plan de alimentación creado (id: ${resultado.id}).`));
      console.log(`Contrato #${p.contrato_id} | Desde ${p.fecha_inicio} | Hasta ${p.fecha_fin ?? "sin fecha de fin"}`);
    } else {
      console.log(chalk.red("No se pudo crear el plan de alimentación:"));
      resultado.errores.forEach((e) => console.log(chalk.red(" - " + e)));
    }
  } catch (error) {
    console.log(chalk.red("Ocurrió un error inesperado al crear el plan de alimentación."));
    console.log(chalk.gray(error.message));
  }
}

export async function menuNutricion() {
  let volver = false;

  while (!volver) {
    const { opcion } = await inquirer.prompt([
      {
        type: "select",
        name: "opcion",
        message: chalk.cyan("Menú de Nutrición"),
        choices: [
          { name: "Crear plan de alimentación", value: "crear" },
          new inquirer.Separator(),
          { name: "Volver", value: "volver" },
        ],
      },
    ]);

    if (opcion === "crear") await crearPlanAlimentacion();
    if (opcion === "volver") volver = true;
  }
}