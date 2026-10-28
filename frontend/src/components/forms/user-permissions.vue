<!-- Permisos por módulo pensados para catálogos largos: buscador, módulos agrupados por área y plegables, contador por
     módulo e interruptor por acción. v-model con las claves propias; `inherited` son las que ya da el rol -->
<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  catalog: { type: Array, default: () => [] },
  inherited: { type: Array, default: () => [] },
  inheritedFrom: { type: String, default: '' },
  admin: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
})
const model = defineModel({ type: Array, default: () => [] })

const search = ref('')
const onlyGranted = ref(false)
const granted = computed(() => new Set([...model.value, ...props.inherited]))
const isInherited = key => props.inherited.includes(key)
const allActions = computed(() => props.catalog.flatMap(m => m.actions))
const titleOf = key => allActions.value.find(a => a.key === key)?.title || key
const requiredBy = key => allActions.value.filter(a => a.requires?.includes(key) && model.value.includes(a.key))

// Marcar arrastra los permisos que implica (salvo los heredados); desmarcar quita los propios que dependen de él
const apply = (next, action, on) => {
  if (on) [action.key, ...(action.requires || [])].filter(k => !isInherited(k)).forEach(k => next.add(k))
  else [action.key, ...requiredBy(action.key).map(a => a.key)].forEach(k => next.delete(k))
}
// El módulo que se toca queda abierto aunque se quite su último permiso
const moduleOf = action => props.catalog.find(m => m.actions.includes(action))
const commit = (next, module) => { manual.value.set(module.key, true); model.value = [...next].sort() }
const toggle = (action, on) => { const next = new Set(model.value); apply(next, action, on); commit(next, moduleOf(action)) }
const setModule = (module, on) => { const next = new Set(model.value); module.actions.forEach(a => apply(next, a, on)); commit(next, module) }

const countOf = module => module.actions.filter(a => granted.value.has(a.key)).length
const ownIn = module => module.actions.some(a => model.value.includes(a.key))
const total = computed(() => allActions.value.filter(a => granted.value.has(a.key)).length)

// Búsqueda sin acentos sobre área, módulo y acción; el filtro deja solo lo concedido
const normalize = text => (text || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
const visibleActions = module => {
  const q = normalize(search.value)
  const moduleHit = q && normalize(`${module.group} ${module.title} ${module.description}`).includes(q)
  return module.actions.filter(a => (!onlyGranted.value || granted.value.has(a.key)) && (!q || moduleHit || normalize(`${a.title} ${a.hint}`).includes(q)))
}
const groups = computed(() => {
  const map = new Map()
  for (const module of props.catalog) {
    if (!visibleActions(module).length) continue
    if (!map.has(module.group)) map.set(module.group, [])
    map.get(module.group).push(module)
  }
  return [...map].map(([title, modules]) => ({ title: title || 'Otros', modules }))
})

// Abiertos por defecto los que tienen algo concedido; lo que se abre o cierra a mano manda. Buscando o filtrando, todos
const manual = ref(new Map())
const isOpen = module => !!search.value?.trim() || onlyGranted.value || (manual.value.has(module.key) ? manual.value.get(module.key) : countOf(module) > 0)
const toggleOpen = module => manual.value.set(module.key, !isOpen(module))
</script>

<template>
  <div class="perms">
    <p v-if="admin" class="kg-note perms-note"><i class="fa-solid fa-shield-halved" /><span>Los administradores tienen acceso a todos los módulos.</span></p>
    <template v-else>
      <div class="toolbar">
        <v-text-field v-model="search" autocomplete="off" placeholder="Buscar permiso" prepend-inner-icon="fa-solid fa-magnifying-glass" density="compact" hide-details clearable class="search" />
        <label class="kg-check only">
          <input v-model="onlyGranted" type="checkbox" />
          <span class="kg-check-box"><i class="fa-solid fa-check" /></span>
          Solo concedidos
        </label>
        <span class="total">{{ total }} de {{ allActions.length }}</span>
      </div>
      <p v-if="inherited.length" class="kg-note perms-note"><i class="fa-solid fa-circle-info" /><span>Los marcados con <span class="tag"><i class="fa-solid fa-user-shield" />Rol</span> los da {{ inheritedFrom || 'el rol' }}: se quitan desde Roles.</span></p>

      <section v-for="group in groups" :key="group.title" class="group">
        <h4>{{ group.title }}</h4>
        <article v-for="module in group.modules" :key="module.key" class="module" :class="{ on: countOf(module) }">
          <header>
            <button type="button" class="module-head" :aria-expanded="isOpen(module)" @click="toggleOpen(module)">
              <span class="icon"><i :class="module.icon || 'fa-solid fa-puzzle-piece'" /></span>
              <span class="module-text">
                <strong>{{ module.title }}</strong>
                <small>{{ module.description }}</small>
              </span>
              <span class="count" :class="{ full: countOf(module) === module.actions.length, some: countOf(module) && countOf(module) < module.actions.length }">{{ countOf(module) }}/{{ module.actions.length }}</span>
              <i class="fa-solid fa-chevron-down caret" :class="{ open: isOpen(module) }" />
            </button>
          </header>
          <div v-if="isOpen(module)" class="actions">
            <div class="bulk">
              <button type="button" :disabled="disabled || countOf(module) === module.actions.length" @click="setModule(module, true)">Conceder todo</button>
              <button type="button" :disabled="disabled || !ownIn(module)" @click="setModule(module, false)">Quitar todo</button>
            </div>
            <label v-for="action in visibleActions(module)" :key="action.key" class="action" :class="{ inherited: isInherited(action.key) }">
              <span class="action-text">
                <span class="action-title">{{ action.title }} <span v-if="isInherited(action.key)" class="tag"><i class="fa-solid fa-user-shield" />Rol</span></span>
                <small v-if="action.hint">{{ action.hint }}</small>
                <small v-if="action.requires?.length" class="needs">Incluye: {{ action.requires.map(titleOf).join(', ') }}</small>
              </span>
              <span class="switch">
                <input type="checkbox" role="switch" :checked="granted.has(action.key)" :disabled="disabled || isInherited(action.key)" @change="toggle(action, $event.target.checked)" />
                <span class="track"><span class="thumb" /></span>
              </span>
            </label>
          </div>
        </article>
      </section>
      <p v-if="!groups.length" class="kg-note empty">{{ catalog.length ? 'Ningún permiso coincide.' : 'No hay módulos con permisos asignables.' }}</p>
    </template>
  </div>
</template>

<style scoped>
.perms { display: flex; flex-direction: column; gap: 10px }
.perms-note { display: flex; align-items: baseline; gap: 8px; font-size: .85rem }
.toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px }
.search { flex: 1 1 200px }
.search :deep(.v-field) { border-radius: 10px }
.only { font-size: .82rem; white-space: nowrap }
.total { margin-left: auto; padding: 2px 8px; border-radius: 999px; background: #f1f2f4; color: #475569; font-size: .75rem; font-weight: 600; white-space: nowrap }

.group { display: flex; flex-direction: column; gap: 6px }
.group h4 { margin: 4px 0 0; font-size: .68rem; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: #94a3b8 }

.module { border: 1px solid #eceef2; border-radius: 12px; background: #ffffff; overflow: hidden; transition: border-color .15s }
.module.on { border-color: #cfe3c4 }
.module-head { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 12px; border: 0; background: transparent; font: inherit; text-align: left; cursor: pointer }
.module-head:hover { background: #fbfbfc }
.icon { display: grid; place-items: center; flex-shrink: 0; width: 32px; height: 32px; border-radius: 9px; background: #f1f2f4; color: #64748b; font-size: .85rem }
.module.on .icon { background: #eef4ea; color: #33662d }
.module-text { display: flex; flex: 1; flex-direction: column; min-width: 0 }
.module-text strong { font-size: .875rem; color: #111111 }
.module-text small { overflow: hidden; font-size: .75rem; color: #64748b; text-overflow: ellipsis; white-space: nowrap }
.count { flex-shrink: 0; min-width: 38px; padding: 1px 8px; border-radius: 999px; background: #f1f2f4; color: #64748b; font-size: .72rem; font-weight: 700; text-align: center }
.count.some { background: #fff7ed; color: #b45309 }
.count.full { background: #eef4ea; color: #33662d }
.caret { flex-shrink: 0; font-size: .7rem; color: #94a3b8; transition: transform .15s }
.caret.open { transform: rotate(180deg) }

.actions { border-top: 1px solid #f1f2f4; background: #fbfbfc }
.bulk { display: flex; justify-content: flex-end; gap: 4px; padding: 6px 12px 0 }
.bulk button { padding: 2px 6px; border: 0; background: none; color: #468131; font: inherit; font-size: .75rem; font-weight: 600; cursor: pointer }
.bulk button:disabled { color: #cbd5e1; cursor: default }
.action { display: flex; align-items: center; gap: 12px; padding: 9px 12px 9px 54px; border-bottom: 1px solid #f1f2f4; cursor: pointer }
.action:last-child { border-bottom: 0 }
.action.inherited { cursor: default }
.action-text { display: flex; flex: 1; flex-direction: column; gap: 1px; min-width: 0 }
.action-title { font-size: .85rem; color: #111111 }
.action-text small { font-size: .75rem; color: #64748b }
.action-text .needs { color: #94a3b8 }

/* Interruptor: input nativo oculto, pista y botón propios */
.switch { position: relative; flex-shrink: 0 }
.switch input { position: absolute; inset: 0; opacity: 0; cursor: inherit }
.track { display: block; width: 34px; height: 20px; padding: 2px; border-radius: 999px; background: #d1d5db; transition: background-color .15s }
.thumb { display: block; width: 16px; height: 16px; border-radius: 50%; background: #ffffff; box-shadow: 0 1px 2px rgba(15, 23, 42, .25); transition: transform .15s }
.switch input:checked + .track { background: #111111 }
.action.inherited .switch input:checked + .track { background: #5b8a4a }
.switch input:checked + .track .thumb { transform: translateX(14px) }
.switch input:focus-visible + .track { outline: 2px solid #111111; outline-offset: 2px }
.switch input:disabled:not(:checked) + .track { opacity: .5 }

.tag { display: inline-flex; align-items: center; gap: 4px; padding: 1px 6px; border-radius: 5px; background: #eef4ea; color: #33662d; font-size: .62rem; font-weight: 700; letter-spacing: .08em; line-height: 1.5; text-transform: uppercase; vertical-align: middle }
.empty { padding: 16px; text-align: center }

@media (width < 600px) {
  .total { margin-left: 0 }
  .action { padding-left: 12px }
}
</style>
