# План реализации векторного поиска для JIRA проектов

## 📋 Архитектура решения

### **1. Структура модулей**

```
src/
├── JiraBlueFindProjects/          # Модуль векторного поиска
│   ├── index.ts                   # Главный интерфейс модуля
│   ├── types.ts                   # Типы данных
│   ├── transliterate.ts          # Транслитерация RU↔EN
│   ├── embeddings.ts              # Работа с эмбеддингами
│   ├── openai-client.ts          # OpenAI API клиент
│   ├── vector-search.ts          # Основная логика поиска
│   └── lancedb-store.ts          # Векторная БД (LanceDB)
│
├── domains/jira/tools/projects/
│   └── jira_find_project.ts      # MCP инструмент (обновить)
│
├── bootstrap/
│   └── init-config.ts            # Конфигурация (обновлена)
│
└── types/
    └── config.d.ts               # Типы конфигурации (обновлены)
```

### **2. Ключевые компоненты**

**🔍 Векторный поиск с сохранением идеи вариаций:**

- **Вариации ключей**: KEY, key, кей (транслитерация)
- **Вариации имён**: Name, name, наме (транслитерация)
- **Обратная транслитерация**: AITECH → АИТЕЧ
- **Точное совпадение** имеет приоритет над векторным поиском

**💾 LanceDB как файловая БД:**

- Встраиваемая векторная БД
- Нативная TypeScript поддержка
- Хранит векторы в `./data/vector-store/`
- Поддержка косинусного расстояния
- Не требует внешних серверов

**🤖 OpenAI интеграция:**

- Модель: `text-embedding-3-large`
- Размерность: 256 (для экономии)
- Пакетная обработка через `fillEmbeddingsCore`
- Конфигурация через `config.yaml` или переменные окружения

### **3. Алгоритм работы**

#### **Инициализация** (при старте сервера):

```typescript
-Проверка
наличия
OpenAI
API
key
- Создание
OpenAI
клиента
- Инициализация
LanceDB
- Создание
ProjectVectorSearch
```

#### **Обновление индекса** (при получении проектов из JIRA):

```typescript
-Генерация
вариаций
для
каждого
проекта:
  *
Оригинальные
key
и
name
* Lowercase
версии
* Транслитерация
RU→EN
и
EN→RU
* Uppercase
версии
транслитераций
- Пакетная
генерация
эмбеддингов(batch
по
8000
токенов
)
-Сохранение
в
LanceDB
```

#### **Поиск проектов**:

```typescript
-Проверка
точного
совпадения
в
кеше(O(1))
- Если
не
найдено → векторный
поиск:
  *
Генерация
эмбеддинга
запроса
* Поиск
в
LanceDB(косинусное
расстояние
)
*
Фильтрация
по
threshold(0.7)
* Возврат
top - N
результатов
```

### **4. Интеграция в MCP инструмент**

Обновление `src/domains/jira/tools/projects/jira_find_project.ts`:

```typescript
import {
  initializeVectorSearch,
  searchProjects,
  isVectorSearchAvailable
} from '../../../JiraBlueFindProjects/index.js';

// В инструменте:
if (isVectorSearchAvailable()) {
  // Используем векторный поиск
  const results = await searchProjects(query, limit);
} else {
  // Fallback на простой поиск
  const results = simpleSearch(query);
}
```

## 📦 Необходимые зависимости

```json
{
  "dependencies": {
    "openai": "^4.58.0", // OpenAI API клиент
    "vectordb": "^0.4.20"       // LanceDB для TypeScript
  }
}
```

**Примечание**: Подсчёт токенов реализован через простую аппроксимацию (количество символов / 2), без внешних зависимостей.

## ⚙️ Конфигурация

### **config.yaml:**

```yaml
openai:
  apiKey: sk-...            # OpenAI API key
  baseURL: https://...      # Опционально: custom endpoint
  model: text-embedding-3-large
  dimensions: 256           # Размерность векторов

jira:
  # ... существующая конфигурация ...
  vectorSearch:
    enabled: true
    threshold: 0.7          # Порог косинусного расстояния
    cacheHours: 1           # TTL кеша проектов
```

### **Переменные окружения:**

```bash
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://...  # Опционально
OPENAI_MODEL=text-embedding-3-large
OPENAI_DIMENSIONS=256
```

## 🚀 Этапы внедрения

### **Этап 1: Установка зависимостей**

```bash
npm install openai vectordb
```

### **Этап 2: Интеграция в существующий инструмент**

- Обновить `jira_find_project.ts`
- Добавить инициализацию при старте
- Добавить обновление индекса при загрузке проектов

### **Этап 3: Тестирование**

- Проверка точного поиска
- Проверка нечёткого поиска
- Проверка транслитерации
- Проверка производительности

## ✅ Преимущества решения

1. **Сохранение оригинальной идеи**: Все вариации написания (как в multi-bot)
2. **Файловая БД**: LanceDB не требует внешних серверов
3. **Оптимальная пакетная обработка**: Как в оригинале через `fillEmbeddingsCore`
4. **Graceful degradation**: Работает и без OpenAI (fallback)
5. **Минимальные изменения**: Интегрируется в существующий код
6. **Производительность**: Кеширование + векторный индекс

## ⚠️ Важные моменты

1. **OpenAI API key обязателен** для векторного поиска
2. **Первая индексация** может занять время (зависит от количества проектов)
3. **Размер БД**: ~1-2 MB на 100 проектов с вариациями
4. **Обновление индекса**: Автоматически при обновлении кеша проектов

## 🔧 API использования

### Инициализация

```typescript
import { initializeVectorSearch } from './JiraBlueFindProjects/index.js';

// При старте приложения
const vectorSearch = await initializeVectorSearch();
```

### Обновление индекса

```typescript
import { updateProjectsIndex } from './JiraBlueFindProjects/index.js';

// При получении проектов из JIRA
const projects = await jiraClient.getProjects();
await updateProjectsIndex(projects);
```

### Поиск проектов

```typescript
import { searchProjects } from './JiraBlueFindProjects/index.js';

// Поиск по запросу
const results = await searchProjects('aitech', 5);
// Возвращает: [{ key: 'AITECH', name: 'AI Tech Platform', score: 0.96, issueTypes: [...] }]

// Wildcard поиск (все проекты)
const allProjects = await searchProjects('*');
```

### Проверка доступности

```typescript
import { isVectorSearchAvailable } from './JiraBlueFindProjects/index.js';

if (isVectorSearchAvailable()) {
  // Векторный поиск доступен
} else {
  // Используем fallback
}
```

## 📊 Метрики производительности

- **Индексация**: ~100 проектов за 5-10 секунд
- **Поиск**: <100ms для 1000 проектов
- **Память**: ~50MB для 1000 проектов с вариациями
- **Размер БД**: ~10MB для 1000 проектов

## 🐛 Отладка

### Логирование

```typescript
// Включить debug логи
process.env.LOG_LEVEL = 'debug';

// Логи будут показывать:
// - Инициализацию векторного поиска
// - Обновления индекса
// - Результаты поиска
// - Ошибки OpenAI API
```

### Проверка конфигурации

```typescript
import { appConfig } from './bootstrap/init-config.js';

console.log('OpenAI configured:', !!appConfig.openai?.apiKey);
console.log('Model:', appConfig.openai?.model);
console.log('Dimensions:', appConfig.openai?.dimensions);
```

## 📚 Дополнительные материалы

- [LanceDB Documentation](https://lancedb.github.io/lancedb/)
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
- [Cosine Similarity Explained](https://en.wikipedia.org/wiki/Cosine_similarity)
