import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as fabric from 'fabric';

// ============================================
// MAIN COMPONENT: Real-Time Bidirectional AI Whiteboard
// ============================================
const RealtimeAIWhiteboard = ({
  width = 1000,
  height = 600,
  brushColor = '#000000',
  brushWidth = 3,
  geminiApiKey = 'YOUR_GEMINI_API_KEY', // or OpenAI API key
  useOpenAI = false, // toggle between Gemini and OpenAI
  className = '',
  onAIStateChange
}) => {
  // Refs
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const captureIntervalRef = useRef(null);
  const userDrawingRef = useRef(false);
  
  // State
  const [isConnected, setIsConnected] = useState(false);
  const [isAIActive, setIsAIActive] = useState(false);
  const [isAIDrawing, setIsAIDrawing] = useState(false);
  const [isUserDrawing, setIsUserDrawing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [currentUserMessage, setCurrentUserMessage] = useState('');
  const [interruptionMode, setInterruptionMode] = useState(false);
  const [frameRate, setFrameRate] = useState(2); // frames per second sent to AI

  // ============================================
  // INITIALIZATION
  // ============================================
  useEffect(() => {
    // Initialize Fabric canvas
    const canvas = new fabric.Canvas(canvasRef.current, {
      width,
      height,
      isDrawingMode: true,
      backgroundColor: '#ffffff',
    });

    canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
    canvas.freeDrawingBrush.color = brushColor;
    canvas.freeDrawingBrush.width = brushWidth;

    // Enable drawing mode
    canvas.selection = false;
    canvas.skipTargetFind = true;

    fabricCanvasRef.current = canvas;

    // Drawing event listeners
    canvas.on('mouse:down', () => {
      userDrawingRef.current = true;
      setIsUserDrawing(true);
    });
    
    canvas.on('mouse:up', () => {
      userDrawingRef.current = false;
      setIsUserDrawing(false);
      
      // Notify AI that user stopped drawing (optional context)
      if (isConnected) {
        sendContextToAI('user_stopped_drawing');
      }
    });
    
    canvas.on('path:created', (e) => {
      // When user completes a stroke, send it to AI for immediate feedback
      if (isConnected) {
        captureAndSendFrame('user_completed_stroke');
      }
    });

    // Set up audio context for microphone
    setupAudio();

    return () => {
      canvas.dispose();
      disconnectFromAI();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Update brush properties
  useEffect(() => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.freeDrawingBrush.color = brushColor;
    }
  }, [brushColor]);

  useEffect(() => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.freeDrawingBrush.width = brushWidth;
    }
  }, [brushWidth]);

  // ============================================
  // AUDIO SETUP (Voice Input)
  // ============================================
  const setupAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      
      source.connect(processor);
      processor.connect(audioContextRef.current.destination);
      
      processor.onaudioprocess = (e) => {
        if (isConnected && isListening) {
          const inputData = e.inputBuffer.getChannelData(0);
          // Convert float32 to int16 for API
          const int16Data = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            int16Data[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
          }
          
          // Send audio chunk to AI via WebSocket
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              type: 'audio',
              data: Array.from(int16Data),
              sampleRate: audioContextRef.current.sampleRate
            }));
          }
        }
      };
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  // ============================================
  // AI CONNECTION (Gemini Live API or OpenAI Realtime)
  // ============================================
  const connectToAI = async () => {
    try {
      if (useOpenAI) {
        await connectToOpenAI();
      } else {
        await connectToGemini();
      }
      
      setIsConnected(true);
      setIsListening(true);
      startFrameCapture();
      
      // Add system message to conversation
      addToConversation('system', 'AI Assistant connected and ready to collaborate!');
      
    } catch (error) {
      console.error('Failed to connect to AI:', error);
      addToConversation('error', `Connection failed: ${error.message}`);
    }
  };

  // ============================================
  // GEMINI LIVE API CONNECTION (Recommended for multimodal)
  // ============================================
  const connectToGemini = async () => {
    // Gemini Live API uses WebSockets for bidirectional streaming [citation:5]
    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${geminiApiKey}`;
    
    wsRef.current = new WebSocket(wsUrl);
    
    wsRef.current.onopen = () => {
      console.log('Connected to Gemini Live API');
      
      // Send setup message with configuration [citation:2]
      const setupMessage = {
        setup: {
          model: "models/gemini-2.0-flash-exp",
          generation_config: {
            response_modalities: ["TEXT", "AUDIO"],
            temperature: 0.7,
            max_output_tokens: 2048,
          },
          system_instruction: {
            parts: [{
              text: `You are an AI design assistant collaborating on a whiteboard in real-time.
              
              CAPABILITIES:
              - You can SEE what I'm drawing through live video frames
              - You can HEAR my voice explanations
              - You can TALK back to me with audio responses
              - You can DRAW on the canvas using the DRAW_ commands
              
              RULES:
              1. When I'm drawing something, provide real-time feedback and suggestions
              2. If I make a mistake (like putting a nozzle in the wrong place), politely correct me
              3. You can interrupt me if I'm going in the wrong direction
              4. Feel free to sketch better versions of my ideas
              5. When you want to draw, use these commands:
                 - DRAW_LINE(x1,y1,x2,y2,color,width)
                 - DRAW_RECT(x,y,width,height,color,fill,strokeWidth)
                 - DRAW_CIRCLE(x,y,radius,color,fill,strokeWidth)
                 - DRAW_TEXT(text,x,y,fontSize,color)
                 - DRAW_PATH([x1,y1,x2,y2,...],color,width)
                 - CLEAR() - clear the canvas
                 - UNDO() - undo last action
              
              Be conversational, helpful, and proactive. You're my collaborative partner!`
            }]
          }
        }
      };
      
      wsRef.current.send(JSON.stringify(setupMessage));
      
      // Set up audio output
      setupAudioOutput();
    };
    
    wsRef.current.onmessage = (event) => {
      const response = JSON.parse(event.data);
      handleGeminiResponse(response);
    };
    
    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    wsRef.current.onclose = () => {
      setIsConnected(false);
      setIsListening(false);
      stopFrameCapture();
      addToConversation('system', 'Disconnected from AI');
    };
  };

  // ============================================
  // OPENAI REALTIME API CONNECTION (Alternative)
  // ============================================
  const connectToOpenAI = async () => {
    // OpenAI Realtime API supports multimodal inputs including images [citation:4][citation:9]
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${geminiApiKey}`, // Use OpenAI key here
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview',
        modalities: ['text', 'audio'],
        instructions: `You are an AI design assistant...` // Same instructions as above
      })
    });
    
    const session = await response.json();
    const wsUrl = session.client_secret.wss_url;
    
    wsRef.current = new WebSocket(wsUrl);
    
    wsRef.current.onopen = () => {
      console.log('Connected to OpenAI Realtime API');
      
      // Send initial configuration
      wsRef.current.send(JSON.stringify({
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          instructions: `You are an AI design assistant...` // Your instructions
        }
      }));
      
      setupAudioOutput();
    };
    
    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleOpenAIResponse(data);
    };
  };

  // ============================================
  // AUDIO OUTPUT SETUP
  // ============================================
  const setupAudioOutput = () => {
    // Create audio context for playing AI responses
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
  };

  const playAudioResponse = (audioData, sampleRate = 24000) => {
    // For Gemini: audio comes as base64 PCM data [citation:5]
    // For OpenAI: audio comes in various formats [citation:4]
    
    try {
      const binaryString = atob(audioData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Convert to float32 for Web Audio API
      const float32Data = new Float32Array(bytes.length / 2);
      for (let i = 0; i < float32Data.length; i++) {
        const int16 = (bytes[i*2] | (bytes[i*2+1] << 8));
        float32Data[i] = int16 / 32768;
      }
      
      const audioBuffer = audioContextRef.current.createBuffer(1, float32Data.length, sampleRate);
      audioBuffer.copyToChannel(float32Data, 0);
      
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.start();
      
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  // ============================================
  // FRAME CAPTURE (Live Video Streaming)
  // ============================================
  const startFrameCapture = () => {
    if (captureIntervalRef.current) return;
    
    captureIntervalRef.current = setInterval(() => {
      captureAndSendFrame('live_stream');
    }, 1000 / frameRate); // Send frames at specified FPS
  };

  const stopFrameCapture = () => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
  };

  const captureAndSendFrame = async (context = 'live_stream') => {
    if (!fabricCanvasRef.current || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    
    // Capture canvas as base64 image
    const imageData = fabricCanvasRef.current.toDataURL('png');
    
    // Remove data URL prefix to get pure base64
    const base64Data = imageData.split(',')[1];
    
    // Send to AI based on which API we're using
    if (useOpenAI) {
      // OpenAI Realtime API accepts images as input [citation:9]
      wsRef.current.send(JSON.stringify({
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [
            {
              type: 'input_image',
              image_url: `data:image/png;base64,${base64Data}`
            },
            {
              type: 'text',
              text: context === 'user_completed_stroke' 
                ? 'I just finished drawing this. What do you think?' 
                : 'Here\'s the current whiteboard state.'
            }
          ]
        }
      }));
    } else {
      // Gemini Live API accepts image frames [citation:5]
      wsRef.current.send(JSON.stringify({
        realtime_input: {
          media_chunks: [{
            data: base64Data,
            mime_type: "image/png"
          }]
        }
      }));
    }
  };

  // ============================================
  // SEND CONTEXT TO AI
  // ============================================
  const sendContextToAI = (contextMessage) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    
    if (useOpenAI) {
      wsRef.current.send(JSON.stringify({
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [{
            type: 'text',
            text: contextMessage
          }]
        }
      }));
    }
  };

  // ============================================
  // HANDLE AI RESPONSES
  // ============================================
  const handleGeminiResponse = (response) => {
    // Check for text response
    if (response.serverContent && response.serverContent.modelTurn) {
      const parts = response.serverContent.modelTurn.parts;
      
      for (const part of parts) {
        if (part.text) {
          // Display text response
          addToConversation('ai', part.text);
          
          // Parse and execute drawing commands
          executeDrawingCommands(part.text);
        }
        
        if (part.inlineData) {
          // Audio response [citation:5]
          const audioData = part.inlineData.data;
          playAudioResponse(audioData);
        }
      }
    }
    
    // Handle interruption/turn completion
    if (response.turnComplete) {
      setIsAIActive(false);
    }
  };

  const handleOpenAIResponse = (data) => {
    if (data.type === 'response.audio_transcript.done') {
      // Text transcript of AI's speech
      addToConversation('ai', data.transcript);
      setIsAIActive(true);
      
    } else if (data.type === 'response.audio.delta') {
      // Audio chunk
      // For OpenAI, you'd accumulate chunks and play them
      
    } else if (data.type === 'response.function_call_arguments.done') {
      // Function call for drawing [citation:9]
      if (data.name === 'draw_on_canvas') {
        const args = JSON.parse(data.arguments);
        executeDrawingCommands(args.command);
      }
      
    } else if (data.type === 'response.done') {
      setIsAIActive(false);
    }
  };

  // ============================================
  // EXECUTE AI DRAWING COMMANDS
  // ============================================
  const executeDrawingCommands = async (text) => {
    if (!fabricCanvasRef.current) return;
    
    setIsAIDrawing(true);
    
    // Parse commands from AI response
    const lines = text.split('\n');
    
    for (const line of lines) {
      // DRAW_LINE(x1,y1,x2,y2,color,width)
      const lineMatch = line.match(/DRAW_LINE\((\d+),(\d+),(\d+),(\d+),'([^']*)',(\d+)\)/);
      if (lineMatch) {
        const [_, x1, y1, x2, y2, color, width] = lineMatch;
        const lineObj = new fabric.Line(
          [parseInt(x1), parseInt(y1), parseInt(x2), parseInt(y2)],
          { stroke: color, strokeWidth: parseInt(width), selectable: false }
        );
        fabricCanvasRef.current.add(lineObj);
        fabricCanvasRef.current.renderAll();
        await new Promise(r => setTimeout(r, 100)); // Small delay for visual effect
      }
      
      // DRAW_RECT(x,y,w,h,color,fill,strokeWidth)
      const rectMatch = line.match(/DRAW_RECT\((\d+),(\d+),(\d+),(\d+),'([^']*)','([^']*)',(\d+)\)/);
      if (rectMatch) {
        const [_, x, y, w, h, color, fill, strokeWidth] = rectMatch;
        const rect = new fabric.Rect({
          left: parseInt(x), top: parseInt(y),
          width: parseInt(w), height: parseInt(h),
          stroke: color, fill: fill, strokeWidth: parseInt(strokeWidth),
          selectable: false
        });
        fabricCanvasRef.current.add(rect);
        fabricCanvasRef.current.renderAll();
        await new Promise(r => setTimeout(r, 100));
      }
      
      // DRAW_CIRCLE(x,y,radius,color,fill,strokeWidth)
      const circleMatch = line.match(/DRAW_CIRCLE\((\d+),(\d+),(\d+),'([^']*)','([^']*)',(\d+)\)/);
      if (circleMatch) {
        const [_, x, y, r, color, fill, strokeWidth] = circleMatch;
        const circle = new fabric.Circle({
          left: parseInt(x) - parseInt(r),
          top: parseInt(y) - parseInt(r),
          radius: parseInt(r),
          stroke: color, fill: fill, strokeWidth: parseInt(strokeWidth),
          selectable: false
        });
        fabricCanvasRef.current.add(circle);
        fabricCanvasRef.current.renderAll();
        await new Promise(r => setTimeout(r, 100));
      }
      
      // DRAW_TEXT(text,x,y,fontSize,color)
      const textMatch = line.match(/DRAW_TEXT\('([^']+)',(\d+),(\d+),(\d+),'([^']*)'\)/);
      if (textMatch) {
        const [_, text, x, y, fontSize, color] = textMatch;
        const textObj = new fabric.Text(text, {
          left: parseInt(x), top: parseInt(y),
          fontSize: parseInt(fontSize), fill: color,
          selectable: false
        });
        fabricCanvasRef.current.add(textObj);
        fabricCanvasRef.current.renderAll();
        await new Promise(r => setTimeout(r, 100));
      }
      
      // DRAW_PATH([x1,y1,x2,y2,...],color,width)
      const pathMatch = line.match(/DRAW_PATH\[(.*?)\],'([^']*)',(\d+)\)/);
      if (pathMatch) {
        const pointsStr = pathMatch[1];
        const points = pointsStr.split(',').map(Number);
        
        if (points.length >= 4) {
          let pathStr = `M ${points[0]} ${points[1]}`;
          for (let i = 2; i < points.length; i += 2) {
            pathStr += ` L ${points[i]} ${points[i+1]}`;
          }
          
          const path = new fabric.Path(pathStr, {
            stroke: pathMatch[2],
            strokeWidth: parseInt(pathMatch[3]),
            fill: 'transparent',
            selectable: false
          });
          fabricCanvasRef.current.add(path);
          fabricCanvasRef.current.renderAll();
          await new Promise(r => setTimeout(r, 200));
        }
      }
      
      // CLEAR()
      if (line.includes('CLEAR()')) {
        fabricCanvasRef.current.clear();
        fabricCanvasRef.current.backgroundColor = '#ffffff';
        fabricCanvasRef.current.renderAll();
      }
      
      // UNDO()
      if (line.includes('UNDO()')) {
        const objects = fabricCanvasRef.current.getObjects();
        if (objects.length > 0) {
          fabricCanvasRef.current.remove(objects[objects.length - 1]);
          fabricCanvasRef.current.renderAll();
        }
      }
    }
    
    setIsAIDrawing(false);
  };

  // ============================================
  // INTERRUPT HANDLING (Barge-in feature)
  // ============================================
  const interruptAI = () => {
    if (!isConnected || !isAIActive) return;
    
    setInterruptionMode(true);
    
    // Send interruption signal to AI
    if (useOpenAI) {
      wsRef.current.send(JSON.stringify({
        type: 'response.cancel'
      }));
    } else {
      // For Gemini, we can just send a new message to interrupt [citation:5]
      wsRef.current.send(JSON.stringify({
        realtime_input: {
          media_chunks: [{
            text: "[User interrupted] Actually, I think we should put the nozzle at the end instead."
          }]
        }
      }));
    }
    
    setIsAIActive(false);
    addToConversation('user', '🚫 Interrupted AI (user took over)');
    
    setTimeout(() => setInterruptionMode(false), 1000);
  };

  // ============================================
  // SEND USER MESSAGE (Text)
  // ============================================
  const sendUserMessage = () => {
    if (!currentUserMessage.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    
    addToConversation('user', currentUserMessage);
    
    // Capture current frame for context
    const imageData = fabricCanvasRef.current.toDataURL('png');
    const base64Data = imageData.split(',')[1];
    
    if (useOpenAI) {
      wsRef.current.send(JSON.stringify({
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [
            {
              type: 'input_image',
              image_url: `data:image/png;base64,${base64Data}`
            },
            {
              type: 'text',
              text: currentUserMessage
            }
          ]
        }
      }));
    } else {
      wsRef.current.send(JSON.stringify({
        realtime_input: {
          media_chunks: [
            {
              data: base64Data,
              mime_type: "image/png"
            },
            {
              text: currentUserMessage
            }
          ]
        }
      }));
    }
    
    setCurrentUserMessage('');
  };

  // ============================================
  // DISCONNECT
  // ============================================
  const disconnectFromAI = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    stopFrameCapture();
    setIsConnected(false);
    setIsListening(false);
  };

  // ============================================
  // UTILITIES
  // ============================================
  const addToConversation = (type, content) => {
    setConversation(prev => [...prev, {
      id: Date.now(),
      type,
      content,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const clearCanvas = () => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.clear();
      fabricCanvasRef.current.backgroundColor = '#ffffff';
      fabricCanvasRef.current.renderAll();
      
      // Notify AI
      if (isConnected) {
        sendContextToAI('Canvas cleared by user');
      }
    }
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className={`flex flex-col gap-4 p-4 bg-gray-100 rounded-lg ${className}`}>
      {/* Connection Controls */}
      <div className="flex flex-wrap gap-3 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-2">
          <select
            value={frameRate}
            onChange={(e) => setFrameRate(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            disabled={isConnected}
          >
            <option value="1">1 fps (Low bandwidth)</option>
            <option value="2">2 fps (Recommended)</option>
            <option value="5">5 fps (High quality)</option>
          </select>
          
          {!isConnected ? (
            <button
              onClick={connectToAI}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm font-medium"
            >
              🔗 Connect to AI Assistant
            </button>
          ) : (
            <button
              onClick={disconnectFromAI}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm font-medium"
            >
              🔌 Disconnect
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-3 ml-auto">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`}></span>
            <span className="text-sm text-gray-600">AI: {isConnected ? 'Connected' : 'Offline'}</span>
          </div>
          
          {isAIActive && (
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium animate-pulse">
              AI is talking...
            </span>
          )}
          
          {isAIDrawing && (
            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium animate-pulse">
              AI is drawing...
            </span>
          )}
          
          {isUserDrawing && (
            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">
              You are drawing
            </span>
          )}
        </div>
      </div>

      {/* Main Area */}
      <div className="flex gap-4">
        {/* Canvas */}
        <div className="flex-1">
          <div className="relative">
            <div className="flex justify-center items-center p-4 bg-white rounded-lg shadow-sm border border-gray-200">
              <canvas
                ref={canvasRef}
                className="border border-gray-300 rounded-md cursor-crosshair"
                style={{ width, height }}
              />
            </div>
            
            {/* Interrupt button (floating) */}
            {isConnected && isAIActive && (
              <button
                onClick={interruptAI}
                className="absolute top-2 right-2 px-3 py-1 bg-red-500 text-white rounded-full text-sm font-medium animate-pulse shadow-lg"
              >
                🚫 Interrupt AI
              </button>
            )}
            
            {/* Canvas controls */}
            <div className="mt-2 flex gap-2">
              <button
                onClick={clearCanvas}
                className="px-3 py-1 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm"
              >
                Clear Canvas
              </button>
              
              <button
                onClick={() => captureAndSendFrame('manual_capture')}
                disabled={!isConnected}
                className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300 text-sm"
              >
                📸 Send Frame Now
              </button>
            </div>
          </div>
        </div>

        {/* Conversation Panel */}
        <div className="w-96 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col">
          <div className="p-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
            <h3 className="font-medium text-gray-700">🤖 AI Design Assistant</h3>
            <p className="text-xs text-gray-500 mt-1">
              {isConnected 
                ? 'AI can see, hear, talk, and draw with you' 
                : 'Connect to start collaborating'}
            </p>
          </div>
          
          {/* Conversation history */}
          <div className="flex-1 overflow-y-auto p-3 max-h-[500px] space-y-3">
            {conversation.length === 0 ? (
              <div className="text-center text-gray-400 text-sm py-8">
                <p>💬 Connect to AI and start designing!</p>
                <p className="mt-4 text-xs">Example interactions:</p>
                <p className="mt-2">• "Let's design a rocket"</p>
                <p>• "The nozzle should be at the end, not center"</p>
                <p>• "Can you sketch a better version?"</p>
              </div>
            ) : (
              conversation.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-lg text-sm ${
                    msg.type === 'ai' 
                      ? 'bg-blue-50 text-blue-800 ml-2 border-l-4 border-blue-400' 
                      : msg.type === 'user'
                      ? 'bg-gray-100 text-gray-800 mr-2 border-l-4 border-gray-400'
                      : msg.type === 'system'
                      ? 'bg-purple-50 text-purple-800 text-center text-xs'
                      : 'bg-red-50 text-red-800'
                  }`}
                >
                  {msg.type === 'ai' && <span className="font-medium block mb-1">🤖 AI:</span>}
                  {msg.type === 'user' && <span className="font-medium block mb-1">👤 You:</span>}
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <p className="text-xs text-gray-400 mt-1">{msg.timestamp}</p>
                </div>
              ))
            )}
            
            {/* Live indicators */}
            {isAIActive && (
              <div className="flex items-center gap-2 text-blue-500 text-sm">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                AI is responding...
              </div>
            )}
            
            {isAIDrawing && (
              <div className="flex items-center gap-2 text-purple-500 text-sm">
                <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
                AI is drawing on canvas...
              </div>
            )}
          </div>
          
          {/* Input area */}
          <div className="p-3 border-t border-gray-200">
            <div className="flex gap-2">
              <input
                type="text"
                value={currentUserMessage}
                onChange={(e) => setCurrentUserMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendUserMessage()}
                placeholder={isConnected ? "Type a message or just speak..." : "Connect to start..."}
                disabled={!isConnected}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
              <button
                onClick={sendUserMessage}
                disabled={!isConnected || !currentUserMessage.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300 text-sm"
              >
                Send
              </button>
            </div>
            
            <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
              <span className={`w-2 h-2 rounded-full ${isListening ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
              <span>{isListening ? 'Microphone active' : 'Microphone off'}</span>
              
              <span className="ml-auto">{frameRate} fps to AI</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealtimeAIWhiteboard;xx