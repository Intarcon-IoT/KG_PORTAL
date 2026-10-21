<template>
  <v-text-field
    :class="!transparent && 'text-input'"
    :id="id"
    v-model="selected"
    :type="type"
    :min="min"
    :max="max"
    :maxlength="maxlength"
    :placeholder="placeholder"
    :loading="loading"
    :disabled="disabled"
    :rules="rules"
    :readonly="readonly || locked"
    :prepend-inner-icon="prependInnerIcon"
    :hide-details="hideDetails"
    :append-inner-icon="appendIcon"
    :autocomplete="autocomplete"
    :autocapitalize="autocapitalize"
    :autocorrect="autocorrect"
    :autofocus="autofocus"
    @update:focused="unlock"
    :suffix="suffix"
    :variant="variant"
    dense
    solo
  >
    <template v-for="(_, name) in $slots" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps || {}" />
    </template>

  </v-text-field>
</template>
<script>
export default {
  name: 'textField',
  props: {
    transparent: {
      type: Boolean,
      default: false
    },
    type: {
      type: String,
      default: "text"
    },
    value: {
      type: [String, Number],
      default: null
    },
    min: {
      type: [String, Number],
      default: null
    },
    max: {
      type: [String, Number],
      default: null
    },
    maxlength: {
      type: [String, Number],
      default: null
    },
    loading: {
      type: Boolean,
      default: false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    outlined: {
      type: Boolean,
      default: false,
    },
    readonly: {
      type: Boolean,
      default: false,
    },
    rules: {
      type: Array,
      default: () => []
    },
    placeholder: {
      type: String,
      default: ''
    },
    prependInnerIcon: {
      type: String,
      default: null
    },
    hideDetails: {
      type: Boolean,
      default: false
    },
    appendIcon: {
      type: String,
      default: null
    },
    id: {
      type: String,
      default: null
    },
    autocorrect: {
      type: String,
      default: null
    },
    // Sin autorrelleno salvo que se pida expresamente (solo el login lo hace)
    autocomplete: {
      type: String,
      default: 'off'
    },
    autocapitalize: {
      type: String,
      default: null
    },
    autofocus: {
      type: Boolean,
      default: false
    },
    suffix: {
      type: String,
      default: null
    },
    variant: {
      type: String,
      default: 'outlined'
    }
  },
  data() {
    return {
      selected: this.value,
      // Chrome ignora autocomplete="off" en contraseñas: el campo es de solo lectura hasta que el usuario lo enfoca
      locked: this.autocomplete === 'off',
    }
  },
  methods: {
    unlock(focused) {
      if (focused) this.locked = false
    },
  },
  watch: {
    value(v) {
      this.selected =  v;
    },
    selected(v) {
      this.$emit('onChange', v);
    }
  },
}
</script>

<style lang="css" scoped>

.text-input:deep(.v-input__control) {
  background-color: var(--white-color);
  border-radius: 5px;
}

.text-input:deep(.v-field__append-inner) {
  font-size: 10px;
  color: var(--black-color);

}

.text-input:deep(.v-field__input) {
  background-color: var(--white-color);
  border-radius: 5px;
  color: var(--black-color);
  min-height: 37px!important;
  padding-top: 0;
  padding-bottom: 0;
}

.v-text-field:deep(.error--text) {
  color: var(--notification-error-color) !important;
}

.error--text:deep(.v-input__slot) {
  border: 1px solid var(--notification-error-color) !important;
}

.v-input--is-disabled:deep(.v-input__slot) input {
  cursor: not-allowed !important;
}

.v-input--is-disabled:not(.v-input--is-readonly) {
  pointer-events: all;
}

/* Color de fondo transparente, cuando se selecciona una sugerencia */
.v-text-field:deep(input:-webkit-autofill), .v-text-field:deep(input:-webkit-autofill:hover), .v-text-field:deep(input:-webkit-autofill:focus) {
  -webkit-background-clip: text;
}
</style>
