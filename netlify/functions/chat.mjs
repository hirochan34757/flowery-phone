
let cachedAccessToken = "";
let tokenExpiresAt = 0;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });

async function getAccessToken(authKey) {
  if (cachedAccessToken && Date.now() < tokenExpiresAt - 60000) {
    return cachedAccessToken;
  }

  const response = await fetch(
    "https://ngw.devices.sberbank.ru:9443/api/v2/oauth",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${authKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        RqUID: crypto.randomUUID()
      },
      body: "scope=GIGACHAT_API_PERS"
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.access_token) {
    console.error("GigaChat OAuth error:", response.status, data);
    throw new Error(`Ошибка авторизации GigaChat: ${response.status}`);
  }

  cachedAccessToken = data.access_token;
  tokenExpiresAt = data.expires_at * 1000;

  return cachedAccessToken;
}

export default async (request) => {
  if (request.method !== "POST") {
    return json({ error: "Разрешён только POST" }, 405);
  }

  const authKey = process.env.GIGACHAT_AUTH_KEY;

  if (!authKey) {
    return json({ error: "Не задан GIGACHAT_AUTH_KEY в Netlify" }, 503);
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return json({ error: "Некорректный запрос" }, 400);
  }

  if (!Array.isArray(body.messages) || !body.messages.length) {
    return json({ error: "Нет сообщений" }, 400);
  }

  const messages = body.messages.slice(-22).map((m) => ({
    role: ["system", "assistant"].includes(m.role) ? m.role : "user",
    content: String(m.content || "").slice(0, 8000)
  }));

  try {
    const token = await getAccessToken(authKey);

    const response = await fetch(
      "https://api.giga.chat/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          model: process.env.GIGACHAT_MODEL || "GigaChat-3-Ultra",
          messages,
          temperature: 0.9,
          max_tokens: 500
        })
      }
    );

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("GigaChat error:", response.status, result);
      return json({ error: `Ошибка GigaChat: ${response.status}` }, 502);
    }

    const reply = result.choices?.[0]?.message?.content;

    if (!reply) {
      return json({ error: "GigaChat не вернул ответ" }, 502);
    }

    return json({ reply: String(reply).trim() });
  } catch (error) {
    console.error("Flowery Phone error:", error);
    return json({
      error: "Не удалось связаться с GigaChat. Проверь настройки сервера."
    }, 502);
  }
};
