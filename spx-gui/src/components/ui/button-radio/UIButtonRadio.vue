<template>
  <button :class="{ active: isActive }" @click="handleClick">
    {{ label }}
  </button>
</template>

<script setup lang="ts">
import { inject, computed } from 'vue'
import { radioGroupValueKey, updateRadioValueKey } from './UIButtonRadioGroup.vue'

const props = defineProps<{
  label: string
  value: string
}>()

const radioGroupValue = inject(radioGroupValueKey)
const updateRadioValue = inject(updateRadioValueKey)

const isActive = computed(() => radioGroupValue?.value === props.value)

const handleClick = () => {
  updateRadioValue?.(props.value)
}
</script>

<style scoped lang="scss">
button {
  border-radius: 12px;
  height: 40px;
  font-weight: 600;
  font-size: 14px;
  line-height: 22px;
  padding: 0 16px;

  &.active {
    border: 1px solid var(--ui-color-primary-500);
    color: var(--ui-color-primary-500);
  }

  border: 1px solid var(--ui-color-grey-600);
  color: var(--ui-color-grey-900);
  outline: none;
  background: var(--ui-color-grey-100);
  cursor: pointer;
}
</style>
