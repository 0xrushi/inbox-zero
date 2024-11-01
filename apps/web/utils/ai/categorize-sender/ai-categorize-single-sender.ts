import { z } from "zod";
import { chatCompletionObject } from "@/utils/llms";
import type { UserAIFields } from "@/utils/llms/types";
import type { Category, User } from "@prisma/client";
import { formatCategoriesForPrompt } from "@/utils/ai/categorize-sender/format-categories";

const categorizeSenderSchema = z.object({
  rationale: z.string().describe("Keep it short. 1-2 sentences max."),
  category: z.string(),
  // possibleCategories: z
  //   .array(z.string())
  //   .describe("Possible categories when the main category is unknown"),
});

export async function aiCategorizeSender({
  user,
  sender,
  previousEmails,
  categories,
}: {
  user: Pick<User, "email"> & UserAIFields;
  sender: string;
  previousEmails: string[];
  categories: Pick<Category, "name" | "description">[];
}) {
  console.log("aiCategorizeSender", { sender, previousEmails });

  const system = `You are an AI assistant specializing in email management and organization.
Your task is to categorize an email sender based on their name, email address, and content from previous emails.
Provide an accurate categorization to help users efficiently manage their inbox.`;

  const prompt = `Categorize the following email sender:
${sender}

Previous emails from this sender:

<previous_emails>
${previousEmails
  .map(
    (email, index) => `
<email_snippet ${index + 1}>
${email}
</email_snippet ${index + 1}>`,
  )
  .join("\n")}

${previousEmails.length === 0 ? "No previous emails found" : ""}
</previous_emails>

Categories:
${formatCategoriesForPrompt(categories)}

Instructions:
1. Analyze the sender's name, email address for clues about their category.
2. Review the content of previous emails to gain more context about the sender's relationship with the user.
3. If the sender's category is clear based on the available information, assign it.
4. If you're not certain, respond with "Unknown".
5. If multiple categories are possible, respond with "Unknown".`;

  const aiResponse = await chatCompletionObject({
    userAi: user,
    system,
    prompt,
    schema: categorizeSenderSchema,
    userEmail: user.email || "",
    usageLabel: "Categorize sender",
  });

  if (!categories.find((c) => c.name === aiResponse.object.category))
    return null;

  return aiResponse.object;
}
