<template>
  <div class="home-page h-full flex flex-col items-center justify-center">
    <div v-if="!hasPlugins" class="text-center">
      <IconBox size="lg" class="mx-auto mb-5">
        <SvgIcon name="logo" :size="40" :style="{ color: 'var(--accent-color)' }" />
      </IconBox>
      <h2 class="text-2xl font-semibold mb-2" :style="{ color: 'var(--text-color)' }">{{ $t('welcome.title') }}</h2>
      <p class="mb-6" :style="{ color: 'var(--disabled-color)' }">{{ $t('welcome.description') }}</p>
      <TButton variant="accent" icon="market" @click="$router.push('/market')">
        {{ $t('nav.market') }}
      </TButton>
    </div>
    <div v-else class="w-full">
      <h2 class="text-lg font-semibold mb-4" :style="{ color: 'var(--text-color)' }">{{ $t('nav.home') }}</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="plugin in plugins"
          :key="plugin.id"
          class="plugin-card p-4 rounded-xl cursor-pointer transition-all duration-200"
          :style="{
            background: 'var(--bg-setting-item)',
            border: '1px solid var(--line-color)',
          }"
          @mouseenter="($event.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px var(--box-shadow-color)'"
          @mouseleave="($event.currentTarget as HTMLElement).style.boxShadow = 'none'"
        >
          <IconBox size="sm" class="mb-3">
            <SvgIcon name="package" :size="20" :style="{ color: 'var(--accent-color)' }" />
          </IconBox>
          <h3 class="font-medium" :style="{ color: 'var(--text-color)' }">{{ plugin.name }}</h3>
          <p class="text-sm mt-1" :style="{ color: 'var(--disabled-color)' }">{{ plugin.version }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePluginStore } from '@/stores/plugins'
import SvgIcon from '@/components/SvgIcon.vue'
import IconBox from '@/components/IconBox.vue'
import TButton from '@/components/form/TButton.vue'

const pluginStore = usePluginStore()
const plugins = computed(() => pluginStore.enabledPlugins)
const hasPlugins = computed(() => plugins.value.length > 0)
</script>
