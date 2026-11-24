import { playPassSound, playFailSound } from '../../core/utils/soundPlayer';
export function useSoundNotification() {
  return { playPass: playPassSound, playFail: playFailSound };
}
