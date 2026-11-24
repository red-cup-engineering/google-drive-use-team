import { randomUUID } from "node:crypto";
import { Message, Role } from "@a2a-js/sdk";
import { a2aResultParts } from "@red-cup-engineering/a2a-engine/v1-core";
import { sendSenTask } from "@red-cup-engineering/a2a-client/sen-part";
import { extractSenPart, senPart } from "@red-cup-engineering/a2a-engine/sen-part";
import { ACTOR } from "./contract-google-drive-use.mjs";
import { operationBytes, operationFromBytes } from "./a2a-executor.mjs";
import { contentRecord } from "./records.mjs";

export async function invokeGoogleDriveUse(operation, input, {
  agentCardUrl = process.env.GOOGLE_DRIVE_USE_AGENT_CARD_URL,
  send = sendSenTask,
  signal,
} = {}) {
  if (typeof agentCardUrl !== "string" || !agentCardUrl) throw new Error("GOOGLE_DRIVE_USE_AGENT_CARD_URL is required");
  const request = contentRecord({ type: "GoogleDriveUseOperation", provider: ACTOR, operation, input });
  const message = Message.toJSON({ messageId: randomUUID(), contextId: "", taskId: "", role: Role.ROLE_USER, parts: [senPart(operationBytes(request))], metadata: {}, extensions: [], referenceTaskIds: [] });
  const exchange = await send({ agentUrl: agentCardUrl, message, requireSignature: true, signal });
  const output = extractSenPart(a2aResultParts(exchange.result));
  const response = operationFromBytes(output.bytes, output.ni);
  if (response?.type !== "GoogleDriveUseOperationResult" || response.provider !== ACTOR || response.request !== request.id || response.operation !== operation) throw new Error("Google Drive provider returned a foreign result");
  return Object.freeze({ result: response.result, provider: ACTOR, exchange: { inputNi: exchange.inputNi, outputNi: exchange.outputNi, agentCard: exchange.agentCard } });
}
