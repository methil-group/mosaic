<template>
  <Transition name="fade">
    <div v-if="show" class="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/10 backdrop-blur-md" @click.self="emit('cancel')">
      <div class="w-full max-w-2xl bg-white rounded-[40px] overflow-hidden shadow-[0_32px_80px_-16px_rgba(0,0,0,0.15)] animate-modal-in border border-gray-100 flex flex-col max-h-[80vh]">
        <!-- Accent Bar -->
        <div class="h-2 w-full bg-indigo-500 shrink-0"></div>
        
        <div class="p-10 pb-6 shrink-0 border-b border-gray-50">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-6">
              <div class="w-16 h-16 rounded-[24px] flex items-center justify-center shrink-0 shadow-sm border bg-indigo-50 border-indigo-100">
                 <Blocks class="w-8 h-8 text-indigo-500" />
              </div>
              <div>
                <h3 class="text-xs font-black tracking-[0.3em] uppercase text-gray-900 leading-tight">Assign Unit</h3>
                <p class="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-2">Select an infrastructure agent</p>
              </div>
            </div>
            <button @click="emit('cancel')" class="p-2 text-gray-400 hover:text-gray-900 transition-colors rounded-full hover:bg-gray-50">
              <X class="w-5 h-5" />
            </button>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto p-10 custom-scrollbar">
          <div v-if="unassignedAgents.length === 0" class="text-center py-12 opacity-50">
            <Cpu class="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p class="text-[11px] font-black tracking-[0.2em] uppercase text-gray-500">No available units</p>
            <p class="text-[9px] font-bold text-gray-400 mt-2">Go to Infrastructures to deploy more units.</p>
          </div>
          
          <div v-else class="grid grid-cols-2 gap-4">
            <div v-for="agent in unassignedAgents" :key="agent.id"
                 @click="selectAgent(agent.id)"
                 class="group relative bg-white border border-black/[0.05] rounded-3xl p-5 hover:border-indigo-500/30 hover:shadow-lg transition-all cursor-pointer flex items-center gap-4 overflow-hidden">
                 
                 <!-- Background Visual Fill -->
                 <div class="absolute inset-0 opacity-0 group-hover:opacity-[0.02] transition-opacity pointer-events-none"
                      :style="{ backgroundColor: agent.color || '#000' }"></div>
                      
                 <div class="w-12 h-12 shrink-0 flex items-center justify-center">
                    <client-only v-if="agent.lottie">
                        <Vue3Lottie 
                            :animationLink="agent.lottie" 
                            :height="'100%'" 
                            :width="'100%'" 
                            :speed="0.5"
                        />
                    </client-only>
                    <component 
                        v-else
                        :is="getIconComponent(agent.icon)" 
                        class="w-8 h-8 stroke-[1.5px]" 
                        :style="{ color: agent.color || '#000' }"
                    />
                 </div>
                 
                 <div class="flex-1 min-w-0">
                    <h4 class="text-[11px] font-black text-gray-900 uppercase tracking-widest truncate">{{ agent.name }}</h4>
                    <p class="text-[9px] font-bold text-gray-400 truncate mt-1">{{ agent.currentModel.split('/').pop() }}</p>
                 </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useAgentStore } from '~/stores/agent'
import * as LucideIcons from 'lucide-vue-next'
import { Blocks, Cpu, Bot, X } from 'lucide-vue-next'

const Vue3Lottie = defineAsyncComponent(() =>
  import('vue3-lottie').then(m => m.Vue3Lottie)
)

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits(['select', 'cancel'])
const store = useAgentStore()

const unassignedAgents = computed(() => {
    return store.instanceIds
        .map(id => store.instances[id])
        .filter((a): a is any => !!a && (a.workspaceId === null || a.workspaceId === undefined))
})

const getIconComponent = (iconName?: string) => {
    if (!iconName) return Bot
    const name = iconName.charAt(0).toUpperCase() + iconName.slice(1)
    return (LucideIcons as any)[name] || Bot
}

const selectAgent = (id: string) => {
  emit('select', id)
}
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
    width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.05);
    border-radius: 4px;
}

.animate-modal-in {
  animation: modal-in 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
}

@keyframes modal-in {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
