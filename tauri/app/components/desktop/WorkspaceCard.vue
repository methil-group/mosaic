<template>
  <div
    class="relative w-full aspect-[4/3] cursor-pointer transition-all duration-400 ease-[cubic-bezier(0.165,0.84,0.44,1)] hover:-translate-y-1.5 hover:scale-[1.02] group"
    @click="handleSelect">
    <div
      class="w-full h-full bg-white rounded-[24px] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-black/5 flex flex-col"
      :style="{ '--workspace-color': workspace.color || '#6366f1' }">
      <div ref="previewRef"
        class="flex-1 bg-gradient-to-br from-slate-100 to-slate-200 p-8 relative overflow-hidden before:content-[''] before:absolute before:inset-0 before:bg-[radial-gradient(var(--workspace-color)_1px,transparent_1px)] before:bg-[length:16px_16px] before:opacity-10">
        <div class="absolute inset-0 scale-[0.25] origin-top-left w-[400%] h-[400%] pointer-events-none">
          <AgentGrid :workspace-id="workspace.id" is-preview />
        </div>
      </div>
      <div class="px-5 py-4 bg-white border-t border-black/5">
        <h3 class="mb-1 text-[14px] font-black tracking-[0.5px] text-slate-900 uppercase truncate">{{ workspace.name }}
        </h3>
        <span class="block text-[9px] font-bold text-slate-500 mb-3 truncate font-mono opacity-60"
          :title="workspace.path">{{ displayPath }}</span>
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">{{ agents.length }} agent{{
            agents.length !== 1 ? 's' : '' }}</span>
          <div class="w-2 h-2 rounded-[2px]"
            :style="{ backgroundColor: workspace.color, boxShadow: `0 0 8px ${workspace.color}` }"></div>
        </div>
      </div>
    </div>

    <button v-if="workspace.id !== 'default'"
      class="absolute top-2 right-2 w-6 h-6 bg-white text-red-500 rounded-lg border border-black/5 flex items-center justify-center opacity-0 -translate-y-1 scale-75 group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100 hover:bg-red-50 transition-all duration-300 ease-[cubic-bezier(0.19,1,0.22,1)] shadow-lg z-10"
      @click.stop="$emit('delete', workspace.id)">
      <X class="w-2.5 h-2.5" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAgentStore, type Workspace, type InstanceState } from '~/stores/agent'
import { X } from 'lucide-vue-next'
import AgentGrid from '../grid/AgentGrid.vue'

const props = defineProps<{
  workspace: Workspace
  agents: InstanceState[]
}>()

const store = useAgentStore()
const emit = defineEmits(['select', 'delete'])

const previewRef = ref<HTMLElement | null>(null)

const handleSelect = () => {
  const selectedWorkspace = {
    id: props.workspace.id,
    name: props.workspace.name,
    transitionRect: previewRef.value!.getBoundingClientRect()
  }
  emit('select', selectedWorkspace)
}

const displayPath = computed(() => {
  if (!props.workspace.path) return 'No folder linked'
  const parts = props.workspace.path.split(/[\\/]/)
  if (parts.length <= 2) return props.workspace.path
  return `.../${parts.slice(-2).join('/')}`
})
</script>
