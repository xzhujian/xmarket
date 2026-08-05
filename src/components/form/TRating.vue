<template>
  <div class="trating" :class="{ readonly, disabled }">
    <button
      v-for="i in count"
      :key="i"
      class="trating-star"
      :class="{
        filled: i <= currentValue,
        half: halfAllowed && i - 0.5 === currentValue,
        active: !readonly && !disabled && i <= hoverValue,
      }"
      :style="{
        color: i <= (hoverValue || currentValue) ? activeColor : inactiveColor,
        cursor: readonly || disabled ? 'default' : 'pointer',
      }"
      :disabled="disabled"
      @mouseenter="!readonly && !disabled && (hoverValue = i)"
      @mouseleave="!readonly && !disabled && (hoverValue = 0)"
      @click="!readonly && !disabled && setValue(i)"
    >
      <SvgIcon
        :name="icon"
        :size="size"
        :fill="i <= (hoverValue || currentValue) ? activeColor : 'none'"
      />
    </button>
    <span v-if="showValue" class="trating-value" :style="{ color: 'var(--text-color)' }">
      {{ modelValue || 0 }}/{{ count }}
    </span>
    <span v-if="showText" class="trating-text" :style="{ color: 'var(--disabled-color)' }">
      {{ text }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import SvgIcon from '@/components/SvgIcon.vue'

const props = withDefaults(defineProps<{
  modelValue: number
  count?: number
  size?: number
  icon?: string
  activeColor?: string
  inactiveColor?: string
  readonly?: boolean
  disabled?: boolean
  halfAllowed?: boolean
  showValue?: boolean
  showText?: boolean
  text?: string
}>(), {
  count: 5,
  size: 24,
  icon: 'star',
  activeColor: '#f59e0b',
  inactiveColor: 'var(--line-color)',
  readonly: false,
  disabled: false,
  halfAllowed: false,
  showValue: false,
  showText: false,
  text: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const hoverValue = ref(0)
const currentValue = ref(props.modelValue)

function setValue(val: number) {
  const newVal = currentValue.value === val ? 0 : val
  currentValue.value = newVal
  emit('update:modelValue', newVal)
}
</script>

<style scoped>
.trating {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.trating.readonly,
.trating.disabled {
  opacity: 0.7;
}

.trating-star {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: transform 0.15s, color 0.2s;
  border-radius: 4px;
}

.trating-star:not(.readonly):not(.disabled):hover {
  transform: scale(1.2);
}

.trating-star:not(.readonly):not(.disabled):active {
  transform: scale(0.9);
}

.trating-value {
  margin-left: 6px;
  font-size: 13px;
  font-weight: 500;
}

.trating-text {
  margin-left: 6px;
  font-size: 13px;
}
</style>
