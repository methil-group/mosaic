import { computed, watch, type Ref, type ComputedRef } from 'vue'
import { useAgentStore } from '~/stores/agent'

/**
 * Layout tree node types for Hyprland-style tiling
 */
export type SplitDirection = 'horizontal' | 'vertical'

export interface TileNode {
  type: 'tile'
  id: string // Agent instance ID
}

export interface SplitNode {
  type: 'split'
  direction: SplitDirection
  ratio: number // 0-1, how much space the first child takes
  children: [LayoutNode, LayoutNode]
}

export type LayoutNode = TileNode | SplitNode

/**
 * Tile position as percentages for smooth animation
 */
export interface TilePosition {
  id: string
  left: number   // percentage
  top: number    // percentage
  width: number  // percentage
  height: number // percentage
}

/**
 * Resize handle position info
 */
export interface ResizeHandle {
  id: string
  direction: SplitDirection
  // Position as percentages (0-100)
  left: number
  top: number
  width: number
  height: number
  // Path to the split node in the tree (for updating ratio)
  path: number[]
}

const GAP = 1 // Gap between tiles as percentage
const MARGIN = 1.5 // Margin from container edges as percentage
const MAX_AGENTS = 4 // Maximum agents visible on screen

/**
 * Convert a layout tree to tile positions (percentages)
 */
function nodeToPositions(
  node: LayoutNode,
  left: number,
  top: number,
  width: number,
  height: number
): TilePosition[] {
  if (node.type === 'tile') {
    return [{
      id: node.id,
      left,
      top,
      width,
      height
    }]
  }

  const { direction, ratio, children } = node

  if (direction === 'horizontal') {
    const firstWidth = width * ratio - GAP / 2
    const secondWidth = width * (1 - ratio) - GAP / 2
    return [
      ...nodeToPositions(children[0], left, top, firstWidth, height),
      ...nodeToPositions(children[1], left + width * ratio + GAP / 2, top, secondWidth, height)
    ]
  } else {
    const firstHeight = height * ratio - GAP / 2
    const secondHeight = height * (1 - ratio) - GAP / 2
    return [
      ...nodeToPositions(children[0], left, top, width, firstHeight),
      ...nodeToPositions(children[1], left, top + height * ratio + GAP / 2, width, secondHeight)
    ]
  }
}

/**
 * Extract resize handle positions from layout tree
 */
function getResizeHandles(
  node: LayoutNode,
  left: number,
  top: number,
  width: number,
  height: number,
  path: number[] = []
): ResizeHandle[] {
  if (node.type === 'tile') return []

  const { direction, ratio, children } = node
  const handles: ResizeHandle[] = []
  const handleId = path.length === 0 ? 'handle-root' : `handle-${path.join('-')}`

  if (direction === 'horizontal') {
    const dividerLeft = left + width * ratio
    handles.push({
      id: handleId,
      direction: 'horizontal',
      left: dividerLeft - 0.5,
      top: top,
      width: 1,
      height: height,
      path: [...path]
    })
    const firstWidth = width * ratio
    const secondWidth = width * (1 - ratio)
    handles.push(
      ...getResizeHandles(children[0], left, top, firstWidth, height, [...path, 0]),
      ...getResizeHandles(children[1], left + firstWidth, top, secondWidth, height, [...path, 1])
    )
  } else {
    const dividerTop = top + height * ratio
    handles.push({
      id: handleId,
      direction: 'vertical',
      left: left,
      top: dividerTop - 0.5,
      width: width,
      height: 1,
      path: [...path]
    })
    const firstHeight = height * ratio
    const secondHeight = height * (1 - ratio)
    handles.push(
      ...getResizeHandles(children[0], left, top, width, firstHeight, [...path, 0]),
      ...getResizeHandles(children[1], left, top + firstHeight, width, secondHeight, [...path, 1])
    )
  }

  return handles
}

/**
 * Build a default layout tree from a list of agent IDs
 */
export function buildAutoTileLayout(ids: string[]): LayoutNode | null {
  if (ids.length === 0) return null
  if (ids.length === 1) return { type: 'tile', id: ids[0]! }

  if (ids.length === 2) {
    return {
      type: 'split',
      direction: 'horizontal',
      ratio: 0.5,
      children: [
        { type: 'tile', id: ids[0]! },
        { type: 'tile', id: ids[1]! }
      ]
    }
  }

  if (ids.length === 3) {
    return {
      type: 'split',
      direction: 'horizontal',
      ratio: 0.5,
      children: [
        { type: 'tile', id: ids[0]! },
        {
          type: 'split',
          direction: 'vertical',
          ratio: 0.5,
          children: [
            { type: 'tile', id: ids[1]! },
            { type: 'tile', id: ids[2]! }
          ]
        }
      ]
    }
  }

  // 4 agents: 2x2 grid
  return {
    type: 'split',
    direction: 'horizontal',
    ratio: 0.5,
    children: [
      {
        type: 'split',
        direction: 'vertical',
        ratio: 0.5,
        children: [
          { type: 'tile', id: ids[0]! },
          { type: 'tile', id: ids[2]! }
        ]
      },
      {
        type: 'split',
        direction: 'vertical',
        ratio: 0.5,
        children: [
          { type: 'tile', id: ids[1]! },
          { type: 'tile', id: ids[3]! }
        ]
      }
    ]
  }
}

/**
 * Deep clone a layout node
 */
function cloneLayoutNode(node: LayoutNode): LayoutNode {
  if (node.type === 'tile') {
    return { ...node }
  }
  return {
    ...node,
    children: [cloneLayoutNode(node.children[0]), cloneLayoutNode(node.children[1])]
  }
}

/**
 * Update a split ratio at a given path in the tree
 */
function updateRatioAtPath(node: LayoutNode, path: number[], newRatio: number): LayoutNode {
  const clampedRatio = Math.max(0.1, Math.min(0.95, newRatio))
  
  if (path.length === 0 && node.type === 'split') {
    return { ...node, ratio: clampedRatio }
  }
  
  if (node.type === 'tile') return node
  
  const [nextIndex, ...restPath] = path
  if (nextIndex === undefined) {
    return { ...node, ratio: clampedRatio }
  }
  
  const newChildren: [LayoutNode, LayoutNode] = [
    nextIndex === 0 ? updateRatioAtPath(node.children[0], restPath, newRatio) : node.children[0],
    nextIndex === 1 ? updateRatioAtPath(node.children[1], restPath, newRatio) : node.children[1]
  ]
  
  return { ...node, children: newChildren }
}

/**
 * Vue composable for managing tile layout with resize support
 * Uses Pinia store for persistence across navigation
 */
export function useTileLayout(visibleIds: Ref<string[]> | ComputedRef<string[]>) {
  const store = useAgentStore()
  const isDragging = computed(() => false) // Will be managed locally in component
  
  const getIdsHash = (ids: string[]) => ids.slice(0, MAX_AGENTS).join(',')
  
  // Limit to MAX_AGENTS
  const limitedIds = computed(() => visibleIds.value.slice(0, MAX_AGENTS))
  const hiddenCount = computed(() => Math.max(0, visibleIds.value.length - MAX_AGENTS))
  
  // Get custom layout from store
  const getStoredLayout = (): LayoutNode | null => {
    const hash = getIdsHash(limitedIds.value)
    const stored = store.customLayouts[hash]
    return stored ? (stored as LayoutNode) : null
  }
  
  // Save layout to store
  const saveLayout = (layout: LayoutNode) => {
    const hash = getIdsHash(limitedIds.value)
    store.customLayouts[hash] = layout
  }
  
  const layoutTree = computed<LayoutNode | null>(() => {
    const stored = getStoredLayout()
    if (stored) return stored
    return buildAutoTileLayout(limitedIds.value)
  })

  const tilePositions = computed<TilePosition[]>(() => {
    if (!layoutTree.value) return []
    // Add margin offset: start at MARGIN%, use (100 - 2*MARGIN)% of container
    const usableSize = 100 - MARGIN * 2
    return nodeToPositions(layoutTree.value, MARGIN, MARGIN, usableSize, usableSize)
  })

  const resizeHandles = computed<ResizeHandle[]>(() => {
    if (!layoutTree.value) return []
    const usableSize = 100 - MARGIN * 2
    return getResizeHandles(layoutTree.value, MARGIN, MARGIN, usableSize, usableSize)
  })

  const getTileStyle = (id: string, dragging: boolean = false) => {
    const pos = tilePositions.value.find(p => p.id === id)
    if (!pos) return {}
    return {
      position: 'absolute' as const,
      left: `${pos.left}%`,
      top: `${pos.top}%`,
      width: `${pos.width}%`,
      height: `${pos.height}%`,
      transition: dragging ? 'none' : 'left 0.25s ease-out, top 0.25s ease-out, width 0.25s ease-out, height 0.25s ease-out'
    }
  }

  const getHandleStyle = (handle: ResizeHandle) => {
    const hitPadding = 8
    if (handle.direction === 'horizontal') {
      return {
        position: 'absolute' as const,
        left: `${handle.left}%`,
        top: `${handle.top}%`,
        width: `${hitPadding * 2}px`,
        height: `${handle.height}%`,
        transform: 'translateX(-50%)',
        cursor: 'col-resize'
      }
    } else {
      return {
        position: 'absolute' as const,
        left: `${handle.left}%`,
        top: `${handle.top}%`,
        width: `${handle.width}%`,
        height: `${hitPadding * 2}px`,
        transform: 'translateY(-50%)',
        cursor: 'row-resize'
      }
    }
  }

  const updateSplitRatio = (path: number[], newRatio: number) => {
    const currentLayout = getStoredLayout() ?? buildAutoTileLayout(limitedIds.value)
    if (!currentLayout) return
    
    const cloned = cloneLayoutNode(currentLayout)
    const updated = updateRatioAtPath(cloned, path, newRatio)
    saveLayout(updated)
  }

  return {
    layoutTree,
    tilePositions,
    resizeHandles,
    limitedIds,
    hiddenCount,
    getTileStyle,
    getHandleStyle,
    updateSplitRatio
  }
}
