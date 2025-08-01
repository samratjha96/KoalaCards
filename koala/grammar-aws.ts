// This is a replacement for the grammar.ts file using AWS Bedrock
import { z } from "zod";
import { bedrockParseWithSchema } from "./aws-services";
import { prismaClient } from "./prisma-client";
import { QuizEvaluator } from "./quiz-evaluators/types";
import { getLangName } from "./get-lang-name";
import { LangCode } from "./shared-types";

// Define the schema for responses
const _zodGradeResponse = z.object({
  yesNo: z.enum(["yes", "no"]),
  why: z.string(),
});

type Explanation = z.infer<typeof _zodGradeResponse>;

type GrammarCorrectionProps = {
  term: string; // Prompt term
  definition: string; // Example correct answer
  langCode: string;
  userInput: string;
};

type StoreTrainingData = (
  props: GrammarCorrectionProps,
  exp: Explanation,
) => Promise<void>;

// Schema already defined at the top of the file

const storeTrainingData: StoreTrainingData = async (props, exp) => {
  const { term, definition, langCode, userInput } = props;
  const { yesNo, why } = exp;

  await prismaClient.trainingData.create({
    data: {
      term,
      definition,
      langCode,
      userInput,
      yesNo,
      explanation: why,
      quizType: "speaking-v2-bedrock-claude",
      englishTranslation: "NA",
    },
  });
};

const LANG_OVERRIDES: Partial<Record<LangCode, string>> = {
  ko: "For the sake of this discussion, let's say that formality levels don't need to be taken into consideration.",
};

async function run(props: GrammarCorrectionProps): Promise<Explanation> {
  const override = LANG_OVERRIDES[props.langCode as LangCode] || "";
  const prompt = [
    `I am learning ${getLangName(props.langCode)}.`,
    `We know "${props.term}" means "${props.definition}" in English.`,
    `Let's say I am in a situation that warrants the sentence above.`,
    `Could I say "${props.userInput}" instead (note: I entered it via speech-to-text)?`,
    `Would that be OK?`,
    override,
    `Explain in one tweet or less.`,
  ].join(" ");

  // Define the schema for response validation
  const schema = {
    type: "object",
    properties: {
      yesNo: {
        type: "string",
        enum: ["yes", "no"]
      },
      why: {
        type: "string"
      }
    },
    required: ["yesNo", "why"]
  };

  // Call Bedrock with the schema
  return await bedrockParseWithSchema<Explanation>({
    messages: [{ role: "user", content: prompt }],
    schema,
    temperature: 0.1,
    max_tokens: 250,
  });
}

async function runAndStore(
  props: GrammarCorrectionProps,
): Promise<Explanation> {
  const result = await run(props);
  storeTrainingData(props, result);
  return result;
}

export const grammarCorrectionNext: QuizEvaluator = async ({
  userInput,
  card,
}) => {
  const chosen = await runAndStore({ ...card, userInput });
  console.log(JSON.stringify(chosen));
  if (chosen.yesNo === "yes") {
    return { result: "pass", userMessage: chosen.why };
  } else {
    return {
      result: "fail",
      userMessage: chosen.why,
    };
  }
};