<template>
  <div ref="loader" v-if="reload" class="loader"></div>
</template>

<script>
import { ref } from 'vue'

export default {
  name: 'appLoader',
  setup() {
    const loader = ref(null);

    return {
      loader
    }
  },
  props: {
    active: {
      type: Boolean,
      default: false
    },
    size: {
      type: Number,
      default: 20
    }
  },
  mounted() {
    this.loader.style.width = `${this.size}px`
    this.loader.style.height = `${this.size}px`
  },
  data() {
    return {
      reload: this.active
    }
  },
  watch: {
    active(newVal) {
      this.reload = newVal
    }
  },
}
</script>


<style lang="css" scoped>
.loader {
  border: 4px solid var(--black-transaparent-xs);
  border-left-color: transparent;
  border-radius: 50%;
}

.loader {
  border: 3px solid var(--white-transparent-md);
  border-left-color: transparent;
  animation: spin 1s linear infinite;
}
</style>
