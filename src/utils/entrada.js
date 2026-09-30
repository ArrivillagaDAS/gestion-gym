// texto vacio se convierte en undefined para que el modelo lo trate como no enviado
export function textoOpcional(texto) {
  const limpio = texto.trim();
  return limpio === "" ? undefined : limpio;
}

// numero escrito por el usuario (acepta coma decimal), vacio se convierte en undefined
export function numeroOpcional(texto) {
  const limpio = texto.trim().replace(",", ".");
  return limpio === "" ? undefined : Number(limpio);
}