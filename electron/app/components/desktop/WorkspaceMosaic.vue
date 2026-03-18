<template>
  <div class="px-[60px] py-20 max-w-[1600px] mx-auto min-h-full bg-[radial-gradient(circle_at_2px_2px,var(--border-color)_1px,transparent_0)] bg-[length:32px_32px]">
    <div class="mb-[60px] text-center">
      <h1 class="text-4xl font-black uppercase tracking-tighter text-[var(--text-main)] mb-2">Vos Workspaces</h1>
      <p class="text-[11px] font-extrabold text-[var(--text-dim)] tracking-[4px] uppercase">{{ workspaceIds.length }} ESPACES DE TRAVAIL</p>
    </div>

    <div class="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-10 items-start">
      <template v-for="id in workspaceIds" :key="id">
        <WorkspaceCard v-if="workspaces[id]" :workspace="workspaces[id]!" :agents="getAgentsForWorkspace(id)"
          @select="handleSelect" @delete="handleDelete(id)" />
      </template>

      <button v-if="!isCreating"
        class="w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-[var(--border-color)] bg-[var(--panel-bg)] text-[var(--text-dim)] cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.165,0.84,0.44,1)] flex items-center justify-center shadow-sm hover:border-indigo-500 hover:text-indigo-500 hover:bg-indigo-500/[0.02] hover:-translate-y-1.5 hover:shadow-[0_12px_30px_rgba(99,102,241,0.1)]"
        @click="startCreation">
        <div class="flex flex-col items-center text-[11px] font-extrabold tracking-[1.5px]">
          <Plus class="w-8 h-8 mb-2" />
          <span>NOUVEAU WORKSPACE</span>
        </div>
      </button>

      <div v-else class="w-full aspect-[4/3] rounded-2xl border-2 border-indigo-500 bg-[var(--panel-bg)] flex items-center justify-center p-6 shadow-[0_12px_30px_rgba(99,102,241,0.1)]">
        <div class="w-full text-center">
          <input v-model="newName" ref="nameInput" placeholder="Nom du workspace..." @keydown.enter="handleCreate"
            @keydown.esc="cancelCreation"
            class="w-full bg-[var(--bg-color)] border border-[var(--border-color)] px-4 py-3 rounded-lg text-sm font-bold mb-5 text-center outline-none text-[var(--text-main)] transition-all duration-200 focus:bg-[var(--panel-bg)] focus:border-indigo-500 focus:ring-[3px] focus:ring-indigo-500/10" />
          <div class="flex gap-2.5">
            <button class="flex-1 py-2.5 rounded-lg text-[9px] font-extrabold tracking-[1px] cursor-pointer transition-all duration-200 border-none bg-[var(--bg-color)] text-[var(--text-dim)] hover:bg-[var(--border-color)] hover:text-[var(--text-main)]" @click="cancelCreation">ANNULER</button>
            <button class="flex-1 py-2.5 rounded-lg text-[9px] font-extrabold tracking-[1px] cursor-pointer transition-all duration-200 border-none bg-indigo-500 text-white hover:bg-indigo-600 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(99,102,241,0.2)]" @click="handleCreate">SÉLÉCT. DOSSIER</button>
          </div>
        </div>
      </div>
    </div>

    <!-- File Explorer Modal -->
    <Transition name="fade">
      <div v-if="showExplorer" class="fixed inset-0 bg-black/40 backdrop-blur-lg z-[1000] flex items-center justify-center p-10">
        <div class="w-full max-w-[600px] h-[80vh] bg-[var(--panel-bg)] rounded-[32px] overflow-hidden shadow-2xl animate-modal-in">
          <FileExplorer :title="`DOSSIER : ${newName}`" subtitle="SÉLECTIONNEZ LE DOSSIER DU WORKSPACE"
            @select="onFolderSelect" @cancel="showExplorer = false" />
        </div>
      </div>
    </Transition>

    <!-- Global Confirm Modal -->
    <ConfirmModal 
      :show="showConfirm"
      title="Supprimer Workspace"
      subtitle="ZONE DE DANGER"
      message="Supprimer cet espace de travail ? Les agents seront déplacés vers l'espace par défaut. Cette action est irréversible."
      confirm-text="SUPPRIMER"
      type="danger"
      @confirm="onDeleteConfirm"
      @cancel="showConfirm = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { useAgentStore } from '~/stores/agent'
import { storeToRefs } from 'pinia'
import WorkspaceCard from './WorkspaceCard.vue'
import FileExplorer from '../agent/FileExplorer.vue'
import ConfirmModal from '../ui/ConfirmModal.vue'
import { Plus, X } from 'lucide-vue-next'

const agentStore = useAgentStore()
const { workspaces, workspaceIds, instances, instanceIds } = storeToRefs(agentStore)

const isCreating = ref(false)
const showExplorer = ref(false)
const showConfirm = ref(false)
const workspaceToDeleteId = ref<string | null>(null)
const newName = ref('')
const nameInput = ref<HTMLInputElement | null>(null)

const emit = defineEmits(['select'])

const startCreation = () => {
  isCreating.value = true
  newName.value = ''
  nextTick(() => {
    nameInput.value?.focus()
  })
}

const cancelCreation = () => {
  isCreating.value = false
  newName.value = ''
}

const getAgentsForWorkspace = (workspaceId: string) => {
  return instanceIds.value
    .map(id => instances.value[id])
    .filter((agent): agent is NonNullable<typeof agent> => !!agent && agent.workspaceId === workspaceId)
}

const handleSelect = (transitionObject: any) => {
  emit('select', transitionObject)
}

const handleDelete = (id: string) => {
  workspaceToDeleteId.value = id
  showConfirm.value = true
}

const onDeleteConfirm = async () => {
  if (workspaceToDeleteId.value) {
    await agentStore.removeWorkspace(workspaceToDeleteId.value)
    workspaceToDeleteId.value = null
    showConfirm.value = false
  }
}

const handleCreate = () => {
  if (!newName.value) return
  showExplorer.value = true
}

const onFolderSelect = async (path: string) => {
  try {
    const name = newName.value
    const id = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2, 15)

    console.log('[DesktopMosaic] Creating new workspace:', { id, name, path })

    await agentStore.saveWorkspace({
      id,
      name,
      path,
      color: getRandomColor()
    })

    console.log('[DesktopMosaic] Workspace saved successfully')

    // Auto-enter the workspace
    agentStore.setActiveWorkspace(id)

    isCreating.value = false
    showExplorer.value = false
    newName.value = ''
  } catch (error) {
    console.error('[DesktopMosaic] Failed to create workspace:', error)
    alert('Erreur lors de la création du workspace. Voir la console pour plus de détails.')
  }
}

const getRandomColor = () => {
  const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444']
  return colors[Math.floor(Math.random() * colors.length)]
}
</script>

<style scoped>
@keyframes modal-in {
  from { opacity: 0; transform: scale(0.9) translateY(20px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
.animate-modal-in { animation: modal-in 0.4s cubic-bezier(0.165, 0.84, 0.44, 1); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
