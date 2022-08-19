// This file was automatically generated. Edits will be overwritten

export interface Typegen0 {
  "@@xstate/typegen": true;
  internalEvents: {
    "": { type: "" };
    "done.invoke.Wizard.navigation.final:invocation[0]": {
      type: "done.invoke.Wizard.navigation.final:invocation[0]";
      data: unknown;
      __tip: "See the XState TS docs to learn how to strongly type this.";
    };
    "done.invoke.serviceGetNext": {
      type: "done.invoke.serviceGetNext";
      data: unknown;
      __tip: "See the XState TS docs to learn how to strongly type this.";
    };
    "done.invoke.timer": {
      type: "done.invoke.timer";
      data: unknown;
      __tip: "See the XState TS docs to learn how to strongly type this.";
    };
    "error.platform.Wizard.navigation.final:invocation[0]": {
      type: "error.platform.Wizard.navigation.final:invocation[0]";
      data: unknown;
    };
    "error.platform.serviceGetNext": {
      type: "error.platform.serviceGetNext";
      data: unknown;
    };
    "error.platform.timer": { type: "error.platform.timer"; data: unknown };
    "xstate.init": { type: "xstate.init" };
    "xstate.stop": { type: "xstate.stop" };
  };
  invokeSrcNameMap: {
    cancelReuse: "done.invoke.Wizard.navigation.final:invocation[0]";
    serviceGetNext: "done.invoke.serviceGetNext";
    timerService: "done.invoke.timer";
  };
  missingImplementations: {
    actions: "doLaunch" | "doKill" | "doDestroy";
    services: "cancelReuse";
    guards: never;
    delays: never;
  };
  eventsCausingActions: {
    actionGetNext: "";
    amendContentProps: "PRELOAD";
    captureGenerateEvent: "" | "GENERATE";
    clearCapture: "" | "GENERATE" | "LOAD";
    clearExpired: "PRELOAD";
    clearRetry: "";
    disableNav: "DISABLE_NAV" | "STOP_TIMER";
    doDestroy: "DESTROY";
    doKill: "KILL";
    doLaunch: "LAUNCH";
    enableNav: "ENABLE_NAV";
    forceGoto: "LOAD";
    genDisableNav:
      | ""
      | "FINAL_EXIT"
      | "GENERATE"
      | "LOAD"
      | "xstate.init"
      | "xstate.stop";
    genEnableNav: "" | "GENERATE";
    goBack:
      | "done.invoke.Wizard.navigation.final:invocation[0]"
      | "error.platform.Wizard.navigation.final:invocation[0]";
    goNext: "" | "LOAD";
    goNextInitialActivities: "";
    goNextInitialFinished: "";
    goNextInitialPreperatory: "LOAD";
    goNextInitialSupplemental: "";
    goNextNavigate: "";
    goNextPopulate: "" | "GENERATE";
    goPrevious: "";
    markFinal: "";
    markFydLastAsked: "HANDLE_FYD";
    notifyTimeout: "" | "CONTINUE" | "START_TIMER" | "TICK";
    pickActivities: "PRELOAD" | "UPDATE";
    pickupServiceGetNext: "SERVICE_RESPONSE";
    possiblyCleanup:
      | ""
      | "CONTINUE"
      | "EXIT"
      | "FINAL_EXIT"
      | "NEXT"
      | "PREVIOUS"
      | "START_TIMER"
      | "TICK";
    preloadTimer: "PRELOAD";
    removeLastActivityFromSelected: "HANDLE_FYD";
    resolveActiveIds: "PRELOAD";
    resolveActivityQueries: "PRELOAD";
    resolveBeforeAfterUrls: "PRELOAD";
    resolveCollectionActivities: "PRELOAD";
    resolveCurrentWarnings: "" | "GENERATE";
    resolveFydActivities: "HANDLE_FYD";
    resolveFydSetup: "PRELOAD";
    resolveLesson: "PRELOAD";
    resolveQuestionOrder: "PRELOAD";
    resolveTimer: "PRELOAD";
    resolveUserActivitiesCount: "PRELOAD";
    resolveUserActivityFilter: "PRELOAD";
    respondSend: "SEND_REPLY";
    restartActivityIndex: "LOAD";
    selfDisableNav:
      | ""
      | "CONTINUE"
      | "EXIT"
      | "FINAL_EXIT"
      | "NEXT"
      | "PREVIOUS"
      | "SEND"
      | "START_TIMER"
      | "TICK";
    selfEnableNav:
      | ""
      | "EXIT"
      | "LOAD"
      | "SEND_REPLY"
      | "SHOWED_WARNING"
      | "done.invoke.Wizard.navigation.final:invocation[0]"
      | "error.platform.Wizard.navigation.final:invocation[0]";
    sendAnswer: "SEND";
    sendServiceGetNext: "";
    sendToActivity: "EXIT" | "NEXT" | "PREVIOUS";
    sendToExit: "LOAD";
    setElapsed: "TICK";
    setExpired:
      | ""
      | "CONTINUE"
      | "EXIT"
      | "LOAD"
      | "NEXT"
      | "PREVIOUS"
      | "START_TIMER"
      | "TICK";
    setTimedOut: "" | "CONTINUE" | "START_TIMER" | "TICK";
    showedWarning: "SHOWED_WARNING";
    startSegment: "START_TIMER";
    stopSegment: "FORCE_STOP_TIMER" | "STOP_TIMER";
    updateAnswered: "SEND_REPLY";
    updateBundle: "" | "GENERATE" | "SEND_REPLY";
  };
  eventsCausingServices: {
    cancelReuse:
      | ""
      | "CONTINUE"
      | "EXIT"
      | "FINAL_EXIT"
      | "NEXT"
      | "PREVIOUS"
      | "START_TIMER"
      | "TICK";
    serviceGetNext: "FINAL_EXIT" | "xstate.init";
    timerService: "START_TIMER";
  };
  eventsCausingGuards: {
    activityHasEvent: "EXIT" | "NEXT" | "PREVIOUS";
    activityHasEventIgnoreNav: "EXIT";
    canStart: "START_TIMER";
    canUIStop: "STOP_TIMER";
    didTimeout: "" | "START_TIMER" | "TICK";
    hasAnswerOrNoActivity: "LOAD";
    hasContinue: "CONTINUE";
    hasExit: "EXIT";
    hasFinished: "";
    hasNext: "NEXT";
    hasPrevious: "PREVIOUS";
    hasWarning: "SHOWED_WARNING" | "START_TIMER";
    isExpired:
      | ""
      | "CONTINUE"
      | "EXIT"
      | "LOAD"
      | "NEXT"
      | "PREVIOUS"
      | "START_TIMER"
      | "TICK";
    isGoto: "GENERATE";
    navGenDisabled: "";
    needsGenerate: "GENERATE";
    needsGenerateAgain: "";
    noWarning: "";
    notPickedNext: "";
    notPickedNextFinal: "";
    pickedNext: "GENERATE";
    shouldFydAntagonize: "NEXT";
    shouldRestartActivityIndex: "LOAD";
    shouldSuspend: "";
    shouldUseFydActivities: "HANDLE_FYD";
  };
  eventsCausingDelays: {};
  matchesStates:
    | "generation"
    | "generation.activities"
    | "generation.activities.goNextBegin"
    | "generation.activities.goNextFinalize"
    | "generation.activities.goNextInitial"
    | "generation.activities.goNextNavigate"
    | "generation.activities.goNextPull"
    | "generation.activities.idle"
    | "generation.activities.invokeGetNext"
    | "generation.finished"
    | "generation.finished.goNextFinalize"
    | "generation.finished.idle"
    | "generation.preperatory"
    | "generation.preperatory.goNextBegin"
    | "generation.preperatory.goNextFinalize"
    | "generation.preperatory.goNextInitial"
    | "generation.preperatory.goNextNavigate"
    | "generation.preperatory.idle"
    | "generation.supplemental"
    | "generation.supplemental.goNextBegin"
    | "generation.supplemental.goNextFinalize"
    | "generation.supplemental.goNextInitial"
    | "generation.supplemental.goNextNavigate"
    | "generation.supplemental.idle"
    | "generation.uninitialized"
    | "navigation"
    | "navigation.activity"
    | "navigation.activity.completed"
    | "navigation.activity.timerReady"
    | "navigation.activity.timerStopped"
    | "navigation.final"
    | "navigation.finished"
    | "navigation.goNext"
    | "navigation.goPrevious"
    | "navigation.initial"
    | "navigation.showFydAntagonizer"
    | "navigation.showWarning"
    | {
        generation?:
          | "activities"
          | "finished"
          | "preperatory"
          | "supplemental"
          | "uninitialized"
          | {
              activities?:
                | "goNextBegin"
                | "goNextFinalize"
                | "goNextInitial"
                | "goNextNavigate"
                | "goNextPull"
                | "idle"
                | "invokeGetNext";
              finished?: "goNextFinalize" | "idle";
              preperatory?:
                | "goNextBegin"
                | "goNextFinalize"
                | "goNextInitial"
                | "goNextNavigate"
                | "idle";
              supplemental?:
                | "goNextBegin"
                | "goNextFinalize"
                | "goNextInitial"
                | "goNextNavigate"
                | "idle";
            };
        navigation?:
          | "activity"
          | "final"
          | "finished"
          | "goNext"
          | "goPrevious"
          | "initial"
          | "showFydAntagonizer"
          | "showWarning"
          | { activity?: "completed" | "timerReady" | "timerStopped" };
      };
  tags: "fyd" | "showWarning" | "visible";
}
