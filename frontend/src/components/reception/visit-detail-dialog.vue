<!-- Ficha completa de una visita: cabecera, anfitriones, visitantes con su firma e historial de Odoo -->
<script setup>
import { computed, ref, watch } from 'vue'
import appDialog from '@/components/app-dialog.vue'
import VisitTag from './visit-tag.vue'
import { visitsApi } from '@/model/visits'
import { STATE_LABELS, STATE_TONES, companyName, labelOf, madridToday, odooDay, odooFull, odooLongDate, odooShort, odooTime, personState, signatureTag, visitState } from '@/utils/visits'

const props = defineProps({
  visitId: { type: Number, default: null },
  version: { type: Number, default: 0 },
  options: { type: Object, default: null },
  now: { type: Number, required: true },
  canManage: { type: Boolean, default: false },
})
const open = defineModel({ type: Boolean, default: false })
const emit = defineEmits(['visit', 'person'])

const visit = ref(null)
const loading = ref(false)
const confirmCancel = ref(false)

const load = async () => {
  if (!props.visitId) return
  loading.value = true
  visit.value = await visitsApi.detail(props.visitId)
  loading.value = false
}
// Se recarga al abrir otra visita y tras cada acción (version)
watch(() => [props.visitId, props.version, open.value], ([, , isOpen], old) => {
  if (!isOpen) return
  if (old?.[0] !== props.visitId) visit.value = null
  load()
}, { immediate: true })

const state = computed(() => visit.value ? visitState(visit.value, props.now) : null)
const isToday = computed(() => visit.value && odooDay(visit.value.date) === madridToday())
const pending = computed(() => visit.value ? visit.value.persons.filter(p => p.state === 'planned').length : 0)
const longDate = value => { const t = odooLongDate(value); return t.charAt(0).toUpperCase() + t.slice(1) }

const cancel = () => { confirmCancel.value = false; emit('visit', 'cancel', visit.value) }
</script>

<template>
  <appDialog v-model="open" eyebrow="Visita" :title="visit?.name || 'Visita'" :width="920">
    <div v-if="loading && !visit" class="loading"><v-progress-circular indeterminate size="28" width="3" color="primary" /></div>
    <div v-if="visit" class="detail">
      <div class="head">
        <VisitTag :text="STATE_LABELS[state]" :tone="STATE_TONES[state]" />
        <span class="muted">
          {{ companyName(visit) || 'Sin empresa (particular)' }}{{ visit.type ? ` · ${labelOf(options?.types, visit.type) || visit.type}` : '' }}{{ visit.visit_to ? ` · visita a ${labelOf(options?.visit_to, visit.visit_to) || visit.visit_to}` : '' }}
        </span>
      </div>

      <div class="cols">
        <section>
          <h3>Visita</h3>
          <dl>
            <div><dt>Fecha</dt><dd>{{ longDate(visit.date) }}</dd></div>
            <div><dt>Hora prevista</dt><dd>{{ odooTime(visit.date) }}</dd></div>
            <div><dt>Motivo</dt><dd>{{ visit.reason_label || '–' }}</dd></div>
            <div><dt>Zona</dt><dd>{{ visit.factory ? 'Fábrica · se entregan EPIs' : 'Oficinas' }}</dd></div>
            <div v-if="visit.created_by"><dt>Creada por</dt><dd>{{ visit.created_by }} · {{ odooFull(visit.created_at) }}</dd></div>
          </dl>
          <h3>Anfitriones</h3>
          <p v-for="h in visit.hosts" :key="h.id" class="host"><i class="fa-regular fa-user" /> {{ h.name }}</p>
        </section>
        <section>
          <h3>Historial</h3>
          <div class="history">
            <p v-if="!visit.history.length" class="muted">Sin movimientos todavía</p>
            <div v-for="m in visit.history" :key="m.id" class="event">
              <span class="when">{{ odooShort(m.date) }}</span>
              <div>
                <p>{{ m.text }}</p>
                <small v-if="m.person || m.author">{{ [m.person, m.author].filter(Boolean).join(' · ') }}</small>
              </div>
            </div>
          </div>
        </section>
      </div>

      <h3>Visitantes · {{ visit.persons.length }}</h3>
      <div class="persons">
        <div v-for="p in visit.persons" :key="p.id" class="person">
          <div class="p-name">
            <strong>{{ p.name }}</strong>
            <small>{{ p.email || 'sin email' }} · {{ p.lang.toUpperCase() }}</small>
          </div>
          <div class="p-contact">
            <VisitTag :text="p.registered ? 'Contacto' : 'No registrado'" :tone="p.registered ? 'muted' : 'warning'" />
            <small v-if="p.registered && p.contact">{{ p.contact[1] }}</small>
          </div>
          <div><VisitTag :text="STATE_LABELS[personState(p, now)]" :tone="STATE_TONES[personState(p, now)]" /></div>
          <div class="p-time">{{ ['checked_in', 'checked_out'].includes(p.state) ? odooTime(p.check_in) + (p.check_out ? `–${odooTime(p.check_out)}` : '') : '–' }}</div>
          <div class="p-sign"><VisitTag v-bind="signatureTag(p)" /><small v-if="p.signed_at">{{ odooShort(p.signed_at) }}</small></div>
          <div v-if="canManage" class="p-actions">
            <button v-if="p.signature === 'sent' && isToday && ['planned', 'checked_in'].includes(p.state)" type="button" class="act" @click="emit('person', 'signature', visit, p)">Firmar en tablet</button>
            <button v-if="p.signature === 'sent' && p.state === 'planned' && !p.sign_on_tablet" type="button" class="act link" @click="emit('person', 'resend', visit, p)">Reenviar firma</button>
          </div>
        </div>
      </div>
      <p v-if="visit.persons.some(p => p.sign_on_tablet)" class="kg-note note">
        <i class="fa-solid fa-circle-info" /> Los no registrados y los contactos sin email firman en la tablet con el contacto genérico «Visitante sin registrar». Su PDF firmado se queda en Sign y en su ficha; no se envía por correo.
      </p>
    </div>

    <template #actions>
      <a v-if="visit?.odoo_url" :href="visit.odoo_url" target="_blank" rel="noopener" class="odoo-link"><i class="fa-solid fa-arrow-up-right-from-square" /> Abrir en Odoo</a>
      <v-btn v-if="canManage && visit && ['planned', 'late'].includes(state)" variant="outlined" class="kg-btn kg-btn-danger-ghost" @click="confirmCancel = true">Cancelar visita</v-btn>
      <v-btn v-if="canManage && isToday && pending" color="primary" variant="flat" class="kg-btn" @click="emit('visit', 'check-in', visit)">{{ pending > 1 ? `Entrada de todos (${pending})` : 'Registrar entrada' }}</v-btn>
      <v-btn variant="outlined" class="kg-btn kg-btn-ghost" @click="open = false">Cerrar</v-btn>
    </template>
  </appDialog>

  <appDialog v-model="confirmCancel" title="¿Cancelar la visita?" icon="fa-solid fa-ban" tone="danger" :width="440">
    <p class="kg-note">Se cancela a los visitantes que aún no han llegado. Los que ya han entrado no cambian.</p>
    <template #actions>
      <v-btn variant="outlined" class="kg-btn kg-btn-ghost" @click="confirmCancel = false">Volver</v-btn>
      <v-btn color="#b91c1c" variant="flat" class="kg-btn" @click="cancel">Cancelar visita</v-btn>
    </template>
  </appDialog>
</template>

<style scoped>
.loading { display: grid; place-items: center; padding: 40px 0 }
.detail { display: flex; flex-direction: column; gap: 12px }
.head { display: flex; flex-wrap: wrap; align-items: center; gap: 8px }
.muted { color: #64748b; font-size: .875rem }
.cols { display: grid; grid-template-columns: 1fr 1fr; gap: 20px }
h3 { margin: 8px 0 6px; font-size: .72rem; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: #94a3b8 }
dl { display: flex; flex-direction: column; gap: 4px; margin: 0; font-size: .875rem }
dl > div { display: flex; gap: 10px }
dt { width: 110px; flex-shrink: 0; color: #64748b }
dd { margin: 0; font-weight: 500 }
.host { margin: 0 0 4px; font-size: .875rem }
.host i { width: 16px; color: #94a3b8 }
.history { max-height: 260px; overflow-y: auto; padding-right: 4px; scrollbar-width: thin }
.event { display: grid; grid-template-columns: 82px 1fr; gap: 8px; padding: 6px 0; border-bottom: 1px solid #f1f2f4; font-size: .8rem }
.event p { margin: 0; white-space: pre-line }
.event small { color: #94a3b8 }
.when { color: #64748b; font-variant-numeric: tabular-nums }
.persons { border: 1px solid #eceef2; border-radius: 12px; overflow: hidden }
.person { display: grid; grid-template-columns: minmax(160px, 1.5fr) minmax(120px, 1fr) 110px 90px minmax(120px, 1fr) auto; gap: 10px; align-items: center; padding: 10px 12px; border-bottom: 1px solid #f1f2f4; font-size: .85rem }
.person:last-child { border-bottom: 0 }
.p-name, .p-contact, .p-sign { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; min-width: 0 }
.p-name small, .p-contact small, .p-sign small { color: #64748b; font-size: .75rem }
.p-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 4px }
.act { height: 28px; padding: 0 10px; border: 1px solid #d1d5db; border-radius: 8px; background: #ffffff; color: #334155; font: inherit; font-size: .78rem; font-weight: 600; cursor: pointer }
.act.link { border: 0; color: #468131 }
.note { display: flex; gap: 8px; padding: 10px 12px; border-radius: 10px; background: #eff6ff; color: #1e3a8a; font-size: .82rem }
.odoo-link { margin-right: auto; align-self: center; color: #468131; font-size: .85rem; font-weight: 600; text-decoration: none }

@media (width < 760px) {
  .cols { grid-template-columns: 1fr }
  .person { grid-template-columns: 1fr 1fr }
  .p-actions { grid-column: 1 / -1; justify-content: flex-start }
}
</style>
