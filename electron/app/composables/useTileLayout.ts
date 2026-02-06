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

export interface LayoutOptions {
  margin?: number
  gap?: number
}

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
const MAX_AGENTS = 6 // Maximum agents visible on screen

/**
 * Convert a layout tree to tile positions (percentages)
 */
export function nodeToPositions(
  node: LayoutNode,
  left: number,
  top: number,
  width: number,
  height: number,
  gap: number = GAP
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
    // Math: Subtract the gap from the available width, split the remainder by ratio.
    const availableContentWidth = width - gap
    const firstWidth = availableContentWidth * ratio
    const secondWidth = availableContentWidth * (1 - ratio)
    
    return [
      ...nodeToPositions(children[0], left, top, firstWidth, height, gap),
      ...nodeToPositions(children[1], left + firstWidth + gap, top, secondWidth, height, gap)
    ]
  } else {
    // Same for vertical
    const availableContentHeight = height - gap
    const firstHeight = availableContentHeight * ratio
    const secondHeight = availableContentHeight * (1 - ratio)
    
    return [
      ...nodeToPositions(children[0], left, top, width, firstHeight, gap),
      ...nodeToPositions(children[1], left, top + firstHeight + gap, width, secondHeight, gap)
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

  if (ids.length === 4) {
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
            { type: 'tile', id: ids[3]! }
          ]
        },
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

  if (ids.length === 5) {
    return {
      type: 'split',
      direction: 'horizontal',
      ratio: 0.33,
      children: [
        {
          type: 'split',
          direction: 'vertical',
          ratio: 0.5,
          children: [
            { type: 'tile', id: ids[0]! },
            { type: 'tile', id: ids[3]! }
          ]
        },
        {
          type: 'split',
          direction: 'horizontal',
          ratio: 0.5,
          children: [
            {
              type: 'split',
              direction: 'vertical',
              ratio: 0.5,
              children: [
                { type: 'tile', id: ids[1]! },
                { type: 'tile', id: ids[4]! }
              ]
            },
            { type: 'tile', id: ids[2]! }
          ]
        }
      ]
    }
  }

  // 6 agents: 3x2 grid
  return {
    type: 'split',
    direction: 'horizontal',
    ratio: 0.33,
    children: [
      {
        type: 'split',
        direction: 'vertical',
        ratio: 0.5,
        children: [
          { type: 'tile', id: ids[0]! },
          { type: 'tile', id: ids[3]! }
        ]
      },
      {
        type: 'split',
        direction: 'horizontal',
        ratio: 0.5,
        children: [
          {
            type: 'split',
            direction: 'vertical',
            ratio: 0.5,
            children: [
              { type: 'tile', id: ids[1]! },
              { type: 'tile', id: ids[4]! }
            ]
          },
          {
            type: 'split',
            direction: 'vertical',
            ratio: 0.5,
            children: [
              { type: 'tile', id: ids[2]! },
              { type: 'tile', id: ids[5]! }
            ]
          }
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
 * Swap IDs of two tiles in the layout tree
 */
function findAndSwapIds(node: LayoutNode, id1: string, id2: string): LayoutNode {
  if (node.type === 'tile') {
    if (node.id === id1) return { ...node, id: id2 }
    if (node.id === id2) return { ...node, id: id1 }
    return node
  }
  return {
    ...node,
    children: [
      findAndSwapIds(node.children[0], id1, id2),
      findAndSwapIds(node.children[1], id1, id2)
    ]
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
export function useTileLayout(
  visibleIds: Ref<string[]> | ComputedRef<string[]>, 
  options: LayoutOptions = {}) {
    
  const store = useAgentStore()
  
  const currentMargin = options.margin !== undefined ? options.margin : MARGIN
  const currentGap = options.gap !== undefined ? options.gap : GAP

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
    // Add margin offset
    const usableSize = 100 - currentMargin * 2
    return nodeToPositions(layoutTree.value, currentMargin, currentMargin, usableSize, usableSize, currentGap)
  })

  const resizeHandles = computed<ResizeHandle[]>(() => {
    if (!layoutTree.value) return []
    const usableSize = 100 - currentMargin * 2
    return getResizeHandles(layoutTree.value, currentMargin, currentMargin, usableSize, usableSize)
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

  const swapTiles = (id1: string, id2: string) => {
    if (id1 === id2) return
    const currentLayout = getStoredLayout() ?? buildAutoTileLayout(limitedIds.value)
    if (!currentLayout) return
    
    const updated = findAndSwapIds(currentLayout, id1, id2)
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
    updateSplitRatio,
    swapTiles
  }
}
