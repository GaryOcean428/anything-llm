class OpenAiTTS {
  constructor() {
    // Check for new environment variable first, then fallback to old one with deprecation warning
    const apiKey = process.env.TTS_OPENAI_API_KEY || process.env.TTS_OPEN_AI_KEY;
    if (!apiKey)
      throw new Error("No OpenAI API key was set.");
      
    // Show deprecation warning if using old environment variable
    if (!process.env.TTS_OPENAI_API_KEY && process.env.TTS_OPEN_AI_KEY) {
      console.warn(
        "[DEPRECATION WARNING] Environment variable 'TTS_OPEN_AI_KEY' is deprecated. " +
        "Please use 'TTS_OPENAI_API_KEY' instead. Support for 'TTS_OPEN_AI_KEY' will be removed in a future release."
      );
    }
    
    const { OpenAI: OpenAIApi } = require("openai");
    this.openai = new OpenAIApi({
      apiKey: apiKey,
    });
    
    // Handle voice model with backwards compatibility
    const voiceModel = process.env.TTS_OPENAI_VOICE_MODEL || process.env.TTS_OPEN_AI_VOICE_MODEL;
    if (!process.env.TTS_OPENAI_VOICE_MODEL && process.env.TTS_OPEN_AI_VOICE_MODEL) {
      console.warn(
        "[DEPRECATION WARNING] Environment variable 'TTS_OPEN_AI_VOICE_MODEL' is deprecated. " +
        "Please use 'TTS_OPENAI_VOICE_MODEL' instead. Support for 'TTS_OPEN_AI_VOICE_MODEL' will be removed in a future release."
      );
    }
    this.voice = voiceModel ?? "alloy";
  }

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
  OpenAiTTS,
};
