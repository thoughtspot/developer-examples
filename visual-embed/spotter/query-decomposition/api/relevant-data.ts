import { SchemaType } from "@google/generative-ai";
import { createLiveboard, getAnswerForQuestion, getRelevantQuestions } from "./thoughtspot";

export const relevantDataFunctionDefinition: any = {
    name: "getRelevantData",
    description: "Given a textual query, this tool generates a set of relevant questions needed to fetch the data for, to answer the query or perform the given task. The data for each generated question is then retrieved from a relational datawarehouse using a collection of SQL statements under the hood. The generated questions with the corresponding data are returned.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            query: {
                type: SchemaType.STRING,
                description: "The query which will be broken down into a set of relevant questions based on heuristics and data available in the datawarehouse.",
            },
        },
        required: ["query"],
    },
};

async function getAnswersForQuestions(questions: string[], streamCb: (data: any) => void): Promise<any[]> {
    const answers = (await Promise.all(
        questions.map(async (question) => {
            try {
                return await getAnswerForQuestion(question);
            } catch (error) {
                console.error(`Failed to get answer for question: ${question}`, error);
                return null;
            }
        })
    )).filter((answer): answer is NonNullable<typeof answer> => answer !== null);

    streamCb(`\n\nRetrieved ${answers.length} answers using **ThoughtSpot Spotter**\n\n`);
    return answers;
}

export const getRelevantData = async (query: string, streamCb: (data: any) => void) => {
    const questions = await getRelevantQuestions(query, "");
    streamCb(`#### Retrieving answers to these relevant questions:\n ${questions.map((q) => `- ${q}`).join("\n")}`);

    const answers = await getAnswersForQuestions(questions, streamCb);

    // const additionalQuestions = await getRelevantQuestions(query, `
    //     These questions have been answered already (with their csv data): ${answers.map((a) => `Question: ${a.question} \n CSV data: \n${a.data}`).join("\n\n ")}
    //     Look at the csv data of the above queries to see if you need additional related queries to be answered. You can also ask questions going deeper into the data returned by applying filters.
    //     Do NOT resend the same query already asked before.
    // `);
    // streamCb(`#### Need to get answers to some of these additional questions:\n ${additionalQuestions.map((q) => `- ${q}`).join("\n")}`);

    // const additionalAnswers = await getAnswersForQuestions(additionalQuestions, streamCb);
    const additionalAnswers = [];

    const allAnswers = [...answers, ...additionalAnswers];
    const liveboard = await createLiveboard(query, allAnswers);
    return {
        allAnswers,
        liveboard,
    };
};