import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mysql from 'mysql2/promise';
import cors from 'cors';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST", "PUT", "DELETE"] }
});

// Cache global de configuración para envíos rápidos (config_init)
let currentConfig = {};

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Pool de conexiones a MySQL
const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'barberos_db',
    waitForConnections: true,
    connectionLimit: 20,
    queueLimit: 0
});

// =================================================================
// HELPERS & BROADCAST
// =================================================================

const broadcastTickets = async (branchId) => {
    try {
        const [rows] = await db.query(
            "SELECT * FROM tickets WHERE branch_id = ? AND status IN ('waiting', 'serving') ORDER BY created_at ASC",
            [branchId]
        );
        io.to(`branch_${branchId}`).emit('tickets_update', rows);
    } catch (e) { console.error("Error broadcast:", e); }
};

// =================================================================
// AUTH & SYNC (EL CORAZÓN)
// =================================================================

app.post('/api/login', async (req, res) => {
    const { pin } = req.body;
    try {
        const [rows] = await db.query("SELECT * FROM users WHERE pin = ? AND active = 1", [pin]);
        if (rows.length > 0) res.json({ success: true, user: rows[0] });
        else res.status(401).json({ success: false, message: "PIN inválido" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/sync', async (req, res) => {
    const { branchId } = req.query;
    try {
        const [branches] = await db.query("SELECT * FROM branches");
        const [users] = await db.query("SELECT * FROM users");
        const [clients] = await db.query("SELECT * FROM clients");

        // Catálogo con nombres de categoría
        const [catalog] = await db.query(`
            SELECT c.*, cat.name as category 
            FROM catalog c 
            LEFT JOIN categories cat ON c.category_id = cat.id
        `);

        const [stocks] = await db.query("SELECT * FROM branch_stock");
        const [plans] = await db.query("SELECT * FROM monthly_plans");
        const [playlist] = await db.query("SELECT * FROM video_playlist ORDER BY sort_order");
        const [config] = await db.query("SELECT * FROM app_config LIMIT 1");
        const [promotions] = await db.query("SELECT * FROM promotions");
        const [appts] = await db.query("SELECT * FROM appointments WHERE date >= CURDATE()");
        const [movements] = await db.query(`
            SELECT m.*, i.name as item_name 
            FROM inventory_movements m 
            LEFT JOIN catalog i ON m.item_id = i.id 
            ORDER BY m.date DESC LIMIT 200
        `);

        // Sesiones de caja
        let cashSession = null;
        const [allSessions] = await db.query(
            "SELECT * FROM cash_sessions ORDER BY opened_at DESC LIMIT 500"
        );

        cashSession = allSessions.find(s => s.closed_at === null) || null;
        const cashClosures = allSessions.filter(s => s.closed_at !== null);

        const [sales] = await db.query("SELECT * FROM sales ORDER BY timestamp DESC LIMIT 1000");
        const [saleItems] = await db.query("SELECT * FROM sale_items");
        const [payments] = await db.query("SELECT * FROM payments");

        const salesWithDetail = sales.map(s => ({
            ...s,
            items: saleItems.filter(i => i.sale_id === s.id),
            payments: payments.filter(p => p.sale_id === s.id)
        }));

        res.json({
            branches, users, clients, catalog, stocks,
            monthlyPlans: plans,
            videoPlaylist: playlist,
            config: config[0] || {},
            promotions,
            appointments: appts,
            inventoryMovements: movements,
            sales: salesWithDetail,
            cashSession,
            cashClosures
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// =================================================================
// GESTIÓN DE TICKETS (COLA)
// =================================================================

app.get('/api/tickets', async (req, res) => {
    const { branchId } = req.query;
    try {
        const [rows] = await db.query(
            "SELECT * FROM tickets WHERE branch_id = ? AND status IN ('waiting', 'serving') ORDER BY created_at ASC",
            [branchId]
        );
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/tickets', async (req, res) => {
    const t = req.body;
    try {
        await db.query(
            "INSERT INTO tickets (id, branch_id, sequence_number, full_code, type, client_name, client_id, status) VALUES (?,?,?,?,?,?,?,?)",
            [t.id, t.branchId, t.sequenceNumber, t.fullCode, t.type, t.clientName, t.clientId, 'waiting']
        );
        broadcastTickets(t.branchId);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/tickets/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status, barberId, chair } = req.body;
    try {
        const [ticket] = await db.query("SELECT branch_id FROM tickets WHERE id = ?", [id]);
        await db.query(
            "UPDATE tickets SET status = ?, barber_id = ?, chair = ? WHERE id = ?",
            [status, barberId, chair, id]
        );
        if (ticket.length > 0) broadcastTickets(ticket[0].branch_id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// =================================================================
// VENTAS & TRANSACCIONES POS
// =================================================================

app.post('/api/sales', async (req, res) => {
    const s = req.body;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Insertar Venta (Intento Robusto)
        try {
            await connection.query(
                "INSERT INTO sales (id, branch_id, ticket_id, client_id, barber_id, subtotal, discount, total, timestamp, points_earned, points_used, applied_promotion_id) VALUES (?,?,?,?,?,?,?,?, NOW(), ?,?,?)",
                [s.id, s.branchId, s.ticketId, s.clientId, s.barberId, s.subtotal, s.discount, s.total, s.pointsEarned || 0, s.pointsUsed || 0, s.appliedPromotionId]
            );
        } catch (sqlErr) {
            console.warn("Error en INSERT completo, intentando versión simplificada:", sqlErr.message);
            // Si el error es de columna inexistente (ER_BAD_FIELD_ERROR o similar), intentamos sin campos de fidelidad
            await connection.query(
                "INSERT INTO sales (id, branch_id, ticket_id, client_id, barber_id, subtotal, discount, total, timestamp) VALUES (?,?,?,?,?,?,?,?, NOW())",
                [s.id, s.branchId, s.ticketId, s.clientId, s.barberId, s.subtotal, s.discount, s.total]
            );
        }

        // 2. Items e Inventario
        for (const item of s.items) {
            await connection.query(
                "INSERT INTO sale_items (sale_id, item_id, name, price, quantity) VALUES (?,?,?,?,?)",
                [s.id, item.itemId, item.name, item.price, item.quantity]
            );

            // Si es producto, descontar stock. Si es combo, descontar sus sub-items.
            const [catalogItem] = await connection.query("SELECT type, combo_definition FROM catalog WHERE id = ?", [item.itemId]);

            if (catalogItem.length > 0) {
                const type = catalogItem[0].type;

                const deductStock = async (itmId, qtyToDeduct) => {
                    try {
                        // 1. Actualizar Stock (Permitir negativo si es necesario)
                        await connection.query(
                            "UPDATE branch_stock SET stock = stock - ? WHERE branch_id = ? AND item_id = ?",
                            [qtyToDeduct, s.branchId, itmId]
                        );

                        // 2. Registrar Movimiento en Kardex
                        // Obtener stock actual para el registro
                        const [stockRes] = await connection.query("SELECT stock FROM branch_stock WHERE branch_id = ? AND item_id = ?", [s.branchId, itmId]);
                        const finalStock = stockRes.length > 0 ? stockRes[0].stock : 0;

                        // ID generado en JS para compatibilidad
                        const movId = crypto.randomUUID();

                        await connection.query(
                            "INSERT INTO inventory_movements (id, branch_id, item_id, type, quantity, reason, date, new_stock, unit_cost, related_branch_id) VALUES (?, ?, ?, 'sale', ?, ?, NOW(), ?, (SELECT cost FROM catalog WHERE id = ?), NULL)",
                            [movId, s.branchId, itmId, qtyToDeduct, `Venta Ticket #${s.ticketId || 'POS'}`, finalStock, itmId]
                        );
                    } catch (stockErr) {
                        console.error("Error descontando stock (No crítico para venta):", stockErr);
                        // IMPORTANTE: No lanzamos error para que la venta SE GUARDE aunque el inventario falle.
                    }
                };

                if (type === 'product') {
                    await deductStock(item.itemId, item.quantity);
                } else if (type === 'combo') {
                    // Descontar componentes del combo
                    const def = catalogItem[0].combo_definition; // Ya viene parseado si el driver lo soporta o es JSON type? Mysql2 suele devolver string si es TEXT/JSON field no configurado.
                    // En el sync lo parseamos manualmente, aquí puede venir como string o objeto.
                    let comboIds = [];
                    try {
                        if (!def) {
                            comboIds = [];
                        } else if (typeof def === 'string') {
                            comboIds = JSON.parse(def);
                        } else if (Array.isArray(def)) {
                            comboIds = def;
                        } else if (typeof def === 'object') {
                            // Si es objeto pero no array (ej: wrapper raro), intentamos convertirlo o asumir vacío
                            comboIds = Object.values(def); // Risky? Better to default to empty if not array.
                            if (!Array.isArray(comboIds)) comboIds = [];
                        }
                    } catch (e) { comboIds = []; }

                    if (Array.isArray(comboIds)) {
                        for (const subItem of comboIds) {
                            // Soporte para array de strings ["id1"] o objetos [{id: "id1"}]
                            const subId = typeof subItem === 'object' && subItem.id ? subItem.id : subItem;

                            // Verificar si el sub-item es producto para descontarlo
                            const [subItemInfo] = await connection.query("SELECT type, name FROM catalog WHERE id = ?", [subId]);
                            if (subItemInfo.length > 0 && subItemInfo[0].type === 'product') {
                                console.log(`[COMBO] Descontando componente ${subItemInfo[0].name} del combo ${item.name}`);
                                await deductStock(subId, item.quantity);
                            } else {
                                console.warn(`[COMBO] Item ${subId} no encontrado o no es producto.`);
                            }
                        }
                    } else {
                        console.warn(`[COMBO] Definición inválida/vacía para ${item.name}:`, comboIds);
                    }
                }
            }
        }

        // 3. Pagos
        for (const p of s.payments) {
            await connection.query(
                "INSERT INTO payments (sale_id, method, amount) VALUES (?,?,?)",
                [s.id, p.method, p.amount]
            );
        }

        // 4. Actualizar Ticket y Puntos
        if (s.ticketId) {
            await connection.query("UPDATE tickets SET status = 'completed' WHERE id = ?", [s.ticketId]);
            broadcastTickets(s.branchId);
        }

        if (s.clientId) {
            const pointsChange = (s.pointsEarned || 0) - (s.pointsUsed || 0);
            try {
                await connection.query(
                    "UPDATE clients SET points = points + ?, visits = visits + 1 WHERE id = ?",
                    [pointsChange, s.clientId]
                );
            } catch (pErr) {
                console.warn("Fallo al actualizar puntos:", pErr.message);
            }
        }

        await connection.commit();
        res.json({ success: true });
    } catch (e) {
        await connection.rollback();
        console.error("Critical Sale Error:", e);
        res.status(500).json({ error: e.message });
    } finally {
        connection.release();
    }
});

// =================================================================
// GESTIÓN DE INVENTARIO (KARDEX & STOCK)
// =================================================================

app.post('/api/inventory-movements', async (req, res) => {
    const m = req.body;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Obtener stock previo
        const [currStock] = await connection.query(
            "SELECT stock FROM branch_stock WHERE branch_id = ? AND item_id = ?",
            [m.branchId, m.itemId]
        );
        const prev = currStock.length > 0 ? currStock[0].stock : 0;

        // Calcular nuevo stock basado en tipo
        let delta = m.quantity;
        if (['adjustment_out', 'transfer_out', 'sale'].includes(m.type)) delta = -m.quantity;
        const next = prev + delta;

        // Registrar Movimiento
        await connection.query(
            "INSERT INTO inventory_movements (id, branch_id, item_id, type, quantity, unit_cost, previous_stock, new_stock, reason, related_branch_id, status) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
            [m.id, m.branchId, m.itemId, m.type, m.quantity, m.unitCost, prev, next, m.reason, m.relatedBranchId || null, m.status || 'completed']
        );

        // Actualizar tabla de stock maestra (Upsert)
        await connection.query(
            "INSERT INTO branch_stock (id, branch_id, item_id, stock, average_cost) VALUES (UUID(), ?,?,?,?) ON DUPLICATE KEY UPDATE stock = ?, average_cost = ?",
            [m.branchId, m.itemId, next, m.unitCost, next, m.unitCost]
        );

        await connection.commit();
        res.json({ success: true });
    } catch (e) {
        await connection.rollback();
        res.status(500).json({ error: e.message });
    } finally {
        connection.release();
    }
});

// =================================================================
// ADMINISTRACIÓN (CRUD MAESTRO)
// =================================================================

// CLIENTES
app.post('/api/clients', async (req, res) => {
    const c = req.body;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Insertar Cliente
        await connection.query(
            "INSERT INTO clients (id, name, phone, email, birth_date, referred_by, notes) VALUES (?,?,?,?,?,?,?)",
            [c.id, c.name, c.phone, c.email, c.birthDate, c.referredBy, c.notes]
        );

        // 2. Manejar Bono de Referencia (Si aplica)
        if (c.referredBy) {
            const [configRows] = await connection.query("SELECT loyalty_referral_bonus, loyalty_enabled FROM app_config LIMIT 1");
            if (configRows.length > 0 && configRows[0].loyalty_enabled) {
                const bonus = configRows[0].loyalty_referral_bonus || 0;
                if (bonus > 0) {
                    await connection.query(
                        "UPDATE clients SET points = points + ? WHERE id = ?",
                        [bonus, c.referredBy]
                    );
                    console.log(`[LOYALTY] Bono de ${bonus} PTS asignado al referente ${c.referredBy}`);
                }
            }
        }

        await connection.commit();
        res.json({ success: true });
    } catch (e) {
        if (connection) await connection.rollback();
        res.status(500).json({ error: e.message });
    } finally {
        if (connection) connection.release();
    }
});

app.put('/api/clients/:id', async (req, res) => {
    const { id } = req.params;
    const c = req.body;
    try {
        await db.query(
            "UPDATE clients SET name=?, phone=?, email=?, birth_date=?, notes=? WHERE id=?",
            [c.name, c.phone, c.email, c.birthDate, c.notes, id]
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// USUARIOS / STAFF
app.post('/api/users', async (req, res) => {
    const u = req.body;
    try {
        await db.query(
            "INSERT INTO users (id, name, username, role, pin, branch_id, can_do_pos, active) VALUES (?,?,?,?,?,?,?,?)",
            [u.id, u.name, u.username, u.role, u.pin, u.branchId, u.canDoPos, true]
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const u = req.body;
    try {
        await db.query(
            "UPDATE users SET name=?, username=?, role=?, pin=?, branch_id=?, can_do_pos=?, active=? WHERE id=?",
            [u.name, u.username, u.role, u.pin, u.branchId, u.canDoPos, u.active, id]
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query("DELETE FROM users WHERE id = ?", [id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});


// CATÁLOGO
app.post('/api/catalog', async (req, res) => {
    const i = req.body;
    try {
        await db.query(
            "INSERT INTO catalog (id, name, type, price, category_id, active, combo_definition) VALUES (?,?,?,?,?,?,?)",
            [i.id, i.name, i.type, i.price, i.categoryId, true, JSON.stringify(i.comboDefinition)]
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/catalog/:id', async (req, res) => {
    const { id } = req.params;
    const i = req.body;
    try {
        await db.query(
            "UPDATE catalog SET name=?, type=?, price=?, category_id=?, active=?, combo_definition=? WHERE id=?",
            [i.name, i.type, i.price, i.categoryId, i.active, JSON.stringify(i.comboDefinition), id]
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/catalog/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query("DELETE FROM catalog WHERE id = ?", [id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});


// SUCURSALES
app.post('/api/branches', async (req, res) => {
    const b = req.body;
    try {
        await db.query(
            "INSERT INTO branches (id, name, address, phone, email, webhook_url, report_email, active, has_reception, default_monthly_goal, default_working_days, default_product_goal_percent, auto_close_time, auto_close_enabled) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            [b.id, b.name, b.address, b.phone, b.email, b.webhookUrl, b.reportEmail, b.active, b.hasReception, b.defaultMonthlyGoal, b.defaultWorkingDays, b.defaultProductGoalPercent, b.autoCloseTime || '22:00:00', b.autoCloseEnabled ? 1 : 0]
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/branches/:id', async (req, res) => {
    const { id } = req.params;
    const b = req.body;
    try {
        await db.query(
            "UPDATE branches SET name=?, address=?, phone=?, email=?, webhook_url=?, report_email=?, active=?, has_reception=?, default_monthly_goal=?, default_working_days=?, default_product_goal_percent=?, auto_close_time=?, auto_close_enabled=? WHERE id=?",
            [b.name, b.address, b.phone, b.email, b.webhookUrl, b.reportEmail, b.active, b.hasReception, b.defaultMonthlyGoal, b.defaultWorkingDays, b.defaultProductGoalPercent, b.autoCloseTime || '22:00:00', b.autoCloseEnabled ? 1 : 0, id]
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PLANES MENSUALES (Upsert)
app.post('/api/monthly-plans', async (req, res) => {
    const p = req.body;
    try {
        await db.query(
            "INSERT INTO monthly_plans (id, branch_id, month, year, goal, working_days, product_goal_percent) VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE goal=?, working_days=?, product_goal_percent=?",
            [p.id, p.branchId, p.month, p.year, p.goal, p.workingDays, p.productGoalPercent, p.goal, p.workingDays, p.productGoalPercent]
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});



// PROMOCIONES
app.post('/api/promotions', async (req, res) => {
    const p = req.body;
    try {
        await db.query(
            "INSERT INTO promotions (id, name, type, value, trigger_type, days_active, hour_start, hour_end, start_date, end_date, apply_to, specific_item_id, active) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
            [p.id, p.name, p.type, p.value, p.trigger, JSON.stringify(p.daysActive), p.hourStart, p.hourEnd, p.startDate, p.endDate, p.applyTo, p.specificItemId, true]
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/promotions/:id', async (req, res) => {
    const { id } = req.params;
    const p = req.body;
    try {
        await db.query(
            "UPDATE promotions SET name=?, type=?, value=?, trigger_type=?, days_active=?, hour_start=?, hour_end=?, start_date=?, end_date=?, apply_to=?, specific_item_id=?, active=? WHERE id=?",
            [p.name, p.type, p.value, p.trigger, JSON.stringify(p.daysActive), p.hourStart, p.hourEnd, p.startDate, p.endDate, p.applyTo, p.specificItemId, p.active, id]
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/promotions/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query("DELETE FROM promotions WHERE id = ?", [id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// AGENDA
app.post('/api/appointments', async (req, res) => {
    const a = req.body;
    try {
        await db.query(
            "INSERT INTO appointments (id, branch_id, client_name, client_phone, date, time, barber_id, service_type, notes) VALUES (?,?,?,?,?,?,?,?,?)",
            [a.id, a.branchId, a.clientName, a.clientPhone, a.date, a.time, a.barberId, a.serviceType, a.notes]
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/appointments/:id', async (req, res) => {
    const { id } = req.params;
    const a = req.body;
    try {
        await db.query(
            "UPDATE appointments SET client_name=?, client_phone=?, date=?, time=?, barber_id=?, service_type=?, notes=? WHERE id=?",
            [a.clientName, a.clientPhone, a.date, a.time, a.barberId, a.serviceType, a.notes, id]
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/appointments/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query("DELETE FROM appointments WHERE id = ?", [id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});


// CONFIGURACIÓN GLOBAL
app.put('/api/config', async (req, res) => {
    const c = req.body;
    console.log("📥 [CONFIG] Recibida petición de actualización:", JSON.stringify(c).substring(0, 200) + "...");
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 0. Asegurar que existe la fila id=1
        const [configCheck] = await connection.query("SELECT id FROM app_config WHERE id=1");
        if (configCheck.length === 0) {
            console.log("🧪 [DB] No existe id=1 en app_config. Insertando default...");
            await connection.query("INSERT INTO app_config (id) VALUES (1)");
        }

        // 1. Actualizar app_config (Casi todas las columnas)
        const [updateResult] = await connection.query(
            "UPDATE app_config SET salon_name=?, salon_address=?, salon_phone=?, ticket_footer=?, logo_url=?, ticker_message=?, ticker_speed=?, youtube_video_id=?, webhook_url=?, ticket_size=? WHERE id=1",
            [
                c.salonName || '',
                c.salonAddress || '',
                c.salonPhone || '',
                c.ticketFooter || '',
                c.logoUrl || '',
                c.tickerMessage || '',
                c.tickerSpeed || 20,
                c.youtubeVideoId || '',
                c.webhookUrl || '',
                c.ticketSize || '80mm'
            ]
        );
        console.log("✅ [DB] app_config actualizada. Filas afectadas:", updateResult.affectedRows);

        // 2. Sincronizar video_playlist
        const playlistToSend = c.videoPlaylist || c.playlist;
        console.log("📺 [DB] Analizando playlist para sincronizar. Items:", playlistToSend ? (Array.isArray(playlistToSend) ? playlistToSend.length : 'no es array') : 'null/undefined');

        if (playlistToSend !== undefined && Array.isArray(playlistToSend)) {
            console.log("🧹 [DB] Ejecutando DELETE FROM video_playlist...");
            const [delResult] = await connection.query("DELETE FROM video_playlist");
            console.log(`✅ [DB] Delete completado. Removidos: ${delResult.affectedRows}`);

            for (let i = 0; i < playlistToSend.length; i++) {
                const v = playlistToSend[i];
                const type = (v.type === 'youtube' || v.type === 'mp4' || v.type === 'file' || v.type === 'link') ? v.type : 'link';

                await connection.query(
                    "INSERT INTO video_playlist (id, name, url, type, sort_order) VALUES (?, ?, ?, ?, ?)",
                    [
                        v.id || (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)),
                        v.name || 'Sin nombre',
                        v.url || '',
                        type,
                        i
                    ]
                );
            }
            console.log("✅ [DB] video_playlist sincronizada.");
        }

        await connection.commit();
        console.log("🏁 [DB] TRANSACCIÓN FINALIZADA CON ÉXITO.");

        // Actualizar caché en memoria y notificar a todos
        const newMemoryConfig = {
            ...currentConfig,
            ...c,
            videoPlaylist: playlistToSend || currentConfig.videoPlaylist || []
        };
        currentConfig = newMemoryConfig;
        io.emit('config_update', currentConfig);

        res.json({ success: true });
    } catch (e) {
        if (connection) {
            console.log("⛔ [DB] Ejecutando ROLLBACK debido a error.");
            await connection.rollback();
        }
        console.error("❌ [ERROR_FATAL] Error en PUT /api/config:", e);
        res.status(500).json({ error: e.message });
    } finally {
        if (connection) connection.release();
    }
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date(), version: '1.0.1-debug' });
});

// =================================================================
// SESIONES DE CAJA
// =================================================================

app.get('/api/cash-session', async (req, res) => {
    const { branchId } = req.query;
    try {
        const [rows] = await db.query(
            "SELECT * FROM cash_sessions WHERE branch_id = ? AND closed_at IS NULL LIMIT 1",
            [branchId]
        );
        res.json(rows[0] || null);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/cash-session', async (req, res) => {
    const s = req.body;
    try {
        await db.query(
            "INSERT INTO cash_sessions (id, branch_id, opening_amount, opened_by) VALUES (?,?,?,?)",
            [s.id, s.branchId, s.openingAmount, s.openedBy]
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/cash-session/:id/close', async (req, res) => {
    const { id } = req.params;
    const s = req.body;
    try {
        await db.query(`
            UPDATE cash_sessions 
            SET closed_at = NOW(),
                total_sales = ?,
                total_cash = ?,
                total_card = ?,
                total_transfer = ?,
                total_bitcoin = ?,
                services_total = ?,
                products_total = ?,
                combos_total = ?,
                operations_count = ?
            WHERE id = ?`,
            [
                s.totalSales || 0,
                s.totalCash || 0,
                s.totalCard || 0,
                s.totalTransfer || 0,
                s.totalBitcoin || 0,
                s.servicesTotal || 0,
                s.productsTotal || 0,
                s.combosTotal || 0,
                s.operationsCount || 0,
                id
            ]
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// =================================================================
// SOCKET CONEXIÓN
// =================================================================

io.on('connection', (socket) => {
    console.log(`🔌 [SOCKET] Cliente conectado: ${socket.id}`);

    // Enviar configuración actual al conectar (config_init)
    socket.emit('config_init', currentConfig);

    socket.on('join_branch', (branchId) => {
        socket.join(`branch_${branchId}`);
    });
});

// =================================================================
// ENVÍO DE REPORTE DE CAJA POR CORREO
// =================================================================

// =================================================================
// ADMIN RESET & AUTOMATION
// =================================================================

// 1. Asegurar columnas de automatización en branches
(async () => {
    try {
        // MIGRACIONES DE APP_CONFIG
        console.log("🛠️ [BOOT] Verificando esquema de app_config...");
        const [configCols] = await db.query("SHOW COLUMNS FROM app_config");
        const existingConfigCols = configCols.map(c => c.Field);

        const migrations = [
            { col: 'webhook_url', type: 'TEXT' },
            { col: 'ticket_size', type: "VARCHAR(10) DEFAULT '80mm'" },
            { col: 'logo_url', type: 'LONGTEXT' },
            { col: 'youtube_video_id', type: "VARCHAR(100) DEFAULT '5qap5aO4i9A'" },
            { col: 'video_source', type: "VARCHAR(20) DEFAULT 'youtube'" },
            { col: 'salon_address', type: 'TEXT' },
            { col: 'salon_phone', type: 'VARCHAR(50)' },
            { col: 'ticket_footer', type: 'TEXT' }
        ];

        for (const m of migrations) {
            if (!existingConfigCols.includes(m.col)) {
                await db.query(`ALTER TABLE app_config ADD COLUMN ${m.col} ${m.type}`);
                console.log(`✅ [DB] Columna ${m.col} agregada a app_config.`);
            }
        }

        // Asegurar id=1
        const [configRowsFinal] = await db.query("SELECT * FROM app_config WHERE id=1");
        if (configRowsFinal.length === 0) {
            await db.query("INSERT INTO app_config (id) VALUES (1)");
            console.log("✅ [DB] Fila id=1 creada en app_config.");
        }

        // Cargar configuración inicial
        const [finalConfig] = await db.query("SELECT * FROM app_config WHERE id=1");
        if (finalConfig.length > 0) {
            const [playlist] = await db.query("SELECT * FROM video_playlist ORDER BY sort_order");
            currentConfig = {
                ...finalConfig[0],
                videoPlaylist: playlist
            };
            console.log("✅ [CONFIG] Configuración global y playlist cargadas en memoria.");
        }

        // MIGRACIONES DE BRANCHES
        const [cols] = await db.query("SHOW COLUMNS FROM branches LIKE 'auto_close_time'");
        if (cols.length === 0) {
            await db.query("ALTER TABLE branches ADD COLUMN auto_close_time TIME DEFAULT '22:00:00'");
            console.log("✅ [DB] Columna auto_close_time agregada a branches.");
        }

        const [colsEnabled] = await db.query("SHOW COLUMNS FROM branches LIKE 'auto_close_enabled'");
        if (colsEnabled.length === 0) {
            await db.query("ALTER TABLE branches ADD COLUMN auto_close_enabled TINYINT(1) DEFAULT 0");
            console.log("✅ [DB] Columna auto_close_enabled agregada a branches.");
        }

        // Migración para video_playlist.type ENUM
        try {
            await db.query("ALTER TABLE video_playlist MODIFY COLUMN type ENUM('file', 'link', 'youtube', 'mp4') DEFAULT 'link'");
            console.log("✅ [DB] video_playlist.type actualizado a ENUM('file', 'link', 'youtube', 'mp4')");
        } catch (err) {
            console.log("⚠️ [DB] No se pudo modificar ENUM de video_playlist (posiblemente ya actualizado)");
        }
    } catch (e) { console.error("Error migración principal:", e.message); }
})();

// 2. Tarea de Cierre Automático (Cada minuto)
setInterval(async () => {
    try {
        // Buscar sesiones abiertas donde el tiempo actual >= auto_close_time Y este habilitado
        // Y SOLO las que se abrieron ANTES del limite (para no cerrar sesiones nuevas de noche)
        const [expiredSessions] = await db.query(`
            SELECT s.id, s.branch_id, b.name as branchName 
            FROM cash_sessions s 
            JOIN branches b ON s.branch_id = b.id 
            WHERE s.closed_at IS NULL 
            AND b.auto_close_enabled = 1
            AND CURTIME() >= b.auto_close_time
            AND s.opened_at < CONCAT(CURDATE(), ' ', b.auto_close_time)
        `);

        for (const session of expiredSessions) {
            console.log(`[AUTO-CLOSE] Calculando totales para sesión ${session.id} en ${session.branchName}`);

            // 1. Calcular totales de ventas y pagos para esta sesión
            // Usamos s.timestamp >= s.opened_at para filtrar ventas de esta sesión específica
            const [totals] = await db.query(`
                SELECT 
                    COUNT(DISTINCT s.id) as operations_count,
                    COALESCE(SUM(s.total), 0) as total_sales,
                    COALESCE(SUM(CASE WHEN p.method = 'cash' THEN p.amount ELSE 0 END), 0) as total_cash,
                    COALESCE(SUM(CASE WHEN p.method = 'card' THEN p.amount ELSE 0 END), 0) as total_card,
                    COALESCE(SUM(CASE WHEN p.method = 'transfer' THEN p.amount ELSE 0 END), 0) as total_transfer,
                    COALESCE(SUM(CASE WHEN p.method = 'bitcoin' THEN p.amount ELSE 0 END), 0) as total_bitcoin
                FROM sales s
                LEFT JOIN payments p ON s.id = p.sale_id
                WHERE s.branch_id = ? AND s.timestamp >= (SELECT opened_at FROM cash_sessions WHERE id = ?)
            `, [session.branch_id, session.id]);

            const t = totals[0];

            // 2. Ejecutar el cierre con los montos reales calculados
            await db.query(`
                UPDATE cash_sessions 
                SET closed_at = NOW(),
                    total_sales = ?,
                    total_cash = ?,
                    total_card = ?,
                    total_transfer = ?,
                    total_bitcoin = ?,
                    operations_count = ?
                WHERE id = ?`,
                [
                    t.total_sales,
                    t.total_cash,
                    t.total_card,
                    t.total_transfer,
                    t.total_bitcoin,
                    t.operations_count,
                    session.id
                ]
            );

            console.log(`[AUTO-CLOSE] Sesión ${session.id} de ${session.branchName} cerrada con éxito.`);
            io.to(`branch_${session.branch_id}`).emit('sync_needed');
        }
    } catch (e) { console.error("Error auto-close task:", e.message); }
}, 60000);

// 2.5 Tarea de Deslogueo Global (3:00 AM) para forzar actualizaciones
setInterval(async () => {
    try {
        const now = new Date();
        const pad = (n) => n.toString().padStart(2, '0');
        const currentTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

        // Disparar solo a las 03:00 AM
        if (currentTime === "03:00") {
            console.log(`[FORCE-LOGOUT] Disparando cierre de sesiones global a las ${currentTime}...`);
            io.emit('force_logout', { reason: 'daily_update' });
        }
    } catch (e) { console.error("Error en tarea de deslogueo global:", e.message); }
}, 60000); // Revisar cada minuto

// 3. Endpoint de Reset de Poder (Segmentado)
app.post('/api/admin/reset', async (req, res) => {
    // Nota: En un sistema real, aquí verificarías el token/session del usuario
    // Por ahora, como el sistema es interno, confiamos en la UI, pero protegemos con un simple check
    // si el cliente enviara el userId en el body o headers.
    const { segments, userId } = req.body;

    // Hardcoded safety check for the protected IDs
    if (userId && (userId !== 'u_admin' && userId !== '1')) {
        return res.status(403).json({ error: "No tienes permisos de super-administrador" });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        if (segments.includes('sales')) {
            await connection.query("DELETE FROM payments");
            await connection.query("DELETE FROM sale_items");
            await connection.query("DELETE FROM sales");
            await connection.query("DELETE FROM cash_sessions");
            console.log("[RESET] Ventas e Historial eliminados.");
        }

        if (segments.includes('inventory')) {
            await connection.query("DELETE FROM inventory_movements");
            await connection.query("UPDATE branch_stock SET stock = 0");
            console.log("[RESET] Inventario y Stocks reseteados.");
        }

        if (segments.includes('clients')) {
            await connection.query("DELETE FROM clients");
            console.log("[RESET] Base de Clientes eliminada.");
        }

        if (segments.includes('appointments')) {
            await connection.query("DELETE FROM appointments");
            console.log("[RESET] Citas eliminadas.");
        }

        if (segments.includes('full')) {
            // Borrado TOTAL destructivo (Capa Superior)
            await connection.query("SET FOREIGN_KEY_CHECKS = 0");
            const tables = ['payments', 'sale_items', 'sales', 'cash_sessions', 'inventory_movements', 'branch_stock', 'clients', 'appointments', 'tickets', 'monthly_plans', 'video_playlist', 'promotions'];
            for (const t of tables) await connection.query(`TRUNCATE TABLE ${t}`);
            await connection.query("SET FOREIGN_KEY_CHECKS = 1");
            console.log("[RESET] FULL SYSTEM RESET COMPLETED.");
        }

        await connection.commit();
        res.json({ success: true, message: "Reset ejecutado con éxito" });
    } catch (e) {
        await connection.rollback();
        res.status(500).json({ error: e.message });
    } finally {
        connection.release();
    }
});

app.post('/api/send-cash-report', async (req, res) => {
    const { branchId, reportData } = req.body;
    try {
        // Obtener webhook_url y report_email de la sucursal
        const [branches] = await db.query("SELECT webhook_url, report_email, name FROM branches WHERE id = ?", [branchId]);

        if (branches.length === 0) {
            return res.status(404).json({ success: false, error: 'Sucursal no encontrada' });
        }

        const branch = branches[0];

        // Obtener webhook global de app_config como fallback
        const [configs] = await db.query("SELECT webhook_url FROM app_config LIMIT 1");
        const globalWebhook = configs.length > 0 ? configs[0].webhook_url : null;

        const targetWebhook = branch.webhook_url || globalWebhook;

        if (!targetWebhook) {
            return res.status(400).json({ success: false, error: 'No hay webhook configurado (ni sucursal ni general)' });
        }

        if (!branch.report_email) {
            return res.status(400).json({ success: false, error: 'No hay correo configurado para reportes en esta sucursal' });
        }

        // Enviar al webhook GAS (sucursal o global)
        const webhookResponse = await fetch(targetWebhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'cashReport',
                email: branch.report_email,
                branchName: branch.name,
                reportData: reportData
            })
        });

        if (webhookResponse.ok) {
            res.json({ success: true, message: 'Reporte enviado correctamente' });
        } else {
            res.status(500).json({ success: false, error: 'Error al enviar el reporte' });
        }
    } catch (e) {
        console.error('Error enviando reporte:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/api/send-ticket', async (req, res) => {
    const { branchId, ticketData, email } = req.body;
    try {
        const [branches] = await db.query("SELECT webhook_url, name FROM branches WHERE id = ?", [branchId]);
        const [configs] = await db.query("SELECT webhook_url FROM app_config LIMIT 1");

        if (branches.length === 0) return res.status(404).json({ success: false, error: 'Sucursal no encontrada' });

        const branch = branches[0];
        const globalWebhook = configs.length > 0 ? configs[0].webhook_url : null;
        const targetWebhook = branch.webhook_url || globalWebhook;

        if (!targetWebhook) return res.status(400).json({ success: false, error: 'No hay webhook configurado' });

        const webhookResponse = await fetch(targetWebhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'ticket',
                email: email,
                branchName: branch.name,
                ticketData: ticketData
            })
        });

        if (webhookResponse.ok) res.json({ success: true });
        else res.status(500).json({ success: false, error: 'Error GAS' });
    } catch (e) {
        console.error('Error enviando ticket:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`
    =========================================
    🚀 BARBEROS PRO API CORRIENDO
    Puerto: ${PORT}
    Estado: Producción / Full ERP
    =========================================
    `);
});