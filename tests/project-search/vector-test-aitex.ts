// Прямой тест векторного поиска для AITEX/AITECH
import { InMemoryVectorStore } from '../../src/domains/jira/tools/projects/search-project/in-memory-store.js';
import { ProjectVectorSearch } from '../../src/domains/jira/tools/projects/search-project/vector-search.js';
import { createOpenAIClient, getEmbeddings, EMBEDDING_MODELS } from '../../src/domains/jira/tools/projects/search-project/openai-client.js';
import { type TKeyName } from '../../src/types/index.js';

// Тестовые проекты включающие AITECH
const TEST_PROJECTS: TKeyName[] = [
  { key: 'AITEX', name: 'AI Текстильная промышленность' },
  { key: 'AITECH', name: 'Технологии искусственного интеллекта' },
  { key: 'TEXTILE', name: 'Текстильное производство' },
  { key: 'TECH', name: 'Технические решения' },
  { key: 'AUTO', name: 'Автоматизация процессов' },
  { key: 'DATA', name: 'Обработка данных' },
  { key: 'AI', name: 'Искусственный интеллект' },
  { key: 'ML', name: 'Машинное обучение' },
];

async function main () {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY не установлен');
    process.exit(1);
  }

  try {
    console.log('🔧 Инициализация векторного поиска...\n');

    // Создаем OpenAI клиент
    const openaiClient = createOpenAIClient(apiKey);

    // Создаем функцию для получения эмбеддингов с dimensions 1536
    // ЗАМОК ДЛЯ ТЕСТА: создаем простые эмбеддинги на основе хеша текста
    const getEmbeddingsFn = async (texts: string[]) => {
      try {
        const result = await getEmbeddings(
          openaiClient,
          texts,
          EMBEDDING_MODELS.DEFAULT.model,
          1536  // Устанавливаем dimensions в 1536
        );
        return result.embeddings;
      } catch (error) {
        console.log('🔧 OpenAI API недоступен, используем моковые эмбеддинги');
        // Создаем простые моковые эмбеддинги на основе текста
        return texts.map(text => {
          const embedding = new Array(1536).fill(0);
          // Используем хеш текста для создания уникальных эмбеддингов
          let hash = 0;
          for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 32-bit integer
          }
          // Распределяем хеш по эмбеддингу
          for (let i = 0; i < 1536; i++) {
            embedding[i] = Math.sin(hash + i) * 0.5 + 0.5;
          }
          return embedding;
        });
      }
    };

    // Создаем in-memory векторную БД и поисковик
    const vectorDB = new InMemoryVectorStore('./test-vector-db');
    const vectorSearch = new ProjectVectorSearch(vectorDB, getEmbeddingsFn);

    console.log('📊 Загрузка тестовых проектов...');
    console.log('Проекты:');
    TEST_PROJECTS.forEach(p => console.log(`  - ${p.key}: ${p.name}`));
    console.log('');

    // Обновляем кеш и векторную БД
    await vectorSearch.updateProjectsCache(TEST_PROJECTS);

    // Проверим, что сохранилось в БД
    console.log('\n🔍 Проверка содержимого векторной БД:');
    const allKeys = await vectorDB.getAllProjectKeys();
    console.log(`Ключи в БД: ${allKeys}`);

    if (allKeys.length > 0) {
      // Тестируем прямой поиск в БД
      const [aitechEmbedding] = await getEmbeddingsFn(['AITEX']);
      if (aitechEmbedding) {
        const directResults = await vectorDB.search(aitechEmbedding, 10, 0.0);
        console.log(`Прямой поиск в БД для AITEX: ${directResults.length} результатов`);
        directResults.forEach((r, i) => {
          console.log(`  ${i + 1}. ${r.key} - ${r.name} (score: ${r.score.toFixed(4)})`);
        });
      }
    }

    console.log('\n🔍 Тестирование поиска "AITEX":');
    const results = await vectorSearch.searchProjects('AITEX', 7);

    if (results.length === 0) {
      console.log('❌ НЕ НАЙДЕНО РЕЗУЛЬТАТОВ!');
      console.log('   Это указывает на проблему в векторном поиске.');
    } else {
      console.log(`✅ Найдено ${results.length} результатов:`);
      results.forEach((result, index) => {
        const percentage = Math.round((result.score || 0) * 100);
        console.log(`  ${index + 1}. ${result.key} (${result.name}) - ${(result.score || 0).toFixed(4)} (${percentage}%)`);
      });

      // Проверяем есть ли AITECH в результатах
      const aitechResult = results.find(r => r.key === 'AITECH');
      if (aitechResult) {
        const percentage = Math.round((aitechResult.score || 0) * 100);
        console.log(`\n🎯 AITECH найден с точностью ${percentage}% (score: ${(aitechResult.score || 0).toFixed(4)})`);
        if (percentage >= 67) {
          console.log('✅ Точность >= 67% - соответствует ожиданиям!');
        } else {
          console.log('⚠️ Точность < 67% - ниже ожидаемого');
        }
      } else {
        console.log('\n❌ AITECH НЕ НАЙДЕН в результатах поиска!');
        console.log('   Ожидался матч с ~67% точности');
      }
    }

    console.log('\n🔍 Дополнительный тест поиска "AITECH":');
    const aitechResults = await vectorSearch.searchProjects('AITECH', 7);

    if (aitechResults.length > 0) {
      console.log(`✅ Найдено ${aitechResults.length} результатов для "AITECH":`);
      aitechResults.forEach((result, index) => {
        const percentage = Math.round((result.score || 0) * 100);
        console.log(`  ${index + 1}. ${result.key} (${result.name}) - ${(result.score || 0).toFixed(4)} (${percentage}%)`);
      });
    } else {
      console.log('❌ НЕ НАЙДЕНО РЕЗУЛЬТАТОВ для "AITECH"!');
    }

  } catch (error) {
    console.error('❌ Ошибка:', (error as Error).message);
    console.error((error as Error).stack);
    process.exit(1);
  }
}

main().catch(console.error);