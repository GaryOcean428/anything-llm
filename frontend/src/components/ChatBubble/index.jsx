import React from "react";
import UserIcon from "../UserIcon";
import { userFromStorage } from "@/utils/request";
import renderMarkdown from "@/utils/chat/markdown";

export default function ChatBubble({ fullText, type, purify }) {
  const isUser = type === "user";

  return (
    <div
      className={`flex justify-center items-end w-full bg-theme-bg-secondary`}
      data-testid="chat-bubble"
    >
      <div className={`py-8 px-4 w-full flex gap-x-5 md:max-w-[80%] flex-col`}>
        <div className="flex gap-x-5">
          <UserIcon
            user={{ uid: isUser ? userFromStorage()?.username : "system" }}
            role={type}
          />

          <div
            className={`markdown whitespace-pre-line text-white font-normal text-sm md:text-sm flex flex-col gap-y-1 mt-2`}
            dangerouslySetInnerHTML={{
              __html: purify.sanitize(renderMarkdown(fullText || "")),
            }}
            data-testid="chat-bubble-content"
          />
        </div>
      </div>
    </div>
  );
}
