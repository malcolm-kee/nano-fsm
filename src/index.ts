export interface StateDefinition {
  [key: string]: {
    on?: {
      [event: string]: {
        target: string;
        actions?: Array<string>;
      };
    };
  };
}

export interface CreateMachineOptions<Context> {
  states: StateDefinition;
  context: Context;
  initial: string;
}

export type UpdateAction<Context> = (ctx: Context, event: any) => Partial<Context>;

export interface MachineImplementation<Context> {
  actions: {
    [key: string]: UpdateAction<Context>;
  };
}

export const createMachine = <Context>(
  options: CreateMachineOptions<Context>,
  implementations: MachineImplementation<Context>
) => {
  let currentState = options.initial;
  let currentContext = options.context;

  return {
    getState: () => currentState,
    send: (event: { type: string; [key: string]: any }) => {
      const transitionConfig = options.states[currentState].on?.[event.type];

      if (transitionConfig) {
        currentState = transitionConfig.target;
        transitionConfig.actions?.forEach((actName) => {
          const nextContextValue = implementations.actions[actName]?.(currentContext, event);
          if (nextContextValue) {
            currentContext = {
              ...currentContext,
              ...nextContextValue,
            };
          }
        });
      }
    },
  };
};
