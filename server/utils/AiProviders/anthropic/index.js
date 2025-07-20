const { v4 } = require("uuid");
const {
  writeResponseChunk,
  clientAbortedHandler,
  formatChatHistory,
} = require("../../helpers/chat/responses");
const { NativeEmbedder } = require("../../EmbeddingEngines/native");
const { MODEL_MAP } = require("../modelMap");
const {
  LLMPerformanceMonitor,
} = require("../../helpers/chat/LLMPerformanceMonitor");

class AnthropicLLM {
  constructor(embedder = null, modelPreference = null) {
    if (!process.env.ANTHROPIC_API_KEY)
      throw new Error("No Anthropic API key was set.");

    // Docs: https://www.npmjs.com/package/@anthropic-ai/sdk
    const AnthropicAI = require("@anthropic-ai/sdk");
    const anthropic = new AnthropicAI({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    this.anthropic = anthropic;
    this.model =
      modelPreference ||
      process.env.ANTHROPIC_MODEL_PREF ||
      "claude-4-sonnet-20250514";
    this.limits = {
      history: this.promptWindowLimit() * 0.15,
      system: this.promptWindowLimit() * 0.15,
      user: this.promptWindowLimit() * 0.7,
    };

    this.embedder = embedder ?? new NativeEmbedder();
    this.defaultTemp = 0.7;
    this.log(`Initialized with ${this.model}`);
  }

  log(text, ...args) {
    console.log(`\x1b[36m[${this.constructor.name}]\x1b[0m ${text}`, ...args);
  }

  streamingEnabled() {
    return "streamGetChatCompletion" in this;
  }

  /**
   * Get the maximum output tokens for the current model
   * @returns {number} - Maximum output tokens supported by the model
   */
  getMaxOutputTokens() {
    // Claude 4 Opus supports 32K output tokens
    if (this.model.includes("claude-4-opus")) {
      return 32000;
    }
    
    // Claude 3.5 and newer models generally support 8K tokens
    if (this.model.includes("claude-3-5") || this.model.includes("claude-3-7")) {
      return 8192;
    }
    
    // Older models default to 4K
    return 4096;
  }

  static promptWindowLimit(modelName) {
    return MODEL_MAP.get("anthropic", modelName) ?? 100_000;
  }

  promptWindowLimit() {
    return MODEL_MAP.get("anthropic", this.model) ?? 100_000;
  }

  /**
   * Determines the maximum output tokens for a model.
   * Claude 4 models support 64K output tokens, others default to 4096.
   * @param {string} modelName - The model name
   * @returns {number} - The maximum output tokens
   */
  getMaxOutputTokens(modelName = null) {
    const model = modelName || this.model;
    // Claude 4 models support 64K output tokens
    if (model.includes("claude-4")) {
      return 64000;
    }
    // Default for other models
    return 4096;
  }

  isValidChatCompletionModel(_modelName = "") {
    return true;
  }

  /**
   * Get the maximum output tokens for a given model
   * @param {string} modelName - The model name
   * @returns {number} - The maximum output tokens for the model
   */
  static getMaxOutputTokens(modelName) {
    // Claude 3.5 Haiku supports up to 8,192 output tokens
    if (modelName === "claude-3-5-haiku-20241022" || modelName === "claude-3-5-haiku-latest") {
      return 8192;
    }
    // Other Claude models use the default 4096 tokens
    return 4096;
  }

  /**
   * Get the maximum output tokens for the current model instance
   * @returns {number} - The maximum output tokens for the current model
   */
  getMaxOutputTokens() {
    return AnthropicLLM.getMaxOutputTokens(this.model);
  }

  /**
   * Generates appropriate content array for a message + attachments.
   * @param {{userPrompt:string, attachments: import("../../helpers").Attachment[]}}
   * @returns {string|object[]}
   */
  #generateContent({ userPrompt, attachments = [] }) {
    if (!attachments.length) {
      return userPrompt;
    }

    const content = [{ type: "text", text: userPrompt }];
    for (let attachment of attachments) {
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: attachment.mime,
          data: attachment.contentString.split("base64,")[1],
        },
      });
    }
    return content.flat();
  }

  constructPrompt({
    systemPrompt = "",
    contextTexts = [],
    chatHistory = [],
    userPrompt = "",
    attachments = [], // This is the specific attachment for only this prompt
  }) {
    const prompt = {
      role: "system",
      content: `${systemPrompt}${this.#appendContext(contextTexts)}`,
    };

    return [
      prompt,
      ...formatChatHistory(chatHistory, this.#generateContent),
      {
        role: "user",
        content: this.#generateContent({ userPrompt, attachments }),
      },
    ];
  }

  async getChatCompletion(messages = null, { temperature = 0.7 }) {
    try {
      const result = await LLMPerformanceMonitor.measureAsyncFunction(
        this.anthropic.messages.create({
          model: this.model,
          max_tokens: this.getMaxOutputTokens(),
          system: messages[0].content, // Strip out the system message
          messages: messages.slice(1), // Pop off the system message
          temperature: Number(temperature ?? this.defaultTemp),
        })
      );

      const promptTokens = result.output.usage.input_tokens;
      const completionTokens = result.output.usage.output_tokens;
      return {
        textResponse: result.output.content[0].text,
        metrics: {
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: promptTokens + completionTokens,
          outputTps: completionTokens / result.duration,
          duration: result.duration,
        },
      };
    } catch (error) {
      console.log(error);
      return { textResponse: error, metrics: {} };
    }
  }

  async streamGetChatCompletion(messages = null, { temperature = 0.7 }) {
    const measuredStreamRequest = await LLMPerformanceMonitor.measureStream(
      this.anthropic.messages.stream({
        model: this.model,
        max_tokens: this.getMaxOutputTokens(),
        system: messages[0].content, // Strip out the system message
        messages: messages.slice(1), // Pop off the system message
        temperature: Number(temperature ?? this.defaultTemp),
      }),
      messages,
      false
    );

    return measuredStreamRequest;
  }

  /**
   * Handles the stream response from the Anthropic API.
   * @param {Object} response - the response object
   * @param {import('../../helpers/chat/LLMPerformanceMonitor').MonitoredStream} stream - the stream response from the Anthropic API w/tracking
   * @param {Object} responseProps - the response properties
   * @returns {Promise<string>}
   */
  handleStream(response, stream, responseProps) {
    return new Promise((resolve) => {
      let fullText = "";
      const { uuid = v4(), sources = [] } = responseProps;
      let usage = {
        prompt_tokens: 0,
        completion_tokens: 0,
      };

      // Establish listener to early-abort a streaming response
      // in case things go sideways or the user does not like the response.
      // We preserve the generated text but continue as if chat was completed
      // to preserve previously generated content.
      const handleAbort = () => {
        stream?.endMeasurement(usage);
        clientAbortedHandler(resolve, fullText);
      };
      response.on("close", handleAbort);

      stream.on("error", (event) => {
        const parseErrorMsg = (event) => {
          const error = event?.error?.error;
          if (!!error)
            return `Anthropic Error:${error?.type || "unknown"} ${
              error?.message || "unknown error."
            }`;
          return event.message;
        };

        writeResponseChunk(response, {
          uuid,
          sources: [],
          type: "abort",
          textResponse: null,
          close: true,
          error: parseErrorMsg(event),
        });
        response.removeListener("close", handleAbort);
        stream?.endMeasurement(usage);
        resolve(fullText);
      });

      stream.on("streamEvent", (message) => {
        const data = message;

        if (data.type === "message_start")
          usage.prompt_tokens = data?.message?.usage?.input_tokens;
        if (data.type === "message_delta")
          usage.completion_tokens = data?.usage?.output_tokens;

        if (
          data.type === "content_block_delta" &&
          data.delta.type === "text_delta"
        ) {
          const text = data.delta.text;
          fullText += text;

          writeResponseChunk(response, {
            uuid,
            sources,
            type: "textResponseChunk",
            textResponse: text,
            close: false,
            error: false,
          });
        }

        if (
          message.type === "message_stop" ||
          (data.stop_reason && data.stop_reason === "end_turn")
        ) {
          writeResponseChunk(response, {
            uuid,
            sources,
            type: "textResponseChunk",
            textResponse: "",
            close: true,
            error: false,
          });
          response.removeListener("close", handleAbort);
          stream?.endMeasurement(usage);
          resolve(fullText);
        }
      });
    });
  }

  #appendContext(contextTexts = []) {
    if (!contextTexts || !contextTexts.length) return "";
    return (
      "\nContext:\n" +
      contextTexts
        .map((text, i) => {
          return `[CONTEXT ${i}]:\n${text}\n[END CONTEXT ${i}]\n\n`;
        })
        .join("")
    );
  }

  async compressMessages(promptArgs = {}, rawHistory = []) {
    const { messageStringCompressor } = require("../../helpers/chat");
    const compressedPrompt = await messageStringCompressor(
      this,
      promptArgs,
      rawHistory
    );
    return compressedPrompt;
  }

  // Simple wrapper for dynamic embedder & normalize interface for all LLM implementations
  async embedTextInput(textInput) {
    return await this.embedder.embedTextInput(textInput);
  }
  async embedChunks(textChunks = []) {
    return await this.embedder.embedChunks(textChunks);
  }
}

module.exports = {
  AnthropicLLM,
};
