import { ChatSession, GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import express from "express";
import cors from "cors";
import { getRelevantData, relevantDataFunctionDefinition } from "./relevant-data";
import { randomUUID } from "crypto";

const app = express();

const PORT = process.env.AGENT_PORT || 4000;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const chatIdToChatMap = new Map<string, ChatSession>();
let testChat: ChatSession;

// Initialize test chat session
const initializeTestChat = () => {
    if (!testChat) {
        testChat = generativeModel.startChat();
        chatIdToChatMap.set('test', testChat);
    }
    return testChat;
};

// Middleware
app.use(cors());
app.use(express.json());

app.post('/api/start', async function (req, res) {
    const uuid = randomUUID();
    const chat = generativeModel.startChat();
    chatIdToChatMap.set(uuid, chat);
    return res.json({ chatId: uuid });
});

async function handleFunctionCall(functionArgs: any, res: express.Response, chat: ChatSession) {
    const { allAnswers, liveboard } = await getRelevantData(
        functionArgs.query,
        (data) => {
            // stream the data to the client
            res.write(data);
        }
    );

    // Send the answers as function response to gemini
    const result = await chat.sendMessageStream([{
        functionResponse: {
            name: "getRelevantData",
            response: {
                data: {
                    answers: allAnswers.map(answer => {
                        return {
                            question: answer.question,
                            interpretation: answer.tokens,
                            data: answer.data,
                        }
                    }),
                    liveboard: liveboard,
                },
            },
        },
    }]);

    // Process the result stream recursively
    await processStream(result.stream, res, chat);
}

// Helper function to process a stream from Gemini
async function processStream(stream: any, res: express.Response, chat: ChatSession) {
    const functionCalls: Promise<void>[] = [];
    for await (const chunk of stream) {
        // Check if candidates exist and have content
        if (chunk.candidates && chunk.candidates.length > 0 && chunk.candidates[0].content) {
            const part = chunk.candidates[0].content.parts[0];

            if (part.functionCall && part.functionCall.name === "getRelevantData") {
                // Handle function call
                const functionArgs = part.functionCall.args as { query: string };
                functionCalls.push(handleFunctionCall(functionArgs, res, chat));
            } else if (part.text) {
                // Stream the text response
                res.write(part.text);
            }
        }
    }

    await Promise.all(functionCalls);
}

app.post('/api/send', async function (req, res) {
    const { chatId, message } = req.body;
    let chat = chatIdToChatMap.get(chatId);

    // If chatId is 'test', use or create test chat session
    if (chatId === 'test') {
        chat = initializeTestChat();
    }

    if (!chat) {
        return res.status(404).json({ error: "Chat not found" });
    }

    // Set headers for streaming response
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.flushHeaders();

    try {
        // Use the streaming API
        const result = await chat.sendMessageStream(message);

        // Process the stream using the helper function
        await processStream(result.stream, res, chat);

        // End the response when streaming is complete
        res.end();
    } catch (error) {
        console.error("Error in streaming response:", error);
        res.status(500).json({ error: "Error processing request" });
    }
});

app.get('/', function (req, res) {
    res.json({ message: "Hello, world!" });
});

const generativeModel = genAI.getGenerativeModel({
    // Use a model that supports function calling, like a Gemini 1.5 model
    model: "gemini-2.5-flash",

    // Specify the function declaration.
    tools: [{
        functionDeclarations: [relevantDataFunctionDefinition],
    }],
    systemInstruction: `
        You are a helpful assistant, which can answer questions by using the relevant data tool which returns relevant data from a database to answer any question. Use the tool when you feel appropriate. The questions are generally business questions. Like "How do I increase sales?" You will get the relevant data and provide a summary with specific actions and recommendations based on the data and your own knowledge. Quote specific data points (answers) from the data which is in the form of a collection of answers(with their data and the original question) with a reference to the question corresponding to each answer in square brackets [question1, question2, ...], where question is the real text of the question that was answered in the function call, to support your recommendations, make all numbers human readable. Provide a link to the liveboard at the end of your response for the user to open in a new tab.
    `,
});

app.listen(PORT, () => {
    console.log("Server listening on", `http://localhost:${PORT}`);
});