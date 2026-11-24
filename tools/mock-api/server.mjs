#!/usr/bin/env node
/**
 * Mainspring — API stub for frontend development and demos.
 *
 * WHY THIS EXISTS
 * The real backend is the Spring Boot application in ../backend. This file is a
 * dependency-free Node server that implements the *same REST contract* so the UI
 * can be developed and demonstrated on a machine without a JDK/Docker.
 *
 * It is NOT the product. Delete it the moment the Spring Boot API is running:
 *   VITE_API_PROXY=http://localhost:8080 npm run dev
 *
 * Run:  node tools/mock-api/server.mjs   (listens on 8080)
 */

import { createServer } from 'node:http';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { randomUUID } from 'node:crypto';

const PORT = Number(process.env.PORT || 8080);
const SECRET = 'mock-only-secret-do-not-use-in-production';
const DAY = 86400000;

/* ------------------------------------------------------------------ */
/* Tiny helpers                                                       */
/* ------------------------------------------------------------------ */

const b64url = (value) =>
  Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64url');

const sign = (payload) => {
  const body = `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(payload)}`;
  const sig = createHmac('sha256', SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
};

const verify = (token) => {
  if (!token || typeof token !== 'string') return null;
  const [header, payload, signature] = token.split('.');
  if (!header || !payload || !signature) return null;
  const expected = createHmac('sha256', SECRET).update(`${header}.${payload}`).digest('base64url');
  const given = Buffer.from(signature);
  const want = Buffer.from(expected);
  if (given.length !== want.length || !timingSafeEqual(given, want)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (parsed.exp && parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
};

const now = () => new Date().toISOString();
const daysAgo = (days) => new Date(Date.now() - days * DAY).toISOString();
const dateOnly = (offset = 0) => new Date(Date.now() + offset * DAY).toISOString().slice(0, 10);

const paginate = (items, query) => {
  const page = Math.max(0, Number(query.get('page') || 0));
  const size = Math.min(100, Math.max(1, Number(query.get('size') || 10)));
  const sort = query.get('sort');
  let list = items;

  if (sort) {
    const [field, direction] = sort.split(',');
    list = [...items].sort((a, b) => {
      const av = a[field];
      const bv = b[field];
      const comparison =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av ?? '').localeCompare(String(bv ?? ''));
      return direction === 'desc' ? -comparison : comparison;
    });
  }

  const totalElements = list.length;
  const totalPages = Math.ceil(totalElements / size);
  const content = list.slice(page * size, page * size + size);
  return {
    content,
    page,
    size,
    totalElements,
    totalPages,
    last: page + 1 >= totalPages,
    first: page === 0,
  };
};

class HttpError extends Error {
  constructor(status, code, message, fieldErrors) {
    super(message);
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

/* ------------------------------------------------------------------ */
/* Seed data                                                          */
/* ------------------------------------------------------------------ */

const state = {
  users: [
    { id: 1, name: 'Aarav Mehta', email: 'admin@mainspring.dev', password: 'Admin@123', role: 'ADMIN', enabled: true, createdAt: daysAgo(320) },
    { id: 2, name: 'Priya Rout', email: 'tech@mainspring.dev', password: 'Tech@123', role: 'TECHNICIAN', enabled: true, createdAt: daysAgo(280) },
    { id: 3, name: 'Devanshi Rao', email: 'viewer@mainspring.dev', password: 'Viewer@123', role: 'VIEWER', enabled: true, createdAt: daysAgo(150) },
  ],
  machines: [
    { id: 1, name: 'CNC Milling Center VX-900', code: 'CNC-0042', manufacturer: 'Haas', model: 'VF-2SS', location: 'Bay A · Cell 1', status: 'OPERATIONAL', installedOn: dateOnly(-1095), lastServiceAt: dateOnly(-75), nextServiceAt: dateOnly(15), serviceIntervalDays: 90, notes: 'Vibration baseline 1.8 mm/s.', createdAt: daysAgo(400), updatedAt: daysAgo(2) },
    { id: 2, name: 'Hydraulic Press HP-220', code: 'HYD-0107', manufacturer: 'Schuler', model: 'MSD-220', location: 'Bay B · Forming', status: 'UNDER_MAINTENANCE', installedOn: dateOnly(-1400), lastServiceAt: dateOnly(-120), nextServiceAt: dateOnly(-30), serviceIntervalDays: 90, notes: 'Return filter replaced last quarter.', createdAt: daysAgo(400), updatedAt: daysAgo(1) },
    { id: 3, name: 'Conveyor Line 3', code: 'CNV-0003', manufacturer: 'Interroll', model: 'RCP-400', location: 'Bay A · Logistics', status: 'OPERATIONAL', installedOn: dateOnly(-1500), lastServiceAt: dateOnly(-45), nextServiceAt: dateOnly(45), serviceIntervalDays: 90, notes: null, createdAt: daysAgo(390), updatedAt: daysAgo(6) },
    { id: 4, name: 'Industrial Robot Arm IR-8', code: 'ROB-0021', manufacturer: 'Fanuc', model: 'R-2000iC', location: 'Bay C · Welding', status: 'OPERATIONAL', installedOn: dateOnly(-900), lastServiceAt: dateOnly(-95), nextServiceAt: dateOnly(-5), serviceIntervalDays: 90, notes: 'Teach pendant cable showing wear.', createdAt: daysAgo(380), updatedAt: daysAgo(3) },
    { id: 5, name: 'Air Compressor AC-2', code: 'ACP-0002', manufacturer: 'Atlas Copco', model: 'GA-75', location: 'Utility Room', status: 'OPERATIONAL', installedOn: dateOnly(-1900), lastServiceAt: dateOnly(-30), nextServiceAt: dateOnly(60), serviceIntervalDays: 90, notes: null, createdAt: daysAgo(370), updatedAt: daysAgo(9) },
    { id: 6, name: 'Packaging Unit PU-4', code: 'PKG-0004', manufacturer: 'Bosch', model: 'Sigpack HSM', location: 'Bay D · Packing', status: 'OUT_OF_SERVICE', installedOn: dateOnly(-700), lastServiceAt: dateOnly(-20), nextServiceAt: dateOnly(70), serviceIntervalDays: 90, notes: 'Locked out pending interlock inspection.', createdAt: daysAgo(360), updatedAt: daysAgo(1) },
  ],
  parts: [
    { id: 1, sku: 'BRG-6205', name: 'Deep Groove Ball Bearing 6205-2RS', description: 'Sealed bearing for spindle and fan applications.', category: 'Bearings', unitOfMeasure: 'pcs', quantityOnHand: 14, reorderThreshold: 20, unitPrice: 320, createdAt: daysAgo(300), updatedAt: daysAgo(4) },
    { id: 2, sku: 'BRG-6308', name: 'Ball Bearing 6308-C3', description: 'Medium-duty bearing for drive ends.', category: 'Bearings', unitOfMeasure: 'pcs', quantityOnHand: 4, reorderThreshold: 10, unitPrice: 585, createdAt: daysAgo(300), updatedAt: daysAgo(11) },
    { id: 3, sku: 'SEL-40x60', name: 'Oil Seal 40x60x8 NBR', description: 'Nitrile shaft seal, 40 mm shaft.', category: 'Seals', unitOfMeasure: 'pcs', quantityOnHand: 46, reorderThreshold: 25, unitPrice: 145.5, createdAt: daysAgo(280), updatedAt: daysAgo(20) },
    { id: 4, sku: 'FLT-MIC-01', name: 'Hydraulic Filter Element 10µm', description: 'Return-line filter element for the press circuit.', category: 'Filtration', unitOfMeasure: 'pcs', quantityOnHand: 9, reorderThreshold: 12, unitPrice: 1240, createdAt: daysAgo(280), updatedAt: daysAgo(5) },
    { id: 5, sku: 'BLT-VBELT-B52', name: 'V-Belt B-52', description: 'Classical wrapped V-belt, B-section.', category: 'Belts & Pulleys', unitOfMeasure: 'pcs', quantityOnHand: 12, reorderThreshold: 8, unitPrice: 890, createdAt: daysAgo(260), updatedAt: daysAgo(16) },
    { id: 6, sku: 'CNV-BELT-800', name: 'Conveyor Belt 800 mm × 12 m', description: 'Replacement belt for Conveyor Line 3.', category: 'Belts & Pulleys', unitOfMeasure: 'pcs', quantityOnHand: 1, reorderThreshold: 2, unitPrice: 42500, createdAt: daysAgo(260), updatedAt: daysAgo(60) },
    { id: 7, sku: 'SOL-24V-25A', name: 'Solenoid Valve 24V DC', description: 'Direct-acting valve for press clamp circuit.', category: 'Valves', unitOfMeasure: 'pcs', quantityOnHand: 7, reorderThreshold: 6, unitPrice: 2100, createdAt: daysAgo(240), updatedAt: daysAgo(30) },
    { id: 8, sku: 'PMP-GEAR-05', name: 'Gear Pump 0.5 cc/rev', description: 'Hydraulic gear pump for the HP-220.', category: 'Hydraulics', unitOfMeasure: 'pcs', quantityOnHand: 3, reorderThreshold: 4, unitPrice: 12800, createdAt: daysAgo(240), updatedAt: daysAgo(40) },
    { id: 9, sku: 'REL-220V-C1', name: 'Thermal Overload Relay 9-14 A', description: 'Motor protection relay.', category: 'Electrical', unitOfMeasure: 'pcs', quantityOnHand: 22, reorderThreshold: 10, unitPrice: 760, createdAt: daysAgo(220), updatedAt: daysAgo(18) },
    { id: 10, sku: 'SW-LIMIT-L1', name: 'Limit Switch IP67', description: 'Guard-door and end-stop switch.', category: 'Electrical', unitOfMeasure: 'pcs', quantityOnHand: 31, reorderThreshold: 15, unitPrice: 480, createdAt: daysAgo(220), updatedAt: daysAgo(22) },
    { id: 11, sku: 'LUB-GRS-400', name: 'Lithium Grease Cartridge 400 g', description: 'Multi-purpose lithium grease.', category: 'Lubricants', unitOfMeasure: 'pcs', quantityOnHand: 5, reorderThreshold: 8, unitPrice: 320, createdAt: daysAgo(200), updatedAt: daysAgo(12) },
    { id: 12, sku: 'FLT-AIR-P5', name: 'Air Filter Element P5', description: 'Compressor intake filter element.', category: 'Filtration', unitOfMeasure: 'pcs', quantityOnHand: 18, reorderThreshold: 10, unitPrice: 640, createdAt: daysAgo(200), updatedAt: daysAgo(9) },
  ],
  tickets: [],
  usages: [],
  alerts: [],
  audit: [],
};

let ticketSeq = 100;
let usageSeq = 100;
let alertSeq = 100;
let auditSeq = 100;
let entitySeq = 1000;

const addTicket = (data) => {
  const ticket = {
    id: entitySeq++,
    ticketCode: data.ticketCode,
    title: data.title,
    description: data.description ?? null,
    machineId: data.machineId,
    technicianId: data.technicianId ?? null,
    createdById: data.createdById ?? 1,
    status: data.status ?? 'OPEN',
    priority: data.priority ?? 'MEDIUM',
    openedAt: data.openedAt ?? daysAgo(0),
    closedAt: data.closedAt ?? null,
    resolution: data.resolution ?? null,
    createdAt: data.openedAt ?? now(),
    updatedAt: now(),
  };
  state.tickets.push(ticket);
  return ticket;
};

const addUsage = (ticket, part, quantity, userId, when) => {
  const usage = {
    id: usageSeq++,
    ticketId: ticket.id,
    partId: part.id,
    quantityUsed: quantity,
    unitCost: part.unitPrice,
    loggedById: userId,
    loggedAt: when ?? now(),
  };
  state.usages.push(usage);
  part.quantityOnHand -= quantity;
  part.updatedAt = now();
  return usage;
};

addTicket({ ticketCode: 'TKT-2026-0001', title: 'Replace spindle bearing on CNC-0042', description: 'Audible growl from the spindle at 8,000 rpm. Vibration reading 4.2 mm/s, up from the 1.8 mm/s baseline. Suspect front bearing.', machineId: 1, technicianId: 2, status: 'OPEN', priority: 'HIGH', openedAt: daysAgo(2) });
addTicket({ ticketCode: 'TKT-2026-0002', title: 'Hydraulic pressure drop on press', description: 'System pressure falls from 210 to 160 bar under load. Suspect worn gear pump or blocked return filter. Production stopped on the forming line.', machineId: 2, technicianId: 2, status: 'IN_PROGRESS', priority: 'CRITICAL', openedAt: daysAgo(6) });
addTicket({ ticketCode: 'TKT-2026-0003', title: 'Conveyor belt tracking off-centre', description: 'Belt drifts 15 mm towards the drive side and frays the edge. Tension on the tail pulley is uneven after last week\'s splice.', machineId: 3, technicianId: 2, status: 'IN_PROGRESS', priority: 'HIGH', openedAt: daysAgo(4) });
addTicket({ ticketCode: 'TKT-2026-0004', title: 'Teach pendant cable frayed', description: 'Insulation worn through at the strain relief. Robot still operational but the cable fails a pull test. Schedule during the next changeover.', machineId: 4, technicianId: 2, status: 'OPEN', priority: 'MEDIUM', openedAt: daysAgo(1) });
const closedCompressor = addTicket({ ticketCode: 'TKT-2026-0005', title: 'Compressor tripping on high temperature', description: 'Unit tripped three times on the thermal cut-out. Ambient 41 °C, discharge 118 °C.', machineId: 5, technicianId: 2, status: 'CLOSED', priority: 'HIGH', openedAt: daysAgo(9), closedAt: daysAgo(8), resolution: 'Replaced the clogged air filter element and cleaned the aftercooler fins. Discharge temperature back to 92 °C after a 30-minute soak test.' });
const closedLube = addTicket({ ticketCode: 'TKT-2026-0006', title: 'Quarterly lubrication — CNC spindle', description: 'Scheduled 90-day lubrication of the spindle and linear guides.', machineId: 1, technicianId: 2, status: 'CLOSED', priority: 'LOW', openedAt: daysAgo(12), closedAt: daysAgo(11), resolution: 'Completed the full lubrication route. No unusual noise or heat.' });
addTicket({ ticketCode: 'TKT-2026-0007', title: 'Safety interlock intermittent on packaging unit', description: 'Guard door interlock drops out mid-cycle without the door being opened. Unit locked out pending inspection.', machineId: 6, status: 'OPEN', priority: 'CRITICAL', openedAt: daysAgo(3) });
const closedBelt = addTicket({ ticketCode: 'TKT-2026-0008', title: 'Replace worn V-belt on conveyor drive', description: 'Belt glazing and cracking visible on the outer face. Squeal on cold start.', machineId: 3, technicianId: 2, status: 'CLOSED', priority: 'MEDIUM', openedAt: daysAgo(16), closedAt: daysAgo(15), resolution: 'Fitted a new B-52 belt and re-tensioned to 1.6% elongation.' });

addUsage(closedCompressor, state.parts[11], 2, 2, daysAgo(8));
addUsage(closedLube, state.parts[10], 1, 2, daysAgo(11));
addUsage(closedBelt, state.parts[4], 2, 2, daysAgo(15));

const audit = (action, entity, entityId, details, actor) => {
  state.audit.unshift({
    id: auditSeq++,
    actorName: actor?.name ?? 'System',
    actorRole: actor?.role ?? null,
    action,
    entity,
    entityId,
    details,
    ip: '127.0.0.1',
    createdAt: now(),
  });
};

audit('CREATE', 'Machine', 1, 'Created machine CNC-0042', state.users[0]);
audit('CREATE', 'MaintenanceTicket', 100, 'Opened ticket TKT-2026-0007 on PKG-0004', state.users[0]);
audit('LOGIN', 'User', 1, 'Signed in', state.users[0]);

/* ------------------------------------------------------------------ */
/* Alert engine                                                       */
/* ------------------------------------------------------------------ */

const addAlert = (type, severity, title, message, referenceType, referenceId) => {
  const existing = state.alerts.find(
    (alert) => alert.type === type && alert.referenceId === referenceId && !alert.readAt,
  );
  if (existing) return null;
  const alert = {
    id: alertSeq++,
    type,
    severity,
    title,
    message,
    referenceType,
    referenceId,
    recipientEmail: null,
    emailedAt: null,
    readAt: null,
    createdAt: now(),
  };
  state.alerts.unshift(alert);
  return alert;
};

const scanAlerts = () => {
  let lowStockAlerts = 0;
  let serviceDueAlerts = 0;
  let overdueTicketAlerts = 0;

  for (const part of state.parts) {
    if (part.quantityOnHand <= part.reorderThreshold) {
      const alert = addAlert(
        'LOW_STOCK',
        part.quantityOnHand === 0 ? 'CRITICAL' : 'WARNING',
        `Low stock: ${part.name}`,
        `${part.name} (${part.sku}) is down to ${part.quantityOnHand} ${part.unitOfMeasure} — at or below the reorder threshold of ${part.reorderThreshold}.`,
        'SparePart',
        part.id,
      );
      if (alert) lowStockAlerts += 1;
    }
  }

  const horizon = Date.now() + 14 * DAY;
  for (const machine of state.machines) {
    if (!machine.nextServiceAt) continue;
    const due = new Date(`${machine.nextServiceAt}T00:00:00`).getTime();
    if (due <= horizon) {
      const days = Math.round((due - Date.now()) / DAY);
      const when = days < 0 ? `${Math.abs(days)} day(s) overdue` : days === 0 ? 'due today' : `due in ${days} day(s)`;
      const alert = addAlert(
        'SERVICE_DUE',
        days < 0 ? 'CRITICAL' : 'WARNING',
        `Service due: ${machine.name}`,
        `${machine.name} (${machine.code}) has a scheduled service ${when} — last serviced ${machine.lastServiceAt}.`,
        'Machine',
        machine.id,
      );
      if (alert) serviceDueAlerts += 1;
    }
  }

  const threshold = Date.now() - 72 * 3600000;
  for (const ticket of state.tickets) {
    if (ticket.status === 'CLOSED') continue;
    if (new Date(ticket.openedAt).getTime() < threshold) {
      const hours = Math.round((Date.now() - new Date(ticket.openedAt).getTime()) / 3600000);
      const alert = addAlert(
        'TICKET_OVERDUE',
        'WARNING',
        `Stale ticket: ${ticket.ticketCode}`,
        `${ticket.ticketCode} "${ticket.title}" has been ${ticket.status.toLowerCase().replace('_', ' ')} for ${hours} hour(s) on ${state.machines.find((m) => m.id === ticket.machineId)?.code}.`,
        'MaintenanceTicket',
        ticket.id,
      );
      if (alert) overdueTicketAlerts += 1;
    }
  }

  return { lowStockAlerts, serviceDueAlerts, overdueTicketAlerts, emailsSent: 0 };
};

/* ------------------------------------------------------------------ */
/* Serialisers                                                        */
/* ------------------------------------------------------------------ */

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  enabled: user.enabled,
  createdAt: user.createdAt,
});

const machineSummary = (machine) => ({
  id: machine.id,
  name: machine.name,
  code: machine.code,
  location: machine.location,
  status: machine.status,
  nextServiceAt: machine.nextServiceAt,
});

const machineResponse = (machine) => {
  const openTickets = state.tickets.filter((t) => t.machineId === machine.id && t.status !== 'CLOSED').length;
  return {
    ...machine,
    openTickets,
    serviceDue: !!machine.nextServiceAt && machine.nextServiceAt <= dateOnly(0),
  };
};

const partResponse = (part) => ({
  ...part,
  stockValue: Number(((part.unitPrice ?? 0) * part.quantityOnHand).toFixed(2)),
  lowStock: part.quantityOnHand <= part.reorderThreshold,
});

const usageResponse = (usage) => {
  const part = state.parts.find((p) => p.id === usage.partId);
  const user = state.users.find((u) => u.id === usage.loggedById);
  return {
    id: usage.id,
    partId: usage.partId,
    sku: part?.sku,
    partName: part?.name,
    quantityUsed: usage.quantityUsed,
    unitCost: usage.unitCost,
    lineCost: Number(((usage.unitCost ?? 0) * usage.quantityUsed).toFixed(2)),
    loggedAt: usage.loggedAt,
    loggedByName: user?.name ?? null,
  };
};

const ticketResponse = (ticket) => {
  const machine = state.machines.find((m) => m.id === ticket.machineId);
  const technician = state.users.find((u) => u.id === ticket.technicianId);
  const creator = state.users.find((u) => u.id === ticket.createdById);
  return {
    id: ticket.id,
    ticketCode: ticket.ticketCode,
    title: ticket.title,
    description: ticket.description,
    status: ticket.status,
    priority: ticket.priority,
    machine: machine ? machineSummary(machine) : null,
    assignedTechnician: technician ? publicUser(technician) : null,
    createdBy: creator ? publicUser(creator) : null,
    openedAt: ticket.openedAt,
    closedAt: ticket.closedAt,
    resolution: ticket.resolution,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    parts: state.usages.filter((u) => u.ticketId === ticket.id).map(usageResponse),
  };
};

const alertResponse = (alert) => ({ ...alert, unread: !alert.readAt });

/* ------------------------------------------------------------------ */
/* Auth helpers                                                       */
/* ------------------------------------------------------------------ */

const authenticate = (req) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const payload = verify(token);
  if (!payload) return null;
  return state.users.find((u) => u.id === payload.sub) ?? null;
};

const requireRole = (user, roles) => {
  if (!user) throw new HttpError(401, 'UNAUTHENTICATED', 'You must be signed in to access this resource.');
  if (roles && !roles.includes(user.role)) {
    throw new HttpError(403, 'ACCESS_DENIED', 'Your role does not permit this action.');
  }
  return user;
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) reject(new HttpError(413, 'PAYLOAD_TOO_LARGE', 'Request body too large.'));
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new HttpError(400, 'MALFORMED_JSON', 'Request body is not valid JSON.'));
      }
    });
    req.on('error', reject);
  });

/* ------------------------------------------------------------------ */
/* Route handlers                                                     */
/* ------------------------------------------------------------------ */

const routes = [];
const route = (method, pattern, handler, roles) => {
  const keys = [];
  const regex = new RegExp(
    `^${pattern.replace(/:(\w+)/g, (_, key) => {
      keys.push(key);
      return '(\\d+)';
    })}$`,
  );
  routes.push({ method, regex, keys, handler, roles });
};

/* ---- Auth ---- */

route('POST', '/api/v1/auth/login', async (req) => {
  const body = await readBody(req);
  const email = String(body.email || '').trim().toLowerCase();
  const user = state.users.find((u) => u.email === email);
  if (!user || user.password !== body.password) {
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
  }
  if (!user.enabled) throw new HttpError(400, 'ACCOUNT_DISABLED', 'This account has been disabled.');
  audit('LOGIN', 'User', user.id, 'Signed in', user);
  return {
    token: sign({ sub: user.id, role: user.role, name: user.name, email: user.email, exp: Date.now() + 12 * 3600000 }),
    tokenType: 'Bearer',
    expiresIn: 43200,
    user: publicUser(user),
  };
});

route('POST', '/api/v1/auth/register', async (req) => {
  const body = await readBody(req);
  if (state.users.some((u) => u.email === String(body.email).toLowerCase())) {
    throw new HttpError(409, 'EMAIL_IN_USE', 'An account with this email already exists.');
  }
  const user = {
    id: entitySeq++,
    name: body.name,
    email: String(body.email).toLowerCase(),
    password: body.password,
    role: 'VIEWER',
    enabled: true,
    createdAt: now(),
  };
  state.users.push(user);
  audit('CREATE', 'User', user.id, `Created viewer account ${user.email}`, user);
  return publicUser(user);
});

route('GET', '/api/v1/auth/me', async (req) => publicUser(requireRole(authenticate(req))), null);

route('POST', '/api/v1/auth/change-password', async (req) => {
  const user = requireRole(authenticate(req));
  const body = await readBody(req);
  if (user.password !== body.currentPassword) {
    throw new HttpError(400, 'INVALID_CREDENTIALS', 'Current password is incorrect.');
  }
  user.password = body.newPassword;
  audit('CHANGE_PASSWORD', 'User', user.id, 'Password changed', user);
  return null;
});

/* ---- Dashboard ---- */

route('GET', '/api/v1/dashboard', async (req) => {
  const user = requireRole(authenticate(req));
  const machines = state.machines;
  const operational = machines.filter((m) => m.status === 'OPERATIONAL').length;
  const under = machines.filter((m) => m.status === 'UNDER_MAINTENANCE').length;
  const down = machines.filter((m) => m.status === 'OUT_OF_SERVICE').length;

  const inventoryValue = Number(
    state.parts.reduce((sum, p) => sum + (p.unitPrice ?? 0) * p.quantityOnHand, 0).toFixed(2),
  );
  const lowStockParts = state.parts.filter((p) => p.quantityOnHand <= p.reorderThreshold);

  const open = state.tickets.filter((t) => t.status === 'OPEN').length;
  const inProgress = state.tickets.filter((t) => t.status === 'IN_PROGRESS').length;
  const closed = state.tickets.filter((t) => t.status === 'CLOSED').length;

  const trend = [];
  for (let offset = 13; offset >= 0; offset -= 1) {
    const day = new Date(Date.now() - offset * DAY);
    const iso = day.toISOString().slice(0, 10);
    const opened = state.tickets.filter((t) => t.openedAt.slice(0, 10) === iso).length;
    const closedToday = state.tickets.filter((t) => t.closedAt && t.closedAt.slice(0, 10) === iso).length;
    trend.push({
      label: day.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      opened,
      closed: closedToday,
    });
  }

  const upcoming = machines
    .filter((m) => m.nextServiceAt && m.nextServiceAt <= dateOnly(30))
    .sort((a, b) => a.nextServiceAt.localeCompare(b.nextServiceAt))
    .slice(0, 6)
    .map((machine) => ({
      machineId: machine.id,
      machineName: machine.name,
      machineCode: machine.code,
      location: machine.location,
      nextServiceAt: machine.nextServiceAt,
      daysUntilDue: Math.round(
        (new Date(`${machine.nextServiceAt}T00:00:00`) - new Date(`${dateOnly(0)}T00:00:00`)) / DAY,
      ),
      openTickets: state.tickets.filter((t) => t.machineId === machine.id && t.status !== 'CLOSED').length,
    }));

  return {
    machinesTotal: machines.length,
    machinesOperational: operational,
    machinesUnderMaintenance: under,
    machinesOutOfService: down,
    partsTotal: state.parts.length,
    partsLowStock: lowStockParts.length,
    inventoryValue,
    ticketsOpen: open,
    ticketsInProgress: inProgress,
    ticketsClosed: closed,
    ticketsOverdue: open + inProgress,
    unreadAlerts: state.alerts.filter((a) => !a.readAt).length,
    fleetAvailability: machines.length ? Math.round((operational / machines.length) * 10000) / 100 : 0,
    ticketStatusBreakdown: { OPEN: open, IN_PROGRESS: inProgress, CLOSED: closed },
    ticketTrend: trend,
    upcomingServices: upcoming,
    lowStockParts: lowStockParts.slice(0, 5).map(partResponse),
    recentAlerts: state.alerts.filter((a) => !a.readAt).slice(0, 5).map(alertResponse),
    recentActivity: state.audit.slice(0, 6),
    _viewer: user.id,
  };
});

/* ---- Machines ---- */

route('GET', '/api/v1/machines', async (req, user, params, query) => {
  requireRole(authenticate(req));
  const q = (query.get('q') || '').toLowerCase();
  const status = query.get('status');
  let list = state.machines.map(machineResponse);
  if (q) {
    list = list.filter((m) =>
      [m.name, m.code, m.location, m.manufacturer].some((value) => String(value || '').toLowerCase().includes(q)),
    );
  }
  if (status) list = list.filter((m) => m.status === status);
  return paginate(list, query);
});

route('GET', '/api/v1/machines/:id', async (req, user, params) => {
  requireRole(authenticate(req));
  const machine = state.machines.find((m) => m.id === params.id);
  if (!machine) throw new HttpError(404, 'NOT_FOUND', `Machine with id '${params.id}' was not found`);
  return machineResponse(machine);
});

route('GET', '/api/v1/machines/:id/tickets', async (req, user, params, query) => {
  requireRole(authenticate(req));
  const list = state.tickets.filter((t) => t.machineId === params.id).map(ticketResponse);
  return paginate(list, query);
});

route('POST', '/api/v1/machines', async (req, user) => {
  const body = await readBody(req);
  if (state.machines.some((m) => m.code.toLowerCase() === String(body.code).toLowerCase())) {
    throw new HttpError(409, 'DUPLICATE_CODE', `A machine with code '${body.code}' already exists.`);
  }
  const machine = {
    id: entitySeq++,
    name: body.name,
    code: body.code,
    manufacturer: body.manufacturer || null,
    model: body.model || null,
    location: body.location || null,
    status: body.status || 'OPERATIONAL',
    installedOn: body.installedOn || null,
    lastServiceAt: body.lastServiceAt || null,
    nextServiceAt: body.nextServiceAt || null,
    serviceIntervalDays: body.serviceIntervalDays ?? 90,
    notes: body.notes || null,
    createdAt: now(),
    updatedAt: now(),
  };
  state.machines.push(machine);
  audit('CREATE', 'Machine', machine.id, `Created machine ${machine.code}`, user);
  return machineResponse(machine);
}, ['ADMIN']);

route('PUT', '/api/v1/machines/:id', async (req, user, params) => {
  const machine = state.machines.find((m) => m.id === params.id);
  if (!machine) throw new HttpError(404, 'NOT_FOUND', 'Machine not found');
  const body = await readBody(req);
  if (
    state.machines.some(
      (m) => m.id !== machine.id && m.code.toLowerCase() === String(body.code).toLowerCase(),
    )
  ) {
    throw new HttpError(409, 'DUPLICATE_CODE', `A machine with code '${body.code}' already exists.`);
  }
  Object.assign(machine, {
    name: body.name,
    code: body.code,
    manufacturer: body.manufacturer || null,
    model: body.model || null,
    location: body.location || null,
    status: body.status || machine.status,
    installedOn: body.installedOn || null,
    lastServiceAt: body.lastServiceAt || null,
    nextServiceAt: body.nextServiceAt || null,
    serviceIntervalDays: body.serviceIntervalDays ?? machine.serviceIntervalDays,
    notes: body.notes || null,
    updatedAt: now(),
  });
  audit('UPDATE', 'Machine', machine.id, `Updated machine ${machine.code}`, user);
  return machineResponse(machine);
}, ['ADMIN']);

route('DELETE', '/api/v1/machines/:id', async (req, user, params) => {
  const machine = state.machines.find((m) => m.id === params.id);
  if (!machine) throw new HttpError(404, 'NOT_FOUND', 'Machine not found');
  const open = state.tickets.filter((t) => t.machineId === machine.id && t.status !== 'CLOSED').length;
  if (open > 0) {
    throw new HttpError(409, 'MACHINE_HAS_OPEN_TICKETS', `Machine ${machine.code} still has ${open} open ticket(s).`);
  }
  state.machines = state.machines.filter((m) => m.id !== machine.id);
  audit('DELETE', 'Machine', machine.id, `Deleted machine ${machine.code}`, user);
  return null;
}, ['ADMIN']);

/* ---- Parts ---- */

route('GET', '/api/v1/parts/categories', async (req) => {
  requireRole(authenticate(req));
  return [...new Set(state.parts.map((p) => p.category).filter(Boolean))].sort();
});

route('GET', '/api/v1/parts', async (req, user, params, query) => {
  requireRole(authenticate(req));
  const q = (query.get('q') || '').toLowerCase();
  const category = (query.get('category') || '').toLowerCase();
  const lowStock = query.get('lowStock') === 'true';

  let list = state.parts.map(partResponse);
  if (q) {
    list = list.filter((p) =>
      [p.sku, p.name, p.description, p.category].some((value) => String(value || '').toLowerCase().includes(q)),
    );
  }
  if (category) list = list.filter((p) => p.category?.toLowerCase() === category);
  if (lowStock) list = list.filter((p) => p.quantityOnHand <= p.reorderThreshold);
  return paginate(list, query);
});

route('GET', '/api/v1/parts/:id', async (req, user, params) => {
  requireRole(authenticate(req));
  const part = state.parts.find((p) => p.id === params.id);
  if (!part) throw new HttpError(404, 'NOT_FOUND', 'Part not found');
  return partResponse(part);
});

route('POST', '/api/v1/parts', async (req, user) => {
  const body = await readBody(req);
  if (state.parts.some((p) => p.sku.toLowerCase() === String(body.sku).toLowerCase())) {
    throw new HttpError(409, 'DUPLICATE_SKU', `A part with SKU '${body.sku}' already exists.`);
  }
  const part = {
    id: entitySeq++,
    sku: body.sku,
    name: body.name,
    description: body.description || null,
    category: body.category || null,
    unitOfMeasure: body.unitOfMeasure || 'pcs',
    quantityOnHand: body.quantityOnHand ?? 0,
    reorderThreshold: body.reorderThreshold ?? 0,
    unitPrice: body.unitPrice ?? null,
    createdAt: now(),
    updatedAt: now(),
  };
  state.parts.push(part);
  if (part.quantityOnHand <= part.reorderThreshold) {
    addAlert(
      'LOW_STOCK',
      part.quantityOnHand === 0 ? 'CRITICAL' : 'WARNING',
      `Low stock: ${part.name}`,
      `${part.name} (${part.sku}) is at or below its reorder threshold.`,
      'SparePart',
      part.id,
    );
  }
  audit('CREATE', 'SparePart', part.id, `Created part ${part.sku}`, user);
  return partResponse(part);
}, ['ADMIN']);

route('PUT', '/api/v1/parts/:id', async (req, user, params) => {
  const part = state.parts.find((p) => p.id === params.id);
  if (!part) throw new HttpError(404, 'NOT_FOUND', 'Part not found');
  const body = await readBody(req);
  Object.assign(part, {
    sku: body.sku,
    name: body.name,
    description: body.description || null,
    category: body.category || null,
    unitOfMeasure: body.unitOfMeasure || part.unitOfMeasure,
    quantityOnHand: body.quantityOnHand ?? part.quantityOnHand,
    reorderThreshold: body.reorderThreshold ?? part.reorderThreshold,
    unitPrice: body.unitPrice ?? null,
    updatedAt: now(),
  });
  audit('UPDATE', 'SparePart', part.id, `Updated part ${part.sku}`, user);
  return partResponse(part);
}, ['ADMIN']);

route('POST', '/api/v1/parts/:id/adjust', async (req, user, params) => {
  const part = state.parts.find((p) => p.id === params.id);
  if (!part) throw new HttpError(404, 'NOT_FOUND', 'Part not found');
  const body = await readBody(req);
  const delta = Number(body.delta || 0);
  if (!delta) throw new HttpError(400, 'ZERO_ADJUSTMENT', 'Delta must not be zero.');
  const projected = part.quantityOnHand + delta;
  if (projected < 0) {
    throw new HttpError(400, 'NEGATIVE_STOCK', `Adjustment would leave ${projected} units on hand. Stock cannot go negative.`);
  }
  part.quantityOnHand = projected;
  part.updatedAt = now();
  if (part.quantityOnHand <= part.reorderThreshold) {
    addAlert('LOW_STOCK', part.quantityOnHand === 0 ? 'CRITICAL' : 'WARNING', `Low stock: ${part.name}`,
      `${part.name} (${part.sku}) is at or below its reorder threshold.`, 'SparePart', part.id);
  }
  audit('ADJUST_STOCK', 'SparePart', part.id, `Stock ${delta > 0 ? '+' : ''}${delta} -> ${projected}`, user);
  return partResponse(part);
}, ['ADMIN']);

route('DELETE', '/api/v1/parts/:id', async (req, user, params) => {
  const part = state.parts.find((p) => p.id === params.id);
  if (!part) throw new HttpError(404, 'NOT_FOUND', 'Part not found');
  if (state.usages.some((u) => u.partId === part.id)) {
    throw new HttpError(409, 'PART_HAS_USAGE_HISTORY', `Part ${part.sku} has consumption history and cannot be deleted.`);
  }
  state.parts = state.parts.filter((p) => p.id !== part.id);
  audit('DELETE', 'SparePart', part.id, `Deleted part ${part.sku}`, user);
  return null;
}, ['ADMIN']);

/* ---- Tickets ---- */

route('GET', '/api/v1/tickets', async (req, user, params, query) => {
  requireRole(authenticate(req));
  const q = (query.get('q') || '').toLowerCase();
  const status = query.get('status');
  const priority = query.get('priority');
  const machineId = query.get('machineId');
  const technicianId = query.get('technicianId');

  let list = state.tickets.map(ticketResponse);
  if (q) {
    list = list.filter((t) =>
      [t.ticketCode, t.title, t.description, t.machine?.name].some((value) =>
        String(value || '').toLowerCase().includes(q),
      ),
    );
  }
  if (status) list = list.filter((t) => t.status === status);
  if (priority) list = list.filter((t) => t.priority === priority);
  if (machineId) list = list.filter((t) => String(t.machine?.id) === machineId);
  if (technicianId) list = list.filter((t) => String(t.assignedTechnician?.id) === technicianId);
  return paginate(list, query);
});

route('GET', '/api/v1/tickets/:id', async (req, user, params) => {
  requireRole(authenticate(req));
  const ticket = state.tickets.find((t) => t.id === params.id);
  if (!ticket) throw new HttpError(404, 'NOT_FOUND', 'Ticket not found');
  return ticketResponse(ticket);
});

route('POST', '/api/v1/tickets', async (req, user) => {
  const body = await readBody(req);
  const machine = state.machines.find((m) => m.id === Number(body.machineId));
  if (!machine) throw new HttpError(404, 'NOT_FOUND', 'Machine not found');
  if (body.technicianId) {
    const tech = state.users.find((u) => u.id === Number(body.technicianId));
    if (!tech) throw new HttpError(404, 'NOT_FOUND', 'Technician not found');
    if (tech.role === 'VIEWER') throw new HttpError(400, 'INVALID_TECHNICIAN', 'A viewer cannot be assigned maintenance work.');
  }
  const ticket = addTicket({
    ticketCode: `TKT-${new Date().getFullYear()}-${String(state.tickets.length + 1).padStart(4, '0')}`,
    title: body.title,
    description: body.description,
    machineId: machine.id,
    technicianId: body.technicianId ?? null,
    createdById: user.id,
    status: 'OPEN',
    priority: body.priority || 'MEDIUM',
    openedAt: now(),
  });
  if (machine.status === 'OPERATIONAL') machine.status = 'UNDER_MAINTENANCE';
  audit('CREATE', 'MaintenanceTicket', ticket.id, `Opened ticket ${ticket.ticketCode} on ${machine.code}`, user);
  return ticketResponse(ticket);
}, ['ADMIN']);

route('PATCH', '/api/v1/tickets/:id', async (req, user, params) => {
  const ticket = state.tickets.find((t) => t.id === params.id);
  if (!ticket) throw new HttpError(404, 'NOT_FOUND', 'Ticket not found');
  const body = await readBody(req);
  if (body.title) ticket.title = body.title;
  if (body.description !== undefined) ticket.description = body.description;
  if (body.priority) ticket.priority = body.priority;
  if (body.technicianId) ticket.technicianId = Number(body.technicianId);
  if (body.status && body.status !== 'CLOSED') ticket.status = body.status;
  ticket.updatedAt = now();
  audit('UPDATE', 'MaintenanceTicket', ticket.id, 'Updated ticket', user);
  return ticketResponse(ticket);
}, ['ADMIN']);

route('POST', '/api/v1/tickets/:id/assign', async (req, user, params) => {
  const ticket = state.tickets.find((t) => t.id === params.id);
  if (!ticket) throw new HttpError(404, 'NOT_FOUND', 'Ticket not found');
  const body = await readBody(req);
  const tech = state.users.find((u) => u.id === Number(body.technicianId));
  if (!tech) throw new HttpError(404, 'NOT_FOUND', 'Technician not found');
  ticket.technicianId = tech.id;
  ticket.updatedAt = now();
  audit('ASSIGN', 'MaintenanceTicket', ticket.id, `Assigned ${ticket.ticketCode} to ${tech.name}`, user);
  return ticketResponse(ticket);
}, ['ADMIN']);

route('POST', '/api/v1/tickets/:id/start', async (req, user, params) => {
  const ticket = state.tickets.find((t) => t.id === params.id);
  if (!ticket) throw new HttpError(404, 'NOT_FOUND', 'Ticket not found');
  if (ticket.status === 'CLOSED') throw new HttpError(409, 'TICKET_CLOSED', `Ticket ${ticket.ticketCode} is already closed.`);
  if (user.role !== 'ADMIN' && ticket.technicianId !== user.id) {
    throw new HttpError(403, 'FORBIDDEN', 'This ticket is assigned to another technician.');
  }
  if (!ticket.technicianId) ticket.technicianId = user.id;
  ticket.status = 'IN_PROGRESS';
  ticket.updatedAt = now();
  audit('START', 'MaintenanceTicket', ticket.id, `Started ${ticket.ticketCode}`, user);
  return ticketResponse(ticket);
}, ['ADMIN', 'TECHNICIAN']);

const consumeStock = (ticket, items, user) => {
  if (!Array.isArray(items) || items.length === 0) return [];
  const merged = new Map();
  for (const item of items) {
    if (!item?.partId || !item.quantity || item.quantity < 1) {
      throw new HttpError(400, 'INVALID_QUANTITY', 'Each usage line needs a partId and a quantity of at least 1.');
    }
    merged.set(Number(item.partId), (merged.get(Number(item.partId)) || 0) + Number(item.quantity));
  }

  // Validate every line BEFORE mutating anything — the mock's version of a
  // transactional rollback.
  const resolved = [];
  for (const [partId, quantity] of merged) {
    const part = state.parts.find((p) => p.id === partId);
    if (!part) throw new HttpError(404, 'NOT_FOUND', `SparePart with id '${partId}' was not found`);
    if (part.quantityOnHand < quantity) {
      throw new HttpError(
        409,
        'INSUFFICIENT_STOCK',
        `Insufficient stock for ${part.name} (${part.sku}): requested ${quantity}, only ${part.quantityOnHand} available`,
      );
    }
    resolved.push({ part, quantity });
  }

  return resolved.map(({ part, quantity }) => {
    const usage = addUsage(ticket, part, quantity, user.id);
    if (part.quantityOnHand <= part.reorderThreshold) {
      addAlert(
        'LOW_STOCK',
        part.quantityOnHand === 0 ? 'CRITICAL' : 'WARNING',
        `Low stock: ${part.name}`,
        `${part.name} (${part.sku}) is down to ${part.quantityOnHand} ${part.unitOfMeasure} — at or below the reorder threshold of ${part.reorderThreshold}.`,
        'SparePart',
        part.id,
      );
    }
    return usage;
  });
};

route('POST', '/api/v1/tickets/:id/parts', async (req, user, params) => {
  const ticket = state.tickets.find((t) => t.id === params.id);
  if (!ticket) throw new HttpError(404, 'NOT_FOUND', 'Ticket not found');
  if (ticket.status === 'CLOSED') throw new HttpError(409, 'TICKET_CLOSED', `Ticket ${ticket.ticketCode} is closed; reopen it before logging more parts.`);
  if (user.role !== 'ADMIN' && ticket.technicianId !== user.id) {
    throw new HttpError(403, 'FORBIDDEN', 'This ticket is assigned to another technician.');
  }
  const body = await readBody(req);
  consumeStock(ticket, body.items, user);
  if (ticket.status === 'OPEN') ticket.status = 'IN_PROGRESS';
  ticket.updatedAt = now();
  audit('LOG_PARTS', 'MaintenanceTicket', ticket.id, `Logged parts on ${ticket.ticketCode}`, user);
  return ticketResponse(ticket);
}, ['ADMIN', 'TECHNICIAN']);

route('POST', '/api/v1/tickets/:id/close', async (req, user, params) => {
  const ticket = state.tickets.find((t) => t.id === params.id);
  if (!ticket) throw new HttpError(404, 'NOT_FOUND', 'Ticket not found');
  if (ticket.status === 'CLOSED') throw new HttpError(409, 'TICKET_CLOSED', `Ticket ${ticket.ticketCode} is already closed.`);
  if (user.role !== 'ADMIN' && ticket.technicianId !== user.id) {
    throw new HttpError(403, 'FORBIDDEN', 'This ticket is assigned to another technician.');
  }
  const body = await readBody(req);
  consumeStock(ticket, body.items, user);

  ticket.status = 'CLOSED';
  ticket.closedAt = now();
  ticket.resolution = body.resolution || null;
  ticket.updatedAt = now();

  const machine = state.machines.find((m) => m.id === ticket.machineId);
  if (machine) {
    machine.lastServiceAt = dateOnly(0);
    machine.nextServiceAt = dateOnly(machine.serviceIntervalDays || 90);
    const stillOpen = state.tickets.some((t) => t.machineId === machine.id && t.status !== 'CLOSED');
    if (!stillOpen) machine.status = 'OPERATIONAL';
    machine.updatedAt = now();
  }

  audit('CLOSE', 'MaintenanceTicket', ticket.id, `Closed ${ticket.ticketCode}`, user);
  return ticketResponse(ticket);
}, ['ADMIN', 'TECHNICIAN']);

route('POST', '/api/v1/tickets/:id/reopen', async (req, user, params) => {
  const ticket = state.tickets.find((t) => t.id === params.id);
  if (!ticket) throw new HttpError(404, 'NOT_FOUND', 'Ticket not found');
  if (ticket.status !== 'CLOSED') throw new HttpError(409, 'TICKET_NOT_CLOSED', 'Only closed tickets can be reopened.');
  ticket.status = 'OPEN';
  ticket.closedAt = null;
  ticket.resolution = null;
  ticket.updatedAt = now();
  const machine = state.machines.find((m) => m.id === ticket.machineId);
  if (machine) machine.status = 'UNDER_MAINTENANCE';
  audit('REOPEN', 'MaintenanceTicket', ticket.id, `Reopened ${ticket.ticketCode}`, user);
  return ticketResponse(ticket);
}, ['ADMIN']);

/* ---- Alerts ---- */

route('GET', '/api/v1/alerts', async (req, user, params, query) => {
  requireRole(authenticate(req));
  const type = query.get('type');
  const unreadOnly = query.get('unreadOnly') === 'true';
  let list = state.alerts.map(alertResponse);
  if (type) list = list.filter((a) => a.type === type);
  if (unreadOnly) list = list.filter((a) => a.unread);
  return paginate(list, query);
});

route('GET', '/api/v1/alerts/unread-count', async (req) => {
  requireRole(authenticate(req));
  return { count: state.alerts.filter((a) => !a.readAt).length };
});

route('POST', '/api/v1/alerts/scan', async (req, user) => {
  const result = scanAlerts();
  audit('SCAN', 'Alert', null, `Alert scan: ${result.lowStockAlerts} low stock, ${result.serviceDueAlerts} service due`, user);
  return result;
}, ['ADMIN']);

route('PATCH', '/api/v1/alerts/:id/read', async (req, user, params) => {
  requireRole(authenticate(req));
  const alert = state.alerts.find((a) => a.id === params.id);
  if (!alert) throw new HttpError(404, 'NOT_FOUND', 'Alert not found');
  alert.readAt = now();
  return alertResponse(alert);
});

route('POST', '/api/v1/alerts/read-all', async (req) => {
  requireRole(authenticate(req));
  let updated = 0;
  for (const alert of state.alerts) {
    if (!alert.readAt) {
      alert.readAt = now();
      updated += 1;
    }
  }
  return { updated };
});

/* ---- Users ---- */

route('GET', '/api/v1/users', async (req, user, params, query) => {
  requireRole(authenticate(req), ['ADMIN']);
  const q = (query.get('q') || '').toLowerCase();
  const role = query.get('role');
  let list = state.users.map((user) => ({
    ...publicUser(user),
    openTickets: state.tickets.filter((t) => t.technicianId === user.id && t.status !== 'CLOSED').length,
  }));
  if (q) list = list.filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(q));
  if (role) list = list.filter((u) => u.role === role);
  return paginate(list, query);
});

route('GET', '/api/v1/users/technicians', async (req) => {
  requireRole(authenticate(req), ['ADMIN', 'TECHNICIAN']);
  return state.users
    .filter((u) => u.enabled && ['ADMIN', 'TECHNICIAN'].includes(u.role))
    .map(publicUser);
});

route('GET', '/api/v1/users/:id', async (req, actor, params) => {
  requireRole(actor, ['ADMIN']);
  const target = state.users.find((u) => u.id === params.id);
  if (!target) throw new HttpError(404, 'NOT_FOUND', 'User not found');
  return {
    ...publicUser(target),
    openTickets: state.tickets.filter((t) => t.technicianId === target.id && t.status !== 'CLOSED').length,
  };
});

route('POST', '/api/v1/users', async (req, user) => {
  const body = await readBody(req);
  const email = String(body.email).toLowerCase();
  if (state.users.some((u) => u.email === email)) {
    throw new HttpError(409, 'EMAIL_IN_USE', 'An account with this email already exists.');
  }
  const created = {
    id: entitySeq++,
    name: body.name,
    email,
    password: body.password,
    role: body.role,
    enabled: true,
    createdAt: now(),
  };
  state.users.push(created);
  audit('CREATE', 'User', created.id, `Created ${created.role.toLowerCase()} account ${created.email}`, user);
  return { ...publicUser(created), openTickets: 0 };
}, ['ADMIN']);

route('PATCH', '/api/v1/users/:id', async (req, user, params) => {
  const target = state.users.find((u) => u.id === params.id);
  if (!target) throw new HttpError(404, 'NOT_FOUND', 'User not found');
  const body = await readBody(req);
  if (body.name) target.name = body.name;
  if (body.role) target.role = body.role;
  if (body.enabled !== undefined) target.enabled = body.enabled;
  if (body.password) target.password = body.password;
  audit('UPDATE', 'User', target.id, 'Updated account', user);
  return {
    ...publicUser(target),
    openTickets: state.tickets.filter((t) => t.technicianId === target.id && t.status !== 'CLOSED').length,
  };
}, ['ADMIN']);

/* ---- Audit ---- */

route('GET', '/api/v1/audit', async (req, user, params, query) => {
  requireRole(authenticate(req), ['ADMIN', 'VIEWER']);
  return paginate(state.audit, query);
});

/* ------------------------------------------------------------------ */
/* Server                                                             */
/* ------------------------------------------------------------------ */

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const query = url.searchParams;
  const path = url.pathname.replace(/\/$/, '') || '/';

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const send = (status, payload) => {
    if (payload === null || payload === undefined) {
      res.writeHead(status);
      return res.end();
    }
    const body = JSON.stringify(payload);
    res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(body);
  };

  try {
    const match = routes.find((route) => route.method === req.method && route.regex.test(path));
    if (!match) {
      return send(404, {
        timestamp: now(),
        status: 404,
        error: 'Not Found',
        code: 'NOT_FOUND',
        message: `No handler for ${req.method} ${path}`,
        path,
        fieldErrors: null,
      });
    }

    const values = path.match(match.regex);
    const params = {};
    match.keys.forEach((key, index) => {
      params[key] = Number(values[index + 1]);
    });

    const user = authenticate(req);
    if (match.roles) requireRole(user, match.roles);

    // The stub resolves auth before the handler; handlers receive `user`.
    const result = await match.handler(req, user, params, query);
    return send(result && result.__created ? 201 : 200, result);
  } catch (error) {
    if (error instanceof HttpError) {
      return send(error.status, {
        timestamp: now(),
        status: error.status,
        error: error.status === 401 ? 'Unauthorized' : error.status === 403 ? 'Forbidden' : 'Error',
        code: error.code,
        message: error.message,
        path,
        fieldErrors: error.fieldErrors ?? null,
      });
    }
    console.error(error);
    return send(500, {
      timestamp: now(),
      status: 500,
      error: 'Internal Server Error',
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong on our side.',
      path,
      fieldErrors: null,
    });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  Mainspring mock API\n  http://localhost:${PORT}/api/v1\n\n  Demo accounts:\n    admin@mainspring.dev   / Admin@123\n    tech@mainspring.dev    / Tech@123\n    viewer@mainspring.dev  / Viewer@123\n`);
  console.log(`  Swagger-style probe: GET /api/v1/machines (needs a Bearer token from POST /api/v1/auth/login)\n`);
});
