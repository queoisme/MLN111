require('dotenv').config();
const express = require('express');
const path    = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));   // serve frontend

const SYSTEM_PROMPT = `Bạn là nhà phân tích lịch sử đồng hành cùng người chơi trong "Barricades & Capital" — game mô phỏng xung đột giai cấp đô thị công nghiệp thế kỷ 20.

CẤU TRÚC GAME: 7 ngày, người chơi chọn một trong hai phe:
• Vô Sản (Công nhân & Công đoàn): duy trì Tinh Thần + Tài Nguyên qua 7 ngày
• Tư Sản (Chủ xưởng & Tư bản): bảo vệ Tài Nguyên + Chính Danh

Các làn sóng khủng hoảng phản ánh cơ chế lịch sử thực tế:
• Đình Công → collective action, labor strikes
• Đàn Áp Bạo Lực → state/capital repression
• Phá Hoại Cơ Sở → sabotage, direct action tactics
• Tổng Đình Công Toàn Thành → general strikes (UK 1926, France 1968, Poland 1980...)
• Chiến Tranh Truyền Thông → media hegemony (Gramsci), narrative control
• Khủng Hoảng Chính Trị → legitimacy crisis, political realignment

NHIỆM VỤ:
1. Kết nối sự kiện game với lịch sử thực: nêu tên sự kiện, năm, địa điểm cụ thể
2. Giải thích lý thuyết: đấu tranh giai cấp (Marx/Engels), hegemony (Gramsci), class consciousness, solidarity economy
3. Phân tích quyết định người chơi qua góc nhìn lịch sử chính trị
4. Trả lời câu hỏi tự do về Marxism, lịch sử lao động, kinh tế chính trị

PHONG CÁCH: Luôn trả lời bằng tiếng Việt. Bình luận tự động (mode=auto): 2-3 câu sắc bén, dẫn ví dụ lịch sử cụ thể. Chat tự do: chi tiết hơn, nêu tên nhân vật/lý thuyết/năm cụ thể. Giọng học giả: khách quan, không giảng đạo.`;

function buildContextStr(ctx) {
  if (!ctx) return '';
  let s = '\n\n[TRẠNG THÁI GAME]\n';
  if (ctx.faction) s += `Phe đang chơi: ${ctx.faction}\n`;
  if (ctx.day)     s += `Ngày: ${ctx.day}/7\n`;
  if (ctx.stats)   s += `Chỉ số — Tinh Thần: ${ctx.stats.morale}, Tài Nguyên: ${ctx.stats.capital}, Kiểm Soát: ${ctx.stats.control}, Chính Danh: ${ctx.stats.legitimacy}\n`;
  if (ctx.event)   s += `Bối cảnh: ${ctx.event}\n`;
  return s;
}

app.post('/api/chat', async (req, res) => {
  const { messages, gameContext, mode = 'chat' } = req.body;
  const apiKey = process.env.OPENROUTER_KEY;
  if (!apiKey) return res.status(500).json({ error: 'OPENROUTER_KEY chưa được cấu hình trong .env' });

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
        'HTTP-Referer':  'http://localhost:3132',
        'X-Title':       'Barricades & Capital'
      },
      body: JSON.stringify({
        model:       process.env.AI_MODEL || 'google/gemini-2.0-flash-001',
        messages:    [{ role: 'system', content: SYSTEM_PROMPT + buildContextStr(gameContext) }, ...messages],
        max_tokens:  mode === 'auto' ? 200 : 700,
        temperature: 0.75
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: err });
    }

    const data = await response.json();
    res.json({ content: data.choices?.[0]?.message?.content || '' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));

const PORT = process.env.PORT || 3132;
app.listen(PORT, () => console.log(`[Barricades & Capital] http://localhost:${PORT}`));
