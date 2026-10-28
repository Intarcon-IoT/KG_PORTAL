<!-- Visitas de hoy: una tarjeta por visita con sus visitantes y la lista «Dentro ahora» para el recuento en evacuación -->
<script setup>
import { computed, ref } from 'vue'
import VisitTag from './visit-tag.vue'
import { STATE_LABELS, STATE_TONES, companyName, humanDuration, infoSentLabel, labelOf, odooMs, odooTime, signatureTag, visitKey, visitState } from '@/utils/visits'

const props = defineProps({
  visits: { type: Array, default: () => [] },
  options: { type: Object, default: null },
  now: { type: Number, required: true },
  loading: { type: Boolean, default: false },
  canManage: { type: Boolean, default: false },
})
const emit = defineEmits(['detail', 'visit', 'person'])

const FILTERS = [
  { key: 'all', title: 'Visitantes hoy', test: p => p.state !== 'canceled' },
  { key: 'inside', title: 'Dentro ahora', test: p => p.state === 'checked_in' },
  { key: 'coming', title: 'Por llegar', test: p => p.state === 'planned' },
  { key: 'left', title: 'Han salido', test: p => p.state === 'checked_out' },
  { key: 'signature', title: 'Firma pendiente', test: p => p.signature !== 'signed' && ['planned', 'checked_in'].includes(p.state) },
]
const filter = ref('all')
const current = computed(() => FILTERS.find(f => f.key === filter.value))
const people = computed(() => props.visits.flatMap(v => v.persons))
const countOf = f => people.value.filter(f.test).length
const rows = computed(() => props.visits.filter(v => v.persons.some(current.value.test)))

// Grupos desplegados por defecto; se recuerdan los que se pliegan
const collapsed = ref(new Set())
const toggle = visit => { const key = visitKey(visit); collapsed.value.has(key) ? collapsed.value.delete(key) : collapsed.value.add(key) }

const inside = computed(() => props.visits.flatMap(v => v.persons.filter(p => p.state === 'checked_in').map(p => ({ v, p }))))

const titleOf = visit => visit.persons.length === 1 ? visit.persons[0].name : companyName(visit) || visit.persons[0]?.name
const timeOf = p => {
  const start = odooMs(p.check_in)
  if (p.state === 'planned') return { main: odooTime(p.check_in), sub: start < props.now ? `Retraso ${humanDuration(props.now - start)}` : `Prevista · en ${humanDuration(start - props.now)}`, late: start < props.now }
  if (p.state === 'checked_in') return { main: odooTime(p.check_in), sub: `Dentro ${humanDuration(props.now - start)}` }
  if (p.state === 'canceled') return { main: odooTime(p.check_in), sub: 'Cancelada' }
  return { main: `${odooTime(p.check_in)}–${odooTime(p.check_out)}`, sub: humanDuration(odooMs(p.check_out) - start) }
}
const counts = visit => {
  const alive = visit.persons.filter(p => p.state !== 'canceled')
  return {
    alive: alive.length,
    pending: visit.persons.filter(p => p.state === 'planned').length,
    inside: visit.persons.filter(p => p.state === 'checked_in').length,
    signed: visit.persons.filter(p => p.signature === 'signed').length,
    unregistered: visit.persons.filter(p => !p.registered).length,
    info: visit.persons.filter(p => p.info_sent_at).length,
  }
}

// Qué acciones tiene cada visitante según su estado y su firma
const personActions = (visit, p, single) => {
  const list = []
  if (p.state === 'planned') list.push({ action: 'check-in', text: single ? 'Registrar entrada' : 'Entrada', kind: single ? 'primary' : 'ghost' })
  if (p.state === 'checked_in') list.push({ action: 'check-out', text: single ? 'Registrar salida' : 'Salida', kind: 'ghost' })
  if (p.signature === 'sent' && (p.state === 'checked_in' || (p.state === 'planned' && p.sign_on_tablet))) list.push({ action: 'signature', text: 'Firmar en tablet', kind: 'ghost' })
  if (p.signature === 'sent' && p.state === 'planned' && !p.sign_on_tablet) list.push({ action: 'resend', text: 'Reenviar firma', kind: 'link' })
  if (!p.email && p.state === 'planned') list.push({ action: 'email', text: 'Añadir email', kind: 'link' })
  if (visit.loose && p.state === 'checked_in') list.push({ action: 'notify', text: 'Avisar de nuevo', kind: 'link' })
  return list
}
</script>

<template>
  <div class="today">
    <div class="filters" role="tablist">
      <button v-for="f in FILTERS" :key="f.key" type="button" role="tab" :aria-selected="filter === f.key" :class="{ active: filter === f.key }" @click="filter = f.key">
        <strong>{{ countOf(f) }}</strong> {{ f.title }}
      </button>
    </div>

    <div class="layout">
      <section class="list">
        <div v-if="loading && !visits.length" class="empty"><v-progress-circular indeterminate size="28" width="3" color="primary" /></div>
        <div v-else-if="!rows.length" class="empty"><i class="fa-regular fa-calendar-xmark" /><span>Nadie en este filtro. Cambia de filtro o registra una visita nueva.</span></div>

        <article v-for="visit in rows" :key="visitKey(visit)" class="visit">
          <div class="visit-main">
            <div class="visit-title">
              <button v-if="!visit.loose" type="button" class="title-link" @click="emit('detail', visit)">{{ titleOf(visit) }}</button>
              <strong v-else>{{ titleOf(visit) }}</strong>
              <div class="chips">
                <span v-if="visit.persons.length === 1" class="muted">{{ companyName(visit) || 'Particular' }}</span>
                <VisitTag v-if="visit.type" :text="labelOf(options?.types, visit.type) || visit.type" />
                <VisitTag v-if="visit.visit_to" :text="labelOf(options?.visit_to, visit.visit_to) || visit.visit_to" tone="info" />
                <VisitTag v-if="visit.loose" text="Kiosco" tone="warning" />
                <span v-if="visit.persons.length > 1" class="muted">{{ counts(visit).alive }} visitantes<template v-if="counts(visit).unregistered"> · {{ counts(visit).unregistered }} no registrado{{ counts(visit).unregistered > 1 ? 's' : '' }}</template></span>
              </div>
              <div v-if="visit.persons.length === 1" class="chips small">
                <VisitTag :text="visit.persons[0].registered ? 'Contacto' : 'No registrado'" :tone="visit.persons[0].registered ? 'muted' : 'warning'" />
                <span :class="{ muted: !visit.persons[0].email }">{{ visit.persons[0].email || 'sin email' }}</span>
                <span class="muted">{{ visit.persons[0].lang.toUpperCase() }}</span>
              </div>
            </div>

            <div class="visit-meta">
              <span><i class="fa-regular fa-comment" /> {{ visit.reason_label || 'Sin motivo' }} · {{ visit.factory ? 'Fábrica · EPIs' : 'Oficinas' }}</span>
              <span v-if="visit.hosts.length"><i class="fa-regular fa-user" /> {{ visit.hosts[0].name }}<template v-if="visit.hosts.length > 1"> + {{ visit.hosts.slice(1).map(h => h.name).join(', ') }}</template></span>
            </div>

            <div class="visit-time">
              <template v-if="visit.persons.length === 1">
                <strong>{{ timeOf(visit.persons[0]).main }}</strong>
                <small :class="{ late: timeOf(visit.persons[0]).late }">{{ timeOf(visit.persons[0]).sub }}</small>
              </template>
              <template v-else>
                <strong>{{ odooTime(visit.date) }}</strong>
                <VisitTag :text="STATE_LABELS[visitState(visit, now)]" :tone="STATE_TONES[visitState(visit, now)]" />
              </template>
            </div>

            <div class="visit-sign">
              <template v-if="visit.persons.length === 1">
                <VisitTag v-bind="signatureTag(visit.persons[0])" />
                <small>{{ infoSentLabel(visit.persons[0]) }}</small>
              </template>
              <template v-else>
                <VisitTag :text="`${counts(visit).signed}/${visit.persons.length} firmados`" :tone="counts(visit).signed === visit.persons.length ? 'ok' : 'warning'" />
                <small>{{ counts(visit).info }} con info previa · {{ counts(visit).inside }}/{{ counts(visit).alive }} dentro</small>
              </template>
            </div>

            <div class="visit-actions">
              <template v-if="visit.persons.length === 1">
                <template v-if="canManage">
                  <button v-for="a in personActions(visit, visit.persons[0], true)" :key="a.action" type="button" class="act" :class="a.kind" @click="emit('person', a.action, visit, visit.persons[0])">{{ a.text }}</button>
                </template>
                <small v-if="visit.persons[0].state === 'checked_out'" class="muted">Salió a las {{ odooTime(visit.persons[0].check_out) }}</small>
              </template>
              <template v-else-if="canManage && (counts(visit).pending || counts(visit).inside)">
                <button v-if="counts(visit).pending" type="button" class="act primary" @click="emit('visit', 'check-in', visit)">Entrada de todos ({{ counts(visit).pending }})</button>
                <button v-if="counts(visit).inside" type="button" class="act ghost" @click="emit('visit', 'check-out', visit)">Salida de todos ({{ counts(visit).inside }})</button>
                <button v-if="counts(visit).inside" type="button" class="act link" @click="emit('visit', 'notify', visit)">Avisar de nuevo</button>
              </template>
              <button v-if="visit.persons.length > 1" type="button" class="kg-icon-btn" :aria-label="collapsed.has(visitKey(visit)) ? 'Ver visitantes' : 'Ocultar visitantes'" @click="toggle(visit)">
                <i :class="collapsed.has(visitKey(visit)) ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-up'" />
              </button>
            </div>
          </div>

          <ul v-if="visit.persons.length > 1 && !collapsed.has(visitKey(visit))" class="persons">
            <li v-for="p in visit.persons.filter(current.test)" :key="p.id">
              <div class="p-name">
                <strong>{{ p.name }}</strong>
                <div class="chips small">
                  <VisitTag :text="p.registered ? 'Contacto' : 'No registrado'" :tone="p.registered ? 'muted' : 'warning'" />
                  <span :class="{ muted: !p.email }">{{ p.email || 'sin email' }}</span>
                  <span class="muted">{{ p.lang.toUpperCase() }}</span>
                </div>
              </div>
              <div class="p-time"><strong>{{ timeOf(p).main }}</strong><small :class="{ late: timeOf(p).late }">{{ timeOf(p).sub }}</small></div>
              <div class="p-sign"><VisitTag v-bind="signatureTag(p)" /><small>{{ infoSentLabel(p) }}</small></div>
              <div class="p-actions">
                <template v-if="canManage">
                  <button v-for="a in personActions(visit, p, false)" :key="a.action" type="button" class="act" :class="a.kind" @click="emit('person', a.action, visit, p)">{{ a.text }}</button>
                </template>
                <small v-if="p.state === 'checked_out'" class="muted">Salió a las {{ odooTime(p.check_out) }}</small>
              </div>
            </li>
          </ul>
        </article>
      </section>

      <aside class="inside">
        <header><strong>Dentro ahora</strong><span class="count">{{ inside.length }}</span></header>
        <p v-if="!inside.length" class="muted small">No hay visitantes dentro.</p>
        <div v-for="{ v, p } in inside" :key="p.id" class="inside-row">
          <div class="inside-top"><strong>{{ p.name }}</strong><span>{{ odooTime(p.check_in) }}</span></div>
          <small class="muted">
            {{ companyName(v) || 'Particular' }}{{ p.registered ? '' : ' · no registrado' }}{{ v.hosts[0] ? ` · con ${v.hosts[0].name}` : '' }}
            · {{ v.factory ? 'Fábrica' : 'Oficinas' }}{{ p.signature !== 'signed' ? ' · firma pendiente' : '' }}
          </small>
        </div>
        <div class="evacuation">
          <strong><i class="fa-solid fa-person-running" /> Recuento en evacuación</strong>
          <span>Lista de visitantes que hay que contar en el punto de encuentro: Oficinas, Fábrica INTARCON o Fábrica KEYTER.</span>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.filters { display: flex; gap: 2px; padding: 3px; margin-bottom: 14px; border: 1px solid #e5e7eb; border-radius: 10px; background: #ffffff; overflow-x: auto; width: fit-content; max-width: 100% }
.filters button { height: 32px; padding: 0 12px; border: 0; border-radius: 7px; background: transparent; color: #64748b; font: inherit; font-size: .825rem; font-weight: 500; white-space: nowrap; cursor: pointer }
.filters button strong { margin-right: 4px; color: #111111 }
.filters button.active { background: #111111; color: #ffffff }
.filters button.active strong { color: #ffffff }

.layout { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 14px; align-items: start }
.list { display: flex; flex-direction: column; gap: 10px; min-width: 0 }
.empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 48px 16px; border: 1px dashed #e5e7eb; border-radius: 14px; background: #ffffff; color: #94a3b8; text-align: center }
.empty i { font-size: 1.4rem }

.visit { border: 1px solid #eceef2; border-radius: 14px; background: #ffffff; overflow: hidden }
.visit-main { display: grid; grid-template-columns: minmax(200px, 1.6fr) minmax(160px, 1.2fr) 120px minmax(150px, 1fr) auto; gap: 14px; align-items: center; padding: 14px 16px }
.visit-title { display: flex; flex-direction: column; gap: 4px; min-width: 0 }
.title-link { padding: 0; border: 0; background: none; color: #111111; font: inherit; font-weight: 600; text-align: left; cursor: pointer }
.title-link:hover { color: #468131; text-decoration: underline }
.chips { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 6px; font-size: .8rem }
.small { font-size: .78rem }
.muted { color: #94a3b8 }
.visit-meta { display: flex; flex-direction: column; gap: 3px; font-size: .82rem; color: #475569; min-width: 0 }
.visit-meta i { width: 14px; color: #94a3b8 }
.visit-time, .visit-sign, .p-time, .p-sign { display: flex; flex-direction: column; align-items: flex-start; gap: 3px }
.visit-time small, .visit-sign small, .p-time small, .p-sign small { font-size: .76rem; color: #64748b }
small.late { color: #b91c1c }
.visit-actions, .p-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; align-items: center; gap: 6px }

.act { height: 30px; padding: 0 10px; border-radius: 8px; font: inherit; font-size: .8rem; font-weight: 600; white-space: nowrap; cursor: pointer }
.act.primary { border: 1px solid #111111; background: #111111; color: #ffffff }
.act.ghost { border: 1px solid #d1d5db; background: #ffffff; color: #334155 }
.act.link { padding: 0 4px; border: 0; background: none; color: #468131 }
.act:hover { filter: brightness(.95) }

.persons { margin: 0; padding: 0 16px 6px; list-style: none; border-top: 1px solid #f1f2f4; background: #fbfbfc }
.persons li { display: grid; grid-template-columns: minmax(200px, 1.6fr) 140px minmax(150px, 1fr) auto; gap: 14px; align-items: center; padding: 10px 0; border-bottom: 1px solid #f1f2f4 }
.persons li:last-child { border-bottom: 0 }
.p-name { display: flex; flex-direction: column; gap: 3px; min-width: 0 }
.p-name strong { font-size: .875rem }

.inside { position: sticky; top: calc(var(--topbar-height) + 16px); padding: 14px 16px; border: 1px solid #eceef2; border-radius: 14px; background: #ffffff }
.inside header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px }
.count { min-width: 24px; padding: 1px 8px; border-radius: 999px; background: #5bb133; color: #0b1a05; font-size: .75rem; font-weight: 700; text-align: center }
.inside-row { display: flex; flex-direction: column; gap: 2px; padding: 8px 0; border-bottom: 1px solid #f1f2f4; font-size: .85rem }
.inside-top { display: flex; justify-content: space-between; gap: 8px }
.evacuation { display: flex; flex-direction: column; gap: 4px; margin-top: 12px; padding: 10px 12px; border-radius: 10px; background: #fff7ed; color: #9a3412; font-size: .78rem }

@media (width < 1200px) {
  .visit-main { grid-template-columns: minmax(0, 1fr) auto; }
  .visit-meta, .visit-sign { grid-column: 1 }
  .visit-time { grid-column: 2; grid-row: 1; align-items: flex-end }
  .visit-actions { grid-column: 1 / -1; justify-content: flex-start }
  .persons li { grid-template-columns: minmax(0, 1fr) auto; }
  .p-sign, .p-actions { grid-column: 1 / -1; justify-content: flex-start }
}
@media (width < 1000px) {
  .layout { grid-template-columns: 1fr }
  .inside { position: static }
}
</style>
