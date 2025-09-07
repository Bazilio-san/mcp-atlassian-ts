import * as dotenv from 'dotenv';

// Load general environment variables
const generalEnv = dotenv.config();

// Load secret environment variables from suffixed file
const suffixEnv = process.env.SUFFIX_ENV;
const secretEnv = suffixEnv 
  ? dotenv.config({ path: `.env.${suffixEnv}` })
  : { parsed: {} };

// Merge all environment variables (secrets override general)
export const dotEnvResult = {
  parsed: {
    ...generalEnv.parsed,
    ...secretEnv.parsed
  }
};