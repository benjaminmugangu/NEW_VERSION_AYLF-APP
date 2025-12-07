/**
 * AI Service Layer
 * 
 * Abstraction for AI operations. Currently runs in "Mock Mode" until
 * an API key (OPENAI_API_KEY or GEMINI_API_KEY) is provided.
 */

export interface AIRequest {
    action: 'improve' | 'summary' | 'fix_spelling';
    text: string;
}

export interface AIResponse {
    result: string;
}

// Simulated delay to mimic API latency
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function generateAIResponse(request: AIRequest): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.log("No API Key found, using Mock Mode");
        return mockGenerate(request);
    }

    try {
        return await callGemini(request, apiKey);
    } catch (error) {
        console.error("Gemini API access failed, falling back to mock:", error);
        return mockGenerate(request);
    }
}

async function callGemini(request: AIRequest, apiKey: string): Promise<string> {
    const { action, text } = request;

    let systemPrompt = "";
    switch (action) {
        case 'improve':
            systemPrompt = "Tu es un expert en communication professionnelle. Améliore le texte suivant pour un rapport d'activité officiel. Garde le sens original mais rends-le plus formel, clair et impactant. Réponds uniquement avec le texte amélioré.";
            break;
        case 'summary':
            systemPrompt = "Tu es un assistant analytique. Génère un résumé exécutif court (3-4 phrases) du texte suivant, en mettant en avant les points clés et les chiffres. Réponds uniquement avec le résumé.";
            break;
        case 'fix_spelling':
            systemPrompt = "Corrige les fautes d'orthographe et de grammaire du texte suivant. Ne change pas le style. Réponds uniquement avec le texte corrigé.";
            break;
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{
                parts: [{ text: `${systemPrompt}\n\n---\n\nTexte à traiter:\n${text}` }]
            }]
        })
    });

    if (!response.ok) {
        throw new Error(`Gemini API Error: ${response.statusText}`);
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) throw new Error("No text generated from Gemini");

    return generatedText.trim();
}

async function mockGenerate(request: AIRequest): Promise<string> {
    await delay(1500); // Fake network delay

    const { action, text } = request;

    switch (action) {
        case 'improve':
            return `[Version Améliorée par IA ✨]\n\n${text}\n\nEn outre, nous tenons à souligner l'excellent travail d'équipe qui a permis d'atteindre ces résultats probants. La synergie entre les différents groupes a été un facteur clé de succès.`;

        case 'summary':
            return `[Résumé Exécutif IA 📝]\n\nCe mois-ci, les activités se sont concentrées sur le renforcement communautaire. Points clés à retenir : forte participation, engagement notable des leaders, et impact positif sur le terrain.`;

        case 'fix_spelling':
            return text.replace(/é/g, 'é').replace(/è/g, 'è'); // Dummy fix, would correct actual typos in real version

        default:
            return text;
    }
}
