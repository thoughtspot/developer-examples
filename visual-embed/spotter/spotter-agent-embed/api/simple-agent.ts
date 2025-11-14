import { ChatSession, GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import express from "express";

const app = express();

const PORT = process.env.AGENT_PORT || 4000;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const chatIdToChatMap = new Map<string, ChatSession>();


app.use(express.json());

app.post('/api/start', async function (req, res) {
    const uuid = crypto.randomUUID();
    const chat = generativeModel.startChat();
    chatIdToChatMap.set(uuid, chat);
    return res.json({ chatId: uuid, chat });
});

app.post('/api/send', async function (req, res) {
    const { chatId, message } = req.body;
    const chat = chatIdToChatMap.get(chatId);
    if (!chat) {
        return res.status(404).json({ error: "Chat not found" });
    }
    const response = await chat.sendMessage(message);
    return res.json({ chatId, response: response.response });
});

app.post('/api/send-function-response', async function (req, res) {
    const { chatId, functionResponse } = req.body;
    const chat = chatIdToChatMap.get(chatId);
    if (!chat) {
        return res.status(404).json({ error: "Chat not found" });
    }

    const result = await chat.sendMessage([{
        functionResponse,
    }]);
    return res.json({ chatId, result });
});

app.all('/', function (req, res) {
    res.json({ message: "Hello, world!" });
});

const dataAnalyticsFunctionDefinition: any = {
    name: "analyzeData",
    description: "Analyze and run queries on a tabular data set we already have access to.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            query: {
                type: "string",
                description: "The query to run on the data set.",
            },
        },
        required: ["query"],
    },
};

const generativeModel = genAI.getGenerativeModel({
    // Use a model that supports function calling, like a Gemini 1.5 model
    model: "gemini-2.0-flash",

    // Specify the function declaration.
    tools: [{
        functionDeclarations: [dataAnalyticsFunctionDefinition],
    }],
});

app.listen(PORT, function (err) {
    if (err) console.log(err);
    console.log("Server listening on", `https://localhost:${PORT}`);
});