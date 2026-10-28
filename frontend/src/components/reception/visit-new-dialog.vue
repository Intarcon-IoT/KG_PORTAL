<!-- Alta de una visita: anfitrión a la izquierda; datos y visitantes (de Contactos o no registrados) a la derecha.
     Odoo prepara la firma, manda la información previa y avisa al anfitrión -->
<script setup>
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import appDialog from '@/components/app-dialog.vue'
import { dateField, formField, textField } from '@/components/form-components'
import VisitTag from './visit-tag.vue'
import { visitsApi } from '@/model/visits'
import { useNotificationStore } from '@/store'
import { LANGS, isEmail } from '@/utils/visits'
import { toDateKey, todayKey } from '@/utils/dates'

const props = defineProps({
  options: { type: Object, default: null },
  hosts: { type: Array, default: () => [] },
})
const open = defineModel({ type: Boolean, default: false })
const emit = defineEmits(['saved'])
const notification = useNotificationStore()

const SEARCH_MS = 350
const pad = n => String(n).padStart(2, '0')
const TIMES = Array.from({ length: (21 - 7) * 4 }, (_, i) => `${pad(7 + Math.floor(i / 4))}:${pad(i % 4 * 15)}`)
// Por defecto, dentro de dos horas en punto (dentro del horario del selector)
const nextHour = () => { const d = new Date(Date.now() + 2 * 3600000); return { date: toDateKey(d), time: `${pad(Math.min(20, Math.max(7, d.getHours())))}:00` } }

const blank = () => ({
  company: null, companyContacts: [], visitors: [], unregistered: [], newContact: null,
  type: 'cliente', visitTo: 'intarcon', reason: null, factory: false, hostId: null, hostFilter: '',
  arrival: 'appointment', ...nextHour(), errors: {},
})
const s = reactive(blank())
const saving = ref(false)
const reset = () => Object.assign(s, blank())
defineExpose({ reset })

// Búsquedas en Contactos con espera para no lanzar una por tecla
const companyOptions = ref([])
const contactOptions = ref([])
let companyTimer = null
let contactTimer = null
onBeforeUnmount(() => { clearTimeout(companyTimer); clearTimeout(contactTimer) })

const searchCompany = q => {
  clearTimeout(companyTimer)
  if (!q || q.trim().length < 2) return
  companyTimer = setTimeout(async () => { companyOptions.value = (await visitsApi.companies(q.trim())) || [] }, SEARCH_MS)
}
const pickCompany = async company => {
  s.company = company || null
  s.companyContacts = []
  if (company) s.companyContacts = (await visitsApi.contacts({ companyId: company.id })) || []
}
const searchContact = q => {
  clearTimeout(contactTimer)
  if (!q || q.trim().length < 3) return
  contactTimer = setTimeout(async () => { contactOptions.value = (await visitsApi.contacts({ q: q.trim() })) || [] }, SEARCH_MS)
}

const hasVisitor = id => s.visitors.some(v => v.partner_id === id)
const addVisitor = c => {
  if (!c || hasVisitor(c.id)) return
  s.visitors.push({ partner_id: c.id, name: c.name, email: c.email || '', lang: c.lang || 'es', company: c.commercial_partner_id?.[1] ?? '', isNew: !!c.isNew })
  s.errors.people = null
}
const toggleCompanyContact = c => hasVisitor(c.id) ? s.visitors.splice(s.visitors.findIndex(v => v.partner_id === c.id), 1) : addVisitor(c)
const contactItems = computed(() => contactOptions.value.map(c => ({ ...c, title: [c.name, c.commercial_partner_id?.[1], c.email].filter(Boolean).join(' · '), props: { disabled: hasVisitor(c.id) } })))

// El contacto se crea en Odoo al momento, dentro de la empresa y con la etiqueta Visitante
const createContact = async () => {
  const n = s.newContact
  if (!n.name.trim()) return (n.error = 'Escribe el nombre')
  if (n.email.trim() && !isEmail(n.email.trim())) return (n.error = 'El email no es válido')
  const result = await visitsApi.createContact({ name: n.name.trim(), email: n.email.trim(), phone: n.phone.trim(), company_id: s.company?.id ?? null, lang: n.lang })
  if (!result) return
  addVisitor({ id: result.id, name: n.name.trim(), email: n.email.trim(), lang: n.lang, commercial_partner_id: s.company ? [s.company.id, s.company.name] : null, isNew: true })
  s.newContact = null
}

const hostList = computed(() => {
  const q = s.hostFilter.trim().toLowerCase()
  return props.hosts.filter(h => !q || h.name.toLowerCase().includes(q) || (h.job_title || '').toLowerCase().includes(q) || (h.department || '').toLowerCase().includes(q))
})
const selectedHost = computed(() => props.hosts.find(h => h.id === s.hostId))

const filled = computed(() => s.unregistered.filter(n => n.name.trim() || n.email.trim()))
const total = computed(() => s.visitors.length + s.unregistered.filter(n => n.name.trim()).length)
const withEmail = computed(() => [...s.visitors, ...s.unregistered].filter(p => p.email?.trim()).length)
const appointmentMs = () => new Date(`${s.date}T${s.time}:00`).getTime()

const save = async () => {
  const errors = {
    reason: s.reason ? null : 'Elige el motivo',
    host: s.hostId ? null : 'Elige quién les atiende',
    people: s.visitors.length || filled.value.length ? null : 'Añade al menos un visitante',
    unregistered: filled.value.some(n => !n.name.trim() || (n.email.trim() && !isEmail(n.email.trim()))) ? 'Cada no registrado necesita nombre; el email es opcional pero, si lo pones, debe ser válido' : null,
    date: s.arrival === 'appointment' && !(appointmentMs() > Date.now()) ? 'La cita tiene que ser futura. Si ya están aquí, elige «Ya están aquí».' : null,
  }
  if (Object.values(errors).some(Boolean)) return (s.errors = errors)
  s.errors = {}
  saving.value = true
  const result = await visitsApi.create({
    company_id: s.company?.id ?? null,
    arrival: s.arrival === 'now' ? 'now' : `${s.date}T${s.time}`,
    host_ids: [s.hostId],
    reason: s.reason,
    visit_to: s.visitTo,
    type: s.type,
    factory: s.factory,
    visitors: s.visitors.map(v => ({ partner_id: v.partner_id, lang: v.lang })),
    unregistered: filled.value.map(n => ({ name: n.name.trim(), email: n.email.trim() || null, phone: n.phone.trim() || null, lang: n.lang })),
  })
  saving.value = false
  if (!result) return
  notification.notifySuccess(s.arrival === 'now' ? 'Entrada registrada en Odoo' : 'Visita planificada en Odoo')
  open.value = false
  emit('saved')
}
</script>

<template>
  <appDialog v-model="open" eyebrow="Recepción" title="Nueva visita" subtitle="Odoo prepara la firma, manda la información previa y avisa al anfitrión." :closable="!saving" :width="1100">
    <div class="kg-form nv">
      <section class="hosts">
        <formField label="Anfitrión" column>
          <v-text-field v-model="s.hostFilter" autocomplete="off" placeholder="Filtrar por nombre, puesto o departamento" prepend-inner-icon="fa-solid fa-magnifying-glass" density="compact" hide-details clearable />
        </formField>
        <div class="host-list" role="radiogroup" aria-label="Anfitrión">
          <button v-for="h in hostList" :key="h.id" type="button" role="radio" :aria-checked="h.id === s.hostId" class="host" :class="{ selected: h.id === s.hostId }" @click="s.hostId = h.id; s.errors.host = null">
            <span class="avatar">{{ h.name.split(/\s+/).filter(w => /\p{L}/u.test(w)).slice(0, 2).map(w => w.match(/\p{L}/u)[0]).join('').toUpperCase() || '?' }}</span>
            <span class="host-text">
              <strong>{{ h.name }}</strong>
              <small>{{ [h.job_title, h.department].filter(Boolean).join(' · ') || 'Sin puesto' }}{{ h.end_time ? ` · hasta las ${h.end_time}` : '' }}</small>
            </span>
            <i v-if="h.id === s.hostId" class="fa-solid fa-circle-check" />
          </button>
          <p v-if="!hostList.length" class="muted">Nadie coincide con el filtro.</p>
        </div>
        <p v-if="s.errors.host" class="err">{{ s.errors.host }}</p>
      </section>

      <section class="data">
        <formField label="Empresa (de Contactos)" column>
          <div v-if="s.company" class="picked">
            <span><strong>{{ s.company.name }}</strong>{{ s.company.city ? ` · ${s.company.city}` : '' }}{{ s.company.country_id ? ` · ${s.company.country_id[1]}` : '' }}</span>
            <button type="button" class="link" @click="pickCompany(null)">Cambiar</button>
          </div>
          <v-autocomplete
            v-else :model-value="null" :items="companyOptions" item-title="name" return-object no-filter autocomplete="off" density="compact" hide-details hide-no-data
            placeholder="Nombre o NIF de la compañía · vacío si es un particular o candidato" @update:search="searchCompany" @update:model-value="pickCompany"
          >
            <template #item="{ props: itemProps, item }"><v-list-item v-bind="itemProps" :subtitle="[item.vat, item.city, item.country_id?.[1]].filter(Boolean).join(' · ')" /></template>
          </v-autocomplete>
        </formField>

        <div class="kg-row">
          <formField label="Motivo" column>
            <v-select v-model="s.reason" autocomplete="off" :items="(options?.reasons || []).map(([value, title]) => ({ value, title }))" placeholder="Elige el motivo…" density="compact" hide-details :error="!!s.errors.reason" @update:model-value="s.errors.reason = null" />
            <p v-if="s.errors.reason" class="err">{{ s.errors.reason }}</p>
          </formField>
          <formField label="Llegada" column>
            <div class="seg">
              <button type="button" :class="{ active: s.arrival === 'appointment' }" @click="s.arrival = 'appointment'; s.errors.date = null">Con cita</button>
              <button type="button" :class="{ active: s.arrival === 'now' }" @click="s.arrival = 'now'; s.errors.date = null">Ya están aquí</button>
            </div>
          </formField>
        </div>
        <div v-if="s.arrival === 'appointment'" class="kg-row">
          <formField label="Día" column><dateField v-model="s.date" :min="todayKey()" /></formField>
          <formField label="Hora" column><v-select v-model="s.time" autocomplete="off" :items="TIMES" density="compact" hide-details /></formField>
        </div>
        <p v-if="s.errors.date" class="err">{{ s.errors.date }}</p>

        <formField label="Tipo de visita" column>
          <div class="seg wrap"><button v-for="[value, title] in options?.types || []" :key="value" type="button" :class="{ active: s.type === value }" @click="s.type = value">{{ title }}</button></div>
        </formField>
        <formField label="Visita a" column>
          <div class="seg wrap"><button v-for="[value, title] in options?.visit_to || []" :key="value" type="button" :class="{ active: s.visitTo === value }" @click="s.visitTo = value">{{ title }}</button></div>
        </formField>
        <label class="kg-check factory">
          <input v-model="s.factory" type="checkbox" />
          <span class="kg-check-box"><i class="fa-solid fa-check" /></span>
          Entran en fábrica: se entregan EPIs y lo confirman en la firma
        </label>

        <div class="block">
          <strong>Visitantes · Contactos de Odoo</strong>
          <div v-if="s.company && s.companyContacts.length" class="company-people">
            <small>Personas de {{ s.company.name }}</small>
            <div class="chips">
              <button v-for="c in s.companyContacts" :key="c.id" type="button" class="chip" :class="{ on: hasVisitor(c.id) }" @click="toggleCompanyContact(c)">
                <i v-if="hasVisitor(c.id)" class="fa-solid fa-check" />{{ c.name }}{{ c.email ? '' : ' · sin email' }}
              </button>
            </div>
          </div>
          <v-autocomplete
            :model-value="null" :items="contactItems" item-title="title" return-object no-filter autocomplete="off" density="compact" hide-details hide-no-data
            :placeholder="s.company ? 'Otra persona de Contactos (nombre o email)' : 'Buscar en Contactos (nombre o email)'" @update:search="searchContact" @update:model-value="addVisitor"
          />
          <div v-for="(v, i) in s.visitors" :key="v.partner_id" class="person-row">
            <div class="grow"><strong>{{ v.name }}</strong> <VisitTag v-if="v.isNew" text="Nuevo" tone="info" /><small>{{ v.company }}</small></div>
            <small :class="{ muted: !v.email }">{{ v.email || 'Sin email · firma en la tablet' }}</small>
            <v-select v-model="v.lang" autocomplete="off" :items="LANGS" density="compact" hide-details class="lang" />
            <button type="button" class="kg-icon-btn danger" aria-label="Quitar" @click="s.visitors.splice(i, 1)"><i class="fa-solid fa-xmark" /></button>
          </div>

          <div v-if="s.newContact" class="new-contact">
            <div class="kg-row">
              <textField v-model="s.newContact.name" placeholder="Nombre y apellidos" @update:model-value="s.newContact.error = null" />
              <textField v-model="s.newContact.email" type="email" placeholder="Email (info previa y firma)" @update:model-value="s.newContact.error = null" />
            </div>
            <div class="kg-row">
              <textField v-model="s.newContact.phone" placeholder="Teléfono (opcional)" />
              <v-select v-model="s.newContact.lang" autocomplete="off" :items="LANGS" density="compact" hide-details />
            </div>
            <p v-if="s.newContact.error" class="err">{{ s.newContact.error }}</p>
            <div class="row-end">
              <button type="button" class="act ghost" @click="s.newContact = null">Cancelar</button>
              <button type="button" class="act primary" @click="createContact">Crear en Contactos{{ s.company ? ` · ${s.company.name}` : '' }}</button>
            </div>
          </div>
          <button v-else type="button" class="act ghost add" @click="s.newContact = { name: '', email: '', phone: '', lang: 'es', error: null }"><i class="fa-solid fa-plus" /> Nuevo contacto</button>
        </div>

        <div class="block">
          <strong>Visitantes no registrados</strong>
          <small class="muted">Escritos a mano, no se crean en Contactos (conductores, acompañantes de paso…). Firman en la tablet con el contacto genérico. Si das su email, reciben la información previa.</small>
          <div v-for="(n, i) in s.unregistered" :key="i" class="unreg">
            <textField v-model="n.name" placeholder="Nombre" />
            <textField v-model="n.email" type="email" placeholder="Email (opcional)" />
            <textField v-model="n.phone" placeholder="Teléfono" />
            <v-select v-model="n.lang" autocomplete="off" :items="LANGS" density="compact" hide-details class="lang" />
            <button type="button" class="kg-icon-btn danger" aria-label="Quitar" @click="s.unregistered.splice(i, 1)"><i class="fa-solid fa-xmark" /></button>
          </div>
          <button type="button" class="act ghost add" @click="s.unregistered.push({ name: '', email: '', phone: '', lang: 'es' }); s.errors.people = null"><i class="fa-solid fa-plus" /> Añadir no registrado</button>
          <p v-if="s.errors.unregistered" class="err">{{ s.errors.unregistered }}</p>
        </div>
        <p v-if="s.errors.people" class="err">{{ s.errors.people }}</p>
      </section>
    </div>

    <template #actions>
      <small class="foot-note">
        <template v-if="s.arrival === 'now'">Se registra la entrada de todos: Odoo manda un único aviso al anfitrión{{ selectedHost ? ` (${selectedHost.name})` : '' }} y la firma se hace en la tablet.</template>
        <template v-else>{{ total }} visitantes · {{ withEmail }} con email reciben la información previa y su enlace de firma; el resto firma en la tablet al llegar.</template>
      </small>
      <v-btn variant="outlined" class="kg-btn kg-btn-ghost" :disabled="saving" @click="open = false">Cancelar</v-btn>
      <v-btn color="primary" variant="flat" class="kg-btn" prepend-icon="fa-solid fa-plus" :loading="saving" @click="save">{{ s.arrival === 'now' ? 'Registrar entrada' : 'Planificar visita' }}</v-btn>
    </template>
  </appDialog>
</template>

<style scoped>
.nv { display: grid; grid-template-columns: 320px minmax(0, 1fr); gap: 24px; align-items: start }
.hosts { position: sticky; top: 0; display: flex; flex-direction: column; gap: 8px }
.host-list { max-height: 560px; overflow-y: auto; border: 1px solid #eceef2; border-radius: 12px; scrollbar-width: thin }
.host { display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 12px; border: 0; border-bottom: 1px solid #f1f2f4; background: #ffffff; font: inherit; text-align: left; cursor: pointer }
.host:hover { background: #fbfbfc }
.host.selected { background: #f1f5ee }
.host i { color: #468131 }
.avatar { display: grid; place-items: center; flex-shrink: 0; width: 32px; height: 32px; border-radius: 50%; background: #eef4ea; color: #33662d; font-size: .7rem; font-weight: 700 }
.host-text { display: flex; flex: 1; flex-direction: column; min-width: 0 }
.host-text strong { font-size: .85rem }
.host-text small { overflow: hidden; font-size: .75rem; color: #64748b; text-overflow: ellipsis; white-space: nowrap }

.data { display: flex; flex-direction: column; gap: 10px; min-width: 0 }
.picked { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 9px 12px; border: 1px solid #d1d5db; border-radius: 10px; font-size: .9rem }
.link { border: 0; background: none; color: #468131; font: inherit; font-size: .85rem; font-weight: 600; cursor: pointer }
.seg { display: inline-flex; gap: 2px; padding: 3px; border: 1px solid #e5e7eb; border-radius: 10px; background: #ffffff; max-width: 100% }
.seg.wrap { flex-wrap: wrap }
.seg button { height: 32px; padding: 0 12px; border: 0; border-radius: 7px; background: transparent; color: #64748b; font: inherit; font-size: .82rem; font-weight: 600; white-space: nowrap; cursor: pointer }
.seg button.active { background: #111111; color: #ffffff }
.factory { margin: 4px 0 }

.block { display: flex; flex-direction: column; gap: 8px; padding: 14px; border: 1px solid #eceef2; border-radius: 12px; background: #fbfbfc }
.block > strong { font-size: .9rem }
.company-people small { font-size: .78rem; color: #64748b }
.chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px }
.chip { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px; border: 1px solid #d1d5db; border-radius: 999px; background: #ffffff; color: #334155; font: inherit; font-size: .78rem; cursor: pointer }
.chip.on { border-color: #111111; background: #111111; color: #ffffff }
.person-row { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid #eceef2 }
.grow { display: flex; flex: 1; flex-direction: column; min-width: 160px; font-size: .875rem }
.grow small { color: #64748b; font-size: .76rem }
.lang { flex: 0 0 84px; max-width: 84px }
.new-contact { display: flex; flex-direction: column; gap: 6px; padding: 10px; border: 1px solid #e5e7eb; border-radius: 10px; background: #ffffff }
.unreg { display: grid; grid-template-columns: 1.3fr 1.3fr 1fr 84px 34px; gap: 8px; align-items: center }
.row-end { display: flex; justify-content: flex-end; gap: 6px }
.act { height: 32px; padding: 0 12px; border-radius: 8px; font: inherit; font-size: .8rem; font-weight: 600; cursor: pointer }
.act.primary { border: 1px solid #111111; background: #111111; color: #ffffff }
.act.ghost { border: 1px solid #d1d5db; background: #ffffff; color: #334155 }
.act.add { align-self: flex-start }
.muted { color: #94a3b8; font-size: .78rem }
.err { margin: 2px 0 0; color: #b91c1c; font-size: .8rem }
.foot-note { flex: 1; margin-right: 8px; color: #64748b; font-size: .78rem }

@media (width < 900px) {
  .nv { grid-template-columns: 1fr }
  .hosts { position: static }
  .host-list { max-height: 260px }
  .unreg { grid-template-columns: 1fr 1fr; }
}
</style>
