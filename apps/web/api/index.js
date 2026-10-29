import pg from 'pg';
import crypto from 'crypto';
import webpush from 'web-push';

const { Pool } = pg;

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BDAH9v7vNy72F160kTuKcCYR_U9lsXwpCEWYY8HcsPu7jqT26xgBCZ0XrRtslyVXyz8pd-__CaxnMtsLo4OLTcg';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'NvEEEc9kRTjpXTBwp_Sn4RyPZeZmXsodrhfknyUxP5E';

try {
  webpush.setVapidDetails(
    'mailto:itthecnica@hotmail.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
} catch {
  // Ignora erro de configuração inicial
}

let pushTableReady = false;
async function ensurePushTable() {
  if (pushTableReady) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id SERIAL PRIMARY KEY,
        endpoint TEXT UNIQUE NOT NULL,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        user_agent TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);
    pushTableReady = true;
  } catch {
    // ignora
  }
}

async function sendPushToAllAdmins(payloadObj) {
  try {
    await ensurePushTable();
    const { rows } = await pool.query(`SELECT id, endpoint, p256dh, auth FROM push_subscriptions`);
    if (!rows || rows.length === 0) return { sent: 0, total: 0 };
    const payload = JSON.stringify(payloadObj);
    let sent = 0;
    await Promise.all(
      rows.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth }
            },
            payload,
            {
              TTL: 86400,
              urgency: 'high'
            }
          );
          sent++;
        } catch (err) {
          console.error('[WebPush Error]:', err.statusCode, err.body || err.message);
          if (err.statusCode === 404 || err.statusCode === 410) {
            await pool.query(`DELETE FROM push_subscriptions WHERE id = $1`, [sub.id]).catch(() => {});
          }
        }
      })
    );
    return { sent, total: rows.length };
  } catch (err) {
    console.error('[sendPushToAllAdmins Error]:', err.message);
    return { sent: 0, total: 0 };
  }
}

// Conexão direta com o Pooler IPv4 do Supabase em Transaction Mode (Porta 6543 — ideal para Serverless/Vercel)
const pool = new Pool({
  host: process.env.DB_HOST || 'aws-0-us-east-1.pooler.supabase.com',
  port: Number(process.env.DB_PORT || 6543),
  database: process.env.DB_NAME || 'postgres',
  user: process.env.SPRING_DATASOURCE_USERNAME || 'postgres.onqxaoxrukbrkkdyyatj',
  password: process.env.SPRING_DATASOURCE_PASSWORD || "Wallans019'dan",
  ssl: { rejectUnauthorized: false },
  max: 1,
  idleTimeoutMillis: 3000,
  allowExitOnIdle: true,
  connectionTimeoutMillis: 10000
});

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash) return false;
  if (storedHash.startsWith('scrypt$')) {
    const parts = storedHash.split('$');
    if (parts.length !== 3) return false;
    const [, salt, originalHash] = parts;
    const derived = crypto.scryptSync(String(password), salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(originalHash, 'hex'), Buffer.from(derived, 'hex'));
  }
  return false;
}

function parseBody(req) {
  return new Promise((resolve) => {
    if (req.body !== undefined) {
      if (typeof req.body === 'string') {
        try {
          return resolve(JSON.parse(req.body));
        } catch {
          return resolve({});
        }
      }
      return resolve(req.body || {});
    }
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
  });
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

async function syncToSupabaseAuth({ email, passwordHash, fullName, role, phone, companyName }) {
  await pool.query(
    `INSERT INTO auth.users (
       instance_id, id, aud, role, email, encrypted_password,
       email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
       created_at, updated_at, confirmation_token, email_change,
       email_change_token_new, recovery_token
     )
     SELECT
       '00000000-0000-0000-0000-000000000000',
       gen_random_uuid(),
       'authenticated',
       'authenticated',
       $1::varchar,
       $2::varchar,
       NOW(),
       '{"provider":"email","providers":["email"]}'::jsonb,
       jsonb_build_object('full_name', $3::text, 'role', $4::text, 'phone', $5::text, 'company', $6::text),
       NOW(),
       NOW(),
       '', '', '', ''
     WHERE NOT EXISTS (SELECT 1 FROM auth.users au WHERE LOWER(au.email) = LOWER($1::varchar))`,
    [email, passwordHash, fullName || '', role || 'CUSTOMER', phone || '', companyName || '']
  );
}

async function getDefaultTechnicianId(preferredUserId) {
  if (preferredUserId) {
    const check = await pool.query(`SELECT id FROM users WHERE id = $1 LIMIT 1`, [Number(preferredUserId)]);
    if (check.rows[0]) return Number(check.rows[0].id);
  }
  const adminRes = await pool.query(
    `SELECT id FROM users WHERE role IN ('ADMIN', 'TECHNICIAN') ORDER BY id ASC LIMIT 1`
  );
  if (adminRes.rows[0]) return Number(adminRes.rows[0].id);

  const anyRes = await pool.query(`SELECT id FROM users ORDER BY id ASC LIMIT 1`);
  return anyRes.rows[0] ? Number(anyRes.rows[0].id) : null;
}

async function ensureCustomerUser({ fullName, email, phone, companyName, cnpj, password }) {
  const cleanEmail = (email || '').trim().toLowerCase() || `cliente.${Date.now()}@cliente.com.br`;
  const cleanName = (fullName || '').trim() || 'Cliente';
  const cleanPhone = (phone || '').trim();
  const cleanCompany = (companyName || '').trim();
  const cleanCnpj = (cnpj || '').trim() || null;
  const pwdHash = password ? hashPassword(password) : hashPassword('cliente123');

  let companyId = null;
  if (cleanCompany) {
    const existingComp = await pool.query(
      `SELECT id FROM companies WHERE LOWER(name) = LOWER($1) LIMIT 1`,
      [cleanCompany]
    );
    if (existingComp.rows[0]) {
      companyId = existingComp.rows[0].id;
    } else {
      const insComp = await pool.query(
        `INSERT INTO companies (name, tax_id, email, phone, is_active)
         VALUES ($1, $2, $3, $4, true)
         RETURNING id`,
        [cleanCompany, cleanCnpj, cleanEmail, cleanPhone]
      );
      companyId = insComp.rows[0].id;
    }
  }

  let userId = null;
  const existingUser = await pool.query(
    `SELECT id, company_id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
    [cleanEmail]
  );

  if (existingUser.rows[0]) {
    userId = existingUser.rows[0].id;
    if (companyId && !existingUser.rows[0].company_id) {
      await pool.query(
        `UPDATE users SET company_id = $1, full_name = $2, phone = COALESCE(NULLIF($3, ''), phone) WHERE id = $4`,
        [companyId, cleanName, cleanPhone, userId]
      );
    }
  } else {
    const insUser = await pool.query(
      `INSERT INTO users (company_id, full_name, email, password_hash, phone, role, is_active, email_verified)
       VALUES ($1, $2, $3, $4, $5, 'CUSTOMER', true, true)
       RETURNING id`,
      [companyId, cleanName, cleanEmail, pwdHash, cleanPhone]
    );
    userId = insUser.rows[0].id;
  }

  await syncToSupabaseAuth({
    email: cleanEmail,
    passwordHash: pwdHash,
    fullName: cleanName,
    role: 'CUSTOMER',
    phone: cleanPhone,
    companyName: cleanCompany
  });

  return { userId, companyId };
}

function mapTicketRow(row) {
  return {
    id: Number(row.id),
    code: row.code,
    customerId: Number(row.customer_id),
    customerName: row.customer_name || 'Cliente',
    customerEmail: row.customer_email || '',
    customerPhone: row.customer_phone || '',
    companyName: row.company_name || '',
    technicianId: row.technician_id ? Number(row.technician_id) : null,
    technicianName: row.technician_name || 'IT THECNICA',
    serviceId: row.service_id ? Number(row.service_id) : null,
    serviceName: row.service_name || 'Atendimento Remoto',
    billingModel: row.service_billing_model || 'FIXED',
    serviceReferencePrice: row.service_reference_price !== null && row.service_reference_price !== undefined ? Number(row.service_reference_price) : 0,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    remoteAccessTool: row.remote_access_tool || 'ANYDESK',
    remoteAccessId: row.remote_access_id || '',
    estimatedPrice: row.estimated_price !== null ? Number(row.estimated_price) : 0,
    totalSessionSeconds: Number(row.total_session_seconds || 0),
    resolutionSummary: row.resolution_summary || '',
    checklistData: Array.isArray(row.checklist_data) ? row.checklist_data : [],
    techRating: row.tech_rating ? Number(row.tech_rating) : null,
    systemRating: row.system_rating ? Number(row.system_rating) : null,
    ratingComment: row.rating_comment || '',
    ratedAt: row.rated_at || null,
    paymentStatus: row.payment_status || 'PENDING',
    paymentMethodId: row.payment_method_id ? Number(row.payment_method_id) : null,
    paymentReportedAt: row.payment_reported_at || null,
    paidAt: row.paid_at || null,
    paymentReceiptUrl: row.payment_receipt_url || '',
    paymentReceiptName: row.payment_receipt_name || '',
    resolvedAt: row.resolved_at,
    closedAt: row.closed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function computeSessionSeconds(row) {
  const acc = Number(row.accumulated_seconds || 0);
  if (row.status === 'PAUSED' || row.status === 'COMPLETED' || row.status === 'CANCELLED') {
    return acc;
  }
  const refTime = row.last_resumed_at ? new Date(row.last_resumed_at) : new Date(row.started_at);
  const diffSec = Math.max(0, Math.floor((Date.now() - refTime.getTime()) / 1000));
  return acc + diffSec;
}

function mapSessionRow(row) {
  if (!row) return null;
  const currentTotalSeconds = computeSessionSeconds(row);
  return {
    id: Number(row.id),
    ticketId: Number(row.ticket_id),
    ticketCode: row.ticket_code || `CH-${row.ticket_id}`,
    ticketTitle: row.ticket_title || 'Atendimento Remoto',
    customerName: row.customer_name || 'Cliente',
    technicianName: row.technician_name || 'IT THECNICA',
    toolUsed: row.tool_used || 'ANYDESK',
    remoteAccessId: row.remote_access_id || '',
    startedAt: row.started_at,
    pausedAt: row.paused_at,
    endedAt: row.ended_at,
    status: row.status,
    currentTotalSeconds,
    billableSeconds: row.status === 'COMPLETED' ? Number(row.billable_seconds || currentTotalSeconds) : currentTotalSeconds,
    customerConsent: Boolean(row.customer_consent)
  };
}

const TICKETS_SELECT_SQL = `
  SELECT
    t.*,
    cu.full_name AS customer_name,
    cu.email AS customer_email,
    cu.phone AS customer_phone,
    co.name AS company_name,
    tu.full_name AS technician_name,
    s.name AS service_name,
    s.billing_model AS service_billing_model,
    s.reference_price AS service_reference_price,
    (SELECT COALESCE(SUM(rs.billable_seconds), 0) FROM remote_sessions rs WHERE rs.ticket_id = t.id) AS total_session_seconds
  FROM tickets t
  LEFT JOIN users cu ON cu.id = t.customer_id
  LEFT JOIN companies co ON co.id = cu.company_id
  LEFT JOIN users tu ON tu.id = t.technician_id
  LEFT JOIN services s ON s.id = t.service_id
`;

const SESSION_SELECT_SQL = `
  SELECT
    rs.*,
    t.code AS ticket_code,
    t.title AS ticket_title,
    t.remote_access_id,
    t.customer_id,
    cu.full_name AS customer_name,
    tu.full_name AS technician_name
  FROM remote_sessions rs
  JOIN tickets t ON t.id = rs.ticket_id
  LEFT JOIN users cu ON cu.id = t.customer_id
  LEFT JOIN users tu ON tu.id = rs.technician_id
`;

// Estrutura já provisionada no Supabase; evita DDL lock em cada cold start serverless
let paymentSchemaReady = Promise.resolve();
function ensurePaymentSchema() {
  return paymentSchemaReady;
}

function mapPaymentMethodRow(r) {
  return {
    id: Number(r.id),
    type: r.type,
    label: r.label,
    pixKey: r.pix_key,
    pixKeyType: r.pix_key_type,
    receiverName: r.receiver_name,
    receiverCity: r.receiver_city,
    instructions: r.instructions || '',
    qrCodeImage: r.qr_code_image || '',
    isActive: Boolean(r.is_active),
    createdAt: r.created_at
  };
}

function readPaymentMethodBody(body) {
  const pixKey = String(body.pixKey || '').trim();
  const qrCodeImage = String(body.qrCodeImage || '').trim();
  const receiverName = (String(body.receiverName || 'IT ONE').trim() || 'IT ONE').slice(0, 25);
  const receiverCity = (String(body.receiverCity || 'SAO PAULO').trim() || 'SAO PAULO').slice(0, 15);
  if (!pixKey && !qrCodeImage) return null;
  return [
    String(body.label || 'Pix').trim().slice(0, 120),
    pixKey,
    String(body.pixKeyType || 'ALEATORIA').toUpperCase().slice(0, 20),
    receiverName,
    receiverCity,
    String(body.instructions || '').trim(),
    qrCodeImage,
    body.isActive !== false
  ];
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname.replace(/\/+$/, '');
  const method = req.method.toUpperCase();

  try {
    // 0. AUTENTICAÇÃO & CADASTRO (/api/v1/auth/admin-setup, /api/v1/auth/register, /api/v1/auth/login)
    if (method === 'POST' && pathname === '/api/v1/auth/admin-setup') {
      const body = await parseBody(req);
      const email = (body.email || '').trim().toLowerCase();
      const fullName = (body.fullName || '').trim();
      const password = body.password || '';
      const phone = (body.phone || '').trim();
      const companyName = (body.companyName || 'IT THECNICA').trim();

      if (!email || !fullName || password.length < 4) {
        return sendJson(res, 400, {
          success: false,
          message: 'Preencha nome completo, e-mail válido e uma senha de pelo menos 4 caracteres.'
        });
      }

      const existing = await pool.query(`SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`, [email]);
      if (existing.rows[0]) {
        return sendJson(res, 409, {
          success: false,
          message: 'Este e-mail já está cadastrado no sistema. Faça login com sua conta.'
        });
      }

      const pwdHash = hashPassword(password);
      const ins = await pool.query(
        `INSERT INTO users (full_name, email, password_hash, phone, role, is_active, email_verified)
         VALUES ($1, $2, $3, $4, 'ADMIN', true, true)
         RETURNING id, full_name, email, phone, role, created_at`,
        [fullName, email, pwdHash, phone]
      );
      const u = ins.rows[0];

      await syncToSupabaseAuth({
        email,
        passwordHash: pwdHash,
        fullName,
        role: 'ADMIN',
        phone,
        companyName
      });

      return sendJson(res, 201, {
        success: true,
        data: {
          token: `supabase-session-${u.id}`,
          user: {
            id: Number(u.id),
            fullName: u.full_name,
            email: u.email,
            phone: u.phone || '',
            role: u.role,
            companyName
          }
        }
      });
    }

    // Cadastro público de Cliente (sempre perfil CUSTOMER conforme regra de segurança)
    if (method === 'POST' && pathname === '/api/v1/auth/register') {
      const body = await parseBody(req);
      const email = (body.email || '').trim().toLowerCase();
      const fullName = (body.fullName || '').trim();
      const password = body.password || '';
      const phone = (body.phone || '').trim();
      const companyName = (body.companyName || '').trim();

      if (!email || !fullName || password.length < 4) {
        return sendJson(res, 400, {
          success: false,
          message: 'Preencha nome, e-mail e uma senha de pelo menos 4 caracteres.'
        });
      }

      const existing = await pool.query(`SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`, [email]);
      if (existing.rows[0]) {
        return sendJson(res, 409, {
          success: false,
          message: 'Este e-mail já possui cadastro. Faça login.'
        });
      }

      const { userId } = await ensureCustomerUser({
        fullName,
        email,
        phone,
        companyName,
        password
      });

      return sendJson(res, 201, {
        success: true,
        data: {
          token: `supabase-customer-${userId}`,
          user: {
            id: Number(userId),
            fullName,
            email,
            phone,
            role: 'CUSTOMER',
            companyName
          }
        }
      });
    }

    // Login (Admin ou Cliente)
    if (method === 'POST' && pathname === '/api/v1/auth/login') {
      const body = await parseBody(req);
      const email = (body.email || '').trim().toLowerCase();
      const password = body.password || '';

      if (!email || !password) {
        return sendJson(res, 400, { success: false, message: 'Informe seu e-mail e senha.' });
      }

      const { rows } = await pool.query(
        `SELECT u.*, c.name AS company_name
         FROM users u
         LEFT JOIN companies c ON c.id = u.company_id
         WHERE LOWER(u.email) = LOWER($1)
         LIMIT 1`,
        [email]
      );
      const user = rows[0];
      if (!user || !verifyPassword(password, user.password_hash)) {
        return sendJson(res, 401, {
          success: false,
          message: 'E-mail ou senha incorretos. Verifique seus dados ou crie sua conta.'
        });
      }

      return sendJson(res, 200, {
        success: true,
        data: {
          token: `supabase-session-${user.id}`,
          user: {
            id: Number(user.id),
            fullName: user.full_name,
            email: user.email,
            phone: user.phone || '',
            role: user.role,
            companyName: user.company_name || 'IT THECNICA'
          }
        }
      });
    }

    // 1. GET / POST / PUT / DELETE /api/v1/services
    if (pathname === '/api/v1/services') {
      if (method === 'GET') {
        const { rows } = await pool.query(`
          SELECT s.*, c.name AS category_name
          FROM services s
          LEFT JOIN service_categories c ON c.id = s.category_id
          WHERE s.is_active = true
          ORDER BY s.id ASC
        `);
        const data = rows.map((r) => ({
          id: Number(r.id),
          categoryId: r.category_id ? Number(r.category_id) : null,
          categoryName: r.category_name || 'Suporte Técnico',
          name: r.name,
          description: r.description,
          billingModel: r.billing_model,
          referencePrice: Number(r.reference_price),
          estimatedMinutes: r.estimated_minutes,
          checklistQuestions: Array.isArray(r.checklist_questions) ? r.checklist_questions : []
        }));
        return sendJson(res, 200, { success: true, data });
      }

      if (method === 'POST') {
        const body = await parseBody(req);
        const catName = (body.categoryName || 'Suporte Técnico').trim();

        let categoryId = null;
        const existingCat = await pool.query(
          `SELECT id FROM service_categories WHERE LOWER(name) = LOWER($1) LIMIT 1`,
          [catName]
        );
        if (existingCat.rows[0]) {
          categoryId = existingCat.rows[0].id;
        } else {
          const insCat = await pool.query(
            `INSERT INTO service_categories (name, description, icon, display_order)
             VALUES ($1, $2, 'Wrench', 1) RETURNING id`,
            [catName, catName]
          );
          categoryId = insCat.rows[0].id;
        }

        const checklistQuestions = Array.isArray(body.checklistQuestions)
          ? body.checklistQuestions.filter((q) => String(q).trim() !== '')
          : [];

        const insSvc = await pool.query(
          `INSERT INTO services (
            category_id, name, description, billing_model, reference_price, estimated_minutes, is_active, checklist_questions
          ) VALUES ($1, $2, $3, $4, $5, $6, true, $7::jsonb)
          RETURNING *`,
          [
            categoryId,
            (body.name || 'Novo Serviço').trim(),
            (body.description || '').trim(),
            body.billingModel || 'FIXED',
            Number(body.referencePrice || 0),
            Number(body.estimatedMinutes || 60),
            JSON.stringify(checklistQuestions)
          ]
        );
        const r = insSvc.rows[0];
        return sendJson(res, 201, {
          success: true,
          data: {
            id: Number(r.id),
            categoryId: Number(categoryId),
            categoryName: catName,
            name: r.name,
            description: r.description,
            billingModel: r.billing_model,
            referencePrice: Number(r.reference_price),
            estimatedMinutes: r.estimated_minutes,
            checklistQuestions: Array.isArray(r.checklist_questions) ? r.checklist_questions : []
          }
        });
      }
    }

    const serviceIdMatch = pathname.match(/^\/api\/v1\/services\/(\d+)$/);
    if (serviceIdMatch) {
      const svcId = Number(serviceIdMatch[1]);
      if (method === 'PUT' || method === 'PATCH') {
        const body = await parseBody(req);
        const catName = (body.categoryName || 'Suporte Técnico').trim();
        let categoryId = null;
        const existingCat = await pool.query(
          `SELECT id FROM service_categories WHERE LOWER(name) = LOWER($1) LIMIT 1`,
          [catName]
        );
        if (existingCat.rows[0]) {
          categoryId = existingCat.rows[0].id;
        } else {
          const insCat = await pool.query(
            `INSERT INTO service_categories (name, description, icon, display_order)
             VALUES ($1, $2, 'Wrench', 1) RETURNING id`,
            [catName, catName]
          );
          categoryId = insCat.rows[0].id;
        }

        const checklistQuestions = Array.isArray(body.checklistQuestions)
          ? body.checklistQuestions.filter((q) => String(q).trim() !== '')
          : [];

        const upd = await pool.query(
          `UPDATE services
           SET category_id = $1,
               name = $2,
               description = $3,
               billing_model = $4,
               reference_price = $5,
               estimated_minutes = $6,
               checklist_questions = $7::jsonb,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $8
           RETURNING *`,
          [
            categoryId,
            (body.name || 'Serviço').trim(),
            (body.description || '').trim(),
            body.billingModel || 'FIXED',
            Number(body.referencePrice || 0),
            Number(body.estimatedMinutes || 60),
            JSON.stringify(checklistQuestions),
            svcId
          ]
        );
        if (!upd.rows[0]) return sendJson(res, 404, { success: false });
        const r = upd.rows[0];
        return sendJson(res, 200, {
          success: true,
          data: {
            id: Number(r.id),
            categoryId: Number(categoryId),
            categoryName: catName,
            name: r.name,
            description: r.description,
            billingModel: r.billing_model,
            referencePrice: Number(r.reference_price),
            estimatedMinutes: r.estimated_minutes,
            checklistQuestions: Array.isArray(r.checklist_questions) ? r.checklist_questions : []
          }
        });
      }

      if (method === 'DELETE') {
        await pool.query(`UPDATE tickets SET service_id = NULL WHERE service_id = $1`, [svcId]);
        await pool.query(`DELETE FROM services WHERE id = $1`, [svcId]);
        return sendJson(res, 200, { success: true });
      }
    }

    // 2. GET / POST / DELETE /api/v1/customers
    if (pathname === '/api/v1/customers') {
      if (method === 'GET') {
        const { rows } = await pool.query(`
          SELECT
            u.id,
            u.full_name,
            u.email,
            u.phone,
            u.created_at,
            c.name AS company_name,
            c.tax_id AS cnpj,
            (SELECT t.remote_access_id FROM tickets t WHERE t.customer_id = u.id AND t.remote_access_id IS NOT NULL AND t.remote_access_id <> '' ORDER BY t.created_at DESC LIMIT 1) AS last_anydesk,
            (SELECT COUNT(*) FROM tickets t WHERE t.customer_id = u.id AND t.status NOT IN ('RESOLVED', 'CLOSED', 'CANCELLED')) AS active_tickets
          FROM users u
          LEFT JOIN companies c ON c.id = u.company_id
          WHERE u.role = 'CUSTOMER'
          ORDER BY u.created_at DESC, u.id DESC
        `);
        const data = rows.map((r) => ({
          id: Number(r.id),
          name: r.company_name || r.full_name,
          cnpj: r.cnpj || 'Pessoa Física / Avulso',
          contactPerson: r.full_name,
          email: r.email,
          phone: r.phone || 'Não informado',
          defaultAnydesk: r.last_anydesk || 'Não vinculado',
          activeTickets: Number(r.active_tickets || 0),
          createdAt: r.created_at
        }));
        return sendJson(res, 200, { success: true, data });
      }

      if (method === 'POST') {
        const body = await parseBody(req);
        const { userId } = await ensureCustomerUser({
          fullName: body.contactPerson || body.fullName || body.name,
          email: body.email,
          phone: body.phone,
          companyName: body.companyName || body.name,
          cnpj: body.cnpj
        });
        const { rows } = await pool.query(
          `SELECT u.id, u.full_name, u.email, u.phone, u.created_at, c.name AS company_name, c.tax_id AS cnpj
           FROM users u LEFT JOIN companies c ON c.id = u.company_id WHERE u.id = $1`,
          [userId]
        );
        const r = rows[0];
        return sendJson(res, 201, {
          success: true,
          data: {
            id: Number(r.id),
            name: r.company_name || r.full_name,
            cnpj: r.cnpj || 'Pessoa Física / Avulso',
            contactPerson: r.full_name,
            email: r.email,
            phone: r.phone || 'Não informado',
            defaultAnydesk: body.defaultAnydesk || 'Não vinculado',
            activeTickets: 0,
            createdAt: r.created_at
          }
        });
      }
    }

    const deleteCustomerMatch = pathname.match(/^\/api\/v1\/customers\/(\d+)$/);
    if (method === 'DELETE' && deleteCustomerMatch) {
      const custId = Number(deleteCustomerMatch[1]);
      const userRes = await pool.query(`SELECT email FROM users WHERE id = $1`, [custId]);
      await pool.query(`DELETE FROM tickets WHERE customer_id = $1`, [custId]);
      await pool.query(`DELETE FROM users WHERE id = $1 AND role = 'CUSTOMER'`, [custId]);
      if (userRes.rows[0]?.email) {
        await pool.query(`DELETE FROM auth.users WHERE LOWER(email) = LOWER($1)`, [userRes.rows[0].email]);
      }
      return sendJson(res, 200, { success: true });
    }

    // 3. GET / POST / DELETE /api/v1/tickets
    if (method === 'GET' && pathname === '/api/v1/tickets') {
      await ensurePaymentSchema();
      const status = parsedUrl.searchParams.get('status');
      const customerId = parsedUrl.searchParams.get('customerId');
      let sql = `${TICKETS_SELECT_SQL} WHERE 1=1`;
      const params = [];
      if (status && status !== 'ALL') {
        params.push(status);
        sql += ` AND t.status = $${params.length}`;
      }
      if (customerId) {
        params.push(Number(customerId));
        sql += ` AND t.customer_id = $${params.length}`;
      }
      sql += ` ORDER BY t.created_at DESC, t.id DESC`;
      const { rows } = await pool.query(sql, params);
      return sendJson(res, 200, { success: true, data: rows.map(mapTicketRow) });
    }

    if (method === 'POST' && pathname === '/api/v1/tickets') {
      const body = await parseBody(req);
      const countRes = await pool.query(`SELECT COALESCE(MAX(id), 0) + 1 AS next_num FROM tickets`);
      const code = `CH-2026-${String(countRes.rows[0].next_num).padStart(6, '0')}`;
      const serviceId = body.serviceId ? Number(body.serviceId) : null;

      let estimatedPrice = body.estimatedPrice !== undefined && body.estimatedPrice !== '' ? Number(body.estimatedPrice) : 0;
      if (serviceId && !estimatedPrice) {
        const svcRes = await pool.query(`SELECT reference_price FROM services WHERE id = $1`, [serviceId]);
        if (svcRes.rows[0]) {
          estimatedPrice = Number(svcRes.rows[0].reference_price);
        }
      }

      let customerId = body.customerId ? Number(body.customerId) : null;
      if (!customerId) {
        const ensured = await ensureCustomerUser({
          fullName: body.customerName || 'Cliente',
          email: body.customerEmail || `cliente.${Date.now()}@email.com`,
          phone: body.customerPhone || '',
          companyName: body.companyName || ''
        });
        customerId = ensured.userId;
      }

      const checklistData = Array.isArray(body.checklistData) ? body.checklistData : [];

      const insertRes = await pool.query(
        `INSERT INTO tickets (
          code, customer_id, technician_id, service_id, title, description,
          status, priority, remote_access_tool, remote_access_id, estimated_price, checklist_data
        ) VALUES ($1, $2, $3, $4, $5, $6, 'NEW', $7, $8, $9, $10, $11::jsonb)
        RETURNING id`,
        [
          code,
          customerId,
          null,
          serviceId,
          body.title || 'Chamado de Suporte',
          body.description || 'Solicitação de suporte remoto.',
          body.priority || 'MEDIUM',
          body.remoteAccessTool || 'ANYDESK',
          body.remoteAccessId || '',
          estimatedPrice,
          JSON.stringify(checklistData)
        ]
      );

      const newId = insertRes.rows[0].id;
      const fullRes = await pool.query(`${TICKETS_SELECT_SQL} WHERE t.id = $1`, [newId]);
      const createdTicket = mapTicketRow(fullRes.rows[0]);

      await sendPushToAllAdmins({
        title: `Novo Chamado • ${createdTicket.code}`,
        body: `${createdTicket.customerName}: ${createdTicket.title}`,
        url: '/?tab=tickets',
        tag: `ticket-${createdTicket.id}`
      });

      return sendJson(res, 201, { success: true, data: createdTicket });
    }

    const deleteTicketMatch = pathname.match(/^\/api\/v1\/tickets\/(\d+)$/);
    if (method === 'DELETE' && deleteTicketMatch) {
      const ticketId = Number(deleteTicketMatch[1]);
      await pool.query(`DELETE FROM tickets WHERE id = $1`, [ticketId]);
      return sendJson(res, 200, { success: true });
    }

    // 4. PATCH /api/v1/tickets/:id/status
    const statusMatch = pathname.match(/^\/api\/v1\/tickets\/(\d+)\/status$/);
    if (method === 'PATCH' && statusMatch) {
      await ensurePaymentSchema();
      const ticketId = Number(statusMatch[1]);
      const body = await parseBody(req);
      const newStatus = body.status || 'IN_PROGRESS';
      const resolutionSummary = body.resolutionSummary !== undefined ? body.resolutionSummary : null;

      await pool.query(
        `UPDATE tickets
         SET status = $1::varchar,
             resolution_summary = COALESCE($3::text, resolution_summary),
             estimated_price = CASE
               WHEN ($1::varchar IN ('RESOLVED', 'CLOSED')) AND (estimated_price IS NULL OR estimated_price = 0)
               THEN COALESCE(
                 (SELECT reference_price FROM services WHERE id = tickets.service_id),
                 (SELECT reference_price FROM services WHERE is_active = TRUE ORDER BY id ASC LIMIT 1),
                 50.00
               )
               ELSE estimated_price
             END,
             updated_at = CURRENT_TIMESTAMP,
             resolved_at = CASE WHEN $1::varchar = 'RESOLVED' THEN CURRENT_TIMESTAMP ELSE resolved_at END,
             closed_at = CASE WHEN $1::varchar = 'CLOSED' THEN CURRENT_TIMESTAMP ELSE closed_at END
         WHERE id = $2`,
        [newStatus, ticketId, resolutionSummary]
      );

      const fullRes = await pool.query(`${TICKETS_SELECT_SQL} WHERE t.id = $1`, [ticketId]);
      if (!fullRes.rows[0]) {
        return sendJson(res, 404, { success: false, message: 'Chamado não encontrado' });
      }
      return sendJson(res, 200, { success: true, data: mapTicketRow(fullRes.rows[0]) });
    }

    // 4.1 POST /api/v1/tickets/:id/rating (Avaliação do Técnico + Avaliação do Sistema)
    const ratingMatch = pathname.match(/^\/api\/v1\/tickets\/(\d+)\/rating$/);
    if (method === 'POST' && ratingMatch) {
      const ticketId = Number(ratingMatch[1]);
      const body = await parseBody(req);
      const techRating = Math.min(5, Math.max(1, Number(body.techRating || 5)));
      const systemRating = Math.min(5, Math.max(1, Number(body.systemRating || 5)));
      const ratingComment = (body.ratingComment || '').trim();

      await pool.query(
        `UPDATE tickets
         SET tech_rating = $1,
             system_rating = $2,
             rating_comment = $3,
             rated_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [techRating, systemRating, ratingComment, ticketId]
      );

      const fullRes = await pool.query(`${TICKETS_SELECT_SQL} WHERE t.id = $1`, [ticketId]);
      if (!fullRes.rows[0]) {
        return sendJson(res, 404, { success: false, message: 'Chamado não encontrado' });
      }
      return sendJson(res, 200, { success: true, data: mapTicketRow(fullRes.rows[0]) });
    }

    // 4.2 Formas de pagamento (cadastradas pelo admin) — /api/v1/payment-methods
    if (pathname === '/api/v1/payment-methods' || pathname.startsWith('/api/v1/payment-methods/')) {
      await ensurePaymentSchema();
      const pmIdMatch = pathname.match(/^\/api\/v1\/payment-methods\/(\d+)$/);

      if (method === 'GET' && !pmIdMatch) {
        const onlyActive = parsedUrl.searchParams.get('active') === 'true';
        const { rows } = await pool.query(
          `SELECT * FROM payment_methods ${onlyActive ? 'WHERE is_active = TRUE' : ''} ORDER BY id ASC`
        );
        return sendJson(res, 200, { success: true, data: rows.map(mapPaymentMethodRow) });
      }

      if (method === 'POST' && !pmIdMatch) {
        const values = readPaymentMethodBody(await parseBody(req));
        if (!values) return sendJson(res, 400, { success: false, message: 'Informe a chave Pix ou adicione a imagem do QR Code.' });
        const ins = await pool.query(
          `INSERT INTO payment_methods (label, pix_key, pix_key_type, receiver_name, receiver_city, instructions, qr_code_image, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
          values
        );
        return sendJson(res, 201, { success: true, data: mapPaymentMethodRow(ins.rows[0]) });
      }

      if (method === 'PUT' && pmIdMatch) {
        const values = readPaymentMethodBody(await parseBody(req));
        if (!values) return sendJson(res, 400, { success: false, message: 'Informe a chave Pix ou adicione a imagem do QR Code.' });
        const upd = await pool.query(
          `UPDATE payment_methods
           SET label = $1, pix_key = $2, pix_key_type = $3, receiver_name = $4, receiver_city = $5, instructions = $6, qr_code_image = $7, is_active = $8
           WHERE id = $9 RETURNING *`,
          [...values, Number(pmIdMatch[1])]
        );
        if (!upd.rows[0]) return sendJson(res, 404, { success: false, message: 'Forma de pagamento não encontrada' });
        return sendJson(res, 200, { success: true, data: mapPaymentMethodRow(upd.rows[0]) });
      }

      if (method === 'DELETE' && pmIdMatch) {
        await pool.query(`DELETE FROM payment_methods WHERE id = $1`, [Number(pmIdMatch[1])]);
        return sendJson(res, 200, { success: true });
      }
    }

    // 4.3 PATCH /api/v1/tickets/:id/payment — cliente informa pagamento (REPORTED) / admin confirma (PAID)
    const paymentMatch = pathname.match(/^\/api\/v1\/tickets\/(\d+)\/payment$/);
    if (method === 'PATCH' && paymentMatch) {
      await ensurePaymentSchema();
      const ticketId = Number(paymentMatch[1]);
      const body = await parseBody(req);
      const newStatus = ['PENDING', 'REPORTED', 'PAID'].includes(body.status) ? body.status : 'REPORTED';
      const paymentMethodId = body.paymentMethodId ? Number(body.paymentMethodId) : null;
      const receiptUrl = body.receiptUrl ? String(body.receiptUrl) : null;
      const receiptName = body.receiptName ? String(body.receiptName).slice(0, 255) : null;

      const prev = await pool.query(`SELECT payment_status FROM tickets WHERE id = $1`, [ticketId]);
      if (!prev.rows[0]) return sendJson(res, 404, { success: false, message: 'Chamado não encontrado' });
      if (prev.rows[0].payment_status === 'PAID' && newStatus === 'REPORTED') {
        return sendJson(res, 409, { success: false, message: 'Pagamento já confirmado.' });
      }

      await pool.query(
        `UPDATE tickets
         SET payment_status = $1::varchar,
             payment_method_id = COALESCE($3, payment_method_id),
             payment_receipt_url = COALESCE($4, payment_receipt_url),
             payment_receipt_name = COALESCE($5, payment_receipt_name),
             payment_reported_at = CASE WHEN $1::varchar = 'REPORTED' THEN CURRENT_TIMESTAMP ELSE payment_reported_at END,
             paid_at = CASE WHEN $1::varchar = 'PAID' THEN CURRENT_TIMESTAMP WHEN $1::varchar = 'PENDING' THEN NULL ELSE paid_at END,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [newStatus, ticketId, paymentMethodId, receiptUrl, receiptName]
      );

      const fullRes = await pool.query(`${TICKETS_SELECT_SQL} WHERE t.id = $1`, [ticketId]);
      const ticket = mapTicketRow(fullRes.rows[0]);

      if (newStatus === 'REPORTED') {
        await sendPushToAllAdmins({
          title: `Comprovante Pix • ${ticket.code}`,
          body: `${ticket.customerName} enviou comprovante / informou pagamento Pix`,
          url: '/?tab=billing',
          tag: `payment-${ticket.id}`
        });
      }

      // Ao confirmar, registra a receita no financeiro (uma única vez por chamado)
      if (newStatus === 'PAID' && prev.rows[0].payment_status !== 'PAID' && ticket.estimatedPrice > 0) {
        await pool.query(
          `INSERT INTO financial_entries (ticket_id, type, description, party_name, amount, status, payment_method)
           VALUES ($1, 'INCOME', $2, $3, $4, 'PAID', 'PIX')`,
          [ticketId, `${ticket.code} — ${ticket.title}`, ticket.customerName || 'Cliente', ticket.estimatedPrice]
        );
      }
      return sendJson(res, 200, { success: true, data: ticket });
    }

    // 5. GET / POST / DELETE / PATCH /api/v1/financial-entries
    if (pathname === '/api/v1/financial-entries') {
      if (method === 'GET') {
        const { rows } = await pool.query(`
          SELECT * FROM financial_entries ORDER BY entry_date DESC, id DESC
        `);
        const data = rows.map((r) => ({
          id: Number(r.id),
          ticketId: r.ticket_id ? Number(r.ticket_id) : null,
          type: r.type,
          description: r.description,
          partyName: r.party_name || 'Avulso',
          amount: Number(r.amount),
          status: r.status,
          paymentMethod: r.payment_method || 'PIX',
          entryDate: r.entry_date
        }));
        return sendJson(res, 200, { success: true, data });
      }

      if (method === 'POST') {
        const body = await parseBody(req);
        const ins = await pool.query(
          `INSERT INTO financial_entries (type, description, party_name, amount, status, payment_method)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [
            body.type === 'EXPENSE' ? 'EXPENSE' : 'INCOME',
            (body.description || 'Lançamento Financeiro').trim(),
            (body.partyName || 'IT THECNICA').trim(),
            Number(body.amount || 0),
            body.status || 'PAID',
            body.paymentMethod || 'PIX'
          ]
        );
        const r = ins.rows[0];
        return sendJson(res, 201, {
          success: true,
          data: {
            id: Number(r.id),
            ticketId: r.ticket_id ? Number(r.ticket_id) : null,
            type: r.type,
            description: r.description,
            partyName: r.party_name,
            amount: Number(r.amount),
            status: r.status,
            paymentMethod: r.payment_method,
            entryDate: r.entry_date
          }
        });
      }
    }

    const finStatusMatch = pathname.match(/^\/api\/v1\/financial-entries\/(\d+)\/status$/);
    if (method === 'PATCH' && finStatusMatch) {
      const entryId = Number(finStatusMatch[1]);
      const body = await parseBody(req);
      const upd = await pool.query(
        `UPDATE financial_entries SET status = $1 WHERE id = $2 RETURNING *`,
        [body.status || 'PAID', entryId]
      );
      if (!upd.rows[0]) return sendJson(res, 404, { success: false });
      const r = upd.rows[0];
      return sendJson(res, 200, {
        success: true,
        data: {
          id: Number(r.id),
          type: r.type,
          description: r.description,
          partyName: r.party_name,
          amount: Number(r.amount),
          status: r.status,
          paymentMethod: r.payment_method,
          entryDate: r.entry_date
        }
      });
    }

    const finDeleteMatch = pathname.match(/^\/api\/v1\/financial-entries\/(\d+)$/);
    if (method === 'DELETE' && finDeleteMatch) {
      const entryId = Number(finDeleteMatch[1]);
      await pool.query(`DELETE FROM financial_entries WHERE id = $1`, [entryId]);
      return sendJson(res, 200, { success: true });
    }

    // 6. GET / POST /api/v1/tickets/:id/messages
    const msgMatch = pathname.match(/^\/api\/v1\/tickets\/(\d+)\/messages$/);
    if (msgMatch) {
      const ticketId = Number(msgMatch[1]);
      if (method === 'GET') {
        const role = parsedUrl.searchParams.get('role') || 'TECHNICIAN';
        let sql = `
          SELECT m.*, u.full_name AS author_name, u.role AS author_role
          FROM ticket_messages m
          JOIN users u ON u.id = m.author_id
          WHERE m.ticket_id = $1
        `;
        if (role === 'CUSTOMER') {
          sql += ` AND m.is_internal = false`;
        }
        sql += ` ORDER BY m.created_at ASC, m.id ASC`;
        const { rows } = await pool.query(sql, [ticketId]);
        const data = rows.map((r) => ({
          id: Number(r.id),
          ticketId: Number(r.ticket_id),
          authorId: Number(r.author_id),
          authorName: r.author_name,
          authorRole: r.author_role,
          message: r.message,
          internal: Boolean(r.is_internal),
          createdAt: r.created_at
        }));
        return sendJson(res, 200, { success: true, data });
      }

      if (method === 'POST') {
        const body = await parseBody(req);
        const authorId = await getDefaultTechnicianId(body.authorId);
        if (!authorId) {
          return sendJson(res, 400, { success: false, message: 'Nenhum usuário autenticado.' });
        }
        const userRes = await pool.query(`SELECT full_name, role FROM users WHERE id = $1`, [authorId]);
        const authorName = userRes.rows[0]?.full_name || 'IT THECNICA';
        const authorRole = userRes.rows[0]?.role || 'ADMIN';
        const isInternal = authorRole === 'CUSTOMER' ? false : Boolean(body.internal);

        const insertRes = await pool.query(
          `INSERT INTO ticket_messages (ticket_id, author_id, message, is_internal)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [ticketId, authorId, body.message || '', isInternal]
        );
        await pool.query(`UPDATE tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [ticketId]);
        const row = insertRes.rows[0];

        if (authorRole === 'CUSTOMER') {
          await sendPushToAllAdmins({
            title: `Mensagem de ${authorName}`,
            body: String(body.message || '').slice(0, 120),
            url: '/?tab=tickets',
            tag: `msg-${ticketId}`
          });
        }

        return sendJson(res, 201, {
          success: true,
          data: {
            id: Number(row.id),
            ticketId: Number(row.ticket_id),
            authorId: Number(row.author_id),
            authorName,
            authorRole,
            message: row.message,
            internal: Boolean(row.is_internal),
            createdAt: row.created_at
          }
        });
      }
    }

    // 7. GET /api/v1/remote-sessions/active
    if (method === 'GET' && pathname === '/api/v1/remote-sessions/active') {
      const ticketIdParam = parsedUrl.searchParams.get('ticketId');
      const customerIdParam = parsedUrl.searchParams.get('customerId');
      let sql = `${SESSION_SELECT_SQL} WHERE rs.status IN ('IN_PROGRESS', 'PAUSED')`;
      const params = [];
      if (ticketIdParam) {
        params.push(Number(ticketIdParam));
        sql += ` AND rs.ticket_id = $${params.length}`;
      }
      if (customerIdParam) {
        params.push(Number(customerIdParam));
        sql += ` AND t.customer_id = $${params.length}`;
      }
      sql += ` ORDER BY rs.started_at DESC LIMIT 1`;
      const { rows } = await pool.query(sql, params);
      return sendJson(res, 200, { success: true, data: mapSessionRow(rows[0]) });
    }

    // 8. POST /api/v1/remote-sessions/start
    if (method === 'POST' && pathname === '/api/v1/remote-sessions/start') {
      const body = await parseBody(req);
      const ticketId = Number(body.ticketId);
      const toolUsed = body.toolUsed || 'ANYDESK';
      const techId = await getDefaultTechnicianId(body.technicianId);

      const existing = await pool.query(
        `${SESSION_SELECT_SQL}
         WHERE rs.ticket_id = $1 AND rs.status IN ('IN_PROGRESS', 'PAUSED')
         LIMIT 1`,
        [ticketId]
      );
      if (existing.rows[0]) {
        return sendJson(res, 200, { success: true, data: mapSessionRow(existing.rows[0]) });
      }

      const insertRes = await pool.query(
        `INSERT INTO remote_sessions (
          ticket_id, technician_id, tool_used, started_at, status,
          accumulated_seconds, billable_seconds, customer_consent
        ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, 'IN_PROGRESS', 0, 0, true)
        RETURNING id`,
        [ticketId, techId, toolUsed]
      );

      await pool.query(
        `UPDATE tickets SET status = 'IN_PROGRESS', technician_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [ticketId, techId]
      );

      const fullSession = await pool.query(`${SESSION_SELECT_SQL} WHERE rs.id = $1`, [insertRes.rows[0].id]);
      return sendJson(res, 201, { success: true, data: mapSessionRow(fullSession.rows[0]) });
    }

    // 9. POST /api/v1/remote-sessions/:id/pause | resume | end
    const sessionActionMatch = pathname.match(/^\/api\/v1\/remote-sessions\/(\d+)\/(pause|resume|end)$/);
    if (method === 'POST' && sessionActionMatch) {
      const sessionId = Number(sessionActionMatch[1]);
      const action = sessionActionMatch[2];

      const curRes = await pool.query(`${SESSION_SELECT_SQL} WHERE rs.id = $1`, [sessionId]);
      const session = curRes.rows[0];
      if (!session) {
        return sendJson(res, 404, { success: false, message: 'Sessão não encontrada' });
      }

      const totalSec = computeSessionSeconds(session);

      if (action === 'pause') {
        await pool.query(
          `UPDATE remote_sessions
           SET status = 'PAUSED',
               paused_at = CURRENT_TIMESTAMP,
               accumulated_seconds = $1,
               billable_seconds = $1,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [totalSec, sessionId]
        );
      } else if (action === 'resume') {
        await pool.query(
          `UPDATE remote_sessions
           SET status = 'IN_PROGRESS',
               paused_at = NULL,
               last_resumed_at = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [sessionId]
        );
      } else if (action === 'end') {
        const body = await parseBody(req);
        const resolutionSummary = (body.resolutionSummary || '').trim() || null;

        await pool.query(
          `UPDATE remote_sessions
           SET status = 'COMPLETED',
               ended_at = CURRENT_TIMESTAMP,
               accumulated_seconds = $1,
               billable_seconds = $1,
               notes = COALESCE($3::text, notes),
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [totalSec, sessionId, resolutionSummary]
        );
        await pool.query(
          `UPDATE tickets
           SET status = 'RESOLVED',
               resolution_summary = COALESCE($2::text, resolution_summary),
               resolved_at = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [session.ticket_id, resolutionSummary]
        );
      }

      const updated = await pool.query(`${SESSION_SELECT_SQL} WHERE rs.id = $1`, [sessionId]);
      return sendJson(res, 200, { success: true, data: mapSessionRow(updated.rows[0]) });
    }

    // 10. GET /api/v1/dashboard/summary
    if (method === 'GET' && pathname === '/api/v1/dashboard/summary') {
      const [ticketsRes, activeRes, minutesRes, finRes] = await Promise.all([
        pool.query(`${TICKETS_SELECT_SQL} ORDER BY t.created_at DESC, t.id DESC`),
        pool.query(`${SESSION_SELECT_SQL} WHERE rs.status IN ('IN_PROGRESS', 'PAUSED') ORDER BY rs.started_at DESC LIMIT 1`),
        pool.query(`SELECT COALESCE(SUM(billable_seconds), 0) AS total_sec FROM remote_sessions`),
        pool.query(`SELECT type, status, amount FROM financial_entries`)
      ]);

      const tickets = ticketsRes.rows.map(mapTicketRow);
      const openTickets = tickets.filter((t) => t.status === 'NEW' || t.status === 'TRIAGE').length;
      const inProgressTickets = tickets.filter((t) => t.status === 'IN_PROGRESS').length;
      const waitingApprovalTickets = tickets.filter((t) => t.status === 'WAITING_APPROVAL').length;
      const resolvedCount = tickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length;

      const ticketsPaid = tickets
        .filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED')
        .reduce((acc, t) => acc + (Number(t.estimatedPrice) || 0), 0);
      const manualIncome = finRes.rows
        .filter((r) => r.type === 'INCOME' && r.status === 'PAID')
        .reduce((acc, r) => acc + Number(r.amount || 0), 0);
      const manualExpense = finRes.rows
        .filter((r) => r.type === 'EXPENSE')
        .reduce((acc, r) => acc + Number(r.amount || 0), 0);

      const monthlyRevenue = ticketsPaid + manualIncome - manualExpense;
      const totalMinutesWorked = Math.round(Number(minutesRes.rows[0]?.total_sec || 0) / 60);

      return sendJson(res, 200, {
        success: true,
        data: {
          totalTickets: tickets.length,
          openTickets,
          inProgressTickets,
          waitingApprovalTickets,
          resolvedTickets: resolvedCount,
          monthlyRevenue,
          totalMinutesWorked,
          activeSession: mapSessionRow(activeRes.rows[0]),
          recentTickets: tickets.slice(0, 6)
        }
      });
    }

    // 11. Web Push Notifications (Safari iOS 16.4+ / Android / Desktop PWA)
    if (method === 'GET' && pathname === '/api/v1/push/public-key') {
      await ensurePushTable();
      const countRes = await pool.query(`SELECT COUNT(*)::int AS cnt FROM push_subscriptions`).catch(() => ({ rows: [{ cnt: 0 }] }));
      return sendJson(res, 200, {
        success: true,
        data: {
          publicKey: VAPID_PUBLIC_KEY,
          subscribedCount: countRes.rows[0]?.cnt || 0
        }
      });
    }

    if (method === 'POST' && pathname === '/api/v1/push/subscribe') {
      await ensurePushTable();
      const body = await parseBody(req);
      const sub = body.subscription || body;
      const endpoint = sub?.endpoint;
      const p256dh = sub?.keys?.p256dh;
      const auth = sub?.keys?.auth;
      const userAgent = String(body.userAgent || req.headers['user-agent'] || '').slice(0, 255);

      if (!endpoint || !p256dh || !auth) {
        return sendJson(res, 400, { success: false, message: 'Assinatura Push inválida.' });
      }

      await pool.query(
        `INSERT INTO push_subscriptions (endpoint, p256dh, auth, user_agent)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (endpoint) DO UPDATE
         SET p256dh = EXCLUDED.p256dh,
             auth = EXCLUDED.auth,
             user_agent = EXCLUDED.user_agent`,
        [endpoint, p256dh, auth, userAgent]
      );

      const countRes = await pool.query(`SELECT COUNT(*)::int AS cnt FROM push_subscriptions`).catch(() => ({ rows: [{ cnt: 1 }] }));
      return sendJson(res, 201, {
        success: true,
        data: { subscribedCount: countRes.rows[0]?.cnt || 1 }
      });
    }

    if (method === 'POST' && pathname === '/api/v1/push/test') {
      const result = await sendPushToAllAdmins({
        title: 'IT ONE • Alerta Mobile Ativo',
        body: 'Notificações em tempo real configuradas com sucesso no seu telefone!',
        url: '/?tab=tickets',
        tag: `test-${Date.now()}`
      });
      return sendJson(res, 200, { success: true, data: result });
    }

    return sendJson(res, 404, { success: false, message: `Endpoint não encontrado: ${method} ${pathname}` });
  } catch (err) {
    console.error('[Supabase API Error]:', err);
    return sendJson(res, 500, { success: false, message: err.message });
  }
}
