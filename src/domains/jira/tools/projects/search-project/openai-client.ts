// OpenAI клиент для генерации эмбеддингов
// Адаптировано из multi-bot проекта

import OpenAI from 'openai';
import type { EmbeddingCreateParams } from 'openai/resources';

// Конфигурация моделей эмбеддингов
export const EMBEDDING_MODELS = {
  DEFAULT: {
    model: 'text-embedding-3-large',
    dimensions: 1536,
  },
  SMALL: {
    model: 'text-embedding-3-large',
    dimensions: 1536,  // Установили 1536 для чистоты эксперимента
  },
};

export interface IEmbeddingResult {
  embeddings: (number[] | null)[];
  totalTokens: number;
  model: string;
}

/**
 * Создание OpenAI клиента с конфигурацией
 */
export function createOpenAIClient (apiKey: string, baseURL?: string): OpenAI {
  if (!apiKey) {
    throw new Error('OpenAI API key is required');
  }

  return new OpenAI({
    apiKey,
    ...(baseURL && { baseURL }),
  });
}

/**
 * Получение эмбеддингов для массива текстов
 * Поддерживает пакетную обработку
 */
export async function getEmbeddings (
  client: OpenAI,
  texts: string[],
  model = EMBEDDING_MODELS.DEFAULT.model,
  dimensions = EMBEDDING_MODELS.DEFAULT.dimensions,
): Promise<IEmbeddingResult> {
  if (!texts.length) {
    return {
      embeddings: [],
      totalTokens: 0,
      model,
    };
  }

  // Фильтруем пустые строки
  const validTexts = texts.map(t => t?.trim()).filter(Boolean);
  if (!validTexts.length) {
    return {
      embeddings: texts.map(() => null),
      totalTokens: 0,
      model,
    };
  }

  const params: EmbeddingCreateParams = {
    input: validTexts,
    model,
    dimensions,
    encoding_format: 'float',
  };

  try {
    const response = await client.embeddings.create(params);

    // Создаем массив эмбеддингов в исходном порядке
    const embeddingsMap = new Map<number, number[]>();
    response.data.forEach(item => {
      embeddingsMap.set(item.index, item.embedding);
    });

    const embeddings: (number[] | null)[] = [];
    let validIndex = 0;
    for (let i = 0; i < texts.length; i++) {
      if (texts[i]?.trim()) {
        embeddings.push(embeddingsMap.get(validIndex) || null);
        validIndex++;
      } else {
        embeddings.push(null);
      }
    }

    return {
      embeddings,
      totalTokens: response.usage?.total_tokens || 0,
      model,
    };
  } catch (error) {
    console.error('Error creating embeddings:', error);
    // В случае ошибки возвращаем null для всех текстов
    return {
      embeddings: texts.map(() => null),
      totalTokens: 0,
      model,
    };
  }
}
