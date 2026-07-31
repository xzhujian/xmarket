<template>
  <div class="about-page">
    <div class="max-w-md mx-auto space-y-4">
      <h2 class="text-lg font-semibold" :style="{ color: 'var(--text-color)' }">{{ $t('about.title') }}</h2>

      <Card>
        <div class="text-center">
          <IconBox size="md" class="mx-auto mb-4">
            <SvgIcon name="logo" :size="32" :style="{ color: 'var(--accent-color)' }" />
          </IconBox>
          <h3 class="text-xl font-bold mb-1" :style="{ color: 'var(--text-color)' }">Framework App</h3>
          <p class="text-sm mb-5" :style="{ color: 'var(--disabled-color)' }">{{ $t('about.description') }}</p>

          <div class="space-y-2 text-sm text-left px-4">
            <div class="flex justify-between py-2.5" :style="{ borderBottom: '1px solid var(--line-color)' }">
              <span class="flex items-center gap-2">
                <SvgIcon name="about" :size="16" :style="{ color: 'var(--disabled-color)' }" />
                {{ $t('about.version') }}
              </span>
              <span :style="{ color: 'var(--text-color)' }">0.1.0</span>
            </div>
            <div class="flex justify-between py-2.5" :style="{ borderBottom: '1px solid var(--line-color)' }">
              <span class="flex items-center gap-2">
                <SvgIcon name="cpu" :size="16" :style="{ color: 'var(--disabled-color)' }" />
                Tauri
              </span>
              <span :style="{ color: 'var(--text-color)' }">2.x</span>
            </div>
            <div class="flex justify-between py-2.5">
              <span class="flex items-center gap-2">
                <SvgIcon name="home" :size="16" :style="{ color: 'var(--disabled-color)' }" />
                {{ $t('about.author') }}
              </span>
              <span :style="{ color: 'var(--text-color)' }">Framework Team</span>
            </div>
          </div>
        </div>
      </Card>
  </div>
</div>
</template>

<script setup lang="ts">
import SvgIcon from '@/components/SvgIcon.vue'
import Card from '@/components/Card.vue'
import IconBox from '@/components/IconBox.vue'
</script>
