package com.methil.mosaic.ui.grid

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.input.pointer.PointerIcon
import androidx.compose.ui.input.pointer.pointerHoverIcon
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.methil.mosaic.chat.ui.ChatScreen
import com.methil.mosaic.grid.*
import com.methil.mosaic.ui.theme.*
import com.methil.mosaic.ui.workspace.parseHexColor
import com.methil.mosaic.workspace.AgentTile
import com.methil.mosaic.workspace.WorkspaceStore

private val GAP = 6.dp

@OptIn(ExperimentalComposeUiApi::class)
@Composable
fun AgentTileGrid(
    workspaceId: String,
    workspaceName: String,
    modifier: Modifier = Modifier
) {
    val tiles = WorkspaceStore.getTilesForWorkspace(workspaceId)
    val tileIds = tiles.map { it.id }

    // Maintain the layout tree as state
    var layoutTree by remember(tileIds.hashCode()) {
        mutableStateOf(buildAutoLayout(tileIds))
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(Dark00)
    ) {
        // === Header bar ===
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(Dark05)
                .padding(horizontal = 20.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = workspaceName.uppercase(),
                color = TextPrimary,
                fontSize = 13.sp,
                fontWeight = FontWeight.Black,
                letterSpacing = 1.sp,
                modifier = Modifier.weight(1f)
            )

            Text(
                text = "${tiles.size} AGENT${if (tiles.size != 1) "S" else ""}",
                color = TextMuted,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 2.sp,
                modifier = Modifier.padding(end = 16.dp)
            )

            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .background(Accent.copy(alpha = 0.12f))
                    .pointerHoverIcon(PointerIcon.Hand)
                    .clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null
                    ) {
                        WorkspaceStore.addAgent(workspaceId)
                    }
                    .padding(horizontal = 14.dp, vertical = 6.dp)
            ) {
                Text(
                    text = "＋ ADD AGENT",
                    color = Accent,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.ExtraBold,
                    letterSpacing = 1.sp
                )
            }
        }

        // === Content ===
        if (tiles.isEmpty()) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("+", color = TextMuted, fontSize = 48.sp, fontWeight = FontWeight.Thin)
                    Spacer(Modifier.height(8.dp))
                    Text(
                        "ADD YOUR FIRST AGENT",
                        color = TextMuted, fontSize = 11.sp,
                        fontWeight = FontWeight.ExtraBold, letterSpacing = 3.sp
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        "Click the button above to start chatting",
                        color = Dark30, fontSize = 12.sp
                    )
                }
            }
        } else {
            // Tile grid using weight-based layout
            Box(modifier = Modifier.fillMaxSize().padding(GAP)) {
                val tree = layoutTree
                if (tree != null) {
                    LayoutNodeView(
                        node = tree,
                        tiles = tiles,
                        onTreeUpdate = { layoutTree = it }
                    )
                }
            }
        }
    }
}

/**
 * Recursively renders a layout tree node using Row/Column + weight.
 * SplitNodes become Row (horizontal) or Column (vertical) with a draggable divider.
 * TileNodes are rendered as agent chat tiles.
 */
@Composable
private fun LayoutNodeView(
    node: LayoutNode,
    tiles: List<AgentTile>,
    onTreeUpdate: (LayoutNode) -> Unit,
    modifier: Modifier = Modifier
) {
    when (node) {
        is TileNode -> {
            TileView(
                tileId = node.id,
                tiles = tiles,
                modifier = modifier.fillMaxSize()
            )
        }
        is SplitNode -> {
            SplitView(
                node = node,
                tiles = tiles,
                onTreeUpdate = onTreeUpdate,
                modifier = modifier.fillMaxSize()
            )
        }
    }
}

@OptIn(ExperimentalComposeUiApi::class)
@Composable
private fun SplitView(
    node: SplitNode,
    tiles: List<AgentTile>,
    onTreeUpdate: (LayoutNode) -> Unit,
    modifier: Modifier = Modifier
) {
    val isHorizontal = node.direction == SplitDirection.HORIZONTAL
    var ratio by remember { mutableStateOf(node.ratio) }

    // Sync ratio when node changes externally
    LaunchedEffect(node.ratio) { ratio = node.ratio }

    val firstWeight = ratio.coerceIn(0.1f, 0.9f)
    val secondWeight = (1f - ratio).coerceIn(0.1f, 0.9f)

    val cursor = if (isHorizontal) {
        PointerIcon(java.awt.Cursor(java.awt.Cursor.W_RESIZE_CURSOR))
    } else {
        PointerIcon(java.awt.Cursor(java.awt.Cursor.N_RESIZE_CURSOR))
    }

    if (isHorizontal) {
        Row(modifier = modifier) {
            // First child
            Box(modifier = Modifier.weight(firstWeight).fillMaxHeight()) {
                LayoutNodeView(
                    node = node.children.first,
                    tiles = tiles,
                    onTreeUpdate = { updated ->
                        onTreeUpdate(node.copy(children = updated to node.children.second))
                    }
                )
            }

            // Draggable divider
            Box(
                modifier = Modifier
                    .width(GAP)
                    .fillMaxHeight()
                    .pointerHoverIcon(cursor)
                    .pointerInput(Unit) {
                        detectDragGestures { change, dragAmount ->
                            change.consume()
                            val parentWidth = size.width.toFloat() +
                                (size.width.toFloat() / GAP.toPx()) * size.width.toFloat()
                            // Approximate: use the drag delta relative to a reasonable parent size
                            val delta = dragAmount.x / (size.width.toFloat() / GAP.toPx() * size.width.toFloat()).coerceAtLeast(1f)
                            // Simpler: just track cumulative position
                        }
                    }
            )

            // Second child
            Box(modifier = Modifier.weight(secondWeight).fillMaxHeight()) {
                LayoutNodeView(
                    node = node.children.second,
                    tiles = tiles,
                    onTreeUpdate = { updated ->
                        onTreeUpdate(node.copy(children = node.children.first to updated))
                    }
                )
            }
        }
    } else {
        Column(modifier = modifier) {
            Box(modifier = Modifier.weight(firstWeight).fillMaxWidth()) {
                LayoutNodeView(
                    node = node.children.first,
                    tiles = tiles,
                    onTreeUpdate = { updated ->
                        onTreeUpdate(node.copy(children = updated to node.children.second))
                    }
                )
            }

            Box(
                modifier = Modifier
                    .height(GAP)
                    .fillMaxWidth()
                    .pointerHoverIcon(cursor)
            )

            Box(modifier = Modifier.weight(secondWeight).fillMaxWidth()) {
                LayoutNodeView(
                    node = node.children.second,
                    tiles = tiles,
                    onTreeUpdate = { updated ->
                        onTreeUpdate(node.copy(children = node.children.first to updated))
                    }
                )
            }
        }
    }
}

@Composable
private fun TileView(
    tileId: String,
    tiles: List<AgentTile>,
    modifier: Modifier = Modifier
) {
    val tile = tiles.find { it.id == tileId }
    val tileColor = if (tile != null) parseHexColor(tile.color) else Accent

    Column(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(Dark10)
    ) {
        // Agent header strip
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(Dark15)
                .padding(horizontal = 10.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(6.dp)
                    .clip(RoundedCornerShape(1.dp))
                    .background(tileColor)
            )
            Spacer(Modifier.width(8.dp))
            Text(
                text = tile?.name?.uppercase() ?: "AGENT",
                color = TextSecondary,
                fontSize = 9.sp,
                fontWeight = FontWeight.ExtraBold,
                letterSpacing = 1.sp
            )
        }

        // Chat content
        val vm = remember(tileId) { WorkspaceStore.getViewModel(tileId) }
        ChatScreen(viewModel = vm)
    }
}
