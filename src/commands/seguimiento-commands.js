import inquirer from "inquirer";
import chalk from "chalk";
import dayjs from "dayjs";
import { ClienteService } from "../services/cliente-service.js";
import { ContratoService } from "../services/contrato-service.js";
import { SeguimientoService } from "../services/seguimiento-service.js";

const clientes = new ClienteService();
const contratos = new ContratoService();
const seguimientos = new SeguimientoService();

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

function numeroOpcional(texto) {
  const limpio = texto.trim().replace(",", ".");
  return limpio === "" ? undefined : Number(limpio);
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

async function registrarAvance() {
  const clienteId = await elegirCliente();
  if (clienteId === null) return;

  try {
    const lista = await contratos.listarPorCliente(clienteId);
    const activos = lista.filter((c) => c.estado === "activo");

    if (activos.length === 0) {
      console.log(chalk.yellow("Este cliente no tiene contratos activos. Los avances se registran sobre un contrato activo."));
      return;
    }

    const datos = await inquirer.prompt([
      {
        type: "select",
        name: "contratoId",
        message: "Contrato:",
        choices: activos.map((c) => ({
          name: `#${c.id} | ${c.plan_nombre} | vence ${formatearFecha(c.fecha_fin)}`,
          value: c.id,
        })),
      },
      { type: "input", name: "fecha", message: "Fecha (AAAA-MM-DD):", default: dayjs().format("YYYY-MM-DD") },
      { type: "input", name: "peso", message: "Peso en kg (opcional):" },
      { type: "input", name: "grasa", message: "Grasa corporal en % (opcional):" },
      { type: "input", name: "medidas", message: "Medidas (opcional, ej: cintura 80, cadera 95):" },
      { type: "input", name: "foto", message: "Foto, ruta o enlace (opcional):" },
      { type: "input", name: "comentarios", message: "Comentarios (opcional):" },
    ]);

    const resultado = await seguimientos.registrar({
      contrato_id: datos.contratoId,
      fecha: datos.fecha.trim(),
      peso: numeroOpcional(datos.peso),
      grasa_corporal: numeroOpcional(datos.grasa),
      medidas: textoOpcional(datos.medidas),
      foto: textoOpcional(datos.foto),
      comentarios: textoOpcional(datos.comentarios),
    });

    if (resultado.exito) {
      console.log(chalk.green(`Avance registrado (id: ${resultado.id}).`));
    } else {
      console.log(chalk.red("No se pudo registrar el avance:"));
      resultado.errores.forEach((e) => console.log(chalk.red(" - " + e)));
    }
  } catch (error) {
    console.log(chalk.red("Ocurrió un error inesperado al registrar el avance."));
    console.log(chalk.gray(error.message));
  }
}

export async function menuSeguimiento() {
  let volver = false;

  while (!volver) {
    const { opcion } = await inquirer.prompt([
      {
        type: "select",
        name: "opcion",
        message: chalk.cyan("Menú de Seguimiento físico"),
        choices: [
          { name: "Registrar avance semanal", value: "registrar" },
          new inquirer.Separator(),
          { name: "Volver", value: "volver" },
        ],
      },
    ]);

    if (opcion === "registrar") await registrarAvance();
    if (opcion === "volver") volver = true;
  }
}