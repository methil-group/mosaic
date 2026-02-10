package com.methil.mosaic.ui.sidebar

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.pointer.PointerEventType
import androidx.compose.ui.input.pointer.PointerIcon
import androidx.compose.ui.input.pointer.onPointerEvent
import androidx.compose.ui.input.pointer.pointerHoverIcon
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathFillType
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.path
import androidx.compose.ui.unit.dp
import com.methil.mosaic.navigation.Page
import com.methil.mosaic.ui.theme.Accent
import com.methil.mosaic.ui.theme.Dark05
import com.methil.mosaic.ui.theme.Dark20
import com.methil.mosaic.ui.theme.TextMuted
import com.methil.mosaic.ui.theme.TextSecondary

// -- Icons --

val ChatIcon: ImageVector by lazy {
    ImageVector.Builder("Chat", 24.dp, 24.dp, 24f, 24f).apply {
        path(
            fill = SolidColor(Color.White),
            pathFillType = PathFillType.NonZero
        ) {
            // Chat bubble icon
            moveTo(20f, 2f)
            lineTo(4f, 2f)
            curveTo(2.9f, 2f, 2f, 2.9f, 2f, 4f)
            lineTo(2f, 22f)
            lineTo(6f, 18f)
            lineTo(20f, 18f)
            curveTo(21.1f, 18f, 22f, 17.1f, 22f, 16f)
            lineTo(22f, 4f)
            curveTo(22f, 2.9f, 21.1f, 2f, 20f, 2f)
            close()
        }
    }.build()
}

val WorkspacesIcon: ImageVector by lazy {
    ImageVector.Builder("Workspaces", 24.dp, 24.dp, 24f, 24f).apply {
        path(
            fill = SolidColor(Color.White),
            pathFillType = PathFillType.NonZero
        ) {
            // Grid / folder icon
            moveTo(3f, 3f)
            lineTo(11f, 3f)
            lineTo(11f, 11f)
            lineTo(3f, 11f)
            close()
            moveTo(13f, 3f)
            lineTo(21f, 3f)
            lineTo(21f, 11f)
            lineTo(13f, 11f)
            close()
            moveTo(3f, 13f)
            lineTo(11f, 13f)
            lineTo(11f, 21f)
            lineTo(3f, 21f)
            close()
            moveTo(13f, 13f)
            lineTo(21f, 13f)
            lineTo(21f, 21f)
            lineTo(13f, 21f)
            close()
        }
    }.build()
}

val SettingsIcon: ImageVector by lazy {
    ImageVector.Builder("Settings", 24.dp, 24.dp, 24f, 24f).apply {
        path(
            fill = SolidColor(Color.White),
            pathFillType = PathFillType.NonZero
        ) {
            // Gear icon (simplified)
            moveTo(19.14f, 12.94f)
            curveTo(19.18f, 12.64f, 19.2f, 12.33f, 19.2f, 12f)
            curveTo(19.2f, 11.68f, 19.18f, 11.36f, 19.13f, 11.06f)
            lineTo(21.16f, 9.48f)
            curveTo(21.34f, 9.34f, 21.39f, 9.07f, 21.28f, 8.87f)
            lineTo(19.36f, 5.55f)
            curveTo(19.24f, 5.33f, 18.99f, 5.26f, 18.77f, 5.33f)
            lineTo(16.38f, 6.29f)
            curveTo(15.88f, 5.91f, 15.35f, 5.59f, 14.76f, 5.35f)
            lineTo(14.4f, 2.81f)
            curveTo(14.36f, 2.57f, 14.16f, 2.4f, 13.92f, 2.4f)
            lineTo(10.08f, 2.4f)
            curveTo(9.84f, 2.4f, 9.65f, 2.57f, 9.61f, 2.81f)
            lineTo(9.25f, 5.35f)
            curveTo(8.66f, 5.59f, 8.12f, 5.92f, 7.63f, 6.29f)
            lineTo(5.24f, 5.33f)
            curveTo(5.02f, 5.25f, 4.77f, 5.33f, 4.65f, 5.55f)
            lineTo(2.74f, 8.87f)
            curveTo(2.62f, 9.08f, 2.66f, 9.34f, 2.86f, 9.48f)
            lineTo(4.89f, 11.06f)
            curveTo(4.84f, 11.36f, 4.8f, 11.69f, 4.8f, 12f)
            curveTo(4.8f, 12.31f, 4.82f, 12.64f, 4.87f, 12.94f)
            lineTo(2.84f, 14.52f)
            curveTo(2.66f, 14.66f, 2.61f, 14.93f, 2.72f, 15.13f)
            lineTo(4.64f, 18.45f)
            curveTo(4.76f, 18.67f, 5.01f, 18.74f, 5.23f, 18.67f)
            lineTo(7.62f, 17.71f)
            curveTo(8.12f, 18.09f, 8.65f, 18.41f, 9.24f, 18.65f)
            lineTo(9.6f, 21.19f)
            curveTo(9.65f, 21.43f, 9.84f, 21.6f, 10.08f, 21.6f)
            lineTo(13.92f, 21.6f)
            curveTo(14.16f, 21.6f, 14.36f, 21.43f, 14.39f, 21.19f)
            lineTo(14.75f, 18.65f)
            curveTo(15.34f, 18.41f, 15.88f, 18.09f, 16.37f, 17.71f)
            lineTo(18.76f, 18.67f)
            curveTo(18.98f, 18.75f, 19.23f, 18.67f, 19.35f, 18.45f)
            lineTo(21.27f, 15.13f)
            curveTo(21.39f, 14.91f, 21.34f, 14.66f, 21.15f, 14.52f)
            lineTo(19.14f, 12.94f)
            close()
            // Inner circle
            moveTo(12f, 15.6f)
            curveTo(10.02f, 15.6f, 8.4f, 13.98f, 8.4f, 12f)
            curveTo(8.4f, 10.02f, 10.02f, 8.4f, 12f, 8.4f)
            curveTo(13.98f, 8.4f, 15.6f, 10.02f, 15.6f, 12f)
            curveTo(15.6f, 13.98f, 13.98f, 15.6f, 12f, 15.6f)
            close()
        }
    }.build()
}

@Composable
fun Sidebar(
    currentPage: Page,
    onPageSelected: (Page) -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxHeight()
            .width(56.dp)
            .background(Dark05)
            .padding(vertical = 12.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Top nav items
        SidebarItem(
            icon = ChatIcon,
            label = "Chat",
            selected = currentPage == Page.CHAT,
            onClick = { onPageSelected(Page.CHAT) }
        )

        Spacer(modifier = Modifier.height(4.dp))

        SidebarItem(
            icon = WorkspacesIcon,
            label = "Workspaces",
            selected = currentPage == Page.WORKSPACES || currentPage == Page.WORKSPACE_DETAIL,
            onClick = { onPageSelected(Page.WORKSPACES) }
        )

        Spacer(modifier = Modifier.weight(1f))

        // Divider
        Box(
            modifier = Modifier
                .width(32.dp)
                .height(1.dp)
                .background(Dark20)
        )

        Spacer(modifier = Modifier.height(8.dp))

        // Bottom pinned: Settings
        SidebarItem(
            icon = SettingsIcon,
            label = "Settings",
            selected = currentPage == Page.SETTINGS,
            onClick = { onPageSelected(Page.SETTINGS) }
        )
    }
}

@OptIn(ExperimentalComposeUiApi::class)
@Composable
private fun SidebarItem(
    icon: ImageVector,
    label: String,
    selected: Boolean,
    onClick: () -> Unit
) {
    var isHovered by remember { mutableStateOf(false) }

    val bgColor = when {
        selected -> Accent.copy(alpha = 0.12f)
        isHovered -> Color.White.copy(alpha = 0.06f)
        else -> Color.Transparent
    }
    val iconTint = when {
        selected -> Accent
        isHovered -> TextSecondary
        else -> TextMuted
    }

    Box(
        modifier = Modifier
            .size(40.dp)
            .clip(RoundedCornerShape(10.dp))
            .background(bgColor)
            .pointerHoverIcon(PointerIcon.Hand)
            .onPointerEvent(PointerEventType.Enter) { isHovered = true }
            .onPointerEvent(PointerEventType.Exit) { isHovered = false }
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onClick
            ),
        contentAlignment = Alignment.Center
    ) {
        Icon(
            imageVector = icon,
            contentDescription = label,
            tint = iconTint,
            modifier = Modifier.size(20.dp)
        )
    }
}
