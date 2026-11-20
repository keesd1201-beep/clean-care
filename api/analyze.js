export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "서버에 API 키가 설정되지 않았습니다." });
  }

  const { smsText } = req.body || {};
  if (!smsText || !smsText.trim()) {
    return res.status(400).json({ error: "분석할 문자 내용이 없습니다." });
  }

  const prompt = `당신은 한국에서 휴대폰 번호 재할당으로 인해 '전 사용자 문자'를 받게 된 신규 개통자를 돕는 전문가입니다.
사용자가 받은 아래 문자 내용을 분석하여 반드시 아래 JSON 스키마로만 응답하세요.

{
  "category": "문자 유형 (예: 카드/결제, 채권추심/금융, 동네가게/예약, 택배/쇼핑, 정부/공공, 기타)",
  "org": "발신 기관 또는 상호명",
  "name": "문자 속 전 사용자 이름 (없으면 '미확인')",
  "tel": "해지/문의용 전화번호 (080 수신거부나 대표번호 중 가장 적합한 번호, 없으면 '')",
  "warn_block_spam": true,
  "method_summary": "권장 처리 방식 한 줄 요약 (18자 이내)",
  "ars_or_tip": "핵심 주의사항이나 실전 팁",
  "script": "상담원이나 업체에 바로 말하거나 보낼 수 있는 해지 요청 멘트"
}

분석할 문자:
${smsText}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json"
          }
        })
      }
    );

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || "AI 요청 실패" });
    }

    let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    rawText = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(rawText);

    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message || "서버 오류가 발생했습니다." });
  }
}