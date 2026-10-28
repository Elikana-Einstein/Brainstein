
export function handleClientMessage(session, data) {
  if (!session) {
    throw new Error('Gemini session is not ready.');
  }

  switch (data.type) {
    case 'text': {
      if (typeof data.text !== 'string' || !data.text.trim()) {
        throw new Error('A non-empty text prompt is required.');
      }

      session.sendClientContent({
        turns: [
          {
            role: 'user',
            parts: [{ text: data.text }],
          },
        ],
        turnComplete: true,
      });

      return;
    }
    
case 'canvas_action_result': {
  if (typeof data.callId !== 'string' || !data.callId) {
    throw new Error('Canvas action callId is required.');
  }

  if (typeof data.name !== 'string' || !data.name) {
    throw new Error('Canvas function name is required.');
  }

  if (typeof data.success !== 'boolean') {
    throw new Error('Canvas action success status is required.');
  }

  session.sendToolResponse({
    functionResponses: [
      {
        id: data.callId,
        name: data.name,
        response: data.success
          ? { result: data.result ?? 'Canvas action completed.' }
          : { error: data.error ?? 'Canvas action failed.' },
      },
    ],
  });

  return;
}

 
    case 'analyse': {
      if (typeof data.audioBase64 !== 'string') {
        throw new Error('Audio data is required.');
      }

      session.sendRealtimeInput({
        audio: {
          data: data.audioBase64,
          mimeType: 'audio/pcm;rate=16000',
        },
      });

      return;
    }

    default: {
      // Preserve compatibility with your existing canvas
      // messages, which contain an image instead of a type.
      if (typeof data.image === 'string') {
        session.sendRealtimeInput({
          video: {
            data: data.image,
            mimeType: 'image/jpeg',
          },
        });

        return;
      }

      throw new Error(`Unsupported message type: ${data.type}`);
    }
  }
}
