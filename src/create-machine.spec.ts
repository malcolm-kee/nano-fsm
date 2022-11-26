import { describe, expect, it, vi } from 'vitest';
import { createMachine, UpdateAction } from './index';

describe('createMachine', () => {
  it('works', () => {
    type Context = {
      level: string;
      messages: string[];
    };
    const dismissMessages: UpdateAction<Context> = vi.fn(() => ({
      messages: [],
      level: 'error',
    }));
    const appendMessages: UpdateAction<Context> = vi.fn((context, event) => ({
      level: event.level || context.level,
      messages: context.messages.concat(event.messages),
    }));
    const setMessages: UpdateAction<Context> = vi.fn((context, event) => ({
      level: event.level || context.level,
      messages: event.messages,
    }));
    const hideOverlay = vi.fn();
    const showOverlay = vi.fn();

    const machine = createMachine(
      {
        initial: 'hidden',
        context: {
          level: 'error',
          messages: [],
        },
        states: {
          hidden: {
            on: {
              BUILD_ERROR: {
                target: 'displayBuildError',
                actions: ['setMessages', 'showOverlay'],
              },
              RUNTIME_ERROR: {
                target: 'displayRuntimeError',
                actions: ['setMessages', 'showOverlay'],
              },
            },
          },
          displayBuildError: {
            on: {
              DISMISS: { target: 'hidden', actions: ['dismissMessages', 'hideOverlay'] },
              BUILD_ERROR: {
                target: 'displayBuildError',
                actions: ['appendMessages', 'showOverlay'],
              },
            },
          },
          displayRuntimeError: {
            on: {
              DISMISS: { target: 'hidden', actions: ['dismissMessages', 'hideOverlay'] },
              RUNTIME_ERROR: {
                target: 'displayRuntimeError',
                actions: ['appendMessages', 'showOverlay'],
              },
              BUILD_ERROR: {
                target: 'displayBuildError',
                actions: ['setMessages', 'showOverlay'],
              },
            },
          },
        },
      },
      {
        actions: {
          dismissMessages,
          appendMessages,
          setMessages,
          hideOverlay,
          showOverlay,
        },
      }
    );

    expect(machine.getState()).toBe('hidden');

    machine.send({
      type: 'BUILD_ERROR',
      level: 'warning',
      messages: ['warning-1'],
    });
    expect(machine.getState()).toBe('displayBuildError');
    expect(setMessages).toHaveBeenCalledOnce();
    expect(setMessages).toHaveBeenCalledWith(
      { level: 'error', messages: [] },
      {
        type: 'BUILD_ERROR',
        level: 'warning',
        messages: ['warning-1'],
      }
    );
    expect(showOverlay).toHaveBeenCalledOnce();
    expect(showOverlay).toHaveBeenCalledWith(
      {
        level: 'warning',
        messages: ['warning-1'],
      },
      {
        type: 'BUILD_ERROR',
        level: 'warning',
        messages: ['warning-1'],
      }
    );
    expect(appendMessages).not.toHaveBeenCalled();

    machine.send({
      type: 'BUILD_ERROR',
      level: 'error',
      messages: ['error-1'],
    });
    expect(machine.getState()).toBe('displayBuildError');
    expect(setMessages).toHaveBeenCalledOnce();
    expect(showOverlay).toHaveBeenCalledTimes(2);
    expect(showOverlay).toHaveBeenLastCalledWith(
      {
        level: 'error',
        messages: ['warning-1', 'error-1'],
      },
      {
        type: 'BUILD_ERROR',
        level: 'error',
        messages: ['error-1'],
      }
    );
    expect(appendMessages).toHaveBeenCalledOnce();

    machine.send({
      type: 'RUNTIME_ERROR',
      level: 'error',
      messages: ['undefined is not a function'],
    });
    expect(machine.getState()).toBe('displayBuildError');
    expect(setMessages).toHaveBeenCalledOnce();
    expect(showOverlay).toHaveBeenCalledTimes(2);
    expect(appendMessages).toHaveBeenCalledOnce();
  });
});
