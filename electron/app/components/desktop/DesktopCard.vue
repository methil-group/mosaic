<template>
  <div class="desktop-card group" @click="$emit('select', desktop.id)">
    <div class="desktop-card-inner" :style="{ '--desktop-color': desktop.color || '#6366f1' }">
      <div class="desktop-preview">
        <div v-if="agents.length === 0" class="empty-preview">
          <LayoutGrid class="w-8 h-8 opacity-20" />
        </div>
        <div v-else class="mini-grid">
          <div v-for="pos in miniPositions" :key="pos.id" 
               class="mini-tile"
               :style="getMiniTileStyle(pos)">
            <span v-if="getAgentIcon(pos.id)" class="text-[8px] sm:text-[10px]">{{ getAgentIcon(pos.id) }}</span>
          </div>
        </div>
      </div>
      <div class="desktop-info">
        <h3 class="desktop-name">{{ desktop.name }}</h3>
        <span class="desktop-path" :title="desktop.path">{{ displayPath }}</span>
        <div class="desktop-stats">
          <span class="agent-count">{{ agents.length }} agent{{ agents.length !== 1 ? 's' : '' }}</span>
          <div class="color-dot" :style="{ backgroundColor: desktop.color }"></div>
        </div>
      </div>
    </div>
    
    <button v-if="desktop.id !== 'default'" 
            class="delete-desktop-btn" 
            @click.stop="$emit('delete', desktop.id)">
      <X class="w-2.5 h-2.5" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Desktop, InstanceState } from '~/stores/agent'
import { LayoutGrid, X } from 'lucide-vue-next'
import { buildAutoTileLayout, nodeToPositions } from '~/composables/useTileLayout'

const props = defineProps<{
  desktop: Desktop
  agents: InstanceState[]
}>()

defineEmits(['select', 'delete'])

const miniPositions = computed(() => {
  const visibleAgentIds = props.agents.filter(a => a.isVisible).map(a => a.id)
  if (visibleAgentIds.length === 0) return []
  
  const tree = buildAutoTileLayout(visibleAgentIds)
  if (!tree) return []
  
  // Return positions in percentage
  return nodeToPositions(tree, 0, 0, 100, 100)
})

const displayPath = computed(() => {
  if (!props.desktop.path) return 'No folder linked'
  const parts = props.desktop.path.split(/[\\/]/)
  if (parts.length <= 2) return props.desktop.path
  return `.../${parts.slice(-2).join('/')}`
})

const getAgentIcon = (id: string) => {
  return props.agents.find(a => a.id === id)?.icon
}

const getAgentColor = (id: string) => {
  return props.agents.find(a => a.id === id)?.color || '#eee'
}

const getMiniTileStyle = (pos: any) => {
  return {
    position: 'absolute' as const,
    left: `${pos.left}%`,
    top: `${pos.top}%`,
    width: `${pos.width}%`,
    height: `${pos.height}%`,
    backgroundColor: getAgentColor(pos.id),
    borderRadius: '4px',
    border: '1px solid rgba(0,0,0,0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    transition: 'all 0.3s ease'
  }
}
</script>

<style scoped>
.desktop-card {
  position: relative;
  width: 100%;
  aspect-ratio: 4/3;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
}

.desktop-card:hover {
  transform: translateY(-6px) scale(1.02);
}

.desktop-card-inner {
  width: 100%;
  height: 100%;
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
  border: 1px solid #eeeeee;
  display: flex;
  flex-direction: column;
}

.desktop-preview {
  flex: 1;
  background: #f8f9fa;
  padding: 12px;
  position: relative;
  overflow: hidden;
}

.mini-grid {
  position: relative;
  width: 100%;
  height: 100%;
}

.mini-tile {
  z-index: 1;
}

.empty-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: #ccc;
}

.desktop-info {
  padding: 12px 16px;
  background: white;
  border-top: 1px solid #f1f1f1;
}

.desktop-name {
  margin: 0 0 2px 0;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: -0.3px;
  color: #1a1a1a;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.desktop-path {
  display: block;
  font-size: 10px;
  font-weight: 600;
  color: #a0a0a0;
  margin-bottom: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: monospace;
}

.desktop-stats {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.agent-count {
  font-size: 10px;
  font-weight: 600;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.color-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.delete-desktop-btn {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 20px;
  height: 20px;
  background: #ef4444;
  color: white;
  border-radius: 50%;
  border: 2px solid white;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: scale(0.8);
  transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  box-shadow: 0 4px 10px rgba(239, 68, 68, 0.2);
  z-index: 10;
}

.desktop-card:hover .delete-desktop-btn {
  opacity: 1;
  transform: scale(1);
}

.delete-desktop-btn:hover {
  background: #dc2626;
}
</style>

