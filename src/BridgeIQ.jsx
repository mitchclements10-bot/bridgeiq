import { useState, useReducer, createContext, useContext } from "react";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Cell, Tooltip
} from "recharts";
import {
  ChevronRight, ChevronLeft, AlertTriangle, Shield, Target, Zap,
  TrendingUp, Users, DollarSign, Building, ArrowRight,
  RotateCcw, Loader2, CheckCircle2, XCircle, AlertCircle, Copy,
  Check, Star, Layers, Eye, Briefcase, FileText, Sparkles,
  Link, Search, ExternalLink, Globe, ChevronDown
} from "lucide-react";

/* ================================================================
   ENGINE — 10 dimensions, 100pt scoring, classification, risks
   ================================================================ */

const DIMS = [
  { key:"strategic_complementarity", label:"Strategic Complementarity", max:18, desc:"Whether each side brings a capability the other cannot easily replicate.", icon:"Target" },
  { key:"incentive_alignment", label:"Incentive Alignment", max:16, desc:"Whether the deal gives both sides reasons to care about long-term success.", icon:"Zap" },
  { key:"creator_autonomy", label:"Creator Autonomy Preservation", max:14, desc:"Whether the creator's core advantage survives the partnership.", icon:"Shield" },
  { key:"durability", label:"Durability of Value Creation", max:12, desc:"Whether the partnership creates repeatable, lasting value.", icon:"Layers" },
  { key:"business_model_fit", label:"Business Model Fit", max:10, desc:"Whether the economics and rights structure fit both parties.", icon:"DollarSign" },
  { key:"studio_unlock", label:"Studio Unlock Value", max:8, desc:"Whether the legacy partner provides meaningful scarce value.", icon:"Building" },
  { key:"creator_distinctiveness", label:"Creator Distinctiveness & Trust", max:8, desc:"Whether the creator brings differentiated trust and format strength.", icon:"Star" },
  { key:"operational_feasibility", label:"Operational Feasibility", max:6, desc:"Whether the partnership can realistically execute.", icon:"Briefcase" },
  { key:"audience_ip_relevance", label:"Audience / IP Relevance", max:5, desc:"Whether the creator, audience, and property actually fit.", icon:"Users" },
  { key:"reach_visibility", label:"Reach / Visibility Utility", max:3, desc:"Simple awareness-driving value. Deliberately low-weighted.", icon:"Eye" },
];

const QUESTIONS = [
  { id:"sc1", dim:"strategic_complementarity", text:"The creator provides audience trust, cultural fluency, or format innovation the studio cannot replicate internally.", tip:"Could the studio achieve the same effect with an internal hire?" },
  { id:"sc2", dim:"strategic_complementarity", text:"The studio provides production infrastructure, distribution scale, or IP access the creator cannot get independently.", tip:"Could the creator achieve comparable reach or quality alone?" },
  { id:"sc3", dim:"strategic_complementarity", text:"The proposed outcome requires both parties' capabilities -- neither side could produce it alone.", tip:"The core bridge test: genuine mutual dependency." },
  { id:"sc4", dim:"strategic_complementarity", text:"The capabilities exchanged are difficult for competitors to substitute.", tip:"If the studio could partner with any of 50 similar creators, complementarity is weak." },
  { id:"ia1", dim:"incentive_alignment", text:"Both sides share upside if the partnership succeeds.", tip:"Flat-fee deals with no backend rarely create lasting alignment." },
  { id:"ia2", dim:"incentive_alignment", text:"The compensation structure rewards long-term performance.", tip:"Does the deal still make sense in month 8 or year 2?" },
  { id:"ia3", dim:"incentive_alignment", text:"There are built-in mechanisms for renegotiation or expansion.", tip:"Rigid contracts with no growth path breed resentment." },
  { id:"ia4", dim:"incentive_alignment", text:"Neither party has a strong incentive to defect or half-commit.", tip:"Watch for structures where one side captures most value regardless of effort." },
  { id:"ca1", dim:"creator_autonomy", text:"The creator retains editorial control over voice, format, and audience relationship.", tip:"Does the studio's approval process fundamentally change how the creator communicates?" },
  { id:"ca2", dim:"creator_autonomy", text:"The creator's independent business is not materially restricted.", tip:"Full exclusivity or overly broad non-competes erode creator leverage." },
  { id:"ca3", dim:"creator_autonomy", text:"The creator can walk away without losing their core audience or brand.", tip:"If the deal traps the creator, resentment surfaces publicly." },
  { id:"dv1", dim:"durability", text:"The partnership creates assets, IP, or relationships that persist beyond the initial campaign.", tip:"One viral moment is not durable value." },
  { id:"dv2", dim:"durability", text:"The deal supports renewal or expansion if the initial output works.", tip:"Is there a built-in next chapter?" },
  { id:"dv3", dim:"durability", text:"Learnings from this can improve future creator-legacy collaborations.", tip:"Does the company get smarter from doing this deal?" },
  { id:"bm1", dim:"business_model_fit", text:"The revenue model matches how both parties actually make money.", tip:"Don't force a subscription creator into a CPM model." },
  { id:"bm2", dim:"business_model_fit", text:"The IP and rights structure creates clear ownership.", tip:"Ambiguous IP ownership is the #1 deal-killer." },
  { id:"bm3", dim:"business_model_fit", text:"The cost structure is sustainable at the proposed scale.", tip:"Is the studio paying a premium that destroys unit economics?" },
  { id:"su1", dim:"studio_unlock", text:"The studio provides something genuinely scarce: premium production, exclusive rights, or brand prestige.", tip:"'We'll promote you on our channels' is not scarce in 2026." },
  { id:"su2", dim:"studio_unlock", text:"The creator would materially benefit from the studio vs. going alone.", tip:"If the creator could get 80% of the value from a brand deal, the studio unlock is weak." },
  { id:"cd1", dim:"creator_distinctiveness", text:"The creator has a differentiated format, voice, or community.", tip:"Interchangeable creators mean interchangeable partnerships." },
  { id:"cd2", dim:"creator_distinctiveness", text:"The creator's audience trusts their recommendations and engages deeply.", tip:"High followers with low trust is worse than small audience with deep trust." },
  { id:"of1", dim:"operational_feasibility", text:"The partnership can execute within realistic timelines.", tip:"Studio legal and brand safety can add 3-6 months." },
  { id:"of2", dim:"operational_feasibility", text:"Both sides have operational capacity to execute.", tip:"A great concept that neither side can staff is not feasible." },
  { id:"ar1", dim:"audience_ip_relevance", text:"The creator's audience has genuine affinity for the IP involved.", tip:"Forcing a comedy creator onto a drama franchise is relevance failure." },
  { id:"ar2", dim:"audience_ip_relevance", text:"The property is a natural fit for the creator's content style.", tip:"Would the audience see this as organic or a sellout?" },
  { id:"rv1", dim:"reach_visibility", text:"The partnership generates meaningful awareness beyond what either side could achieve alone.", tip:"This is table stakes. High reach without structure is just advertising." },
];

function computeDimScores(sub) {
  return DIMS.map(d => {
    const qs = QUESTIONS.filter(q => q.dim === d.key);
    const vals = qs.map(q => sub[q.id] || 0).filter(v => v > 0);
    if (!vals.length) return { key:d.key, raw:0, scaled:0, pct:0 };
    const mean = vals.reduce((a,b) => a+b, 0) / vals.length;
    const scaled = Math.round(((mean-1)/4) * d.max * 10) / 10;
    return { key:d.key, raw:mean, scaled, pct:scaled/d.max };
  });
}
function computeTotal(ds) { return Math.round(ds.reduce((s,d) => s+d.scaled, 0)*10)/10; }
function gsc(ds,k) { return ds.find(d=>d.key===k)?.scaled||0; }

const ARCHETYPES = [
  { id:"true_bridge", label:"True Strategic Bridge", color:"#00D4AA", verdict:"This is a credible strategic bridge." },
  { id:"high_potential", label:"High-Potential but Poorly Structured", color:"#FFB020", verdict:"This opportunity has real bridge potential but is poorly structured." },
  { id:"promotional", label:"Promotional Bridge", color:"#4DA6FF", verdict:"This is a promotional collaboration, not a true bridge." },
  { id:"talent_utility", label:"Talent Utility Partnership", color:"#A78BFA", verdict:"The creator is being used as talent, not as a true business-model bridge." },
  { id:"audience_rental", label:"Audience Rental Play", color:"#FF8C42", verdict:"This is a reach-driven play without structural depth." },
  { id:"misaligned", label:"Misaligned Integration Attempt", color:"#FF4D6A", verdict:"This partnership risks stripping out the creator's advantage through over-integration." },
];

function classify(ds, total) {
  const sc=gsc(ds,"strategic_complementarity"),ia=gsc(ds,"incentive_alignment"),ca=gsc(ds,"creator_autonomy"),
    dv=gsc(ds,"durability"),bm=gsc(ds,"business_model_fit"),su=gsc(ds,"studio_unlock"),
    cd=gsc(ds,"creator_distinctiveness"),rv=gsc(ds,"reach_visibility");
  const f=id=>ARCHETYPES.find(a=>a.id===id);
  if(rv>=2.2&&sc<10&&dv<6)return f("audience_rental");
  if(cd>=6&&bm<5&&ca<7)return f("talent_utility");
  if(total>=80&&sc>=13&&ia>=11&&ca>=9&&dv>=8){if(ca<8)return f("high_potential");if(ia<9)return f("high_potential");return f("true_bridge");}
  if(total>=68&&total<=75&&sc>=14&&su>=6&&dv>=8)return f("high_potential");
  if(total>=65&&total<=84&&sc>=12&&(ia<9||ca<8||bm<6))return f("high_potential");
  if(ca<5&&ia<7&&dv<6)return f("misaligned");
  if(total<=54)return f("misaligned");
  if(sc<10&&dv<6&&bm<6)return f("audience_rental");
  if(total>=45&&total<=69&&ca<8&&bm<7)return f("talent_utility");
  if(total>=55&&total<=74)return f("promotional");
  if(total>=80)return f("true_bridge");if(total>=65)return f("high_potential");
  if(total>=55)return f("promotional");if(total>=45)return f("talent_utility");
  if(total>=40)return f("audience_rental");return f("misaligned");
}

function generateRisks(ds) {
  const risks=[];const p=k=>{const d=ds.find(x=>x.key===k);return d?d.pct:0;};const g=k=>gsc(ds,k);
  if(p("strategic_complementarity")<.56)risks.push({severity:"critical",title:"Weak Strategic Complementarity",text:"This partnership appears more cosmetic than structural. The value exchange is weak or easily replicable."});
  if(p("incentive_alignment")<.56)risks.push({severity:"critical",title:"Misaligned Incentives",text:"The current deal structure does not align upside, making long-term commitment unlikely."});
  if(p("creator_autonomy")<.56)risks.push({severity:"critical",title:"Creator Autonomy at Risk",text:"The proposed structure risks stripping out the creator's core advantage by over-integrating them into legacy workflows."});
  if(p("durability")<.50)risks.push({severity:"high",title:"Low Durability",text:"This opportunity may generate attention without building durable strategic value."});
  if(p("business_model_fit")<.50)risks.push({severity:"high",title:"Business Model Mismatch",text:"The economics do not match how the creator and legacy partner actually create and capture value."});
  if(p("studio_unlock")<.50)risks.push({severity:"moderate",title:"Weak Studio Contribution",text:"The legacy partner may not be adding enough unique value to justify the partnership."});
  if(p("creator_distinctiveness")<.50)risks.push({severity:"moderate",title:"Low Creator Differentiation",text:"The creator may not offer sufficiently differentiated trust, format, or audience value."});
  if(p("operational_feasibility")<.50)risks.push({severity:"moderate",title:"Execution Complexity",text:"Execution complexity may undermine the authenticity and speed needed."});
  if(p("audience_ip_relevance")<.50)risks.push({severity:"moderate",title:"Forced Relevance",text:"The fit between creator, audience, and property feels forced rather than organic."});
  if(g("reach_visibility")>=2.2&&p("strategic_complementarity")<.56&&p("durability")<.50)risks.push({severity:"high",title:"Reach Without Structure",text:"This appears to be a reach-driven collaboration without strong structural logic."});
  return risks.sort((a,b)=>({critical:0,high:1,moderate:2}[a.severity])-({critical:0,high:1,moderate:2}[b.severity]));
}

/* ================================================================
   LLM PROMPTS
   ================================================================ */

const RESEARCH_SYS = `You are a creator economy research analyst. Given a URL or description of a digital creator, research them and produce a structured creator intelligence profile.

Be specific about numbers, formats, and business model. If you cannot find exact data, make informed estimates based on what you can observe and clearly mark them as estimates.

Use entertainment strategy language. Never use growth-marketing jargon like "influencer campaign," "conversion funnel," or "audience acquisition engine."

Respond ONLY with valid JSON. No markdown fences, no preamble.`;

function buildResearchPrompt(url) {
  return `Research this creator and produce a structured intelligence profile:

URL: ${url}

Return this exact JSON structure:
{
  "creatorName": "Full name or channel name",
  "category": "Primary content category (Sports, Entertainment, Gaming, Lifestyle, News, Education, Music, Comedy, Tech, Finance, Health, Other)",
  "platforms": "Comma-separated list of active platforms",
  "audienceSize": "Total estimated reach across platforms (e.g., '4.2M total reach')",
  "engagementSummary": "Brief assessment of engagement quality and community depth",
  "ipOwnership": "Description of any proprietary formats, series, or IP the creator owns",
  "monetization": "How they make money (ad revenue, brand deals, merch, subs, licensing, etc.)",
  "brandHistory": "Notable brand/studio partnerships if any",
  "trustAndAuthenticity": "Assessment of audience trust, voice authenticity, cultural credibility",
  "productionQuality": "Assessment of production sophistication",
  "contentStyle": "Brief description of their content approach, tone, and format signatures",
  "audienceDemo": "Best estimate of audience demographics (age, gender, geography)",
  "competitivePosition": "What makes this creator distinctive vs. peers in their category",
  "bridgeStrengths": "What this creator would uniquely bring to a legacy media partnership",
  "bridgeWeaknesses": "Potential concerns or limitations for a legacy media partnership",
  "overallAssessment": "2-3 sentence executive summary of this creator's partnership potential"
}`;
}

const SCORING_SYS = `You are BridgeIQ, a strategic scoring engine for creator-legacy media partnerships. You will be given a creator profile and a studio/partnership context, and you must score the partnership across 10 dimensions.

Score each sub-question on a 1-5 scale:
1 = Strongly disagree / Not at all
2 = Disagree / Minimally
3 = Neutral / Somewhat
4 = Agree / Significantly
5 = Strongly agree / Fully

Be direct and honest. Do not inflate scores. A 3 is fine if the evidence is mixed. A 1-2 is appropriate when the data clearly doesn't support the statement.

Use entertainment strategy reasoning, not growth-marketing logic.

Respond ONLY with valid JSON. No markdown, no fences.`;

function buildScoringPrompt(profile, studioCtx) {
  const qLines = QUESTIONS.map(q => `  "${q.id}": [1-5] // ${q.text}`).join(",\n");
  return `Score this creator-legacy partnership:

CREATOR PROFILE:
${JSON.stringify(profile, null, 2)}

STUDIO / PARTNERSHIP CONTEXT:
${JSON.stringify(studioCtx, null, 2)}

Score each question 1-5 and provide brief rationale for each dimension:

{
  "scores": {
${qLines}
  },
  "dimensionNotes": {
    "strategic_complementarity": "Brief rationale for scores",
    "incentive_alignment": "Brief rationale",
    "creator_autonomy": "Brief rationale",
    "durability": "Brief rationale",
    "business_model_fit": "Brief rationale",
    "studio_unlock": "Brief rationale",
    "creator_distinctiveness": "Brief rationale",
    "operational_feasibility": "Brief rationale",
    "audience_ip_relevance": "Brief rationale",
    "reach_visibility": "Brief rationale"
  }
}`;
}

const MEMO_SYS = `You are BridgeIQ, a strategic advisor for entertainment executives evaluating creator-legacy media partnerships.

Tone: Direct, opinionated, senior executive register. Entertainment strategy language: strategic bridge, structural fit, incentive alignment, autonomy preservation, partnership durability, business model complementarity, value creation logic.

NEVER use: influencer campaign optimization, creator conversion funnel, audience acquisition engine, KPI dashboard, engagement metrics optimization.

Respond ONLY with valid JSON. No markdown fences.`;

function buildMemoPrompt(profile, studioCtx, ds, total, arch, risks, dimNotes) {
  const lines = DIMS.map(d => { const x=ds.find(s=>s.key===d.key); return `  ${d.label}: ${x?.scaled?.toFixed(1)}/${d.max} (${Math.round((x?.pct||0)*100)}%)`; }).join("\n");
  return `CREATOR: ${profile.creatorName} | ${profile.category} | ${profile.platforms} | ${profile.audienceSize}
Profile: ${profile.overallAssessment}
Strengths: ${profile.bridgeStrengths}
Weaknesses: ${profile.bridgeWeaknesses}

STUDIO CONTEXT: ${studioCtx.companyName} (${studioCtx.companyType}) | Objective: ${studioCtx.objective}
Project: ${studioCtx.projectDesc}
Deal type: ${studioCtx.dealType} | Autonomy: ${studioCtx.autonomyLevel} | Revenue: ${studioCtx.revenueModel}

BRIDGE SCORE: ${total}/100
CLASSIFICATION: ${arch.label}

SCORES:
${lines}

${dimNotes ? "SCORING RATIONALE:\n" + Object.entries(dimNotes).map(([k,v]) => `  ${k}: ${v}`).join("\n") : ""}

RISKS:
${risks.length>0?risks.map(r=>`[${r.severity.toUpperCase()}] ${r.title}: ${r.text}`).join("\n"):"None"}

Return:
{
  "verdict": "One direct sentence: why this is or is not a true bridge",
  "bridgeAnalysis": "2-3 paragraphs: Why this is or is not a true bridge. Reference specific scores.",
  "primaryRisk": "1-2 paragraphs: The single most important structural risk.",
  "dealStructure": "2-3 paragraphs: Best-fit deal structure recommendation.",
  "nextMove": "1 paragraph: Single most important next step.",
  "executiveMemo": "4-6 paragraph polished executive memo for a studio head. Include score, classification, key finding, primary risk, recommended structure, recommended action."
}`;
}

const REVENUE_SYS = `You are BridgeIQ, a strategic advisor for entertainment executives evaluating creator-legacy media partnerships.

Your task is to analyze the advertising and revenue unlock potential of a proposed creator-legacy partnership — specifically the net new ad inventory, brand fit, and revenue range it could create.

Be concrete and directional. Use CPM and impressions language only where it supports a business case, not as a primary framing. Think like a head of ad sales or a media buyer, not a digital marketer.

NEVER use: influencer campaign, conversion funnel, audience acquisition, engagement optimization, KPI dashboard.

Respond ONLY with valid JSON. No markdown fences.`;

function buildRevenuePrompt(profile, studioCtx, total, arch) {
  return `Analyze the advertising and revenue unlock potential of this creator-legacy partnership:

CREATOR: ${profile.creatorName} | ${profile.category} | ${profile.platforms} | ${profile.audienceSize}
Audience: ${profile.audienceDemo}
Monetization history: ${profile.monetization}
Brand history: ${profile.brandHistory}
Content style: ${profile.contentStyle}

STUDIO: ${studioCtx.companyName} (${studioCtx.companyType})
Objective: ${studioCtx.objective}
Project: ${studioCtx.projectDesc}
Deal type: ${studioCtx.dealType} | Revenue model: ${studioCtx.revenueModel}

BRIDGE SCORE: ${total}/100 | CLASSIFICATION: ${arch.label}

Return this exact JSON:
{
  "inventorySummary": "2-3 sentences: What net new ad-sellable inventory does this partnership create that neither side has today?",
  "contentFormats": ["Format 1 with estimated output (e.g., '12-episode digital series, ~8 min avg')", "Format 2", "Format 3"],
  "estimatedImpressions": "Directional impressions range across all formats combined (e.g., '180M–320M total impressions annually')",
  "brandCategories": [
    {"category": "Category name", "rationale": "Why this category fits this specific partnership", "fit": "strong"},
    {"category": "Category name", "rationale": "Brief rationale", "fit": "moderate"},
    {"category": "Category name", "rationale": "Brief rationale", "fit": "strong"},
    {"category": "Category name", "rationale": "Brief rationale", "fit": "moderate"},
    {"category": "Category name", "rationale": "Brief rationale", "fit": "weak"}
  ],
  "revenueRangeLow": "Dollar figure (e.g., '$4.2M')",
  "revenueRangeHigh": "Dollar figure (e.g., '$9.8M')",
  "revenueMethodology": "1-2 sentences explaining the basis for the range (audience size, CPM tier, content volume, deal structure)",
  "inventoryContext": "1-2 sentences: Why this inventory is valuable or differentiated vs. what the studio already sells",
  "agencyAngle": "1-2 sentences: How an agency buyer like Publicis or GroupM should think about this inventory — what client problems does it solve?"
}`;
}

/* ================================================================
   API HELPER
   ================================================================ */

async function callClaude(system, userMsg) {
  const messages = [{ role: "user", content: userMsg }];
  let finalText = "";

  // Agentic loop — handles web search tool use turns
  for (let i = 0; i < 8; i++) {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4000,
        system,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages,
      })
    });
    const data = await resp.json();
    if (data.error) throw new Error(data.error.message || "API error");

    // Collect any text from this turn
    const textBlocks = data.content?.filter(b => b.type === "text") || [];
    if (textBlocks.length) finalText = textBlocks.map(b => b.text).join("");

    // If done, return
    if (data.stop_reason === "end_turn") break;

    // If model used tools, send results back and continue
    const toolUseBlocks = data.content?.filter(b => b.type === "tool_use") || [];
    if (toolUseBlocks.length === 0) break;

    // Add assistant turn with tool use
    messages.push({ role: "assistant", content: data.content });

    // Add tool results (web search results are handled server-side; send empty result to continue)
    const toolResults = toolUseBlocks.map(b => ({
      type: "tool_result",
      tool_use_id: b.id,
      content: b.type === "web_search" ? [] : [],
    }));
    messages.push({ role: "user", content: toolResults });
  }

  if (!finalText) throw new Error("No response from API — check your connection and try again.");
  return finalText;
}

async function callClaudeNoSearch(system, userMsg) {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      system,
      messages: [{ role: "user", content: userMsg }]
    })
  });
  const data = await resp.json();
  if (data.error) throw new Error(data.error.message || "API error");
  const text = data.content?.filter(b => b.type === "text").map(b => b.text).join("") || "";
  if (!text) throw new Error("Empty response from API");
  return text;
}

function parseJSON(text) {
  const cleaned = text.replace(/```json|```/g, "").trim();
  // Find the first { and last }
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON found");
  return JSON.parse(cleaned.slice(start, end + 1));
}

function generatePDF(profile, studioCtx, result, analysis, revenueUnlock) {
  const { total, archetype: ac, dimScores, risks } = result;
  const date = new Date().toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" });
  const scoreColor = total >= 75 ? "#00A882" : total >= 55 ? "#CC8C00" : total >= 40 ? "#CC6A00" : "#CC2244";

  const dimRows = DIMS.map((d, i) => {
    const ds = dimScores[i];
    const pct = Math.round((ds?.pct || 0) * 100);
    const barColor = pct >= 70 ? "#00A882" : pct >= 50 ? "#CC8C00" : "#CC2244";
    return `<tr>
      <td style="padding:8px 6px;border-bottom:1px solid #eee;font-size:13px">${d.label}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #eee;text-align:center;font-size:13px;font-weight:600;color:${barColor}">${ds?.scaled?.toFixed(1) || 0}/${d.max}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #eee;width:120px">
        <div style="height:6px;border-radius:3px;background:#eee"><div style="height:6px;border-radius:3px;background:${barColor};width:${pct}%"></div></div>
      </td>
      <td style="padding:8px 6px;border-bottom:1px solid #eee;text-align:right;font-size:12px;color:#888">${pct}%</td>
    </tr>`;
  }).join("");

  const sevColor = { critical:"#CC2244", high:"#CC8C00", moderate:"#2266CC" };
  const riskHtml = risks.length === 0 ? "<p style='color:#888;font-size:13px'>No risk flags triggered.</p>" :
    risks.map(r => `<div style="margin-bottom:10px;padding:12px 14px;border-left:3px solid ${sevColor[r.severity]||"#888"};background:#fafafa;border-radius:0 6px 6px 0">
      <div style="font-size:13px;font-weight:700;color:${sevColor[r.severity]||"#333"};margin-bottom:3px">${r.title} <span style="font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:.04em">[${r.severity}]</span></div>
      <div style="font-size:12.5px;color:#555;line-height:1.6">${r.text}</div>
    </div>`).join("");

  const analysisHtml = analysis ? [
    { label:"Bridge Analysis", content: analysis.bridgeAnalysis },
    { label:"Primary Structural Risk", content: analysis.primaryRisk },
    { label:"Recommended Deal Structure", content: analysis.dealStructure },
    { label:"Next Move", content: analysis.nextMove },
  ].map(s => `<div style="margin-bottom:18px">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#00A882;margin-bottom:6px">${s.label}</div>
    <div style="font-size:13.5px;color:#333;line-height:1.8;white-space:pre-wrap">${s.content || ""}</div>
  </div>`).join("") : "";

  const revenueHtml = revenueUnlock ? `
    <div class="section">
      <div class="section-title">Revenue Unlock Analysis</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
        <div style="padding:14px;border:1px solid #e0e0e0;border-radius:8px">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#888;margin-bottom:6px">Estimated Annual Ad Revenue</div>
          <div style="font-size:20px;font-weight:700;color:#00A882">${revenueUnlock.revenueRangeLow} — ${revenueUnlock.revenueRangeHigh}</div>
          <div style="font-size:11.5px;color:#666;margin-top:4px;line-height:1.5">${revenueUnlock.revenueMethodology||""}</div>
        </div>
        <div style="padding:14px;border:1px solid #e0e0e0;border-radius:8px">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#888;margin-bottom:6px">Estimated Impressions</div>
          <div style="font-size:15px;font-weight:600;color:#333">${revenueUnlock.estimatedImpressions||""}</div>
        </div>
      </div>
      <div style="font-size:13px;color:#444;line-height:1.7;margin-bottom:12px">${revenueUnlock.inventorySummary||""}</div>
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#888;margin-bottom:8px">Brand Fit Profile</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        ${(revenueUnlock.brandCategories||[]).map(b=>{
          const fc={strong:"#00A882",moderate:"#CC8C00",weak:"#999"}[b.fit]||"#999";
          return `<div style="padding:8px 10px;border:1px solid #e0e0e0;border-radius:6px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">
              <span style="font-size:12.5px;font-weight:600">${b.category}</span>
              <span style="font-size:10px;font-weight:700;text-transform:uppercase;color:${fc}">${b.fit}</span>
            </div>
            <div style="font-size:11.5px;color:#666;line-height:1.45">${b.rationale}</div>
          </div>`;
        }).join("")}
      </div>
    </div>` : "";

  const memoHtml = analysis?.executiveMemo ? `
    <div class="section">
      <div class="section-title">Executive Memo</div>
      <div style="font-size:13px;color:#333;line-height:1.9;white-space:pre-wrap;background:#fafafa;padding:18px;border-radius:8px;border:1px solid #eee">${analysis.executiveMemo}</div>
    </div>` : "";

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <title>BridgeIQ — ${profile.creatorName} x ${studioCtx.companyName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Outfit',sans-serif; color:#1a1a1a; background:#fff; padding:0; }
    .page { max-width:780px; margin:0 auto; padding:48px 52px; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:24px; border-bottom:2px solid #111; margin-bottom:28px; }
    .logo { font-size:28px; font-weight:700; letter-spacing:-.02em; }
    .logo span { color:#00A882; }
    .meta { text-align:right; font-size:12px; color:#888; }
    .partnership { font-size:22px; font-weight:700; margin-bottom:4px; color:#111; }
    .hero { display:grid; grid-template-columns:auto 1fr; gap:28px; align-items:center; padding:24px; border:1.5px solid #e0e0e0; border-radius:12px; margin-bottom:24px; background:#fafafa; }
    .score-big { font-size:64px; font-weight:700; color:${scoreColor}; line-height:1; font-variant-numeric:tabular-nums; }
    .score-label { font-size:11px; color:#999; font-weight:600; text-transform:uppercase; letter-spacing:.06em; margin-top:2px; }
    .archetype-badge { display:inline-block; padding:5px 12px; border-radius:4px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; background:${ac.color}18; color:${ac.color}; margin-bottom:8px; }
    .verdict { font-size:15px; color:#333; line-height:1.65; font-style:italic; }
    .section { margin-bottom:28px; }
    .section-title { font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.08em; color:#111; border-bottom:1px solid #ddd; padding-bottom:8px; margin-bottom:14px; }
    table { width:100%; border-collapse:collapse; }
    .footer { margin-top:36px; padding-top:18px; border-top:1px solid #eee; display:flex; justify-content:space-between; font-size:11px; color:#bbb; }
    @media print {
      body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
      .page { padding:32px 40px; }
    }
  </style>
  </head><body><div class="page">
    <div class="header">
      <div>
        <div class="logo">Bridge<span>IQ</span></div>
        <div style="font-size:11px;color:#888;margin-top:3px">Creator-Legacy Partnership Intelligence</div>
      </div>
      <div class="meta">
        <div style="font-weight:600;font-size:13px;color:#333;margin-bottom:2px">${profile.creatorName} × ${studioCtx.companyName}</div>
        <div>${date}</div>
        <div style="margin-top:3px">${studioCtx.dealType}</div>
      </div>
    </div>

    <div class="hero">
      <div style="text-align:center">
        <div class="score-big">${Math.round(total)}</div>
        <div class="score-label">Bridge Score /100</div>
      </div>
      <div>
        <div class="archetype-badge">${ac.label}</div>
        <div class="verdict">${analysis?.verdict || ac.verdict}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px">
          <div style="padding:10px 12px;background:#fff;border:1px solid #e8e8e8;border-radius:6px">
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#aaa;margin-bottom:3px">Creator</div>
            <div style="font-size:13px;font-weight:600">${profile.creatorName}</div>
            <div style="font-size:11.5px;color:#888">${profile.category} · ${profile.audienceSize}</div>
          </div>
          <div style="padding:10px 12px;background:#fff;border:1px solid #e8e8e8;border-radius:6px">
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#aaa;margin-bottom:3px">Partner</div>
            <div style="font-size:13px;font-weight:600">${studioCtx.companyName}</div>
            <div style="font-size:11.5px;color:#888">${studioCtx.companyType}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Dimension Scores</div>
      <table><tbody>${dimRows}</tbody></table>
    </div>

    <div class="section">
      <div class="section-title">Risk Flags</div>
      ${riskHtml}
    </div>

    <div class="section">
      <div class="section-title">Strategic Analysis</div>
      ${analysisHtml}
    </div>

    ${revenueHtml}
    ${memoHtml}

    <div class="footer">
      <div>Generated by BridgeIQ · Creator-Legacy Partnership Intelligence</div>
      <div>${profile.creatorName} × ${studioCtx.companyName} · ${date}</div>
    </div>
  </div>
  <script>window.onload=()=>{window.print();}</script>
  </body></html>`;

  const w = window.open("", "_blank");
  if (w) { w.document.write(html); w.document.close(); }
}

/* ================================================================
   STUDIO PRESETS
   ================================================================ */

const STUDIO_PRESETS = [
  { id:"custom", label:"Custom Company", companyName:"", companyType:"", objective:"", projectDesc:"", dealType:"Co-production", autonomyLevel:"High -- creator leads", revenueModel:"Hybrid (base + performance)" },
  { id:"espn", label:"ESPN / ESPN+", companyName:"ESPN", companyType:"Sports Network / Streamer", objective:"Reach younger digital-native sports fans and drive ESPN+ subscriptions", projectDesc:"Co-produced digital series or creator-led show for ESPN+ and social platforms", dealType:"Co-production", autonomyLevel:"High -- creator leads", revenueModel:"Hybrid (base + performance)" },
  { id:"netflix", label:"Netflix", companyName:"Netflix", companyType:"Global Streaming Platform", objective:"Extend cultural relevance and attract new subscriber segments through creator partnerships", projectDesc:"Creator-driven unscripted series, docuseries, or format adaptation", dealType:"Content licensing / first-look deal", autonomyLevel:"Moderate -- collaborative", revenueModel:"Licensing fee + backend" },
  { id:"disney", label:"Disney Studios", companyName:"Disney Studios", companyType:"Major Studio", objective:"Extend franchise IP to digital-native audiences and platforms", projectDesc:"Creator-led franchise extension or social-first content for existing Disney IP", dealType:"IP extension partnership", autonomyLevel:"Moderate -- collaborative with guardrails", revenueModel:"Flat fee + promotional value" },
  { id:"amazon", label:"Amazon MGM", companyName:"Amazon MGM Studios", companyType:"Studio / Streaming Platform", objective:"Differentiate Prime Video with creator-driven content and formats", projectDesc:"Original format development with creator or creator-led unscripted series", dealType:"Co-production / first-look", autonomyLevel:"High -- creator leads", revenueModel:"Revenue share + base" },
  { id:"fox", label:"Fox Sports", companyName:"Fox Sports", companyType:"Broadcast Sports Network", objective:"Capture younger sports audience through creator-native formats", projectDesc:"Creator-hosted studio show, digital pre/post game content, or social series", dealType:"Talent + co-production hybrid", autonomyLevel:"Moderate -- collaborative", revenueModel:"Hybrid (base + performance)" },
  { id:"warner", label:"Warner Bros. Discovery", companyName:"Warner Bros. Discovery", companyType:"Studio / Streamer (Max)", objective:"Drive Max subscriptions and cultural relevance through creator partnerships", projectDesc:"Creator-led Max original, social-first franchise content, or live event partnership", dealType:"Co-production", autonomyLevel:"Moderate -- collaborative", revenueModel:"Hybrid (base + performance)" },
  { id:"sony", label:"Sony Pictures TV", companyName:"Sony Pictures Television", companyType:"Production / Distribution Company", objective:"Develop new IP and formats through creator partnerships for multi-platform distribution", projectDesc:"Format development, creator-driven series, or podcast-to-screen pipeline", dealType:"IP development / co-production", autonomyLevel:"High -- creator leads", revenueModel:"Revenue share + ownership stake" },
  { id:"nba", label:"NBA / NBA Digital", companyName:"NBA", companyType:"Sports League", objective:"Extend the NBA brand to digital-native fans and non-traditional basketball audiences", projectDesc:"Creator-led basketball culture content, game-adjacent programming, or lifestyle crossover", dealType:"Content partnership", autonomyLevel:"High -- creator leads", revenueModel:"Licensing + rev share" },
  { id:"spotify", label:"Spotify", companyName:"Spotify", companyType:"Audio / Video Platform", objective:"Drive video consumption and differentiate with creator-exclusive content", projectDesc:"Video podcast, live format, or creator-led show exclusive to Spotify", dealType:"Platform exclusive deal", autonomyLevel:"High -- creator leads", revenueModel:"Guaranteed minimum + CPM" },
];

/* ================================================================
   DESIGN
   ================================================================ */

const C = {
  bg:"#07090C", bgSub:"#0D1117", surface:"#131920", surfaceAlt:"#1A2332",
  border:"#1C2736", borderHi:"#2A3B50",
  text:"#E4E8EE", textSec:"#8B99AB", textDim:"#556373",
  accent:"#00D4AA", accentBg:"rgba(0,212,170,0.07)",
  warn:"#FFB020", danger:"#FF4D6A", info:"#4DA6FF",
  purple:"#A78BFA", orange:"#FF8C42",
};

const css = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Outfit',sans-serif;background:${C.bg};color:${C.text};-webkit-font-smoothing:antialiased}
.serif{font-family:'Instrument Serif',serif}
.mono{font-family:'JetBrains Mono',monospace}
input,textarea,select{font-family:'Outfit',sans-serif;background:${C.surface};border:1px solid ${C.border};color:${C.text};padding:11px 14px;border-radius:8px;font-size:14px;width:100%;outline:none;transition:border-color .2s}
input:focus,textarea:focus,select:focus{border-color:${C.accent}}
input::placeholder,textarea::placeholder{color:${C.textDim}}
textarea{resize:vertical;min-height:72px}
select{cursor:pointer;-webkit-appearance:none;appearance:none;background-image:url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23556373' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center;padding-right:36px}
select option{background:${C.surface};color:${C.text}}
label{display:block;font-size:12.5px;font-weight:500;color:${C.textSec};margin-bottom:5px;letter-spacing:.03em}
@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:.6}50%{opacity:1}}
.fade-up{animation:fadeUp .45s ease-out both}
.d1{animation-delay:.05s}.d2{animation-delay:.1s}.d3{animation-delay:.15s}.d4{animation-delay:.2s}
::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px}
`;

/* ================================================================
   SHARED UI
   ================================================================ */

function Btn({children,onClick,variant="primary",disabled,size="md",style:sx}){
  const base={display:"inline-flex",alignItems:"center",gap:7,fontFamily:"'Outfit'",fontWeight:600,borderRadius:8,cursor:disabled?"not-allowed":"pointer",transition:"all .15s",border:"none",opacity:disabled?.35:1,fontSize:size==="sm"?13:14,padding:size==="sm"?"8px 16px":"12px 24px"};
  const v={primary:{background:C.accent,color:C.bg},secondary:{background:"transparent",color:C.textSec,border:`1px solid ${C.border}`},ghost:{background:"transparent",color:C.textSec,padding:size==="sm"?"8px 12px":"12px 16px"}};
  return <button style={{...base,...v[variant],...sx}} onClick={disabled?undefined:onClick} disabled={disabled}>{children}</button>;
}
function Card({children,style:sx}){ return <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:24,...sx}}>{children}</div>; }
function Tag({children,color=C.accent}){ return <span className="mono" style={{display:"inline-block",fontSize:10.5,fontWeight:500,padding:"4px 10px",borderRadius:4,background:color+"14",color,letterSpacing:".05em",textTransform:"uppercase"}}>{children}</span>; }

function ScoreRing({score,size=140}){
  const r=(size-14)/2;const circ=2*Math.PI*r;const pct=score/100;
  const color=score>=75?C.accent:score>=55?C.warn:score>=40?C.orange:C.danger;
  return(<div style={{textAlign:"center",position:"relative"}}><svg width={size} height={size} style={{transform:"rotate(-90deg)"}}><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.border} strokeWidth={5}/><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={5} strokeDasharray={circ} strokeDashoffset={circ*(1-pct)} strokeLinecap="round" style={{transition:"stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)"}}/></svg><div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)"}}><div className="mono" style={{fontSize:size*.28,fontWeight:500,color,lineHeight:1}}>{Math.round(score)}</div><div style={{fontSize:10,color:C.textDim}}>/100</div></div></div>);
}

function CopyBlock({text}){
  const[copied,setCopied]=useState(false);
  const copy=()=>{navigator.clipboard.writeText(text).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000)});};
  return(<div style={{position:"relative"}}><button onClick={copy} style={{position:"absolute",top:12,right:12,background:C.surfaceAlt,border:`1px solid ${C.border}`,borderRadius:6,padding:"6px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:5,color:copied?C.accent:C.textSec,fontSize:12,fontFamily:"'Outfit'",zIndex:1}}>{copied?<><Check size={13}/> Copied</>:<><Copy size={13}/> Copy</>}</button><div style={{background:C.bgSub,border:`1px solid ${C.border}`,borderRadius:10,padding:20,fontSize:13.5,color:C.textSec,lineHeight:1.85,whiteSpace:"pre-wrap",fontWeight:300,maxHeight:520,overflow:"auto"}}>{text}</div></div>);
}

function CustomRadar({ data, size = 270 }) {
  // data: [{label, value (0-100)}]
  const cx = size / 2, cy = size / 2;
  const maxR = size * 0.36;
  const n = data.length;
  const rings = [0.25, 0.5, 0.75, 1.0];
  const angleOf = i => (Math.PI * 2 * i / n) - Math.PI / 2;
  const pt = (i, r) => {
    const a = angleOf(i);
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  };
  const polyPoints = (vals) => vals.map((v, i) => pt(i, (v / 100) * maxR).join(",")).join(" ");
  const gridPoly = (frac) => Array.from({length:n}, (_,i) => pt(i, maxR * frac).join(",")).join(" ");
  const scorePts = data.map(d => Math.max(0, Math.min(100, d.value)));

  return (
    <svg width={size} height={size} style={{display:"block",margin:"0 auto"}}>
      {/* Grid rings */}
      {rings.map((r, ri) => (
        <polygon key={ri} points={gridPoly(r)} fill="none" stroke={C.borderHi} strokeWidth={1} />
      ))}
      {/* Axis lines */}
      {data.map((_, i) => {
        const [x, y] = pt(i, maxR);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={C.border} strokeWidth={1} />;
      })}
      {/* Filled polygon */}
      <polygon
        points={polyPoints(scorePts)}
        fill={C.accent}
        fillOpacity={0.35}
        stroke={C.accent}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {/* Dots */}
      {scorePts.map((v, i) => {
        const [x, y] = pt(i, (v / 100) * maxR);
        return <circle key={i} cx={x} cy={y} r={4} fill={C.accent} stroke={C.bg} strokeWidth={1.5} />;
      })}
      {/* Labels */}
      {data.map((d, i) => {
        const a = angleOf(i);
        const labelR = maxR + 18;
        const lx = cx + Math.cos(a) * labelR;
        const ly = cy + Math.sin(a) * labelR;
        const anchor = lx < cx - 4 ? "end" : lx > cx + 4 ? "start" : "middle";
        return (
          <text key={i} x={lx} y={ly} textAnchor={anchor} dominantBaseline="central"
            style={{fontSize:9.5, fill:C.textSec, fontFamily:"'Outfit',sans-serif", fontWeight:500}}>
            {d.label}
          </text>
        );
      })}
    </svg>
  );
}

function CustomRadarDual({ dataA, dataB, size = 280 }) {
  const cx = size / 2, cy = size / 2;
  const maxR = size * 0.36;
  const n = dataA.length;
  const rings = [0.25, 0.5, 0.75, 1.0];
  const angleOf = i => (Math.PI * 2 * i / n) - Math.PI / 2;
  const pt = (i, r) => {
    const a = angleOf(i);
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  };
  const polyPoints = (vals) => vals.map((v, i) => pt(i, (v / 100) * maxR).join(",")).join(" ");
  const gridPoly = (frac) => Array.from({length:n}, (_,i) => pt(i, maxR * frac).join(",")).join(" ");
  const ptsA = dataA.map(d => Math.max(0, Math.min(100, d)));
  const ptsB = dataB.map(d => Math.max(0, Math.min(100, d)));
  const labels = DIMS.map(d => d.label.split(" ")[0]);

  return (
    <svg width={size} height={size} style={{display:"block",margin:"0 auto"}}>
      {rings.map((r, ri) => (
        <polygon key={ri} points={gridPoly(r)} fill="none" stroke={C.borderHi} strokeWidth={1} />
      ))}
      {labels.map((_, i) => {
        const [x, y] = pt(i, maxR);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={C.border} strokeWidth={1} />;
      })}
      {/* B behind A */}
      <polygon points={polyPoints(ptsB)} fill={C.purple} fillOpacity={0.25} stroke={C.purple} strokeWidth={2} strokeLinejoin="round"/>
      <polygon points={polyPoints(ptsA)} fill={C.info} fillOpacity={0.25} stroke={C.info} strokeWidth={2} strokeLinejoin="round"/>
      {ptsA.map((v, i) => { const [x,y]=pt(i,(v/100)*maxR); return <circle key={i} cx={x} cy={y} r={3} fill={C.info} stroke={C.bg} strokeWidth={1}/>; })}
      {ptsB.map((v, i) => { const [x,y]=pt(i,(v/100)*maxR); return <circle key={i} cx={x} cy={y} r={3} fill={C.purple} stroke={C.bg} strokeWidth={1}/>; })}
      {labels.map((label, i) => {
        const a = angleOf(i);
        const labelR = maxR + 18;
        const lx = cx + Math.cos(a) * labelR;
        const ly = cy + Math.sin(a) * labelR;
        const anchor = lx < cx - 4 ? "end" : lx > cx + 4 ? "start" : "middle";
        return (
          <text key={i} x={lx} y={ly} textAnchor={anchor} dominantBaseline="central"
            style={{fontSize:9.5, fill:C.textSec, fontFamily:"'Outfit',sans-serif", fontWeight:500}}>
            {label}
          </text>
        );
      })}
    </svg>
  );
}

function StatusPill({icon,text,color=C.accent,pulse=false}){
  return(<div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 14px",borderRadius:8,background:color+"0C",border:`1px solid ${color}33`}}><div style={{color,animation:pulse?"pulse 1.5s ease-in-out infinite":undefined}}>{icon}</div><span style={{fontSize:13,color,fontWeight:500}}>{text}</span></div>);
}

/* ================================================================
   STATE
   ================================================================ */

const init = {
  step: 0,
  url: "",
  creatorProfile: null,
  studioCtx: null,
  studioPreset: "espn",
  subScores: {},
  dimNotes: null,
  result: null,
  analysis: null,
  revenueUnlock: null,
  phase: null,
  error: null,
  compareMode: false,
  compareSlot: "A",
  assessmentA: null,
  assessmentB: null,
};

function reducer(st, a) {
  switch(a.type) {
    case "STEP": return {...st, step:a.v, error:null};
    case "SET_URL": return {...st, url:a.v};
    case "SET_PROFILE": return {...st, creatorProfile:a.v, step:3, phase:null};
    case "SET_STUDIO": return {...st, studioCtx:a.v};
    case "SET_PRESET": return {...st, studioPreset:a.v};
    case "SET_SCORES": return {...st, subScores:a.scores, dimNotes:a.notes, phase:null};
    case "SET_RESULT": return {...st, result:a.v};
    case "SET_ANALYSIS": return {...st, analysis:a.v, phase:null};
    case "SET_REVENUE": return {...st, revenueUnlock:a.v, phase:null};
    case "START_COMPARE": return {...init, compareMode:true, compareSlot:"A", step:1};
    case "SAVE_AS_A": return {
      ...init,
      compareMode:true, compareSlot:"B", step:1,
      assessmentA:{ profile:st.creatorProfile, studioCtx:st.studioCtx, result:st.result, analysis:st.analysis, revenueUnlock:st.revenueUnlock },
    };
    case "SAVE_AS_B": return {
      ...st,
      assessmentB:{ profile:st.creatorProfile, studioCtx:st.studioCtx, result:st.result, analysis:st.analysis, revenueUnlock:st.revenueUnlock },
      step:7,
    };
    case "PHASE": return {...st, phase:a.v};
    case "ERROR": return {...st, error:a.v, phase:null};
    case "EDIT_STUDIO": return {...st, studioCtx:{...st.studioCtx,...a.data}};
    case "RESET": return {...init};
    default: return st;
  }
}

const Ctx = createContext(null);

/* ================================================================
   PAGES
   ================================================================ */

function Landing() {
  const {dispatch} = useContext(Ctx);
  return(
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",padding:40,position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",inset:0,background:`radial-gradient(ellipse 600px 400px at 50% 40%, ${C.accent}08, transparent 70%)`}}/>
      <div style={{position:"absolute",inset:0,backgroundImage:`linear-gradient(${C.border}33 1px, transparent 1px), linear-gradient(90deg, ${C.border}33 1px, transparent 1px)`,backgroundSize:"80px 80px",opacity:.25}}/>
      <div style={{position:"relative",maxWidth:640,textAlign:"center"}}>
        <div className="fade-up">
          <div className="mono" style={{fontSize:12,color:C.accent,letterSpacing:".14em",textTransform:"uppercase",marginBottom:20}}>Creator-Legacy Partnership Intelligence</div>
          <h1 className="serif" style={{fontSize:72,fontWeight:400,lineHeight:1,marginBottom:20,letterSpacing:"-0.02em"}}>Bridge<span style={{color:C.accent}}>IQ</span></h1>
          <p style={{fontSize:17,color:C.textSec,lineHeight:1.75,maxWidth:480,margin:"0 auto",fontWeight:300}}>Drop in a creator URL. Select a legacy media company. Get an instant bridge score, risk analysis, and deal structure recommendation.</p>
        </div>
        <div className="fade-up d2" style={{display:"flex",gap:14,justifyContent:"center",marginTop:44}}>
          <Btn onClick={()=>dispatch({type:"STEP",v:1})}>Evaluate a Creator <ArrowRight size={16}/></Btn>
          <Btn variant="secondary" onClick={()=>dispatch({type:"START_COMPARE"})}>Compare Two Partnerships <Layers size={15}/></Btn>
        </div>
        <div className="fade-up d4" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginTop:56}}>
          {[{n:"01",t:"Paste a creator URL",d:"YouTube, TikTok, Instagram, X, podcast"},{n:"02",t:"Select the studio context",d:"Pick a legacy partner + deal type"},{n:"03",t:"Get the bridge assessment",d:"Score, classification, risks, exec memo"}].map((x,i)=>(
            <div key={i} style={{padding:18,borderRadius:10,border:`1px solid ${C.border}`,textAlign:"left",background:C.bgSub}}>
              <div className="mono" style={{fontSize:11,color:C.accent,marginBottom:8}}>{x.n}</div>
              <div style={{fontSize:13.5,fontWeight:600,marginBottom:3}}>{x.t}</div>
              <div style={{fontSize:12,color:C.textDim,fontWeight:300}}>{x.d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function URLInput() {
  const {state,dispatch} = useContext(Ctx);
  const [inputUrl, setInputUrl] = useState(state.url);

  const handleResearch = async () => {
    if (!inputUrl.trim()) return;
    dispatch({type:"SET_URL", v:inputUrl});
    dispatch({type:"PHASE", v:"researching"});
    dispatch({type:"STEP", v:2});
    try {
      const raw = await callClaude(RESEARCH_SYS, buildResearchPrompt(inputUrl.trim()));
      const profile = parseJSON(raw);
      dispatch({type:"SET_PROFILE", v:profile});
    } catch(e) {
      console.error(e);
      dispatch({type:"ERROR", v:"Could not research this creator. Check the URL and ensure the API key is configured."});
      dispatch({type:"STEP", v:1});
    }
  };

  return(
    <div className="fade-up" style={{maxWidth:600,margin:"0 auto",paddingTop:60}}>
      <div style={{textAlign:"center",marginBottom:40}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:10}}>
          <div className="mono" style={{fontSize:11.5,color:C.accent,letterSpacing:".1em"}}>{state.compareMode ? `COMPARISON — ASSESSMENT ${state.compareSlot}` : "STEP 1"}</div>
          {state.compareMode && <Tag color={state.compareSlot==="A"?C.info:C.purple}>{state.compareSlot==="A"?"First Partnership":"Second Partnership"}</Tag>}
        </div>
        <h2 className="serif" style={{fontSize:36,fontWeight:400,marginBottom:8}}>Drop in a creator</h2>
        <p style={{fontSize:14.5,color:C.textSec,fontWeight:300}}>{state.compareMode ? `Set up Assessment ${state.compareSlot}. Paste a creator URL to begin.` : "Paste any creator URL or social profile link. BridgeIQ will research them and build an intelligence profile."}</p>
      </div>

      <Card>
        <div style={{display:"flex",gap:10,marginBottom:16}}>
          <div style={{flex:1,position:"relative"}}>
            <Link size={16} color={C.textDim} style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)"}}/>
            <input
              value={inputUrl}
              onChange={e=>setInputUrl(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&handleResearch()}
              placeholder="https://youtube.com/@creator or any social URL..."
              style={{paddingLeft:40,fontSize:15}}
            />
          </div>
          <Btn onClick={handleResearch} disabled={!inputUrl.trim()}>
            <Search size={15}/> Research
          </Btn>
        </div>

        <div style={{fontSize:12,color:C.textDim,lineHeight:1.6}}>
          Supports YouTube, TikTok, Instagram, X/Twitter, podcast links, or just type a creator's name.
        </div>

        {state.error && (
          <div style={{marginTop:14,padding:12,borderRadius:8,background:C.danger+"0C",border:`1px solid ${C.danger}33`,fontSize:13,color:C.danger}}>
            {state.error}
          </div>
        )}
      </Card>

      <div style={{marginTop:32,textAlign:"center"}}>
        <div style={{fontSize:12,color:C.textDim,marginBottom:12}}>Or try an example:</div>
        <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
          {["https://youtube.com/@MrBeast","https://youtube.com/@PatMcAfeeShow","https://youtube.com/@mkbhd","https://tiktok.com/@khaby.lame"].map(u=>(
            <button key={u} onClick={()=>setInputUrl(u)} style={{padding:"6px 14px",borderRadius:6,border:`1px solid ${C.border}`,background:"transparent",color:C.textSec,fontSize:12,cursor:"pointer",fontFamily:"'JetBrains Mono'",transition:"all .15s"}}>
              {u.replace("https://","").replace("youtube.com/","YT ").replace("tiktok.com/","TT ")}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ResearchingScreen() {
  return(
    <div style={{maxWidth:500,margin:"80px auto",textAlign:"center"}}>
      <Loader2 size={36} color={C.accent} style={{margin:"0 auto 20px",animation:"spin 1s linear infinite"}}/>
      <h3 className="serif" style={{fontSize:24,fontWeight:400,marginBottom:8}}>Researching creator...</h3>
      <p style={{fontSize:14,color:C.textSec,fontWeight:300,lineHeight:1.7}}>Searching the web, analyzing content strategy, building intelligence profile. This takes 15-30 seconds.</p>
      <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:28,alignItems:"center"}}>
        <StatusPill icon={<Globe size={14}/>} text="Searching web for creator data" color={C.accent} pulse/>
        <StatusPill icon={<FileText size={14}/>} text="Analyzing content and audience" color={C.info} pulse/>
        <StatusPill icon={<Target size={14}/>} text="Assessing partnership potential" color={C.purple} pulse/>
      </div>
    </div>
  );
}

function ProfileReview() {
  const {state,dispatch} = useContext(Ctx);
  const p = state.creatorProfile;
  if (!p) return null;

  const fields = [
    {label:"Category",val:p.category},{label:"Platforms",val:p.platforms},
    {label:"Audience Size",val:p.audienceSize},{label:"Engagement",val:p.engagementSummary},
    {label:"IP Ownership",val:p.ipOwnership},{label:"Monetization",val:p.monetization},
    {label:"Brand History",val:p.brandHistory},{label:"Trust & Authenticity",val:p.trustAndAuthenticity},
    {label:"Production Quality",val:p.productionQuality},{label:"Content Style",val:p.contentStyle},
    {label:"Audience Demo",val:p.audienceDemo},{label:"Competitive Position",val:p.competitivePosition},
  ];

  return(
    <div className="fade-up">
      <div style={{marginBottom:28}}>
        <div className="mono" style={{fontSize:11.5,color:C.accent,letterSpacing:".1em",marginBottom:8}}>CREATOR INTELLIGENCE PROFILE</div>
        <h2 className="serif" style={{fontSize:36,fontWeight:400,marginBottom:6}}>{p.creatorName}</h2>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <Tag>{p.category}</Tag>
          <Tag color={C.info}>{p.platforms}</Tag>
          <Tag color={C.purple}>{p.audienceSize}</Tag>
        </div>
      </div>

      {/* Assessment summary */}
      <Card style={{marginBottom:18,borderColor:C.accent+"33"}}>
        <div className="mono" style={{fontSize:10.5,color:C.accent,letterSpacing:".06em",textTransform:"uppercase",marginBottom:8}}>Executive Summary</div>
        <div style={{fontSize:14.5,color:C.textSec,lineHeight:1.8,fontWeight:300}}>{p.overallAssessment}</div>
      </Card>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:18}}>
        <Card style={{borderColor:"#00D4AA33"}}>
          <div className="mono" style={{fontSize:10.5,color:C.accent,letterSpacing:".06em",textTransform:"uppercase",marginBottom:8}}>Bridge Strengths</div>
          <div style={{fontSize:13.5,color:C.textSec,lineHeight:1.7,fontWeight:300}}>{p.bridgeStrengths}</div>
        </Card>
        <Card style={{borderColor:C.warn+"33"}}>
          <div className="mono" style={{fontSize:10.5,color:C.warn,letterSpacing:".06em",textTransform:"uppercase",marginBottom:8}}>Bridge Concerns</div>
          <div style={{fontSize:13.5,color:C.textSec,lineHeight:1.7,fontWeight:300}}>{p.bridgeWeaknesses}</div>
        </Card>
      </div>

      <Card style={{marginBottom:24}}>
        <div className="mono" style={{fontSize:10.5,color:C.textDim,letterSpacing:".06em",textTransform:"uppercase",marginBottom:14}}>Profile Details</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          {fields.map(f=>(
            <div key={f.label} style={{padding:10,borderRadius:6,background:C.bgSub,border:`1px solid ${C.border}`}}>
              <div style={{fontSize:11,color:C.textDim,fontWeight:500,marginBottom:3}}>{f.label}</div>
              <div style={{fontSize:13,color:C.textSec,fontWeight:300,lineHeight:1.5}}>{f.val||"--"}</div>
            </div>
          ))}
        </div>
      </Card>

      <div style={{display:"flex",justifyContent:"space-between"}}>
        <Btn variant="secondary" onClick={()=>dispatch({type:"STEP",v:1})}><ChevronLeft size={15}/> Different Creator</Btn>
        <Btn onClick={()=>dispatch({type:"STEP",v:4})}>Select Studio Context <ChevronRight size={15}/></Btn>
      </div>
    </div>
  );
}

function StudioSelect() {
  const {state,dispatch} = useContext(Ctx);
  const [preset, setPreset] = useState(state.studioPreset);
  const [custom, setCustom] = useState(STUDIO_PRESETS[0]);
  const isCustom = preset === "custom";
  const active = isCustom ? custom : STUDIO_PRESETS.find(p=>p.id===preset) || STUDIO_PRESETS[1];

  const handleContinue = () => {
    dispatch({type:"SET_STUDIO", v:active});
    dispatch({type:"SET_PRESET", v:preset});
    dispatch({type:"STEP", v:5});
  };

  return(
    <div className="fade-up">
      <div style={{marginBottom:28}}>
        <div className="mono" style={{fontSize:11.5,color:C.accent,letterSpacing:".1em",marginBottom:8}}>STEP 2</div>
        <h2 className="serif" style={{fontSize:32,fontWeight:400,marginBottom:6}}>Select the legacy partner context</h2>
        <p style={{fontSize:14,color:C.textSec,fontWeight:300}}>Who is {state.creatorProfile?.creatorName} potentially partnering with? Pick a preset or define a custom studio.</p>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:20}}>
        {STUDIO_PRESETS.filter(p=>p.id!=="custom").map(p=>(
          <button key={p.id} onClick={()=>setPreset(p.id)} style={{padding:14,borderRadius:8,border:`1px solid ${preset===p.id?C.accent:C.border}`,background:preset===p.id?C.accentBg:C.surface,color:preset===p.id?C.accent:C.textSec,cursor:"pointer",textAlign:"left",fontFamily:"'Outfit'",transition:"all .15s"}}>
            <div style={{fontSize:14,fontWeight:600,marginBottom:3}}>{p.label}</div>
            <div style={{fontSize:11.5,color:C.textDim,fontWeight:300,lineHeight:1.4}}>{p.companyType}</div>
          </button>
        ))}
        <button onClick={()=>setPreset("custom")} style={{padding:14,borderRadius:8,border:`1px solid ${isCustom?C.accent:C.border}`,background:isCustom?C.accentBg:C.surface,color:isCustom?C.accent:C.textSec,cursor:"pointer",textAlign:"left",fontFamily:"'Outfit'",transition:"all .15s",borderStyle:"dashed"}}>
          <div style={{fontSize:14,fontWeight:600,marginBottom:3}}>Custom Company</div>
          <div style={{fontSize:11.5,color:C.textDim,fontWeight:300}}>Define your own</div>
        </button>
      </div>

      <Card style={{marginBottom:24}}>
        <div className="mono" style={{fontSize:10.5,color:C.textDim,letterSpacing:".06em",textTransform:"uppercase",marginBottom:14}}>
          {isCustom ? "Define Studio Context" : `${active.label} Context`}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div><label>Company Name</label><input value={active.companyName} onChange={e=>isCustom&&setCustom({...custom,companyName:e.target.value})} readOnly={!isCustom} style={{opacity:isCustom?1:.7}} placeholder="Company name"/></div>
          <div><label>Company Type</label><input value={active.companyType} onChange={e=>isCustom&&setCustom({...custom,companyType:e.target.value})} readOnly={!isCustom} style={{opacity:isCustom?1:.7}} placeholder="e.g., Streaming Platform"/></div>
          <div style={{gridColumn:"1/-1"}}><label>Partnership Objective</label><input value={active.objective} onChange={e=>isCustom&&setCustom({...custom,objective:e.target.value})} readOnly={!isCustom} style={{opacity:isCustom?1:.7}} placeholder="What does the studio want from this?"/></div>
          <div style={{gridColumn:"1/-1"}}><label>Project Description</label><textarea value={active.projectDesc} onChange={e=>isCustom&&setCustom({...custom,projectDesc:e.target.value})} readOnly={!isCustom} style={{opacity:isCustom?1:.7}} placeholder="Describe the proposed project or content..." rows={2}/></div>
          <div><label>Deal Type</label>
            <select value={active.dealType} onChange={e=>isCustom&&setCustom({...custom,dealType:e.target.value})} disabled={!isCustom}>
              {["Co-production","Content licensing / first-look deal","Talent/hosting deal","Channel partnership","IP development partnership","Audience development","Joint venture","Platform exclusive deal","Consulting/advisory"].map(o=><option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div><label>Creator Autonomy Level</label>
            <select value={active.autonomyLevel} onChange={e=>isCustom&&setCustom({...custom,autonomyLevel:e.target.value})} disabled={!isCustom}>
              {["Full -- creator maintains complete control","High -- creator leads","Moderate -- collaborative","Low -- studio-led","Minimal -- talent-for-hire"].map(o=><option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div><label>Revenue Model</label>
            <select value={active.revenueModel} onChange={e=>isCustom&&setCustom({...custom,revenueModel:e.target.value})} disabled={!isCustom}>
              {["Revenue share (aligned upside)","Hybrid (base + performance)","Flat fee","Equity / ownership stake","Licensing fee","Barter / cross-promotion","TBD"].map(o=><option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>
      </Card>

      <div style={{display:"flex",justifyContent:"space-between"}}>
        <Btn variant="secondary" onClick={()=>dispatch({type:"STEP",v:3})}><ChevronLeft size={15}/> Back to Profile</Btn>
        <Btn onClick={handleContinue} disabled={!active.companyName}>Run Bridge Assessment <Sparkles size={15}/></Btn>
      </div>
    </div>
  );
}

function ScoringScreen() {
  const {state,dispatch} = useContext(Ctx);

  useState(()=>{
    (async()=>{
      dispatch({type:"PHASE",v:"scoring"});
      try {
        const raw = await callClaudeNoSearch(SCORING_SYS, buildScoringPrompt(state.creatorProfile, state.studioCtx));
        const parsed = parseJSON(raw);
        const scores = parsed.scores || {};
        // Validate and clamp scores
        const clean = {};
        QUESTIONS.forEach(q => {
          const v = parseInt(scores[q.id]);
          clean[q.id] = (v >= 1 && v <= 5) ? v : 3;
        });
        dispatch({type:"SET_SCORES", scores:clean, notes:parsed.dimensionNotes||null});
        // Compute results
        const ds = computeDimScores(clean);
        const total = computeTotal(ds);
        const arch = classify(ds, total);
        const risks = generateRisks(ds);
        dispatch({type:"SET_RESULT", v:{dimScores:ds,total,archetype:arch,risks}});
        // Now generate memo
        dispatch({type:"PHASE",v:"analyzing"});
        try {
          const memoRaw = await callClaudeNoSearch(MEMO_SYS, buildMemoPrompt(state.creatorProfile, state.studioCtx, ds, total, arch, risks, parsed.dimensionNotes));
          const analysis = parseJSON(memoRaw);
          dispatch({type:"SET_ANALYSIS", v:analysis});
          // Now generate revenue unlock
          dispatch({type:"PHASE",v:"revenue"});
          try {
            const revenueRaw = await callClaudeNoSearch(REVENUE_SYS, buildRevenuePrompt(state.creatorProfile, state.studioCtx, total, arch));
            const revenueUnlock = parseJSON(revenueRaw);
            dispatch({type:"SET_REVENUE", v:revenueUnlock});
          } catch(e3) {
            console.error(e3);
            dispatch({type:"SET_REVENUE", v:null});
          }
          dispatch({type:"STEP", v:6});
        } catch(e2) {
          console.error(e2);
          dispatch({type:"SET_ANALYSIS", v:{
            verdict:arch.verdict,
            bridgeAnalysis:`Scored ${total}/100 as "${arch.label}." AI narrative unavailable. Review scores and risks below.`,
            primaryRisk:risks[0]?`${risks[0].title}: ${risks[0].text}`:"None flagged.",
            dealStructure:"Review archetype and scores to inform structure.",
            nextMove:"Address flagged risks before advancing.",
            executiveMemo:`BRIDGEIQ: ${state.creatorProfile?.creatorName} x ${state.studioCtx?.companyName}\n\nBridge Score: ${total}/100\nClassification: ${arch.label}\n\n${arch.verdict}\n\nRisks:\n${risks.map(r=>`- ${r.title}`).join("\n")||"None"}`
          }});
          dispatch({type:"STEP",v:6});
        }
      } catch(e) {
        console.error(e);
        dispatch({type:"ERROR",v:"Scoring failed. Check API key."});
        dispatch({type:"STEP",v:4});
      }
    })();
  });

  const phases = [
    {label:"Scoring 10 dimensions",icon:<Target size={14}/>,active:state.phase==="scoring"},
    {label:"Classifying partnership type",icon:<Shield size={14}/>,active:state.phase==="scoring"},
    {label:"Generating risk analysis",icon:<AlertTriangle size={14}/>,active:state.phase==="scoring"},
    {label:"Writing executive memo",icon:<FileText size={14}/>,active:state.phase==="analyzing"},
    {label:"Modeling revenue unlock",icon:<TrendingUp size={14}/>,active:state.phase==="revenue"},
  ];

  return(
    <div style={{maxWidth:500,margin:"80px auto",textAlign:"center"}}>
      <Loader2 size={36} color={C.accent} style={{margin:"0 auto 20px",animation:"spin 1s linear infinite"}}/>
      <h3 className="serif" style={{fontSize:24,fontWeight:400,marginBottom:6}}>
        {state.creatorProfile?.creatorName} x {state.studioCtx?.companyName}
      </h3>
      <p style={{fontSize:14,color:C.textSec,fontWeight:300,marginBottom:28}}>Running full bridge assessment...</p>
      <div style={{display:"flex",flexDirection:"column",gap:8,alignItems:"center"}}>
        {phases.map((p,i)=>(
          <StatusPill key={i} icon={p.icon} text={p.label} color={p.active?C.accent:C.textDim} pulse={p.active}/>
        ))}
      </div>
    </div>
  );
}

/* ================================================================
   DASHBOARD
   ================================================================ */

function Dashboard() {
  const {state,dispatch} = useContext(Ctx);
  const {result,analysis,revenueUnlock,creatorProfile:cp,studioCtx:sc} = state;
  const [tab,setTab] = useState("overview");
  if (!result) return null;
  const {total,archetype:ac,dimScores,risks} = result;

  const barData=DIMS.map((d,i)=>({name:d.label.length>22?d.label.split(" ").slice(0,2).join(" "):d.label,score:dimScores[i]?.scaled||0,max:d.max,pct:dimScores[i]?.pct||0}));
  const radarData=DIMS.map((d,i)=>{const pct=dimScores[i]?.pct;const val=typeof pct==="number"&&!isNaN(pct)?pct*100:0;return{dim:d.label.split(" ")[0],score:Math.max(0,Math.min(100,val)),fullMark:100};});
  const sevColor={critical:C.danger,high:C.warn,moderate:C.info};
  const sevIcon={critical:<XCircle size={15}/>,high:<AlertTriangle size={15}/>,moderate:<AlertCircle size={15}/>};
  const tabs=[{id:"overview",label:"Overview"},{id:"analysis",label:"Analysis"},{id:"risks",label:`Risks (${risks.length})`},{id:"revenue",label:"Revenue Unlock"},{id:"memo",label:"Executive Memo"}];

  return(
    <div className="fade-up">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:28}}>
        <div>
          <div className="mono" style={{fontSize:11,color:C.textDim,letterSpacing:".1em",marginBottom:6}}>BRIDGE ASSESSMENT</div>
          <h2 className="serif" style={{fontSize:30,fontWeight:400,marginBottom:4}}>{cp?.creatorName} <span style={{color:C.textDim,fontSize:22}}>x</span> {sc?.companyName}</h2>
          <div style={{display:"flex",gap:8,marginTop:8}}>
            <Tag color={ac.color}>{ac.label}</Tag>
            {state.compareMode && <Tag color={state.compareSlot==="A"?C.info:C.purple}>Assessment {state.compareSlot}</Tag>}
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <Btn variant="secondary" size="sm" onClick={()=>generatePDF(cp, sc, result, analysis, state.revenueUnlock)}><FileText size={13}/> Export PDF</Btn>
          {state.compareMode && state.compareSlot==="B" && state.assessmentA && (
            <Btn size="sm" onClick={()=>dispatch({type:"SAVE_AS_B"})} style={{background:C.purple,color:"#fff"}}>View Comparison <Layers size={14}/></Btn>
          )}
          {state.compareMode && state.compareSlot==="A" && (
            <Btn size="sm" onClick={()=>dispatch({type:"SAVE_AS_A"})} style={{background:C.info,color:"#fff"}}>Save as A & Set Up B <ArrowRight size={14}/></Btn>
          )}
          <Btn variant="ghost" size="sm" onClick={()=>{dispatch({type:"STEP",v:4});dispatch({type:"SET_RESULT",v:null});dispatch({type:"SET_ANALYSIS",v:null});}}>Change Studio</Btn>
          <Btn variant="ghost" size="sm" onClick={()=>dispatch({type:"RESET"})}>New</Btn>
        </div>
      </div>

      {/* Hero */}
      <div className="fade-up d1" style={{background:`linear-gradient(135deg, ${C.surface}, ${C.surfaceAlt})`,border:`1px solid ${ac.color}33`,borderRadius:14,padding:28,marginBottom:24}}>
        <div style={{display:"grid",gridTemplateColumns:"150px 1fr",gap:28,alignItems:"center"}}>
          <ScoreRing score={total} size={140}/>
          <div>
            <div className="serif" style={{fontSize:20,color:ac.color,marginBottom:12,lineHeight:1.35}}>{analysis?.verdict || ac.verdict}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div style={{padding:12,borderRadius:8,background:C.bg+"88",border:`1px solid ${C.border}`}}>
                <div className="mono" style={{fontSize:10,color:C.textDim,letterSpacing:".06em",marginBottom:3}}>CLASSIFICATION</div>
                <div style={{fontSize:14,fontWeight:600,color:ac.color}}>{ac.label}</div>
              </div>
              <div style={{padding:12,borderRadius:8,background:C.bg+"88",border:`1px solid ${C.border}`}}>
                <div className="mono" style={{fontSize:10,color:C.textDim,letterSpacing:".06em",marginBottom:3}}>TOP RISK</div>
                <div style={{fontSize:14,fontWeight:600,color:risks.length>0?sevColor[risks[0].severity]:C.accent}}>{risks.length>0?risks[0].title:"None"}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:3,marginBottom:20,borderBottom:`1px solid ${C.border}`}}>
        {tabs.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"10px 18px",border:"none",borderBottom:`2px solid ${tab===t.id?C.accent:"transparent"}`,background:"transparent",color:tab===t.id?C.text:C.textDim,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit'",transition:"all .2s",marginBottom:-1}}>{t.label}</button>)}
      </div>

      {tab==="overview"&&(
        <div className="fade-up">
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18,marginBottom:22}}>
            <Card>
              <div className="mono" style={{fontSize:10.5,color:C.textDim,letterSpacing:".06em",textTransform:"uppercase",marginBottom:10}}>Dimension Radar</div>
              <CustomRadar size={270} data={DIMS.map((d,i)=>({label:d.label.split(" ")[0],value:(dimScores[i]?.pct||0)*100}))}/>
            </Card>
            <Card>
              <div className="mono" style={{fontSize:10.5,color:C.textDim,letterSpacing:".06em",textTransform:"uppercase",marginBottom:10}}>Dimension Scores</div>
              <div style={{height:270}}><ResponsiveContainer><BarChart data={barData} layout="vertical" margin={{left:0,right:16}}><XAxis type="number" domain={[0,"dataMax"]} tick={{fill:C.textDim,fontSize:10}} axisLine={{stroke:C.border}}/><YAxis type="category" dataKey="name" tick={{fill:C.textDim,fontSize:10}} axisLine={false} tickLine={false} width={95}/><Tooltip contentStyle={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,fontFamily:"'Outfit'"}} formatter={(v,n,p)=>[`${v.toFixed(1)}/${p.payload.max}`,""]} /><Bar dataKey="score" radius={[0,4,4,0]}>{barData.map((e,i)=><Cell key={i} fill={e.pct>=.7?C.accent:e.pct>=.5?C.warn:C.danger}/>)}</Bar></BarChart></ResponsiveContainer></div>
            </Card>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:22}}>
            {DIMS.map((d,i)=>{
              const ds=dimScores[i];const color=ds.pct>=.7?C.accent:ds.pct>=.5?C.warn:C.danger;
              return(<div key={d.key} style={{padding:14,borderRadius:8,border:`1px solid ${C.border}`,background:C.surface}}>
                <div style={{fontSize:11,color:C.textDim,fontWeight:500,marginBottom:8,lineHeight:1.3}}>{d.label.split(" ").slice(0,2).join(" ")}</div>
                <div style={{display:"flex",alignItems:"baseline",gap:4}}><span className="mono" style={{fontSize:22,fontWeight:500,color}}>{ds.scaled.toFixed(1)}</span><span className="mono" style={{fontSize:11,color:C.textDim}}>/{d.max}</span></div>
                <div style={{height:3,borderRadius:2,background:C.border,marginTop:8}}><div style={{height:3,borderRadius:2,background:color,width:`${ds.pct*100}%`,transition:"width .8s ease-out"}}/></div>
                {state.dimNotes && state.dimNotes[d.key] && <div style={{fontSize:11,color:C.textDim,marginTop:8,lineHeight:1.4,fontWeight:300}}>{state.dimNotes[d.key]}</div>}
              </div>);
            })}
          </div>
          {risks.length>0&&(<Card style={{borderColor:sevColor[risks[0].severity]+"33"}}><div className="mono" style={{fontSize:10.5,color:C.textDim,letterSpacing:".06em",textTransform:"uppercase",marginBottom:10}}>Risk Flags</div>{risks.map((r,i)=>(<div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",padding:"10px 0",borderTop:i>0?`1px solid ${C.border}`:"none"}}><div style={{color:sevColor[r.severity],marginTop:1}}>{sevIcon[r.severity]}</div><div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:sevColor[r.severity]}}>{r.title}</div><div style={{fontSize:12.5,color:C.textSec,marginTop:2,fontWeight:300}}>{r.text}</div></div><Tag color={sevColor[r.severity]}>{r.severity}</Tag></div>))}</Card>)}
        </div>
      )}

      {tab==="analysis"&&analysis&&(
        <div className="fade-up">
          <div style={{padding:20,borderRadius:12,border:`1px solid ${ac.color}44`,background:ac.color+"0C",marginBottom:18}}>
            <div className="mono" style={{fontSize:10,letterSpacing:".08em",color:C.textDim,marginBottom:4}}>VERDICT</div>
            <div className="serif" style={{fontSize:20,color:ac.color,lineHeight:1.4}}>{analysis.verdict}</div>
          </div>
          {[{title:"Why This Is or Is Not a True Bridge",content:analysis.bridgeAnalysis,icon:<Shield size={15}/>},{title:"Most Important Structural Risk",content:analysis.primaryRisk,icon:<AlertTriangle size={15}/>},{title:"Best-Fit Deal Structure",content:analysis.dealStructure,icon:<DollarSign size={15}/>},{title:"Recommended Next Move",content:analysis.nextMove,icon:<ArrowRight size={15}/>}].map((s,i)=>(
            <Card key={i} style={{marginBottom:14}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,color:C.accent}}>{s.icon}<span className="mono" style={{fontSize:11,fontWeight:500,letterSpacing:".05em",textTransform:"uppercase"}}>{s.title}</span></div>
              <div style={{fontSize:14,color:C.textSec,lineHeight:1.85,whiteSpace:"pre-wrap",fontWeight:300}}>{s.content}</div>
            </Card>
          ))}
        </div>
      )}

      {tab==="risks"&&(
        <div className="fade-up">
          {risks.length===0?(<Card style={{textAlign:"center",padding:48}}><CheckCircle2 size={36} color={C.accent} style={{margin:"0 auto 16px"}}/><div style={{fontSize:16,fontWeight:600}}>No risk flags triggered</div></Card>):(
            risks.map((r,i)=>(<Card key={i} style={{marginBottom:12,borderColor:sevColor[r.severity]+"33"}}><div style={{display:"flex",gap:12,alignItems:"flex-start"}}><div style={{color:sevColor[r.severity],marginTop:2}}>{sevIcon[r.severity]}</div><div style={{flex:1}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><span style={{fontSize:15,fontWeight:600,color:sevColor[r.severity]}}>{r.title}</span><Tag color={sevColor[r.severity]}>{r.severity}</Tag></div><div style={{fontSize:14,color:C.textSec,lineHeight:1.75,fontWeight:300}}>{r.text}</div></div></div></Card>))
          )}
        </div>
      )}

      {tab==="revenue"&&(
        <div className="fade-up">
          {!state.revenueUnlock?(
            <Card style={{textAlign:"center",padding:48}}>
              <TrendingUp size={36} color={C.textDim} style={{margin:"0 auto 16px"}}/>
              <div style={{fontSize:15,fontWeight:600}}>Revenue unlock data unavailable</div>
              <div style={{fontSize:13,color:C.textDim,marginTop:6,fontWeight:300}}>Re-run the assessment to generate this analysis.</div>
            </Card>
          ):(
            <>
              {/* Header */}
              <div style={{padding:20,borderRadius:12,border:`1px solid ${C.accent}33`,background:C.accent+"06",marginBottom:20}}>
                <div className="mono" style={{fontSize:10,letterSpacing:".08em",color:C.textDim,marginBottom:5}}>REVENUE UNLOCK ANALYSIS</div>
                <div style={{fontSize:14.5,color:C.textSec,lineHeight:1.8,fontWeight:300}}>{state.revenueUnlock.inventorySummary}</div>
              </div>

              {/* Revenue range hero */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14,marginBottom:20}}>
                <div style={{gridColumn:"1/3",padding:22,borderRadius:10,border:`1px solid ${C.accent}33`,background:C.surface}}>
                  <div className="mono" style={{fontSize:10.5,color:C.textDim,letterSpacing:".06em",textTransform:"uppercase",marginBottom:10}}>Estimated Annual Ad Revenue Range</div>
                  <div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:8}}>
                    <span className="mono" style={{fontSize:36,fontWeight:500,color:C.accent}}>{state.revenueUnlock.revenueRangeLow}</span>
                    <span style={{fontSize:16,color:C.textDim}}>—</span>
                    <span className="mono" style={{fontSize:36,fontWeight:500,color:C.accent}}>{state.revenueUnlock.revenueRangeHigh}</span>
                  </div>
                  <div style={{fontSize:12.5,color:C.textDim,lineHeight:1.6,fontWeight:300}}>{state.revenueUnlock.revenueMethodology}</div>
                </div>
                <div style={{padding:22,borderRadius:10,border:`1px solid ${C.border}`,background:C.surface,display:"flex",flexDirection:"column",justifyContent:"space-between"}}>
                  <div className="mono" style={{fontSize:10.5,color:C.textDim,letterSpacing:".06em",textTransform:"uppercase",marginBottom:10}}>Est. Total Impressions</div>
                  <div style={{fontSize:15,fontWeight:600,color:C.text,lineHeight:1.4}}>{state.revenueUnlock.estimatedImpressions}</div>
                </div>
              </div>

              {/* Inventory formats + context */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:20}}>
                <Card>
                  <div className="mono" style={{fontSize:10.5,color:C.textDim,letterSpacing:".06em",textTransform:"uppercase",marginBottom:12}}>Net New Inventory Formats</div>
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {(state.revenueUnlock.contentFormats||[]).map((f,i)=>(
                      <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",padding:"10px 12px",borderRadius:7,background:C.bgSub,border:`1px solid ${C.border}`}}>
                        <div className="mono" style={{fontSize:10,color:C.accent,marginTop:2,flexShrink:0}}>{String(i+1).padStart(2,"0")}</div>
                        <div style={{fontSize:13,color:C.textSec,lineHeight:1.55,fontWeight:300}}>{f}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{marginTop:14,paddingTop:14,borderTop:`1px solid ${C.border}`,fontSize:12.5,color:C.textDim,lineHeight:1.6,fontWeight:300}}>{state.revenueUnlock.inventoryContext}</div>
                </Card>

                {/* Brand fit profile */}
                <Card>
                  <div className="mono" style={{fontSize:10.5,color:C.textDim,letterSpacing:".06em",textTransform:"uppercase",marginBottom:12}}>Brand Fit Profile</div>
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {(state.revenueUnlock.brandCategories||[]).map((b,i)=>{
                      const fitColor={strong:C.accent,moderate:C.warn,weak:C.textDim}[b.fit]||C.textDim;
                      return(
                        <div key={i} style={{padding:"10px 12px",borderRadius:7,background:C.bgSub,border:`1px solid ${C.border}`}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                            <span style={{fontSize:13,fontWeight:600,color:C.text}}>{b.category}</span>
                            <span className="mono" style={{fontSize:9.5,color:fitColor,background:fitColor+"14",padding:"2px 8px",borderRadius:3,textTransform:"uppercase",letterSpacing:".05em"}}>{b.fit}</span>
                          </div>
                          <div style={{fontSize:12,color:C.textSec,lineHeight:1.5,fontWeight:300}}>{b.rationale}</div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>

              {/* Agency angle */}
              <Card style={{borderColor:C.info+"33"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,color:C.info}}>
                  <Building size={14}/>
                  <span className="mono" style={{fontSize:10.5,letterSpacing:".06em",textTransform:"uppercase"}}>Agency Buyer Angle</span>
                </div>
                <div style={{fontSize:14,color:C.textSec,lineHeight:1.8,fontWeight:300}}>{state.revenueUnlock.agencyAngle}</div>
              </Card>
            </>
          )}
        </div>
      )}

      {tab==="memo"&&(
        <div className="fade-up">
          {analysis?.executiveMemo?(<><div style={{marginBottom:14}}><div className="mono" style={{fontSize:11,color:C.textDim,letterSpacing:".08em"}}>EXECUTIVE MEMO</div><div style={{fontSize:13.5,color:C.textSec,fontWeight:300,marginTop:2}}>Formatted for forwarding to senior leadership</div></div><CopyBlock text={analysis.executiveMemo}/></>):(<Card style={{textAlign:"center",padding:48}}><FileText size={36} color={C.textDim} style={{margin:"0 auto 16px"}}/><div style={{fontSize:15,fontWeight:600}}>Memo not available</div></Card>)}
        </div>
      )}
    </div>
  );
}

/* ================================================================
   COMPARISON DASHBOARD
   ================================================================ */

function ComparisonDashboard() {
  const {state,dispatch} = useContext(Ctx);
  const {assessmentA:A, assessmentB:B} = state;
  const [tab, setTab] = useState("overview");
  if (!A || !B) return null;

  const sevColor={critical:C.danger,high:C.warn,moderate:C.info};
  const sevIcon={critical:<XCircle size={14}/>,high:<AlertTriangle size={14}/>,moderate:<AlertCircle size={14}/>};

  // Radar overlay data
  const radarData = DIMS.map((d,i) => ({
    dim: d.label.split(" ")[0],
    A: Math.round((A.result.dimScores[i]?.pct||0)*100),
    B: Math.round((B.result.dimScores[i]?.pct||0)*100),
    fullMark: 100,
  }));

  // Dimension winner table
  const dimComparison = DIMS.map((d,i) => {
    const sa = A.result.dimScores[i]?.scaled||0;
    const sb = B.result.dimScores[i]?.scaled||0;
    const winner = sa > sb ? "A" : sb > sa ? "B" : "tie";
    return { dim:d, sa, sb, max:d.max, winner };
  });

  const aWins = dimComparison.filter(x=>x.winner==="A").length;
  const bWins = dimComparison.filter(x=>x.winner==="B").length;

  const ScoreCard = ({label, assess, color}) => {
    const {total, archetype:ac} = assess.result;
    const scoreColor = total>=75?C.accent:total>=55?C.warn:total>=40?C.orange:C.danger;
    return (
      <div style={{flex:1,padding:24,borderRadius:12,border:`2px solid ${color}44`,background:C.surface}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
          <Tag color={color}>Assessment {label}</Tag>
          <Tag color={ac.color}>{ac.label}</Tag>
        </div>
        <div style={{fontSize:13,fontWeight:600,marginBottom:2}}>{assess.profile.creatorName}</div>
        <div style={{fontSize:12,color:C.textDim,marginBottom:14}}>× {assess.studioCtx.companyName} · {assess.studioCtx.dealType}</div>
        <div style={{display:"flex",alignItems:"baseline",gap:6}}>
          <span className="mono" style={{fontSize:52,fontWeight:500,color:scoreColor,lineHeight:1}}>{Math.round(total)}</span>
          <span className="mono" style={{fontSize:13,color:C.textDim}}>/100</span>
        </div>
        <div style={{marginTop:10,fontSize:12.5,color:C.textSec,lineHeight:1.65,fontStyle:"italic",fontWeight:300}}>{assess.analysis?.verdict||ac.verdict}</div>
      </div>
    );
  };

  return (
    <div className="fade-up">
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:28}}>
        <div>
          <div className="mono" style={{fontSize:11,color:C.accent,letterSpacing:".1em",marginBottom:6}}>PARTNERSHIP COMPARISON</div>
          <h2 className="serif" style={{fontSize:28,fontWeight:400}}>Assessment A vs. Assessment B</h2>
        </div>
        <div style={{display:"flex",gap:8}}>
          <Btn variant="secondary" size="sm" onClick={()=>dispatch({type:"RESET"})}>New Assessment</Btn>
        </div>
      </div>

      {/* Score cards */}
      <div style={{display:"flex",gap:16,marginBottom:20}}>
        <ScoreCard label="A" assess={A} color={C.info}/>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6,padding:"0 8px"}}>
          <div style={{fontSize:12,color:C.textDim,fontWeight:600}}>vs.</div>
          <div style={{width:1,flex:1,background:C.border}}/>
        </div>
        <ScoreCard label="B" assess={B} color={C.purple}/>
      </div>

      {/* Dimension winner summary */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:20}}>
        {[
          {label:"A Wins", value:aWins, color:C.info, sub:"dimensions"},
          {label:"Tied", value:dimComparison.filter(x=>x.winner==="tie").length, color:C.textDim, sub:"dimensions"},
          {label:"B Wins", value:bWins, color:C.purple, sub:"dimensions"},
        ].map((s,i)=>(
          <div key={i} style={{padding:16,borderRadius:10,border:`1px solid ${C.border}`,background:C.surface,textAlign:"center"}}>
            <div className="mono" style={{fontSize:32,fontWeight:500,color:s.color,lineHeight:1}}>{s.value}</div>
            <div style={{fontSize:11,color:C.textDim,marginTop:4}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:3,marginBottom:20,borderBottom:`1px solid ${C.border}`}}>
        {[{id:"overview",label:"Side-by-Side"},{id:"dimensions",label:"Dimension Breakdown"},{id:"risks",label:"Risk Comparison"},{id:"memos",label:"Both Memos"}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"10px 18px",border:"none",borderBottom:`2px solid ${tab===t.id?C.accent:"transparent"}`,background:"transparent",color:tab===t.id?C.text:C.textDim,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit'",transition:"all .2s",marginBottom:-1}}>{t.label}</button>
        ))}
      </div>

      {tab==="overview" && (
        <div className="fade-up">
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18,marginBottom:20}}>
            {/* Radar overlay */}
            <Card>
              <div className="mono" style={{fontSize:10.5,color:C.textDim,letterSpacing:".06em",textTransform:"uppercase",marginBottom:10}}>Capability Radar</div>
              <div style={{display:"flex",gap:12,marginBottom:12}}>
                <div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:C.info}}><div style={{width:12,height:3,borderRadius:2,background:C.info}}/> Assessment A</div>
                <div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:C.purple}}><div style={{width:12,height:3,borderRadius:2,background:C.purple}}/> Assessment B</div>
              </div>
              <div style={{height:280}}>
                <CustomRadarDual
                  size={280}
                  dataA={DIMS.map((_,i)=>(A.result.dimScores[i]?.pct||0)*100)}
                  dataB={DIMS.map((_,i)=>(B.result.dimScores[i]?.pct||0)*100)}
                />
              </div>
            </Card>

            {/* Score comparison + revenue */}
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <Card>
                <div className="mono" style={{fontSize:10.5,color:C.textDim,letterSpacing:".06em",textTransform:"uppercase",marginBottom:12}}>Bridge Score</div>
                {[{label:"A",assess:A,color:C.info},{label:"B",assess:B,color:C.purple}].map(({label,assess,color})=>(
                  <div key={label} style={{marginBottom:12}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                      <span style={{fontSize:12,fontWeight:600,color}}>{label}: {assess.profile.creatorName} × {assess.studioCtx.companyName}</span>
                      <span className="mono" style={{fontSize:13,fontWeight:600,color}}>{Math.round(assess.result.total)}/100</span>
                    </div>
                    <div style={{height:7,borderRadius:4,background:C.border}}>
                      <div style={{height:7,borderRadius:4,background:color,width:`${assess.result.total}%`,transition:"width .8s ease-out"}}/>
                    </div>
                  </div>
                ))}
              </Card>

              {(A.revenueUnlock||B.revenueUnlock) && (
                <Card>
                  <div className="mono" style={{fontSize:10.5,color:C.textDim,letterSpacing:".06em",textTransform:"uppercase",marginBottom:12}}>Revenue Unlock Comparison</div>
                  {[{label:"A",assess:A,color:C.info},{label:"B",assess:B,color:C.purple}].map(({label,assess,color})=>(
                    assess.revenueUnlock ? (
                      <div key={label} style={{marginBottom:10,padding:"10px 12px",borderRadius:7,background:C.bgSub,border:`1px solid ${C.border}`}}>
                        <div style={{fontSize:11,fontWeight:600,color,marginBottom:3}}>Assessment {label}</div>
                        <div className="mono" style={{fontSize:15,fontWeight:500,color:C.accent}}>{assess.revenueUnlock.revenueRangeLow} — {assess.revenueUnlock.revenueRangeHigh}</div>
                        <div style={{fontSize:11.5,color:C.textDim,marginTop:2}}>{assess.revenueUnlock.estimatedImpressions}</div>
                      </div>
                    ) : null
                  ))}
                </Card>
              )}

              <Card style={{borderColor:A.result.total > B.result.total ? C.info+"44" : C.purple+"44"}}>
                <div className="mono" style={{fontSize:10.5,color:C.textDim,letterSpacing:".06em",textTransform:"uppercase",marginBottom:8}}>Recommended Partnership</div>
                {A.result.total === B.result.total ? (
                  <div style={{fontSize:14,color:C.textSec,lineHeight:1.6,fontWeight:300}}>Both partnerships score equally. Review dimension breakdown and risks to differentiate.</div>
                ) : (
                  <>
                    <div style={{fontSize:15,fontWeight:700,color:A.result.total>B.result.total?C.info:C.purple,marginBottom:6}}>
                      Assessment {A.result.total>B.result.total?"A":"B"} scores higher
                    </div>
                    <div style={{fontSize:13,color:C.textSec,lineHeight:1.65,fontWeight:300}}>
                      {A.result.total>B.result.total
                        ? `${A.profile.creatorName} × ${A.studioCtx.companyName} (${Math.round(A.result.total)}) outscores ${B.profile.creatorName} × ${B.studioCtx.companyName} (${Math.round(B.result.total)}) by ${Math.round(A.result.total-B.result.total)} points.`
                        : `${B.profile.creatorName} × ${B.studioCtx.companyName} (${Math.round(B.result.total)}) outscores ${A.profile.creatorName} × ${A.studioCtx.companyName} (${Math.round(A.result.total)}) by ${Math.round(B.result.total-A.result.total)} points.`
                      }
                    </div>
                  </>
                )}
              </Card>
            </div>
          </div>
        </div>
      )}

      {tab==="dimensions" && (
        <div className="fade-up">
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {dimComparison.map(({dim,sa,sb,max,winner},i)=>{
              const pctA=sa/max; const pctB=sb/max;
              const colorA=pctA>=.7?C.info:pctA>=.5?C.info+"99":C.info+"55";
              const colorB=pctB>=.7?C.purple:pctB>=.5?C.purple+"99":C.purple+"55";
              return (
                <div key={dim.key} style={{padding:14,borderRadius:10,border:`1px solid ${winner==="A"?C.info+"33":winner==="B"?C.purple+"33":C.border}`,background:C.surface}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <div style={{fontSize:13,fontWeight:600}}>{dim.label}</div>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      {winner!=="tie" && <Tag color={winner==="A"?C.info:C.purple}>{winner==="A"?"A Wins":"B Wins"}</Tag>}
                      {winner==="tie" && <Tag color={C.textDim}>Tied</Tag>}
                    </div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:10,alignItems:"center"}}>
                    <div>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                        <span style={{fontSize:11,color:C.info,fontWeight:500}}>A: {A.profile.creatorName.split(" ")[0]}</span>
                        <span className="mono" style={{fontSize:12,fontWeight:600,color:C.info}}>{sa.toFixed(1)}/{max}</span>
                      </div>
                      <div style={{height:6,borderRadius:3,background:C.border}}>
                        <div style={{height:6,borderRadius:3,background:colorA,width:`${pctA*100}%`}}/>
                      </div>
                    </div>
                    <div style={{fontSize:11,color:C.textDim,textAlign:"center"}}>vs</div>
                    <div>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                        <span style={{fontSize:11,color:C.purple,fontWeight:500}}>B: {B.profile.creatorName.split(" ")[0]}</span>
                        <span className="mono" style={{fontSize:12,fontWeight:600,color:C.purple}}>{sb.toFixed(1)}/{max}</span>
                      </div>
                      <div style={{height:6,borderRadius:3,background:C.border}}>
                        <div style={{height:6,borderRadius:3,background:colorB,width:`${pctB*100}%`}}/>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab==="risks" && (
        <div className="fade-up">
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}}>
            {[{label:"A",assess:A,color:C.info},{label:"B",assess:B,color:C.purple}].map(({label,assess,color})=>(
              <div key={label}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                  <Tag color={color}>Assessment {label}</Tag>
                  <span style={{fontSize:13,color:C.textSec}}>{assess.profile.creatorName} × {assess.studioCtx.companyName}</span>
                </div>
                {assess.result.risks.length===0 ? (
                  <Card style={{textAlign:"center",padding:32}}><CheckCircle2 size={28} color={C.accent} style={{margin:"0 auto 10px"}}/><div style={{fontSize:13,fontWeight:600}}>No risks flagged</div></Card>
                ) : assess.result.risks.map((r,i)=>(
                  <Card key={i} style={{marginBottom:10,borderColor:sevColor[r.severity]+"33"}}>
                    <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                      <div style={{color:sevColor[r.severity],marginTop:1}}>{sevIcon[r.severity]}</div>
                      <div>
                        <div style={{fontSize:12.5,fontWeight:600,color:sevColor[r.severity],marginBottom:4}}>{r.title}</div>
                        <div style={{fontSize:12,color:C.textSec,lineHeight:1.6,fontWeight:300}}>{r.text}</div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab==="memos" && (
        <div className="fade-up">
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}}>
            {[{label:"A",assess:A,color:C.info},{label:"B",assess:B,color:C.purple}].map(({label,assess,color})=>(
              <div key={label}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                  <Tag color={color}>Assessment {label}</Tag>
                  <Btn variant="ghost" size="sm" onClick={()=>generatePDF(assess.profile,assess.studioCtx,assess.result,assess.analysis,assess.revenueUnlock)}><FileText size={12}/> Export PDF</Btn>
                </div>
                {assess.analysis?.executiveMemo ? <CopyBlock text={assess.analysis.executiveMemo}/> : <Card style={{textAlign:"center",padding:32,color:C.textDim}}>Memo unavailable</Card>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================
   APP
   ================================================================ */

export default function BridgeIQ() {
  const [state, dispatch] = useReducer(reducer, init);
  const pages = {
    0:<Landing/>, 1:<URLInput/>, 2:<ResearchingScreen/>,
    3:<ProfileReview/>, 4:<StudioSelect/>, 5:<ScoringScreen/>, 6:<Dashboard/>, 7:<ComparisonDashboard/>,
  };

  return(
    <Ctx.Provider value={{state,dispatch}}>
      <style>{css}</style>
      <div style={{minHeight:"100vh",background:C.bg}}>
        {state.step>0&&(
          <div style={{padding:"11px 28px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",background:C.bgSub}}>
            <div style={{cursor:"pointer"}} onClick={()=>dispatch({type:"STEP",v:0})}><span className="serif" style={{fontSize:19}}>Bridge<span style={{color:C.accent}}>IQ</span></span></div>
            <Btn variant="ghost" size="sm" onClick={()=>dispatch({type:"RESET"})}>Reset</Btn>
          </div>
        )}
        <div style={{maxWidth:state.step===6||state.step===7?1100:state.step===3?860:700,margin:"0 auto",padding:state.step===0?0:"28px 24px 60px"}}>
          {pages[state.step]}
        </div>
      </div>
    </Ctx.Provider>
  );
}
