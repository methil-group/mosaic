<template>
  <div class="desktop-card group" @click="$emit('select', desktop.id)">
    <div class="desktop-card-inner" :style="{ '--desktop-color': desktop.color || '#6366f1' }">
      <div class="desktop-preview">
        <div v-if="agents.length === 0" class="empty-preview">
          <LayoutGrid class="w-8 h-8 opacity-20" />
        </div>
        <div v-else class="agent-mosaic">
          <div v-for="agent in visibleAgents.slice(0, 4)" :key="agent.id" 
               class="agent-mini-tile"
               :style="{ backgroundColor: agent.color || '#eee' }">
            <span v-if="agent.icon" class="text-xs">{{ agent.icon }}</span>
          </div>
        </div>
      </div>
      <div class="desktop-info">
        <h3 class="desktop-name">{{ desktop.name }}</h3>
        <span class="agent-count">{{ agents.length }} agent{{ agents.length !== 1 ? 's' : '' }}</span>
      </div>
    </div>
    
    <button v-if="desktop.id !== 'default'" 
            class="delete-desktop-btn" 
            @click.stop="$emit('delete', desktop.id)">
      <X class="w-3 h-3" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Desktop, InstanceState } from '~/stores/agent'
import { LayoutGrid, X } from 'lucide-vue-next'

const props = defineProps<{
  desktop: Desktop
  agents: InstanceState[]
}>()

defineEmits(['select', 'delete'])

const visibleAgents = computed(() => props.agents.filter(a => a.isVisible))
</script>

<style scoped>
.desktop-card {
  position: relative;
  width: 280px;
  height: 220px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.desktop-card:hover {
  transform: translateY(-8px);
}

.desktop-card-inner {
  width: 100%;
  height: 100%;
  background: white;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
  border: 1px solid #eeeeee;
  display: flex;
  flex-direction: column;
}

.desktop-preview {
  flex: 1;
  background: var(--desktop-color);
  opacity: 0.9;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.empty-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.agent-mosaic {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  padding: 16px;
  width: 100%;
  height: 100%;
}

.agent-mini-tile {
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  background: white;
}

.desktop-info {
  padding: 16px 20px;
  background: white;
  border-top: 1px solid #f5f5f5;
}

.desktop-name {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  letter-spacing: -0.5px;
  color: #1a1a1a;
  text-transform: uppercase;
}

.agent-count {
  font-size: 11px;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.delete-desktop-btn {
  position: absolute;
  top: -10px;
  right: -10px;
  width: 24px;
  height: 24px;
  background: #ef4444;
  color: white;
  border-radius: 50%;
  border: 2px solid white;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.2s ease;
  box-shadow: 0 4px 10px rgba(239, 68, 68, 0.3);
  z-index: 10;
}

.desktop-card:hover .delete-desktop-btn {
  opacity: 1;
}

.delete-desktop-btn:hover {
  transform: scale(1.1);
  background: #dc2626;
}
</style>
