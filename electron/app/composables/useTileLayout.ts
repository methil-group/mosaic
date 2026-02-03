import { ref, computed, watch, type Ref, type ComputedRef } from 'vue'

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

const GAP = 0.5 // Gap as percentage

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
    // Side by side
    const firstWidth = width * ratio - GAP / 2
    const secondWidth = width * (1 - ratio) - GAP / 2
    return [
      ...nodeToPositions(children[0], left, top, firstWidth, height),
      ...nodeToPositions(children[1], left + width * ratio + GAP / 2, top, secondWidth, height)
    ]
  } else {
    // Stacked vertically
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
    // Vertical divider line
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
    // Recurse into children
    const firstWidth = width * ratio
    const secondWidth = width * (1 - ratio)
    handles.push(
      ...getResizeHandles(children[0], left, top, firstWidth, height, [...path, 0]),
      ...getResizeHandles(children[1], left + firstWidth, top, secondWidth, height, [...path, 1])
    )
  } else {
    // Horizontal divider line
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
    // Recurse into children
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

  // 5+ items: master-stack layout
  const masterNode: TileNode = { type: 'tile', id: ids[0]! }
  const stackIds = ids.slice(1)
  
  const buildStack = (stackIds: string[]): LayoutNode => {
    if (stackIds.length === 1) return { type: 'tile', id: stackIds[0]! }
    return {
      type: 'split',
      direction: 'vertical',
      ratio: 1 / stackIds.length,
      children: [
        { type: 'tile', id: stackIds[0]! },
        buildStack(stackIds.slice(1))
      ]
    }
  }

  return {
    type: 'split',
    direction: 'horizontal',
    ratio: 0.5,
    children: [masterNode, buildStack(stackIds)]
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
  const clampedRatio = Math.max(0.15, Math.min(0.85, newRatio))
  
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
 */
export function useTileLayout(visibleIds: Ref<string[]> | ComputedRef<string[]>) {
  // Store mutable layout tree
  const customLayout = ref<LayoutNode | null>(null)
  const lastIdsHash = ref<string>('')
  const isDragging = ref(false)
  
  const getIdsHash = (ids: string[]) => ids.join(',')
  
  // Reset custom layout when visible IDs change
  watch(visibleIds, (newIds) => {
    const newHash = getIdsHash(newIds)
    if (newHash !== lastIdsHash.value) {
      lastIdsHash.value = newHash
      customLayout.value = null
    }
  }, { immediate: true })
  
  const layoutTree = computed<LayoutNode | null>(() => {
    if (customLayout.value) {
      return customLayout.value
    }
    return buildAutoTileLayout(visibleIds.value)
  })

  const tilePositions = computed<TilePosition[]>(() => {
    if (!layoutTree.value) return []
    return nodeToPositions(layoutTree.value, 0, 0, 100, 100)
  })

  const resizeHandles = computed<ResizeHandle[]>(() => {
    if (!layoutTree.value) return []
    return getResizeHandles(layoutTree.value, 0, 0, 100, 100)
  })

  const getTileStyle = (id: string) => {
    const pos = tilePositions.value.find(p => p.id === id)
    if (!pos) return {}
    return {
      position: 'absolute' as const,
      left: `${pos.left}%`,
      top: `${pos.top}%`,
      width: `${pos.width}%`,
      height: `${pos.height}%`,
      // No transition during drag for instant feedback
      transition: isDragging.value ? 'none' : 'left 0.25s ease-out, top 0.25s ease-out, width 0.25s ease-out, height 0.25s ease-out'
    }
  }

  const getHandleStyle = (handle: ResizeHandle) => {
    const hitPadding = 8 // px for hit area
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
    const currentLayout = customLayout.value ?? buildAutoTileLayout(visibleIds.value)
    if (!currentLayout) return
    
    const cloned = cloneLayoutNode(currentLayout)
    const updated = updateRatioAtPath(cloned, path, newRatio)
    customLayout.value = updated
  }

  const setDragging = (value: boolean) => {
    isDragging.value = value
  }

  return {
    layoutTree,
    tilePositions,
    resizeHandles,
    isDragging,
    getTileStyle,
    getHandleStyle,
    updateSplitRatio,
    setDragging
  }
}
