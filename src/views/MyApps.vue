<template>
  <div class="my-apps-page">
    <h2 class="text-lg font-semibold mb-4" :style="{ color: 'var(--text-color)' }">{{ $t('market.my_apps') }}</h2>

    <EmptyState icon="package" :text="$t('market.no_my_plugins')" />

    <div v-else class="space-y-3">
      <div
        v-for="plugin in sortedPlugins"
        :key="plugin.id"
        class="plugin-item flex items-center justify-between p-4 rounded-xl transition-all duration-200"
        :style="{
          background: 'var(--bg-setting-item)',
          border: '1px solid var(--line-color)',
          opacity: plugin.enabled ? 1 : 0.5,
        }"
      >
        <div class="flex items-center gap-3">
          <IconBox size="sm">
            <SvgIcon name="package" :size="20" :style="{ color: 'var(--accent-color)' }" />
          </IconBox>
          <div>
            <h3 class="font-medium" :style="{ color: 'var(--text-color)' }">{{ plugin.name }}</h3>
            <p class="text-xs mt-0.5" :style="{ color: 'var(--disabled-color)' }">{{ plugin.version }}</p>
          </div>
        </div>
        <button
          class="px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200"
          :style="{
            background: plugin.enabled ? 'var(--button-bg-color)' : 'var(--accent-color)',
            color: plugin.enabled ? 'var(--text-color)' : '#fff',
          }"
          @click="pluginStore.toggleEnabled(plugin.id)"
        >
          {{ plugin.enabled ? $t('common.disable') : $t('common.enable') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePluginStore } from '@/stores/plugins'
import SvgIcon from '@/components/SvgIcon.vue'
import IconBox from '@/components/IconBox.vue'
import EmptyState from '@/components/EmptyState.vue'

const pluginStore = usePluginStore()

const sortedPlugins = computed(() =>
  [...pluginStore.plugins].sort((a, b) => a.sortOrder - b.sortOrder)
)
</script>
