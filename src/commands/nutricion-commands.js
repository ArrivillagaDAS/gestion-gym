import inquirer from "inquirer";
import chalk from "chalk";
import dayjs from "dayjs";
import { COMIDAS } from "../models/alimento-dia.js";
import { ClienteService } from "../services/cliente-service.js";
import { ContratoService } from "../services/contrato-service.js";
import { NutricionService } from "../services/nutricion-service.js";
import { formatearFecha } from "../utils/fechas.js";
import { textoOpcional, numeroOpcional } from "../utils/entrada.js";

const clientes = new ClienteService();
const contratos = new ContratoService();
const nutricion = new NutricionService();

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

async function registrarAlimentos() {
  const clienteId = await elegirCliente();
  if (clienteId === null) return;

  try {
    const planes = await nutricion.listarPlanesPorCliente(clienteId);
    // solo se registran alimentos en planes de contratos activos, el resto es historial
    const disponibles = planes.filter((p) => p.contrato_estado === "activo");

    if (disponibles.length === 0) {
      console.log(chalk.yellow("Este cliente no tiene planes de alimentación en contratos activos."));
      return;
    }

    const { planId } = await inquirer.prompt([
      {
        type: "select",
        name: "planId",
        message: "Plan de alimentación:",
        choices: disponibles.map((p) => ({
          name:
            `#${p.id} | ${p.nombre} | ${p.fecha_inicio} a ${p.fecha_fin ?? "sin fecha de fin"}` +
            ` | contrato #${p.contrato_id} ${p.plan_nombre}`,
          value: p.id,
        })),
      },
    ]);

    const plan = disponibles.find((p) => p.id === planId);
    const hoy = dayjs().format("YYYY-MM-DD");
    // si el plan empieza en el futuro, se sugiere su primer dia
    let fechaSugerida = hoy < plan.fecha_inicio ? plan.fecha_inicio : hoy;
    let otro = true;

    while (otro) {
      const datos = await inquirer.prompt([
        { type: "input", name: "fecha", message: "Fecha (AAAA-MM-DD):", default: fechaSugerida },
        { type: "select", name: "comida", message: "Comida:", choices: COMIDAS },
        { type: "input", name: "alimento", message: "Alimento:" },
        { type: "input", name: "calorias", message: "Calorías estimadas (kcal):" },
      ]);

      const resultado = await nutricion.registrarAlimento({
        plan_alimentacion_id: planId,
        fecha: datos.fecha.trim(),
        comida: datos.comida,
        alimento: datos.alimento.trim(),
        calorias: numeroOpcional(datos.calorias),
      });

      if (resultado.exito) {
        console.log(chalk.green(`Alimento registrado (id: ${resultado.id}).`));
        // el siguiente alimento suele ser del mismo dia
        fechaSugerida = datos.fecha.trim();
      } else {
        console.log(chalk.red("No se pudo registrar el alimento:"));
        resultado.errores.forEach((e) => console.log(chalk.red(" - " + e)));
      }

      const { repetir } = await inquirer.prompt([
        {
          type: "confirm",
          name: "repetir",
          message: "¿Registrar otro alimento en este plan?",
          default: true,
        },
      ]);
      otro = repetir;
    }
  } catch (error) {
    console.log(chalk.red("Ocurrió un error inesperado al registrar el alimento."));
    console.log(chalk.gray(error.message));
  }
}

async function verReporteSemanal() {
  const clienteId = await elegirCliente();
  if (clienteId === null) return;

  try {
    // por defecto, el lunes de la semana actual
    const lunes = dayjs().subtract((dayjs().day() + 6) % 7, "day").format("YYYY-MM-DD");

    const { inicio } = await inquirer.prompt([
      { type: "input", name: "inicio", message: "Fecha de inicio de la semana (AAAA-MM-DD):", default: lunes },
    ]);

    const reporte = await nutricion.reporteSemanal(clienteId, inicio.trim());

    if (!reporte.exito) {
      console.log(chalk.red("No se pudo generar el reporte:"));
      reporte.errores.forEach((e) => console.log(chalk.red(" - " + e)));
      return;
    }

    if (reporte.diasConRegistros === 0) {
      console.log(chalk.yellow(`Este cliente no tiene alimentos registrados entre ${reporte.inicio} y ${reporte.fin}.`));
      return;
    }

    const nombresDia = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

    console.log(chalk.cyan(`\nReporte nutricional semanal (${reporte.inicio} a ${reporte.fin}):`));
    reporte.dias.forEach((d) => {
      const etiqueta = `${d.fecha} (${nombresDia[dayjs(d.fecha).day()]})`;
      if (d.alimentos.length === 0) {
        console.log(`${etiqueta} | sin registros`);
        return;
      }
      console.log(`${etiqueta} | ${d.calorias} kcal`);
      d.alimentos.forEach((a) => console.log(`   ${a.comida}: ${a.alimento} - ${a.calorias} kcal`));
    });

    console.log(
      chalk.cyan(
        `\nTotal semanal: ${reporte.total} kcal\n` +
          `Promedio diario: ${reporte.promedio.toFixed(1)} kcal (sobre ${reporte.diasConRegistros} día(s) con registros)\n`
      )
    );
  } catch (error) {
    console.log(chalk.red("Ocurrió un error inesperado al generar el reporte."));
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
          { name: "Registrar alimentos por día", value: "alimentos" },
          { name: "Reporte nutricional semanal", value: "reporte" },
          new inquirer.Separator(),
          { name: "Volver", value: "volver" },
        ],
      },
    ]);

    if (opcion === "crear") await crearPlanAlimentacion();
    if (opcion === "alimentos") await registrarAlimentos();
    if (opcion === "reporte") await verReporteSemanal();
    if (opcion === "volver") volver = true;
  }
}