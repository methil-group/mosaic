package com.methil.mosaic.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// -- Color Palette --
val Dark00 = Color(0xFF0D0D0D)   // Deepest background
val Dark05 = Color(0xFF141414)   // Sidebar background
val Dark10 = Color(0xFF1A1A1A)   // Surface / Cards
val Dark15 = Color(0xFF222222)   // Surface variant / inputs
val Dark20 = Color(0xFF2A2A2A)   // Borders / dividers
val Dark30 = Color(0xFF3A3A3A)   // Disabled / muted elements

val TextPrimary = Color(0xFFE8E8E8)
val TextSecondary = Color(0xFF9A9A9A)
val TextMuted = Color(0xFF666666)

val Accent = Color(0xFF6C8FFF)       // Primary accent (soft blue)
val AccentHover = Color(0xFF8BABFF)  // Light accent
val AccentDim = Color(0xFF3D5A99)    // Pressed / container

val UserBubble = Color(0xFF2A3F6E)
val AiBubble = Dark15

val ErrorRed = Color(0xFFCF6679)

private val MosaicDarkColors = darkColorScheme(
    primary = Accent,
    onPrimary = Color.White,
    primaryContainer = AccentDim,
    onPrimaryContainer = AccentHover,
    secondary = TextSecondary,
    onSecondary = TextPrimary,
    secondaryContainer = Dark15,
    onSecondaryContainer = TextPrimary,
    surface = Dark10,
    onSurface = TextPrimary,
    surfaceVariant = Dark15,
    onSurfaceVariant = TextSecondary,
    background = Dark00,
    onBackground = TextPrimary,
    error = ErrorRed,
    onError = Color.White,
    outline = Dark20,
    outlineVariant = Dark30,
)

@Composable
fun MosaicTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = MosaicDarkColors,
        typography = MaterialTheme.typography,
        shapes = MaterialTheme.shapes,
        content = content
    )
}
