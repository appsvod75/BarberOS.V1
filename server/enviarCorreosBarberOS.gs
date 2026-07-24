/**
 * Script de Google Apps Script para BarberOS Pro
 * Maneja envío de:
 * 1. Tickets de venta a clientes
 * 2. Reportes de caja a administradores
 * 
 * INSTRUCCIONES:
 * 1. Crea un nuevo proyecto en Google Apps Script (script.google.com)
 * 2. Pega este código
 * 3. Despliega como Web App (Ejecutar como: YO, Acceso: Cualquiera)
 * 4. Copia la URL del webhook y pégala en el campo "webhookUrl" de la sucursal
 */

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const type = data.type; // 'ticket' o 'cashReport'
    
    if (type === 'ticket') {
      return sendTicketEmail(data);
    } else if (type === 'cashReport') {
      return sendCashReportEmail(data);
    } else {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Tipo de correo no especificado'
      })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================
// FUNCIÓN 1: ENVIAR TICKET DE VENTA AL CLIENTE
// ============================================================
function sendTicketEmail(data) {
  const email = data.email;
  const ticketData = data.ticketData;
  const branchName = data.branchName;
  
  if (!email || !ticketData) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Faltan datos del ticket'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  
  // Personalizar el asunto con el nombre del cliente
  let personalizedSubject = '';
  const fullName = ticketData.clientName || '';
  
  // Si el nombre no es algo genérico como "Cliente" o "Venta Directa"
  if (fullName && !['cliente', 'venta directa', 'n/a'].includes(fullName.toLowerCase())) {
    const firstName = fullName.split(' ')[0];
    personalizedSubject = `${firstName}, acá tienes tu `;
  } else {
    personalizedSubject = '';
  }

  const subject = `${personalizedSubject}🎫 Ticket de Venta - ${branchName} - ${ticketData.saleId}`;
  
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
        .container { max-width: 320px; margin: 5px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 10px; text-align: center; }
        .header h1 { margin: 0; font-size: 20px; }
        .content { padding: 15px; }
        .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; font-size: 11px; }
        .info-row:last-child { border-bottom: none; }
        .label { font-weight: 600; color: #555; }
        .value { color: #333; }
        .items-table { width: 100%; margin: 20px 0; border-collapse: collapse; }
        .items-table th { background: #f9f9f9; padding: 8px; text-align: left; font-weight: 600; border-bottom: 2px solid #667eea; font-size: 11px; }
        .items-table td { padding: 8px; border-bottom: 1px solid #eee; font-size: 11px; }
        .total-section { background: #f0f4ff; padding: 12px; border-radius: 8px; margin: 12px 0; font-size: 12px; }
        .total-row { display: flex; justify-content: space-between; padding: 5px 0; }
        .total-final { font-size: 18px; font-weight: bold; color: #667eea; border-top: 2px solid #667eea; padding-top: 8px; margin-top: 8px; }
        .footer { text-align: center; padding: 12px; background: #f9f9f9; color: #999; font-size: 10px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎫 Ticket de Venta</h1>
          <p style="margin: 5px 0 0 0;">${branchName}</p>
        </div>
        <div class="content">
          <div class="info-row">
            <span class="label">Ticket #:</span>
            <span class="value">${ticketData.saleId}</span>
          </div>
          <div class="info-row">
            <span class="label">Fecha:</span>
            <span class="value">${ticketData.date}</span>
          </div>
          <div class="info-row">
            <span class="label">Hora:</span>
            <span class="value">${ticketData.time}</span>
          </div>
          ${ticketData.barber ? `
          <div class="info-row">
            <span class="label">Atendido por:</span>
            <span class="value">${ticketData.barber}</span>
          </div>
          ` : ''}
          
          <h3 style="margin-top: 30px; color: #667eea;">Detalle de Servicios/Productos</h3>
          <table class="items-table">
            <thead>
              <tr>
                <th>Descripción</th>
                <th style="text-align: center;">Cant.</th>
                <th style="text-align: right;">Precio</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${ticketData.items.map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td style="text-align: center;">${item.quantity}</td>
                  <td style="text-align: right;">$${formatMoney(item.price)}</td>
                  <td style="text-align: right;">$${formatMoney(item.price * item.quantity)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="total-section">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>$${formatMoney(ticketData.subtotal)}</span>
            </div>
            ${ticketData.discount > 0 ? `
            <div class="total-row" style="color: green;">
              <span>${ticketData.pointsUsed > 0 ? 'DESC. CANJE PUNTOS' : 'Descuento'}:</span>
              <span>-$${formatMoney(ticketData.discount)}</span>
            </div>
            ` : ''}
            <div class="total-row total-final">
              <span>TOTAL:</span>
              <span>$${formatMoney(ticketData.total)}</span>
            </div>
          </div>
          
          ${ticketData.paymentMethod ? `
          <div class="info-row">
            <span class="label">Método de Pago:</span>
            <span class="value">${ticketData.paymentMethod}</span>
          </div>
          ` : ''}
        </div>
        <div class="footer">
          <p>¡Gracias por tu preferencia!</p>
          <p>Este es un correo automático generado por BarberOS Pro</p>
          <p>${new Date().toLocaleString('es-ES')}</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  MailApp.sendEmail({
    to: email,
    subject: subject,
    htmlBody: htmlBody
  });
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: 'Ticket enviado correctamente'
  })).setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// FUNCIÓN 2: ENVIAR REPORTE DE CAJA AL ADMINISTRADOR
// ============================================================
function sendCashReportEmail(data) {
  const email = data.email;
  const branchName = data.branchName;
  const reportData = data.reportData;
  
  if (!email || !reportData) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Faltan datos del reporte'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  const subject = `📊 Reporte de Caja - ${branchName} - ${reportData.date}`;
  
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
        .section { background: white; margin: 15px 0; padding: 15px; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .section-title { font-size: 18px; font-weight: bold; color: #667eea; margin-bottom: 10px; border-bottom: 2px solid #667eea; padding-bottom: 5px; }
        .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
        .row:last-child { border-bottom: none; }
        .label { font-weight: 600; color: #555; }
        .value { color: #333; }
        .total { font-size: 24px; font-weight: bold; color: #667eea; text-align: center; padding: 15px; background: #f0f4ff; border-radius: 6px; margin: 15px 0; }
        .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">💰 Reporte de Caja</h1>
          <p style="margin: 5px 0 0 0;">${branchName}</p>
        </div>
        <div class="content">
          <div class="section">
            <div class="section-title">📅 Información General</div>
            <div class="row">
              <span class="label">Fecha:</span>
              <span class="value">${reportData.date}</span>
            </div>
            <div class="row">
              <span class="label">Cajero:</span>
              <span class="value">${reportData.cashier || 'N/A'}</span>
            </div>
            <div class="row">
              <span class="label">Hora de Apertura:</span>
              <span class="value">${reportData.openTime || 'N/A'}</span>
            </div>
            <div class="row">
              <span class="label">Hora de Cierre:</span>
              <span class="value">${reportData.closeTime || 'N/A'}</span>
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">💵 Resumen de Caja</div>
            <div class="row">
              <span class="label">Monto de Apertura:</span>
              <span class="value">$${formatMoney(reportData.openingAmount)}</span>
            </div>
            <div class="row">
              <span class="label">Total Ventas:</span>
              <span class="value">$${formatMoney(reportData.totalSales)}</span>
            </div>
            <div class="row">
              <span class="label">Total Esperado:</span>
              <span class="value">$${formatMoney(reportData.expectedTotal)}</span>
            </div>
            ${reportData.actualTotal ? `
            <div class="row">
              <span class="label">Total Contado:</span>
              <span class="value">$${formatMoney(reportData.actualTotal)}</span>
            </div>
            <div class="row">
              <span class="label">Diferencia:</span>
              <span class="value" style="color: ${reportData.difference >= 0 ? 'green' : 'red'};">
                $${formatMoney(reportData.difference)}
              </span>
            </div>
            ` : ''}
          </div>
          
          ${reportData.paymentMethods ? `
          <div class="section">
            <div class="section-title">💳 Métodos de Pago</div>
            ${Object.entries(reportData.paymentMethods).map(([method, amount]) => `
              <div class="row">
                <span class="label">${method}:</span>
                <span class="value">$${formatMoney(amount)}</span>
              </div>
            `).join('')}
          </div>
          ` : ''}
          
          <div class="total">
            Total del Día: $${formatMoney(reportData.totalSales)}
          </div>
          
          <div class="footer">
            <p>Este es un correo automático generado por BarberOS Pro</p>
            <p>Fecha de envío: ${new Date().toLocaleString('es-ES')}</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
  
  MailApp.sendEmail({
    to: email,
    subject: subject,
    htmlBody: htmlBody
  });
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: 'Reporte enviado correctamente'
  })).setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// FUNCIÓN AUXILIAR: FORMATEAR DINERO
// ============================================================
function formatMoney(amount) {
  if (amount === null || amount === undefined) return '0.00';
  return parseFloat(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// ============================================================
// FUNCIÓN DE PRUEBA (OPCIONAL)
// ============================================================
function testTicketEmail() {
  const testData = {
    type: 'ticket',
    email: "tu-email@ejemplo.com", // Cambia esto
    branchName: "Sucursal Centro",
    ticketData: {
      saleId: "SALE-12345",
      date: "2025-12-24",
      time: "10:30 AM",
      barber: "Juan Pérez",
      items: [
        { name: "Corte de Cabello", quantity: 1, price: 15.00 },
        { name: "Afeitado", quantity: 1, price: 10.00 },
        { name: "Gel para Cabello", quantity: 1, price: 5.00 }
      ],
      subtotal: 30.00,
      discount: 3.00,
      total: 27.00,
      paymentMethod: "Efectivo"
    }
  };
  
  const e = { postData: { contents: JSON.stringify(testData) } };
  Logger.log(doPost(e).getContent());
}

function testCashReportEmail() {
  const testData = {
    type: 'cashReport',
    email: "tu-email@ejemplo.com", // Cambia esto
    branchName: "Sucursal Centro",
    reportData: {
      date: "2025-12-24",
      cashier: "María González",
      openTime: "09:00 AM",
      closeTime: "06:00 PM",
      openingAmount: 100.00,
      totalSales: 1250.50,
      expectedTotal: 1350.50,
      actualTotal: 1350.00,
      difference: -0.50,
      paymentMethods: {
        "Efectivo": 800.00,
        "Tarjeta": 400.50,
        "Transferencia": 50.00
      }
    }
  };
  
  const e = { postData: { contents: JSON.stringify(testData) } };
  Logger.log(doPost(e).getContent());
}
