// helperfunction.js
// ⚠️ Ensure 'dotenv' is required in your main server file (app.js/server.js)

/**
 * Analyzes a medical situation using Groq's Vision API
 * @param {string} base64Image - The image encoded as a base64 string
 * @param {Array} medicalHistory - Array of strings OR objects
 * @param {string} apiKey - Your Groq API Key
 * @returns {Promise<Object>} - JSON object with the emergency assessment
 */
async function assessEmergencyWithGroq(base64Image, medicalHistory, apiKey) {
  const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
  
  // ⬇️ PASTE THE WORKING MODEL ID YOU FOUND HERE
  const MODEL_ID = 'meta-llama/llama-4-scout-17b-16e-instruct'; 

  // 1. Format History
  let historyContext = "No known pre-existing conditions";
  if (medicalHistory && medicalHistory.length > 0) {
    if (typeof medicalHistory[0] === 'object') {
      historyContext = medicalHistory.map(item => 
        `${item.condition} (Treatment: ${item.treatment || 'None'})`
      ).join(", ");
    } else {
      historyContext = medicalHistory.join(", ");
    }
  }

  // 2. Clean & Fix Base64
  let cleanString = base64Image.trim();
  cleanString = cleanString.replace(/^data:image\/[a-z]+;base64,/, ""); // Remove header
  cleanString = cleanString.replace(/[^A-Za-z0-9+/=]/g, ""); // Remove bad chars
  
  // Fix Padding
  const missingPadding = cleanString.length % 4;
  if (missingPadding) {
    cleanString += '='.repeat(4 - missingPadding);
  }
  
  const finalImageUri = `data:image/jpeg;base64,${cleanString}`;

  // 3. Construct Payload
  const payload = {
    model: MODEL_ID,
    messages: [
      {
        role: "system",
        content: `
          You are a medical triage AI. Analyze the image and patient history.
          CRITICAL RULES:
          1. Return ONLY valid JSON.
          2. Structure: { "condition": string, "severity": "High"|"Medium"|"Low", "reasoning": string, "action": string }
          3. If the image is unclear, set condition to "Unclear".
        `
      },
      {
        role: "user",
        content: [
          { type: "text", text: `Patient History: ${historyContext}. Analyze this image.` },
          { type: "image_url", image_url: { url: finalImageUri } }
        ]
      }
    ],
    temperature: 0.1,
    max_tokens: 512,
    response_format: { type: "json_object" }
  };

  try {
    const response = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq API Error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const aiResponseString = data.choices[0]?.message?.content;

    if (!aiResponseString) throw new Error("Empty response from Groq");

    return JSON.parse(aiResponseString);

  } catch (error) {
    console.error("❌ Assessment Failed:", error.message);
    // Return a safe fallback object so your app doesn't crash
    return {
      condition: "Error",
      severity: "Unknown",
      reasoning: "AI Service Unavailable. Please rely on manual triage.",
      action: "Call emergency services."
    };
  }
}

module.exports = { assessEmergencyWithGroq };