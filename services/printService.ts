
/**
 * Servicio de Impresión Híbrida - BarberOS Pro
 * Maneja la lógica de impresión para PC (Chrome/Edge) y Tablets (RawBT)
 */

export const printReceipt = async (elementId: string) => {
  const element = document.getElementById(elementId);
  if (!element) return;

  const isAndroid = /Android/i.test(navigator.userAgent);

  if (isAndroid) {
    // LÓGICA PARA RAWBT (TABLET)
    // Extraemos el texto del ticket o enviamos el HTML simplificado
    // RawBT prefiere texto plano con comandos ESC/POS o HTML simple
    const printContent = element.innerText || element.textContent || "";
    
    // Agregamos comandos básicos de formato para RawBT si es necesario
    // Para este caso, enviaremos el texto limpio con saltos de línea
    const base64Content = btoa(unescape(encodeURIComponent(printContent)));
    
    // Esquema URI de RawBT: rawbt:base64,DATA
    window.location.href = `rawbt:base64,${base64Content}`;
  } else {
    // LÓGICA PARA PC (KIOSK PRINTING)
    window.print();
  }
};
