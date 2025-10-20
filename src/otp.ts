 import { createEvent, halt, type Emitter, type Unsubscribe } from './main';

// =========================================
// Internal Symbols
// =========================================
const $Tag = Symbol('OTP.Tag');
const $Continue = Symbol('OTP.Continue');
const $Stop = Symbol('OTP.Stop');

// =========================================
// Core Types
// =========================================

/**
 * A strongly-typed, unique reference to a running Actor (Process ID).
 * This is a branded version of the library's `Emitter`.
 * @template Msg The union type of all messages this actor can receive.
 */
export type Pid<Msg> = Emitter<Msg> & {
  readonly id: symbol;
};

/**
 * A handle to a spawned actor, containing its public-facing `pid`
 * and a `dispose` method for manual cleanup.
 * @template Msg The message union type for the actor.
 */
export type ActorRef<Msg extends OtpMessage> = {
  /** The actor's public process identifier, used for sending messages. */
  readonly pid: Pid<Msg>;
  /**
   * Shuts down the actor, unsubscribing it from its mailbox.
   * Any messages already queued will be ignored.
   */
  readonly dispose: () => void;
};

/**
 * The standard shape for all OTP-compatible messages.
 * Uses a unique symbol 'tag' to discriminate between message variants.
 * @template Tag The unique symbol identifying this message variant.
 * @template Payload The data carried by this message.
 */
export type OtpMessage<Tag extends symbol = symbol, Payload = any> = {
  readonly [$Tag]: Tag;
  readonly tag: Tag;
  readonly payload: Payload;
};

/**
 * Represents the outcome of an actor's message-handling logic.
 * @template State The type of the actor's internal state.
 */
export type ActorAction<State> =
  | { readonly kind: typeof $Continue; readonly state: State }
  | { readonly kind: typeof $Stop; readonly reason?: unknown };

/**
 * A declarative map of message tags to their corresponding handler functions.
 * Provides excellent type safety and readability for actor logic.
 * @template Msg The union of all accepted OtpMessages.
 * @template State The actor's internal state.
 */
export type HandlerMap<Msg extends OtpMessage, State> = {
  [Tag in Msg['tag']]: (
    payload: Extract<Msg, { tag: Tag }>['payload'],
    state: State
  ) => ActorAction<State> | Promise<ActorAction<State>>;
};

/**
 * A functional alternative to HandlerMap for defining actor logic.
 * @template Msg The union of all accepted OtpMessages.
 * @template State The actor's internal state.
 */
export type LoopFn<Msg extends OtpMessage, State> = (
  msg: Msg,
  state: State
) => ActorAction<State> | Promise<ActorAction<State>>;


// =========================================
// Control Flow Primitives
// =========================================

/**
 * Provides OTP-style control flow functions for use within actor handlers.
 */
export const otp = {
  /**
   * Instructs the actor to continue its loop with a new or updated state.
   * @param state The state for the next message-handling iteration.
   */
  continue: <S>(state: S): ActorAction<S> => ({ kind: $Continue, state }),

  /**
   * Instructs the actor to shut down gracefully.
   * @param reason Optional reason for termination, useful for supervision.
   */
  stop: (reason?: unknown): ActorAction<any> => ({ kind: $Stop, reason }),
} as const;


// =========================================
// Message Variant Factory
// =========================================

/**
 * Creates a type-safe factory for a specific message variant. This powerful
 * utility helps define message types with minimal boilerplate.
 *
 * @example
 * // Define the tag once
 * const IncTag = Symbol('Increment');
 *
 * // Create the message constructor
 * const Increment = variant(IncTag)<number>();
 *
 * // Use it to create messages
 * const msg = Increment(5); // { tag: IncTag, payload: 5 }
 *
 * @param tag A unique symbol to identify this message variant.
 * @template Tag The unique symbol type.
 */
export function variant<Tag extends symbol>(tag: Tag) {
  /**
   * Returns the final message constructor function.
   * @template Payload The data type this message carries. Use `void` if there is no payload.
   */
  return <Payload = void>(): (
    // If Payload is void, the constructor takes no arguments.
    // Otherwise, it requires a payload of the specified type.
    Payload extends void
      ? () => OtpMessage<Tag, void>
      : (payload: Payload) => OtpMessage<Tag, Payload>
  ) => {
    // This is the runtime function that builds the message object.
    return ((payload?: Payload) => ({
      [$Tag]: tag,
      tag,
      payload: payload as Payload,
    })) as any;
  };
}


// =========================================
// Actor Implementation
// =========================================

/**
 * Spawns a new stateful actor that processes messages sequentially.
 *
 * This function creates a fully encapsulated process with its own state and a
 * mailbox. It leverages `@doeixd/events` to handle message queuing and
 * asynchronous processing automatically.
 *
 * @template Msg The union of all message types this actor accepts.
 * @template State The type of the actor's internal state.
 * @param initialState The initial state of the actor.
 * @param handler A `HandlerMap` or a `LoopFn` that defines the actor's behavior.
 * @returns An `ActorRef` containing the actor's `pid` and a `dispose` function.
 */
export function spawn<Msg extends OtpMessage, State>(
  initialState: State,
  handler: HandlerMap<Msg, State> | LoopFn<Msg, State>
): ActorRef<Msg> {
  const id = Symbol('Pid');
  let currentState = initialState;
  let running = true;
  let unsub: Unsubscribe;

  // The actor's mailbox is a standard reactive event channel.
  const [inbox, send] = createEvent<Msg>();

  // Brand the emitter to create the unique Pid.
  const pid: Pid<Msg> = Object.assign(send, { id });

  // Normalize the provided handler into a single function for the loop.
  const executeLoop: LoopFn<Msg, State> =
    typeof handler === 'function'
      ? handler
      : (msg, state) => {
          // Dispatch based on the message tag. TypeScript ensures this is safe.
           const fn = (handler as any)[msg.tag];
          if (!fn) {
            if (process.env.NODE_ENV !== 'production') {
              console.warn(`[OTP Actor ${String(id)}] No handler for tag: ${String(msg.tag)}`);
            }
            // In typical OTP, unknown messages are ignored.
            return otp.continue(state);
          }
          return fn(msg.payload, state);
        };

  // The main actor loop, which runs for each message received.
  unsub = inbox(async (msg) => {
    // If the actor has been stopped, ignore all subsequent messages.
    if (!running) return halt();

    try {
      const action = await executeLoop(msg, currentState);

      if (action.kind === $Continue) {
        currentState = action.state;
      } else {
        // Normal shutdown requested by the actor's own logic.
        dispose();
      }
    } catch (error) {
      // The actor crashed due to an unhandled exception in its logic.
      console.error(`[OTP Actor ${String(id)}] Crashed:`, error);
      dispose(); // Ensure cleanup on crash.
    }
  });

  const dispose = () => {
    if (!running) return;
    running = false;
    unsub();
  };

  return { pid, dispose };
}


// =========================================
// Client Utilities
// =========================================

/**
 * A custom error class for call timeouts.
 */
export class OtpCallTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OtpCallTimeoutError';
  }
}

/**
 * Performs a synchronous-style "call" to an actor (Request/Reply pattern).
 *
 * It sends a message and returns a Promise that resolves with the actor's reply.
 * This is achieved by creating a temporary, single-use reply channel.
 *
 * @template Msg The actor's message type union.
 * @template Reply The expected reply data type.
 * @param target The `Pid` of the actor to call.
 * @param makeMsg A factory function that receives the temporary `replyTo` Pid and must return the message to send.
 * @param timeoutMs The maximum time in milliseconds to wait for a reply (default: 5000).
 * @returns A `Promise` that resolves with the reply payload.
 */
export function call<Msg extends OtpMessage, Reply>(
  target: Pid<Msg>,
  makeMsg: (replyTo: Pid<Reply>) => Msg,
  timeoutMs = 5000
): Promise<Reply> {
  return new Promise((resolve, reject) => {
    let unsub: Unsubscribe;
    const [onReply, emitReply] = createEvent<Reply>();

    // Brand the temporary emitter to conform to the Pid type.
    const replyTo = Object.assign(emitReply, { id: Symbol('ReplyPid') });

    const timer = setTimeout(() => {
      unsub(); // Clean up the listener to prevent memory leaks.
      reject(new OtpCallTimeoutError(`OTP call to ${String(target.id)} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    // Subscribe to the one-time reply.
    unsub = onReply((response) => {
      clearTimeout(timer);
      unsub(); // Clean up immediately after receiving the reply.
      resolve(response);
    });

    // Send the message with the embedded reply address.
    target(makeMsg(replyTo as Pid<Reply>));
  });
}

/**
 * Performs an asynchronous "cast" to an actor (fire-and-forget).
 *
 * This is functionally identical to calling the `pid` directly, but it is
 * provided for semantic clarity and symmetry with `call`, making it clear that
 * no reply is expected.
 *
 * @param target The actor `Pid`.
 * @param msg The message to send.
 */
export function cast<Msg extends OtpMessage>(target: Pid<Msg>, msg: Msg): void {
  target(msg);
}