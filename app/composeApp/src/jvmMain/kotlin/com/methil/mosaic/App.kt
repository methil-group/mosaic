package com.methil.mosaic

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import com.methil.mosaic.chat.ui.ChatScreen
import com.methil.mosaic.navigation.Page
import com.methil.mosaic.ui.pages.SettingsPage
import com.methil.mosaic.ui.pages.WorkspacesPage
import com.methil.mosaic.ui.sidebar.Sidebar
import com.methil.mosaic.ui.theme.Dark00
import com.methil.mosaic.ui.theme.MosaicTheme

@Composable
fun App() {
    MosaicTheme {
        var currentPage by remember { mutableStateOf(Page.CHAT) }

        Row(
            modifier = Modifier
                .fillMaxSize()
                .background(Dark00)
        ) {
            Sidebar(
                currentPage = currentPage,
                onPageSelected = { currentPage = it }
            )

            // Content area
            when (currentPage) {
                Page.CHAT -> ChatScreen()
                Page.WORKSPACES -> WorkspacesPage()
                Page.SETTINGS -> SettingsPage()
            }
        }
    }
}