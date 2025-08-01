import { openai } from "@/koala/bedrock";
import { zodResponseFormat } from "../../zod-helpers";
import { z } from "zod";
import { clean } from "./util";
import { alphabetical, cluster, template, unique } from "radash";
// Locally defined ChatCompletionMessageParam
type ChatCompletionMessageParam = {
  role: string;
  content: string;
};
import { supportedLanguages } from "@/koala/shared-types";

const TRANSLATION = z.array(
  z.object({
    term: z.string(),
    definition: z.string(),
  }),
);

const ClusterSchema = z.object({
  clusters: TRANSLATION,
});

const SYSTEM_PROMPT = `
You are a language expert specializing in {{LANGUAGE}} second language acquisition and lexical chunks.
Your task is to generate natural, idiomatic "chunks"—collocations, common phrases,
or sentence stems—from a provided list of target words in {{LANGUAGE}}.

Instructions:

    Input: A list of target words in {{LANGUAGE}}.

    Task: For each target word, identify and output two clusters that:
        Includes the target words.
        Are widely recognized as natural and idiomatic in everyday {{LANGUAGE}}.
        May be a collocation, idiomatic expression, sentence stem, or common phrase.

    Output Format:
    For each target word, return one JSON object with the following structure:

    {"term": "<cluster in {{LANGUAGE}}>", "definition": "<English translation>"}

    Do not include any extra hints, commentary, or formatting beyond this structure.

    Quality Guidelines:
        Ensure the cluster is grammatically correct and idiomatic.
        Provide an accurate, natural English translation.
        Double-check for grammatical errors, non-idiomatic expressions, or mistranslations.

Examples of High Quality Chunks:

    진하다 ⇒ {"term": "진한 맛", "definition": "Strong flavor"}
    결정 ⇒ {"term": "결정을 내려요", "definition": "Make a decision."}
    기반 ⇒ {"term": "기반 기술을 구현했습니다", "definition": "I implemented the underlying technology."}
    멀리 ⇒ {"term": "멀리서 들려오는 소리", "definition": "A sound heard from afar."}
    굴다 ⇒ {"term": "못되게 굴다", "definition": "To behave badly."}
    생방송 ⇒ {"term": "생방송 시작합니다", "definition": "Live broadcast is starting."}
    여우 ⇒ {"term": "여우 같은 눈빛", "definition": "Fox-like gaze."}
    욕 ⇒ {"term": "욕하지 마세요", "definition": "Please don't curse."}
    공연 ⇒ {"term": "인상적인 공연", "definition": "An impressive performance."}

Avoid examples with poor grammar, non-idiomatic usage, or incorrect translations.
Skip obscure or misspelled.
`;

const USER_PROMPT = `
Please generate clusters for the following target words:

{{WORDS}}

Double check your output when you are done.
`;

function tpl(x: string, y: {}) {
  return template(x, y);
}

async function run(language: string, words: string[]) {
  const part1: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: tpl(SYSTEM_PROMPT, { LANGUAGE: language }),
    },
    {
      role: "user",
      content: tpl(USER_PROMPT, { WORDS: clean(words.join("\n")) }),
    },
  ];

  const response1 = await openai.beta.chat.completions.parse({
    messages: part1,
    model: "chatgpt-4o-latest",
  });

  const content = response1.choices[0]?.message?.content ?? "";
  console.log(content);
  const KOREAN_EDIT = `
  You are a Korean language content editor.
  You edit flashcards for a language learning app.
  Edit the cards so that they conform to the following standards:

  1. Convert '다' verbs to the '요' form instead. Example: '가다' ⇒ '가요'. Do this for all verbs and double check your work.",
  2. Avoid over use of pronouns in translations. Translate "음식을 데워요" to just "heat up food" rather than "he/she/they heat up food".
  3. Remove strange, obscure or non-idiomatic examples.
  4. Avoid overused words like: 분위기, 상황, 느낌, 느끼다, 계획

  Double check your work against these rules when you are done.
  `;
  const response2 = await openai.beta.chat.completions.parse({
    messages: [
      ...part1,
      {
        role: "assistant",
        content: content,
      },
      {
        role: "system",
        content:
          language === supportedLanguages.ko
            ? KOREAN_EDIT
            : "Double check your output when you are done.",
      },
    ],
    model: "gpt-4.1",
    temperature: 0.1,
    response_format: zodResponseFormat(ClusterSchema, "translations"),
  });

  const parsedResponse = response2.choices[0]?.message?.parsed;

  if (!parsedResponse) {
    throw new Error("Invalid response format from OpenAI.");
  }

  return parsedResponse.clusters;
}

export async function clusters(words: string[], language: string) {
  if (words.length < 1) {
    return [];
  }

  const results = await Promise.all(
    cluster(words.slice(0, 120), 10).map((chunk) => run(language, chunk)),
  );
  const c = alphabetical(results.flat(), (x) => x.term);
  return unique(c, (x) => x.term);
}
