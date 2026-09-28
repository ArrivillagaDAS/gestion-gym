export class Modelo {
  constructor(datos, esquema) {
    this.errores = [];
    this.validar(datos, esquema);
  }

  validar(datos, esquema) {
    for (const campo in esquema) {
      const regla = esquema[campo];
      let valor = datos[campo];

      // quita espacios al inicio y al final de los textos
      if (typeof valor === "string") {
        valor = valor.trim();
      }

      // campo obligatorio
      if (regla.requerido && (valor === undefined || valor === null || valor === "")) {
        this.errores.push(`El campo "${campo}" es obligatorio.`);
        continue;
      }

      // si es opcional y no vino, no hay nada mas que validar
      if (valor === undefined || valor === null || valor === "") continue;

      // tipo de dato, nan cuenta como numero invalido
      if (regla.tipo === "string" && typeof valor !== "string") {
        this.errores.push(`El campo "${campo}" debe ser texto.`);
      }
      if (regla.tipo === "number" && (typeof valor !== "number" || Number.isNaN(valor))) {
        this.errores.push(`El campo "${campo}" debe ser un número.`);
      }

      // formato con expresion regular
      if (regla.formato && !regla.formato.test(valor)) {
        this.errores.push(`El campo "${campo}" tiene un formato inválido.`);
      }

      // rango minimo y maximo
      if (regla.min !== undefined && valor < regla.min) {
        this.errores.push(`El campo "${campo}" debe ser mayor o igual a ${regla.min}.`);
      }
      if (regla.max !== undefined && valor > regla.max) {
        this.errores.push(`El campo "${campo}" debe ser menor o igual a ${regla.max}.`);
      }

      // valores permitidos
      if (regla.valores && !regla.valores.includes(valor)) {
        this.errores.push(`El campo "${campo}" debe ser uno de: ${regla.valores.join(", ")}.`);
      }

      this[campo] = valor;
    }
  }

  esValido() {
    return this.errores.length === 0;
  }
}