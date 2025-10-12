// Функции для работы с эмбеддингами
// Адаптированная версия из multi-bot проекта

export type TEmbeddingArray = number[];

export interface IFillEmbeddingsCore2Args<TIn> {
  getEmbeddingsFn: (texts: string[]) => Promise<(TEmbeddingArray | null)[]>;
  batchTokenLimit: number;
  tokenCounter?: (text: string) => number;
  textField?: keyof TIn & string; // defaults to 'text'
}

/**
 * Простой счетчик токенов (приблизительный)
 * Используем простую аппроксимацию: количество токенов = количество символов / 2
 * Это упрощение работает достаточно хорошо для большинства текстов
 */
export const estimateTokens = (text: string): number => text ? Math.ceil(text.length / 2) : 0;

/**
 * Генератор для обработки эмбеддингов пакетами
 * Позволяет обрабатывать большие объемы данных не превышая лимиты API
 */
export function fillEmbeddingsCore<TIn extends Record<string, any>> (
  args: IFillEmbeddingsCore2Args<TIn>,
) {
  const {
    getEmbeddingsFn,
    batchTokenLimit,
    tokenCounter = estimateTokens,
    textField = 'text',
  } = args;

  async function* run (
    source: AsyncIterable<TIn> | Iterable<TIn>,
  ): AsyncGenerator<TIn & { embedding: TEmbeddingArray | null }> {
    let batchItems: TIn[] = [];
    let batchTexts: string[] = [];
    let totalTokens = 0;

    const flush = async (): Promise<Array<TIn & { embedding: TEmbeddingArray | null }>> => {
      if (!batchItems.length) {
        return [];
      }

      const embeddings = await getEmbeddingsFn(batchTexts);
      const out = batchItems.map((item, i) => ({
        ...(item as any),
        embedding: (embeddings[i] as TEmbeddingArray) ?? null,
      }));

      // reset
      batchItems = [];
      batchTexts = [];
      totalTokens = 0;
      return out as Array<TIn & { embedding: TEmbeddingArray | null }>;
    };

    for await (const item of source as any) {
      const text = String(item[textField] ?? '');
      const tks = tokenCounter(text) || 0;

      if (tks > batchTokenLimit) {
        // too long: yield item with null embedding immediately
        yield { ...(item as any), embedding: null } as any;
      } else {
        if (totalTokens + tks > batchTokenLimit && totalTokens > 0) {
          const flushed = await flush();
          for (const o of flushed) {
            yield o;
          }
        }
        batchItems.push(item);
        batchTexts.push(text);
        totalTokens += tks;
      }
    }

    const flushed = await flush();
    for (const o of flushed) {
      yield o;
    }
  }

  return run;
}
