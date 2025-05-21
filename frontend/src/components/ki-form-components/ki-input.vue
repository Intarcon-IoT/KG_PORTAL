<template>
  <main :class="{ 'column-main' : this.column }">
    <div :class="{ 'input-label': !this.switch, 'column-label' : this.column }"><span>{{ label }}</span></div>
    <div :class="{ 'input-switch': this.switch, 'column-input' : this.column }">
      <slot />
    </div>
  </main>

</template>

<script>
export default {
  props: {
    label: {
      type: String,
      default: ''
    },
    switch: {
      type: Boolean,
      default: false
    },
    column: {
      type: Boolean,
      default: false
    }
  }
}
</script>

<style lang="css" scoped>
main {
  display: flex;
  flex-flow: row nowrap;
  column-gap: 2rem;
  width: 100%;
  align-items: center;
}

main > div:first-child {
  font-size: 1.1rem;
  min-width: 75px;
  max-width: 100px;

}

main > div:last-child {
  width: 100%;
}

.input-switch {
  display: flex;
  flex-flow: column nowrap;
  align-items: flex-end;
}

.input-label {
  margin-top: -20px;
}

.column-label {
  margin-top: 0px;
}

.column-main {
  flex-flow: column nowrap;
  align-items: flex-start;
}

@media (width < 900px) {
  main {
    flex-flow: column nowrap;
    align-items: flex-start;
  }
  .input-label {
    margin-top: 0px;
  }
}
</style>
