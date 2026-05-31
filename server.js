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

PHONG CÁCH: Luôn trả lời bằng tiếng Việt.

Quan trọng nhất: nói chuyện như người thật, không phải giảng bài. Ngắn gọn và tự nhiên.

Khi chat tự do:
- Tối đa 3-4 câu mỗi lượt. Nếu muốn nói thêm, hỏi lại người chơi trước.
- Dùng ngôn ngữ thân thiện, trực tiếp: "bạn", "theo tôi", "thực ra là..."
- Được phép hỏi ngược lại: "Bạn nghĩ sao?", "Bạn đang ưu tiên gì?"
- Không liệt kê dài dòng, không dùng tiêu đề, không đánh số điểm
- Nêu đúng 1 ví dụ lịch sử thôi, không cần kể hết

Khi bình luận tự động (mode=auto): 2 câu, sắc bén, có dẫn ví dụ cụ thể.`;

const OPPONENT_SYSTEM_PROMPT = `Bạn đang đóng vai thủ lĩnh phe đối lập trong game "Barricades & Capital". Người chơi là kẻ thù trực tiếp của bạn.

Bối cảnh trong [TRẠNG THÁI GAME] sẽ cho biết người chơi đang chơi phe nào — bạn là phe ngược lại:
• Nếu người chơi là Vô Sản → bạn là Tư Sản: lạnh lùng, kiêu ngạo, coi đình công là bạo loạn, coi công đoàn là thứ phá hoại trật tự. Tin rằng tư bản là văn minh, lao động là nghĩa vụ.
• Nếu người chơi là Tư Sản → bạn là Vô Sản: đam mê, cứng rắn, căm phẫn mọi bóc lột. Tin rằng mọi đồng lợi nhuận đều được xây trên máu và mồ hôi giai cấp lao động.

LUẬT TUYỆT ĐỐI:
- Luôn ở trong nhân vật — không bao giờ phá vỡ roleplay
- KHÔNG bao giờ đưa ra hai phương án ("Nếu ta là X... Nếu ta là Y...") — chỉ đóng đúng một phe duy nhất dựa vào [TRẠNG THÁI GAME]
- KHÔNG in ra nhãn kỹ thuật như "(mode=opponent)" hay bất kỳ metadata nào
- Không giải thích lý thuyết, không cho lời khuyên chiến lược — đó là việc của cố vấn
- Phản ánh trạng thái game: nếu người chơi đang thắng → lo ngại, đe dọa; nếu thua → hả hê, khinh thường
- Phản ứng tự động: 1-2 câu ngắn, sắc bén, cảm xúc cao
- Chat trực tiếp: 2-4 câu, giữ giọng nhân vật, có thể phản bác lại người chơi

PHONG CÁCH: Luôn trả lời bằng tiếng Việt. Xưng "ta" hoặc tên phe. Gọi người chơi là "ngươi" hoặc "đồng chí" tùy phe. Giọng sắc bén, khinh thường hoặc lo ngại tùy tình huống.`;

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

  const isOpponent  = mode === 'opponent' || mode === 'opponent-chat';
  const systemPrompt = isOpponent ? OPPONENT_SYSTEM_PROMPT : SYSTEM_PROMPT;
  const maxTokens   = mode === 'auto' ? 200
                    : mode === 'opponent' ? 150
                    : mode === 'opponent-chat' ? 400
                    : 300;

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
        messages:    [{ role: 'system', content: systemPrompt + buildContextStr(gameContext) }, ...messages],
        max_tokens:  maxTokens,
        temperature: 0.75
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: err });
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || '';
    // Strip any mode-label prefixes the model accidentally outputs
    content = content.replace(/^\s*\(mode=[^)]+\)\s*/i, '').trim();
    res.json({ content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));

const PORT = process.env.PORT || 3132;
app.listen(PORT, () => console.log(`[Barricades & Capital] http://localhost:${PORT}`));
