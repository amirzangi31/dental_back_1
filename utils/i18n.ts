import { AppLanguage, BASE_LANGUAGE } from "../config/language";
import { LEGACY_MESSAGE_MAP } from "../locales/legacyMap";
import { LocalizedText, MESSAGES, MessageKey } from "../locales/messages";

export type ResponseMessage = MessageKey | string;

export const getBaseLanguage = (): AppLanguage => BASE_LANGUAGE;

export const t = (
  key: MessageKey,
  lang: AppLanguage = BASE_LANGUAGE,
): string => {
  return MESSAGES[key][lang];
};

const resolveMessage = (input: ResponseMessage): LocalizedText => {
  if (typeof input !== "string") {
    return MESSAGES[input];
  }

  const mappedKey = LEGACY_MESSAGE_MAP[input];
  if (mappedKey) {
    return MESSAGES[mappedKey];
  }

  if (input in MESSAGES) {
    return MESSAGES[input as MessageKey];
  }

  return {
    fa: input,
    en: input,
    de: input,
  };
};

export const getPrimaryMessage = (input: ResponseMessage): string => {
  return resolveMessage(input)[BASE_LANGUAGE];
};
