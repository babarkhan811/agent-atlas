// Read a streamed LLM reply correctly.
//
// Assembles the text, records token usage, and refuses to treat a reply that
// was cut off (stop reason "max_tokens") or a broken stream as finished.
// Events follow Anthropic's Messages streaming format; adapt `collect` with a
// small mapping layer for other providers. Run with: node lab.ts

export type StreamEvent = { type: string; [key: string]: any };

export type Reply = {
  text: string;
  stopReason: string | null;
  inputTokens: number;
  outputTokens: number;
  complete: boolean;
};

const FINISHED = ["end_turn", "stop_sequence"];

export class TruncatedReply extends Error {}

export function collect(events: Iterable<StreamEvent>): Reply {
  const text: string[] = [];
  let stopReason: string | null = null, inputTokens = 0, outputTokens = 0;
  let started = false, finished = false;
  for (const event of events) {
    if (event.type === "message_start") {
      started = true;
      inputTokens = event.message.usage.input_tokens;
    } else if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
      text.push(event.delta.text);
    } else if (event.type === "message_delta") {
      stopReason = event.delta?.stop_reason ?? null;
      outputTokens = event.usage?.output_tokens ?? outputTokens;
    } else if (event.type === "message_stop") {
      finished = true;
    } else if (event.type === "error") {
      // Errors can arrive mid-stream after an HTTP 200.
      throw new Error(event.error?.message ?? "stream error");
    }
    // "ping" and unknown event types are ignored on purpose.
  }
  if (!started || !finished) throw new Error("stream ended before message_stop");
  return { text: text.join(""), stopReason, inputTokens, outputTokens, complete: FINISHED.includes(stopReason ?? "") };
}

export function requireComplete(reply: Reply): string {
  if (!reply.complete) throw new TruncatedReply(`reply stopped with ${reply.stopReason} after ${reply.outputTokens} tokens`);
  return reply.text;
}

/** A recorded-style stream so the lab runs without an API key. */
export function* fakeStream(text: string, stopReason = "end_turn", inputTokens = 30): Generator<StreamEvent> {
  yield { type: "message_start", message: { id: "msg_lab", usage: { input_tokens: inputTokens } } };
  yield { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } };
  const words = text.split(" ");
  for (const [i, word] of words.entries()) {
    yield { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: i === 0 ? word : " " + word } };
    if (i === 1) yield { type: "ping" };
  }
  yield { type: "content_block_stop", index: 0 };
  yield { type: "message_delta", delta: { stop_reason: stopReason }, usage: { output_tokens: words.length } };
  yield { type: "message_stop" };
}

if (import.meta.main) {
  const reply = collect(fakeStream("A webhook is a URL another app calls the moment something happens."));
  console.log(requireComplete(reply));
  console.log(`tokens: ${reply.inputTokens} in, ${reply.outputTokens} out`);
}
