import https from "node:https";
import { rootCertificates } from "node:tls";

let cachedAccessToken = "";
let tokenExpiresAt = 0;

// Public Russian Trusted Root CA certificate.
// Keep normal Node.js trusted roots as well.
const gigaChatRootCA = '-----BEGIN CERTIFICATE-----\nMIIFwjCCA6qgAwIBAgICEAAwDQYJKoZIhvcNAQELBQAwcDELMAkGA1UEBhMCUlUx\nPzA9BgNVBAoMNlRoZSBNaW5pc3RyeSBvZiBEaWdpdGFsIERldmVsb3BtZW50IGFu\nZCBDb21tdW5pY2F0aW9uczEgMB4GA1UEAwwXUnVzc2lhbiBUcnVzdGVkIFJvb3Qg\nQ0EwHhcNMjIwMzAxMjEwNDE1WhcNMzIwMjI3MjEwNDE1WjBwMQswCQYDVQQGEwJS\nVTE/MD0GA1UECgw2VGhlIE1pbmlzdHJ5IG9mIERpZ2l0YWwgRGV2ZWxvcG1lbnQg\nYW5kIENvbW11bmljYXRpb25zMSAwHgYDVQQDDBdSdXNzaWFuIFRydXN0ZWQgUm9v\ndCBDQTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBAMfFOZ8pUAL3+r2n\nqqE0Zp52selXsKGFYoG0GM5bwz1bSFtCt+AZQMhkWQheI3poZAToYJu69pHLKS6Q\nXBiwBC1cvzYmUYKMYZC7jE5YhEU2bSL0mX7NaMxMDmH2/NwuOVRj8OImVa5s1F4U\nzn4Kv3PFlDBjjSjXKVY9kmjUBsXQrIHeaqmUIsPIlNWUnimXS0I0abExqkbdrXbX\nYwCOXhOO2pDUx3ckmJlCMUGacUTnylyQW2VsJIyIGA8V0xzdaeUXg0VZ6ZmNUr5Y\nBer/EAOLPb8NYpsAhJe2mXjMB/J9HNsoFMBFJ0lLOT/+dQvjbdRZoOT8eqJpWnVD\nU+QL/qEZnz57N88OWM3rabJkRNdU/Z7x5SFIM9FrqtN8xewsiBWBI0K6XFuOBOTD\n4V08o4TzJ8+Ccq5XlCUW2L48pZNCYuBDfBh7FxkB7qDgGDiaftEkZZfApRg2E+M9\nG8wkNKTPLDc4wH0FDTijhgxR3Y4PiS1HL2Zhw7bD3CbslmEGgfnnZojNkJtcLeBH\nBLa52/dSwNU4WWLubaYSiAmA9IUMX1/RpfpxOxd4Ykmhz97oFbUaDJFipIggx5sX\nePAlkTdWnv+RWBxlJwMQ25oEHmRguNYf4Zr/Rxr9cS93Y+mdXIZaBEE0KS2iLRqa\nOiWBki9IMQU4phqPOBAaG7A+eP8PAgMBAAGjZjBkMB0GA1UdDgQWBBTh0YHlzlpf\nBKrS6badZrHF+qwshzAfBgNVHSMEGDAWgBTh0YHlzlpfBKrS6badZrHF+qwshzAS\nBgNVHRMBAf8ECDAGAQH/AgEEMA4GA1UdDwEB/wQEAwIBhjANBgkqhkiG9w0BAQsF\nAAOCAgEAALIY1wkilt/urfEVM5vKzr6utOeDWCUczmWX/RX4ljpRdgF+5fAIS4vH\ntmXkqpSCOVeWUrJV9QvZn6L227ZwuE15cWi8DCDal3Ue90WgAJJZMfTshN4OI8cq\nW9E4EG9wglbEtMnObHlms8F3CHmrw3k6KmUkWGoa+/ENmcVl68u/cMRl1JbW2bM+\n/3A+SAg2c6iPDlehczKx2oa95QW0SkPPWGuNA/CE8CpyANIhu9XFrj3RQ3EqeRcS\nAQQod1RNuHpfETLU/A2gMmvn/w/sx7TB3W5BPs6rprOA37tutPq9u6FTZOcG1Oqj\nC/B7yTqgI7rbyvox7DEXoX7rIiEqyNNUguTk/u3SZ4VXE2kmxdmSh3TQvybfbnXV\n4JbCZVaqiZraqc7oZMnRoWrXRG3ztbnbes/9qhRGI7PqXqeKJBztxRTEVj8ONs1d\nWN5szTwaPIvhkhO3CO5ErU2rVdUr89wKpNXbBODFKRtgxUT70YpmJ46VVaqdAhOZ\nD9EUUn4YaeLaS8AjSF/h7UkjOibNc4qVDiPP+rkehFWM66PVnP1Msh93tc+taIfC\nEYVMxjh8zNbFuoc7fzvvrFILLe7ifvEIUqSVIC/AzplM/Jxw7buXFeGP1qVCBEHq\n391d/9RAfaZ12zkwFsl+IKwE/OZxW8AHa9i1p4GO0YSNuczzEm4=\n-----END CERTIFICATE-----';

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });

function httpsJson(urlString, options, body = "") {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const req = https.request(url, {
      method: options.method || "GET",
      headers: options.headers || {},
      // Add the GigaChat root CA without removing standard trusted roots.
      ca: [...rootCertificates, gigaChatRootCA],
      rejectUnauthorized: true,
      timeout: 30000
    }, (res) => {
      let raw = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { raw += chunk; });
      res.on("end", () => {
        let data = {};
        try {
          data = raw ? JSON.parse(raw) : {};
        } catch {
          return reject(new Error(`Сервер вернул некорректный JSON (HTTP ${res.statusCode})`));
        }
        resolve({ status: res.statusCode || 0, data });
      });
    });

    req.on("timeout", () => req.destroy(new Error("Превышено время ожидания GigaChat")));
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function getAccessToken(authKey) {
  if (cachedAccessToken && Date.now() < tokenExpiresAt - 60000) {
    return cachedAccessToken;
  }

  const result = await httpsJson(
    "https://ngw.devices.sberbank.ru:9443/api/v2/oauth",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${authKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        RqUID: crypto.randomUUID()
      }
    },
    "scope=GIGACHAT_API_PERS"
  );

  if (result.status < 200 || result.status >= 300 || !result.data.access_token) {
    console.error("GigaChat OAuth error:", result.status, result.data);
    throw new Error(`Ошибка авторизации GigaChat: HTTP ${result.status}`);
  }

  cachedAccessToken = result.data.access_token;
  tokenExpiresAt = Number(result.data.expires_at) * 1000;
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
    const result = await httpsJson(
      "https://api.giga.chat/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json"
        }
      },
      JSON.stringify({
        model: process.env.GIGACHAT_MODEL || "GigaChat-3-Ultra",
        messages,
        temperature: 0.9,
        max_tokens: 500
      })
    );

    if (result.status < 200 || result.status >= 300) {
      console.error("GigaChat API error:", result.status, result.data);
      return json({ error: `Ошибка GigaChat: HTTP ${result.status}` }, 502);
    }

    const reply = result.data.choices?.[0]?.message?.content;
    if (!reply) {
      return json({ error: "GigaChat не вернул ответ" }, 502);
    }

    return json({ reply: String(reply).trim() });
  } catch (error) {
    console.error("Flowery Phone error:", error);
    return json({
      error: "Не удалось связаться с GigaChat. Проверь журнал функции Netlify."
    }, 502);
  }
};
