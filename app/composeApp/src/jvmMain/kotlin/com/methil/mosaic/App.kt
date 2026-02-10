package com.methil.mosaic

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import com.methil.mosaic.chat.ui.ChatScreen
import com.methil.mosaic.navigation.Page
import com.methil.mosaic.ui.grid.AgentTileGrid
import com.methil.mosaic.ui.pages.SettingsPage
import com.methil.mosaic.ui.pages.WorkspacesPage
import com.methil.mosaic.ui.sidebar.Sidebar
import com.methil.mosaic.ui.theme.Dark00
import com.methil.mosaic.ui.theme.MosaicTheme
import com.methil.mosaic.workspace.WorkspaceStore

@Composable
fun App() {
    MosaicTheme {
        var currentPage by remember { mutableStateOf(Page.CHAT) }
        var activeWorkspaceId by remember { mutableStateOf<String?>(null) }

        Row(
            modifier = Modifier
                .fillMaxSize()
                .background(Dark00)
        ) {
            Sidebar(
                currentPage = currentPage,
                onPageSelected = { page ->
                    currentPage = page
                    if (page != Page.WORKSPACE_DETAIL) {
                        activeWorkspaceId = null
                    }
                }
            )

            // Content area
            when (currentPage) {
                Page.CHAT -> ChatScreen()
                Page.WORKSPACES -> WorkspacesPage(
                    onWorkspaceSelected = { wsId ->
                        activeWorkspaceId = wsId
                        WorkspaceStore.activeWorkspaceId.value = wsId
                        currentPage = Page.WORKSPACE_DETAIL
                    }
                )
                Page.WORKSPACE_DETAIL -> {
                    val wsId = activeWorkspaceId
                    if (wsId != null) {
                        val ws = WorkspaceStore.workspaces[wsId]
                        AgentTileGrid(
                            workspaceId = wsId,
                            workspaceName = ws?.name ?: "Workspace"
                        )
                    }
                }
                Page.SETTINGS -> SettingsPage()
            }
        }
    }
}