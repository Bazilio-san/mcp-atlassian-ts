#!/usr/bin/env node

import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import https from 'https';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Simple script to get Atlassian MCP tools with auth
 */

async function getToken() {
  if (process.env.ATLASSIAN_ACCESS_TOKEN) {
    return process.env.ATLASSIAN_ACCESS_TOKEN;
  }

  if (process.env.ATLASSIAN_API_TOKEN) {
    return process.env.ATLASSIAN_API_TOKEN;
  }

  console.log('\n📋 Для получения API токена Atlassian:');
  console.log('1. Откройте https://id.atlassian.com/manage-profile/security/api-tokens');
  console.log('2. Нажмите "Create API token"');
  console.log('3. Дайте токену имя и скопируйте его');
  console.log('\nИли установите переменную окружения:');
  console.log('SET ATLASSIAN_ACCESS_TOKEN=your_token_here (Windows)');
  console.log('export ATLASSIAN_ACCESS_TOKEN=your_token_here (Linux/Mac)\n');

  const rl = readline.createInterface({ input, output });
  const token = await rl.question('Введите ваш Atlassian API token: ');
  rl.close();

  return token.trim();
}

async function fetchWithSSE(token) {
  console.log('\nПодключение к Atlassian MCP серверу...');

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'mcp.atlassian.com',
      path: '/v1/sse',
      headers: {
        'Accept': 'text/event-stream',
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'User-Agent': 'MCP-Client/1.0'
      }
    };

    const req = https.get(options, (res) => {
      console.log('Статус:', res.statusCode);

      if (res.statusCode === 401) {
        reject(new Error('Ошибка аутентификации. Проверьте токен.'));
        return;
      }

      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        return;
      }

      console.log('Успешное подключение! Получение данных...');

      let buffer = '';
      const tools = [];
      let serverInfo = null;
      let messageCount = 0;

      // Timeout для закрытия соединения после получения данных
      let dataTimeout = setTimeout(() => {
        console.log('Получено сообщений:', messageCount);
        console.log('Инструментов найдено:', tools.length);
        res.destroy();
        resolve({ tools, serverInfo });
      }, 10000); // 10 секунд ожидания

      res.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');

        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i].trim();

          if (line.startsWith('event:')) {
            const eventType = line.substring(6).trim();
            console.log('Event type:', eventType);
          }

          if (line.startsWith('data:')) {
            messageCount++;
            const data = line.substring(5).trim();

            if (data === '[DONE]') {
              console.log('Получен сигнал завершения');
              clearTimeout(dataTimeout);
              res.destroy();
              resolve({ tools, serverInfo });
              return;
            }

            try {
              const json = JSON.parse(data);

              // Различные форматы ответов
              if (json.result?.tools) {
                tools.push(...json.result.tools);
                console.log(`Получено ${json.result.tools.length} инструментов`);
              } else if (json.tools) {
                tools.push(...json.tools);
                console.log(`Получено ${json.tools.length} инструментов`);
              } else if (json.params?.tools) {
                tools.push(...json.params.tools);
                console.log(`Получено ${json.params.tools.length} инструментов`);
              } else if (json.serverInfo) {
                serverInfo = json.serverInfo;
                console.log('Server info:', serverInfo);
              } else if (json.method) {
                console.log('Method:', json.method);
              }

              // Если это инструмент
              if (json.name && json.inputSchema) {
                tools.push(json);
                console.log(`Добавлен инструмент: ${json.name}`);
              }
            } catch (e) {
              // Не JSON данные
              if (data.length < 100) {
                console.log('Non-JSON data:', data);
              }
            }

            // Сброс таймаута при получении данных
            clearTimeout(dataTimeout);
            dataTimeout = setTimeout(() => {
              console.log('Завершение по таймауту. Получено инструментов:', tools.length);
              res.destroy();
              resolve({ tools, serverInfo });
            }, 5000);
          }
        }

        buffer = lines[lines.length - 1];
      });

      res.on('end', () => {
        clearTimeout(dataTimeout);
        console.log('Соединение закрыто');
        resolve({ tools, serverInfo });
      });

      res.on('error', (err) => {
        clearTimeout(dataTimeout);
        reject(err);
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function saveResults(tools, serverInfo) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonFile = path.join(__dirname, `atlassian-tools-${timestamp}.json`);

  const data = {
    timestamp: new Date().toISOString(),
    serverUrl: 'https://mcp.atlassian.com/v1/sse',
    serverInfo,
    toolCount: tools.length,
    tools
  };

  await fs.writeFile(jsonFile, JSON.stringify(data, null, 2), 'utf8');
  console.log(`\n✅ Сохранено в: ${jsonFile}`);

  // Создание краткой сводки
  if (tools.length > 0) {
    const summaryFile = path.join(__dirname, `atlassian-tools-summary-${timestamp}.txt`);
    let summary = `Atlassian MCP Tools
Дата: ${new Date().toISOString()}
Всего инструментов: ${tools.length}

Список инструментов:
`;

    tools.forEach((tool, i) => {
      summary += `${i + 1}. ${tool.name}\n`;
      if (tool.description) {
        summary += `   ${tool.description}\n`;
      }
    });

    await fs.writeFile(summaryFile, summary, 'utf8');
    console.log(`📄 Сводка сохранена в: ${summaryFile}`);
  }

  return jsonFile;
}

async function main() {
  console.log('='.repeat(60));
  console.log('Получение инструментов Atlassian MCP');
  console.log('='.repeat(60));

  try {
    const token = await getToken();

    if (!token) {
      console.error('❌ Токен не предоставлен');
      process.exit(1);
    }

    const { tools, serverInfo } = await fetchWithSSE(token);

    if (tools.length > 0) {
      await saveResults(tools, serverInfo);

      console.log('\n📊 Результаты:');
      console.log(`• Получено инструментов: ${tools.length}`);

      // Группировка по категориям
      const categories = {};
      tools.forEach(tool => {
        const prefix = tool.name.split('_')[0] || tool.name.split('-')[0] || 'other';
        categories[prefix] = (categories[prefix] || 0) + 1;
      });

      console.log('\nКатегории:');
      Object.entries(categories).forEach(([cat, count]) => {
        console.log(`• ${cat}: ${count}`);
      });

      console.log('\nПримеры инструментов:');
      tools.slice(0, 5).forEach(tool => {
        console.log(`• ${tool.name}`);
      });
    } else {
      console.log('\n⚠️ Инструменты не получены.');
      console.log('Возможные причины:');
      console.log('1. Требуется корпоративный аккаунт Atlassian');
      console.log('2. Токен не имеет необходимых прав доступа');
      console.log('3. MCP сервер требует дополнительную конфигурацию');

      // Попробуем сохранить то, что получили
      if (serverInfo) {
        console.log('\nИнформация о сервере:', serverInfo);
      }
    }
  } catch (error) {
    console.error('\n❌ Ошибка:', error.message);

    if (error.message.includes('401')) {
      console.log('\n💡 Подсказки по аутентификации:');
      console.log('1. Создайте API токен: https://id.atlassian.com/manage-profile/security/api-tokens');
      console.log('2. Убедитесь, что токен активен и не истёк');
      console.log('3. Проверьте, что у вашего аккаунта есть доступ к Atlassian Cloud');
    }
  }
}

main().catch(console.error);