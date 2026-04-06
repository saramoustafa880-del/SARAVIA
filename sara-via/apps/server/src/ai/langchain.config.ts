import { ChatOpenAI } from '@langchain/openai';

export function createSaraModel() {
  return new ChatOpenAI({
    model: 'gpt-4o',
    temperature: 0.3,
    maxTokens: 1200
  });
}
