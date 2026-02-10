package com.methil.mosaic.ui.pages

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.methil.mosaic.ui.theme.Dark00
import com.methil.mosaic.ui.theme.TextMuted
import com.methil.mosaic.ui.theme.TextPrimary
import com.methil.mosaic.ui.workspace.NewWorkspaceCard
import com.methil.mosaic.ui.workspace.WorkspaceCard
import com.methil.mosaic.workspace.WorkspaceStore

@Composable
fun WorkspacesPage(
    onWorkspaceSelected: (String) -> Unit = {}
) {
    val workspaceIds = WorkspaceStore.workspaceIds
    val workspaces = WorkspaceStore.workspaces

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Dark00)
            .padding(horizontal = 60.dp, vertical = 48.dp)
    ) {
        // Header
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "VOS WORKSPACES",
                color = TextPrimary,
                fontSize = 32.sp,
                fontWeight = FontWeight.Black,
                letterSpacing = (-2).sp
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "${workspaceIds.size} ESPACES DE TRAVAIL",
                color = TextMuted,
                fontSize = 10.sp,
                fontWeight = FontWeight.ExtraBold,
                letterSpacing = 4.sp
            )
        }

        Spacer(modifier = Modifier.height(48.dp))

        // Grid
        LazyVerticalGrid(
            columns = GridCells.Adaptive(minSize = 280.dp),
            horizontalArrangement = Arrangement.spacedBy(32.dp),
            verticalArrangement = Arrangement.spacedBy(32.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            items(workspaceIds) { id ->
                val ws = workspaces[id]
                if (ws != null) {
                    WorkspaceCard(
                        workspace = ws,
                        onClick = { onWorkspaceSelected(id) }
                    )
                }
            }

            // "New Workspace" card at the end
            item {
                NewWorkspaceCard(
                    onClick = {
                        WorkspaceStore.createWorkspace(
                            name = "Workspace ${workspaceIds.size + 1}"
                        )
                    }
                )
            }
        }
    }
}
