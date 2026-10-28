import Request from './request'
import { useNotificationStore } from '@/store/useNotificationStore'

// API de visitas de recepción (x_visita + frontdesk.visitor en Odoo). Ante un error avisa y devuelve null.
// Las escrituras son reales en Odoo: sus reglas mandan correos a los visitantes con email
const call = async (endpoint, { method = 'GET', body, params } = {}) => {
  try {
    return await new Request({ endpoint: `reception/${endpoint}`, method, params, body: body ? JSON.stringify(body) : null }).http()
  } catch (error) {
    useNotificationStore().notifyError(error?.message || 'No se ha podido completar la operación')
    return null
  }
}
const clean = params => Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''))

export const visitsApi = {
  options: () => call('visits/options'),
  hosts: () => call('visits/hosts'),
  list: visitTo => call('visits', { params: clean({ visit_to: visitTo }) }),
  calendar: (from, to, visitTo) => call('visits/calendar', { params: clean({ from, to, visit_to: visitTo }) }),
  detail: id => call(`visits/${id}`),
  companies: q => call('visits/companies', { params: { q } }),
  contacts: ({ companyId, q }) => call('visits/contacts', { params: clean({ company_id: companyId, q }) }),
  create: data => call('visits', { method: 'POST', body: data }),
  createContact: data => call('visits/contacts', { method: 'POST', body: data }),
  visitAction: (id, action) => call(`visits/${id}/${action}`, { method: 'POST' }),
  visitorAction: (id, action) => call(`visitors/${id}/${action}`, { method: 'POST' }),
  completeVisitor: (id, data) => call(`visitors/${id}`, { method: 'PATCH', body: data }),
  signature: id => call(`visitors/${id}/signature`),
  resendSignature: id => call(`visitors/${id}/signature/resend`, { method: 'POST' }),
}
