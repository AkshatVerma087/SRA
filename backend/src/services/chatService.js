import { ChatAgent } from '../agents/ChatAgent.js';
import prisma from '../config/prisma.js';
import { createChatSnapshot } from '../utils/promptCompaction.js';
import logger from '../config/logger.js';

/**
 * Processes a single chat turn for an analysis session.
 *
 * Token-efficiency improvements:
 *  - Uses ChatAgent (extends BaseAgent) instead of a raw genAI call,
 *    eliminating ~40 lines of duplicated retry/timeout/JSON-repair logic.
 *  - Injects a compact SRS snapshot (createChatSnapshot) instead of the full
 *    resultJson, cutting prompt size from 50KB+ down to ~6-8KB per turn.
 */
export async function processChat(userId, analysisId, userMessage) {
    // 1. Fetch current analysis for context
    const currentAnalysis = await prisma.analysis.findUnique({
        where: { id: analysisId }
    });

    if (!currentAnalysis) throw new Error('Analysis not found');
    if (currentAnalysis.userId !== userId) throw new Error('Unauthorized');

    // 2. Fetch conversation history across all versions in the same root chain
    const rootId = currentAnalysis.rootId || currentAnalysis.id;
    const chainAnalyses = await prisma.analysis.findMany({
        where: {
            OR: [
                { id: rootId },
                { rootId: rootId }
            ]
        },
        select: { id: true }
    });
    const chainIds = chainAnalyses.map(a => a.id);

    const history = await prisma.chatMessage.findMany({
        where: { analysisId: { in: chainIds } },
        orderBy: { createdAt: 'asc' },
        take: 20 // last 20 messages for rolling context window
    });

    const historyText = history.map(msg => `${msg.role}: ${msg.content}`).join('\n');

    // 3. Build compact SRS snapshot — avoids serialising the full 50KB+ resultJson
    //    into every chat turn. createChatSnapshot targets ~6-8K tokens max.
    const srsSnapshot = createChatSnapshot(currentAnalysis.resultJson || {});

    // 4. Delegate to ChatAgent (inherits BaseAgent retry/timeout/JSON-repair)
    const chatAgent = new ChatAgent();
    let parsedResponse;

    if (process.env.MOCK_AI === 'true') {
        parsedResponse = {
            reply: 'Mocked AI Reply',
            updatedAnalysis: {
                projectTitle: 'Mocked V2',
                functionalRequirements: ['New Reqs'],
                nonFunctionalRequirements: [],
                userStories: []
            }
        };
    } else {
        parsedResponse = await chatAgent.chat(srsSnapshot, historyText, userMessage);
    }

    // 5. Persist the conversation turn
    await prisma.chatMessage.create({
        data: { analysisId, role: 'user', content: userMessage }
    });
    await prisma.chatMessage.create({
        data: { analysisId, role: 'assistant', content: parsedResponse.reply }
    });

    // 6. If the AI returned an updated analysis, create a new versioned record
    let newAnalysisId = null;

    if (parsedResponse.updatedAnalysis) {
        await prisma.$transaction(async (tx) => {
            let effectiveRootId = currentAnalysis.rootId;
            if (!effectiveRootId) {
                // Legacy: treat parent as root for the new child
                effectiveRootId = currentAnalysis.id;
            }

            const maxVersionAgg = await tx.analysis.findFirst({
                where: { rootId: effectiveRootId },
                orderBy: { version: 'desc' },
                select: { version: true }
            });
            const version = (maxVersionAgg?.version || 0) + 1;
            const title = parsedResponse.updatedAnalysis.projectTitle || `Version ${version}`;

            const newAnalysis = await tx.analysis.create({
                data: {
                    userId,
                    inputText: currentAnalysis.inputText,
                    resultJson: parsedResponse.updatedAnalysis,
                    version,
                    title,
                    rootId: effectiveRootId,
                    parentId: currentAnalysis.id,
                    metadata: {
                        trigger: 'chat',
                        source: 'ai',
                        promptSettings: {
                            ...(currentAnalysis.metadata?.promptSettings || {}),
                            modelName: currentAnalysis.metadata?.promptSettings?.modelName
                                || process.env.GEMINI_MODEL_NAME
                                || 'gemini-3-flash-preview',
                            modelProvider: currentAnalysis.metadata?.promptSettings?.modelProvider || 'google'
                        }
                    }
                }
            });
            newAnalysisId = newAnalysis.id;
        });

        logger.info(`[Chat Service] Created new analysis version ${newAnalysisId} from chat edit.`);
    }

    return {
        reply: parsedResponse.reply,
        newAnalysisId // If present, frontend should redirect/refresh to the new version
    };
}
