import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pinecone } from '@pinecone-database/pinecone';
import { PineconeStore } from '@langchain/pinecone';
import { OpenAIEmbeddings } from '@langchain/openai';

@Injectable()
export class VectorDbService {
  constructor(private readonly configService: ConfigService) {}

  async connectStore() {
    const apiKey = this.configService.get<string>('PINECONE_API_KEY');
    const indexName = this.configService.get<string>('PINECONE_INDEX');

    if (!apiKey || !indexName) {
      return null;
    }

    const pinecone = new Pinecone({ apiKey });
    const index = pinecone.Index(indexName);

    return PineconeStore.fromExistingIndex(new OpenAIEmbeddings(), {
      pineconeIndex: index,
      namespace: this.configService.get<string>('PINECONE_NAMESPACE') ?? 'prod'
    });
  }
}
