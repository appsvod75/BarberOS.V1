/**
 * Script de Google Apps Script para enviar Reporte de Caja por correo
 * 
 * INSTRUCCIONES:
 * 1. Crea un nuevo proyecto en Google Apps Script (script.google.com)
 * 2. Pega este código
 * 3. Despliega como Web App
 * 4. Copia la URL del webhook y pégala en el campo "webhookUrl" de la sucursal
 */

function doPost(e) {
  try {
    // Parsear los datos recibidos
    const data = JSON.parse(e.postData.contents);
    const email = data.email;
    const branchName = data.branchName;
    const reportData = data.reportData;
    
    // Validar que tengamos los datos necesarios
    if (!email || !reportData) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Faltan datos requeridos'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Construir el asunto del correo
    const subject = `📊 Reporte de Caja - ${branchName} - ${reportData.date}`;
    
    // Construir el cuerpo del correo en HTML
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
    
    // Enviar el correo
    MailApp.sendEmail({
      to: email,
      subject: subject,
      htmlBody: htmlBody
    });
    
    // Retornar éxito
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Correo enviado correctamente'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    // Retornar error
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Función auxiliar para formatear dinero
function formatMoney(amount) {
  if (amount === null || amount === undefined) return '0.00';
  return parseFloat(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Función de prueba (opcional)
function testEmail() {
  const testData = {
    email: "tu-email@ejemplo.com", // Cambia esto por tu email para probar
    branchName: "Sucursal Centro",
    reportData: {
      date: "2025-12-24",
      cashier: "Juan Pérez",
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
  
  const e = {
    postData: {
      contents: JSON.stringify(testData)
    }
  };
  
  Logger.log(doPost(e).getContent());
}
