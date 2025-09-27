Ниже — минимальный и рабочий OAuth 2.0 (3LO) + PKCE флоу для Atlassian Cloud на Node.js (Express). Он получает `access_token` (+ опционально `refresh_token`), находит ваш `cloudId` и готов к дальнейшим вызовам API (Jira/Confluence) — а затем вы уже можете использовать этот токен где угодно (в т.ч. для MCP/SSE). Основано на официальной документации Atlassian по 3LO/PKCE, refresh-токенам и параметрам авторизации. ([developer.atlassian.com][1])

### 1) Что подготовить в Atlassian

1. В **Developer Console** создайте app → **Authorization** → включите **OAuth 2.0 (3LO)**. 
Укажите `Callback URL`, например `http://localhost:3000/callback`. Сохраните **Client ID**. ([developer.atlassian.com][2])
2. При формировании URL авторизации используйте:

    * `audience=api.atlassian.com` (обязателен),
    * нужные **scopes** (например: `read:jira-work read:confluence-content.summary offline_access`),
    * PKCE (`code_challenge` + `code_challenge_method=S256`). ([developer.atlassian.com][3])
3. Чтобы получить **refresh_token**, добавьте `offline_access` в `scope`. ([developer.atlassian.com][4])

### 2) Минимальный сервер на Express (PKCE + обмен кода)

```js
// package.json: npm i express node-fetch cookie-session
import express from 'express';
import crypto from 'crypto';
import fetch from 'node-fetch';
import session from 'cookie-session';

const app = express();
app.use(session({ name: 'sess', keys: ['replace-me'], maxAge: 24*60*60*1000 }));

const CLIENT_ID = process.env.ATL_CLIENT_ID; // из Dev Console
const REDIRECT_URI = 'http://localhost:3000/callback';
const AUTH_URL = 'https://auth.atlassian.com/authorize';
const TOKEN_URL = 'https://auth.atlassian.com/oauth/token';
const SCOPES = [
  'read:jira-work',
  'read:confluence-content.summary',
  'offline_access'
].join(' ');
const AUDIENCE = 'api.atlassian.com';

function base64url(buf) {
  return buf.toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
}

app.get('/login', (req, res) => {
  // PKCE
  const code_verifier = base64url(crypto.randomBytes(32));
  const code_challenge = base64url(crypto.createHash('sha256').update(code_verifier).digest());
  const state = base64url(crypto.randomBytes(16));
  req.session.code_verifier = code_verifier;
  req.session.state = state;

  const url = new URL(AUTH_URL);
  url.searchParams.set('audience', AUDIENCE);
  url.searchParams.set('client_id', CLIENT_ID);
  url.searchParams.set('scope', SCOPES);
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('prompt', 'consent'); // чтобы выдать refresh_token при offline_access
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', code_challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  res.redirect(url.toString());
});

app.get('/callback', async (req, res) => {
  const { code, state } = req.query;
  if (!code || state !== req.session.state) return res.status(400).send('Bad state');

  // Обмен кода на токены
  const resp = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: req.session.code_verifier
    })
  });
  const tokens = await resp.json();
  if (!resp.ok) return res.status(400).send(tokens);

  // Сохраним
  req.session.access_token = tokens.access_token;
  req.session.refresh_token = tokens.refresh_token; // появится если был offline_access
  res.redirect('/whoami');
});

app.get('/refresh', async (req, res) => {
  const rt = req.session.refresh_token;
  if (!rt) return res.status(400).send('No refresh_token');

  const resp = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: CLIENT_ID,
      refresh_token: rt
    })
  });
  const data = await resp.json();
  if (!resp.ok) return res.status(400).send(data);

  req.session.access_token = data.access_token;
  if (data.refresh_token) req.session.refresh_token = data.refresh_token;
  res.json({ ok: true });
});

app.get('/whoami', async (req, res) => {
  // 1) Узнаём доступные ресурсы (cloudId и базовые URL’ы)
  const r1 = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
    headers: { Authorization: `Bearer ${req.session.access_token}` }
  });
  const resources = await r1.json();

  // 2) Пример запроса в Confluence (список пространств)
  // берём первый Confluence ресурс
  const conf = resources.find(r => r.scopes?.length && r.url?.includes('/wiki'));
  let spaces = null;
  if (conf) {
    const r2 = await fetch(`${conf.url}/rest/api/space?limit=5`, {
      headers: { Authorization: `Bearer ${req.session.access_token}` }
    });
    spaces = await r2.json();
  }

  res.json({ resources, spaces });
});

app.listen(3000, () => console.log('http://localhost:3000/login'));
```

Почему так:

* Авторизация идёт через `https://auth.atlassian.com/authorize` с `audience=api.atlassian.com`, `response_type=code`, PKCE и вашими `scope`. ([developer.atlassian.com][3])
* Обмен кода и рефреш — на `https://auth.atlassian.com/oauth/token`. Для рефреша нужен `offline_access` в начальном `scope`. ([developer.atlassian.com][4])
* После получения `access_token` вызываем `GET https://api.atlassian.com/oauth/token/accessible-resources` → получаем список сайтов и их `cloudId`/`url`, затем строим продуктовые REST-вызовы (Jira/Confluence) уже к конкретному base URL. ([developer.atlassian.com][5])

### 3) Типичные грабли

* **Нет `audience=api.atlassian.com`** в URL авторизации → токен не будет работать с облачными API. ([developer.atlassian.com][3])
* **Забыли `offline_access`** → не придёт `refresh_token`, токен протухнет и всё. ([developer.atlassian.com][4])
* **Несовпадение `redirect_uri`** с тем, что в Dev Console → обмен кода вернёт ошибку. ([developer.atlassian.com][3])
* **Права/скоупы**: токен есть, но 401/403 на конкретные эндпоинты — проверьте нужные product-scopes и фактические права пользователя на сайте. ([The Atlassian Developer Community][6])

### 4) Использовать токен для MCP (SSE)

Когда у вас есть `access_token`, вы можете открыть SSE-подключение к MCP-серверу, передав его в `Authorization: Bearer`. (Сам флоу авторизации тот же, токен — из этого же обмена). ([Atlassian Support][7])

---

Хочешь — дам вариант с библиотекой **openid-client** (ещё проще), пример для **Next.js** или добавлю хранение токенов в Redis/DB и ротацию по крону.

[1]: https://developer.atlassian.com/cloud/oauth/getting-started/implementing-oauth-3lo/?utm_source=chatgpt.com "Implementing OAuth 2.0 (3LO)"
[2]: https://developer.atlassian.com/cloud/oauth/getting-started/enabling-oauth-3lo/?utm_source=chatgpt.com "Enabling OAuth 2.0 3LO"
[3]: https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/?utm_source=chatgpt.com "OAuth 2.0 (3LO) apps"
[4]: https://developer.atlassian.com/cloud/oauth/getting-started/refresh-tokens/?utm_source=chatgpt.com "Implementing the Refresh Token Flow"
[5]: https://developer.atlassian.com/cloud/oauth/getting-started/making-calls-to-api/?utm_source=chatgpt.com "Making Calls to API"
[6]: https://community.developer.atlassian.com/t/jira-endpoint-error-for-oauth-2-0-3lo/75768?utm_source=chatgpt.com "Jira endpoint error for oauth 2.0 3LO"
[7]: https://support.atlassian.com/atlassian-rovo-mcp-server/docs/authentication-and-authorization/?utm_source=chatgpt.com "Authentication and authorization | Atlassian Rovo MCP ..."
