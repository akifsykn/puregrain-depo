import { Resend } from 'resend';

// Bildirimin gideceği adres: demo aşamasında Akif, satış sonrası müşterinin adresi.
const NOTIFY_EMAIL = process.env.WHOLESALE_NOTIFY_EMAIL || 'hello@akifsoykan.com';
const MAX = { name: 120, studio: 160, email: 200, message: 4000 };

function clean(value, max) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  try {
    const body = typeof req.body === 'object' && req.body !== null ? req.body : {};

    // Honeypot: botlar doldurur, insanlar görmez — sessizce "başarılı" dön.
    if (body.website) return res.status(200).json({ ok: true });

    const name = clean(body.name, MAX.name);
    const studio = clean(body.studio, MAX.studio);
    const email = clean(body.email, MAX.email);
    const message = clean(body.message, MAX.message);

    if (!name || !email || !message) return res.status(400).json({ error: 'missing fields' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'invalid email' });

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error('wholesale inquiry: RESEND_API_KEY eksik');
      return res.status(500).json({ error: 'mail not configured' });
    }

    const rows = [
      ['Name', name],
      ['Studio / Company', studio || '—'],
      ['Email', email],
      ['Message', message],
    ].map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#8A5A2E;white-space:nowrap;vertical-align:top"><b>${k}</b></td><td style="padding:6px 0">${escapeHtml(v).replace(/\n/g, '<br>')}</td></tr>`).join('');

    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: 'Pure Grain Website <lead@akifsoykan.com>',
      to: NOTIFY_EMAIL,
      replyTo: email,
      subject: `Wholesale inquiry — ${name}${studio ? ` (${studio})` : ''}`,
      html: `<h2 style="font-family:Georgia,serif">Pure Grain — Wholesale inquiry</h2><table style="font-family:sans-serif;font-size:14px">${rows}</table>`,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('wholesale inquiry error:', err);
    return res.status(500).json({ error: 'send failed' });
  }
}
