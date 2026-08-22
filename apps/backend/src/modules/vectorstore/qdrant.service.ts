import { QdrantClient } from '@qdrant/js-client-rest';
import { env } from '../../config/env';
import { embeddingService } from '../llm/embedding.service';

export interface VectorPoint {
  id: string;
  vector: number[];
  payload: {
    chunkId: string;
    repositoryId: string;
    filePath: string;
    symbolName?: string;
    symbolType?: string;
    code: string;
    startLine: number;
    endLine: number;
    summary: string;
  };
}

export interface SearchResult {
  score: number;
  payload: VectorPoint['payload'];
}

export class QdrantService {
  private client: QdrantClient;
  private collectionName = 'vocallab_code_chunks';
  private inMemoryIndex: VectorPoint[] = [];

  constructor() {
    this.client = new QdrantClient({ url: env.QDRANT_URL });
  }

  public async ensureCollection(): Promise<void> {
    try {
      const collections = await this.client.getCollections();
      const exists = collections.collections.some((c) => c.name === this.collectionName);

      if (!exists) {
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: 384,
            distance: 'Cosine',
          },
        });
        console.log(`[Qdrant] Created collection "${this.collectionName}"`);
      }
    } catch (err: any) {
      console.warn(`[Qdrant] Qdrant server offline at ${env.QDRANT_URL}: ${err.message}. Using In-Memory Vector Store.`);
    }
  }

  public async upsertPoints(points: VectorPoint[]): Promise<void> {
    // 1. Always append to fallback in-memory index
    points.forEach((p) => {
      const idx = this.inMemoryIndex.findIndex((exist) => exist.id === p.id);
      if (idx >= 0) this.inMemoryIndex[idx] = p;
      else this.inMemoryIndex.push(p);
    });

    // 2. Try pushing to Qdrant server
    try {
      await this.ensureCollection();
      await this.client.upsert(this.collectionName, {
        wait: true,
        points: points.map((p) => ({
          id: p.id,
          vector: p.vector,
          payload: p.payload,
        })),
      });
      console.log(`[Qdrant] Upserted ${points.length} points to Qdrant collection.`);
    } catch (err: any) {
      // In-memory fallback is active
    }
  }

  public async search(repositoryId: string, queryEmbedding: number[], limit = 6): Promise<SearchResult[]> {
    // Try Qdrant search
    try {
      const results = await this.client.search(this.collectionName, {
        vector: queryEmbedding,
        limit,
        filter: {
          must: [
            {
              key: 'repositoryId',
              match: { value: repositoryId },
            },
          ],
        },
      });

      if (results && results.length > 0) {
        return results.map((r) => ({
          score: r.score,
          payload: r.payload as any,
        }));
      }
    } catch (err) {
      // Qdrant search failed, use fallback
    }

    // In-memory fallback vector search
    const repoPoints = this.inMemoryIndex.filter((p) => p.payload.repositoryId === repositoryId);

    const scored = repoPoints.map((p) => {
      const score = embeddingService.cosineSimilarity(queryEmbedding, p.vector);
      return { score, payload: p.payload };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit);
  }
}

export const qdrantService = new QdrantService();
