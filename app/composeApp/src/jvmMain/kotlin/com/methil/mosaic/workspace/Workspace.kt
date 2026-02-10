package com.methil.mosaic.workspace

import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import com.methil.mosaic.chat.viewmodel.ChatViewModel
import java.util.UUID

data class Workspace(
    val id: String,
    val name: String,
    val path: String = "",
    val color: String = "#6C8FFF"
)

data class AgentTile(
    val id: String,
    val name: String,
    val color: String = "#6C8FFF"
)

/**
 * In-memory workspace store.
 * Manages workspace list, active workspace, agent tiles, and their ViewModels.
 */
object WorkspaceStore {
    val workspaces = mutableStateMapOf<String, Workspace>()
    val workspaceIds = mutableStateListOf<String>()
    var activeWorkspaceId = mutableStateOf<String?>(null)

    // Agent tiles per workspace (reactive lists)
    private val _workspaceTiles = mutableStateMapOf<String, MutableList<AgentTile>>()

    // Persistent ChatViewModels keyed by tile ID
    val agentViewModels = mutableMapOf<String, ChatViewModel>()

    private val COLORS = listOf(
        "#6C8FFF", "#EC4899", "#F59E0B", "#10B981",
        "#3B82F6", "#8B5CF6", "#EF4444", "#14B8A6"
    )

    private var _tileCounter = 0

    init {
        val defaultWs = Workspace(
            id = "default",
            name = "Default",
            path = "",
            color = COLORS[0]
        )
        workspaces["default"] = defaultWs
        workspaceIds.add("default")
        _workspaceTiles["default"] = mutableStateListOf()
    }

    fun createWorkspace(name: String, path: String = ""): Workspace {
        val id = UUID.randomUUID().toString()
        val color = COLORS[workspaceIds.size % COLORS.size]
        val ws = Workspace(id = id, name = name, path = path, color = color)
        workspaces[id] = ws
        workspaceIds.add(id)
        _workspaceTiles[id] = mutableStateListOf()
        return ws
    }

    fun removeWorkspace(id: String) {
        if (id == "default") return
        // Clean up VMs for tiles in this workspace
        _workspaceTiles[id]?.forEach { tile ->
            agentViewModels.remove(tile.id)
        }
        workspaces.remove(id)
        workspaceIds.remove(id)
        _workspaceTiles.remove(id)
        if (activeWorkspaceId.value == id) {
            activeWorkspaceId.value = workspaceIds.firstOrNull()
        }
    }

    fun addAgent(workspaceId: String): AgentTile {
        _tileCounter++
        val tileId = UUID.randomUUID().toString()
        val color = COLORS[_tileCounter % COLORS.size]
        val tile = AgentTile(
            id = tileId,
            name = "Agent $_tileCounter",
            color = color
        )
        val list = _workspaceTiles.getOrPut(workspaceId) { mutableStateListOf() }
        list.add(tile)
        // Force reactivity by reassigning the map entry
        _workspaceTiles[workspaceId] = list
        // Create a dedicated ChatViewModel
        agentViewModels[tileId] = ChatViewModel()
        return tile
    }

    fun removeAgent(workspaceId: String, tileId: String) {
        val list = _workspaceTiles[workspaceId] ?: return
        list.removeAll { it.id == tileId }
        _workspaceTiles[workspaceId] = list
        agentViewModels.remove(tileId)
    }

    fun getTilesForWorkspace(workspaceId: String): List<AgentTile> {
        return _workspaceTiles[workspaceId] ?: emptyList()
    }

    fun getViewModel(tileId: String): ChatViewModel {
        return agentViewModels.getOrPut(tileId) { ChatViewModel() }
    }
}
