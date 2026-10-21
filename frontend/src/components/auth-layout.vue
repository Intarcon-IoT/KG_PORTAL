<!-- Layout común de login, recuperación y cambio de contraseña, con la estética de keyter-intarcon.com -->
<script setup>
import logo from '@/assets/logo.svg'

defineProps({ title: { type: String, required: true }, subtitle: { type: String, default: '' } })

const brands = ['KEYTER', 'INTARCON', 'GENAQ', 'KICONEX']
const year = new Date().getFullYear()
</script>

<template>
  <div class="auth">
    <aside class="auth-brand">
      <img :src="logo" alt="KEYTER Group" class="auth-logo" />

      <div class="auth-claim">
        <span class="auth-eyebrow">Portal KEYTER Group</span>
        <h2>Todo el grupo,<br />en un solo portal</h2>
        <p>Accede con una única cuenta a las herramientas y servicios internos de las empresas del grupo.</p>
      </div>

      <footer class="auth-brand-footer">
        <ul class="auth-brands">
          <li v-for="brand in brands" :key="brand">{{ brand }}</li>
        </ul>
        <span>© {{ year }} KEYTER Group</span>
      </footer>
    </aside>

    <main class="auth-main">
      <div class="auth-card">
        <img :src="logo" alt="KEYTER Group" class="auth-logo auth-logo-mobile" />

        <header class="auth-header">
          <slot name="badge" />
          <h1>{{ title }}</h1>
          <p v-if="subtitle">{{ subtitle }}</p>
        </header>

        <div class="kg-form"><slot /></div>

        <div v-if="$slots.footer" class="auth-footer"><slot name="footer" /></div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.auth {
  --ink: #111111;
  --slate: #334155;
  --muted: #64748b;
  --line: #e5e7eb;
  --soft: #f9fafb;
  --brand-green: #5bb133;

  display: grid;
  grid-template-columns: minmax(380px, 5fr) 7fr;
  min-height: 100dvh;
  font-family: 'Manrope Variable', 'Manrope', system-ui, sans-serif;
  color: var(--ink);
  background: #ffffff;
  letter-spacing: -0.1px;
}

/* Panel de marca */
.auth-brand {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 3rem;
  padding: 3rem clamp(2rem, 4vw, 3.5rem);
  background: var(--ink);
  color: #ffffff;
  overflow: hidden;
}

.auth-brand::after {
  content: '';
  position: absolute;
  inset: auto -20% -35% auto;
  width: 70%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(91, 177, 51, 0.18), transparent 65%);
  pointer-events: none;
}

.auth-logo { height: 44px; width: auto; align-self: flex-start }

.auth-claim { position: relative; z-index: 1; max-width: 26rem }

.auth-eyebrow {
  display: inline-block;
  margin-bottom: 1.25rem;
  font-size: .75rem;
  font-weight: 600;
  letter-spacing: .18em;
  text-transform: uppercase;
  color: var(--brand-green);
}

.auth-claim h2 {
  margin: 0 0 1.25rem;
  font-size: clamp(2.25rem, 3.2vw, 3.25rem);
  font-weight: 300;
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.auth-claim p { margin: 0; font-size: 1.05rem; font-weight: 300; line-height: 1.6; color: rgba(255, 255, 255, .7) }

.auth-brand-footer {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, .12);
  font-size: .8rem;
  color: rgba(255, 255, 255, .5);
}

.auth-brands { display: flex; flex-wrap: wrap; gap: .5rem 1.5rem; margin: 0; padding: 0; list-style: none }

.auth-brands li { font-size: .8rem; font-weight: 600; letter-spacing: .12em; color: rgba(255, 255, 255, .85) }

/* Formulario */
.auth-main { display: flex; align-items: center; justify-content: center; padding: 3rem 1.5rem }

.auth-card { width: 100%; max-width: 400px }

.auth-logo-mobile { display: none }

.auth-header { margin-bottom: 2.25rem }

.auth-header h1 { margin: 0 0 .6rem; font-size: 2rem; font-weight: 600; line-height: 1.2; letter-spacing: -0.02em; color: var(--ink) }

.auth-header p { margin: 0; font-size: 1rem; font-weight: 400; line-height: 1.6; color: var(--muted) }

.auth-footer { margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid var(--line); text-align: center; font-size: .9rem; color: var(--muted) }

/* Campos: formField y textField adaptados a esta pantalla */
.auth-card :deep(.column-main) { row-gap: .5rem }

.auth-card :deep(.column-main > div:first-child) { font-size: .875rem }

.auth-card :deep(.text-input .v-field__input) { min-height: 48px !important; font-size: .95rem }

.auth-card :deep(.v-btn) { font-family: inherit }

/* Piezas comunes de los formularios que usan este layout */
.auth-card :deep(.auth-form) { display: flex; flex-direction: column; gap: .25rem }

.auth-card :deep(.auth-submit) { height: 48px; margin-top: .75rem; border-radius: 10px; font-size: .95rem; font-weight: 600; letter-spacing: 0 }

.auth-card :deep(.auth-link) { color: var(--ink); font-weight: 600; text-decoration: none; cursor: pointer }

.auth-card :deep(.auth-link:hover) { text-decoration: underline; text-underline-offset: 3px }

@media (width < 960px) {
  .auth { grid-template-columns: 1fr }
  .auth-brand { display: none }
  .auth-main { align-items: flex-start; padding: 2.5rem 16px }
  .auth-logo-mobile { display: block; height: 36px; margin-bottom: 2.5rem }
  .auth-header h1 { font-size: 1.75rem }
}
</style>
