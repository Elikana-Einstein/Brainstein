
import { WebSocket } from 'ws';
import { connectGemini } from './gemini.js';
import { handleClientMessage } from './message.js';

export function handleWebSocketClient(ws) {
  let session = null;
  let sessionPromise = null;
  let closed = false;

  // Prevent a failed session from being initialized repeatedly
  // before its previous connection attempt has settled.
  function ensureSession() {
    if (closed) {
      return Promise.reject(new Error('Client disconnected.'));
    }

    if (!sessionPromise) {
      sessionPromise = connectGemini({
        onopen: () => {
          console.log('Gemini session opened');
        },

        onmessage: (message) => {
          if (!closed) {
            forwardGeminiMessage(message);
            forwardCanvasToolCalls(message);
          }
        },

        onerror: (error) => {
          console.error('Gemini error:', error.message);
          send({ type: 'error', message: error.message });
        },

        onclose: (event) => {
          console.log('Gemini session closed:', event.reason);
        },
      })
        .then((connectedSession) => {
          session = connectedSession;
          return connectedSession;
        })
        .catch((error) => {
          sessionPromise = null;
          throw error;
        });
    }

    return sessionPromise;
  }

  function send(payload) {
    if (closed || ws.readyState !== WebSocket.OPEN) {
      return;
    }

    ws.send(JSON.stringify(payload), (error) => {
      if (error) {
        console.error('WebSocket send failed:', error.message);
      }
    });
  }

  function forwardGeminiMessage(message) {
    const content = message.serverContent;

    for (const part of content?.modelTurn?.parts ?? []) {
      if (part.inlineData) {
        send({
          type: 'audio_chunk',
          pcm: part.inlineData.data,
          mimeType: part.inlineData.mimeType || 'audio/pcm;rate=24000',
        });
      }

      if (part.text) {
        // Retain your existing thinking-text filter.
        if (!part.text.trim().startsWith('**')) {
          send({
            type: 'text_chunk',
            text: part.text,
          });
        }
      }
    }

    if (content?.outputTranscription) {
      send({
        type: 'transcript',
        text: content.outputTranscription.text,
      });
    }

    if (content?.inputTranscription) {
      send({
        type: 'user_transcript',
        text: content.inputTranscription.text,
      });
    }

    if (content?.interrupted) {
      send({ type: 'interrupted' });
    }

    if (content?.turnComplete) {
      send({ type: 'turn_complete' });
    }
  }
  function forwardCanvasToolCalls(message) {
  const functionCalls = message.toolCall?.functionCalls ?? [];

  console.log('[Gemini] Tool calls:', JSON.stringify(functionCalls));

  for (const call of functionCalls) {
    console.log('[WS] Forwarding canvas action:', call.name, call.args);

    send({
      type: 'canvas_action',
      action: {
        name: call.name,
        args: call.args ?? {},
        callId: call.id,
      },
    });
  }
}

  ws.on('message', async (raw) => {
    try {
      const data = JSON.parse(raw.toString());

      const activeSession = await ensureSession();

      if (closed) return;

      handleClientMessage(activeSession, data);
    } catch (error) {
      console.error('WebSocket message error:', error);

      send({
        type: 'error',
        message: error instanceof SyntaxError
          ? 'Invalid JSON message.'
          : error.message || 'Something went wrong.',
      });
    }
  });

  ws.on('error', (error) => {
    console.error('Client WebSocket error:', error.message);
  });

  ws.on('close', () => {
    closed = true;
    console.log('Client disconnected');

    try {
      session?.close();
    } catch (error) {
      console.error('Error closing Gemini session:', error);
    }

    session = null;
    sessionPromise = null;
  });
}
