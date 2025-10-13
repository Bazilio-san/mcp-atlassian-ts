// Максимально простой тест векторного поиска без OpenAI
import { InMemoryVectorStore } from '../../src/domains/jira/tools/projects/search-project/in-memory-store.js';
import { ProjectVectorSearch } from '../../src/domains/jira/tools/projects/search-project/vector-search.js';
import { type TKeyName } from '../../src/types/index.js';

// Тестовые проекты
const TEST_PROJECTS: TKeyName[] = [
  { key: 'AITEX', name: 'AI Текстильная промышленность' },
  { key: 'AITECH', name: 'Технологии искусственного интеллекта' },
  { key: 'TEXTILE', name: 'Текстильное производство' },
];

// Простая моковая функция эмбеддингов - создает детерминированные векторы
function createMockEmbeddings (texts: string[]): number[][] {
  console.log(`🔧 Creating mock embeddings for ${texts.length} texts`);

  return texts.map(text => {
    const embedding = new Array(1536).fill(0);
    let hash = 0;

    // Простой хеш текста
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }

    // Создаем уникальный эмбеддинг на основе хеша
    for (let i = 0; i < 1536; i++) {
      embedding[i] = Math.sin(hash + i * 0.1) * 0.5 + 0.5;
    }

    console.log(`  - "${text}" -> hash: ${hash}, first value: ${embedding[0].toFixed(4)}`);
    return embedding;
  });
}

async function main () {
  try {
    console.log('🚀 Starting simple vector test (no OpenAI)...\n');

    // Создаем функцию эмбеддингов
    const getEmbeddingsFn = async (texts: string[]) => {
      return createMockEmbeddings(texts);
    };

    // Создаем БД и поиск
    const vectorDB = new InMemoryVectorStore('./test-simple-vector-db');
    const vectorSearch = new ProjectVectorSearch(vectorDB, getEmbeddingsFn);

    console.log('📊 Test projects:');
    TEST_PROJECTS.forEach(p => console.log(`  - ${p.key}: ${p.name}`));
    console.log('');

    // Обновляем кеш
    console.log('🔄 Updating projects cache...');
    await vectorSearch.updateProjectsCache(TEST_PROJECTS);

    // Проверяем что сохранилось
    console.log('\n🔍 Checking vector DB contents:');
    const allKeys = await vectorDB.getAllProjectKeys();
    console.log(`Keys in DB: [${allKeys.join(', ')}]`);

    if (allKeys.length === 0) {
      console.log('❌ NO PROJECTS SAVED TO VECTOR DB!');
      return;
    }

    // Тестируем прямой поиск в БД
    console.log('\n🔬 Testing direct vector search:');
    const aitexEmbeddingArray = createMockEmbeddings(['AITEX']);
    const aitexEmbedding = aitexEmbeddingArray[0];
    console.log(`AITEX embedding created: ${aitexEmbedding?.length} dimensions`);

    const directResults = await vectorDB.search(aitexEmbedding!, 10, 0.0);
    console.log(`Direct search found ${directResults.length} results:`);
    directResults.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.key} - ${r.name} (score: ${r.score.toFixed(6)})`);
    });

    // Тестируем через ProjectVectorSearch
    console.log('\n🔍 Testing through ProjectVectorSearch:');

    console.log('\n1. Searching for "AITEX":');
    const results1 = await vectorSearch.searchProjects('AITEX', 7);
    console.log(`Found ${results1.length} results:`);
    results1.forEach((result, index) => {
      const percentage = Math.round((result.score || 0) * 100);
      console.log(`  ${index + 1}. ${result.key} (${result.name}) - ${(result.score || 0).toFixed(6)} (${percentage}%)`);
    });

    console.log('\n2. Searching for "AITECH":');
    const results2 = await vectorSearch.searchProjects('AITECH', 7);
    console.log(`Found ${results2.length} results:`);
    results2.forEach((result, index) => {
      const percentage = Math.round((result.score || 0) * 100);
      console.log(`  ${index + 1}. ${result.key} (${result.name}) - ${(result.score || 0).toFixed(6)} (${percentage}%)`);
    });

    console.log('\n3. Searching for "AI":');
    const results3 = await vectorSearch.searchProjects('AI', 7);
    console.log(`Found ${results3.length} results:`);
    results3.forEach((result, index) => {
      const percentage = Math.round((result.score || 0) * 100);
      console.log(`  ${index + 1}. ${result.key} (${result.name}) - ${(result.score || 0).toFixed(6)} (${percentage}%)`);
    });

    // Анализ результатов
    console.log('\n📊 Analysis:');

    const aitechInAitex = results1.find(r => r.key === 'AITECH');
    if (aitechInAitex) {
      const score = aitechInAitex.score || 0;
      const percentage = Math.round(score * 100);
      console.log(`✅ AITECH found when searching AITEX: ${percentage}% (score: ${score.toFixed(6)})`);

      if (percentage >= 50) {
        console.log('🎯 GOOD MATCH! Vector search is working properly');
      } else {
        console.log('⚠️ Low similarity score, but vector search is working');
      }
    } else {
      console.log('❌ AITECH NOT FOUND when searching AITEX');
    }

    console.log('\n✅ Simple vector test completed!');

  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
    console.error((error as Error).stack);
  }
}

main().catch(console.error);
