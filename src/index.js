import chalk from "chalk";
import { pool } from "./config/database.js";
import { mostrarMenu } from "./commands/menu.js";

console.clear();
console.log(chalk.bold.cyan("========================================"));
console.log(chalk.bold.cyan("   Sistema de Gestión de Gimnasio"));
console.log(chalk.bold.cyan("========================================\n"));

try {
  await mostrarMenu();
} catch (error) {
  if (error.name === "ExitPromptError") {
    // el usuario cerro la aplicacion con Ctrl+C
    console.log(chalk.green("\n¡Hasta luego!"));
  } else {
    console.log(chalk.red("Error inesperado en la aplicación:"));
    console.log(chalk.gray(error.message));
    process.exitCode = 1;
  }
} finally {
  // sin cerrar el pool, el proceso queda abierto despues de salir del menu
  await pool.end();
}