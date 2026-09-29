import inquirer from "inquirer";
import chalk from "chalk";
import { PlanService } from "../services/plan-service.js";

const service = new PlanService();

async function crearPlan() {
  const datos = await inquirer.prompt([
    { type: "input", name: "nombre", message: "Nombre del plan:", validate: (v) => v.trim() !== "" || "El nombre es obligatorio." },
    {
      type: "number",
      name: "duracion_semanas",
      message: "Duración en semanas:",
      validate: (v) => (typeof v === "number" && !Number.isNaN(v) && v >= 1) || "Escribe un número mayor o igual a 1.",
    },
    { type: "input", name: "metas_fisicas", message: "Metas físicas (opcional):" },
    {
      type: "select",
      name: "nivel",
      message: "Nivel:",
      choices: [
        { name: "Principiante", value: "principiante" },
        { name: "Intermedio", value: "intermedio" },
        { name: "Avanzado", value: "avanzado" },
      ],
    },
    {
      type: "number",
      name: "precio",
      message: "Precio:",
      validate: (v) => (typeof v === "number" && !Number.isNaN(v) && v >= 0) || "Escribe un número mayor o igual a 0.",
    },
  ]);

  if (!datos.metas_fisicas) {
    datos.metas_fisicas = null;
  }

  try {
    const resultado = await service.crear(datos);

    if (resultado.exito) {
      console.log(chalk.green(`Plan creado con éxito (id: ${resultado.id}).`));
    } else {
      console.log(chalk.red("No se pudo crear el plan:"));
      resultado.errores.forEach((e) => console.log(chalk.red(" - " + e)));
    }
  } catch (error) {
    console.log(chalk.red("Ocurrió un error inesperado al crear el plan."));
    console.log(chalk.gray(error.message));
  }
}

async function listarPlanes() {
  const planes = await service.listarTodos();

  if (planes.length === 0) {
    console.log(chalk.yellow("No hay planes registrados todavía."));
    return;
  }

  const filas = planes.map((p) => ({
    ID: p.id,
    Nombre: p.nombre,
    Semanas: p.duracion_semanas,
    Nivel: p.nivel,
    Precio: Number(p.precio).toFixed(2),
    Metas: p.metas_fisicas ?? "(sin metas)",
  }));

  console.table(filas);
}

export async function menuPlanes() {
  let volver = false;

  while (!volver) {
    const { opcion } = await inquirer.prompt([
      {
        type: "select",
        name: "opcion",
        message: chalk.cyan("Menú de Planes"),
        choices: [
          { name: "Crear plan", value: "crear" },
          { name: "Listar planes", value: "listar" },
          new inquirer.Separator(),
          { name: "Volver", value: "volver" },
        ],
      },
    ]);

    if (opcion === "crear") await crearPlan();
    if (opcion === "listar") await listarPlanes();
    if (opcion === "volver") volver = true;
  }
}