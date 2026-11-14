const defaultClient = async (prompt, apiKey, modelName) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });

  if (response.status === 429) {
    throw new Error('Rate limited');
  }
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return text;
};

export async function suggestDescription(title, keywords, client = defaultClient) {
  const safeTitle = typeof title === 'string' ? title.slice(0, 100) : '';
  const safeKeywords = typeof keywords === 'string' ? keywords.slice(0, 200) : '';
  
  const fallback = `Event: ${safeTitle}. Keywords: ${safeKeywords}`.slice(0, 300);

  if (!safeTitle.trim()) {
    const err = new Error('Title is required');
    err.status = 422;
    throw err;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.MODEL_NAME || 'gemini-2.5-flash';

  if (!apiKey && client === defaultClient) {
    return fallback;
  }

  try {
    const prompt = `Write a short event description (max 300 chars) for title: "${safeTitle}" and keywords: "${safeKeywords}".`;
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), 3000)
    );

    const clientPromise = client(prompt, apiKey, modelName);
    const output = await Promise.race([clientPromise, timeoutPromise]);

    if (typeof output !== 'string' || !output.trim() || output.length > 300) {
      return fallback;
    }

    return output.trim();
  } catch (err) {
    return fallback;
  }
}
