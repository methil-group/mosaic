package com.methil.mosaic

import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Window
import androidx.compose.ui.window.application
import androidx.compose.ui.window.rememberWindowState

fun main() = application {
    val windowState = rememberWindowState(
        width = 1280.dp,
        height = 720.dp
    )

    Window(
        onCloseRequest = ::exitApplication,
        title = "Mosaic",
        state = windowState,
    ) {
        App()
    }
}