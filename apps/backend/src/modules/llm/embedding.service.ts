import { env } from '../../config/env';

export class EmbeddingService {
  private dimension = 384;

  public async generateEmbedding(text: string): Promise<number[]> {
    // 1. Try Ollama if reachable
    try {
      const response = await fetch(`${env.OLLAMA_URL}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'nomic-embed-text',
          prompt: text,
        }),
      });

      if (response.ok) {
        const data: any = await response.json();
        if (data.embedding && Array.isArray(data.embedding)) {
          return data.embedding;
        }
      }
    } catch (err) {
      // Ollama not reachable, fall through
    }

    // 2. Try OpenAI if API key present
    if (env.OPENAI_API_KEY) {
      try {
        const response = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: text.slice(0, 8000),
          }),
        });

        if (response.ok) {
          const data: any = await response.json();
          if (data.data && data.data[0]?.embedding) {
            return data.data[0].embedding;
          }
        }
      } catch (err) {
        // Fall through
      }
    }

    // 3. Fallback Deterministic Context Embedding (384 dimensions)
    return this.fallbackEmbedding(text);
  }

  private fallbackEmbedding(text: string): number[] {
    const vector = new Array(this.dimension).fill(0);
    const clean = text.toLowerCase().replace(/[^a-z0-9]/g, ' ');
    const tokens = clean.split(/\s+/).filter(Boolean);

    tokens.forEach((token, index) => {
      let hash = 0;
      for (let i = 0; i < token.length; i++) {
        hash = (hash << 5) - hash + token.charCodeAt(i);
        hash |= 0;
      }
      const targetIdx = Math.abs(hash) % this.dimension;
      const weight = 1 / (1 + index * 0.05);
      vector[targetIdx] += weight;
    });

    // Normalize L2 norm
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0)) || 1;
    return vector.map((v) => v / magnitude);
  }

  public cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    const len = Math.min(a.length, b.length);

    for (let i = 0; i < len; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

export const embeddingService = new EmbeddingService();
