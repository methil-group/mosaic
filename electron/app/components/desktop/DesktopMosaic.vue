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
      
      <button class="add-desktop-btn" @click="createNewDesktop">
        <div class="add-desktop-inner">
          <Plus class="w-8 h-8 mb-2" />
          <span>NOUVEAU BUREAU</span>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAgentStore } from '~/stores/agent'
import { storeToRefs } from 'pinia'
import DesktopCard from './DesktopCard.vue'
import { Plus } from 'lucide-vue-next'

const agentStore = useAgentStore()
const { desktops, desktopIds, instances, instanceIds } = storeToRefs(agentStore)

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

const createNewDesktop = async () => {
  try {
    const name = prompt('Nom du bureau :')
    if (name) {
      const id = (typeof crypto !== 'undefined' && crypto.randomUUID) 
        ? crypto.randomUUID() 
        : Math.random().toString(36).substring(2, 15)
      
      console.log('[DesktopMosaic] Creating new desktop:', { id, name })
      
      await agentStore.saveDesktop({
        id,
        name,
        color: getRandomColor()
      })
      
      console.log('[DesktopMosaic] Desktop saved successfully')
    }
  } catch (error) {
    console.error('[DesktopMosaic] Failed to create desktop:', error)
    alert('Erreur lors de la création du bureau. Voir la console pour plus de détails.')
  }
}

const getRandomColor = () => {
  const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444']
  return colors[Math.floor(Math.random() * colors.length)]
}
</script>

<style scoped>
.mosaic-container {
  padding: 60px 40px;
  max-width: 1400px;
  margin: 0 auto;
}

.mosaic-header {
  margin-bottom: 40px;
}

.mosaic-title {
  font-size: 32px;
  font-weight: 900;
  letter-spacing: -1px;
  color: #1a1a1a;
  margin-bottom: 4px;
}

.mosaic-subtitle {
  font-size: 13px;
  font-weight: 700;
  color: #888;
  letter-spacing: 2px;
}

.mosaic-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 32px;
}

.add-desktop-btn {
  width: 280px;
  height: 220px;
  border-radius: 20px;
  border: 2px dashed #e0e0e0;
  background: transparent;
  color: #aaa;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-desktop-btn:hover {
  border-color: #6366f1;
  color: #6366f1;
  background: rgba(99, 102, 241, 0.02);
  transform: translateY(-4px);
}

.add-desktop-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 1px;
}
</style>
