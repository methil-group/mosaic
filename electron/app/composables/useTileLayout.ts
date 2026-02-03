import { ref, computed, type Ref, type ComputedRef } from 'vue'

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

export interface GridPosition {
  gridColumn: string
  gridRow: string
}

export interface TilePosition {
  id: string
  column: number
  row: number
  colSpan: number
  rowSpan: number
}

/**
 * Convert a layout tree to grid positions
 * Uses a 12x12 grid for fine-grained positioning
 */
const GRID_SIZE = 12

function nodeToPositions(
  node: LayoutNode,
  startCol: number,
  startRow: number,
  colSpan: number,
  rowSpan: number
): TilePosition[] {
  if (node.type === 'tile') {
    return [{
      id: node.id,
      column: startCol,
      row: startRow,
      colSpan,
      rowSpan
    }]
  }

  // Split node
  const { direction, ratio, children } = node
  const [first, second] = children

  if (direction === 'horizontal') {
    // Side by side
    const firstCols = Math.round(colSpan * ratio)
    const secondCols = colSpan - firstCols
    return [
      ...nodeToPositions(first, startCol, startRow, firstCols, rowSpan),
      ...nodeToPositions(second, startCol + firstCols, startRow, secondCols, rowSpan)
    ]
  } else {
    // Stacked vertically
    const firstRows = Math.round(rowSpan * ratio)
    const secondRows = rowSpan - firstRows
    return [
      ...nodeToPositions(first, startCol, startRow, colSpan, firstRows),
      ...nodeToPositions(second, startCol, startRow + firstRows, colSpan, secondRows)
    ]
  }
}

/**
 * Build a default layout tree from a list of agent IDs
 * Uses Hyprland-style autotiling (alternating split direction)
 */
export function buildAutoTileLayout(ids: string[]): LayoutNode | null {
  if (ids.length === 0) return null
  if (ids.length === 1) return { type: 'tile', id: ids[0]! }

  // For 2 items: horizontal split
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

  // For 3 items: first takes left half, other two stack on right
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

  // For 4+ items: 2x2 grid, then stack extras
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

  // For 5+ items: master-stack layout
  // First item is master (left half), rest stack on right
  const masterNode: TileNode = { type: 'tile', id: ids[0]! }
  const stackIds = ids.slice(1)
  
  // Build vertical stack for remaining items
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
 * Vue composable for managing tile layout
 */
export function useTileLayout(visibleIds: Ref<string[]> | ComputedRef<string[]>) {
  const layoutTree = computed<LayoutNode | null>(() => {
    return buildAutoTileLayout(visibleIds.value)
  })

  const tilePositions = computed<TilePosition[]>(() => {
    if (!layoutTree.value) return []
    return nodeToPositions(layoutTree.value, 1, 1, GRID_SIZE, GRID_SIZE)
  })

  const gridStyle = computed(() => ({
    display: 'grid',
    gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
    gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
    gap: '8px',
    height: '100%',
    width: '100%'
  }))

  const getTileStyle = (id: string) => {
    const pos = tilePositions.value.find(p => p.id === id)
    if (!pos) return {}
    return {
      gridColumn: `${pos.column} / span ${pos.colSpan}`,
      gridRow: `${pos.row} / span ${pos.rowSpan}`
    }
  }

  return {
    layoutTree,
    tilePositions,
    gridStyle,
    getTileStyle
  }
}
