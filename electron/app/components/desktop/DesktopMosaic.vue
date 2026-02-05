<template>
  <div class="mosaic-container">
    <div class="mosaic-header">
      <h2 class="mosaic-title">VOS BUREAUX</h2>
      <p class="mosaic-subtitle">{{ desktopIds.length }} ESPACES DE TRAVAIL</p>
    </div>

    <div class="mosaic-grid">
      <template v-for="id in desktopIds" :key="id">
        <DesktopCard 
          v-if="desktops[id]"
          :desktop="desktops[id]!"
          :agents="getAgentsForDesktop(id)"
          @select="handleSelect(id)"
          @delete="handleDelete(id)"
        />
      </template>
      
      <button v-if="!isCreating" class="add-desktop-btn" @click="startCreation">
        <div class="add-desktop-inner">
          <Plus class="w-8 h-8 mb-2" />
          <span>NOUVEAU WORKSPACE</span>
        </div>
      </button>

      <div v-else class="add-desktop-form">
        <div class="form-content">
          <input 
            v-model="newName"
            ref="nameInput"
            placeholder="Nom du workspace..."
            @keydown.enter="handleCreate"
            @keydown.esc="cancelCreation"
            class="name-input"
          />
          <div class="form-actions">
            <button class="action-btn cancel" @click="cancelCreation">ANNULER</button>
            <button class="action-btn confirm" @click="handleCreate">SÉLECT. DOSSIER</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { useAgentStore } from '~/stores/agent'
import { storeToRefs } from 'pinia'
import DesktopCard from './DesktopCard.vue'
import { Plus } from 'lucide-vue-next'

const agentStore = useAgentStore()
const { desktops, desktopIds, instances, instanceIds } = storeToRefs(agentStore)

const isCreating = ref(false)
const newName = ref('')
const nameInput = ref<HTMLInputElement | null>(null)

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

const getAgentsForDesktop = (desktopId: string) => {
  return instanceIds.value
    .map(id => instances.value[id])
    .filter((agent): agent is NonNullable<typeof agent> => !!agent && agent.desktopId === desktopId)
}

const handleSelect = (id: string) => {
  agentStore.setActiveDesktop(id)
}

const handleDelete = async (id: string) => {
  if (confirm('Supprimer ce bureau ? Les agents seront déplacés vers le bureau par défaut.')) {
    await agentStore.removeDesktop(id)
  }
}

const handleCreate = async () => {
  if (!newName.value) return
  try {
    const name = newName.value
    let path = ''
    
    if ((window as any).electron) {
      const result = await (window as any).electron.ipcRenderer.invoke('dialog:openDirectory')
      if (result.canceled) return
      path = result.path
    }

    const id = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2, 15)

    console.log('[DesktopMosaic] Creating new workspace:', { id, name, path })

    await agentStore.saveDesktop({
      id,
      name,
      path,
      color: getRandomColor()
    })

    console.log('[DesktopMosaic] Workspace saved successfully')
    isCreating.value = false
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
.mosaic-container {
  padding: 80px 60px;
  max-width: 1600px;
  margin: 0 auto;
  min-height: 100%;
  background-image: 
    radial-gradient(circle at 2px 2px, rgba(0,0,0,0.03) 1px, transparent 0);
  background-size: 32px 32px;
}

.mosaic-header {
  margin-bottom: 60px;
  text-align: center;
}

.mosaic-title {
  font-size: 42px;
  font-weight: 900;
  letter-spacing: -2px;
  color: #1a1a1a;
  margin-bottom: 8px;
  text-transform: uppercase;
}

.mosaic-subtitle {
  font-size: 11px;
  font-weight: 800;
  color: #a0a0a0;
  letter-spacing: 4px;
  text-transform: uppercase;
}

.mosaic-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 40px;
  align-items: start;
}

.add-desktop-btn {
  width: 100%;
  aspect-ratio: 4/3;
  border-radius: 16px;
  border: 2px dashed #dbdbdb;
  background: white;
  color: #b0b0b0;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 15px rgba(0,0,0,0.02);
}

.add-desktop-btn:hover {
  border-color: #6366f1;
  color: #6366f1;
  background: rgba(99, 102, 241, 0.02);
  transform: translateY(-6px);
  box-shadow: 0 12px 30px rgba(99, 102, 241, 0.1);
}

.add-desktop-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1.5px;
}

.add-desktop-form {
  width: 100%;
  aspect-ratio: 4/3;
  border-radius: 16px;
  border: 2px solid #6366f1;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  box-shadow: 0 12px 30px rgba(99, 102, 241, 0.1);
}

.form-content {
  width: 100%;
  text-align: center;
}

.name-input {
  width: 100%;
  background: #f9f9f9;
  border: 1px solid #eee;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 20px;
  text-align: center;
  outline: none;
  transition: all 0.2s;
}

.name-input:focus {
  background: white;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.form-actions {
  display: flex;
  gap: 10px;
}

.action-btn {
  flex: 1;
  padding: 10px;
  border-radius: 8px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.action-btn.cancel {
  background: #f5f5f5;
  color: #a0a0a0;
}

.action-btn.cancel:hover {
  background: #eee;
  color: #666;
}

.action-btn.confirm {
  background: #6366f1;
  color: white;
}

.action-btn.confirm:hover {
  background: #4f46e5;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
}
</style>
