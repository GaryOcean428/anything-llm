class GenericOpenAiTTS {
  constructor() {
    // Handle API key with backwards compatibility
    const apiKey = process.env.TTS_OPENAI_COMPATIBLE_KEY || process.env.TTS_OPEN_AI_COMPATIBLE_KEY;
    if (!apiKey) {
      this.#log(
        "No OpenAI compatible API key was set. You might need to set this to use your OpenAI compatible TTS service."
      );
    } else if (!process.env.TTS_OPENAI_COMPATIBLE_KEY && process.env.TTS_OPEN_AI_COMPATIBLE_KEY) {
      console.warn(
        "[DEPRECATION WARNING] Environment variable 'TTS_OPEN_AI_COMPATIBLE_KEY' is deprecated. " +
        "Please use 'TTS_OPENAI_COMPATIBLE_KEY' instead. Support for 'TTS_OPEN_AI_COMPATIBLE_KEY' will be removed in a future release."
      );
    }
    
    // Handle voice model with backwards compatibility
    const voiceModel = process.env.TTS_OPENAI_COMPATIBLE_VOICE_MODEL || process.env.TTS_OPEN_AI_COMPATIBLE_VOICE_MODEL;
    if (!voiceModel) {
      this.#log(
        "No OpenAI compatible voice model was set. We will use the default voice model 'alloy'. This may not exist for your selected endpoint."
      );
    } else if (!process.env.TTS_OPENAI_COMPATIBLE_VOICE_MODEL && process.env.TTS_OPEN_AI_COMPATIBLE_VOICE_MODEL) {
      console.warn(
        "[DEPRECATION WARNING] Environment variable 'TTS_OPEN_AI_COMPATIBLE_VOICE_MODEL' is deprecated. " +
        "Please use 'TTS_OPENAI_COMPATIBLE_VOICE_MODEL' instead. Support for 'TTS_OPEN_AI_COMPATIBLE_VOICE_MODEL' will be removed in a future release."
      );
    }
    
    // Handle endpoint with backwards compatibility
    const endpoint = process.env.TTS_OPENAI_COMPATIBLE_ENDPOINT || process.env.TTS_OPEN_AI_COMPATIBLE_ENDPOINT;
    if (!endpoint) {
      throw new Error(
        "No OpenAI compatible endpoint was set. Please set this to use your OpenAI compatible TTS service."
      );
    } else if (!process.env.TTS_OPENAI_COMPATIBLE_ENDPOINT && process.env.TTS_OPEN_AI_COMPATIBLE_ENDPOINT) {
      console.warn(
        "[DEPRECATION WARNING] Environment variable 'TTS_OPEN_AI_COMPATIBLE_ENDPOINT' is deprecated. " +
        "Please use 'TTS_OPENAI_COMPATIBLE_ENDPOINT' instead. Support for 'TTS_OPEN_AI_COMPATIBLE_ENDPOINT' will be removed in a future release."
      );
    }

    const { OpenAI: OpenAIApi } = require("openai");
    this.openai = new OpenAIApi({
      apiKey: apiKey || null,
      baseURL: endpoint,
    });
    this.voice = voiceModel ?? "alloy";
  }

  #log(text, ...args) {
    console.log(`\x1b[32m[OpenAiGenericTTS]\x1b[0m ${text}`, ...args);
  }

  /**
   * Generates a buffer from the given text input using the OpenAI compatible TTS service.
   * @param {string} textInput - The text to be converted to audio.
   * @returns {Promise<Buffer>} A buffer containing the audio data.
   */
  async ttsBuffer(textInput) {
    try {
      const result = await this.openai.audio.speech.create({
        model: "tts-1",
        voice: this.voice,
        input: textInput,
      });
      return Buffer.from(await result.arrayBuffer());
    } catch (e) {
      console.error(e);
    }
    return null;
  }
}

module.exports = {
  GenericOpenAiTTS,
};
