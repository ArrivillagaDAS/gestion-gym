import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// funcion para generar la documentacion formal del proyecto
function generarPDF() {
  const doc = new PDFDocument({ margin: 50, autoFirstPage: true });
  // el PDF se guarda en la raiz del proyecto sin importar desde donde se ejecute el script
  const raizProyecto = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const rutaSalida = path.join(raizProyecto, "Planeacion_SCRUM.pdf");
  const stream = fs.createWriteStream(rutaSalida);

  doc.pipe(stream);

  // -------------------------------------------------------------
  // PAGINA 1: PORTADA FORMAL
  // -------------------------------------------------------------
  doc.moveDown(8);
  doc.fontSize(20).font("Helvetica-Bold").text("SISTEMA DE GESTIÓN DE GIMNASIO", { align: "center" });
  
  doc.moveDown(10);
  doc.fontSize(12).font("Helvetica-Bold").text("ANGELA SOFÍA ARRIVILLAGA", { align: "center" });
  doc.moveDown(1);
  doc.font("Helvetica").text("PROYECTO INDIVIDUAL - NODE.JS", { align: "center" });
  doc.moveDown(1);
  doc.font("Helvetica").text("DOCENTES CAMPUSLANDS", { align: "center" });

  doc.moveDown(10);
  doc.font("Helvetica-Bold").text("CAMPUSLANDS", { align: "center" });
  doc.font("Helvetica").text("SALÓN E-1", { align: "center" });
  doc.font("Helvetica").text("Guatemala", { align: "center" });
  doc.font("Helvetica").text("2026", { align: "center" });

  // -------------------------------------------------------------
  // PAGINA 2: DESARROLLO DEL DOCUMENTO
  // -------------------------------------------------------------
  doc.addPage();

  doc.fontSize(16).font("Helvetica-Bold").text("SISTEMA DE GESTIÓN DE GIMNASIO", { align: "center" });
  doc.moveDown(2);

  // 1. situacion problema
  doc.fontSize(13).font("Helvetica-Bold").text("1. SITUACIÓN PROBLEMA");
  doc.fontSize(10).font("Helvetica").text(
    "Actualmente, la gestión de gimnasios independientes se realiza mediante hojas de cálculo o registros manuales, lo que causa pérdidas de control en vigencias de contratos, falta de seguimiento en el progreso físico, desconexión con planes de nutrición y errores en los balances financieros. Para solucionarlo, se desarrolló una aplicación CLI en Node.js y MySQL que centraliza clientes, contratos automáticos, nutrición, seguimiento y finanzas con transacciones reales."
  );
  doc.moveDown(1.5);

  // 2. levantamiento de requerimientos
  doc.fontSize(13).font("Helvetica-Bold").text("2. LEVANTAMIENTO DE REQUERIMIENTOS");
  doc.fontSize(10).font("Helvetica").text(
    "Se identificaron las necesidades operativas de un centro deportivo, priorizando la consistencia de datos (transacciones ACID) y la usabilidad en consola mediante arquitectura en capas."
  );
  doc.moveDown(1.5);

  // 3. requerimientos
  doc.fontSize(13).font("Helvetica-Bold").text("3. REQUERIMIENTOS");
  doc.fontSize(11).font("Helvetica-Bold").text("3.1. Requerimientos Funcionales");
  doc.fontSize(10).font("Helvetica").text(
    "- RF01: CRUD de Clientes con validaciones.\n" +
    "- RF02: Gestión de Planes de entrenamiento.\n" +
    "- RF03: Contratos automáticos mediante Factory.\n" +
    "- RF04: Seguimiento físico cronológico.\n" +
    "- RF05: Nutrición y registro alimenticio diario.\n" +
    "- RF06: Finanzas y transacciones de pagos."
  );
  doc.moveDown(1);
  
  doc.fontSize(11).font("Helvetica-Bold").text("3.2. Requerimientos No Funcionales");
  doc.fontSize(10).font("Helvetica").text(
    "- RNF01: Node.js con ES Modules.\n" +
    "- RNF02: Base de datos MySQL (mysql2).\n" +
    "- RNF03: Aplicación de POO, SOLID, Repository y Factory.\n" +
    "- RNF04: Interfaz CLI interactiva con inquirer y chalk."
  );
  doc.moveDown(1.5);

  // 4. historias de usuario
  doc.fontSize(13).font("Helvetica-Bold").text("4. HISTORIAS DE USUARIO CON CRITERIOS DE ACEPTACIÓN");
  doc.moveDown(1);

  // formato de tabla para hu1
  dibujarTablaHU(doc, {
    prioridad: "Alta",
    codigo: "RF01",
    actor: "Entrenador / Administrador",
    nombre: "Registro y gestión de clientes",
    descripcion: "Como entrenador quiero registrar clientes para gestionar su historial personal y físico.",
    funcionalidad: "Permite agregar, editar, listar y eliminar clientes validando datos obligatorios.",
    criterios: [
      "1. El sistema debe validar que el correo electrónico sea único.",
      "2. Permite actualizar teléfono y correo electrónico.",
      "3. Permite la eliminación física, impidiéndola si el cliente tiene contratos o movimientos asociados."
    ]
  });

  doc.moveDown(1.5);

  // formato de tabla para hu2
  dibujarTablaHU(doc, {
    prioridad: "Alta",
    codigo: "RF03",
    actor: "Entrenador",
    nombre: "Asignación de plan con contrato automático",
    descripcion: "Como entrenador quiero asignar un plan a un cliente para generar un contrato automático.",
    funcionalidad: "Genera la relación entre cliente y plan aplicando el patrón Factory y transacciones MySQL.",
    criterios: [
      "1. El sistema genera el contrato de forma automática usando ContratoFactory.",
      "2. Debe asegurar atomicidad en la base de datos (Transacción).",
      "3. Registra la vigencia del contrato (fecha de inicio y de fin) según la duración del plan."
    ]
  });

  // -------------------------------------------------------------
  // PAGINA 3: METODOLOGIA Y SPRINTS
  // -------------------------------------------------------------
  doc.addPage();

  // 5. metodologia y sprints
  doc.fontSize(13).font("Helvetica-Bold").text("5. METODOLOGÍA Y PLANIFICACIÓN DE SPRINTS");
  doc.fontSize(10).font("Helvetica").text(
    "El proyecto fue desarrollado adaptando el marco SCRUM a un entorno individual de 7 Sprints en GitHub Projects (Kanban):"
  );
  doc.moveDown(1);

  const sprints = [
    { titulo: "Sprint 0: Configuración Inicial", tareas: ["[S0] Instalar Node.js, Git y MySQL", "[S0] Crear estructura de carpetas", "[S0] Configurar .env y .gitignore", "[S0] Conectar Node con MySQL (Pool)", "[S0] Crear repositorio en GitHub"] },
    { titulo: "Sprint 1: Base de Datos y Modelos", tareas: ["[S1] Diseñar diagrama entidad-relación", "[S1] Crear script SQL", "[S1] Crear modelos base y entidades", "[S1] Configurar menú interactivo CLI"] },
    { titulo: "Sprint 2: Clientes", tareas: ["[S2] Crear ClienteRepository", "[S2] Crear ClienteService con reglas de negocio", "[S2] Implementar comandos CRUD de clientes"] },
    { titulo: "Sprint 3: Planes y Contratos", tareas: ["[S3] Crear PlanRepository y PlanService", "[S3] Crear ContratoFactory", "[S3] Transacción de asignación y renovaciones"] },
    { titulo: "Sprint 4: Seguimiento Físico", tareas: ["[S4] Registrar avance semanal", "[S4] Consultar historial cronológico", "[S4] Rollback ante eliminación de avance"] },
    { titulo: "Sprint 5: Nutrición", tareas: ["[S5] Crear plan alimenticio", "[S5] Registrar consumo diario de calorías", "[S5] Consultar reporte nutricional"] },
    { titulo: "Sprint 6: Finanzas", tareas: ["[S6] Registrar ingresos y egresos", "[S6] Transacción en registro de mensualidades", "[S6] Consultar balance financiero"] },
    { titulo: "Sprint 7: Cierre y Entrega", tareas: ["[S7] Aplicación de principios SOLID", "[S7] Documentación README y PDF", "[S7] Grabación de video de presentación"] }
  ];

  sprints.forEach((s) => {
    doc.fontSize(10).font("Helvetica-Bold").text(s.titulo);
    s.tareas.forEach((t) => {
      doc.fontSize(9).font("Helvetica").text(`  • ${t}`);
    });
    doc.moveDown(0.5);
  });

  doc.moveDown(1);

  // 6. evidencias
  doc.fontSize(13).font("Helvetica-Bold").text("6. EVIDENCIA DE PLANTEAMIENTO DE PLATAFORMA DE TRABAJO");
  doc.fontSize(10).font("Helvetica").text(
    "- Repositorio GitHub con flujo de trabajo Feature Branching y Conventional Commits.\n" +
    "- Tablero Kanban con trazabilidad de Issues por Sprint.\n" +
    "- Video demostrativo de funcionalidad de la aplicación CLI."
  );
  doc.moveDown(1.5);

  // 7. conclusiones
  doc.fontSize(13).font("Helvetica-Bold").text("7. CONCLUSIONES");
  doc.fontSize(10).font("Helvetica").text(
    "1. La separación de responsabilidades facilitó la extensibilidad del sistema.\n" +
    "2. Las transacciones de MySQL garantizaron la integridad operacional en módulos críticos."
  );

  doc.end();

  stream.on("finish", () => {
    console.log("✔ Archivo 'Planeacion_SCRUM.pdf' generado con éxito.");
  });
}

// funcion auxiliar para dibujar la tabla de historias de usuario
function dibujarTablaHU(doc, hu) {
  const startX = doc.x;
  let startY = doc.y;

  doc.fontSize(9).font("Helvetica-Bold").text(`HISTORIA DE USUARIO`, startX, startY);
  doc.moveDown(0.3);

  doc.font("Helvetica-Bold").text(`Prioridad: `, { continued: true }).font("Helvetica").text(`${hu.prioridad}   `, { continued: true });
  doc.font("Helvetica-Bold").text(`CÓDIGO: `, { continued: true }).font("Helvetica").text(`${hu.codigo}   `, { continued: true });
  doc.font("Helvetica-Bold").text(`Actor: `, { continued: true }).font("Helvetica").text(`${hu.actor}`);
  
  doc.font("Helvetica-Bold").text(`NOMBRE: `, { continued: true }).font("Helvetica").text(`${hu.nombre}`);
  
  doc.font("Helvetica-Bold").text(`Descripción:`);
  doc.font("Helvetica").text(hu.descripcion);
  
  doc.font("Helvetica-Bold").text(`Funcionalidad:`);
  doc.font("Helvetica").text(hu.funcionalidad);
  
  doc.font("Helvetica-Bold").text(`Criterios de aceptación:`);
  hu.criterios.forEach(c => doc.font("Helvetica").text(c));
}

// ejecutar la funcion
generarPDF();