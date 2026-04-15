const DESTRUCTIVE_CONFIRM_CODE_LENGTH: number = 6;

const DESTRUCTIVE_CONFIRM_CODE_ALPHABET: string = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export const generateDestructiveConfirmCode = (): string => {
  let result: string = '';
  for (let i: number = 0; i < DESTRUCTIVE_CONFIRM_CODE_LENGTH; i += 1) {
    const index: number = Math.floor(Math.random() * DESTRUCTIVE_CONFIRM_CODE_ALPHABET.length);
    result += DESTRUCTIVE_CONFIRM_CODE_ALPHABET.charAt(index);
  }
  return result;
};
