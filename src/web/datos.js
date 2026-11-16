// convierte lo que llega del formulario web al formato que esperan los modelos
// es el equivalente web de utils/entrada.js: vacio se convierte en undefined
// para que el modelo lo trate como "no enviado"

export function texto(valor) {
  if (valor === undefined || valor === null) return undefined;
  const limpio = String(valor).trim();
  return limpio === "" ? undefined : limpio;
}

// acepta numeros o textos con coma decimal; un texto que no es numero queda como NaN
// para que el modelo responda "debe ser un número"
export function numero(valor) {
  if (valor === undefined || valor === null) return undefined;
  if (typeof valor === "number") return valor;
  const limpio = String(valor).trim().replace(",", ".");
  return limpio === "" ? undefined : Number(limpio);
}
