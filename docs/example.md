Of course. The `@doeixd/events` library was heavily inspired by `solid-events` and was designed to be a "synthetic" library blending the best parts of the ecosystem, including SolidJS's reactivity patterns. Because of this, the conversion is remarkably straightforward and serves as a great example of how it can be adopted without significant refactoring.

The code remains almost identical, primarily just changing the import statement. This demonstrates that `@doeixd/events` provides a familiar, ergonomic API for developers already comfortable with these reactive patterns.

### Converted Code: Using `@doeixd/events`

Here is the original code, converted to use `@doeixd/events`. The core logic does not need to change because the primitives (`createEvent`, `createSubject`, `createTopic`, `halt`) have matching signatures and behavior.

```typescript
import { useAction, useSubmission } from "@solidjs/router";
import { Accessor, createContext, ParentProps, useContext } from "solid-js";

// Board and Note action imports would be here
import { createColumn, deleteColumn, moveColumn, renameColumn } from "./Column";
import { createNote, deleteNote, editNote, moveNote } from "./Note";
import { BoardData } from "./Board";

// --- CONVERSION START ---
// Step 1: Replace the import from 'solid-events' to '@doeixd/events'.
// The function names and types are intentionally compatible.
import {
  createEvent,
  createSubject,
  createTopic,
  Emitter,
  halt,
  Handler,
} from "@doeixd/events";
// --- CONVERSION END ---

// Type definitions remain the same as they are derived from your action functions.
type CreateColumnProps = Parameters<typeof createColumn>;
type MoveColumnProps = Parameters<typeof moveColumn>;
type RenameColumnProps = Parameters<typeof renameColumn>;
type DeleteColumnProps = Parameters<typeof deleteColumn>;
type CreateNoteProps = Parameters<typeof createNote>;
type MoveNoteProps = Parameters<typeof moveNote>;
type EditNoteProps = Parameters<typeof editNote>;
type DeleteNoteProps = Parameters<typeof deleteNote>;

// The context definition remains identical.
// `@doeixd/events` provides the same Handler, Emitter, and Subject types.
const ctx = createContext<{
  onCreateNote: Handler<CreateNoteProps>;
  emitCreateNote: Emitter<CreateNoteProps>;
  onMoveNote: Handler<MoveNoteProps>;
  emitMoveNote: Emitter<MoveNoteProps>;
  onEditNote: Handler<EditNoteProps>;
  emitEditNote: Emitter<EditNoteProps>;
  onDeleteNote: Handler<DeleteNoteProps>;
  emitDeleteNote: Emitter<DeleteNoteProps>;
  onCreateColumn: Handler<CreateColumnProps>;
  emitCreateColumn: Emitter<CreateColumnProps>;
  onMoveColumn: Handler<MoveColumnProps>;
  emitMoveColumn: Emitter<MoveColumnProps>;
  onRenameColumn: Handler<RenameColumnProps>;
  emitRenameColumn: Emitter<RenameColumnProps>;
  onDeleteColumn: Handler<DeleteColumnProps>;
  emitDeleteColumn: Emitter<DeleteColumnProps>;
  boardData: Accessor<BoardData>;
}>();

export function useBoardActions() {
  const value = useContext(ctx);
  if (!value) throw new Error("BoardActionsProvider not found");
  return value;
}

export function BoardActionsProvider(props: ParentProps<{ board: BoardData }>) {
  // `createEvent` is a 1:1 replacement.
  const [onCreateNote, emitCreateNote] = createEvent<CreateNoteProps>();
  const createNoteAction = useAction(createNote);
  const createNoteSubmission = useSubmission(createNote);
  // The handler chaining is also identical.
  const onCreateNoteComplete = onCreateNote((p) => createNoteAction(...p));

  const [onMoveNote, emitMoveNote] = createEvent<MoveNoteProps>();
  const moveNoteAction = useAction(moveNote);
  const moveNoteSubmission = useSubmission(moveNote);
  const onMoveNoteComplete = onMoveNote((p) => moveNoteAction(...p));

  const [onEditNote, emitEditNote] = createEvent<EditNoteProps>();
  const updateNoteAction = useAction(editNote);
  const updateNoteSubmission = useSubmission(editNote);
  const onEditNoteComplete = onEditNote((p) => updateNoteAction(...p));

  const [onDeleteNote, emitDeleteNote] = createEvent<DeleteNoteProps>();
  const deleteNoteAction = useAction(deleteNote);
  const deleteNoteSubmission = useSubmission(deleteNote);
  const onDeleteNoteComplete = onDeleteNote((p) => deleteNoteAction(...p));

  const [onCreateColumn, emitCreateColumn] = createEvent<CreateColumnProps>();
  const createColumnAction = useAction(createColumn);
  const createColumnSubmission = useSubmission(createColumn);
  const onCreateColumnComplete = onCreateColumn((p) =>
    createColumnAction(...p)
  );

  const [onMoveColumn, emitMoveColumn] = createEvent<MoveColumnProps>();
  const moveColumnAction = useAction(moveColumn);
  const moveColumnSubmission = useSubmission(moveColumn);
  const onMoveColumnComplete = onMoveColumn((p) => moveColumnAction(...p));

  const [onRenameColumn, emitRenameColumn] = createEvent<RenameColumnProps>();
  const renameColumnAction = useAction(renameColumn);
  const renameColumnSubmission = useSubmission(renameColumn);
  const onRenameColumnComplete = onRenameColumn((p) =>
    renameColumnAction(...p)
  );

  const [onDeleteColumn, emitDeleteColumn] = createEvent<DeleteColumnProps>();
  const deleteColumnAction = useAction(deleteColumn);
  const deleteColumnSubmission = useSubmission(deleteColumn);
  const onDeleteColumnComplete = onDeleteColumn((p) =>
    deleteColumnAction(...p)
  );

  // `createTopic` is a 1:1 replacement for merging event streams.
  const onActionComplete = createTopic(
    onCreateNoteComplete,
    onMoveNoteComplete,
    onEditNoteComplete,
    onDeleteNoteComplete,
    onCreateColumnComplete,
    onMoveColumnComplete,
    onRenameColumnComplete,
    onDeleteColumnComplete
  );

  // `@doeixd/events`'s `createSubject` has an overloaded signature that
  // directly supports this SolidJS-style pattern of passing update handlers.
  // This is a key feature for framework compatibility. [cite: src/index.ts, src/events-helpers.ts]
  const boardData = createSubject(
    {
      board: props.board.board,
      columns: props.board.columns,
      notes: props.board.notes,
    },
    onActionComplete(() => {
      // This complex logic prevents optimistic UI updates from happening
      // if another action is still pending, ensuring data consistency.
      if (
        createNoteSubmission.pending ||
        moveNoteSubmission.pending ||
        updateNoteSubmission.pending ||
        deleteNoteSubmission.pending ||
        createColumnSubmission.pending ||
        moveColumnSubmission.pending ||
        renameColumnSubmission.pending ||
        deleteColumnSubmission.pending
      )
        // `halt` is a 1:1 replacement for stopping the event chain.
        halt();

      // If no other action is pending, we update the boardData subject
      // with the latest data from the server (passed via props).
      return props.board;
    })
  );

  const value = {
    onCreateNote,
    emitCreateNote,
    onMoveNote,
    emitMoveNote,
    onEditNote,
    emitEditNote,
    onDeleteNote,
    emitDeleteNote,
    onCreateColumn,
    emitCreateColumn,
    onMoveColumn,
    emitMoveColumn,
    onRenameColumn,
    emitRenameColumn,
    onDeleteColumn,
    emitDeleteColumn,
    boardData,
  };

  return <ctx.Provider value={value}>{props.children}</ctx.Provider>;
}
```

### How This Simplifies and Aligns

*   **Zero Logic Change**: The most telling feature is that no logic had to be rewritten. This shows that `@doeixd/events` provides an API that is not only powerful but also intuitive for developers coming from similar ecosystems.
*   **Unified Tooling**: By switching to `@doeixd/events`, you are no longer using a framework-specific event library. You now have access to a much larger, framework-agnostic toolkit that includes:
    *   **RxJS-style operators** (`debounce`, `throttle`, `map`, `filter`) for more complex event pipelines. [cite: docs/operators.md]
    *   **Advanced state patterns** like `createActor` and `createMachine` for when the state logic in your provider grows too complex for a simple subject. [cite: docs/primitives.md]
    *   **First-class integrations** for React, Vue, and Svelte, making your core business logic portable. [cite: docs/framework-integration.md]
*   **Enhanced Safety Features**: Although not explicitly used in this snippet, your codebase now has easy access to the library's built-in safety nets, such as automatic cancellation of async events, which is critical for preventing race conditions. [cite: docs/async.md]

In essence, the conversion simplifies your project's dependency graph by replacing a specialized tool with a more comprehensive, "all-in-one" toolkit without forcing you to change your existing coding patterns.

Of course. This is another excellent example that showcases more advanced patterns from `solid-events`, including drag-and-drop state management and partitioned event streams. Once again, the conversion to `@doeixd/events` is seamless because it was designed to support these powerful, SolidJS-inspired concepts.

### Analysis of the Original Code

The provided code defines the `Column` and `Note` components for a Kanban-style board. It uses `solid-events` extensively to manage complex UI states without a multitude of `createSignal` calls. Key patterns include:

*   **`createEvent`**: Used to create event streams for DOM actions like `onDragStart`, `onDrop`, `onBlur`, etc.
*   **`createSubject`**: Used as a state aggregator. It takes an initial state and a series of handlers that define how that state changes in response to events. This is used for `acceptDrop` and `isBeingDragged`.
*   **`createPartition`**: A powerful primitive that splits a single event stream into two based on a predicate function. This is used to separate valid drag-over events from invalid ones.
*   **Handler Chaining**: The code chains handlers together to create sophisticated logic, such as `onDropNote((noteId) => ...)` which only acts on the result of a filtered `onDrop` event.

---

### Converted Code: Using `@doeixd/events`

The conversion requires only changing the import statements. The function names (`createEvent`, `createSubject`, `createPartition`, `halt`) and their behavior are identical, as `@doeixd/events` includes these SolidJS-style helpers in its public API.

```typescript
// --- Converted Code using @doeixd/events ---

// ... other imports
import { getAuthUser } from "~/lib/auth";
import { db } from "~/lib/db";
import { fetchBoard } from "~/lib";

// Step 1: Replace the import statement.
import {
  createEvent,
  createSubject,
  createPartition, // Also available in @doeixd/events
  halt,
} from "@doeixd/events";

import { useBoardActions } from "./actions";

// ... (action definitions like renameColumn, etc. would be here)

// --- Column Component ---
export function Column(props: { column: Column; board: Board; notes: Note[] }) {
  let parent: HTMLDivElement | undefined;
  const { emitRenameColumn, emitDeleteColumn, emitMoveNote } = useBoardActions();

  // NO CHANGES HERE: `createEvent` is a 1:1 replacement.
  const [onDragStart, emitDragStart] = createEvent<DragEvent>();
  const [onDragOver, emitDragOver] = createEvent<DragEvent & { currentTarget: HTMLDivElement }>();
  const [onDragExit, emitDragExit] = createEvent<DragEvent>();
  const [onDragLeave, emitDragLeave] = createEvent<DragEvent>();
  const [onDrop, emitDrop] = createEvent<DragEvent>();
  const [onBlur, emitBlur] = createEvent<BlurInput>();

  // NO CHANGES HERE: Handler logic is identical.
  onDragStart((e) => e.dataTransfer?.setData(DragTypes.Column, props.column.id));

  onDrop((e) => {
    if (e.dataTransfer?.types.includes(DragTypes.Note)) {
      const noteId = e.dataTransfer?.getData(DragTypes.Note) as NoteId | undefined;
      if (noteId && !filteredNotes().find((n) => n.id === noteId)) {
        emitMoveNote([
          noteId,
          props.column.id,
          getIndexBetween(filteredNotes()[filteredNotes().length - 1]?.order, undefined),
          new Date().getTime(),
        ]);
      }
    }
  });

  onBlur((e) => {
    if (e.target.reportValidity()) {
      emitRenameColumn([props.column.id, e.target.value, new Date().getTime()]);
    }
  });

  // NO CHANGES HERE: `createSubject` and `halt` are 1:1 replacements.
  // This pattern elegantly defines a piece of state as a "reduction" of multiple event streams.
  const acceptDrop = createSubject(
    false,
    onDragOver((e) => (e.dataTransfer?.types.includes(DragTypes.Note) ? true : halt())),
    onDragLeave(() => false),
    onDragExit(() => false),
    onDrop(() => false)
  );
  
  // ... (rest of the Column component logic and JSX is identical)
}

// --- ColumnGap Component ---
export function ColumnGap(props: { left?: Column; right?: Column }) {
  const { emitMoveColumn } = useBoardActions();
  
  // NO CHANGES HERE: `createEvent` is a 1:1 replacement.
  const [onDragOver, emitDragOver] = createEvent<DragEvent & { currentTarget: HTMLDivElement }>();
  const [onDragExit, emitDragExit] = createEvent<DragEvent>();
  const [onDragLeave, emitDragLeave] = createEvent<DragEvent>();
  const [onDrop, emitDrop] = createEvent<DragEvent>();

  onDrop((e) => {
    // ... (logic is identical)
  });

  // NO CHANGES HERE: `createSubject` is a 1:1 replacement.
  const active = createSubject(
    false,
    onDragOver((e) =>
      e.dataTransfer?.types.includes(DragTypes.Column) && e.dataTransfer?.types.length === 1
        ? true
        : halt()
    ),
    onDrop(() => false),
    onDragLeave(() => false),
    onDragExit(() => false)
  );
  
  // ... (rest of the ColumnGap component logic and JSX is identical)
}


// --- Note Component ---
export function Note(props: { note: Note; previous?: Note; next?: Note }) {
  const { emitMoveNote, emitDeleteNote, emitEditNote } = useBoardActions();
  let input: HTMLTextAreaElement | undefined;
  
  // NO CHANGES HERE: `createEvent` is a 1:1 replacement.
  const [onDragStart, emitDragStart] = createEvent<DragEvent>();
  // ... (other createEvent calls are identical)
  const [onBlur, emitBlur] = createEvent<BlurTextArea>();

  onDragStart((e) => {
    e.dataTransfer?.setData(DragTypes.Note, props.note.id.toString());
  });

  // NO CHANGES HERE: `createSubject` is a 1:1 replacement.
  const isBeingDragged = createSubject(
    false,
    onDrag(() => true),
    onDragEnd(() => false)
  );

  // NO CHANGES HERE: Chaining and `halt` are identical.
  const onDropNote = onDrop((e) => {
    if (!e.dataTransfer?.types.includes(DragTypes.Note)) halt();
    const noteId = e.dataTransfer?.getData(DragTypes.Note) as NoteId | undefined;
    if (!noteId || noteId === props.note.id) halt();
    return noteId;
  });

  onDropNote((noteId) => {
    // ... (logic is identical)
  });

  onBlur((e) => emitEditNote([props.note.id, e.target.value, new Date().getTime()]));

  // NO CHANGES HERE: `createPartition` is a 1:1 replacement.
  const [onDragOverValidEl, onDragOverInvalidEl] = createPartition(
    onDragOver,
    (e) => !!e.dataTransfer?.types.includes(DragTypes.Note)
  );

  // NO CHANGES HERE: `createSubject` is a 1:1 replacement.
  const acceptDrop = createSubject<"top" | "bottom" | false>(
    false,
    onDragExit(() => false),
    onDragLeave(() => false),
    onDrop(() => false),
    onDragOverInvalidEl(() => false),
    onDragOverValidEl((e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const midpoint = (rect.top + rect.bottom) / 2;
      const isTop = e.clientY < midpoint;
      return isTop ? "top" : "bottom";
    })
  );
  
  // ... (rest of the Note component logic and JSX is identical)
}
```


### How This Simplifies Your Architecture and Why It Works

The fact that this complex code can be converted by only changing an import statement is a testament to the design philosophy of `@doeixd/events`.

1.  **A Superset of Functionality**: `@doeixd/events` was designed to be a superset of `solid-events`, incorporating its best ideas (like the SolidJS-style helpers) into a broader, framework-agnostic toolkit. The library explicitly provides `createSubject`, `createSubjectStore`, `createTopic`, and `createPartition` with compatible signatures. [cite: src/events-helpers.ts, src/index.ts]
2.  **Reduces Dependency Lock-in**: Your component logic is now written against a framework-agnostic library. While the components themselves use SolidJS JSX, the core event and state management logic is decoupled. This makes it easier to share logic or migrate patterns to other frameworks if needed in the future.
3.  **Unlocks a Larger Toolkit**: As with the previous example, your `Column` and `Note` components now have access to a richer set of tools for future enhancements without adding new dependencies. For example:
    *   You could use the `doubleClick` operator to add a "double-click to edit" feature to a note.
    *   You could use `createInteraction` to build a more complex, reusable "swipe-to-delete" gesture for notes on mobile.
    *   If the drag-and-drop logic became stateful enough (e.g., needing to track permissions or async validation), it could be encapsulated in a `createActor` for better organization.

By making this simple switch, you lose nothing in terms of functionality or developer experience, but you gain a more powerful, flexible, and portable foundation for your application's interactive logic.

### 1. Feature: Double-Click to Edit a Note Title

The current `Column` component uses an `onBlur` event on an `<input>` to save a renamed title. Let's enhance the `Note` component with a more intuitive "double-click to edit" feature for its content.

#### Before: Manual Timers and State Flags

Without the `doubleClick` operator, you would have to manage timers and state manually, which is verbose and prone to bugs:

```typescript
// Conceptual manual implementation (what we're avoiding)
let clickCount = 0;
let timer;

noteElement.addEventListener('click', () => {
  clickCount++;
  if (clickCount === 1) {
    timer = setTimeout(() => {
      clickCount = 0; // Reset after a delay
    }, 500);
  } else if (clickCount === 2) {
    clearTimeout(timer);
    clickCount = 0;
    // --- Start editing logic here ---
  }
});
```
This logic is messy and has to be written for every component that needs it.

#### After: Using the `doubleClick` Operator

The `doubleClick` operator encapsulates all that timer logic into a single, declarative function.

**Implementation in the `Note` component:**

```typescript
// src/components/Note.tsx

import { createSignal, Show, onMount } from "solid-js";
import { dom, doubleClick } from "@doeixd/events"; 
// ... other imports

export function Note(props: { note: Note; ... }) {
  const { emitDeleteNote, emitEditNote } = useBoardActions();
  
  // State to control the editing UI
  const [isEditing, setIsEditing] = createSignal(false);
  
  let noteCard: HTMLDivElement | undefined;
  let editInput: HTMLTextAreaElement | undefined;

  // This setup runs once when the component is mounted
  onMount(() => {
    // 1. Create a raw stream of click events on the note's main element.
    const onNoteClick = dom.click(noteCard!);

    // 2. Apply the doubleClick operator. It will only let an event pass through
    //    if it's the second click within 500ms. All single clicks are halted.
    const onNoteDoubleClick = doubleClick(500)(onNoteClick);

    // 3. Subscribe to the final, debounced event stream.
    onNoteDoubleClick(() => {
      setIsEditing(true);
      // Focus the input when editing starts
      editInput?.focus(); 
    });
  });

  const saveAndExit = () => {
    // Use the existing action to save the note
    if (editInput && editInput.value !== props.note.body) {
      emitEditNote([props.note.id, editInput.value, new Date().getTime()]);
    }
    setIsEditing(false);
  };

  return (
    <div ref={noteCard} /* ... other props */ >
      {/* ... drag handle and other elements */}
      
      <Show 
        when={isEditing()}
        fallback={<p class="note-body">{props.note.body}</p>}
      >
        <textarea
          ref={editInput}
          class="note-textarea"
          onBlur={saveAndExit}
        >
          {props.note.body}
        </textarea>
      </Show>

      {/* ... delete button */}
    </div>
  );
}
```

**Key Benefits:**

*   **Declarative**: The logic reads like a sentence: "on double-click of the note, start editing."
*   **Encapsulation**: The complex timer management is completely hidden inside the reusable `doubleClick` operator.
*   **Maintainability**: The component's code is cleaner and focused on *what* should happen, not *how* to detect the double-click.

---

### 2. Feature: Swipe-to-Delete a Note on Mobile

Clicking a small trash icon can be difficult on mobile. A "swipe left" gesture is a much more common and user-friendly pattern.

#### Before: A Tangle of Touch Event Listeners

A manual implementation would require adding `touchstart`, `touchmove`, and `touchend` listeners, tracking coordinates, calculating deltas, and managing state to see if a swipe threshold was met. This is a lot of complex, imperative code inside the `Note` component.

#### After: Using Interaction Functions to Build a Reusable Gesture

We can build a high-level, semantic `swipeLeft` interaction once and then use it declaratively anywhere in our app.

**Step 1: Create the reusable interaction (e.g., in `src/interactions.ts`)**

```typescript
// src/interactions.ts

import type { EventDescriptor, InteractionHandle } from "@doeixd/events";
import { dom } from "@doeixd/events";

// Create a high-level 'swipeleft' interaction from low-level touch events.
export function swipeLeft(this: InteractionHandle<CustomEvent<{ distance: number }>>): EventDescriptor[] {
  let startX = 0;
  let isSwiping = false;
  const SWIPE_THRESHOLD = -50; // Must move at least 50px to the left

  return [
    dom.touchstart((e, signal) => {
      startX = e.touches[0].clientX;
    }),
    dom.touchmove((e, signal) => {
      const deltaX = e.touches[0].clientX - startX;
      // We only care about swipes that are moving left.
      if (deltaX < SWIPE_THRESHOLD) {
        isSwiping = true;
        // Optionally, you could apply a transform style here for visual feedback.
      }
    }),
    dom.touchend((e, signal) => {
      if (isSwiping) {
        const finalDeltaX = e.changedTouches[0].clientX - startX;
        // Dispatch our new, high-level event!
        this.dispatchEvent(new CustomEvent('swipeleft', {
          detail: { distance: Math.abs(finalDeltaX) },
          bubbles: true,
          cancelable: true,
        }));
      }
      // Reset for the next gesture.
      startX = 0;
      isSwiping = false;
    })
  ];
}
```

**Step 2: Use the new interaction in the `Note` component**

```typescript
// src/components/Note.tsx

import { useInteraction } from "@doeixd/solid"; // The SolidJS hook for the events() system
import { swipeLeft } from "~/interactions"; // Import our new interaction
// ... other imports

export function Note(props: { note: Note; ... }) {
  const { emitDeleteNote } = useBoardActions();
  let noteCard: HTMLDivElement | undefined;

  // Declaratively attach the swipe interaction using the idiomatic SolidJS hook.
  useInteraction(
    () => noteCard, // Pass the element ref as an accessor
    () => [ // Pass descriptors as an accessor
      swipeLeft(e => {
        console.log(`Swiped left by ${e.detail.distance}px. Deleting note.`);
        emitDeleteNote([props.note.id, new Date().getTime()]);
      })
    ]
  );
  
  return (
    <div ref={noteCard} /* ... other props */ >
      {/* ... note content */}
    </div>
  );
}
```

**Key Benefits:**

*   **Encapsulation**: The messy, stateful logic of gesture detection is completely removed from the component and placed in a reusable `swipeLeft` interaction.
*   **Declarative Use**: The `Note` component now simply declares: "when a swipe left happens on this element, call this function."
*   **Reusability**: The `swipeLeft` interaction can now be used on any other component in your application (`Column`, `Board`, etc.) with zero code duplication.

---

### 3. Feature: Encapsulating Drag-and-Drop Logic

The current D&D logic is spread across the `Note` and `Column` components. Each component manages its own `onDragStart`, `onDrop`, etc. This can become hard to manage, especially if you need to add global rules (e.g., you can't drop items into a "locked" column).

#### Before: Decentralized and Scattered Logic

Each component has its own set of `createEvent` calls for drag events, leading to duplicated logic and making it hard to manage the overall state of the drag-and-drop operation.

#### After: Using `createActor` to Centralize D&D State

We can create a single `dndActor` to manage the entire state of any drag-and-drop operation on the board.

**Step 1: Create the Drag-and-Drop Actor (e.g., in `src/dndActor.ts`)**

```typescript
// src/dndActor.ts

import { createActor, createEvent } from "@doeixd/events";

// Define the actor's internal state
interface DndState {
  isDragging: boolean;
  draggedId: string | null;
  draggedType: 'Note' | 'Column' | null;
  dropTargetId: string | null;
  canDrop: boolean;
}

const initialState: DndState = {
  isDragging: false,
  draggedId: null,
  draggedType: null,
  dropTargetId: null,
  canDrop: false,
};

export const dndActor = createActor(initialState, (context) => {
  // --- Events to change the actor's state ---
  const [dragStartHandler, dragStart] = createEvent<{ id: string, type: 'Note' | 'Column' }>();
  const [dragEndHandler, dragEnd] = createEvent();
  const [dragEnterTargetHandler, dragEnterTarget] = createEvent<{ id: string }>();
  const [dragLeaveTargetHandler, dragLeaveTarget] = createEvent();

  // --- Logic that mutates the actor's private context ---
  dragStartHandler(payload => {
    if (typeof payload === 'symbol') return;
    context.isDragging = true;
    context.draggedId = payload.id;
    context.draggedType = payload.type;
  });

  dragEnterTargetHandler(payload => {
    if (typeof payload === 'symbol') return;
    context.dropTargetId = payload.id;
    // Here you could add complex validation logic!
    // e.g., const targetColumn = findColumn(payload.id);
    // context.canDrop = targetColumn && !targetColumn.isLocked;
    context.canDrop = true; // Simple logic for now
  });

  dragLeaveTargetHandler(() => {
    context.dropTargetId = null;
    context.canDrop = false;
  });

  // On drag end (or drop), reset the state completely.
  dragEndHandler(() => {
    Object.assign(context, initialState);
  });

  // Expose the emitters as the actor's public API.
  return { dragStart, dragEnd, dragEnterTarget, dragLeaveTarget };
});
```

**Step 2: Refactor the components to use the actor**

The components become much simpler. They no longer manage D&D state; they just report events to the actor and react to its state.

```typescript
// src/components/Column.tsx (Simplified)

import { dndActor } from "~/dndActor";
import { useSubjectStore } from "@doeixd/solid";

export function Column(props: { column: Column; ... }) {
  const { emitMoveNote } = useBoardActions();
  const [dndState] = useSubjectStore(dndActor);

  const handleDrop = (e: DragEvent) => {
    // Read the final state from the actor to make a decision
    if (dndState.canDrop && dndState.draggedType === 'Note') {
      emitMoveNote([ dndState.draggedId, props.column.id, ... ]);
    }
    dndActor.dragEnd(); // Tell the actor the operation is over
  };

  // Is this column the current drop target?
  const isDropTarget = () => dndState.dropTargetId === props.column.id && dndState.canDrop;

  return (
    <div
      class="column"
      classList={{ "drop-target": isDropTarget() }}
      // Components now just call the actor's methods
      onDragStart={() => dndActor.dragStart({ id: props.column.id, type: 'Column' })}
      onDragEnd={dndActor.dragEnd}
      onDragEnter={() => dndActor.dragEnterTarget({ id: props.column.id })}
      onDragLeave={dndActor.dragLeaveTarget}
      onDrop={handleDrop}
    >
      {/* ... column content */}
    </div>
  );
}
```

**Key Benefits:**

*   **Centralized Logic**: All D&D state and rules are now in one place (`dndActor`), making it easy to understand, debug, and modify.
*   **Simplified Components**: The `Note` and `Column` components are now much "dumber." They only know how to report user actions to the actor and how to render based on the actor's state.
*   **Improved Testability**: The entire drag-and-drop user flow can be tested by just calling methods on the `dndActor` and asserting its state, without ever needing to simulate a real DOM event.
*   **Scalability**: Adding complex new rules (like async validation on drop) is now trivial to implement inside the actor without touching any of the UI components.