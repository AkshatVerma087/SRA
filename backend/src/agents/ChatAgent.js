import { BaseAgent } from './BaseAgent.js';
import { CHAT_PROMPT } from '../utils/prompts.js';
import { OUTPUT_TOKEN_LIMITS, TEMPERATURES } from '../utils/llmGenerationConfig.js';

/**
 * ChatAgent — handles conversational Q&A and targeted SRS edits.
 *
 * Uses BaseAgent.callLLM() to inherit:
 *  - Structured retry/back-off logic (429, 503, timeout)
 *  - Automatic JSON repair via jsonrepair
 *  - Centralised logging and mock-mode support
 *  - systemInstruction separation for Gemini prompt caching
 */
export class ChatAgent extends BaseAgent {
    constructor() {
        super('Chat Agent');
    }

    /**
     * Process a single chat turn given the compact SRS snapshot and conversation history.
     *
     * @param {object}   srsSnapshot  — Compact SRS from createChatSnapshot() (NOT the full resultJson)
     * @param {string}   historyText  — Serialised prior messages (role: content\n...)
     * @param {string}   userMessage  — Latest user message
     * @returns {Promise<{reply: string, updatedAnalysis: object|null}>}
     */
    async chat(srsSnapshot, historyText, userMessage) {
        const prompt = `
<current_analysis_json>
${JSON.stringify(srsSnapshot)}
</current_analysis_json>

<chat_history>
${historyText}
</chat_history>

<user_message>
User: ${userMessage}
</user_message>
`;

        return this.callLLM(
            prompt,
            TEMPERATURES.critic,   // 0.3 — deterministic edits, accurate answers
            true,                  // jsonMode
            null,                  // no responseSchema (flexible chat output)
            3,                     // retries
            2000,                  // initialDelay
            {
                systemInstruction: CHAT_PROMPT,
                maxOutputTokens: OUTPUT_TOKEN_LIMITS.srsRefinement
            }
        );
    }
}
