import { thoughtSpotClient } from "./thoughtspot-client";

const DATA_SOURCE_ID = process.env.VITE_TS_DATASOURCE_ID || "";
const THOUGHTSPOT_HOST: string = process.env.VITE_THOUGHTSPOT_HOST || "";


export async function getRelevantQuestions(query: string, additionalContext: string = ''): Promise<string[]> {
    const questions = await thoughtSpotClient.queryGetDecomposedQuery({
        nlsRequest: {
            query: query,
        },
        content: [
            additionalContext,
        ],
        worksheetIds: [DATA_SOURCE_ID]
    })
    return questions.decomposedQueryResponse?.decomposedQueries?.map((q) => q.query!) || [];
}

export async function getAnswerForQuestion(question: string) {
    console.log("[DEBUG] Getting answer for question: ", question);
    const answer = await thoughtSpotClient.singleAnswer({
        query: question,
        metadata_identifier: DATA_SOURCE_ID,
    })

    console.log("[DEBUG] Getting Data for question: ", question);
    const [data, tml] = await Promise.all([
        thoughtSpotClient.exportAnswerReport({
            session_identifier: answer.session_identifier!,
            generation_number: answer.generation_number!,
            file_format: "CSV",
        }),
        (thoughtSpotClient as any).exportUnsavedAnswerTML({
            session_identifier: answer.session_identifier!,
            generation_number: answer.generation_number!,
        })
    ])

    return {
        question,
        ...answer,
        data: await data.text(),
        tml,
    };
}

export async function createLiveboard(name: string, answers: any[]) {
    const tml = {
        liveboard: {
            name,
            visualizations: answers.map((answer, idx) => ({
                id: `Viz_${idx}`,
                answer: {
                    ...answer.tml.answer,
                    name: answer.question,
                },
            })),
            layout: {
                tiles: answers.map((answer, idx) => ({
                    visualization_id: `Viz_${idx}`,
                    size: 'MEDIUM_SMALL'
                }))
            },
        }
    };

    const resp = await thoughtSpotClient.importMetadataTML({
        metadata_tmls: [JSON.stringify(tml)],
        import_policy: "ALL_OR_NONE",
    })

    return `https://${THOUGHTSPOT_HOST}/#/pinboard/${resp[0].response.header.id_guid}`;
}

