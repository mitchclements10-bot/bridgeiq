export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });

  const { system, userMsg } = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

  const headers = {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
  };

  const messages = [{ role: "user", content: userMsg }];
  let finalText = "";

  try {
    // Agentic loop — runs server-side so web search is fully supported
    for (let i = 0; i < 10; i++) {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 4000,
          system,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          messages,
        }),
      });

      const data = await resp.json();
      if (data.error) return res.status(400).json({ error: data.error.message });

      // Collect text from this turn
      const textBlocks = (data.content || []).filter(b => b.type === "text");
      if (textBlocks.length) finalText = textBlocks.map(b => b.text).join("");

      // Done
      if (data.stop_reason === "end_turn") break;

      // Handle tool use — add assistant turn then send tool results back
      const toolUseBlocks = (data.content || []).filter(b => b.type === "tool_use");
      if (!toolUseBlocks.length) break;

      messages.push({ role: "assistant", content: data.content });

      // For web_search, the results come back in the content blocks as tool_result type
      // We send back the tool_result blocks that Anthropic already populated
      const serverResults = (data.content || []).filter(b => b.type === "tool_result");
      if (serverResults.length) {
        messages.push({ role: "user", content: serverResults });
      } else {
        // Fallback: send empty results to continue
        messages.push({
          role: "user",
          content: toolUseBlocks.map(b => ({
            type: "tool_result",
            tool_use_id: b.id,
            content: "",
          })),
        });
      }
    }

    if (!finalText) return res.status(500).json({ error: "No response generated" });
    return res.status(200).json({ text: finalText });

  } catch (err) {
    console.error("Research error:", err);
    return res.status(500).json({ error: err.message || "Research failed" });
  }
}
