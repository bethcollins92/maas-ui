import { array, define } from "cooky-cutter";

import { message } from "./message";
import { notification } from "./notification";
import { user } from "./user";
import type { AuthState, UserState } from "app/store/user/types";
import type { MessageState } from "app/store/message/types";
import type { NotificationState } from "app/store/notification/types";
import type { PodState } from "app/store/pod/types";

const defaultState = {
  errors: () => ({}),
  items: () => [],
  loaded: false,
  loading: false,
  saved: false,
  saving: false,
};

export const authState = define<AuthState>({
  ...defaultState,
  errors: () => ({}),
  user,
});

export const userState = define<UserState>({
  ...defaultState,
  auth: authState,
  items: array(user),
});

export const podState = define<PodState>({
  ...defaultState,
  selected: () => [],
  statuses: () => ({}),
});

export const notificationState = define<NotificationState>({
  errors: null,
  items: array(notification),
  loaded: true,
  loading: false,
  saved: true,
  saving: false,
});

export const messageState = define<MessageState>({
  items: array(message),
});