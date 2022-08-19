import { assign, pure, raise, send, sendParent } from "xstate/lib/actions";
import { ActionObject, AnyInterpreter, createMachine } from "xstate";
import {
  concat,
  filter,
  find,
  findLastIndex,
  flatten,
  get,
  last,
  map,
  reduce,
  size,
  slice,
  split,
} from "lodash";

export interface WizardContentProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parent?: any;
  heading: any;
  course: string;
  activity?: string;
  lesson?: string;
  elements?: any[];
}

export interface WizardAnswer {
  correct: boolean | null;
  viewed: Date | null;
  sent: boolean | null;
}

export interface CleanActivityRef {
  type: string;
  courseId: string;
  id: string;
  redoCount?: number;
  disable?: boolean;
  tags?: string[];
  mode?: WizardModes;
}

export interface ElementRef {
  type: string;
  id: string;
  extended: any;
  courseId: string;
}

export interface ActivityRef extends ElementRef {
  successCondition?: string;
  askAfter?: string;
  askBefore?: string;
  successAfter?: string;

  elements?: ElementRef[];

  // If this is a retake of an existing question (not a secondChance)
  // this would be an index starting at 1 mirroring the one in the corresponding
  // answer
  redoCount?: number;
  disable?: boolean;
  tags?: string[];
  mode?: WizardModes;
}

export interface ActivityLinkInfo {
  name: string;
  value: CleanActivityRef;
  label: string;
  url?: string;
}

export enum WizardModes {
  PREPERATORY = "preperatory",
  ACTIVITIES = "activities",
  SUPPLEMENTAL = "supplemental",
  FINISHED = "finished",
}

export enum WizardNew {
  NEW = "new",
  NEW_NAVIGATION = "new_nav",
  NAVIGATION = "nav",
  SUSPEND = "suspend",
}

const END_OF_SEQUENCE = "__FINISHED__";

export interface FYDConfig {
  activateAfterCompletion: boolean;
  minQuestionAnswered: number;
  minDaysSinceActivation: number;
  correctAnswerStreak: number;
  packageSize: number;
  wrongAnswerFilter: {
    enabled: boolean;
    daysSinceLastAnswer: number;
  };
  rightAnswerFilter: {
    enabled: boolean;
    daysSinceLastAnswer: number;
    requiredConfidence: string[];
  };
}

const DEFAULT_FYD_CONFIG = {
  activateAfterCompletion: true,
  minQuestionAnswered: 30,
  minDaysSinceActivation: 0, //TODO: update default #1491
  correctAnswerStreak: 3,
  packageSize: 5,
  wrongAnswerFilter: {
    enabled: true,
    daysSinceLastAnswer: 0, //TODO: update default #1491
  },
  rightAnswerFilter: {
    enabled: false,
    daysSinceLastAnswer: 90,
    requiredConfidence: ["guess"],
  },
};

export interface WizardData {
  selectedLesson: ElementRef;
  hydrate?: string[];
  startDate?: Date | number;
  endDate?: Date | number;
  courseType: string;
  mode?: WizardModes;
  activities: CleanActivityRef[];
  lessons: ElementRef[];
  allActivities: CleanActivityRef[];
  activityId?: CleanActivityRef;
  activityAnswered?: boolean;
  activityIndex?: number;
  selected: CleanActivityRef[];
  available: CleanActivityRef[];
  collectionActivities: CleanActivityRef[];
  navigationStack: CleanActivityRef[];
  warningShown?: any;
  questionOrder?: string;
  exitType?: string;
  navDisabled: boolean; // nav disabled from activity or question
  navSelfDisabled: boolean; // nav disabled from wizard itself
  navGenDisabled: boolean; // nav disabled from generator

  getAnswer: (args: any) => any;
  getQuestionNumber: (ref: ElementRef) => any;
  getActivityNumber: (ref: ElementRef) => any;
  getResolvedActivities: (ref?: CleanActivityRef[]) => ActivityRef[];
  getResolvedActivity: (ref?: CleanActivityRef) => ActivityRef | undefined;

  hasVideo?: number;
  hasAudio?: number;
  hasImage?: number;
  hasTimer: boolean;
  hasAnswer: boolean;
  timerType?: string;
  shouldWarn: boolean;
  showWarnings?: any;
  links?: ActivityLinkInfo[];
  grade?: number;

  alreadyElapsed?: number;
  remaining?: number;
  segmentStart?: number;
  segmentActive?: boolean;

  limit?: number;
  duration?: number;

  timedOut: boolean;
  timer?: string;
  mediaWarning?: string;
  warningMode?: string;

  pickedNext?: CleanActivityRef;
  goto?: boolean;
  finished?: boolean;
  pickNextCurrent?: CleanActivityRef;
  pickedNextNew?: WizardNew;
  pickedNextRetry?: boolean;

  fydConfig: FYDConfig;
  fydLastAsked: number;
  fydLastAskedTime: number;

  userActivityFilter: (ref: ActivityRef) => boolean; // Note the filter will get fully populated data
  hasActivityFilter: boolean;
  userActivitiesCount?: number;
  userQuestionsCount?: number;
  expired: boolean; // lesson expiration

  hasSelectionQueries: boolean;
  selectionQueries: any[];
  getArgs: () => any;
  children: Record<string, AnyInterpreter>;
  getParent: () => AnyInterpreter | undefined;
  getBundled: () => any;
  getElement: () => any;
  updateBundleRoot: (args: any) => Promise<void>;
}

const DEFAULT_CONTEXT: WizardData = {
  selectedLesson: {} as ElementRef,

  activities: [],
  allActivities: [],
  lessons: [],
  selected: [],
  available: [],
  collectionActivities: [],
  navigationStack: [],
  courseType: "",
  hasTimer: false,
  shouldWarn: false,
  hasAnswer: false,
  timedOut: false,
  grade: 0,
  navDisabled: true,
  navSelfDisabled: false,
  navGenDisabled: false,
  fydConfig: DEFAULT_FYD_CONFIG,
  fydLastAsked: 0,
  fydLastAskedTime: 0,

  getAnswer: (_args: any) => undefined,
  getQuestionNumber: (_ref: ElementRef) => undefined,
  getActivityNumber: (_ref: ElementRef) => undefined,
  userActivityFilter: (_ref: ActivityRef) => true,
  getResolvedActivities: (ref?: CleanActivityRef[]) =>
    ref as unknown as ActivityRef[],
  getResolvedActivity: (ref?: CleanActivityRef) =>
    ref != null ? (ref as unknown as ActivityRef) : undefined,
  hasActivityFilter: false,
  userActivitiesCount: undefined,
  userQuestionsCount: undefined,
  expired: false,

  hasSelectionQueries: false,
  selectionQueries: [],
  getArgs: () => ({}),
  children: {},
  getParent: () => undefined,
  getBundled: () => ({}),
  getElement: () => ({}),
  updateBundleRoot: () => Promise.resolve(),
};

interface LessonProps extends ElementRef {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parent?: any;
  heading?: any;

  overall?: boolean;

  startDate?: string;
  endDate?: string;
  periodTzEnable?: boolean;
  periodTz?: string;
}

export function activityMediaFlags(
  activityId?: ActivityRef,
  mediaWarning?: string,
  mediaFlags: any = {}
) {
  return {};
}

export function resolveShouldWarn(options: {
  duration?: number;
  timerType?: string;
  warningMode?: string;
  showWarnings?: any;
  warningShown?: any;
  mediaWarning?: string;
  activityId?: ElementRef;
  available?: CleanActivityRef[];
  type?: string;
}) {
  return false;
}

export interface GenerateOpts {
  goto: boolean;
  isNew?: boolean;
  next?: CleanActivityRef;
}

export interface ServiceRequest {
  limit?: number;
  questionOrder?: string;
  selected?: CleanActivityRef[];
  available?: CleanActivityRef[];
  remaining?: CleanActivityRef[];
  current?: CleanActivityRef;
  activityFilter?: (_ref: ActivityRef) => boolean;
}

export type XEventTarget = {
  id: string;
  type: string;
};

export type WizardEvent =
  | { type: "NEXT"; onlyIf?: boolean; fromChild?: boolean }
  | { type: "PREVIOUS"; onlyIf?: boolean; fromChild?: boolean }
  | { type: "EXIT"; onlyIf?: boolean; fromChild?: boolean }
  | { type: "START" }
  | { type: "TICK" }
  | { type: "CONTINUE" }
  | { type: "STOP_TIMER" }
  | { type: "START_TIMER" }
  | { type: "ENABLE_NAV" }
  | { type: "DISABLE_NAV" }
  | { type: "FORCE_STOP_TIMER" }
  | { type: "READY" }
  | { type: "FINAL_EXIT"; data: string }
  | ({ type: "GENERATE" } & GenerateOpts)
  | { type: "CHILD_UPDATE" }
  | { type: "SEND"; answer: any; targets: XEventTarget[] }
  | { type: "SEND_REPLY"; answer: any; targets: XEventTarget[] }
  // TODO STORE event seems to be unused, remove it?
  | { type: "STORE"; answer: any }
  | {
      type: "SHOWED_WARNING";
      hasAudio?: number;
      hasVideo?: number;
      hasImage?: number;
      hasShown?: number;
    }
  | ({ type: "SERVICE_REQUEST" } & ServiceRequest)
  | { type: "SERVICE_RESPONSE"; data?: CleanActivityRef }
  | { type: "HANDLE_FYD"; askFydQuestions?: boolean }
  | { type: "LAUNCH"; interpret: AnyInterpreter; id: string; childId: string }
  | { type: "KILL"; id: string; childId: string }
  | { type: "LOAD" }
  | { type: "PRELOAD" }
  | { type: "RELOAD" }
  | { type: "UPDATE" }
  | { type: "DESTROY"; destroyStack?: string[] }
  | { type: "xstate.init" }
  | { type: "" };

export const CONDITION_VALUE: Record<string, number> = {
  standard: 0.8,
  easy: 0.5,
  trivial: 0.25,
  hard: 0.95,
};

function markOneActivity(
  activityId: CleanActivityRef,
  mark = "finished"
): CleanActivityRef {
  return activityId;
}

function markActivity(
  selected: CleanActivityRef[],
  activityId: CleanActivityRef | undefined = undefined,
  mark = "finished"
): CleanActivityRef[] {
  return selected;
}

// Push a random activity and prepare it for navigation
function pushNavigation(
  context: WizardData,
  _activityId: CleanActivityRef,
  force = false
): { navigationStack: CleanActivityRef[]; activityId?: CleanActivityRef } {
  const { navigationStack: _navigationStack, getResolvedActivity } = context;
  const navigationStack = _navigationStack;
  const activityId: ActivityRef | undefined = getResolvedActivity(_activityId);
  return {
    activityId: cleanseActivity(activityId as unknown as CleanActivityRef),
    navigationStack,
  };
}

function countAnswers(
  context: WizardData,
  activityId?: CleanActivityRef
): { all: boolean; grade: number } {
  return { all: false, grade: 0 };
}

// figure out the next item after an answer. bundle needs to be up to date
//   this will execute either askAfter or successAfter
//   if it ends up with END_OF_SEQUENCE then it will return finshed: true
function nextNavigation(
  context: WizardData,
  _activityId: CleanActivityRef,
  answer?: any
): { navigationStack: CleanActivityRef[]; finished: boolean; allow: boolean } {
  const { navigationStack } = context;
  // NOTE: This does not change the current activity.
  // It just prepares the navigation stack.
  return {
    navigationStack,
    finished: false,
    allow: true,
  };
}

const BLACK_LISTED_FIELDS = {
  _component: true,
  elements: true,
  extended: true,
  keywords: true,
  overall: true,
  parent: true,
  sha: true,
  siteId: true,
  titleId: true,
};

function cleanseActivity(
  props: CleanActivityRef
): CleanActivityRef | undefined {
  return props;
}

// Utility function for hasAnswer type guards. deleted hasAnswer (not answered completely is still in available)

// pull the next item off the navigation stack.
//   since all askBefore were pushed to the stack,
//   the stack should contain the next in line
function pullNavigation(
  context: WizardData,
  _activityId?: CleanActivityRef
): { navigationStack: CleanActivityRef[]; activityId?: CleanActivityRef } {
  const { navigationStack, activityId } = context;
  return { activityId, navigationStack };
}

function goNextInitialPreperatory(context: WizardData) {
  return {};
}

function goNextInitialActivities(context: WizardData) {
  return { mode: WizardModes.ACTIVITIES };
}

function goNextInitialFinished(context: WizardData) {
  return { mode: WizardModes.FINISHED };
}

function goNextInitialSupplemental(context: WizardData) {
  return {};
}

function findNextInLine(
  context: WizardData,
  activityId?: CleanActivityRef
): CleanActivityRef | undefined {
  return undefined;
}

type NavigateResults = Partial<WizardData> & { finished: boolean };

function goNextNavigate(
  context: WizardData,
  event: WizardEvent
): NavigateResults {
  const { navigationStack, selected, pickedNext, activityId, mode } = context;
  return {
    pickedNext,
    activityId,
    navigationStack,
    finished: false,
    mode,
    selected,
  };
}

export class NoMoreActivities extends Error {
  constructor() {
    super("No more activities available.");
  }
}

function getNextForcedActivity(context: WizardData): ActivityRef | undefined {
  return undefined;
}

function actionGetNext(
  context: WizardData,
  _event: WizardEvent
): Partial<WizardData> {
  return {};
}

async function getNextActivityForOrder(
  context: WizardData,
  questionOrder: string | undefined,
  remaining: CleanActivityRef[] | undefined,
  bundle: any | undefined
): Promise<CleanActivityRef | undefined> {
  return undefined;
}

export function resolveUserActivityFilter(context: WizardData) {
  return {
    userActivityFilter: (_ref: ActivityRef) => true,
    hasActivityFilter: false,
  };
}

export function applyActivityFilter(
  context: WizardData,
  activities?: CleanActivityRef[],
  activityFilter?: (ref: ActivityRef) => boolean
) {
  return activities;
}

function resolveUserActivitiesCount(context: WizardData) {
  return {
    userActivitiesCount: undefined,
    userQuestionsCount: undefined,
  };
}

// Pull the next activity from the correct list or queue.
function serviceGetNext(context: WizardData, event: WizardEvent) {
  return (
    callback: (event: WizardEvent) => void,
    onReceive: (callback: (event: WizardEvent) => void) => void
  ) => {
    onReceive(async (event: WizardEvent) => {
      // This will not actually return activities yet, since
      // the actionGetNext already takes care of it. It will
      // supply activities in the MIT version instead.
      // if (event.type === 'xstate.init') {
      //   return;
      // }
      if (event.type === "SERVICE_REQUEST") {
        const { limit, selected, remaining, questionOrder, activityFilter } =
          event;
        if (!limit || limit > (selected?.length || 0)) {
          // We either have no limit or we're below the limit of the number of activities.
          const activityId = await getNextActivityForOrder(
            context,
            questionOrder,
            applyActivityFilter(context, remaining, activityFilter),
            {}
          );
          return callback({ type: "SERVICE_RESPONSE", data: activityId });
        }
      }
      return callback({ type: "SERVICE_RESPONSE", data: undefined });
    });
  };
}

function goNextPopulate(context: WizardData): Partial<WizardData> {
  return amendContextProcs(context, {});
}

function activityHasEventIgnoreNav(context: WizardData, event: WizardEvent) {
  if (
    event.type !== "NEXT" &&
    event.type !== "PREVIOUS" &&
    event.type !== "EXIT"
  ) {
    return false;
  }
  if (event.fromChild) {
    return false;
  }

  const { activityId, children } = context;
  return children[activityId?.id || ""]?.getSnapshot()?.can(event);
}

function hasExit(context: WizardData) {
  const { activityId, children, navDisabled, navSelfDisabled, navGenDisabled } =
    context;
  if (navDisabled || navSelfDisabled || navGenDisabled) {
    return false;
  }
  const childInterpret = children?.[activityId?.id || ""] || undefined;
  if (childInterpret?.getSnapshot()?.can("EXIT") || false) {
    return true;
  }
  return true;
}

function hasNext(context: WizardData, event: WizardEvent) {
  const {
    selected,
    activityIndex,
    activityId,
    children,
    navDisabled,
    navSelfDisabled,
    navGenDisabled,
  } = context;

  const childEvent =
    (event.type === "NEXT" ||
      event.type === "PREVIOUS" ||
      event.type === "EXIT") &&
    event.fromChild;
  if (!childEvent && (navDisabled || navSelfDisabled || navGenDisabled)) {
    return false;
  }
  if (!childEvent) {
    const childInterpret = children?.[activityId?.id || ""] || undefined;
    if (childInterpret?.getSnapshot()?.can(event) || false) {
      return true;
    }
  }
  //TODO: Needs to be reviewed and fixed for questions with secondChances
  if (typeof activityIndex === "number") {
    if (activityIndex < selected.length - 1) {
      return true;
    }
    return false;
  }
  return true;
}

function hasPrevious(context: WizardData, event: WizardEvent) {
  const {
    activityIndex,
    activityId,
    children,
    navDisabled,
    navGenDisabled,
    navSelfDisabled,
  } = context;
  if (
    (navDisabled || navSelfDisabled || navGenDisabled) &&
    !(
      (event.type === "EXIT" ||
        event.type === "NEXT" ||
        event.type === "PREVIOUS") &&
      event.fromChild
    )
  ) {
    return false;
  }
  const childInterpret = children?.[activityId?.id || ""] || undefined;
  if (childInterpret?.getSnapshot()?.can(event) || false) {
    return true;
  }
  return typeof activityIndex === "number" && activityIndex > 0;
}

function noWarning(context: WizardData) {
  const { shouldWarn } = context;
  return !shouldWarn;
}

function pickedNext(context: WizardData, event: WizardEvent): boolean {
  const { pickedNext } = context;
  const { next = undefined } = event.type === "GENERATE" ? event : {};
  return next != null || pickedNext != null;
}

function hasAnswerOrNoActivity(context: WizardData) {
  const { activityId } = context;
  if (activityId != null) {
    const { all } = countAnswers(context);

    return all;
  }
  return true;
}

function needsGenerate(context: WizardData, event: WizardEvent) {
  const { selected, activityIndex: _activityIndex, limit } = context;
  const activityIndex = _activityIndex || 0;
  const needs =
    (event.type === "GENERATE" && event.goto) ||
    (activityIndex >= selected.length - 1 &&
      (!limit || limit >= selected.length));
  return needs;
}

function getAvailableActivities(context: WizardData, isFYD = false) {
  const { lessons, getParent } = context;
  const parentContext = getParent?.()?.getSnapshot().context;
  return [];
}

function shouldActivateAntagonizerAfterInterval(
  mode: WizardModes | undefined,
  answerCount: number,
  fydLastAsked: number,
  fydConfig: FYDConfig,
  lessonAnswers: any[],
  fydLastAskedTime: number,
  isTester: boolean
) {
  return false;
}

function getAnswerCount(context: WizardData) {
  return { lessonAnswers: [], answerCount: 0 };
}

function shouldActivateAntagonizerAfterCompletion(
  context: WizardData
): boolean {
  return false;
}

function shouldFydAntagonize(context: WizardData): boolean {
  return false;
}

function amendContextProcs(
  context: WizardData,
  data: Partial<WizardData> = {}
): Partial<WizardData> {
  const internal = { ...context, ...data };
  return {
    ...data,
    getQuestionNumber: defineQuestionNumber(internal),
    getActivityNumber: defineActivityNumber(internal),
    getAnswer: defineGetAnswer(internal),
  };
}

function resolveFydSetup(context: WizardData): Partial<WizardData> {
  return {
    ...DEFAULT_FYD_CONFIG,
  } as Partial<WizardData>;
}

function pickFYDActivities(context: WizardData): CleanActivityRef[] {
  return [];
}

function resolveFydActivities(
  context: WizardData,
  event: any
): Partial<WizardData> {
  const { navigationStack } = context;
  // DO NOT USE NAVIGATION INSIDE OF THE GENERATE ENGINE.
  // DO NOT UPDATE THE WHOLE CONTEXT
  return {
    navigationStack,
  };
}

function getRedoIndex(context: WizardData, activityId: CleanActivityRef) {
  const { getBundled } = context;
  const bundled = getBundled();
  // Filter down to answers to the same activity, but only significant (last answers)
  // i.e. the answers with chancesLeft == null.
  return 0;
}

function isOverallLesson(lesson: LessonProps) {
  const { extended, overall } = lesson;
  return overall || get(extended, "overall");
}

function resolveLessonDateRange(lessons: ElementRef[]) {
  return { startDate: undefined, endDate: undefined };
}

function possiblyCleanup(context: WizardData) {
  const { activityId, navigationStack, selected } = context;

  return { activityId, selected, navigationStack };
}

function getCourseType(context: WizardData) {
  const { getParent } = context;
  const snapshot = getParent?.()?.getSnapshot();
  const { getElement } = snapshot?.context || {};
  const { courseType } = getElement() || {};
  return courseType;
}

function getBundleType(context: WizardData) {
  const { getBundled } = context;
  const { type } = getBundled() || {};
  return type;
}

export const WizardMachine = createMachine(
  {
    predictableActionArguments: true,
    tsTypes: {} as import("./bare.xstate.typegen").Typegen0,
    schema: {
      context: {} as WizardData,
      events: {} as WizardEvent,
    },
    context: DEFAULT_CONTEXT,
    id: "Wizard",
    type: "parallel",
    invoke: {
      src: "serviceGetNext",
      id: "serviceGetNext",
    },
    states: {
      generation: {
        initial: "uninitialized",
        states: {
          uninitialized: {
            entry: "genDisableNav",
            on: {
              LOAD: {
                target: "preperatory.goNextInitial",
                actions: "forceGoto",
              },
            },
          },
          preperatory: {
            initial: "idle",
            states: {
              idle: {
                entry: "clearCapture",
                exit: "genDisableNav",
                always: [
                  {
                    cond: "needsGenerateAgain",
                    actions: ["clearRetry", "captureGenerateEvent"],
                    target: "goNextBegin",
                  },
                  {
                    cond: "navGenDisabled",
                    actions: "genEnableNav",
                  },
                ],
                on: {
                  GENERATE: [
                    {
                      cond: "needsGenerate",
                      actions: "captureGenerateEvent",
                      target: "goNextBegin",
                    },
                    {
                      cond: "pickedNext",
                      actions: "captureGenerateEvent",
                      target: "goNextFinalize",
                    },
                    { target: "#Wizard.navigation.activity" },
                  ],
                },
              },
              goNextInitial: {
                entry: "goNextInitialPreperatory",
                always: [
                  {
                    cond: "notPickedNext",
                    target: "#Wizard.generation.activities.goNextInitial",
                  },
                  {
                    actions: "updateBundle",
                    target: "goNextFinalize",
                  },
                ],
              },
              goNextBegin: {
                always: [
                  {
                    cond: "notPickedNext",
                    target: "goNextNavigate",
                  },
                  {
                    target: "goNextFinalize",
                  },
                ],
              },
              goNextNavigate: {
                entry: "goNextNavigate",
                always: [
                  {
                    cond: "shouldSuspend",
                    target: ["idle", "#Wizard.navigation.activity"],
                  },
                  {
                    target: "goNextFinalize",
                  },
                ],
              },
              goNextFinalize: {
                always: [
                  {
                    cond: "notPickedNextFinal",
                    actions: "markFinal",
                    target: "#Wizard.generation.activities.goNextInitial",
                  },
                  {
                    actions: [
                      "goNextPopulate",
                      "resolveCurrentWarnings",
                      "updateBundle",
                    ],
                    target: ["idle", "#Wizard.navigation.showWarning"],
                  },
                ],
              },
            },
          },
          activities: {
            initial: "idle",
            states: {
              idle: {
                entry: "clearCapture",
                exit: "genDisableNav",
                always: [
                  {
                    cond: "needsGenerateAgain",
                    actions: ["clearRetry", "captureGenerateEvent"],
                    target: "goNextBegin",
                  },
                  {
                    cond: "navGenDisabled",
                    actions: "genEnableNav",
                  },
                ],
                on: {
                  GENERATE: [
                    {
                      cond: "needsGenerate",
                      actions: "captureGenerateEvent",
                      target: "goNextBegin",
                    },
                    {
                      cond: "pickedNext",
                      actions: "captureGenerateEvent",
                      target: "goNextFinalize",
                    },
                    {
                      target: "#Wizard.navigation.activity",
                    },
                  ],
                },
              },
              goNextInitial: {
                entry: ["goNextInitialActivities", "updateBundle"],
                always: [
                  {
                    cond: "notPickedNext",
                    target: "goNextBegin",
                  },
                  {
                    target: ["idle", "#Wizard.navigation.activity"],
                  },
                ],
              },
              goNextBegin: {
                always: [
                  {
                    cond: "notPickedNext",
                    target: "goNextNavigate",
                  },
                  {
                    target: "goNextFinalize",
                  },
                ],
              },
              goNextNavigate: {
                entry: "goNextNavigate",
                always: [
                  {
                    cond: "shouldSuspend",
                    target: ["idle", "#Wizard.navigation.activity"],
                  },
                  {
                    cond: "notPickedNext",
                    target: "goNextPull",
                  },
                  {
                    target: "goNextFinalize",
                  },
                ],
              },
              goNextPull: {
                entry: "actionGetNext",
                always: [
                  {
                    cond: "notPickedNext",
                    target: "invokeGetNext",
                  },
                  {
                    target: "goNextFinalize",
                  },
                ],
              },
              invokeGetNext: {
                entry: "sendServiceGetNext",
                on: {
                  SERVICE_RESPONSE: {
                    actions: "pickupServiceGetNext",
                    target: "goNextFinalize",
                  },
                },
              },
              goNextFinalize: {
                always: [
                  {
                    cond: "notPickedNextFinal",
                    actions: "markFinal",
                    target: "#Wizard.generation.supplemental.goNextInitial",
                  },
                  {
                    actions: [
                      "goNextPopulate",
                      "resolveCurrentWarnings",
                      "updateBundle",
                    ],
                    target: ["idle", "#Wizard.navigation.showWarning"],
                  },
                ],
              },
            },
          },
          supplemental: {
            initial: "idle",
            states: {
              idle: {
                entry: "clearCapture",
                exit: "genDisableNav",
                always: [
                  {
                    cond: "needsGenerateAgain",
                    actions: ["clearRetry", "captureGenerateEvent"],
                    target: "goNextBegin",
                  },
                  {
                    cond: "navGenDisabled",
                    actions: "genEnableNav",
                  },
                ],
                on: {
                  GENERATE: [
                    {
                      cond: "needsGenerate",
                      actions: "captureGenerateEvent",
                      target: "goNextBegin",
                    },
                    {
                      cond: "pickedNext",
                      actions: "captureGenerateEvent",
                      target: "goNextFinalize",
                    },
                    { target: ["idle", "#Wizard.navigation.activity"] },
                  ],
                },
              },
              goNextInitial: {
                entry: "goNextInitialSupplemental",
                always: [
                  {
                    cond: "notPickedNext",
                    actions: "markFinal",
                    target: "#Wizard.generation.finished",
                  },
                  {
                    actions: "updateBundle",
                    target: "goNextBegin",
                  },
                ],
              },
              goNextBegin: {
                always: [
                  {
                    cond: "notPickedNext",
                    target: "goNextNavigate",
                  },
                  {
                    target: "goNextFinalize",
                  },
                ],
              },
              goNextNavigate: {
                entry: "goNextNavigate",
                always: [
                  {
                    cond: "shouldSuspend",
                    target: "idle",
                  },
                  {
                    target: "goNextFinalize",
                  },
                ],
              },
              goNextFinalize: {
                always: [
                  {
                    cond: "notPickedNextFinal",
                    target: "#Wizard.generation.finished",
                  },
                  {
                    actions: [
                      "goNextPopulate",
                      "resolveCurrentWarnings",
                      "updateBundle",
                    ],
                    target: ["idle", "#Wizard.navigation.showWarning"],
                  },
                ],
              },
            },
          },
          finished: {
            entry: ["goNextInitialFinished", "updateBundle"],
            initial: "idle",
            states: {
              idle: {
                entry: ["clearCapture", "genEnableNav"],
                always: [
                  {
                    cond: "navGenDisabled",
                    actions: "genEnableNav",
                  },
                ],
                on: {
                  GENERATE: [
                    {
                      cond: "isGoto",
                      actions: ["genDisableNav", "captureGenerateEvent"],
                      target: "goNextFinalize",
                    },
                    { target: "#Wizard.navigation.activity" },
                  ],
                },
              },
              goNextFinalize: {
                always: [
                  {
                    cond: "notPickedNext",
                    target: ["idle", "#Wizard.navigation.activity"],
                  },
                  {
                    actions: [
                      "goNextPopulate",
                      "resolveCurrentWarnings",
                      "updateBundle",
                    ],
                    target: ["idle", "#Wizard.navigation.showWarning"],
                  },
                ],
              },
            },
            on: {
              GENERATE: [
                {
                  cond: "isGoto",
                  actions: [
                    "captureGenerateEvent",
                    "goNextPopulate",
                    "resolveCurrentWarnings",
                    "updateBundle",
                  ],
                },
                { target: [".idle", "#Wizard.navigation.activity"] },
              ],
            },
          },
        },
      },
      navigation: {
        initial: "initial",
        states: {
          final: {
            tags: ["visible"],
            entry: ["selfDisableNav", "possiblyCleanup"],
            invoke: {
              src: "cancelReuse",
              onDone: {
                target: "finished",
                actions: "goBack",
              },
              onError: {
                target: "finished",
                actions: "goBack",
              },
            },
          },
          finished: {
            entry: "selfEnableNav",
          },
          initial: {},
          showFydAntagonizer: {
            tags: ["fyd"],
            on: {
              HANDLE_FYD: [
                {
                  cond: "shouldUseFydActivities",
                  actions: [
                    "removeLastActivityFromSelected",
                    "resolveFydActivities",
                    "markFydLastAsked",
                  ],
                  target: "goNext",
                },
                {
                  actions: "markFydLastAsked",
                  target: "goNext",
                },
              ],
            },
          },
          showWarning: {
            tags: ["showWarning", "visible"],
            entry: "selfDisableNav",
            always: [
              {
                cond: "noWarning",
                target: "activity",
                actions: "selfEnableNav",
              },
            ],
            on: {
              SHOWED_WARNING: [
                {
                  cond: "hasWarning",
                  actions: ["showedWarning", "selfEnableNav"],
                  target: "activity",
                },
              ],
              EXIT: [
                {
                  cond: "activityHasEventIgnoreNav",
                  actions: ["selfEnableNav", "sendToActivity"],
                },
                {
                  target: "final",
                },
              ],
            },
          },
          goPrevious: {
            tags: ["visible"],
            always: [
              {
                cond: "isExpired",
                target: "final",
                actions: "setExpired",
              },
              {
                actions: "goPrevious",
                target: "initial",
              },
            ],
          },
          goNext: {
            tags: ["visible"],
            always: [
              {
                cond: "isExpired",
                target: "final",
                actions: "setExpired",
              },
              {
                actions: "goNext",
                target: "initial",
              },
            ],
          },
          activity: {
            tags: ["visible"],
            initial: "timerStopped",
            states: {
              timerReady: {
                invoke: {
                  id: "timer",
                  src: "timerService",
                },
                on: {
                  TICK: [
                    {
                      cond: "isExpired",
                      actions: ["setExpired", "setTimedOut", "notifyTimeout"],
                      target: "#Wizard.navigation.final",
                    },
                    {
                      cond: "didTimeout",
                      target: "timerStopped",
                      actions: ["setTimedOut", "notifyTimeout"],
                    },
                    {
                      actions: ["setElapsed"],
                    },
                  ],
                  STOP_TIMER: [
                    {
                      cond: "canUIStop",
                      target: "timerStopped",
                      actions: ["stopSegment", "disableNav"],
                    },
                    {
                      actions: "disableNav",
                    },
                  ],
                  FORCE_STOP_TIMER: [
                    {
                      target: "timerStopped",
                      actions: "stopSegment",
                    },
                  ],
                },
                always: [
                  {
                    cond: "isExpired",
                    actions: ["setExpired", "setTimedOut", "notifyTimeout"],
                    target: "#Wizard.navigation.final",
                  },
                  {
                    cond: "didTimeout",
                    target: "timerStopped",
                    actions: ["setTimedOut", "notifyTimeout"],
                  },
                ],
              },
              timerStopped: {
                always: [
                  {
                    cond: "hasFinished",
                    target: "completed",
                  },
                ],
              },
              completed: {},
            },
            on: {
              CONTINUE: [
                {
                  cond: "isExpired",
                  actions: ["setExpired", "setTimedOut", "notifyTimeout"],
                  target: "final",
                },
                { cond: "hasContinue", target: "goNext" },
              ],
            },
          },
        },
        on: {
          START_TIMER: [
            {
              cond: "isExpired",
              actions: ["setExpired", "setTimedOut", "notifyTimeout"],
              target: "#Wizard.navigation.final",
            },
            {
              cond: "hasWarning",
              target: ".showWarning",
            },
            {
              cond: "canStart",
              actions: "startSegment",
              target: ".activity.timerReady",
            },
            {
              cond: "didTimeout",
              target: ".activity.timerStopped",
              actions: ["setTimedOut", "notifyTimeout"],
            },
            {
              target: ".activity.timerStopped",
            },
          ],
          READY: {
            target: ".activity",
          },
          ENABLE_NAV: {
            actions: "enableNav",
          },
          DISABLE_NAV: {
            actions: "disableNav",
          },
          EXIT: [
            {
              cond: "isExpired",
              actions: "setExpired",
              target: ".final",
            },
            {
              cond: "activityHasEvent",
              actions: "sendToActivity",
            },
            {
              cond: "hasExit",
              target: ".final",
            },
          ],
          NEXT: [
            {
              cond: "isExpired",
              target: ".final",
              actions: "setExpired",
            },
            {
              cond: "shouldFydAntagonize",
              target: "navigation.showFydAntagonizer",
            },
            {
              cond: "activityHasEvent",
              actions: "sendToActivity",
            },
            {
              cond: "hasNext",
              target: ".goNext",
            },
          ],
          PREVIOUS: [
            {
              cond: "isExpired",
              target: ".final",
              actions: "setExpired",
            },
            {
              cond: "activityHasEvent",
              actions: "sendToActivity",
            },
            {
              cond: "hasPrevious",
              target: ".goPrevious",
            },
          ],
        },
      },
    },
    on: {
      LOAD: [
        {
          cond: "isExpired",
          actions: ["setExpired", "sendToExit"],
        },
        {
          cond: "shouldRestartActivityIndex",
          actions: "restartActivityIndex",
          target: ".navigation.activity",
        },
        {
          cond: "hasAnswerOrNoActivity",
          actions: ["selfEnableNav", "goNext"],
          target: ".navigation.initial",
        },
        {
          target: ".navigation.activity",
          actions: "selfEnableNav",
        },
      ],
      SEND: {
        actions: ["selfDisableNav", "sendAnswer"],
      },
      SEND_REPLY: {
        actions: [
          "respondSend",
          "updateAnswered",
          "selfEnableNav",
          "updateBundle",
        ],
      },
      LAUNCH: {
        actions: "doLaunch",
      },
      KILL: {
        actions: "doKill",
      },
      PRELOAD: {
        actions: [
          "clearExpired",
          "preloadTimer",
          "resolveLesson",
          "resolveFydSetup",
          "resolveCollectionActivities",
          "resolveUserActivityFilter",
          "resolveActivityQueries",
          "resolveActiveIds",
          "resolveUserActivitiesCount",
          "resolveTimer",
          "resolveBeforeAfterUrls",
          "pickActivities",
          "resolveQuestionOrder",
          "amendContentProps",
        ],
      },
      UPDATE: {
        actions: "pickActivities",
      },
      FINAL_EXIT: {
        target: "navigation.final",
      },
      DESTROY: {
        actions: "doDestroy",
      },
    },
  },
  {
    guards: {
      shouldFydAntagonize,
      shouldUseFydActivities: (context, event) => {
        const { askFydQuestions = false, type } = event;
        return type === "HANDLE_FYD" && askFydQuestions;
      },
      navGenDisabled: (context) => {
        const { navGenDisabled } = context;
        return navGenDisabled;
      },
      isExpired: (context, event) => {
        return false;
      },
      isGoto: (context, event) => {
        if (event.type !== "GENERATE") {
          return false;
        }
        const { goto } = event;
        return goto;
      },
      shouldSuspend: (context) => {
        const { pickedNextNew } = context;
        return pickedNextNew === WizardNew.SUSPEND;
      },
      activityHasEventIgnoreNav,
      activityHasEvent: (context, event) => {
        const hasEvent = activityHasEventIgnoreNav(context, event);
        if (!hasEvent) {
          return false;
        }
        if (
          (event.type === "PREVIOUS" ||
            event.type === "NEXT" ||
            event.type === "EXIT") &&
          event.onlyIf
        ) {
          const { navDisabled, navSelfDisabled, navGenDisabled } = context;
          if (navDisabled || navSelfDisabled || navGenDisabled) {
            return false;
          }
        }
        return hasEvent;
      },
      pickedNext,
      notPickedNext: (context, event) => !pickedNext(context, event),
      notPickedNextFinal: (context, event) => {
        return !pickedNext(context, event);
      },
      needsGenerate,
      needsGenerateAgain: (context, event) => {
        const { pickedNextRetry, selected, getResolvedActivity } = context;
        if (!pickedNextRetry) {
          return false;
        }
        const { successAfter } = getResolvedActivity(last(selected)) || {};
        if (successAfter) {
          return false;
        }
        return needsGenerate(context, event);
      },
      noWarning,
      hasWarning: (context) => !noWarning(context),
      canUIStop: (context) => {
        //const { timerType } = context;
        // Currently no timerType allows to suspend the timer
        return false;
      },
      canStart: (context) => {
        const {
          duration,
          getBundled,
          limit,
          alreadyElapsed,
          segmentActive,
          segmentStart,
          timerType,
          shouldWarn,
        } = context;
        if (shouldWarn) {
          return false;
        }
        const bundle = getBundled();
        const elapsed =
          alreadyElapsed != null
            ? segmentActive && segmentStart
              ? alreadyElapsed + (Date.now() - segmentStart)
              : alreadyElapsed
            : 0;
        if (
          timerType === undefined ||
          timerType === "none" ||
          duration === undefined ||
          (elapsed && elapsed >= duration * 1000)
        ) {
          return false;
        }
        if (limit) {
          // we need to go beyond limit to get survey question
          return size(bundle?.items) <= limit;
        }
        return true;
      },
      didTimeout: (context, _event) => {
        const {
          duration,
          alreadyElapsed,
          segmentActive,
          segmentStart,
          timedOut,
        } = context;
        if (timedOut) {
          return true;
        }
        if (!duration) {
          return false;
        }
        const elapsed =
          (alreadyElapsed || 0) +
          (segmentActive && segmentStart != null
            ? Date.now() - segmentStart
            : 0);
        return elapsed >= duration * 1000;
      },
      hasContinue: (context) => {
        const { activityId, mode } = context;
        return false;
      },
      hasFinished,
      hasAnswerOrNoActivity,
      hasPrevious,
      hasNext,
      hasExit,
      shouldRestartActivityIndex: (context) => {
        const { getArgs } = context;
        const { restart = false } = getArgs?.() || {};
        return restart;
      },
    },
    actions: {
      setExpired: assign({ expired: (context) => true }),
      clearExpired: assign({ expired: (context) => false }),
      clearRetry: assign({ pickedNextRetry: (context) => false }),
      selfEnableNav: assign({ navSelfDisabled: (context) => false }),
      selfDisableNav: assign({ navSelfDisabled: (context) => true }),
      genEnableNav: assign({ navGenDisabled: (context) => false }),
      genDisableNav: assign({ navGenDisabled: (context) => true }),
      enableNav: assign({ navDisabled: (context) => false }),
      disableNav: assign({ navDisabled: (context) => true }),
      possiblyCleanup: assign(possiblyCleanup),
      amendContentProps: assign((context) => {
        return amendContextProcs(context);
      }),
      sendToActivity: pure((context, event) => {
        const { activityId, children } = context;
        const to = get(children, activityId?.id || "")?.sessionId;

        if (to) {
          return [
            send<WizardData, WizardEvent, any>(event, {
              to,
            }) as ActionObject<WizardData, WizardEvent>,
          ];
        }
        return [];
      }),
      markFinal: assign((context) => {
        const { selected, activityId } = context;
        return { selected, activityId };
      }),
      markFydLastAsked: assign((context) => {
        const { answerCount: fydLastAsked } = getAnswerCount(context);
        const fydLastAskedTime = Date.now();
        return { fydLastAsked, fydLastAskedTime };
      }),
      sendServiceGetNext: send(
        (context) => {
          const {
            limit,
            available,
            selected,
            questionOrder,
            activityId: current,
            userActivityFilter,
            hasActivityFilter,
          } = context;
          return {
            type: "SERVICE_REQUEST",
            limit,
            questionOrder,
            selected,
            available,
            remaining: available,
            current,
            activityFilter: hasActivityFilter ? userActivityFilter : undefined,
          };
        },
        {
          to: "serviceGetNext",
        }
      ),
      pickupServiceGetNext: assign((context, event) => {
        if (event.type !== "SERVICE_RESPONSE") return {};
        const { data } = event;
        if (data != null) {
          return { pickedNext: data, pickedNextNew: WizardNew.NEW };
        }
        return {};
      }),
      forceGoto: assign((context) => {
        return { goto: true, pickedNext: undefined, pickedNextRetry: true };
      }),
      clearCapture: assign((context) => {
        return {
          goto: undefined,
          pickedNext: undefined,
          pickedNextNew: undefined,
        };
      }),
      captureGenerateEvent: assign((context, event) => {
        const { activityId } = context;
        if (event.type !== "GENERATE") {
          return {
            goto: false,
            pickedNext: undefined,
            pickNextCurrent: activityId,
            pickedNextNew: undefined,
          };
        }
        const { goto, next: pickedNext, isNew } = event;
        return {
          goto,
          pickedNext,
          pickedNextNew: isNew ? WizardNew.NEW : undefined,
          pickNextCurrent: activityId,
          pickedNextRetry: goto,
        };
      }),
      sendToExit: send((context, event) => ({ type: "EXIT" })),
      updateBundle: (context) => {
        const { mode, selectedLesson, limit, updateBundleRoot } = context;
        updateBundleRoot({
          [`lessonMode.${selectedLesson.id}`]: mode,
          numQuestions: limit,
        });
      },
      resolveBeforeAfterUrls: assign((context) => {
        const { selectedLesson, getParent } = context;
        const parentContext = getParent
          ? getParent()?.getSnapshot()?.context
          : undefined;
        const { getCollectionActivities } = parentContext;
        const { askAfter, successAfter, askBefore } =
          selectedLesson as unknown as Record<string, string>;
        return { links: [] };
      }),
      showedWarning: assign({
        shouldWarn: (context) => false,
        warningShown: (context, event) => {
          const { warningShown: _warningShown } = context;
          if (event.type !== "SHOWED_WARNING") return _warningShown;
          const { hasVideo, hasAudio, hasImage } = event;

          return {};
        },
      }),
      startSegment: assign((context) => {
        const { timerType, segmentStart: _segmentStart } = context;
        if (timerType === "none") {
          return {};
        }
        return {
          segmentStart: _segmentStart ? _segmentStart : Date.now(),
          segmentActive: true,
          remaining: undefined,
        };
      }),
      stopSegment: assign((context) => {
        if (context.timerType === "none")
          return { alreadyElapsed: undefined, segmentActive: false };
        const {
          alreadyElapsed: _alreadyElapsed,
          segmentActive,
          segmentStart,
        } = context;
        const alreadyElapsed =
          segmentActive && segmentStart != null
            ? (_alreadyElapsed || 0) + (Date.now() - segmentStart)
            : _alreadyElapsed || 0;
        return {
          alreadyElapsed,
          segmentActive: false,
          segmentStart: undefined,
        };
      }),
      notifyTimeout: pure((context) => {
        return map(context.children, ({ id: to }) => {
          return send("TIMEOUT", { to });
        });
      }),
      setTimedOut: assign((context) => {
        const { duration } = context;
        return {
          segmentActive: false,
          segmentStart: undefined,
          alreadyElapsed: duration != null ? duration * 1000 : 0,
          timedOut: true,
          remaining: 0,
        };
      }),
      setElapsed: assign({
        remaining: (context, event) => {
          const {
            remaining,
            alreadyElapsed,
            segmentActive,
            segmentStart,
            duration,
          } = context;
          if (event.type !== "TICK") {
            return remaining;
          }
          return duration != null
            ? duration * 1000 -
                (alreadyElapsed || 0) -
                (segmentActive && segmentStart != null
                  ? Date.now() - segmentStart
                  : 0)
            : undefined;
        },
      }),
      actionGetNext: assign((context, event) => actionGetNext(context, event)),
      goNextNavigate: assign((context, event) =>
        goNextNavigate(context, event)
      ),
      goNextPopulate: assign(goNextPopulate),
      goNextInitialPreperatory: assign(goNextInitialPreperatory),
      goNextInitialSupplemental: assign(goNextInitialSupplemental),
      goNextInitialActivities: assign(goNextInitialActivities),
      goNextInitialFinished: assign(goNextInitialFinished),
      goPrevious: pure((context, event) => {
        const { activityIndex: _activityIndex, selected } = context;

        const activityIndex =
          typeof _activityIndex === "number"
            ? _activityIndex
            : selected.length - 1;

        if (activityIndex > 0) {
          const previousActivityIndex = activityIndex - 1;
          const activityId = selected[previousActivityIndex];

          return [
            raise({
              type: "GENERATE",
              goto: true,
              next: activityId,
              isNew: false,
            }) as ActionObject<WizardData, WizardEvent>,
          ];
        }
        return [];
      }),
      goNext: pure((context, event) => {
        const { activityIndex: _activityIndex, selected } = context;

        const activityIndex =
          typeof _activityIndex === "number"
            ? _activityIndex
            : selected.length - 1;

        if (activityIndex < selected?.length) {
          const activityId = selected?.[activityIndex + 1];

          return raise({
            type: "GENERATE",
            goto: true,
            next: activityId,
            isNew: false,
          }) as ActionObject<WizardData, WizardEvent>;
        }
        return raise({ type: "GENERATE", goto: true }) as ActionObject<
          WizardData,
          WizardEvent
        >;
      }),
      restartActivityIndex: assign((context) => {
        const { selected } = context;
        if (selected?.length > 0) {
          const activityId = selected?.[0];
          return {
            activityId: activityId,
            activityIndex: 0,
          };
        }
        return {};
      }),
      resolveCurrentWarnings: assign((context: WizardData) => {
        return amendContextProcs(context, {});
      }),
      resolveLesson: assign((context, event) => {
        const { getElement, getArgs } = context;
        const courseType = getCourseType(context);

        const element = getElement();
        const {
          course: courseId,
          lesson: lessonId,
          isFYD,
        } = getArgs?.() || {
          course: undefined,
          lesson: undefined,
          isFYD: false,
        };
        const { elements } = element;
        const lessonIds = split(lessonId, "/");
        return {};
      }),
      preloadTimer: assign((context, event) => {
        const { hasTimer = false, segmentActive = false } = context;
        if (hasTimer && segmentActive) {
          // reset remaining, it will be set with next TICK
          return { remaining: undefined };
        }
        return {};
      }),
      resolveTimer: assign((context, event) => {
        return {};
      }),
      resolveFydActivities: assign(resolveFydActivities),
      resolveFydSetup: assign(resolveFydSetup),
      resolveCollectionActivities: assign({
        collectionActivities: (context) => {
          const { getParent } = context;
          const parentContext = getParent
            ? getParent()?.getSnapshot()?.context
            : undefined;
          const collectionActivities =
            parentContext?.getCollectionActivities &&
            parentContext?.getCollectionActivities();
          return collectionActivities;
        },
      }),
      resolveActivityQueries: assign((context, event) => {
        const { getParent } = context;
        const parentContext = getParent
          ? getParent()?.getSnapshot()?.context
          : undefined;
        const selectionQueries = parentContext.getSelectionQueries();
        return {
          hasSelectionQueries: size(selectionQueries) > 0,
          selectionQueries,
        };
      }),
      resolveActiveIds: assign((context) => {
        const { getArgs, getParent } = context;
        const { activityId: _activityId, lessons, selected } = context;
        const { activity, type } = getArgs();
        const activityFilter = (item: ElementRef) => {
          return type === "view" && activity != null
            ? item.type !== "activity" || item.id === activity
            : true;
        };
        const parentContext = getParent
          ? getParent()?.getSnapshot()?.context
          : undefined;
        const collectionActivities =
          parentContext?.getCollectionActivities &&
          parentContext?.getCollectionActivities();
        const activities =
          parentContext?.getActivities &&
          flatten(
            map(lessons, (e: ElementRef) => {
              return parentContext?.getActivities((e as ElementRef).id);
            })
          ).filter((item) => activityFilter(item));
        const resolveOne = ({
          id,
          type,
          courseId,
          ...more
        }: CleanActivityRef): CleanActivityRef | undefined => {
          const override =
            find(activities, { id, type, courseId }) ||
            find(collectionActivities, { id, type, courseId });
          if (!override) {
            return undefined;
          }
          return cleanseActivity({ ...more, ...override } as CleanActivityRef);
        };
        const resolver = reduce<ActivityRef, any>(
          concat(activities, collectionActivities),
          (resolver, item) => {
            const { courseId, type, id } = item;
            const key = [courseId, type, id].join("-");
            resolver[key] = item;
            return resolver;
          },
          {}
        );
        const reverseResolve = (
          activity: CleanActivityRef | undefined
        ): ActivityRef | undefined => {
          if (activity == null) {
            return undefined;
          }
          const { id, type, courseId, ...rest } = activity;
          const override = resolver[[courseId, type, id].join("-")];
          if (!override) {
            return undefined;
          }
          return { ...override, ...rest } as ActivityRef;
        };
        return {
          activities: map(activities, cleanseActivity) as CleanActivityRef[],
          activityId: _activityId != null ? resolveOne(_activityId) : undefined,
          selected: filter(
            map(selected || [], resolveOne),
            (item) => item != null
          ) as CleanActivityRef[],
          getResolvedActivities: (ref?: CleanActivityRef[]) =>
            filter(
              map(ref || [], reverseResolve),
              (item) => item
            ) as ActivityRef[],
          getResolvedActivity: reverseResolve,
        };
      }),
      resolveQuestionOrder: assign({
        questionOrder: (context) => {
          return "random";
        },
      }),
      pickActivities: assign((context) => {
        const {
          selectedLesson,
          getArgs,
          getParent,
          lessons,
          activityId,
          navigationStack,
          collectionActivities,
          selected: _selected,
          getBundled,
        } = context;
        const { isFYD, type, activity } = getArgs?.() || {
          isFYD: false,
          type: undefined,
          activity: undefined,
        };
        const activityTypeFilter = (item: CleanActivityRef) => {
          return type === "view" && activity != null
            ? item.type === "activity" && item.id === activity
            : true;
        };
        const parent = getParent ? getParent() : undefined;
        const parentContext = parent?.getSnapshot()?.context as any;
        const activities: CleanActivityRef[] = flatten(
          map(lessons, (lesson) => parentContext?.getActivities(lesson.id))
        )
          .filter(activityTypeFilter)
          .map(cleanseActivity)
          .filter((item) => item != null) as CleanActivityRef[];
        const selectedActivities =
          _selected ||
          parentContext?.getSelectedActivities(
            (selectedLesson as ElementRef).id,
            isFYD
          );
        const { endDate = undefined, startDate = undefined } =
          resolveLessonDateRange(lessons);
        const resolveOne = ({
          id,
          type,
          courseId,
          ...more
        }: CleanActivityRef): CleanActivityRef | undefined => {
          const override =
            find(activities, { id, type, courseId }) ||
            find(collectionActivities, { id, type, courseId });
          if (!override) {
            return undefined;
          }
          return cleanseActivity({ ...more, ...override }) as CleanActivityRef;
        };
        const resolve = (items: CleanActivityRef[]): CleanActivityRef[] => {
          return map(items, resolveOne).filter(
            (item) => item != null
          ) as CleanActivityRef[];
        };
        const availableActivities = getAvailableActivities(context, isFYD);
        let selected = resolve(selectedActivities);
        let activityIndex = activityId
          ? findLastIndex(selected, {
              id: activityId.id,
              ...(activityId.redoCount != null
                ? { redoCount: activityId.redoCount }
                : {}),
            })
          : selected.length > 0
          ? selected.length - 1
          : 0;
        if (activityId && activityIndex === -1) {
          activityIndex = selected.length;
          selected = concat(selected, [activityId]);
        }
        return amendContextProcs(context, {
          startDate,
          endDate,
          available:
            type === "test" ? activities : resolve(availableActivities),
          navigationStack: navigationStack
            ? resolve(navigationStack)
            : undefined,
          activityId: activityId ? resolveOne(activityId) : undefined,
          selected,
          activityIndex,
        });
      }),
      removeLastActivityFromSelected: assign({
        selected: (context) => {
          const { selected } = context;
          return selected.slice(0, size(selected) - 1);
        },
      }),
      resolveUserActivityFilter: assign(resolveUserActivityFilter),
      resolveUserActivitiesCount: assign(resolveUserActivitiesCount),
      goBack: () => null,
      respondSend: pure((context, event) => {
        if (event.type === "SEND_REPLY") {
          const { targets } = event;
          const { children } = context;
          const to = last(targets);
          if (to) {
            const target = get(children, to.id);
            if (target) {
              return send(
                { ...event, targets: slice(targets, 0, size(targets) - 1) },
                { to: target.sessionId }
              );
            }
          }
        }
        return [];
      }),
      sendAnswer: sendParent((context, event) => {
        if (event.type === "SEND") {
          const { answer: _answer } = event;
          const {
            selectedLesson,
            mode,
            activityId: { redoCount = undefined } = {},
            getArgs,
          } = context;
          const { isAssignment = false, type = "learn" } = getArgs?.() || {};
          const {
            answer: { tags = [] },
            targets,
          } = event;

          const answer = {};
          return {
            ...event,
            answer,
            targets,
          };
        }
        return event;
      }),
      updateAnswered: pure((context, event) => {
        const { all } = countAnswers(context);
        if (all) {
          return [
            assign({
              activityAnswered: all,
            }),
            send({ type: "GENERATE", goto: false }),
          ] as ActionObject<WizardData, WizardEvent>[];
        }
        return [
          assign({
            activityAnswered: all,
          }),
        ] as ActionObject<WizardData, WizardEvent>[];
      }),
    },
    services: {
      serviceGetNext,
      timerService: (context) => (callback, _onReceive) => {
        const { duration } = context;
        if (!duration) {
          return;
        }

        const id = setInterval(() => callback({ type: "TICK" }), 250);
        //cleanup
        return () => {
          clearInterval(id);
        };
      },
    },
  }
);

function hasFinished(context: WizardData) {
  return false;
}

export default WizardMachine;

function defineGetAnswer(context: WizardData) {
  return (args: any) => {
    return [];
  };
}

function defineQuestionNumber(context: WizardData): (ref: ElementRef) => any {
  return (ref: ElementRef) => {
    return undefined;
  };
}

function defineActivityNumber(context: WizardData): (ref: ElementRef) => any {
  return (ref: ElementRef) => {
    return undefined;
  };
}
