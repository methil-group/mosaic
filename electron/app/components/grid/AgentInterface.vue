<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAgentStore } from '~/stores/agent'
import AgentInstance from '../agent/AgentInstance.vue'
import { LayoutGrid, AlertTriangle } from 'lucide-vue-next'
import { useTileLayout, type ResizeHandle } from '~/composables/useTileLayout'

const store = useAgentStore()
const gridContainer = ref<HTMLElement | null>(null)

const visibleInstances = computed(() => {
  return store.instanceIds.filter(id => store.instances[id]?.isVisible)
})

const { getTileStyle, getHandleStyle, resizeHandles, updateSplitRatio, limitedIds, hiddenCount } = useTileLayout(visibleInstances)

// Drag state managed locally
const isDragging = ref(false)
const activeHandle = ref<ResizeHandle | null>(null)

const startDrag = (handle: ResizeHandle, event: MouseEvent) => {
  isDragging.value = true
  activeHandle.value = handle
  event.preventDefault()

  const onMouseMove = (e: MouseEvent) => {
    if (!activeHandle.value || !gridContainer.value) return

    const rect = gridContainer.value.getBoundingClientRect()
    const handle = activeHandle.value

    let newRatio: number
    if (handle.direction === 'horizontal') {
      newRatio = (e.clientX - rect.left) / rect.width
    } else {
      newRatio = (e.clientY - rect.top) / rect.height
    }

    updateSplitRatio(handle.path, newRatio)
  }

  const onMouseUp = () => {
    isDragging.value = false
    activeHandle.value = null
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
  document.body.style.cursor = handle.direction === 'horizontal' ? 'col-resize' : 'row-resize'
  document.body.style.userSelect = 'none'
}
</script>

<template>
  <div class="h-full flex flex-col min-w-0 bg-black overflow-hidden">
    <div ref="gridContainer" v-if="limitedIds.length > 0"
      class="flex-1 p-4 overflow-hidden bg-[radial-gradient(#1a1a1a_1px,transparent_1px)] [background-size:24px_24px] relative">

      <!-- Hidden agents indicator -->
      <div v-if="hiddenCount > 0"
        class="absolute top-4 right-4 z-50 flex items-center gap-2 px-3 py-1.5 bg-orange-500/20 border border-orange-500/30 rounded-full">
        <AlertTriangle class="w-3 h-3 text-orange-400" />
        <span class="text-[9px] font-black uppercase tracking-widest text-orange-400">
          +{{ hiddenCount }} hidden
        </span>
      </div>

      <!-- Tiles with absolute positioning -->
      <TransitionGroup name="tile">
        <div v-for="id in limitedIds" :key="id" class="tile-item rounded-lg overflow-hidden border border-white/5"
          :style="getTileStyle(id, isDragging)">
          <AgentInstance :instance-id="id" class="w-full h-full" />
        </div>
      </TransitionGroup>

      <!-- Resize Handles -->
      <div v-for="handle in resizeHandles" :key="handle.id" class="resize-handle z-50" :class="{
        'resize-handle-active': isDragging && activeHandle?.id === handle.id,
        'resize-handle-horizontal': handle.direction === 'horizontal',
        'resize-handle-vertical': handle.direction === 'vertical'
      }" :style="getHandleStyle(handle)" @mousedown="startDrag(handle, $event)">
        <div class="resize-handle-visual" :class="handle.direction === 'horizontal' ? 'w-1 h-full' : 'w-full h-1'" />
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="flex-1 flex flex-col items-center justify-center bg-black gap-6 opacity-40 select-none">
      <div class="relative">
        <div
          class="w-16 h-16 rounded-2xl border border-white/10 flex items-center justify-center bg-white/5 animate-pulse">
          <LayoutGrid class="w-8 h-8 text-white/20" />
        </div>
      </div>
      <div class="text-center space-y-2">
        <h2 class="text-xs font-black tracking-[0.3em] uppercase text-white">Mosaic Grid Empty</h2>
        <p class="text-[9px] font-bold tracking-widest uppercase text-white/20">Deploy an agent from the sidebar or
          workspaces</p>
      </div>
      <button @click="store.createInstance()"
        class="mt-4 px-6 py-2.5 rounded-full border border-white/10 hover:border-white/40 bg-white/5 hover:bg-white/10 transition-all text-[9px] font-black uppercase tracking-[0.2em] text-white">
        Initialize Primary Unit
      </button>
    </div>
  </div>
</template>

<style>
/* Tile animations */
.tile-item {
  will-change: left, top, width, height;
}

/* Entry animation */
.tile-enter-from {
  opacity: 0;
  transform: scale(0.9);
}

.tile-enter-active {
  transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.tile-enter-to {
  opacity: 1;
  transform: scale(1);
}

/* Exit animation */
.tile-leave-from {
  opacity: 1;
  transform: scale(1);
}

.tile-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.tile-leave-to {
  opacity: 0;
  transform: scale(0.85);
}

/* Resize handles */
.resize-handle {
  opacity: 0;
  transition: opacity 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.resize-handle:hover,
.resize-handle-active {
  opacity: 1;
}

.resize-handle-visual {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  transition: background 0.15s ease, transform 0.15s ease;
}

.resize-handle:hover .resize-handle-visual {
  background: rgba(255, 255, 255, 0.5);
}

.resize-handle-horizontal:hover .resize-handle-visual {
  transform: scaleX(2);
}

.resize-handle-vertical:hover .resize-handle-visual {
  transform: scaleY(2);
}

.resize-handle-active .resize-handle-visual {
  background: rgba(255, 255, 255, 0.8);
}

/* Global scrollbar */
::-webkit-scrollbar {
  width: 4px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}

.scroll-none::-webkit-scrollbar {
  display: none;
}
</style>
