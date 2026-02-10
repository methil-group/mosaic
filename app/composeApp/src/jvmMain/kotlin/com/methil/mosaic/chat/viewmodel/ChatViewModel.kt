package com.methil.mosaic.chat.viewmodel

import androidx.compose.runtime.mutableStateListOf
import com.methil.mosaic.chat.model.ChatMessage
import com.methil.mosaic.chat.model.MessageSender
import kotlinx.coroutines.*

class ChatViewModel {
    private val _messages = mutableStateListOf<ChatMessage>()
    val messages: List<ChatMessage> = _messages

    private val viewModelScope = CoroutineScope(Dispatchers.Main + Job())

    fun sendMessage(text: String) {
        if (text.isBlank()) return

        val userMessage = ChatMessage(text = text, sender = MessageSender.USER)
        _messages.add(userMessage)

        // Simulate AI response
        viewModelScope.launch {
            delay(1000)
            val aiResponse = ChatMessage(
                text = "Ceci est une réponse simple de l'IA à : \"$text\"",
                sender = MessageSender.AI
            )
            _messages.add(aiResponse)
        }
    }

    fun clearMessages() {
        _messages.clear()
    }
}
