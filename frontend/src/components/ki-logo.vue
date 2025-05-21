<template>
  <div class="ki-logo">
    <img v-if="sm" :src="logoIcon" :style="{ width: size - 5.8 + 'em', height: size - 5.8 + 'em' }" />
    <img v-else :src="logo" :style="{ width: size + 'em', height: size + 'em' }" />
  </div>
</template>
<script>
import logo from '@/assets/logo.svg';
import logoIcon from '@/assets/logo_icon.svg';

export default {
  name: "kiLogo",
  props: {
    size: {
      type: Number,
      default: 10,
    },
    sm : {
      type: Boolean,
      default: false,
    },
  },
  setup() {
    return {
      logo,
      logoIcon
    }
  }
};
</script>

<style lang="css" scoped>
.ki-logo {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  margin-left: 10px;
}

.ki-logo img {
  margin-right: -.6rem;
}
</style>
