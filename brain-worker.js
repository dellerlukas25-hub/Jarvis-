import {
  pipeline
} from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0";

const MODEL =
  "onnx-community/Qwen2.5-Coder-0.5B-Instruct";

let generator = null;
let loadingPromise = null;

let conversation = [];

async function loadBrain() {

  if (generator) {
    return generator;
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  const options = {
    dtype: "q4",

    progress_callback: info => {

      self.postMessage({
        type: "progress",
        status: info.status,
        progress:
          typeof info.progress === "number"
            ? info.progress
            : null,
        file: info.file || ""
      });

    }
  };

  /*
    Safari 26+ on modern iPhones supports WebGPU.
    Use it when available.
  */

  if (self.navigator.gpu) {
    options.device = "webgpu";
  }

  loadingPromise = pipeline(
    "text-generation",
    MODEL,
    options
  );

  generator =
    await loadingPromise;

  loadingPromise = null;

  self.postMessage({
    type: "ready"
  });

  return generator;
}


async function askJarvis(text) {

  const brain =
    await loadBrain();

  conversation.push({
    role: "user",
    content: text
  });

  /*
    Prevent the conversation from
    growing forever on the phone.
  */

  if (conversation.length > 12) {
    conversation =
      conversation.slice(-12);
  }

  const messages = [
    {
      role: "system",

      content: `
You are JARVIS.

You are a local personal artificial intelligence
running directly on the user's device.

Your personality is calm, intelligent, concise,
technical and capable.

You are also JARVIS's software engineering brain.

You are skilled in:

HTML
CSS
JavaScript
Progressive Web Apps
debugging
software architecture
code generation
code review

When the user asks a normal question,
answer normally.

When the user asks for programming help,
provide technically correct code and explanations.

Do not claim that you changed your own source code
unless the developer subsystem actually confirms
that a source-code modification occurred.

Keep responses reasonably concise unless the user
asks for detail.
`
    },

    ...conversation
  ];

  const output =
    await brain(
      messages,
      {
        max_new_tokens: 256,
        do_sample: false,
        repetition_penalty: 1.05
      }
    );

  let answer = "";

  const generated =
    output?.[0]?.generated_text;

  if (Array.isArray(generated)) {

    answer =
      generated
        .at(-1)
        ?.content || "";

  } else if (
    typeof generated === "string"
  ) {

    answer = generated;

  }

  if (!answer.trim()) {
    answer =
      "I was unable to generate a response.";
  }

  conversation.push({
    role: "assistant",
    content: answer
  });

  self.postMessage({
    type: "response",
    text: answer
  });
}


self.onmessage =
  async event => {

    const data =
      event.data || {};

    try {

      if (
        data.type === "load"
      ) {

        await loadBrain();

      }

      if (
        data.type === "ask"
      ) {

        await askJarvis(
          data.text
        );

      }

    } catch (error) {

      console.error(error);

      self.postMessage({
        type: "error",
        message:
          error?.message ||
          String(error)
      });

    }

  };
