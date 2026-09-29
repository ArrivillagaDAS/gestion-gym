import chalk from "chalk";
import { mostrarMenu } from "./commands/menu.js";

console.clear();
console.log(chalk.bold.cyan("========================================"));
console.log(chalk.bold.cyan("   Sistema de Gestión de Gimnasio"));
console.log(chalk.bold.cyan("========================================\n"));

mostrarMenu();