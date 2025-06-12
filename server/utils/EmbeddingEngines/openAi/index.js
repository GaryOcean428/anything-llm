const { toChunks } = require("../../helpers");

class OpenAiEmbedder {
  constructor() {
    // Check for new environment variable first, then fallback to old one with deprecation warning
    const apiKey = process.env.OPENAI_API_KEY || process.env.OPEN_AI_KEY;
    if (!apiKey) throw new Error("No OpenAI API key was set.");
    
    // Show deprecation warning if using old environment variable
    if (!process.env.OPENAI_API_KEY && process.env.OPEN_AI_KEY) {
      console.warn(
        "[DEPRECATION WARNING] Environment variable 'OPEN_AI_KEY' is deprecated. " +
        "Please use 'OPENAI_API_KEY' instead. Support for 'OPEN_AI_KEY' will be removed in a future release."
      );
    }
    
    const { OpenAI: OpenAIApi } = require("openai");
    this.openai = new OpenAIApi({
      apiKey: apiKey,
    });
    this.model = process.env.EMBEDDING_MODEL_PREF || "text-embedding-ada-002";

    // Limit of how many strings we can process in a single pass to stay with resource or network limits
    this.maxConcurrentChunks = 500;

    // https://platform.openai.com/docs/guides/embeddings/embedding-models
    this.embeddingMaxChunkLength = 8_191;
  }

  log(text, ...args) {
    console.log(`\x1b[36m[OpenAiEmbedder]\x1b[0m ${text}`, ...args);
  }

  async embedTextInput(textInput) {
    const result = await this.embedChunks(
      Array.isArray(textInput) ? textInput : [textInput]
    );
    return result?.[0] || [];
  }

  async embedChunks(textChunks = []) {
    this.log(`Embedding ${textChunks.length} chunks...`);

    // Because there is a hard POST limit on how many chunks can be sent at once to OpenAI (~8mb)
    // we concurrently execute each max batch of text chunks possible.
    // Refer to constructor maxConcurrentChunks for more info.
    const embeddingRequests = [];
    for (const chunk of toChunks(textChunks, this.maxConcurrentChunks)) {
      embeddingRequests.push(
        new Promise((resolve) => {
          this.openai.embeddings
            .create({
              model: this.model,
              input: chunk,
            })
            .then((result) => {
              resolve({ data: result?.data, error: null });
            })
            .catch((e) => {
              e.type =
                e?.response?.data?.error?.code ||
                e?.response?.status ||
                "failed_to_embed";
              e.message = e?.response?.data?.error?.message || e.message;
              resolve({ data: [], error: e });
            });
        })
      );
    }

    const { data = [], error = null } = await Promise.all(
      embeddingRequests
    ).then((results) => {
      // If any errors were returned from OpenAI abort the entire sequence because the embeddings
      // will be incomplete.
      const errors = results
        .filter((res) => !!res.error)
        .map((res) => res.error)
        .flat();
      if (errors.length > 0) {
        let uniqueErrors = new Set();
        errors.map((error) =>
          uniqueErrors.add(`[${error.type}]: ${error.message}`)
        );

        return {
          data: [],
          error: Array.from(uniqueErrors).join(", "),
        };
      }
      return {
        data: results.map((res) => res?.data || []).flat(),
        error: null,
      };
    });

    if (!!error) throw new Error(`OpenAI Failed to embed: ${error}`);
    return data.length > 0 &&
      data.every((embd) => embd.hasOwnProperty("embedding"))
      ? data.map((embd) => embd.embedding)
      : null;
  }
}

module.exports = {
  OpenAiEmbedder,
};
