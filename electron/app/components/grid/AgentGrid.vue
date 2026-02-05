<template>
    <div ref="gridContainer" v-if="limitedIds.length > 0" class="flex-1 w-full h-full overflow-hidden relative" :class="{
        'pointer-events-none': isPreview,
        'bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px]': !isPreview
    }">

        <!-- Tiles with absolute positioning -->
        <TransitionGroup name="tile">
            <div v-for="id in limitedIds" :key="id" class="tile-item" :style="getTileStyle(id, isDragging)">
                <AgentInstance :instance-id="id" :chromeless="isPreview" class="w-full h-full" />
            </div>
        </TransitionGroup>

        <!-- Resize Handles (Only if not preview) -->
        <template v-if="!isPreview">
            <div v-for="handle in resizeHandles" :key="handle.id" class="resize-handle z-50" :class="{
                'resize-handle-active': isDragging && activeHandle?.id === handle.id,
                'resize-handle-horizontal': handle.direction === 'horizontal',
                'resize-handle-vertical': handle.direction === 'vertical'
            }" :style="getHandleStyle(handle)" @mousedown="startDrag(handle, $event)">
                <div class="resize-handle-visual"
                    :class="handle.direction === 'horizontal' ? 'w-1 h-full' : 'w-full h-1'" />
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAgentStore } from '~/stores/agent'
import AgentInstance from '../agent/AgentInstance.vue'
import { useTileLayout, type ResizeHandle } from '~/composables/useTileLayout'

const props = defineProps<{
    workspaceId: string
    isPreview?: boolean
}>()

const store = useAgentStore()
const gridContainer = ref<HTMLElement | null>(null)

const visibleInstances = computed(() => {
    return store.instanceIds.filter(id => {
        const instance = store.instances[id]
        if (!instance || !instance.isVisible) return false
        if (instance.workspaceId !== props.workspaceId) return false
        return true
    })
})

const { tilePositions, resizeHandles, limitedIds, getTileStyle, getHandleStyle, updateSplitRatio } = useTileLayout(visibleInstances, {
    margin: props.isPreview ? 0 : undefined,
    gap: props.isPreview ? 0 : undefined
})

// Drag state managed locally
const isDragging = ref(false)
const activeHandle = ref<ResizeHandle | null>(null)

const startDrag = (handle: ResizeHandle, event: MouseEvent) => {
    if (props.isPreview) return

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

<style scoped>
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
</style>
