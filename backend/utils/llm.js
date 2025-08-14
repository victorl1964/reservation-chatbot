const OpenAI = require('openai');
const { getLLMTools } = require('./helpers');
const llmClient = new OpenAI({
  baseURL: process.env.LLM_BASE_URL,
  apiKey: process.env.LLM_API_KEY,
});

const getLLMResponse = async (messages) => {
  try {
    const response = await llmClient.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      tools: getLLMTools(),
      tool_choice: 'auto',
    });

    return response.choices[0].message;
  } catch (error) {
    let errorExplained = error.message;
    if (error.message.includes('403')) {
      errorExplained = `${error.message} ... check that you are connected to the VPN`;
    }
    console.error('LLM Error:', errorExplained);
    return {
      role: 'assistant',
      content:
        "Sorry, I'm having trouble processing your request. Please try again.",
    };
  }
};

module.exports = { getLLMResponse };
