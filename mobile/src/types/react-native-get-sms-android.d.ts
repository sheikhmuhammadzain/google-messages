declare module 'react-native-get-sms-android' {
  export interface SmsFilter {
    box?: string;
    address?: string;
    indexFrom?: number;
    maxCount?: number;
  }

  export default class SmsAndroid {
    static list(
      filter: string,
      onFail: (error: string) => void,
      onSuccess: (count: number, smsList: string) => void
    ): void;

    static autoSend(
      phoneNumber: string,
      message: string,
      onFail: (error: string) => void,
      onSuccess: (success: string) => void
    ): void;

    static delete(
      messageId: string,
      onFail: (error: string) => void,
      onSuccess: (success: string) => void
    ): void;
  }
}
