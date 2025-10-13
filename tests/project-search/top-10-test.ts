// Тест для проверки top 10 результатов векторного поиска
import { InMemoryVectorStore } from '../../src/domains/jira/tools/projects/search-project/in-memory-store.js';
import { ProjectVectorSearch } from '../../src/domains/jira/tools/projects/search-project/vector-search.js';
import { type TKeyName } from '../../src/types/index.js';

// Расширенный набор тестовых проектов включая реальные
const TEST_PROJECTS: TKeyName[] = [
  { key: 'AITEX', name: 'AI Текстильная промышленность' },
  { key: 'AITECH', name: 'Технологии искусственного интеллекта' },
  { key: 'TEXTECH', name: 'Textile Technology Solutions' },
  { key: 'TEXTILE', name: 'Текстильное производство' },
  { key: 'TECH', name: 'Технические решения' },
  { key: 'AI', name: 'Искусственный интеллект' },
  { key: 'ML', name: 'Машинное обучение' },
  { key: 'DATA', name: 'Обработка данных' },
  { key: 'AUTO', name: 'Автоматизация процессов' },
  { key: 'CLOUD', name: 'Cloud Infrastructure' },
  { key: 'MOBILE', name: 'Mobile Development Kit' },
  { key: 'WEB', name: 'Web Applications' },
  { key: 'API', name: 'API Gateway Service' },
  { key: 'SECURITY', name: 'Security Platform' },
  { key: 'MONITORING', name: 'Monitoring System' },
];

// Детерминированные моковые эмбеддинги
function createMockEmbeddings(texts: string[]): number[][] {
  return texts.map(text => {
    const embedding = new Array(1536).fill(0);
    let hash = 0;

    // Детерминированный хеш
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }

    // Создаем уникальный эмбеддинг
    for (let i = 0; i < 1536; i++) {
      embedding[i] = Math.sin(hash + i * 0.01) * 0.5 + 0.5;
    }

    return embedding;
  });
}

async function main() {
  try {
    console.log('🚀 TOP-10 Vector Search Test\n');

    const getEmbeddingsFn = async (texts: string[]) => {
      return createMockEmbeddings(texts);
    };

    // Создаем новую БД для чистого теста
    const vectorDB = new InMemoryVectorStore('./test-top10-vector-db');
    const vectorSearch = new ProjectVectorSearch(vectorDB, getEmbeddingsFn);

    console.log(`📊 Testing with ${TEST_PROJECTS.length} projects:`);
    TEST_PROJECTS.slice(0, 8).forEach(p => console.log(`  - ${p.key}: ${p.name}`));
    console.log(`  ... и ${TEST_PROJECTS.length - 8} других\n`);

    // Обновляем кеш
    await vectorSearch.updateProjectsCache(TEST_PROJECTS);

    const allKeys = await vectorDB.getAllProjectKeys();
    console.log(`✅ Loaded ${allKeys.length} projects into vector DB\n`);

    // Тестируемые запросы
    const testQueries = [
      'AITEX',
      'AITECH',
      'AI',
      'TEXTILE',
      'TECH',
      'DATA',
      'SECURITY',
      'PLATFORM',
      'SYSTEM',
      'SOLUTIONS'
    ];

    console.log('🔍 TOP-10 RESULTS FOR EACH QUERY:\n');

    for (const query of testQueries) {
      console.log(`═══════════════════════════════════════`);
      console.log(`🔎 Searching for: "${query}"`);
      console.log(`═══════════════════════════════════════`);

      try {
        const results = await vectorSearch.searchProjects(query, 10);

        if (results.length === 0) {
          console.log('❌ No results found\n');
          continue;
        }

        console.log(`Found ${results.length} results:`);
        results.forEach((result, index) => {
          const percentage = Math.round((result.score || 0) * 100);
          const scoreDisplay = (result.score || 0).toFixed(6);
          const key = result.key.padEnd(10);
          const name = result.name.padEnd(35);

          let matchType = '';
          if (result.key.toLowerCase() === query.toLowerCase()) {
            matchType = '🎯 EXACT KEY';
          } else if (result.name.toLowerCase().includes(query.toLowerCase())) {
            matchType = '📝 NAME MATCH';
          } else if (percentage >= 90) {
            matchType = '🔥 VERY HIGH';
          } else if (percentage >= 70) {
            matchType = '⚡ HIGH';
          } else if (percentage >= 50) {
            matchType = '👍 MEDIUM';
          } else {
            matchType = '💫 LOW';
          }

          console.log(`  ${index + 1}. ${key} ${name} ${scoreDisplay} (${percentage}%) ${matchType}`);
        });

        // Анализ результатов
        const exactMatch = results.find(r => r.key.toLowerCase() === query.toLowerCase());
        const nameMatch = results.find(r => r.name.toLowerCase().includes(query.toLowerCase()));
        const highScore = results.filter(r => (r.score || 0) >= 0.9).length;
        const mediumScore = results.filter(r => (r.score || 0) >= 0.7).length;

        console.log(`\n📊 Analysis:`);
        if (exactMatch) {
          console.log(`  ✅ Exact key match found: ${exactMatch.key}`);
        }
        if (nameMatch) {
          console.log(`  ✅ Name match found: ${nameMatch.name}`);
        }
        console.log(`  📈 High similarity (≥90%): ${highScore} results`);
        console.log(`  📊 Medium similarity (≥70%): ${mediumScore} results`);

      } catch (error) {
        console.log(`❌ Error searching for "${query}": ${(error as Error).message}`);
      }

      console.log('');
    }

    // Тест поиска похожих проектов
    console.log(`═══════════════════════════════════════`);
    console.log(`🔍 FINDING SIMILAR PROJECTS`);
    console.log(`═══════════════════════════════════════`);

    const similarityTests = [
      { from: 'AITEX', expect: 'AITECH' },
      { from: 'AITECH', expect: 'AITEX' },
      { from: 'AI', expect: 'ML' },
      { from: 'TEXTILE', expect: 'TEXTECH' }
    ];

    for (const test of similarityTests) {
      console.log(`\n🔗 Searching "${test.from}" -> expecting "${test.expect}":`);
      const results = await vectorSearch.searchProjects(test.from, 5);

      const found = results.find(r => r.key === test.expect);
      if (found) {
        const percentage = Math.round((found.score || 0) * 100);
        console.log(`  ✅ Found: ${found.key} (${percentage}% similarity)`);
      } else {
        console.log(`  ❌ Not found: ${test.expect}`);
        console.log(`  📋 Available results: ${results.map(r => r.key).join(', ')}`);
      }
    }

    console.log('\n✅ TOP-10 Test completed!');

  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
    console.error((error as Error).stack);
  }
}

main().catch(console.error);