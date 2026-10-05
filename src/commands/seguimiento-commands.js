import inquirer from "inquirer";
import chalk from "chalk";
import dayjs from "dayjs";
import { clienteService as clientes, contratoService as contratos, seguimientoService as seguimientos } from "../container.js";
import { formatearFecha } from "../utils/fechas.js";
import { textoOpcional, numeroOpcional } from "../utils/entrada.js";

function formatearVariacion(valor) {
  return `${valor > 0 ? "+" : ""}${valor.toFixed(2)}`;
}

// arma el texto de un registro de avance, en una o varias lineas
function describirRegistro(r) {
  const lineas = [`${r.fecha} | contrato #${r.contrato_id} ${r.plan_nombre} (${r.contrato_estado})`];

  const medicion = [];
  if (r.peso !== null) {
    const variacion = r.variacion_peso !== null ? ` (${formatearVariacion(r.variacion_peso)})` : "";
    medicion.push(`Peso: ${r.peso.toFixed(2)} kg${variacion}`);
  }
  if (r.grasa_corporal !== null) medicion.push(`Grasa: ${r.grasa_corporal.toFixed(1)} %`);
  if (medicion.length > 0) lineas.push("   " + medicion.join(" | "));

  if (r.medidas) lineas.push(`   Medidas: ${r.medidas}`);
  if (r.foto) lineas.push(`   Foto: ${r.foto}`);
  if (r.comentarios) lineas.push(`   Comentarios: ${r.comentarios}`);

  return lineas.join("\n");
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

async function verProgreso() {
  const clienteId = await elegirCliente();
  if (clienteId === null) return;

  try {
    const registros = await seguimientos.progresoPorCliente(clienteId);

    if (registros.length === 0) {
      console.log(chalk.yellow("Este cliente no tiene avances registrados."));
      return;
    }

    console.log(chalk.cyan(`\nProgreso cronológico (${registros.length} registro(s)):`));
    registros.forEach((r) => console.log(describirRegistro(r)));

    const conPeso = registros.filter((r) => r.peso !== null);
    if (conPeso.length >= 2) {
      const inicial = conPeso[0].peso;
      const actual = conPeso[conPeso.length - 1].peso;
      console.log(
        chalk.cyan(
          `\nResumen de peso: inicial ${inicial.toFixed(2)} kg, actual ${actual.toFixed(2)} kg, ` +
            `cambio ${formatearVariacion(actual - inicial)} kg`
        )
      );
    }
    console.log("");
  } catch (error) {
    console.log(chalk.red("Ocurrió un error inesperado al consultar el progreso."));
    console.log(chalk.gray(error.message));
  }
}

async function eliminarAvance() {
  const clienteId = await elegirCliente();
  if (clienteId === null) return;

  try {
    const registros = await seguimientos.progresoPorCliente(clienteId);
    // solo se ofrecen los registros de contratos activos, el resto es historial
    const eliminables = registros.filter((r) => r.contrato_estado === "activo");

    if (eliminables.length === 0) {
      console.log(chalk.yellow("Este cliente no tiene avances eliminables (solo se eliminan los de contratos activos)."));
      return;
    }

    const { seguimientoId } = await inquirer.prompt([
      {
        type: "select",
        name: "seguimientoId",
        message: "Avance a eliminar:",
        choices: eliminables.map((r) => ({
          name: `#${r.id} | ${r.fecha} | contrato #${r.contrato_id} ${r.plan_nombre}` +
            (r.peso !== null ? ` | ${r.peso.toFixed(2)} kg` : ""),
          value: r.id,
        })),
      },
    ]);

    const { confirmar } = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirmar",
        message: "¿Seguro que quieres eliminar este avance? No se puede deshacer.",
        default: false,
      },
    ]);

    if (!confirmar) {
      console.log(chalk.yellow("Operación cancelada."));
      return;
    }

    const resultado = await seguimientos.eliminar(seguimientoId);

    if (resultado.exito) {
      console.log(chalk.green(`Avance #${seguimientoId} eliminado.`));
    } else {
      console.log(chalk.red("No se pudo eliminar el avance:"));
      resultado.errores.forEach((e) => console.log(chalk.red(" - " + e)));
    }
  } catch (error) {
    console.log(chalk.red("Ocurrió un error inesperado al eliminar el avance."));
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
          { name: "Ver progreso de un cliente", value: "ver" },
          { name: "Eliminar registro de avance", value: "eliminar" },
          new inquirer.Separator(),
          { name: "Volver", value: "volver" },
        ],
      },
    ]);

    if (opcion === "registrar") await registrarAvance();
    if (opcion === "ver") await verProgreso();
    if (opcion === "eliminar") await eliminarAvance();
    if (opcion === "volver") volver = true;
  }
}