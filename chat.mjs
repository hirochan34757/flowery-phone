let cachedAccessToken = '';
let tokenExpiresAt = 0;

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
});

async function getAccessToken(authKey) {
  if (cachedAccessToken && Date.now() < tokenExpiresAt - 60_000) return cachedAccessToken;

  const response = await fetch('https://ngw.devices.sberbank.ru:9443/api/v2/oauth', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${authKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      'RqUID': crypto.randomUUID()
    },
    body: 'scope=GIGACHAT_API_PERS'
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    console.error('GigaChat OAuth failed:', response.status, data);
    throw new Error(`Не удалось получить токен GigaChat (HTTP ${response.status}). Проверь Authorization Key и доступ сервера к GigaChat.`);
  }

  cachedAccessToken = data.access_token;
  tokenExpiresAt = data.expires_at ? data.expires_at * 1000 : Date.now() + 29 * 60_000;
  return cachedAccessToken;
}

export default async (request) => {
  if (request.method !== 'POST') return json({ error: 'Разрешён только POST-запрос.' }, 405);

  const authKey = process.env.GIGACHAT_AUTH_KEY;
  if (!authKey) return json({ error: 'На сервере ещё не добавлен секрет GIGACHAT_AUTH_KEY.' }, 503);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Не удалось прочитать сообщение.' }, 400); }

  if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > 22) {
    return json({ error: 'Некорректная история переписки.' }, 400);
  }

  const messages = body.messages.map((m) => ({
    role: m.role === 'system' ? 'system' : (m.role === 'assistant' ? 'assistant' : 'user'),
    content: String(m.content || '').slice(0, 8000)
  }));

  try {
    const accessToken = await getAccessToken(authKey);
    const response = await fetch('https://api.giga.chat/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.GIGACHAT_MODEL || 'GigaChat-3-Ultra',
        messages,
        temperature: 0.9,
        max_tokens: 500
      })
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('GigaChat completion failed:', response.status, result);
      return json({ error: `GigaChat вернул ошибку HTTP ${response.status}. Проверь доступность модели и лимиты проекта.` }, 502);
    }

    const reply = result.choices?.[0]?.message?.content;
    if (typeof reply !== 'string' || !reply.trim()) return json({ error: 'GigaChat не вернул текст ответа.' }, 502);
    return json({ reply: reply.trim() });
  } catch (error) {
    console.error('Flowery Phone chat error:', error);
    const message = String(error?.message || 'Неизвестная ошибка');
    return json({ error: message.includes('fetch') ? 'Сервер не смог соединиться с GigaChat. Возможно, нужна настройка сертификата НУЦ Минцифры или доступ к API.' : message }, 502);
  }
};
