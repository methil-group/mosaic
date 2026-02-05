<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAgentStore } from '~/stores/agent'
import { LayoutGrid, ChevronLeft } from 'lucide-vue-next'
import WorkspaceMosaic from '../desktop/WorkspaceMosaic.vue'
import AgentGrid from './AgentGrid.vue'

const store = useAgentStore()

const rootContainer = ref<HTMLElement | null>(null)

const transitionOrigin = computed(() => {
  if (!store.transitionRect) return 'center center'

  // Calculate coordinates relative to container (subtracting sidebar/offset)
  const rect = store.transitionRect
  let containerX = 0
  let containerY = 0

  if (rootContainer.value) {
    const containerRect = rootContainer.value.getBoundingClientRect()
    containerX = containerRect.left
    containerY = containerRect.top
  }

  const x = rect.left - containerX + rect.width / 2
  const y = rect.top - containerY + rect.height / 2

  return `${x}px ${y}px`
})

// Transition state
const isZooming = ref(false)
const showDetails = ref(false)

// Sync showDetails with store.viewMode
watch(() => store.viewMode, (newMode) => {
  if (newMode === 'desktop') {
    isZooming.value = true
    setTimeout(() => {
      showDetails.value = true
      isZooming.value = false
    }, 500) // Match CSS transition
  } else {
    showDetails.value = false
  }
}, { immediate: true })
const visibleInstances = computed(() => {
  return store.instanceIds.filter(id => {
    const instance = store.instances[id]
    if (!instance || !instance.isVisible) return false
    if (store.activeWorkspaceId && instance.workspaceId !== store.activeWorkspaceId) return false
    return true
  })
})

const activeWorkspaceName = computed(() => {
  if (!store.activeWorkspaceId || !store.workspaces[store.activeWorkspaceId]) return ''
  return store.workspaces[store.activeWorkspaceId]?.name || 'Workspace'
})
</script>

<template>
  <div ref="rootContainer" class="h-full relative min-w-0 bg-gray-100 overflow-hidden">
    <!-- Layer 1: Workspace Mosaic (Lower layer) -->
    <div class="absolute inset-0 transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]"
      :class="{ 'opacity-0 scale-150 pointer-events-none': store.viewMode === 'desktop' }"
      :style="{ transformOrigin: transitionOrigin }">
      <div class="h-full overflow-y-auto">
        <WorkspaceMosaic />
      </div>
    </div>

    <!-- Layer 2: Workspace Detail (Top layer, Zooms in) -->
    <div class="absolute inset-0 flex flex-col bg-gray-100 overflow-hidden transition-all duration-500 ease-in-out"
      :class="[
        store.viewMode === 'desktop' ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-50 pointer-events-none'
      ]" :style="{ transformOrigin: transitionOrigin }">
      <!-- Floating Controls (Top Right) -->
      <div v-if="store.activeWorkspaceId" class="absolute top-6 right-6 z-[60] flex items-center gap-3">
        <!-- Back Button -->
        <button @click="store.setActiveWorkspace(null)"
          class="w-10 h-10 flex items-center justify-center bg-white/80 backdrop-blur-md rounded-full border border-gray-200 shadow-sm hover:shadow-md hover:bg-white transition-all group"
          title="Retour à la mosaïque">
          <ChevronLeft class="w-5 h-5 text-gray-600 group-hover:text-gray-900 transition-colors" />
        </button>

        <!-- Add Agent Button -->
        <button @click="store.createInstance()" :disabled="visibleInstances.length >= 6" :class="[
          'h-10 px-4 rounded-full flex items-center gap-2 border shadow-sm transition-all',
          visibleInstances.length >= 6
            ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-black border-black text-white hover:bg-gray-800 hover:shadow-md'
        ]">
          <span class="text-xs font-bold uppercase tracking-wider">
            {{ visibleInstances.length >= 6 ? 'Full' : 'Add Agent' }}
          </span>
        </button>
      </div>

      <div
        class="flex-1 min-h-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] p-4 relative">
        <AgentGrid v-if="store.activeWorkspaceId" :workspace-id="store.activeWorkspaceId" />

        <!-- Empty State -->
        <div v-else-if="visibleInstances.length === 0"
          class="h-full flex flex-col items-center justify-center bg-gray-50 gap-6 opacity-60 select-none">
          <div class="relative">
            <div
              class="w-16 h-16 rounded-2xl border border-gray-200 flex items-center justify-center bg-white animate-pulse shadow-sm">
              <LayoutGrid class="w-8 h-8 text-gray-300" />
            </div>
          </div>
          <div class="text-center space-y-2">
            <h2 class="text-xs font-black tracking-[0.3em] uppercase text-gray-900">Mosaic Grid Empty</h2>
            <p class="text-[9px] font-bold tracking-widest uppercase text-gray-400">Deploy an agent from the sidebar
              or
              workspaces</p>
          </div>
          <button @click="store.createInstance()"
            class="mt-4 px-6 py-2.5 rounded-full border border-gray-300 hover:border-gray-500 bg-white hover:bg-gray-50 transition-all text-[9px] font-black uppercase tracking-[0.2em] text-gray-900 shadow-sm">
            Initialize Primary Unit
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
/* Transition Origin Styles */
/* Handled via inline v-bind in Template */

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
  background: rgba(0, 0, 0, 0.15);
  border-radius: 4px;
  transition: background 0.15s ease, transform 0.15s ease;
}

.resize-handle:hover .resize-handle-visual {
  background: rgba(0, 0, 0, 0.3);
}

.resize-handle-horizontal:hover .resize-handle-visual {
  transform: scaleX(2);
}

.resize-handle-vertical:hover .resize-handle-visual {
  transform: scaleY(2);
}

.resize-handle-active .resize-handle-visual {
  background: rgba(0, 0, 0, 0.5);
}

/* Global scrollbar */
::-webkit-scrollbar {
  width: 4px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 10px;
}

.scroll-none::-webkit-scrollbar {
  display: none;
}
</style>
