<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue'
import { useAgentStore } from '~/stores/agent'
import { Send, Bot, User, Terminal, Loader2, Sparkles, Folder, Cpu, ChevronDown } from 'lucide-vue-next'

const store = useAgentStore()
const prompt = ref('')
const scrollContainer = ref<HTMLElement | null>(null)
const isModelMenuOpen = ref(false)

const handleSend = async () => {
  if (!prompt.value.trim() || store.isProcessing) return
  const currentPrompt = prompt.value
  prompt.value = ''
  await store.sendMessage(currentPrompt)
}

const scrollToBottom = async () => {
  await nextTick()
  if (scrollContainer.value) {
    scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight
  }
}

onMounted(() => {
  scrollToBottom()
})

// Watch messages for auto-scroll
watch(() => store.messages.length, scrollToBottom)
watch(() => store.messages[store.messages.length - 1]?.content, scrollToBottom)

const selectModel = (modelId: string) => {
  store.currentModel = modelId
  isModelMenuOpen.value = false
}
</script>

<template>
  <div class="flex flex-col h-screen bg-[#0a0a0c] text-slate-200 font-sans selection:bg-indigo-500/30">
    <!-- Header -->
    <header
      class="flex items-center justify-between px-8 py-4 border-b border-white/5 bg-black/20 backdrop-blur-xl sticky top-0 z-50">
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Sparkles class="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 class="text-lg font-semibold tracking-tight">Mosaic <span class="text-indigo-400">Agent</span></h1>
          <p class="text-xs text-slate-500 font-medium uppercase tracking-widest">Autonomous CLI Intelligence</p>
        </div>
      </div>

      <div class="flex items-center gap-6">
        <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
          <Folder class="w-4 h-4 text-slate-400" />
          <span class="text-sm font-mono text-slate-300 truncate max-w-[200px]">{{
            store.currentWorkspace.split('/').pop() }}</span>
        </div>

        <!-- Model Selection Dropdown -->
        <div class="relative">
          <button @click="isModelMenuOpen = !isModelMenuOpen"
            class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group">
            <Cpu class="w-4 h-4 text-slate-400 group-hover:text-indigo-400" />
            <span class="text-sm font-mono text-slate-300">{{ store.currentModel.split('/').pop() }}</span>
            <ChevronDown class="w-3 h-3 text-slate-500 transition-transform"
              :class="{ 'rotate-180': isModelMenuOpen }" />
          </button>

          <div v-if="isModelMenuOpen"
            class="absolute right-0 mt-2 w-64 rounded-xl bg-[#121216] border border-white/10 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div class="p-2 space-y-1">
              <button v-for="model in store.availableModels" :key="model.id" @click="selectModel(model.id)"
                class="w-full flex flex-col items-start px-3 py-2 rounded-lg transition-colors hover:bg-white/5 text-left"
                :class="store.currentModel === model.id ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-400'">
                <span class="text-xs font-bold">{{ model.name }}</span>
                <span class="text-[10px] font-mono opacity-50">{{ model.id }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Chat Area -->
    <main ref="scrollContainer" class="flex-1 overflow-y-auto px-4 py-8 space-y-8 scroll-smooth custom-scrollbar">
      <div class="max-w-4xl mx-auto space-y-10">
        <div v-if="store.messages.length === 0"
          class="flex flex-col items-center justify-center py-20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div
            class="w-20 h-20 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6">
            <Bot class="w-10 h-10 text-indigo-400" />
          </div>
          <h2 class="text-2xl font-medium text-slate-100 mb-2">How can I help you today?</h2>
          <p class="text-slate-500 text-center max-w-sm">I am an autonomous agent capable of running bash commands and
            manipulating files in your workspace.</p>
        </div>

        <div v-for="(msg, idx) in store.messages" :key="idx"
          class="group animate-in fade-in slide-in-from-bottom-2 duration-300"
          :class="msg.role === 'user' ? 'flex flex-col items-end' : 'flex flex-col items-start'">
          <!-- User Message -->
          <template v-if="msg.role === 'user'">
            <div class="flex items-center gap-3 mb-2 px-2">
              <span class="text-xs font-semibold text-slate-500 uppercase tracking-tighter">You</span>
              <div class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                <User class="w-4 h-4 text-slate-300" />
              </div>
            </div>
            <div
              class="max-w-[85%] px-5 py-3 rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-900/10 leading-relaxed font-medium">
              {{ msg.content }}
            </div>
          </template>

          <!-- Assistant Message -->
          <template v-else>
            <div class="flex items-center gap-3 mb-2 px-2">
              <div
                class="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                <Bot class="w-4 h-4 text-indigo-400" />
              </div>
              <span class="text-xs font-semibold text-indigo-400 uppercase tracking-tighter">Mosaic Agent</span>
              <Loader2 v-if="msg.isStreaming" class="w-3 h-3 text-indigo-400 animate-spin" />
            </div>

            <div class="w-full max-w-[95%] space-y-4">
              <!-- Response Text -->
              <div
                class="px-5 py-4 rounded-2xl bg-white/[0.03] border border-white/5 text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">
                {{ msg.content }}
              </div>

              <!-- Events / Tool Activity -->
              <div v-if="msg.events && msg.events.length > 0" class="space-y-2">
                <div v-for="(event, eIdx) in msg.events" :key="eIdx" v-show="event.type !== 'token'"
                  class="flex items-start gap-4 px-4 py-3 rounded-xl bg-black/40 border border-white/10 animate-in zoom-in-95 duration-200">
                  <Terminal class="w-4 h-4 text-emerald-400 mt-1 flex-shrink-0" />
                  <div class="flex-1 min-w-0">
                    <p class="text-xs font-mono font-bold text-emerald-400 mb-1">
                      {{ event.type === 'tool_started' ? 'EXEC CALL' : event.type === 'tool_finished' ? 'EXEC DONE' :
                        'FINAL' }}
                    </p>
                    <p class="text-sm font-mono text-slate-400 truncate">
                      {{ event.type === 'tool_started' ? `${event.name}: ${event.parameters}` : event.type ===
                        'tool_finished' ? `${event.name} -> SUCCESS` : 'Reasoning complete' }}
                    </p>
                    <div v-if="event.type === 'tool_finished' && event.result"
                      class="mt-2 p-2 rounded bg-black/50 border border-white/5 text-[10px] font-mono text-slate-500 overflow-x-auto max-h-32">
                      {{ event.result }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </main>

    <!-- Footer Input -->
    <footer class="p-6 bg-[#0a0a0c]">
      <div class="max-w-4xl mx-auto relative group">
        <div
          class="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/50 to-purple-600/50 rounded-2xl blur opacity-25 group-focus-within:opacity-50 transition duration-500">
        </div>
        <div
          class="relative flex items-center bg-[#121216] border border-white/10 rounded-2xl shadow-2xl overflow-hidden px-4 py-2 transition-all duration-300 border-indigo-500/20">
          <textarea v-model="prompt" @keydown.enter.prevent="handleSend"
            placeholder="Describe the task you want me to perform..."
            class="flex-1 bg-transparent border-none focus:ring-0 text-slate-200 placeholder-slate-600 py-3 px-2 resize-none h-14 max-h-40 font-medium"
            :disabled="store.isProcessing"></textarea>

          <button @click="handleSend" :disabled="!prompt.trim() || store.isProcessing"
            class="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white flex items-center justify-center transition-all shadow-lg active:scale-95">
            <Loader2 v-if="store.isProcessing" class="w-5 h-5 animate-spin" />
            <Send v-else class="w-5 h-5" />
          </button>
        </div>
        <div class="mt-3 flex justify-between items-center px-2">
          <p class="text-[10px] font-mono text-slate-600 uppercase tracking-widest">Workspace: {{ store.currentWorkspace
            }}
          </p>
          <button @click="store.clearMemory"
            class="text-[10px] font-mono text-slate-600 hover:text-indigo-400 transition-colors uppercase tracking-widest">Clear
            session</button>
        </div>
      </div>
    </footer>
  </div>
</template>

<style>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.1);
}
</style>
