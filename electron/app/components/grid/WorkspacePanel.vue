<template>
  <div ref="rootContainer" class="h-full relative min-w-0 bg-[var(--bg-color)] overflow-hidden">
    <!-- Layer 1: Workspace Mosaic (Lower layer) -->
    <div class="absolute inset-0 transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]"
      :class="{ 'opacity-0 scale-150 pointer-events-none': store.viewMode === 'desktop' }"
      :style="{ transformOrigin: transitionOrigin }">
      <div class="h-full overflow-y-auto">
        <WorkspaceMosaic @select="handleWorkspaceSelect" />
      </div>
    </div>

    <!-- Layer 2: Workspace Detail (Top layer, Zooms in) -->
    <div class="absolute inset-0 flex flex-col overflow-hidden transition-[opacity,transform] duration-500 ease-in-out"
      :class="[
        store.viewMode === 'desktop' ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-50 pointer-events-none'
      ]" :style="{ transformOrigin: transitionOrigin }">
      <!-- Consolidated Top Bar -->
      <div v-if="store.activeWorkspaceId" class="absolute top-0 left-0 right-0 z-[60] flex items-center justify-between px-6 py-4 bg-[var(--panel-bg)]/80 backdrop-blur-xl border-b border-[var(--border-color)]/50">
        <!-- Left: Back & Title -->
        <div class="flex items-center gap-4">
          <button @click="store.setActiveWorkspace(null)"
            class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--accent-color)]/5 transition-colors group"
            title="Retour à la mosaïque">
            <ChevronLeft class="w-5 h-5 text-[var(--text-dim)] group-hover:text-[var(--text-main)] transition-colors" />
          </button>
          
          <div class="flex flex-col">
            <h2 class="text-sm font-bold text-[var(--text-main)] leading-none">{{ activeWorkspaceName }}</h2>
            <div class="flex items-center gap-2 mt-0.5 text-[10px] leading-none">
              <span class="font-bold text-[var(--text-dim)] tracking-wider uppercase">Workspace</span>
              <template v-if="activeWorkspacePath">
                <span class="text-[var(--text-dim)]">•</span>
                <span class="font-medium text-[var(--text-dim)] truncate max-w-[300px] font-mono" :title="activeWorkspacePath">{{ activeWorkspacePath }}</span>
              </template>
            </div>
          </div>
        </div>

        <!-- Right: Actions -->
        <div class="flex items-center gap-3">
          <button @click="openAgentSelect" :disabled="visibleInstances.length >= 6" :class="[
            'h-9 px-4 rounded-full flex items-center gap-2 shadow-sm transition-all',
            visibleInstances.length >= 6
              ? 'bg-[var(--bg-color)] text-[var(--text-dim)] cursor-not-allowed border border-[var(--border-color)]'
              : 'bg-[var(--accent-color)] text-[var(--panel-bg)] hover:shadow-md border border-[var(--accent-color)]'
          ]">
            <span class="text-[10px] font-bold uppercase tracking-widest">
              {{ visibleInstances.length >= 6 ? 'Full' : 'Add Agent' }}
            </span>
          </button>
        </div>
      </div>

      <div
        class="flex-1 min-h-0 bg-[radial-gradient(var(--border-color)_1px,transparent_1px)] [background-size:24px_24px] p-4 pt-20 relative">
        <template v-if="store.activeWorkspaceId">
          <AgentGrid v-if="visibleInstances.length > 0" :workspace-id="store.activeWorkspaceId" />

          <!-- Empty State -->
          <div v-else
            class="h-full flex flex-col items-center justify-center bg-[var(--bg-color)] gap-6 opacity-60 select-none">
            <div class="relative">
              <div
                class="w-16 h-16 rounded-2xl border border-[var(--border-color)] flex items-center justify-center bg-[var(--panel-bg)] animate-pulse shadow-sm">
                <LayoutGrid class="w-8 h-8 text-[var(--text-dim)]" />
              </div>
            </div>
            <div class="text-center space-y-2">
              <h2 class="text-xs font-black tracking-[0.3em] uppercase text-[var(--text-main)]">Mosaic Grid Empty</h2>
              <p class="text-[9px] font-bold tracking-widest uppercase text-[var(--text-dim)]">Deploy an agent from the top bar</p>
            </div>
            <button @click="openAgentSelect"
              class="mt-4 px-6 py-2.5 rounded-full border border-[var(--border-color)] hover:border-[var(--text-dim)] bg-[var(--panel-bg)] hover:bg-[var(--bg-color)] transition-all text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-main)] shadow-sm">
              Initialize Primary Unit
            </button>
          </div>
        </template>
      </div>
    </div>

    <!-- Modals -->
    <AgentSelectModal 
      :show="showAgentSelect" 
      @cancel="showAgentSelect = false" 
      @select="onAgentSelect" 
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useAgentStore } from '~/stores/agent'
import { LayoutGrid, ChevronLeft } from 'lucide-vue-next'
import WorkspaceMosaic from '../desktop/WorkspaceMosaic.vue'
import AgentGrid from './AgentGrid.vue'
import AgentSelectModal from '../ui/AgentSelectModal.vue'

const store = useAgentStore()

const rootContainer = ref<HTMLElement | null>(null)
const transitionRect = ref<DOMRect | null>(null)
const showAgentSelect = ref(false)

const openAgentSelect = () => {
    showAgentSelect.value = true
}

const onAgentSelect = async (agentId: string) => {
    if (store.activeWorkspaceId) {
        await store.assignAgentToWorkspace(agentId, store.activeWorkspaceId)
        showAgentSelect.value = false
    }
}

const handleWorkspaceSelect = async (transitionObject: any) => {
  transitionRect.value = transitionObject.transitionRect
  // Ensure the DOM updates the transform-origin before we trigger the view mode change
  await nextTick()
  store.setActiveWorkspace(transitionObject.id)
}

const transitionOrigin = computed(() => {
  if (!transitionRect.value) return 'center center'

  // Calculate coordinates relative to container (subtracting sidebar/offset)
  const rect = transitionRect.value
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

const activeWorkspacePath = computed(() => {
  if (!store.activeWorkspaceId || !store.workspaces[store.activeWorkspaceId]) return ''
  return store.workspaces[store.activeWorkspaceId]?.path || ''
})
</script>

<style>
/* Tile TransitionGroup hooks */
.tile-item { will-change: left, top, width, height; }
.tile-enter-from { opacity: 0; transform: scale(0.9); }
.tile-enter-active { transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1); }
.tile-enter-to { opacity: 1; transform: scale(1); }
.tile-leave-from { opacity: 1; transform: scale(1); }
.tile-leave-active { transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); }
.tile-leave-to { opacity: 0; transform: scale(0.85); }

/* Resize handle interactions (must be CSS – hover parent→child, active states) */
.resize-handle { opacity: 0; transition: opacity 0.15s ease; display: flex; align-items: center; justify-content: center; }
.resize-handle:hover, .resize-handle-active { opacity: 1; }
.resize-handle-visual { background: rgba(0,0,0,0.15); border-radius: 4px; transition: background 0.15s ease, transform 0.15s ease; }
.resize-handle:hover .resize-handle-visual { background: rgba(0,0,0,0.3); }
.resize-handle-horizontal:hover .resize-handle-visual { transform: scaleX(2); }
.resize-handle-vertical:hover .resize-handle-visual { transform: scaleY(2); }
.resize-handle-active .resize-handle-visual { background: rgba(0,0,0,0.5); }

/* Global scrollbar */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
.scroll-none::-webkit-scrollbar { display: none; }
</style>
