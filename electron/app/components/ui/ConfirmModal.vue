<template>
  <Transition name="fade">
    <div v-if="show" class="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/10 backdrop-blur-md" @click.self="emit('cancel')">
      <div class="w-full max-w-md bg-[var(--panel-bg)] rounded-[40px] overflow-hidden shadow-[0_32px_80px_-16px_rgba(0,0,0,0.15)] animate-modal-in border border-[var(--border-color)]">
        <!-- Accent Bar -->
        <div class="h-2 w-full" :class="type === 'danger' ? 'bg-red-500' : 'bg-indigo-500'"></div>
        
        <div class="p-10 pb-6">
          <div class="flex items-center gap-6 mb-8">
            <div class="w-16 h-16 rounded-[24px] flex items-center justify-center shrink-0 shadow-sm border" 
              :class="type === 'danger' ? 'bg-red-500/10 border-red-200' : 'bg-indigo-500/10 border-indigo-200'">
               <component :is="icon" class="w-8 h-8" :class="type === 'danger' ? 'text-red-500' : 'text-indigo-500'" />
            </div>
            <div>
              <h3 class="text-xs font-black tracking-[0.3em] uppercase text-[var(--text-main)] leading-tight">{{ title }}</h3>
              <p class="text-[10px] text-[var(--text-dim)] font-bold uppercase tracking-[0.2em] mt-2">{{ subtitle }}</p>
            </div>
          </div>
          
          <div class="bg-[var(--bg-color)]/50 rounded-[24px] p-6 border border-[var(--border-color)]">
            <p class="text-[12px] font-bold text-[var(--text-dim)] leading-relaxed">
                {{ message }}
            </p>
          </div>
        </div>

        <div class="px-10 pb-10 flex items-center gap-4 mt-4">
          <button @click="emit('cancel')" 
            class="flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-dim)] hover:text-[var(--text-main)] bg-[var(--bg-color)] hover:bg-[var(--panel-hover)] rounded-2xl transition-all active:scale-95">
            ANNULER
          </button>
          <button @click="emit('confirm')" 
            class="flex-[1.5] py-4 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3"
            :class="type === 'danger' ? 'bg-red-500 shadow-red-100 hover:bg-red-600' : 'bg-indigo-600 shadow-indigo-100 hover:bg-indigo-700'">
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { AlertTriangle, Trash2, Info } from 'lucide-vue-next'
import { computed } from 'vue'

const props = defineProps<{
  show: boolean
  title: string
  subtitle: string
  message: string
  confirmText: string
  type: 'danger' | 'info'
}>()

const emit = defineEmits(['confirm', 'cancel'])

const icon = computed(() => {
  if (props.type === 'danger') return Trash2
  return Info
})
</script>

<style scoped>
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
