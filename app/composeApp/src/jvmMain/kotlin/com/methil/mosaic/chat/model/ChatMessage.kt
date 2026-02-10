package com.methil.mosaic.chat.model

import java.util.UUID

enum class MessageSender {
    USER, AI
}

data class ChatMessage(
    val id: String = UUID.randomUUID().toString(),
    val text: String,
    val sender: MessageSender,
    val timestamp: Long = System.currentTimeMillis()
)
