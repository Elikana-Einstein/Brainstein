import { useEffect, useState } from "react";
import useStore from "../zustand/store";

const ChatInterface = () => {
  const { ChatHistory } = useStore();
  const [typingMessage, setTypingMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Animation logic synced to ChatHistory
  useEffect(() => {
    const lastEntry = ChatHistory[ChatHistory.length - 1];
    
    // Only trigger if the latest message has an 'ai' response
    if (lastEntry && lastEntry.ai) {
      setIsTyping(true);
      let i = 0;
      const fullText = lastEntry.ai;
      
      const typingInterval = setInterval(() => {
        if (i < fullText.length) {
          setTypingMessage(fullText.substring(0, i + 1));
          i++;
        } else {
          clearInterval(typingInterval);
          setIsTyping(false);
        }
      }, 30); // 30ms for a snappier feel

      return () => clearInterval(typingInterval);
    }
  }, [ChatHistory]);

  return (
    <div className="flex flex-col  bg-slate-900 h-[90%] ">
      <div className="flex-1 overflow-y-scroll no-scrollbars p-4 space-y-4">
        {ChatHistory.map((entry, index) => {
          const isLast = index === ChatHistory.length - 1;
          
          return (
            <div key={index} className="flex flex-col space-y-2">
              {/* 1. User Message (Right Side) */}
              {entry.user && (
                <div className="flex justify-end">
                  <div className="bg-blue-600 text-white rounded-2xl rounded-tr-none px-4 py-2 max-w-[80%] shadow-md">
                    <p>{entry.user}</p>
                  </div>
                </div>
              )}

              {/* 2. AI Message (Left Side) */}
              {entry.ai && (
                <div className="flex justify-start items-start space-x-2">
                  <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold text-white">
                    AI
                  </div>
                  <div className="bg-gray-700 text-gray-100 rounded-2xl rounded-tl-none px-4 py-2 max-w-[80%] shadow-md">
                    <p>
                      {isLast && isTyping ? typingMessage : entry.ai}
                      {isLast && isTyping && (
                        <span className="inline-block w-1 h-4 ml-1 bg-blue-400 animate-pulse" />
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ChatInterface