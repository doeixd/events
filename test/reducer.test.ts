import { describe, it, expect, vi } from 'vitest';
import { createReducer, createGuardedReducer, dispatch } from '../src/reducer';

describe('createReducer', () => {
  it('should create a reducer store with initial state', () => {
    const store = createReducer({
      initialState: { count: 0 },
      actions: {}
    });

    expect(typeof store).toBe('function');
    expect(store()).toEqual({ count: 0 });
  });

  it('should support dispatching actions', () => {
    const store = createReducer({
      initialState: { count: 0 },
      actions: {
        increment: (state, amount: number) => ({ count: state.count + amount }),
        decrement: (state, amount: number) => ({ count: state.count - amount })
      }
    });

    const afterIncrement = store.dispatch.increment(5);
    expect(afterIncrement()).toEqual({ count: 5 });
    expect(store()).toEqual({ count: 0 }); // Original unchanged

    const afterDecrement = afterIncrement.dispatch.decrement(2);
    expect(afterDecrement()).toEqual({ count: 3 });
  });

  it('should support chaining multiple dispatches', () => {
    const store = createReducer({
      initialState: { count: 0 },
      actions: {
        increment: (state, amount: number) => ({ count: state.count + amount }),
        multiply: (state, factor: number) => ({ count: state.count * factor })
      }
    });

    const result = store.dispatch.increment(5).dispatch.multiply(2).dispatch.increment(3);
    expect(result()).toEqual({ count: 13 }); // ((0 + 5) * 2) + 3 = 13
  });

  it('should handle actions with no payload', () => {
    const store = createReducer({
      initialState: { count: 0 },
      actions: {
        reset: (state) => ({ count: 0 }),
        increment: (state) => ({ count: state.count + 1 })
      }
    });

    const afterIncrement = store.dispatch.increment();
    expect(afterIncrement()).toEqual({ count: 1 });

    const afterReset = afterIncrement.dispatch.reset();
    expect(afterReset()).toEqual({ count: 0 });
  });

  it('should handle complex state objects', () => {
    interface AppState {
      user: { name: string; age: number };
      todos: { id: number; text: string; completed: boolean }[];
    }

    type Actions = {
      updateUser: (state: AppState, updates: Partial<AppState['user']>) => AppState;
      addTodo: (state: AppState, text: string) => AppState;
      toggleTodo: (state: AppState, id: number) => AppState;
    };

    const store = createReducer<AppState, Actions>({
      initialState: {
        user: { name: 'John', age: 25 },
        todos: []
      },
      actions: {
        updateUser: (state, updates) => ({
          ...state,
          user: { ...state.user, ...updates }
        }),
        addTodo: (state, text) => ({
          ...state,
          todos: [...state.todos, { id: Date.now(), text, completed: false }]
        }),
        toggleTodo: (state, id) => ({
          ...state,
          todos: state.todos.map(todo =>
            todo.id === id ? { ...todo, completed: !todo.completed } : todo
          )
        })
      }
    });

    const afterUpdateUser = store.dispatch.updateUser({ age: 26 });
    expect(afterUpdateUser().user.age).toBe(26);
    expect(afterUpdateUser().user.name).toBe('John');

    const afterAddTodo = afterUpdateUser.dispatch.addTodo('Learn TypeScript');
    expect(afterAddTodo().todos).toHaveLength(1);
    expect(afterAddTodo().todos[0].text).toBe('Learn TypeScript');
    expect(afterAddTodo().todos[0].completed).toBe(false);

    const todoId = afterAddTodo().todos[0].id;
    const afterToggle = afterAddTodo.dispatch.toggleTodo(todoId);
    expect(afterToggle().todos[0].completed).toBe(true);
  });

  it('should support subscription to state changes', () => {
    const store = createReducer({
      initialState: { count: 0 },
      actions: {
        increment: (state, amount: number) => ({ count: state.count + amount })
      }
    });

    const mockCallback = vi.fn();
    const unsubscribe = store.subscribe(mockCallback);

    // Initial state triggers callback
    expect(mockCallback).toHaveBeenCalledWith({ count: 0 });
    expect(mockCallback).toHaveBeenCalledTimes(1);

    const afterIncrement = store.dispatch.increment(5);
    expect(mockCallback).toHaveBeenCalledWith({ count: 5 });
    expect(mockCallback).toHaveBeenCalledTimes(2);

    const afterIncrement2 = afterIncrement.dispatch.increment(3);
    expect(mockCallback).toHaveBeenCalledWith({ count: 8 });
    expect(mockCallback).toHaveBeenCalledTimes(3);

    unsubscribe();
    const afterIncrement3 = afterIncrement2.dispatch.increment(1);
    expect(mockCallback).toHaveBeenCalledTimes(3); // No more calls after unsubscribe
  });

  it('should share subscription across chained store instances', () => {
    const store = createReducer({
      initialState: { count: 0 },
      actions: {
        increment: (state, amount: number) => ({ count: state.count + amount })
      }
    });

    const mockCallback = vi.fn();
    store.subscribe(mockCallback);

    // Initial call
    expect(mockCallback).toHaveBeenCalledWith({ count: 0 });

    const store1 = store.dispatch.increment(1);
    expect(mockCallback).toHaveBeenCalledWith({ count: 1 });

    const store2 = store1.dispatch.increment(2);
    expect(mockCallback).toHaveBeenCalledWith({ count: 3 });

    const store3 = store2.dispatch.increment(3);
    expect(mockCallback).toHaveBeenCalledWith({ count: 6 });

    expect(mockCallback).toHaveBeenCalledTimes(4);
  });

  it('should freeze the store instance', () => {
    const store = createReducer({
      initialState: { count: 0 },
      actions: {
        increment: (state, amount: number) => ({ count: state.count + amount })
      }
    });

    expect(Object.isFrozen(store)).toBe(true);
  });

  it('should handle multiple subscribers', () => {
    const store = createReducer({
      initialState: { count: 0 },
      actions: {
        increment: (state, amount: number) => ({ count: state.count + amount })
      }
    });

    const callback1 = vi.fn();
    const callback2 = vi.fn();

    store.subscribe(callback1);
    store.subscribe(callback2);

    const afterIncrement = store.dispatch.increment(5);
    expect(callback1).toHaveBeenCalledWith({ count: 5 });
    expect(callback2).toHaveBeenCalledWith({ count: 5 });
  });

  it('should handle actions with multiple parameters', () => {
    const store = createReducer({
      initialState: { value: 0 },
      actions: {
        add: (state, a: number, b: number, c: number) => ({ value: state.value + a + b + c })
      }
    });

    const result = store.dispatch.add(1, 2, 3);
    expect(result()).toEqual({ value: 6 });
  });

  it('should handle actions that return the same state reference (immutable pattern)', () => {
    const store = createReducer({
      initialState: { count: 0 },
      actions: {
        noop: (state) => state, // Returns same reference
        increment: (state, amount: number) => ({ count: state.count + amount })
      }
    });

    const afterNoop = store.dispatch.noop();
    expect(afterNoop).not.toBe(store); // Should still create new instance
    expect(afterNoop().count).toBe(store().count); // State values should be equal

    const afterIncrement = afterNoop.dispatch.increment(1);
    expect(afterIncrement().count).toBe(1);
  });

  it('should handle empty actions object', () => {
    const store = createReducer({
      initialState: { count: 0 },
      actions: {}
    });

    expect(store()).toEqual({ count: 0 });
    expect(store.dispatch).toEqual({});
  });

  it('should handle actions that modify nested objects immutably', () => {
    const store = createReducer({
      initialState: { user: { profile: { name: 'John', settings: { theme: 'light' } } } },
      actions: {
        updateTheme: (state, theme: string) => ({
          user: {
            ...state.user,
            profile: {
              ...state.user.profile,
              settings: {
                ...state.user.profile.settings,
                theme
              }
            }
          }
        })
      }
    });

    const result = store.dispatch.updateTheme('dark');
    expect(result().user.profile.settings.theme).toBe('dark');
    expect(store().user.profile.settings.theme).toBe('light'); // Original unchanged
  });

  it('should support effects for side effects', () => {
    const effectCallback = vi.fn();
    const store = createReducer({
      initialState: { count: 0 },
      actions: {
        increment: (state, amount: number) => ({ count: state.count + amount })
      },
      effects: (newState, oldState) => {
        effectCallback(newState, oldState);
      }
    });

    // Effects are called on subscription with initial state
    expect(effectCallback).toHaveBeenCalledWith({ count: 0 }, { count: 0 });
    expect(effectCallback).toHaveBeenCalledTimes(1);
    effectCallback.mockClear();

    const afterIncrement = store.dispatch.increment(5);
    expect(effectCallback).toHaveBeenCalledWith({ count: 5 }, { count: 0 });
    expect(effectCallback).toHaveBeenCalledTimes(1);

    const afterIncrement2 = afterIncrement.dispatch.increment(3);
    expect(effectCallback).toHaveBeenCalledWith({ count: 8 }, { count: 5 });
    expect(effectCallback).toHaveBeenCalledTimes(2);
  });

  it('should not trigger effects when state does not change', () => {
    const effectCallback = vi.fn();
    const store = createReducer({
      initialState: { count: 0 },
      actions: {
        noop: (state) => state // Returns same reference
      },
      effects: effectCallback
    });

    // Effects called on initial subscription
    expect(effectCallback).toHaveBeenCalledWith({ count: 0 }, { count: 0 });
    effectCallback.mockClear();

    const afterNoop = store.dispatch.noop();
    expect(effectCallback).not.toHaveBeenCalled();
  });
});

describe('dispatch helper function', () => {
  it('should apply dispatcher and return new store', () => {
    const store = createReducer({
      initialState: { count: 0 },
      actions: {
        increment: (state, amount: number) => ({ count: state.count + amount })
      }
    });

    const result = dispatch(store, store.dispatch.increment, 5);
    expect(result()).toEqual({ count: 5 });
    expect(result).not.toBe(store);
  });

  it('should support function composition', () => {
    const store = createReducer({
      initialState: { count: 0 },
      actions: {
        increment: (state, amount: number) => ({ count: state.count + amount }),
        multiply: (state, factor: number) => ({ count: state.count * factor })
      }
    });

    type StoreType = ReturnType<typeof createReducer>;
    const incrementBy = (amount: number) => (store: StoreType) =>
      dispatch(store, store.dispatch.increment, amount);

    const multiplyBy = (factor: number) => (store: StoreType) =>
      dispatch(store, store.dispatch.multiply, factor);

    const result = multiplyBy(2)(incrementBy(5)(store));
    expect(result()).toEqual({ count: 10 }); // (0 + 5) * 2 = 10
  });

  it('should handle actions with no payload', () => {
    const store = createReducer({
      initialState: { count: 0 },
      actions: {
        increment: (state) => ({ count: state.count + 1 })
      }
    });

    const result = dispatch(store, store.dispatch.increment);
    expect(result()).toEqual({ count: 1 });
  });

  it('should handle actions with multiple parameters', () => {
    const store = createReducer({
      initialState: { value: 0 },
      actions: {
        add: (state, a: number, b: number) => ({ value: state.value + a + b })
      }
    });

    const result = dispatch(store, store.dispatch.add, 3, 7);
    expect(result()).toEqual({ value: 10 });
  });
});

describe('Type Safety and Edge Cases', () => {
  it('should handle object state with string values', () => {
    const stringStore = createReducer({
      initialState: { value: 'initial' },
      actions: {
        append: (state, suffix: string) => ({ value: state.value + suffix })
      }
    });

    const result = stringStore.dispatch.append(' value');
    expect(result().value).toBe('initial value');
  });

  it('should handle array state', () => {
    const arrayStore = createReducer({
      initialState: { items: [1, 2, 3] },
      actions: {
        push: (state, item: number) => ({ items: [...state.items, item] }),
        pop: (state) => ({ items: state.items.slice(0, -1) })
      }
    });

    const afterPush = arrayStore.dispatch.push(4);
    expect(afterPush().items).toEqual([1, 2, 3, 4]);

    const afterPop = afterPush.dispatch.pop();
    expect(afterPop().items).toEqual([1, 2, 3]);
  });

  it('should handle null and undefined in state', () => {
    const store = createReducer({
      initialState: { value: null as string | null },
      actions: {
        set: (state, value: string | null) => ({ value })
      }
    });

    const afterSet = store.dispatch.set('test');
    expect(afterSet().value).toBe('test');

    const afterNull = afterSet.dispatch.set(null);
    expect(afterNull().value).toBe(null);
  });

  it('should handle large state objects efficiently', () => {
    const largeState = { data: Array.from({ length: 1000 }, (_, i) => i) };
    const store = createReducer({
      initialState: largeState,
      actions: {
        update: (state, index: number, value: number) => ({
          data: state.data.map((v, i) => i === index ? value : v)
        })
      }
    });

    const result = store.dispatch.update(500, 999);
    expect(result().data[500]).toBe(999);
    expect(result().data[0]).toBe(0); // Other values unchanged
  });

  it('should handle recursive state structures', () => {
    interface TreeNode {
      value: number;
      children?: TreeNode[];
    }

    const store = createReducer({
      initialState: { root: { value: 1, children: [{ value: 2 }, { value: 3 }] } } as { root: TreeNode },
      actions: {
        incrementAll: (state) => ({
          root: incrementNode(state.root)
        })
      }
    });

    function incrementNode(node: TreeNode): TreeNode {
      return {
        value: node.value + 1,
        children: node.children?.map(incrementNode)
      };
    }

    const result = store.dispatch.incrementAll();
    expect(result().root.value).toBe(2);
    expect(result().root.children?.[0].value).toBe(3);
    expect(result().root.children?.[1].value).toBe(4);
  });

describe('Integration with other patterns', () => {
  it('should work with reducer pattern for complex business logic', () => {
    let idCounter = 0;
    interface TodoState {
      todos: { id: number; text: string; completed: boolean }[];
      filter: 'all' | 'active' | 'completed';
    }

    type Actions = {
      addTodo: (state: TodoState, text: string) => TodoState;
      toggleTodo: (state: TodoState, id: number) => TodoState;
      setFilter: (state: TodoState, filter: TodoState['filter']) => TodoState;
      clearCompleted: (state: TodoState) => TodoState;
    };

    const store = createReducer<TodoState, Actions>({
      initialState: {
        todos: [],
        filter: 'all'
      },
      actions: {
        addTodo: (state, text) => ({
          ...state,
          todos: [...state.todos, { id: ++idCounter, text, completed: false }]
        }),
        toggleTodo: (state, id) => ({
          ...state,
          todos: state.todos.map(todo =>
            todo.id === id ? { ...todo, completed: !todo.completed } : todo
          )
        }),
        setFilter: (state, filter) => ({
          ...state,
          filter
        }),
        clearCompleted: (state) => ({
          ...state,
          todos: state.todos.filter(todo => !todo.completed)
        })
      }
    });

    // Add some todos
    const withTodos = store
      .dispatch.addTodo('Learn React')
      .dispatch.addTodo('Learn TypeScript')
      .dispatch.addTodo('Write tests');

    expect(withTodos().todos).toHaveLength(3);

    // Toggle first todo
    const todoId = withTodos().todos[0].id;
    const afterToggle = withTodos.dispatch.toggleTodo(todoId);
    expect(afterToggle().todos[0].completed).toBe(true);

    // Set filter
    const afterFilter = afterToggle.dispatch.setFilter('active');
    expect(afterFilter().filter).toBe('active');

    // Clear completed
    const afterClear = afterFilter.dispatch.clearCompleted();
    expect(afterClear().todos).toHaveLength(2);
    expect(afterClear().todos.every(todo => !todo.completed)).toBe(true);
  });

  it('should support undo/redo pattern with chaining', () => {
    const store = createReducer({
      initialState: { value: 0, history: [0] },
      actions: {
        set: (state, value: number) => ({
          value,
          history: [...state.history, value]
        }),
        undo: (state) => {
          const newHistory = state.history.slice(0, -1);
          return {
            value: newHistory[newHistory.length - 1] ?? 0,
            history: newHistory
          };
        }
      }
    });

    const step1 = store.dispatch.set(5);
    expect(step1().value).toBe(5);
    expect(step1().history).toEqual([0, 5]);

    const step2 = step1.dispatch.set(10);
    expect(step2().value).toBe(10);
    expect(step2().history).toEqual([0, 5, 10]);

    const undo1 = step2.dispatch.undo();
    expect(undo1().value).toBe(5);
    expect(undo1().history).toEqual([0, 5]);

    const undo2 = undo1.dispatch.undo();
    expect(undo2().value).toBe(0);
    expect(undo2().history).toEqual([0]);
  });
});

describe('createGuardedReducer', () => {
  it('should create a state-guarded reducer store', () => {
    type IdleState = { status: 'idle' };
    type LoadingState = { status: 'loading' };
    type SuccessState = { status: 'success'; data: string };
    type ErrorState = { status: 'error'; error: string };
    type AppState = IdleState | LoadingState | SuccessState | ErrorState;

    type Actions = {
      startLoading: (state: AppState) => LoadingState;
      finishLoading: (state: AppState, data: string) => SuccessState;
      failLoading: (state: AppState, error: string) => ErrorState;
      reset: (state: AppState) => IdleState;
    };

    const store = createGuardedReducer<AppState, Actions>({
      initialState: { status: 'idle' },
      actions: {
        startLoading: (state) => ({ status: 'loading' }),
        finishLoading: (state, data) => ({ status: 'success', data }),
        failLoading: (state, error) => ({ status: 'error', error }),
        reset: (state) => ({ status: 'idle' })
      }
    });

    expect(store().status).toBe('idle');
    expect(store.status).toBe('idle');
  });

  it('should only allow actions valid for the current status', () => {
    type IdleState = { status: 'idle' };
    type LoadingState = { status: 'loading' };
    type SuccessState = { status: 'success'; data: string };
    type AppState = IdleState | LoadingState | SuccessState;

    type Actions = {
      startLoading: (state: AppState) => LoadingState;
      finishLoading: (state: AppState, data: string) => SuccessState;
      reset: (state: AppState) => IdleState;
    };

    const store = createGuardedReducer<AppState, Actions>({
      initialState: { status: 'idle' },
      actions: {
        startLoading: (state) => ({ status: 'loading' }),
        finishLoading: (state, data) => ({ status: 'success', data }),
        reset: (state) => ({ status: 'idle' })
      }
    });

    // In idle status, only startLoading should be available
    const loadingStore = (store as any).dispatch.startLoading();
    expect(loadingStore().status).toBe('loading');
    expect(loadingStore.status).toBe('loading');

    // In loading status, only finishLoading should be available
    const successStore = (loadingStore as any).dispatch.finishLoading('Hello World');
    expect(successStore().status).toBe('success');
    expect(successStore().data).toBe('Hello World');
    expect(successStore.status).toBe('success');

    // In success status, only reset should be available
    const resetStore = (successStore as any).dispatch.reset();
    expect(resetStore().status).toBe('idle');
    expect(resetStore.status).toBe('idle');
  });

  it('should support subscription to state changes', () => {
    type IdleState = { status: 'idle' };
    type ActiveState = { status: 'active'; count: number };
    type AppState = IdleState | ActiveState;

    type Actions = {
      activate: (state: AppState, count: number) => ActiveState;
      increment: (state: AppState) => ActiveState;
    };

    const store = createGuardedReducer<AppState, Actions>({
      initialState: { status: 'idle' },
      actions: {
        activate: (state, count) => ({ status: 'active', count }),
        increment: (state) => ({ status: 'active', count: (state as ActiveState).count + 1 })
      }
    });

    const mockCallback = vi.fn();
    store.subscribe(mockCallback);

    expect(mockCallback).toHaveBeenCalledWith({ status: 'idle' });

    const activeStore = (store as any).dispatch.activate(5);
    expect(mockCallback).toHaveBeenCalledWith({ status: 'active', count: 5 });

    const incrementedStore = (activeStore as any).dispatch.increment();
    expect(mockCallback).toHaveBeenCalledWith({ status: 'active', count: 6 });
  });

  it('should freeze the guarded store instance', () => {
    type IdleState = { status: 'idle' };
    type ActiveState = { status: 'active' };
    type AppState = IdleState | ActiveState;

    type Actions = {
      activate: (state: AppState) => ActiveState;
    };

    const store = createGuardedReducer<AppState, Actions>({
      initialState: { status: 'idle' },
      actions: {
        activate: (state) => ({ status: 'active' })
      }
    });

    expect(Object.isFrozen(store)).toBe(true);
  });

  it('should handle complex state machines', () => {
    type RedState = { status: 'red' };
    type YellowState = { status: 'yellow' };
    type GreenState = { status: 'green' };
    type TrafficLightState = RedState | YellowState | GreenState;

    type Actions = {
      toGreen: (state: TrafficLightState) => GreenState;
      toYellow: (state: TrafficLightState) => YellowState;
      toRed: (state: TrafficLightState) => RedState;
    };

    const store = createGuardedReducer<TrafficLightState, Actions>({
      initialState: { status: 'red' },
      actions: {
        toGreen: (state) => ({ status: 'green' }),
        toYellow: (state) => ({ status: 'yellow' }),
        toRed: (state) => ({ status: 'red' })
      }
    });

    expect(store().status).toBe('red');

    const greenStore = (store as any).dispatch.toGreen();
    expect(greenStore().status).toBe('green');

    const yellowStore = (greenStore as any).dispatch.toYellow();
    expect(yellowStore().status).toBe('yellow');

    const redStore = (yellowStore as any).dispatch.toRed();
    expect(redStore().status).toBe('red');
  });

  it('should return shallow-cloned state snapshots', () => {
    type IdleState = { status: 'idle' };
    type ActiveState = { status: 'active'; data: { items: number[] } };
    type AppState = IdleState | ActiveState;

    type Actions = {
      activate: (state: AppState) => ActiveState;
    };

    const initialState: AppState = { status: 'idle' };
    const store = createGuardedReducer<AppState, Actions>({
      initialState,
      actions: {
        activate: (state) => ({ status: 'active', data: { items: [1, 2, 3] } })
      }
    });

    const snapshot = store();
    expect(snapshot).not.toBe(initialState); // Different reference
    expect(snapshot).toEqual(initialState); // Same content
  });
});

});