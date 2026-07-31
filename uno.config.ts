import { defineConfig, presetUno } from 'unocss'

export default defineConfig({
  presets: [presetUno()],
  shortcuts: {
    'flex-center': 'flex items-center justify-center',
    'flex-col-center': 'flex flex-col items-center justify-center',
    'flex-x-center': 'flex items-center',
    'flex-col-x-center': 'flex flex-col items-center',
  },
})
