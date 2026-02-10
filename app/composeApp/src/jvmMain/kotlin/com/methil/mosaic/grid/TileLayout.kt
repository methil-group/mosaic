package com.methil.mosaic.grid

/**
 * Hyprland-style binary split tree layout engine.
 * Ported from the Tauri useTileLayout.ts composable.
 *
 * A layout is a binary tree where:
 * - Leaf nodes (TileNode) hold a tile ID
 * - Internal nodes (SplitNode) split space horizontally or vertically
 *   with a configurable ratio
 */

sealed class LayoutNode

data class TileNode(val id: String) : LayoutNode()

data class SplitNode(
    val direction: SplitDirection,
    val ratio: Float, // 0..1, how much space the first child takes
    val children: Pair<LayoutNode, LayoutNode>
) : LayoutNode()

enum class SplitDirection { HORIZONTAL, VERTICAL }

data class TilePosition(
    val id: String,
    val left: Float,
    val top: Float,
    val width: Float,
    val height: Float
)

data class ResizeHandle(
    val id: String,
    val direction: SplitDirection,
    val left: Float,
    val top: Float,
    val width: Float,
    val height: Float,
    val path: List<Int>,
    // The bounds of the split node that owns this handle
    val regionLeft: Float,
    val regionTop: Float,
    val regionWidth: Float,
    val regionHeight: Float
)

const val MAX_TILES = 6

// ---- Layout tree → positions ----

fun nodeToPositions(
    node: LayoutNode,
    left: Float, top: Float,
    width: Float, height: Float,
    gapX: Float, gapY: Float
): List<TilePosition> {
    return when (node) {
        is TileNode -> listOf(TilePosition(node.id, left, top, width, height))
        is SplitNode -> {
            val (first, second) = node.children
            if (node.direction == SplitDirection.HORIZONTAL) {
                val available = width - gapX
                val firstW = available * node.ratio
                val secondW = available * (1f - node.ratio)
                nodeToPositions(first, left, top, firstW, height, gapX, gapY) +
                    nodeToPositions(second, left + firstW + gapX, top, secondW, height, gapX, gapY)
            } else {
                val available = height - gapY
                val firstH = available * node.ratio
                val secondH = available * (1f - node.ratio)
                nodeToPositions(first, left, top, width, firstH, gapX, gapY) +
                    nodeToPositions(second, left, top + firstH + gapY, width, secondH, gapX, gapY)
            }
        }
    }
}

// ---- Resize handles ----

fun getResizeHandles(
    node: LayoutNode,
    left: Float, top: Float,
    width: Float, height: Float,
    path: List<Int>,
    gapX: Float, gapY: Float
): List<ResizeHandle> {
    if (node !is SplitNode) return emptyList()

    val handles = mutableListOf<ResizeHandle>()
    val handleId = if (path.isEmpty()) "handle-root" else "handle-${path.joinToString("-")}"

    if (node.direction == SplitDirection.HORIZONTAL) {
        val available = width - gapX
        val firstW = available * node.ratio
        val secondW = available * (1f - node.ratio)
        val dividerLeft = left + firstW + gapX / 2f

        handles += ResizeHandle(handleId, SplitDirection.HORIZONTAL, dividerLeft, top, gapX, height, path, left, top, width, height)
        handles += getResizeHandles(node.children.first, left, top, firstW, height, path + 0, gapX, gapY)
        handles += getResizeHandles(node.children.second, left + firstW + gapX, top, secondW, height, path + 1, gapX, gapY)
    } else {
        val available = height - gapY
        val firstH = available * node.ratio
        val secondH = available * (1f - node.ratio)
        val dividerTop = top + firstH + gapY / 2f

        handles += ResizeHandle(handleId, SplitDirection.VERTICAL, left, dividerTop, width, gapY, path, left, top, width, height)
        handles += getResizeHandles(node.children.first, left, top, width, firstH, path + 0, gapX, gapY)
        handles += getResizeHandles(node.children.second, left, top + firstH + gapY, width, secondH, path + 1, gapX, gapY)
    }
    return handles
}

// ---- Auto layout builder ----

fun buildAutoLayout(ids: List<String>): LayoutNode? {
    val limited = ids.take(MAX_TILES)
    return when (limited.size) {
        0 -> null
        1 -> TileNode(limited[0])
        2 -> SplitNode(
            SplitDirection.HORIZONTAL, 0.5f,
            TileNode(limited[0]) to TileNode(limited[1])
        )
        3 -> SplitNode(
            SplitDirection.HORIZONTAL, 0.5f,
            TileNode(limited[0]) to SplitNode(
                SplitDirection.VERTICAL, 0.5f,
                TileNode(limited[1]) to TileNode(limited[2])
            )
        )
        4 -> SplitNode(
            SplitDirection.HORIZONTAL, 0.5f,
            SplitNode(
                SplitDirection.VERTICAL, 0.5f,
                TileNode(limited[0]) to TileNode(limited[3])
            ) to SplitNode(
                SplitDirection.VERTICAL, 0.5f,
                TileNode(limited[1]) to TileNode(limited[2])
            )
        )
        5 -> SplitNode(
            SplitDirection.HORIZONTAL, 0.33f,
            SplitNode(
                SplitDirection.VERTICAL, 0.5f,
                TileNode(limited[0]) to TileNode(limited[3])
            ) to SplitNode(
                SplitDirection.HORIZONTAL, 0.5f,
                SplitNode(
                    SplitDirection.VERTICAL, 0.5f,
                    TileNode(limited[1]) to TileNode(limited[4])
                ) to TileNode(limited[2])
            )
        )
        else -> SplitNode(
            SplitDirection.HORIZONTAL, 0.33f,
            SplitNode(
                SplitDirection.VERTICAL, 0.5f,
                TileNode(limited[0]) to TileNode(limited[3])
            ) to SplitNode(
                SplitDirection.HORIZONTAL, 0.5f,
                SplitNode(
                    SplitDirection.VERTICAL, 0.5f,
                    TileNode(limited[1]) to TileNode(limited[4])
                ) to SplitNode(
                    SplitDirection.VERTICAL, 0.5f,
                    TileNode(limited[2]) to TileNode(limited[5])
                )
            )
        )
    }
}

// ---- Tree mutation helpers ----

fun updateRatioAtPath(node: LayoutNode, path: List<Int>, newRatio: Float): LayoutNode {
    val clamped = newRatio.coerceIn(0.1f, 0.9f)
    if (node !is SplitNode) return node
    if (path.isEmpty()) return node.copy(ratio = clamped)

    val idx = path.first()
    val rest = path.drop(1)
    val newChildren = if (idx == 0) {
        updateRatioAtPath(node.children.first, rest, newRatio) to node.children.second
    } else {
        node.children.first to updateRatioAtPath(node.children.second, rest, newRatio)
    }
    return node.copy(children = newChildren)
}

fun swapTileIds(node: LayoutNode, id1: String, id2: String): LayoutNode {
    return when (node) {
        is TileNode -> when (node.id) {
            id1 -> node.copy(id = id2)
            id2 -> node.copy(id = id1)
            else -> node
        }
        is SplitNode -> node.copy(
            children = swapTileIds(node.children.first, id1, id2) to
                swapTileIds(node.children.second, id1, id2)
        )
    }
}
