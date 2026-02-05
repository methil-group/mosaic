<template>
  <div class="workspace-card group" @click="handleSelect">
    <div class="workspace-card-inner" :style="{ '--workspace-color': workspace.color || '#6366f1' }">
      <div ref="previewRef" class="workspace-preview">
        <div class="mini-grid-wrapper">
          <AgentGrid :workspace-id="workspace.id" is-preview />
        </div>
      </div>
      <div class="workspace-info">
        <h3 class="workspace-name">{{ workspace.name }}</h3>
        <span class="workspace-path" :title="workspace.path">{{ displayPath }}</span>
        <div class="workspace-stats">
          <span class="agent-count">{{ agents.length }} agent{{ agents.length !== 1 ? 's' : '' }}</span>
          <div class="color-dot" :style="{ backgroundColor: workspace.color }"></div>
        </div>
      </div>
    </div>

    <button v-if="workspace.id !== 'default'" class="delete-workspace-btn" @click.stop="$emit('delete', workspace.id)">
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

<style scoped>
.workspace-card {
  position: relative;
  width: 100%;
  aspect-ratio: 4/3;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
}

.workspace-card:hover {
  transform: translateY(-6px) scale(1.02);
}

.workspace-card-inner {
  width: 100%;
  height: 100%;
  background: white;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
}

.workspace-preview {
  flex: 1;
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  padding: 32px;
  position: relative;
  overflow: hidden;
}

/* Subtle background pattern/animation */
.workspace-preview::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: radial-gradient(var(--workspace-color) 1px, transparent 1px);
  background-size: 16px 16px;
  opacity: 0.1;
}

.mini-grid-wrapper {
  position: absolute;
  inset: 0;
  transform: scale(0.25);
  transform-origin: top left;
  width: 400%;
  height: 400%;
  pointer-events: none;
}

.empty-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: #94a3b8;
}

.workspace-info {
  padding: 16px 20px;
  background: white;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
}

.workspace-name {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 0.5px;
  color: #0f172a;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.workspace-path {
  display: block;
  font-size: 9px;
  font-weight: 700;
  color: #64748b;
  margin-bottom: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: 'JetBrains Mono', monospace;
  opacity: 0.6;
}

.workspace-stats {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.agent-count {
  font-size: 10px;
  font-weight: 800;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.color-dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  box-shadow: 0 0 8px var(--workspace-color);
}

.delete-workspace-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  background: white;
  color: #ef4444;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: scale(0.8) translateY(4px);
  transition: all 0.3s cubic-bezier(0.19, 1, 0.22, 1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.workspace-card:hover .delete-workspace-btn {
  opacity: 1;
  transform: scale(1) translateY(0);
}

.delete-workspace-btn:hover {
  background: #fef2f2;
}
</style>
